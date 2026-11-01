import { continentForIsoId, sortArtworks, normalizeConfidence, formatAcervoLabel, parseArtworkDict } from '../dataUtils.js';

describe('imagens das obras', () => {
  test('normaliza Commons para HTTPS sem alterar identidade, acesso ou contagem', () => {
    const byCreator = parseArtworkDict({
      a: { creator: 'Artista', title: 'Título', year: 2000, image: { image: ' http://commons.wikimedia.org/wiki/Special:FilePath/Obra.jpg ' }, url: 'https://example.org/a' },
      b: { creator: 'Artista', image: { image: null } },
      c: { creator: 'Artista', image: { image: 42 } },
    });
    const works = byCreator.get('Artista');
    expect(works).toHaveLength(3);
    expect(works.find(work => work.id === 'a')).toMatchObject({
      title: 'Título', year: 2000, url: 'https://example.org/a',
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Obra.jpg',
    });
    expect(works.filter(work => !work.image)).toHaveLength(2);
  });
});

describe('continentForIsoId', () => {
  test('mapeia código ISO existente para o continente correto (Brasil → América do Sul)', () => {
    expect(continentForIsoId('76')).toBe('América do Sul');
  });

  test('aceita número além de string (76 → América do Sul)', () => {
    expect(continentForIsoId(76)).toBe('América do Sul');
  });

  test('cobre os seis continentes principais com códigos representativos', () => {
    expect(continentForIsoId('840')).toBe('América do Norte'); // EUA
    expect(continentForIsoId('250')).toBe('Europa');           // França
    expect(continentForIsoId('392')).toBe('Ásia');             // Japão
    expect(continentForIsoId('818')).toBe('África');           // Egito
    expect(continentForIsoId('36')).toBe('Oceania');           // Austrália
    expect(continentForIsoId('10')).toBe('Antártica');
  });

  test('retorna null para código inexistente', () => {
    expect(continentForIsoId('99999')).toBeNull();
  });

  test('retorna null para null ou undefined', () => {
    expect(continentForIsoId(null)).toBeNull();
    expect(continentForIsoId(undefined)).toBeNull();
  });
});

describe('sortArtworks', () => {
  test('ordena por year decrescente', () => {
    const out = sortArtworks([
      { id: 'a', year: 1950 },
      { id: 'b', year: 2000 },
      { id: 'c', year: 1900 },
    ]);
    expect(out.map(o => o.id)).toEqual(['b', 'a', 'c']);
  });

  test('coloca year === 9999 no final', () => {
    const out = sortArtworks([
      { id: 'a', year: 9999 },
      { id: 'b', year: 2000 },
      { id: 'c', year: 1900 },
    ]);
    expect(out.map(o => o.id)).toEqual(['b', 'c', 'a']);
  });

  test('coloca year === null no final', () => {
    const out = sortArtworks([
      { id: 'a', year: null },
      { id: 'b', year: 2000 },
      { id: 'c', year: 1900 },
    ]);
    expect(out.map(o => o.id)).toEqual(['b', 'c', 'a']);
  });

  test('coloca year undefined no final', () => {
    const out = sortArtworks([
      { id: 'a' },
      { id: 'b', year: 2000 },
    ]);
    expect(out.map(o => o.id)).toEqual(['b', 'a']);
  });

  test('agrupa 9999, null, undefined e não-numérico ao final, mantendo ordem relativa', () => {
    const out = sortArtworks([
      { id: 'a', year: 9999 },
      { id: 'b', year: null },
      { id: 'c', year: 2000 },
      { id: 'd' },
      { id: 'e', year: 'desconhecido' },
      { id: 'f', year: 1800 },
    ]);
    // Datados: c (2000), f (1800). Indatados na ordem original: a, b, d, e.
    expect(out.map(o => o.id)).toEqual(['c', 'f', 'a', 'b', 'd', 'e']);
  });

  test('não muta o array original', () => {
    const input = [
      { id: 'a', year: 1950 },
      { id: 'b', year: 2000 },
    ];
    const snapshot = input.map(o => o.id);
    sortArtworks(input);
    expect(input.map(o => o.id)).toEqual(snapshot);
  });

  test('retorna array vazio para entrada vazia', () => {
    expect(sortArtworks([])).toEqual([]);
  });
});

describe('formatAcervoLabel', () => {
  test('substitui MAC por MAC-USP no rótulo de exibição', () => {
    expect(formatAcervoLabel('MAC')).toBe('MAC-USP');
  });

  test('preserva outros valores de acervo', () => {
    expect(formatAcervoLabel('MASP')).toBe('MASP');
    expect(formatAcervoLabel('')).toBe('');
  });
});

