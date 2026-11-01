import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { artworkImageSources, validateImageCatalog } from './artworkImages.js';
import {
  BUBBLE_RADIUS,
  CENTRAL_ROTATION,
  REF_W,
  REF_H,
  ISO_CONTINENT,
  ISO_CONTINENT_EN,
  UNDATED_YEAR,
  CSV_CREATORS_PATH,
  CSV_CREATORS_DELIMITER,
  CSV_ACERVOS_PATH,
  JSON_ARTWORKS_PATH,
  JSON_ARTWORK_IMAGE_FALLBACKS_PATH,
  GEOJSON_COUNTRIES_PATH,
  CURRENT_YEAR,
} from './constants.js';

// Aliases para unificar grafias diferentes do mesmo acervo.
// Exemplo: "MAC USP" e "MAC" referem-se à mesma coleção.
const ACERVO_ALIASES = { 'MAC USP': 'MAC' };

export function formatAcervoLabel(value) {
  if (!value) return value ?? '';
  return value === 'MAC' ? 'MAC-USP' : value;
}

/**
 * Normaliza valores de confiança do CSV para um formato canônico.
 * Aceita valores PT-BR (alta/médio/baixo) e EN (high/medium/low).
 *
 * @param {string|null|undefined} value — valor bruto da coluna de confiança
 * @returns {('alta'|'médio'|'baixo'|null)} valor normalizado, ou `null` se vazio/desconhecido
 */
export function normalizeConfidence(value) {
  if (!value) return null;
  const val = value.toLowerCase().trim();
  // PT-BR
  if (val === 'alta') return 'alta';
  if (val === 'alto') return 'alta';
  if (val === 'médio' || val === 'medio' || val === 'média' || val === 'media') return 'médio';
  if (val === 'baixa' || val === 'baixo') return 'baixo';
  // EN
  if (val === 'high') return 'alta';
  if (val === 'medium') return 'médio';
  if (val === 'low') return 'baixo';
  return null;
}

/**
 * Quebra um campo separado por ` > ` em lista de strings limpas.
 * Usado para parsear colunas multi-valor do CSV (educated at, lat_educated_at, lon_educated_at).
 *
 * @param {string|null|undefined} val
 * @returns {string[]}
 */
function splitGt(val) {
  return (val ?? '').split('>').map(s => s.trim()).filter(Boolean);
}

/**
 * Distância euclidiana ao quadrado entre dois pontos {lat, lon}.
 * Suficiente para comparações de proximidade (sem necessidade de projeção).
 */
function dist2(a, b) {
  const dlat = a.lat - b.lat;
  const dlon = a.lon - b.lon;
  return dlat * dlat + dlon * dlon;
}

/**
 * Reordena `points` por nearest-neighbor greedy partindo de `anchor`.
 * Minimiza vai-e-vem visual nas trajetórias educacionais.
 * Se `anchor` for nulo ou `points` tiver ≤1 elemento, retorna sem alteração.
 */
function nearestNeighborSort(points, anchor) {
  if (points.length <= 1 || !anchor) return points;
  const remaining = [...points];
  const sorted = [];
  let pos = anchor;
  while (remaining.length > 0) {
    let minDist = Infinity;
    let minIdx = 0;
    for (let k = 0; k < remaining.length; k++) {
      const d = dist2(pos, remaining[k]);
      if (d < minDist) { minDist = d; minIdx = k; }
    }
    sorted.push(remaining[minIdx]);
    pos = remaining[minIdx];
    remaining.splice(minIdx, 1);
  }
  return sorted;
}

/**
 * Quebra um campo de acervos separado por ` > `, aplica aliases e remove duplicatas.
 *
 * @param {string|null|undefined} val
 * @returns {string[]} lista de acervos únicos já normalizados
 */
function splitSemicolon(val) {
  return [...new Set(
    (val ?? '').split('>').map(s => s.trim()).filter(Boolean)
      .map(s => ACERVO_ALIASES[s] ?? s)
  )];
}

