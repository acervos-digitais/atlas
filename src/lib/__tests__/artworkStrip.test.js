import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import ArtworkStrip from '../../components/ArtworkStrip.svelte';
import { sortArtworks } from '../dataUtils.js';
import { ARTWORK_STRIP_KEYBOARD_STEP } from '../constants.js';

const source = readFileSync(new URL('../../components/ArtworkStrip.svelte', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../../App.svelte', import.meta.url), 'utf8');

test.each([null, { creator: 'Artista' }])('ordenação da faixa com seleção %j', selectedArtist => {
  const start = appSource.indexOf('$: artworksForStrip = (() => {');
  const end = appSource.indexOf('})();', start);
  const body = appSource.slice(start + '$: artworksForStrip = (() => {'.length, end);
  const works = [
    { id: 'mac', creators: ['Artista'], museum: 'MAC', year: 1800 },
    { id: 'new', creators: ['Artista'], museum: 'Outro', year: 2000 },
    { id: 'old', creators: ['Artista'], museum: 'Outro', year: 1900 },
    { id: 'undated', creators: ['Artista'], museum: 'Outro', year: null },
  ];
  const result = new Function('sortArtworks', 'selectedArtist', 'artworksByCreator', 'activeAcervos', 'bubblesForMap', body)(
    sortArtworks, selectedArtist, new Map([['Artista', works]]), new Set(), [{ creator: 'Artista' }],
  );
  expect(result.map(o => o.id)).toEqual(['undated', 'old', 'new', 'mac']);
  const { body: rendered } = render(ArtworkStrip, { props: { artworks: result } });
  expect(rendered.match(/class="artwork__btn\b/g)).toHaveLength(4);
});

const artwork = (id, image = '') => ({
  id, image, title: `Obra ${id}`, creators: ['Artista'], museum: 'Museu', year: 2000,
  url: `https://example.org/works/${id}`,
});

describe('ArtworkStrip renderizado', () => {
  test('não ocupa espaço quando não há obras', () => {
    expect(render(ArtworkStrip, { props: { artworks: [] } }).body).not.toContain('<section');
  });

  test.each(['pt', 'en'])('renderiza alça e controle independentes em %s', locale => {
    const { body } = render(ArtworkStrip, { props: { locale, artworks: [artwork('a')] } });
    expect(body).toContain('role="separator"');
    expect(body).toContain('aria-orientation="horizontal"');
    expect(body).toContain('aria-valuenow="153"');
    expect(body).toContain('artwork-chevron.svg');
    expect(body).toContain(`class="artwork-strip__label`);
    expect(body).toContain(locale === 'pt' ? 'Conheça as obras' : 'Learn about the works');
    expect(body).not.toContain('artwork-strip__tab-image');
    expect(body).toContain(locale === 'pt' ? 'Ajustar altura' : 'Resize artwork');
  });
  test.each([['pt', 'Imagem indisponível'], ['en', 'Image unavailable']])(
    'preserva obras, ordem e identidade com imagem ausente em %s',
    (locale, label) => {
      const { body } = render(ArtworkStrip, {
        props: { locale, artworks: [artwork('a'), artwork('b', 'https://example.org/b.jpg')] },
      });
      expect(body).toContain(label);
      expect(body).toContain('Obra a — Artista — Museu — 2000');
      expect(body.indexOf('Obra a')).toBeLessThan(body.indexOf('Obra b'));
      expect(body.match(/class="artwork__btn\b/g)).toHaveLength(2);
    },
  );

  test.each([false, true])('mantém obras ao recolher/expandir (%s)', collapsed => {
    const { body } = render(ArtworkStrip, {
      props: { collapsed, artworks: [artwork('a')] },
    });
    expect(body).toContain(`aria-expanded="${!collapsed}"`);
    expect(body.includes(' inert')).toBe(collapsed);
    expect(body).toContain('Obra a');
  });
});

function resizeController() {
  const handlers = source.slice(source.indexOf('  function setHeight('), source.indexOf('  /** Distância'));
  let scheduled;
  const cancel = vi.fn(() => { scheduled = null; });
  const controller = new Function(
    'requestAnimationFrame', 'cancelAnimationFrame', 'ARTWORK_STRIP_KEYBOARD_STEP',
    `let minHeight = 30, maxHeight = 480, stripHeight = 153, customHeight = null;
     let collapsed = false, drag = null, dragFrame = null, pendingHeight = null;
     const onArtworkPointerLeave = () => {};
     ${handlers}
     return { setHeight, startResize, moveResize, endResize, resizeByKeyboard,
       state() {
         stripHeight = collapsed ? minHeight : Math.min(maxHeight, customHeight ?? 153);
         return { height: stripHeight, customHeight, collapsed, dragging: drag !== null };
       }
     };`,
  )(cb => { scheduled = cb; return 1; }, cancel, ARTWORK_STRIP_KEYBOARD_STEP);
  return { ...controller, flush() { const cb = scheduled; scheduled = null; cb?.(); }, cancel };
}

describe('redimensionamento da faixa', () => {
  test('limita expansão e recolhe sem perder última altura expandida', () => {
    const c = resizeController();
    c.setHeight(900);
    expect(c.state().height).toBe(480);
    c.setHeight(-200);
    expect(c.state()).toMatchObject({ height: 30, collapsed: true, customHeight: 480 });
  });

  test('teclado suporta setas, Home e End sem capturar outras teclas', () => {
    const c = resizeController();
    const preventDefault = vi.fn();
    c.resizeByKeyboard({ key: 'ArrowUp', preventDefault });
    expect(c.state().height).toBe(153 + ARTWORK_STRIP_KEYBOARD_STEP);
    c.resizeByKeyboard({ key: 'ArrowDown', preventDefault });
    expect(c.state().height).toBe(153);
    c.resizeByKeyboard({ key: 'End', preventDefault });
    expect(c.state().height).toBe(480);
    c.resizeByKeyboard({ key: 'Home', preventDefault });
    expect(c.state().collapsed).toBe(true);
    c.resizeByKeyboard({ key: 'Tab', preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(4);
  });

  test.each(['mouse', 'touch', 'pen'])('arraste %s agrupa movimentos e para no release', pointerType => {
    const c = resizeController();
    const target = { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() };
    const event = (clientY, extra = {}) => ({
      clientY, pointerId: 7, pointerType, isPrimary: true, button: 0,
      currentTarget: target, preventDefault: vi.fn(), ...extra,
    });
    c.startResize(event(500));
    c.moveResize(event(450));
    c.moveResize(event(400));
    expect(c.state().height).toBe(153);
    c.flush();
    expect(c.state().height).toBe(253);
    c.endResize(event(380, { type: 'pointerup' }));
    expect(c.state()).toMatchObject({ height: 273, dragging: false });
    c.moveResize(event(100));
    c.flush();
    expect(c.state().height).toBe(273);
    expect(target.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  test.each(['pointercancel', 'lostpointercapture'])('%s conclui movimento pendente e limpa arraste', type => {
    const c = resizeController();
    const target = { setPointerCapture: vi.fn(), hasPointerCapture: () => false };
    const event = { pointerId: 1, isPrimary: true, button: 0, currentTarget: target, preventDefault: vi.fn() };
    c.startResize({ ...event, clientY: 400 });
    c.moveResize({ ...event, clientY: 300 });
    c.endResize({ ...event, type });
    expect(c.state()).toMatchObject({ height: 253, dragging: false });
    expect(c.cancel).toHaveBeenCalled();
  });
});

// Exercita a action real sem replicar seu algoritmo nem acrescentar um DOM de teste.
function imageAction(Observer) {
  const action = source.slice(source.indexOf('  function lazyImg('), source.indexOf('</script>'));
  return new Function('IntersectionObserver', 'scrollEl', `let observer = null;\n${action}\nreturn lazyImg;`)(
    Observer, {},
  );
}

function imageNode() {
  const attributes = new Map();
  return {
    dataset: {},
    classList: { remove: vi.fn(), add: vi.fn() },
    removeAttribute(name) {
      attributes.delete(name);
      if (name === 'data-lazy-src') delete this.dataset.lazySrc;
    },
    set src(value) { attributes.set('src', value); },
    get src() { return attributes.get('src'); },
  };
}

describe('action de imagens nativa e observer', () => {
  test('carrega nativamente sem observer e nunca atribui src vazio', () => {
    const node = imageNode();
    const action = imageAction(undefined)(node, { src: 'a.jpg', deferred: true });
    expect(node.src).toBe('a.jpg');
    node.classList.remove.mockClear();
    action.update({ src: 'a.jpg', deferred: true });
    expect(node.src).toBe('a.jpg');
    expect(node.classList.remove).not.toHaveBeenCalled();
    action.update({ src: '', deferred: false });
    expect(node.src).toBeUndefined();
    action.update({ src: 'b.jpg', deferred: false });
    expect(node.src).toBe('b.jpg');
    action.destroy();
  });

  test('altura da faixa acompanha layout real e limpa o observer', () => {
    const actionSource = source.slice(source.indexOf('  function measureHeight('), source.indexOf('  /** Quando true'));
    let callback;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const Observer = function (cb) {
      callback = cb;
      this.observe = observe;
      this.disconnect = disconnect;
    };
    const { measureHeight, height } = new Function('ResizeObserver',
      `let renderedHeight = 0;\n${actionSource}\nreturn { measureHeight, height: () => renderedHeight };`)(Observer);
    let actualHeight = 36;
    const node = { getBoundingClientRect: () => ({ height: actualHeight }) };
    const action = measureHeight(node);
    expect(observe).toHaveBeenCalledWith(node);
    expect(height()).toBe(36);
    actualHeight = 160.5;
    callback();
    expect(height()).toBe(160.5);
    action.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(height()).toBe(0);
  });

  test('interseção agenda cada imagem sem marcar sucesso e limpa inscrições', () => {
    let callback;
    const observe = vi.fn();
    const unobserve = vi.fn();
    const Observer = vi.fn(function (cb) {
      callback = cb;
      this.observe = observe;
      this.unobserve = unobserve;
    });
    const lazyImg = imageAction(Observer);
    const a = imageNode();
    const b = imageNode();
    const actionA = lazyImg(a, { src: 'a.jpg', deferred: true });
    const actionB = lazyImg(b, { src: 'b.jpg', deferred: true });
    expect(Observer).toHaveBeenCalledTimes(1);
    expect(a.src).toBeUndefined();
    callback([{ target: a, isIntersecting: false }, { target: b, isIntersecting: true }]);
    expect(a.src).toBeUndefined();
    expect(b.src).toBe('b.jpg');
    expect(b.classList.add).not.toHaveBeenCalled();
    observe.mockClear();
    actionB.update({ src: 'b.jpg', deferred: true });
    expect(b.src).toBe('b.jpg');
    expect(observe).not.toHaveBeenCalled();
    actionA.update({ src: 'updated.jpg', deferred: true });
    callback([{ target: a, isIntersecting: true }]);
    expect(a.src).toBe('updated.jpg');
    actionA.update({ src: 'native.jpg', deferred: false });
    expect(a.src).toBe('native.jpg');
    actionA.destroy();
    actionB.destroy();
    expect(unobserve).toHaveBeenCalledWith(a);
    expect(unobserve).toHaveBeenCalledWith(b);
  });
});
