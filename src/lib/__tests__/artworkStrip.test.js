import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import ArtworkStrip from '../../components/ArtworkStrip.svelte';

const source = readFileSync(new URL('../../components/ArtworkStrip.svelte', import.meta.url), 'utf8');

const artwork = (id, image = '') => ({
  id, image, title: `Obra ${id}`, creators: ['Artista'], museum: 'Museu', year: 2000,
  url: `https://example.org/works/${id}`,
});

describe('ArtworkStrip renderizado', () => {
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