/**
 * Retorna o nome do continente em PT-BR para um código ISO 3166-1 numérico.
 * Aceita string ou número; retorna `null` se desconhecido ou nulo.
 *
 * @param {string|number|null|undefined} isoId
 * @returns {string|null}
 */
export function continentForIsoId(isoId, locale = 'pt') {
  if (isoId === null || isoId === undefined) return null;
  const key = String(isoId);
  const continentMap = locale === 'en' ? ISO_CONTINENT_EN : ISO_CONTINENT;
  return continentMap[key] ?? continentMap[String(parseInt(key, 10))] ?? null;
}

/**
 * Ordena obras por `year` descendente. Obras com `year === UNDATED_YEAR`, `null`,
 * `undefined` ou não-numérico vão para o final, na ordem original entre si.
 *
 * @param {object[]} artworks
 * @returns {object[]} novo array ordenado (não muta o original)
 */
export function sortArtworks(artworks) {
  const isUndated = (y) => y === null || y === undefined || y === UNDATED_YEAR || typeof y !== 'number' || Number.isNaN(y);
  return [...artworks].sort((a, b) => {
    const au = isUndated(a.year);
    const bu = isUndated(b.year);
    if (au && bu) return 0;
    if (au) return 1;
    if (bu) return -1;
    return b.year - a.year;
  });
}

/**
 * Carrega o CSV de acervos geolocalizados e retorna bubbles do tipo `acervo`.
 * Linhas sem lat/lon válidos são ignoradas silenciosamente. Acervos que
 * compartilham a mesma coordenada (arredondada a 4 casas ≈ 11 m) são
 * agrupados em uma única bubble cujo `creator` concatena os nomes.
 *
 * @returns {Promise<object[]>}
 */
async function loadAcervoBubbles() {
  const rows = await d3.csv(CSV_ACERVOS_PATH);
  /** @type {Map<string, { lat: number, lon: number, names: string[] }>} */
  const groups = new Map();
  for (const row of rows) {
    const acervo = (row.acervo ?? '').trim();
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);
    if (!acervo || isNaN(lat) || isNaN(lon)) continue;
    const name = ACERVO_ALIASES[acervo] ?? acervo;
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const g = groups.get(key);
    if (g) {
      if (!g.names.includes(name)) g.names.push(name);
    } else {
      groups.set(key, { lat, lon, names: [name] });
    }
  }
  const out = [];
  let i = 0;
  for (const { lat, lon, names } of groups.values()) {
    const label = names.join(', ');
    out.push({
      id: `acervo-${i++}`,
      creator: label,
      lat,
      lon,
      type: 'acervo',
      place: label,
      acervos: names,
      educatedAt: [],
      nationality: '',
      gender: 'unknown',
      score: 0,
      confidence: null,
    });
  }
  return out;
}

/**
 * Carrega o JSON de obras e retorna um Map `creator -> obras[]` já ordenado
 * por `year` descendente (UNDATED_YEAR/null por último).
 *
 * @returns {Promise<Map<string, object[]>>}
 */
/**
 * Converte o dicionário bruto do `artwork.json` num Map `creator → obras[]`.
 *
 * Aceita dois formatos de entrada por obra:
 * - `creators: string[]` — formato atual; o primeiro elemento é o criador primário.
 * - `creator: string`    — formato legado; envolvido em array para compat retroativa.
 *
 * Cada obra é registrada no mapa de **todos** os seus criadores.
 *
 * @param {Record<string, object>} dict — conteúdo bruto do JSON de obras
 * @returns {Map<string, object[]>}
 */
