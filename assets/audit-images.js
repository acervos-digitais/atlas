import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { imageSize } from 'image-size';
import { normalizeArtworkImage } from '../src/lib/artworkImages.js';

const AGENT = 'AtlasImageAudit';
const TIMEOUT = 10000;
const MAX_BYTES = 16 * 1024 * 1024;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const normalizeImage = normalizeArtworkImage;

export async function request(url, { fetchImpl = fetch, maxBytes = MAX_BYTES } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal, headers: { 'User-Agent': `${AGENT}/1.0` }, redirect: 'manual',
    });
    const chunks = [];
    let size = 0;
    if (response.body) {
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > maxBytes) {
          controller.abort();
          return { status: response.status, reason: 'byte-limit', state: 'inconclusive' };
        }
        chunks.push(chunk);
      }
    }
    return {
      status: response.status, type: response.headers.get('content-type') ?? '',
      location: response.headers.get('location'), retryAfter: response.headers.get('retry-after'),
      bytes: Buffer.concat(chunks), url,
    };
  } catch (error) {
    return { state: 'inconclusive', reason: error.name === 'AbortError' ? 'timeout' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

export function classifyImage(result) {
  if (result.state) return result;
  if ([404, 410].includes(result.status)) return { ...result, state: 'broken', reason: 'http-missing' };
  if (result.status !== 200) return { ...result, state: 'inconclusive', reason: `http-${result.status}` };
  if (/text\/html/i.test(result.type)) {
    const text = result.bytes.toString('utf8');
    const challenge = /captcha|cloudflare|access denied|verify you are human|too many requests/i.test(text);
    return { ...result, state: challenge ? 'inconclusive' : 'broken', reason: challenge ? 'challenge' : 'html-not-image' };
  }
  if (!/^image\//i.test(result.type)) return { ...result, state: 'inconclusive', reason: 'content-type' };
  try {
    const dimensions = imageSize(result.bytes);
    if (!dimensions.width || !dimensions.height) throw new Error('missing dimensions');
    return { ...result, state: 'available', width: dimensions.width, height: dimensions.height };
  } catch (error) {
    return { ...result, state: 'inconclusive', reason: `invalid-image: ${error.message}` };
  }
}

const textKey = value => (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function extractCandidates(html, reference, artwork) {
  const $ = load(html);
  const title = textKey(artwork.title);
  if (title.length < 8 || ['sem titulo', 'untitled', 'obra sem titulo'].includes(title)) return [];
  const pageTitle = textKey($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text());
  const candidates = new Map();
  const add = (raw, evidence) => {
    if (!raw) return;
    try {
      const url = new URL(raw, reference);
      if (['http:', 'https:'].includes(url.protocol)) candidates.set(url.href, { url: url.href, evidence });
    } catch {
      // HTML externo pode conter valores que não são URLs.
    }
  };
  if (pageTitle.includes(title)) {
    $('meta[property="og:image"], meta[name="twitter:image"]').each((_, node) => {
      add($(node).attr('content'), `page-title: ${pageTitle}`);
    });
  }
  $('img').each((_, node) => {
    const image = $(node);
    const description = textKey(`${image.attr('alt') ?? ''} ${image.attr('title') ?? ''}`);
    if (!description.includes(title)) return;
    const evidence = `image-description: ${description}`;
    add(image.attr('data-src') || image.attr('data-lazy-src') || image.attr('src'), evidence);
    for (const item of (image.attr('data-srcset') || image.attr('srcset') || '').split(',')) {
      add(item.trim().split(/\s+/)[0], evidence);
    }
  });
  function structuredImages(value) {
    if (Array.isArray(value)) {
      value.forEach(structuredImages);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const name = textKey(value.name || value.headline);
    if (name === title) {
      const images = Array.isArray(value.image) ? value.image : [value.image];
      for (const image of images) {
        add(typeof image === 'string' ? image : image?.contentUrl || image?.url, `structured-title: ${name}`);
      }
    }
    if (value['@graph']) structuredImages(value['@graph']);
    if (value.mainEntity) structuredImages(value.mainEntity);
  }
  $('script[type="application/ld+json"]').each((_, node) => {
    let data;
    try {
      data = JSON.parse($(node).text());
    } catch {
      return;
    }
    structuredImages(data);
  });
  return [...candidates.values()];
}

function summaryResult(result) {
  const { bytes, ...summary } = result;
  return { ...summary, checkedAt: new Date().toISOString() };
}

export async function runAudit({ datasetPath = 'source/artwork.json', reportPath = 'refs/image-audit.json', catalogPath = 'source/artwork-image-fallbacks.json', retryInconclusive = false, fetchImpl = fetch } = {}) {
  const raw = await readFile(datasetPath, 'utf8');
  const fingerprint = createHash('sha256').update(raw).digest('hex');
  let report = { version: 1, fingerprint, images: {}, references: {}, artworks: {} };
  try {
    const previous = JSON.parse(await readFile(reportPath, 'utf8'));
    if (previous.version === report.version && previous.fingerprint === fingerprint) report = previous;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const entries = Object.entries(JSON.parse(raw));
  if (retryInconclusive) {
    report.images = Object.fromEntries(Object.entries(report.images).filter(([, result]) => result.state !== 'inconclusive'));
    report.references = {};
    report.artworks = {};
  }
  report.robots ??= {};
  const robots = new Map();
  const locks = new Map();
  const nextRequest = new Map();
  const crawlDelays = new Map();
  async function limited(url) {
    const host = new URL(url).origin;
    const previous = locks.get(host) ?? Promise.resolve();
    let unlock;
    const current = new Promise(resolve => { unlock = resolve; });
    locks.set(host, current);
    await previous;
    try {
      await delay(Math.max(0, (nextRequest.get(host) ?? 0) - Date.now()));
      const result = await request(url, { fetchImpl });
      const retry = Number(result.retryAfter);
      const retryDate = Date.parse(result.retryAfter);
      const cooldown = result.status === 429
        ? Math.max(30000, Number.isFinite(retry) ? retry * 1000 : Number.isFinite(retryDate) ? retryDate - Date.now() : 0)
        : Math.max(200, crawlDelays.get(host) ?? 0);
      nextRequest.set(host, Date.now() + cooldown);
      return result;
    } finally {
      unlock();
    }
  }
  async function allowed(url) {
    const origin = new URL(url).origin;
    if (!robots.has(origin)) {
      robots.set(origin, (async () => {
        const result = await limited(`${origin}/robots.txt`);
        report.robots[origin] = summaryResult(result);
        if ([404, 410].includes(result.status)) return { isAllowed: () => true };
        if (result.status !== 200 || !result.bytes || /<html/i.test(result.bytes.toString('utf8'))) return null;
        const policy = robotsParser(`${origin}/robots.txt`, result.bytes.toString('utf8'));
        crawlDelays.set(origin, (policy.getCrawlDelay(AGENT) ?? 0) * 1000);
        return policy;
      })());
    }
    const policy = await robots.get(origin);
    return policy ? policy.isAllowed(url, AGENT) !== false : null;
  }
  async function safeRequest(url, depth = 0) {
    if (depth > 5) return { state: 'inconclusive', reason: 'redirect-limit' };
    try {
      if (!['http:', 'https:'].includes(new URL(url).protocol)) return { state: 'inconclusive', reason: 'invalid-protocol' };
    } catch {
      return { state: 'inconclusive', reason: 'invalid-url' };
    }
    const permission = await allowed(url);
    if (permission !== true) return { state: 'inconclusive', reason: permission === false ? 'robots-disallowed' : 'robots-unavailable' };
    const result = await limited(url);
    if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
      return safeRequest(new URL(result.location, url).href, depth + 1);
    }
    return result;
  }
  await mkdir('refs', { recursive: true });
  let saving = Promise.resolve();
  function save() {
    const snapshot = JSON.stringify(report, null, 2) + '\n';
    saving = saving.then(async () => {
      await writeFile(`${reportPath}.partial`, snapshot);
      await rename(`${reportPath}.partial`, reportPath);
    });
    return saving;
  }
  const urls = [...new Set(entries.map(([, art]) => normalizeImage(art.image?.image)))];
  let index = 0;
  let completed = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (index < urls.length) {
      const url = urls[index++];
      if (!report.images[url]) report.images[url] = summaryResult(classifyImage(await safeRequest(url)));
      completed++;
      if (completed % 100 === 0) {
        console.log(`Imagens: ${completed}/${urls.length}`);
        await save();
      }
    }
  }));
  await save();
  for (const [id, artwork] of entries) {
    const originalImage = normalizeImage(artwork.image?.image);
    const original = report.images[originalImage];
    if (original.state !== 'broken') continue;
    if (report.artworks[id]) continue;
    const reference = artwork.url;
    const referenceKey = `${reference}|${artwork.title}`;
    if (!report.references[referenceKey]) {
      const response = await safeRequest(reference);
      report.references[referenceKey] = {
        ...summaryResult(response),
        candidates: response.status === 200 && response.bytes
          ? extractCandidates(response.bytes.toString('utf8'), response.url ?? reference, artwork) : [],
      };
    }
    const candidates = report.references[referenceKey].candidates;
    const verified = [];
    for (const candidate of candidates) {
      if (candidate.url === originalImage) continue;
      if (!report.images[candidate.url]) report.images[candidate.url] = summaryResult(classifyImage(await safeRequest(candidate.url)));
      if (report.images[candidate.url].state === 'available') verified.push(candidate);
    }
    report.artworks[id] = { originalImage, reference, verified, reason: verified.length ? 'recovered' : 'no-verified-alternative' };
    await save();
  }
  const catalog = { version: 1, artworks: {} };
  for (const [id, result] of Object.entries(report.artworks)) {
    catalog.artworks[id] = { originalImage: result.originalImage, images: result.verified.map(candidate => candidate.url) };
  }
  const counts = { available: 0, broken: 0, inconclusive: 0, recovered: 0 };
  const hosts = {};
  for (const [id, artwork] of entries) {
    const state = report.images[normalizeImage(artwork.image?.image)].state;
    counts[state] = (counts[state] ?? 0) + 1;
    let host;
    try {
      host = new URL(normalizeImage(artwork.image?.image)).host;
    } catch {
      host = '(invalid-url)';
    }
    hosts[host] ??= {};
    hosts[host][state] = (hosts[host][state] ?? 0) + 1;
    if (catalog.artworks[id]?.images.length) counts.recovered = (counts.recovered ?? 0) + 1;
  }
  report.summary = { artworks: entries.length, distinctImages: urls.length, counts, hosts };
  await save();
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const unknown = process.argv.slice(2).filter(arg => arg !== '--retry-inconclusive');
  if (unknown.length) {
    console.error(`Argumentos desconhecidos: ${unknown.join(', ')}`);
    process.exitCode = 1;
  } else {
    runAudit({ retryInconclusive: process.argv.includes('--retry-inconclusive') })
      .catch(error => { console.error(error); process.exitCode = 1; });
  }
}
