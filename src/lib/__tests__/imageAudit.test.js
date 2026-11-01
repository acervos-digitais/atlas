import { readFile, writeFile } from 'node:fs/promises';
import { classifyImage, extractCandidates, request, runAudit } from '../../../assets/audit-images.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(),
  rename: vi.fn().mockResolvedValue(),
  mkdir: vi.fn().mockResolvedValue(),
}));

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=', 'base64');
const response = (status, type = 'text/plain', bytes = Buffer.alloc(0)) => ({ status, type, bytes });

describe('auditoria offline de imagens', () => {
  test('valida tipo, bytes e dimensões da imagem', () => {
    expect(classifyImage(response(200, 'image/png', png))).toMatchObject({ state: 'available', width: 1, height: 1 });
    expect(classifyImage(response(200, 'image/jpeg', Buffer.from('not an image'))).state).toBe('inconclusive');
  });
  test.each([404, 410])('confirma ausência HTTP %s', status => {
    expect(classifyImage(response(status))).toMatchObject({ state: 'broken', reason: 'http-missing' });
  });
  test.each([403, 429, 500, 503])('não substitui falha inconclusiva HTTP %s', status => {
    expect(classifyImage(response(status)).state).toBe('inconclusive');
  });
  test('HTML 200 não é imagem; desafio anti-bot fica pendente', () => {
    expect(classifyImage(response(200, 'text/html', Buffer.from('<html>Not found</html>'))).state).toBe('broken');
    expect(classifyImage(response(200, 'text/html', Buffer.from('<html>Cloudflare captcha</html>'))).state).toBe('inconclusive');
  });
  test('respeita limite de bytes e preserva redirects para checagem de robots', async () => {
    const oversized = await request('https://example.org', { maxBytes: 2, fetchImpl: async () => new Response('large') });
    expect(oversized).toMatchObject({ state: 'inconclusive', reason: 'byte-limit' });
    const redirect = await request('https://example.org', { fetchImpl: async () => new Response(null, { status: 302, headers: { location: '/image' } }) });
    expect(redirect).toMatchObject({ status: 302, location: '/image' });
  });
  test('erro de rede é explícito e não indica quebra permanente', async () => {
    const result = await request('https://example.org', { fetchImpl: async () => { throw new Error('network unavailable'); } });
    expect(result).toMatchObject({ state: 'inconclusive', reason: 'network unavailable' });
  });
  test('extrai srcset/lazy e metadados somente associados ao título da obra', () => {
    const html = '<h1>Estudo para Humaitá</h1><meta property="og:image" content="/work.jpg"><img alt="Estudo para Humaitá" data-src="/lazy.jpg" srcset="/small.jpg 1x, /large.jpg 2x"><img alt="Logotipo" src="/logo.jpg">';
    const candidates = extractCandidates(html, 'https://museum.org/work', { title: 'Estudo para Humaitá' });
    expect(candidates.map(c => c.url)).toEqual(['https://museum.org/work.jpg', 'https://museum.org/lazy.jpg', 'https://museum.org/small.jpg', 'https://museum.org/large.jpg']);
    expect(extractCandidates(html, 'https://museum.org/work', { title: 'Uma obra diferente' })).toEqual([]);
  });
  test('extrai JSON-LD associado à obra e rejeita títulos genéricos', () => {
    const html = '<script type="application/ld+json">{"@graph":[{"name":"Estudo para Humaitá","image":{"contentUrl":"/work.jpg"}},{"name":"Outra obra","image":"/other.jpg"}]}</script>';
    expect(extractCandidates(html, 'https://museum.org/work', { title: 'Estudo para Humaitá' }).map(c => c.url)).toEqual(['https://museum.org/work.jpg']);
    expect(extractCandidates('<h1>Sem título</h1><meta property="og:image" content="/work.jpg">', 'https://museum.org/work', { title: 'Sem título' })).toEqual([]);
  });
  test('audita, segue redirect permitido, raspa referência e gera catálogo real', async () => {
    const dataset = {
      '42': { title: 'Estudo para Humaitá', image: { image: 'https://museum.org/missing.jpg' }, url: 'https://museum.org/work' },
      '43': { title: 'Outra obra original', image: { image: 'https://museum.org/ok.jpg' }, url: 'https://museum.org/other' },
    };
    readFile.mockImplementation(async path => {
      if (path === 'dataset') return JSON.stringify(dataset);
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    });
    writeFile.mockClear();
    const fetchImpl = vi.fn(async url => {
      const pathname = new URL(url).pathname;
      if (pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /');
      if (pathname === '/missing.jpg') return new Response(null, { status: 404 });
      if (pathname === '/work') return new Response('<h1>Estudo para Humaitá</h1><meta property="og:image" content="/redirect">', { headers: { 'content-type': 'text/html' } });
      if (pathname === '/redirect') return new Response(null, { status: 302, headers: { location: '/ok.jpg' } });
      return new Response(png, { headers: { 'content-type': 'image/png' } });
    });
    const report = await runAudit({ datasetPath: 'dataset', reportPath: 'report', catalogPath: 'catalog', fetchImpl });
    expect(report.summary.counts).toEqual({ available: 1, broken: 1, inconclusive: 0, recovered: 1 });
    const output = JSON.parse(writeFile.mock.calls.find(([path]) => path === 'catalog')[1]);
    expect(output).toEqual({ version: 1, artworks: { '42': { originalImage: dataset['42'].image.image, images: ['https://museum.org/redirect'] } } });
    expect(fetchImpl.mock.calls.filter(([url]) => url.endsWith('/robots.txt'))).toHaveLength(1);
    expect(fetchImpl.mock.calls.some(([url]) => url.endsWith('/other'))).toBe(false);
  });
  test('robots proibido permanece pendente sem requisição da imagem ou override', async () => {
    readFile.mockImplementation(async path => {
      if (path === 'dataset') return JSON.stringify({
        '42': { title: 'Obra com restrição', image: { image: 'https://museum.org/private/image.jpg' }, url: 'https://museum.org/work' },
      });
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    });
    writeFile.mockClear();
    const fetchImpl = vi.fn(async () => new Response('User-agent: *\nDisallow: /private/'));
    const report = await runAudit({ datasetPath: 'dataset', reportPath: 'report', catalogPath: 'catalog', fetchImpl });
    expect(report.images['https://museum.org/private/image.jpg']).toMatchObject({ state: 'inconclusive', reason: 'robots-disallowed' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(writeFile.mock.calls.find(([path]) => path === 'catalog')[1]).artworks).toEqual({});
  });
});