export function parseArtworkDict(dict, imageCatalog) {
  if (imageCatalog !== undefined) validateImageCatalog(imageCatalog);
  /** @type {Map<string, object[]>} */
  const byCreator = new Map();
  for (const [wikidataId, entry] of Object.entries(dict)) {
    // Resolve lista de criadores: prefere `creators[]`, cai para `creator` legado.
    let creators;
    if (Array.isArray(entry?.creators) && entry.creators.length > 0) {
      creators = entry.creators.map(c => c.trim()).filter(Boolean);
    } else {
      const legacy = (entry?.creator ?? '').trim();
      creators = legacy ? [...legacy.split(' | ')] : [];
    }
    if (creators.length === 0) continue;

    const imageSources = artworkImageSources(wikidataId, entry.image?.image, imageCatalog);
    const artwork = {
      id: wikidataId,
      creators,
      museum: ACERVO_ALIASES[entry.museum ?? ''] ?? entry.museum ?? '',
      title: entry.title ?? '',
      year: typeof entry.year === 'number' && entry.year <= CURRENT_YEAR ? entry.year : null,
      image: imageSources[0] ?? '',
      imageSources,
      url: entry.url ?? '',
    };

    for (const creator of creators) {
      const list = byCreator.get(creator);
      if (list) list.push(artwork);
      else byCreator.set(creator, [artwork]);
    }
  }
  for (const [creator, list] of byCreator) {
    byCreator.set(creator, sortArtworks(list));
  }
  return byCreator;
}

async function loadArtworksByCreator() {
  const [dict, catalog] = await Promise.all(
    [JSON_ARTWORKS_PATH, JSON_ARTWORK_IMAGE_FALLBACKS_PATH].map(async path => {
      const resp = await fetch(`${import.meta.env?.BASE_URL ?? '/'}${path}`);
      if (!resp.ok) throw new Error(`Falha ao carregar JSON de obras (${path}): ${resp.status}`);
      return resp.json();
    }),
  );
  return parseArtworkDict(dict, catalog);
}

/**
 * Carrega e transforma os dados de criadores a partir do CSV-fonte.
 *
 * Para cada linha do CSV, gera até três bubbles (nascimento, estudo, morte)
 * desde que existam coordenadas válidas. Em seguida, deriva as trajetórias
 * encadeando os pontos do mesmo criador na ordem nascimento → estudo → morte
 * (segmentos só são criados quando ambos os extremos existem).
 *
 * Também pré-calcula offsets de descolisão (`dxBase`/`dyBase`) por bubble,
 * usando uma projeção de referência fixa, para que `forceCollide` não rode a
 * cada pan/zoom em runtime.
 *
 * @param {string} [csvPath] — Caminho do CSV de criadores (opcional). Se omitido, usa CSV_CREATORS_PATH.
 * @returns {Promise<{ bubbles: Array<object>, trajectories: Array<object>, artworksByCreator: Map, acervoBubbles: Array<object> }>}
 */
