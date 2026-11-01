import { parseArtworkDict } from '../dataUtils.js';
import { artworkImageSources, availableArtworkImage, recordImageFailure, validateImageCatalog } from '../artworkImages.js';

const original = 'https://example.org/original.jpg';
const first = 'https://example.org/first.jpg';
const second = 'https://example.org/second.jpg';
const catalog = images => ({ version: 1, artworks: { '42': { originalImage: original, images } } });

describe('catálogo de alternativas', () => {
  test('prioriza alternativas, deduplica e nunca repete a original', () => {
    expect(artworkImageSources('42', original, catalog([first, first, original, second]))).toEqual([first, second]);
  });
  test('não aplica registro obsoleto e respeita ID exato', () => {
    expect(artworkImageSources('42', second, catalog([first]))).toEqual([second]);
    expect(artworkImageSources('Q42', original, catalog([first]))).toEqual([original]);
  });
  test('quebra confirmada sem alternativa produz lista vazia', () => {
    expect(artworkImageSources('42', original, catalog([]))).toEqual([]);
  });
  test.each([null, {}, { version: 2, artworks: {} }, catalog(['javascript:alert(1)']), catalog([null]), catalog(['https://user:secret@example.org/a'])])(
    'rejeita catálogo inválido explicitamente: %j', value => {
      expect(() => validateImageCatalog(value)).toThrow();
    },
  );
  test('preserva identidade, ordenação e múltiplos criadores sem imagem', () => {
    const dict = { '42': { creators: ['A', 'B'], title: 'Obra', year: 2000, image: { image: original }, url: 'https://example.org/work' } };
    const result = parseArtworkDict(dict, catalog([]));
    expect(result.get('A')).toHaveLength(1);
    expect(result.get('B')[0]).toBe(result.get('A')[0]);
    expect(result.get('A')[0]).toMatchObject({ id: '42', title: 'Obra', image: '', imageSources: [], url: dict['42'].url });
  });
});

describe('tentativas finitas de imagem', () => {
  const art = { id: '42', image: first, imageSources: [first, second] };
  test('avança uma vez por fonte e termina no placeholder', () => {
    expect(availableArtworkImage(art)).toBe(first);
    let failure = recordImageFailure(art, first);
    expect(availableArtworkImage(art, failure)).toBe(second);
    failure = recordImageFailure(art, second, failure);
    expect(availableArtworkImage(art, failure)).toBe('');
    expect(availableArtworkImage({ ...art }, failure)).toBe('');
    expect(availableArtworkImage({ ...art, imageSources: [original] }, failure)).toBe(original);
  });
});