describe('normalizeConfidence', () => {
  test('normaliza valor PT-BR "alta" para "alta"', () => {
    expect(normalizeConfidence('alta')).toBe('alta');
  });

  test('normaliza valor PT-BR "alto" para "alta"', () => {
    expect(normalizeConfidence('alto')).toBe('alta');
  });

  test('normaliza valor PT-BR "médio" e "medio" para "médio"', () => {
    expect(normalizeConfidence('médio')).toBe('médio');
    expect(normalizeConfidence('medio')).toBe('médio');
  });

  test('normaliza valor PT-BR "baixa" e "baixo" para "baixo"', () => {
    expect(normalizeConfidence('baixa')).toBe('baixo');
    expect(normalizeConfidence('baixo')).toBe('baixo');
  });

  test('normaliza valor EN "high" para "alta"', () => {
    expect(normalizeConfidence('high')).toBe('alta');
  });

  test('normaliza valor EN "medium" para "médio"', () => {
    expect(normalizeConfidence('medium')).toBe('médio');
  });

  test('normaliza valor EN "low" para "baixo"', () => {
    expect(normalizeConfidence('low')).toBe('baixo');
  });

  test('retorna null para null ou undefined', () => {
    expect(normalizeConfidence(null)).toBeNull();
    expect(normalizeConfidence(undefined)).toBeNull();
  });

  test('retorna null para string vazia', () => {
    expect(normalizeConfidence('')).toBeNull();
  });

  test('retorna null para valor desconhecido', () => {
    expect(normalizeConfidence('desconhecido')).toBeNull();
  });

  test('é case-insensitive', () => {
    expect(normalizeConfidence('ALTA')).toBe('alta');
    expect(normalizeConfidence('HIGH')).toBe('alta');
    expect(normalizeConfidence('Medium')).toBe('médio');
  });
});

describe('parseArtworkDict', () => {
  test('obra com creators[] aparece no mapa de todos os criadores', () => {
    const map = parseArtworkDict({
      'W1': { creators: ['Artista A', 'Artista B'], title: 'Obra Colaborativa', year: 2000 },
    });
    expect(map.has('Artista A')).toBe(true);
    expect(map.has('Artista B')).toBe(true);
    expect(map.get('Artista A')[0].id).toBe('W1');
    expect(map.get('Artista B')[0].id).toBe('W1');
  });

  test('obra com creators[] tem a mesma instância em ambos os mapas', () => {
    const map = parseArtworkDict({
      'W1': { creators: ['Artista A', 'Artista B'], title: 'Obra Colaborativa', year: 2000 },
    });
    expect(map.get('Artista A')[0]).toBe(map.get('Artista B')[0]);
  });

  test('creators[0] é o criador primário', () => {
    const map = parseArtworkDict({
      'W1': { creators: ['Primário', 'Secundário'], title: 'Obra', year: 2000 },
    });
    expect(map.get('Primário')[0].creators[0]).toBe('Primário');
    expect(map.get('Secundário')[0].creators[0]).toBe('Primário');
  });

  test('formato legado creator (string) continua funcionando', () => {
    const map = parseArtworkDict({
      'W2': { creator: 'Artista Legado', title: 'Obra Legada', year: 1990 },
    });
    expect(map.has('Artista Legado')).toBe(true);
    expect(map.get('Artista Legado')[0].creators).toEqual(['Artista Legado']);
  });

  test('obra sem creators nem creator é ignorada', () => {
    const map = parseArtworkDict({
      'W3': { title: 'Obra Sem Autor', year: 2010 },
    });
    expect(map.size).toBe(0);
  });

  test('obra com creators vazio é ignorada', () => {
    const map = parseArtworkDict({
      'W4': { creators: [], title: 'Sem Autor', year: 2010 },
    });
    expect(map.size).toBe(0);
  });

  test('obra com creator vazio é ignorada', () => {
    const map = parseArtworkDict({
      'W5': { creator: '  ', title: 'Sem Autor', year: 2010 },
    });
    expect(map.size).toBe(0);
  });

  test('preserva os demais campos da obra', () => {
    const map = parseArtworkDict({
      'W6': { creator: 'Artista', title: 'Título', year: 2005, museum: 'MASP', url: 'https://ex.com' },
    });
    const obra = map.get('Artista')[0];
    expect(obra.id).toBe('W6');
    expect(obra.title).toBe('Título');
    expect(obra.year).toBe(2005);
    expect(obra.museum).toBe('MASP');
    expect(obra.url).toBe('https://ex.com');
  });
});