export async function loadData(csvPath, locale = 'pt') {
  globalThis.performance?.mark('atlas:load-start');
  const actualCsvPath = csvPath ?? CSV_CREATORS_PATH;
  const [rows, artworksByCreator, acervoBubbles, topo] = await Promise.all([
    d3.dsv(CSV_CREATORS_DELIMITER, actualCsvPath),
    loadArtworksByCreator(),
    loadAcervoBubbles(),
    d3.json(GEOJSON_COUNTRIES_PATH),
  ]);
  globalThis.performance?.mark('atlas:sources-ready');
  const bubbles = [];
  /** @type {Map<number, { creator: string, birth?: object, educations?: object[], death?: object }>} */
  const byRow = new Map();

  rows.forEach((row, i) => {
    const creator = row['creator']?.trim() ?? '';
    const acervo = row['acervo']?.trim() ?? '';
    const nationality = row['country of citizenship']?.trim() ?? '';
    const gender = row['sex or gender']?.trim() || 'unknown';

    const educatedAt = splitGt(row['educated at']);
    const eduLats   = splitGt(row['lat_educated_at']);
    const eduLons   = splitGt(row['lon_educated_at']);

    const latBirth = parseFloat(row['lat_birth']);
    const lonBirth = parseFloat(row['lon_birth']);
    if (!isNaN(latBirth) && !isNaN(lonBirth)) {
      const b = {
        id: `birth-${i}`,
        creator,
        lat: latBirth,
        lon: lonBirth,
        type: 'birth',
        place: row['place of birth']?.trim() ?? '',
        acervos: splitSemicolon(acervo),
        educatedAt,
        nationality,
        gender,
        score: parseFloat(row['score_birth']) || 0,
        confidence: normalizeConfidence(row['confianca_place_of_birth']),
      };
      bubbles.push(b);
      if (!byRow.has(i)) byRow.set(i, { creator });
      byRow.get(i).birth = b;
    }

    const latDeath = parseFloat(row['lat_death']);
    const lonDeath = parseFloat(row['lon_death']);
    if (!isNaN(latDeath) && !isNaN(lonDeath)) {
      const b = {
        id: `death-${i}`,
        creator,
        lat: latDeath,
        lon: lonDeath,
        type: 'death',
        place: row['place of death']?.trim() ?? '',
        acervos: splitSemicolon(acervo),
        educatedAt,
        nationality,
        gender,
        score: parseFloat(row['score_death']) || 0,
        confidence: normalizeConfidence(row['confianca_preenchimento']),
      };
      bubbles.push(b);
      if (!byRow.has(i)) byRow.set(i, { creator });
      byRow.get(i).death = b;
    }

    // Uma bolha por etapa formativa com coordenada válida embutida no CSV.
    // As colunas lat_educated_at e lon_educated_at usam ' > ' como separador,
    // alinhadas com 'educated at'. Etapas sem coordenada são ignoradas.
    const educationAcervos = splitSemicolon(acervo);
    const educationConfidence = normalizeConfidence(row['confianca_educated_at']);
    const educations = [];
    for (let j = 0; j < educatedAt.length; j++) {
      const lat = parseFloat(eduLats[j]);
      const lon = parseFloat(eduLons[j]);
      if (isNaN(lat) || isNaN(lon)) continue;
      educations.push({
        id: `education-${i}-${j}`,
        creator,
        lat,
        lon,
        type: 'education',
        place: '',
        schoolName: educatedAt[j],
        acervos: educationAcervos,
        educatedAt,
        nationality,
        gender,
        score: 0,
        confidence: educationConfidence,
        dates: '',
      });
    }

    // Reordena por nearest-neighbor (greedy a partir do nascimento) para
    // minimizar vai-e-vem visual nas trajetórias.
    const anchorBirth = (!isNaN(latBirth) && !isNaN(lonBirth))
      ? { lat: latBirth, lon: lonBirth }
      : null;
    const sortedEducations = nearestNeighborSort(educations, anchorBirth);

    if (sortedEducations.length > 0) {
      for (const b of sortedEducations) bubbles.push(b);
      if (!byRow.has(i)) byRow.set(i, { creator });
      byRow.get(i).educations = sortedEducations;
    }
  });

  // Constrói trajetórias: nascimento → estudo₁ → estudo₂ → … → morte
  // (pula extremos faltantes; cria segmento direto birth→death se não houver estudos).
  const trajectories = [];
  for (const [, group] of byRow) {
    const { creator, birth, educations, death } = group;
    const points = [birth, ...(educations ?? []), death].filter(Boolean);
    const segments = [];
    for (let p = 0; p < points.length - 1; p++) {
      const from = points[p];
      const to = points[p + 1];
      segments.push({ from, to, kind: `${from.type}-${to.type}` });
    }
    if (segments.length) trajectories.push({ creator, segments });
  }

  // Pré-computa offset de descolisão (dxBase/dyBase) por bubble usando uma
  // projeção de referência fixa. Em runtime, a posição final fica:
  //   x = projected.x + dxBase / k    (em 2D; k = zoom)
  //   y = projected.y + dyBase / k
  // Em 3D, o offset é aplicado direto (boa aproximação fora das bordas do globo).
  // Roda forceCollide uma única vez aqui, evitando recomputo a cada pan/zoom.
  // REF_W, REF_H e CENTRAL_ROTATION importados de constants.js
  const REF_ROTATION = CENTRAL_ROTATION;
  const refProj = d3.geoEqualEarth()
    .rotate(REF_ROTATION)
    .fitSize([Infinity, REF_H], { type: 'Sphere' })
    .translate([REF_W / 2, REF_H / 2]);

  const RADIUS = BUBBLE_RADIUS;
  const nodes = [];
  const projected = new Array(bubbles.length);
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    const pt = refProj([b.lon, b.lat]);
    if (!pt) {
      b.dxBase = 0;
      b.dyBase = 0;
      projected[i] = null;
      continue;
    }
    projected[i] = { x: pt[0], y: pt[1] };
    nodes.push({ index: i, x: pt[0], y: pt[1] });
  }
  const collide = d3.forceCollide(RADIUS + 0.5).strength(0.7);
  collide.initialize(nodes, () => Math.random());
  // Mais iterações aqui — roda só uma vez, pode pagar o custo.
  for (let it = 0; it < 8; it++) collide(1);
  for (const n of nodes) {
    const p = projected[n.index];
    bubbles[n.index].dxBase = n.x - p.x;
    bubbles[n.index].dyBase = n.y - p.y;
  }

  // Acervos têm dxBase/dyBase = 0 (sem descolisão pré-computada por enquanto)
  for (const b of acervoBubbles) {
    b.dxBase = 0;
    b.dyBase = 0;
  }

  // Pré-anota country/continent para todas as bubbles (artistas + acervos).
  const countriesFeature = topojson.feature(topo, topo.objects.countries);
  annotateGeo([...bubbles, ...acervoBubbles], countriesFeature, locale);

  // // Warning: reportar criadores sem dados de acervo - DESATIVADO POR ENQUANTO
  // const creatorsWithoutAcervo = new Set();
  // for (const b of bubbles) {
  //   if (b.acervos.length === 0) {
  //     creatorsWithoutAcervo.add(b.creator);
  //   }
  // }
  // if (creatorsWithoutAcervo.size > 0) {
  //   console.warn(
  //     `[Meta-Acervo] ${creatorsWithoutAcervo.size} criadores sem dados de acervo (sempre filtrados): ${Array.from(creatorsWithoutAcervo).slice(0, 5).join(', ')}${creatorsWithoutAcervo.size > 5 ? '...' : ''}`
  //   );
  // }

  globalThis.performance?.mark('atlas:data-ready');
  return { bubbles, trajectories, artworksByCreator, acervoBubbles };
}

/**
 * Para cada bubble, popula `country` (nome em inglês do TopoJSON) e
 * `continent` (PT-BR via `ISO_CONTINENT` ou EN via `ISO_CONTINENT_EN`). Os campos ficam `null` quando
 * nenhuma feature contém o ponto.
 *
 * @param {object[]} bubbles
 * @param {object} countriesFeature - FeatureCollection do TopoJSON
 * @param {'pt' | 'en'} locale - idioma alvo para nomes de continentes
 */
function annotateGeo(bubbles, countriesFeature, locale = 'pt') {
  for (const b of bubbles) {
    b.country = null;
    b.continent = null;
  }
  for (const feature of countriesFeature.features) {
    const name = feature.properties?.name ?? null;
    const continent = continentForIsoId(feature.id, locale);
    for (const b of bubbles) {
      if (b.country !== null) continue;
      if (d3.geoContains(feature, [b.lon, b.lat])) {
        b.country = name;
        b.continent = continent;
      }
    }
  }
}
