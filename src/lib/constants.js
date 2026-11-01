/**
 * Constantes canônicas compartilhadas entre módulos.
 * Fonte de verdade única para valores que antes eram duplicados em
 * WorldMap.svelte, Tooltip.svelte, FilterControls.svelte e dataUtils.js.
 */

// ─── Versão da plataforma ─────────────────────────────────────────────────────

/** Versão da plataforma, injetada pelo Vite a partir de package.json.
 * Para atualizar a versão exibida na UI, altere somente o campo
 * "version" em package.json. */
// eslint-disable-next-line no-undef
export const APP_VERSION = __APP_VERSION__;

// ─── Cores e rótulos por tipo de bubble ──────────────────────────────────────

// Paleta canônica do tema escuro (referência Figma 65VY0RJh4omVZFM7FCBbAL, nó 1:7358).
// Espelha os tokens de cor em src/styles/global.scss (--birth/-death/-edu-color).
// Estas cores são usadas tanto nas bubbles do mapa quanto nas pills do header.
export const TYPE_COLOR = {
  birth:     '#f0e442',  // amarelo — Nascimento
  death:     '#009e74',  // verde — Morte
  education: '#cc79a7',  // rosa — Estudo
  acervo:    '#ffffff',  // branco — Acervo
};

// Tom mais brilhante/saturado por tipo — usado em estado hover das pills e
// nos botões do overlay. Sempre distinto (mais vivo) do tom base em TYPE_COLOR.
export const TYPE_COLOR_HOVER = {
  birth:     '#f5e51c',  // amarelo saturado — Nascimento hover
  death:     '#2ec09c',  // verde-água — Morte hover
  education: '#e89bd3',  // rosa claro — Estudo hover
  acervo:    '#bbbbbb',  // neutro-30 — Acervo hover
};

/** Cor da bubble de acervo no tema claro — carvão escuro para contraste sobre oceano claro. */
export const TYPE_COLOR_ACERVO_LIGHT = '#bbbbbb';

export const TYPE_LABEL = {
  pt: {
    birth:     'Nascimento',
    death:     'Morte',
    education: 'Formação',
    acervo:    'Museus',
  },
  en: {
    birth:     'Birth',
    death:     'Death',
    education: 'Education',
    acervo:    'Museums',
  },
};

// ─── Rótulos de gênero (PT-BR ↔ EN) ──────────────────────────────────────────────
export const GENDER_LABEL = {
  pt: {
    male:       'Masculino',
    female:     'Feminino',
    'non-binary': 'Não-binário',
    unknown:    'Desconhecido',
  },
  en: {
    male:       'Male',
    female:     'Female',
    'non-binary': 'Non-binary',
    unknown:    'Unknown',
  },
};

// ─── Normalização de valores de confiança do CSV ──────────────────────────────

/**
 * Normaliza os valores inconsistentes do campo de confiança no CSV
 * (alto/alta/médio/baixa/baixo em PT e high/medium/low em EN) para labels canônicos.
 */
export const CONFIDENCE_LABEL = {
  pt: {
    alto:  'Alta',
    alta:  'Alta',
    médio: 'Média',
    medio: 'Média',
    baixa: 'Baixa',
    baixo: 'Baixa',
  },
  en: {
    high:   'High',
    medium: 'Medium',
    low:    'Low',
    // chaves canônicas PT (saída de normalizeConfidence) — necessárias porque
    // normalizeConfidence sempre retorna valores PT independentemente do locale.
    alta:  'High',
    médio: 'Medium',
    medio: 'Medium',
    baixa: 'Low',
    baixo: 'Low',
  },
};

// ────────────────── Filtro de nacionalidades (desativado) ─────────────────────────────
export const NATIONALITIES_FILTER_ENABLED = false;

// ─── Mapeamento ISO 3166-1 numérico → continente (PT-BR) ─────────────────────

/**
 * Chave: código ISO 3166-1 numérico como string (ex: '76' para o Brasil).
 * Valor: nome do continente em PT-BR.
 * Usado por dataUtils para pré-computar o continente de cada bubble.
 */
export const ISO_CONTINENT = {
  // África
  '12': 'África', '24': 'África', '204': 'África', '72': 'África',
  '854': 'África', '108': 'África', '120': 'África', '140': 'África',
  '148': 'África', '174': 'África', '178': 'África', '180': 'África',
  '384': 'África', '262': 'África', '818': 'África', '226': 'África',
  '232': 'África', '231': 'África', '266': 'África', '270': 'África',
  '288': 'África', '324': 'África', '624': 'África', '404': 'África',
  '426': 'África', '430': 'África', '434': 'África', '450': 'África',
  '454': 'África', '466': 'África', '478': 'África', '480': 'África',
  '504': 'África', '508': 'África', '516': 'África', '562': 'África',
  '566': 'África', '646': 'África', '678': 'África', '686': 'África',
  '694': 'África', '706': 'África', '710': 'África', '728': 'África',
  '729': 'África', '748': 'África', '834': 'África', '768': 'África',
  '788': 'África', '800': 'África', '894': 'África', '716': 'África',

  // América do Norte
  '124': 'América do Norte', '484': 'América do Norte', '840': 'América do Norte',

  // América Central e Caribe
  '28': 'América Central e Caribe', '44': 'América Central e Caribe',
  '52': 'América Central e Caribe', '84': 'América Central e Caribe',
  '188': 'América Central e Caribe', '192': 'América Central e Caribe',
  '212': 'América Central e Caribe', '214': 'América Central e Caribe',
  '222': 'América Central e Caribe', '308': 'América Central e Caribe',
  '320': 'América Central e Caribe', '332': 'América Central e Caribe',
  '340': 'América Central e Caribe', '388': 'América Central e Caribe',
  '558': 'América Central e Caribe', '591': 'América Central e Caribe',
  '659': 'América Central e Caribe', '662': 'América Central e Caribe',
  '670': 'América Central e Caribe', '780': 'América Central e Caribe',

  // América do Sul
  '32': 'América do Sul', '68': 'América do Sul', '76': 'América do Sul',
  '152': 'América do Sul', '170': 'América do Sul', '218': 'América do Sul',
  '328': 'América do Sul', '600': 'América do Sul', '604': 'América do Sul',
  '740': 'América do Sul', '858': 'América do Sul', '862': 'América do Sul',
  '254': 'América do Sul',

  // Ásia
  '4': 'Ásia', '51': 'Ásia', '31': 'Ásia', '50': 'Ásia', '64': 'Ásia',
  '96': 'Ásia', '116': 'Ásia', '156': 'Ásia', '626': 'Ásia', '268': 'Ásia',
  '356': 'Ásia', '360': 'Ásia', '364': 'Ásia', '368': 'Ásia', '376': 'Ásia',
  '392': 'Ásia', '400': 'Ásia', '398': 'Ásia', '408': 'Ásia', '410': 'Ásia',
  '414': 'Ásia', '417': 'Ásia', '418': 'Ásia', '422': 'Ásia', '458': 'Ásia',
  '462': 'Ásia', '496': 'Ásia', '104': 'Ásia', '524': 'Ásia', '512': 'Ásia',
  '586': 'Ásia', '275': 'Ásia', '608': 'Ásia', '634': 'Ásia', '682': 'Ásia',
  '702': 'Ásia', '144': 'Ásia', '760': 'Ásia', '158': 'Ásia', '762': 'Ásia',
  '764': 'Ásia', '795': 'Ásia', '784': 'Ásia', '860': 'Ásia', '704': 'Ásia',
  '887': 'Ásia', '792': 'Ásia',

  // Europa
  '8': 'Europa', '20': 'Europa', '40': 'Europa', '112': 'Europa',
  '56': 'Europa', '70': 'Europa', '100': 'Europa', '191': 'Europa',
  '196': 'Europa', '203': 'Europa', '208': 'Europa', '233': 'Europa',
  '246': 'Europa', '250': 'Europa', '276': 'Europa', '300': 'Europa',
  '348': 'Europa', '352': 'Europa', '372': 'Europa', '380': 'Europa',
  '428': 'Europa', '438': 'Europa', '440': 'Europa', '442': 'Europa',
  '470': 'Europa', '498': 'Europa', '492': 'Europa', '499': 'Europa',
  '528': 'Europa', '807': 'Europa', '578': 'Europa', '616': 'Europa',
  '620': 'Europa', '642': 'Europa', '643': 'Europa', '674': 'Europa',
  '688': 'Europa', '703': 'Europa', '705': 'Europa', '724': 'Europa',
  '752': 'Europa', '756': 'Europa', '804': 'Europa', '826': 'Europa',
  '336': 'Europa',

  // Oceania
  '36': 'Oceania', '242': 'Oceania', '296': 'Oceania', '584': 'Oceania',
  '583': 'Oceania', '520': 'Oceania', '554': 'Oceania', '585': 'Oceania',
  '598': 'Oceania', '882': 'Oceania', '90': 'Oceania', '776': 'Oceania',
  '798': 'Oceania', '548': 'Oceania',

  // Antártica
  '10': 'Antártica',
};

// ─── Mapeamento de nomes de países (EN → PT-BR) ──────────────────────────────

/**
 * Traduz nomes de países do TopoJSON (Natural Earth 110m, em inglês)
 * para seus nomes em português brasileiro.
 * Chave: nome em inglês (conforme consta em countries-110m.json).
 * Valor: nome em PT-BR.
 * Usado para exibição de tooltips e filtros geográficos.
 */
export const COUNTRY_NAME_PTBR = {
  "Afghanistan": "Afeganistão",
  "Albania": "Albânia",
  "Algeria": "Argélia",
  "Angola": "Angola",
  "Antarctica": "Antártica",
  "Argentina": "Argentina",
  "Armenia": "Armênia",
  "Australia": "Austrália",
  "Austria": "Áustria",
  "Azerbaijan": "Azerbaijão",
  "Bahamas": "Bahamas",
  "Bangladesh": "Bangladesh",
  "Belarus": "Bielorrússia",
  "Belgium": "Bélgica",
  "Belize": "Belize",
  "Benin": "Benin",
  "Bhutan": "Butão",
  "Bolivia": "Bolívia",
  "Bosnia and Herz.": "Bósnia e Herzegovina",
  "Botswana": "Botsuana",
  "Brazil": "Brasil",
  "Brunei": "Brunei",
  "Bulgaria": "Bulgária",
  "Burkina Faso": "Burquina Faso",
  "Burundi": "Burundi",
  "Cambodia": "Camboja",
  "Cameroon": "Camarões",
  "Canada": "Canadá",
  "Central African Rep.": "República Centro-Africana",
  "Chad": "Chade",
  "Chile": "Chile",
  "China": "China",
  "Colombia": "Colômbia",
  "Congo": "Congo",
  "Costa Rica": "Costa Rica",
  "Croatia": "Croácia",
  "Cuba": "Cuba",
  "Cyprus": "Chipre",
  "Czechia": "República Tcheca",
  "Côte d'Ivoire": "Costa do Marfim",
  "Dem. Rep. Congo": "República Democrática do Congo",
  "Denmark": "Dinamarca",
  "Djibouti": "Djibuti",
  "Dominican Rep.": "República Dominicana",
  "Ecuador": "Equador",
  "Egypt": "Egito",
  "El Salvador": "El Salvador",
  "Eq. Guinea": "Guiné Equatorial",
  "Eritrea": "Eritreia",
  "Estonia": "Estônia",
  "Ethiopia": "Etiópia",
  "Falkland Is.": "Ilhas Malvinas",
  "Fiji": "Fiji",
  "Finland": "Finlândia",
  "Fr. S. Antarctic Lands": "Terras Austrais Francesas",
  "France": "França",
  "Gabon": "Gabão",
  "Gambia": "Gâmbia",
  "Georgia": "Geórgia",
  "Germany": "Alemanha",
  "Ghana": "Gana",
  "Greece": "Grécia",
  "Greenland": "Groenlândia",
  "Guatemala": "Guatemala",
  "Guinea": "Guiné",
  "Guinea-Bissau": "Guiné-Bissau",
  "Guyana": "Guiana",
  "Haiti": "Haiti",
  "Honduras": "Honduras",
  "Hungary": "Hungria",
  "Iceland": "Islândia",
  "India": "Índia",
  "Indonesia": "Indonésia",
  "Iran": "Irã",
  "Iraq": "Iraque",
  "Ireland": "Irlanda",
  "Israel": "Israel",
  "Italy": "Itália",
  "Jamaica": "Jamaica",
  "Japan": "Japão",
  "Jordan": "Jordânia",
  "Kazakhstan": "Cazaquistão",
  "Kenya": "Quênia",
  "Kosovo": "Kosovo",
  "Kuwait": "Kuwait",
  "Kyrgyzstan": "Quirguistão",
  "Laos": "Laos",
  "Latvia": "Letônia",
  "Lebanon": "Líbano",
  "Lesotho": "Lesoto",
  "Liberia": "Libéria",
  "Libya": "Líbia",
  "Lithuania": "Lituânia",
  "Luxembourg": "Luxemburgo",
  "Macedonia": "Macedônia",
  "Madagascar": "Madagascar",
  "Malawi": "Malaui",
  "Malaysia": "Malásia",
  "Mali": "Mali",
  "Mauritania": "Mauritânia",
  "Mexico": "México",
  "Moldova": "Moldávia",
  "Mongolia": "Mongólia",
  "Montenegro": "Montenegro",
  "Morocco": "Marrocos",
  "Mozambique": "Moçambique",
  "Myanmar": "Mianmar",
  "N. Cyprus": "Chipre do Norte",
  "Namibia": "Namíbia",
  "Nepal": "Nepal",
  "Netherlands": "Países Baixos",
  "New Caledonia": "Nova Caledônia",
  "New Zealand": "Nova Zelândia",
  "Nicaragua": "Nicarágua",
  "Niger": "Níger",
  "Nigeria": "Nigéria",
  "North Korea": "Coreia do Norte",
  "Norway": "Noruega",
  "Oman": "Omã",
  "Pakistan": "Paquistão",
  "Palestine": "Palestina",
  "Panama": "Panamá",
  "Papua New Guinea": "Papua Nova Guiné",
  "Paraguay": "Paraguai",
  "Peru": "Peru",
  "Philippines": "Filipinas",
  "Poland": "Polônia",
  "Portugal": "Portugal",
  "Puerto Rico": "Porto Rico",
  "Qatar": "Catar",
  "Romania": "Romênia",
  "Russia": "Rússia",
  "Rwanda": "Ruanda",
  "S. Sudan": "Sudão do Sul",
  "Saudi Arabia": "Arábia Saudita",
  "Senegal": "Senegal",
  "Serbia": "Sérvia",
  "Sierra Leone": "Serra Leoa",
  "Slovakia": "Eslováquia",
  "Slovenia": "Eslovênia",
  "Solomon Is.": "Ilhas Salomão",
  "Somalia": "Somália",
  "Somaliland": "Somalilândia",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  "Spain": "Espanha",
  "Sri Lanka": "Sri Lanka",
  "Sudan": "Sudão",
  "Suriname": "Suriname",
  "Sweden": "Suécia",
  "Switzerland": "Suíça",
  "Syria": "Síria",
  "Taiwan": "Taiwan",
  "Tajikistan": "Tajiquistão",
  "Tanzania": "Tanzânia",
  "Thailand": "Tailândia",
  "Timor-Leste": "Timor-Leste",
  "Togo": "Togo",
  "Trinidad and Tobago": "Trinidad e Tobago",
  "Tunisia": "Tunísia",
  "Turkey": "Turquia",
  "Turkmenistan": "Turcomenistão",
  "Uganda": "Uganda",
  "Ukraine": "Ucrânia",
  "United Arab Emirates": "Emirados Árabes Unidos",
  "United Kingdom": "Reino Unido",
  "United States of America": "Estados Unidos da América",
  "Uruguay": "Uruguai",
  "Uzbekistan": "Uzbequistão",
  "Vanuatu": "Vanuatu",
  "Venezuela": "Venezuela",
  "Vietnam": "Vietnã",
  "W. Sahara": "Saara Ocidental",
  "Yemen": "Iêmen",
  "Zambia": "Zâmbia",
  "Zimbabwe": "Zimbábue",
  "eSwatini": "Eswatini",
};

// ─── Mapeamento ISO 3166-1 numérico → continente (EN) ──────────────────────────

/**
 * Versão em inglês de ISO_CONTINENT. Mesmo shape de chaves (códigos ISO numéricos),
 * mas com nomes de continentes em inglês.
 * Usado para compatibilidade com dataset bilíngue EN.
 */
export const ISO_CONTINENT_EN = {
  // Africa
  '12': 'Africa', '24': 'Africa', '204': 'Africa', '72': 'Africa',
  '854': 'Africa', '108': 'Africa', '120': 'Africa', '140': 'Africa',
  '148': 'Africa', '174': 'Africa', '178': 'Africa', '180': 'Africa',
  '384': 'Africa', '262': 'Africa', '818': 'Africa', '226': 'Africa',
  '232': 'Africa', '231': 'Africa', '266': 'Africa', '270': 'Africa',
  '288': 'Africa', '324': 'Africa', '404': 'Africa', '426': 'Africa',
  '430': 'Africa', '434': 'Africa', '450': 'Africa', '454': 'Africa',
  '466': 'Africa', '478': 'Africa', '480': 'Africa', '504': 'Africa',
  '508': 'Africa', '516': 'Africa', '562': 'Africa', '566': 'Africa',
  '646': 'Africa', '678': 'Africa', '686': 'Africa', '694': 'Africa',
  '706': 'Africa', '710': 'Africa', '728': 'Africa', '729': 'Africa',
  '748': 'Africa', '834': 'Africa', '768': 'Africa', '788': 'Africa',
  '800': 'Africa', '894': 'Africa', '716': 'Africa',

  // North America
  '124': 'North America', '484': 'North America', '840': 'North America',

  // Central America and Caribbean
  '28': 'Central America and Caribbean', '44': 'Central America and Caribbean',
  '52': 'Central America and Caribbean', '84': 'Central America and Caribbean',
  '188': 'Central America and Caribbean', '192': 'Central America and Caribbean',
  '212': 'Central America and Caribbean', '214': 'Central America and Caribbean',
  '222': 'Central America and Caribbean', '308': 'Central America and Caribbean',
  '320': 'Central America and Caribbean', '332': 'Central America and Caribbean',
  '340': 'Central America and Caribbean', '388': 'Central America and Caribbean',
  '558': 'Central America and Caribbean', '591': 'Central America and Caribbean',
  '659': 'Central America and Caribbean', '662': 'Central America and Caribbean',
  '670': 'Central America and Caribbean', '780': 'Central America and Caribbean',

  // South America
  '32': 'South America', '68': 'South America', '76': 'South America',
  '152': 'South America', '170': 'South America', '218': 'South America',
  '328': 'South America', '600': 'South America', '604': 'South America',
  '740': 'South America', '858': 'South America', '862': 'South America',
  '254': 'South America',

  // Asia
  '4': 'Asia', '51': 'Asia', '31': 'Asia', '50': 'Asia', '64': 'Asia',
  '96': 'Asia', '116': 'Asia', '156': 'Asia', '626': 'Asia', '268': 'Asia',
  '356': 'Asia', '360': 'Asia', '364': 'Asia', '368': 'Asia', '376': 'Asia',
  '392': 'Asia', '400': 'Asia', '398': 'Asia', '408': 'Asia', '410': 'Asia',
  '414': 'Asia', '417': 'Asia', '418': 'Asia', '422': 'Asia', '458': 'Asia',
  '462': 'Asia', '496': 'Asia', '104': 'Asia', '524': 'Asia', '512': 'Asia',
  '586': 'Asia', '275': 'Asia', '608': 'Asia', '634': 'Asia', '682': 'Asia',
  '702': 'Asia', '144': 'Asia', '760': 'Asia', '158': 'Asia', '762': 'Asia',
  '764': 'Asia', '795': 'Asia', '784': 'Asia', '860': 'Asia', '704': 'Asia',
  '887': 'Asia', '792': 'Asia',

  // Europe
  '8': 'Europe', '20': 'Europe', '40': 'Europe', '112': 'Europe',
  '56': 'Europe', '70': 'Europe', '100': 'Europe', '191': 'Europe',
  '196': 'Europe', '203': 'Europe', '208': 'Europe', '233': 'Europe',
  '246': 'Europe', '250': 'Europe', '276': 'Europe', '300': 'Europe',
  '348': 'Europe', '352': 'Europe', '372': 'Europe', '380': 'Europe',
  '428': 'Europe', '438': 'Europe', '440': 'Europe', '442': 'Europe',
  '470': 'Europe', '498': 'Europe', '492': 'Europe', '499': 'Europe',
  '528': 'Europe', '807': 'Europe', '578': 'Europe', '616': 'Europe',
  '620': 'Europe', '642': 'Europe', '643': 'Europe', '674': 'Europe',
  '688': 'Europe', '703': 'Europe', '705': 'Europe', '724': 'Europe',
  '752': 'Europe', '756': 'Europe', '804': 'Europe', '826': 'Europe',
  '336': 'Europe',

  // Oceania
  '36': 'Oceania', '242': 'Oceania', '296': 'Oceania', '584': 'Oceania',
  '583': 'Oceania', '520': 'Oceania', '554': 'Oceania', '585': 'Oceania',
  '598': 'Oceania', '882': 'Oceania', '90': 'Oceania', '776': 'Oceania',
  '798': 'Oceania', '548': 'Oceania',

  // Antarctica
  '10': 'Antarctica',
};

// ─── Ano atual (para exibição de tooltips e filtros) ─────────────────────────────
export const CURRENT_YEAR = new Date().getFullYear();

// ─── Parâmetros visuais do mapa ───────────────────────────────────────────────

/** Raio visual das bubbles (px). Usado em WorldMap e no cálculo de colisão em dataUtils. */
export const BUBBLE_RADIUS = 2.5;

/** Largura do anel de destaque (halo branco) ao redor de uma bubble selecionada (px). */
export const BUBBLE_HIGHLIGHT_RING_WIDTH = 1.5;

// ─── Projeção de referência (compartilhada entre WorldMap e dataUtils) ────────

/**
 * Rotação central da projeção — Brasil no centro do mundo.
 * dataUtils usa este valor para pré-computar offsets de colisão na mesma
 * referência que WorldMap usa para renderizar.
 */
export const CENTRAL_ROTATION = [54, 0, 0];

/**
 * Dimensões da projeção de referência usada pelo forceCollide em dataUtils.
 * Devem ser compatíveis com a proporção típica do canvas em WorldMap.
 */
export const REF_W = 960;
export const REF_H = 500;

// ─── Contraste do mapa no tema claro ────────────────────────────────────────
export const MAP_LAND_COLOR_LIGHT = '#383838';
export const MAP_GLOW_STOPS_LIGHT = [
  [0, 'rgba(255, 255, 255, 0.275)'],
  [0.4, 'rgba(255, 255, 255, 0.09)'],
  [1, 'rgba(255, 255, 255, 0)'],
];

// ─── Trajetórias: animação de fluxo ──────────────────────────────────────────

/** Ativa/desativa animação de pontos fluindo nas trajetórias (pulso óptico). */
export const TRAJECTORY_FLOW_ENABLED = true;

/** Velocidade de fluxo em pixels por milissegundo (~60 px/s). */
export const TRAJECTORY_FLOW_SPEED_PX = 0.06;

/** Raio do ponto animado nas trajetórias (px). */
export const TRAJECTORY_FLOW_DOT_RADIUS = 1;

/** Cor do ponto de fluxo em repouso (branco-gelo). */
export const TRAJECTORY_FLOW_COLOR_NORMAL = '#f4f6f8';

/** Cor do ponto de fluxo destacado (amber/laranja). */
export const TRAJECTORY_FLOW_COLOR_HIGHLIGHT = '#ffffff';

/** Cor do ponto de fluxo em repouso no tema claro (cinza escuro — contraste sobre fundo claro). */
export const TRAJECTORY_FLOW_COLOR_NORMAL_LIGHT = '#4b4b4b';

/** Cor do fio/ponto de destaque de trajetória no tema claro (preto — contraste sobre fundo claro). */
export const TRAJECTORY_FLOW_COLOR_HIGHLIGHT_LIGHT = '#121212';

// ─── Morph entre projeções (2D ↔ 3D) ──────────────────────────────────────────

/** Ativa/desativa animação de morph entre projeções. False = troca instantânea. */
export const PROJECTION_MORPH_ENABLED = false;

/** Duração da animação de morph entre projeções (ms). */
export const PROJECTION_MORPH_DURATION = 700;

/** Fator de escala 3D do globo em relação ao tamanho do canvas (0.44 = 44%). */
export const PROJECTION_3D_SCALE_FACTOR = 0.44;

/** Fator de escala base 2D para o mapa (pixels). */
export const PROJECTION_2D_BASE_SCALE = 168;

// ─── Zoom e Controles do Mapa ─────────────────────────────────────────────────

/** Fator de incremento/decremento de zoom ao clicar botões +/− (multiplicativo). */
export const ZOOM_STEP_FACTOR = 1.3;

/** Escala mínima de zoom em projeção 2D (EqualEarth). */
export const ZOOM_MIN_2D = 1;

/** Escala máxima de zoom em projeção 2D (EqualEarth). */
export const ZOOM_MAX_2D = 8;

/** Escala mínima de zoom em projeção 3D (Ortográfica). */
export const ZOOM_MIN_3D = 0.5;

/** Escala máxima de zoom em projeção 3D (Ortográfica). */
export const ZOOM_MAX_3D = 5;

// ─── Artwork Strip: dimensões e timing ────────────────────────────────────────

/** Altura da faixa de obras quando expandida em tablet/desktop (px). */
export const ARTWORK_STRIP_HEIGHT_EXPANDED = 248;

/** Altura da faixa de obras quando colapsada (só header) em tablet/desktop (px). */
export const ARTWORK_STRIP_HEIGHT_COLLAPSED = 36;

/** Altura da faixa de obras quando expandida no mobile (overlay flutuante) (px). */
export const ARTWORK_STRIP_HEIGHT_MOBILE_EXPANDED = 65;

/** Altura da aba/botão de abertura da faixa de obras no mobile (px). */
export const ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED = 31;

/** Duração da transição de altura ao expandir/colapsar (ms). */
export const ARTWORK_STRIP_TRANSITION_DURATION = 200;

/** Delay antes de exibir tooltip ao passar hover em obra (ms). */
export const ARTWORK_STRIP_HOVER_DELAY = 300;

/** Gradiente do fade-out na base da faixa de obras. */
export const ARTWORK_STRIP_FADE_GRADIENT = 'linear-gradient(180deg, rgba(0, 0, 0, 0) 38.46%, #000000 100%)';

// ─── Layout: dimensões e breakpoints ──────────────────────────────────────────

/**
 * Breakpoints de layout (referência Figma node 505-4840 "Tablet e Mobile").
 * Três faixas: mobile (< 760), tablet (760–1379), desktop (≥ 1380).
 * - Mobile: header simplificado + FilterAccordion sobreposto ao mapa.
 * - Tablet: layout similar ao desktop, sidebar mais estreita (302px).
 * - Desktop: sidebar 365px, header completo.
 */
export const BREAKPOINT_TABLET = 760;
export const BREAKPOINT_DESKTOP = 1380;

/**
 * @deprecated Mantido para compatibilidade. Use BREAKPOINT_TABLET para
 * separar mobile (< 760) de tablet/desktop.
 */
export const BREAKPOINT_MOBILE = 1023;

/**
 * Classifica uma largura de viewport em uma faixa de layout.
 * @param {number} width largura em px (ex: window.innerWidth)
 * @returns {'mobile' | 'tablet' | 'desktop'}
 */
export function getBreakpoint(width) {
  if (width < BREAKPOINT_TABLET) return 'mobile';
  if (width < BREAKPOINT_DESKTOP) return 'tablet';
  return 'desktop';
}

/** Largura da sidebar em desktop (≥ 1380px) (px). */
export const SIDEBAR_WIDTH_DESKTOP = 365;

/** Largura da sidebar em tablet (760–1379px) (px). */
export const SIDEBAR_WIDTH_TABLET = 302;

/** Altura do header simplificado em mobile (< 760px) (px). */
export const MOBILE_HEADER_HEIGHT = 90;

/** Altura de cada cabeçalho de nível do FilterAccordion em mobile (px). */
export const ACCORDION_ITEM_HEIGHT = 52;

/** Padding lateral (esquerda/direita) dos componentes em mobile (px). */
export const MOBILE_PADDING_X = 20;

/** Duração da animação de expand/collapse do FilterAccordion (ms). */
export const ACCORDION_ANIMATION_DURATION = 300;

/** Curva de easing da animação do FilterAccordion. */
export const ACCORDION_ANIMATION_EASING = 'ease-out';

/** Largura do card de artista em desktop (px). */
export const ARTIST_CARD_WIDTH = 360;

/** Opacidade do backdrop quando sidebar está aberta em mobile. */
export const SIDEBAR_BACKDROP_OPACITY = 0.8;

/** Cor e opacidade do backdrop (RGBA). */
export const SIDEBAR_BACKDROP_COLOR = 'rgba(0, 0, 0, 0.5)';

// ─── Dados: marcadores especiais ──────────────────────────────────────────────

/** Valor sentinela para ano não-datado (será oculto em visualizações). */
export const UNDATED_YEAR = 9999;

// ─── Animações e transições (SCSS shared) ────────────────────────────────────

/** Duração padrão de transições rápidas (ms). */
export const TRANSITION_FAST = '0.12s';

/** Duração padrão de transições médias (ms). */
export const TRANSITION_MEDIUM = '200ms';

/** Duração padrão de transições lentas (ms). */
export const TRANSITION_SLOW = '300ms';
// ─── URLs e caminhos de arquivos de dados ────────────────────────────────────

/**
 * CSV principal com criadores: lat/lon de nascimento, morte, estudo.
 * Versão fixa (v4). Se mudar, atualizar apenas aqui.
 * Padrão: CSV em PT-BR (comportamento atual preservado).
 */
export const CSV_CREATORS_PATH = 'atlas_ma.csv';

/** Caminho do CSV de criadores em português brasileiro (mesmo que CSV_CREATORS_PATH). */
export const CSV_CREATORS_PATH_PT = 'atlas_ma.csv';

/** Caminho do CSV de criadores em inglês (futuro: atlas_ma_0610_v2_en.csv). */
export const CSV_CREATORS_PATH_EN = 'atlas_ma_eng.csv';

/**
 * CSV de acervos geolocalizados. Mapeia cada acervo a suas coordenadas.
 * Bubbles de tipo "acervo" são geradas daqui.
 */
export const CSV_ACERVOS_PATH = 'acervos_geolocated.csv';

/**
 * JSON de obras dos criadores. Estrutura: { wikidataId: { creator, museum, title, year, image, url } }.
 * Carregado via fetch com BASE_URL (para GitHub Pages).
 */
export const JSON_ARTWORKS_PATH = 'artwork.json';

/**
 * TopoJSON de fronteiras de países e continentes (Natural Earth 110m).
 * Usado para pré-computar country/continent de cada bubble.
 */
export const GEOJSON_COUNTRIES_PATH = 'countries-110m.json';

/** Delimitador do CSV de criadores (ponto-e-vírgula). */
export const CSV_CREATORS_DELIMITER = ';';

// ─── Tutorial / Onboarding ────────────────────────────────────────────────────

/** Chave localStorage para persistir o estado dismissed do tutorial. */
export const LS_TUTORIAL_KEY = 'meta-acervo:tutorial-dismissed';

/** Chave localStorage para persistir a preferência de tema (light|dark). */
export const LS_THEME_KEY = 'meta-acervo:theme';

/** Chave localStorage para persistir o estado colapsado do painel de perfil (true|false). */
export const LS_PROFILE_PANEL_KEY = 'meta-acervo:profile-panel-collapsed';

/** Texto da caixa de tutorial da sidebar (Box 1). */
export const TUTORIAL_SIDEBAR_TEXT = {
  pt: 'Explore os filtros e navegue pelas trajetórias dos artistas dos acervos',
  en: 'Explore filters and navigate through the artists\' trajectories in the collections',
};

/** Título da caixa de tutorial do centro do mapa (Box 2). */
export const TUTORIAL_MAP_TITLE = {
  pt: 'Como navegar',
  en: 'How to navigate',
};

/** Instrução de navegação desktop — Box 2 (texto após o label bold). */
export const TUTORIAL_MAP_TEXT_NAV = {
  pt: 'Para girar o globo, clique e segure o botão esquerdo do mouse e arraste.',
  en: 'To rotate the globe, click and hold the left mouse button and drag.',
};

/** Instrução de zoom desktop — Box 2 (texto após o label bold). */
export const TUTORIAL_MAP_TEXT_ZOOM = {
  pt: 'Use o scroll do mouse ou clique nos botões + e − para aproximar ou afastar.',
  en: 'Use the mouse scroll or click the + and − buttons to zoom in or out.',
};

/** Instrução de seleção mobile — Box 2. */
export const TUTORIAL_MAP_TEXT_MOBILE_SELECT = {
  pt: 'Escolha categorias e visualizações para ver as trajetórias dos artistas.',
  en: 'Choose categories and views to see the artists\' trajectories.',
};

/** Instrução de navegação mobile — Box 2. */
export const TUTORIAL_MAP_TEXT_MOBILE_NAV = {
  pt: 'Deslize um dedo pela tela para girar o globo.',
  en: 'Slide one finger across the screen to rotate the globe.',
};

/** Instrução de zoom mobile — Box 2. */
export const TUTORIAL_MAP_TEXT_MOBILE_ZOOM = {
  pt: 'Toque nos botões + e − ou junte e afaste dois dedos para aproximar e afastar.',
  en: 'Tap the + and − buttons or pinch two fingers to zoom in and out.',
};

/** Instrução de modo planisfério/2D — Box 2 (tutorial sobre como alternar para 2D). */
export const TUTORIAL_MAP_TEXT_2D = {
  pt: 'Para visualizar em modo planisfério (2D), clique no ícone do planisfério.',
  en: 'To view in map mode (2D), click the map icon.',
};

/** Labels dos títulos em bold dentro do tutorial de navegação (Box 2). */
export const TUTORIAL_NAV_LABELS = {
  pt: { selection: 'Seleção:', navigation: 'Navegação:', zoom: 'Zoom:', mapMode: 'Planisfério:' },
  en: { selection: 'Selection:', navigation: 'Navigation:', zoom: 'Zoom:', mapMode: 'Map mode:' },
};

/** Instruções de filtros — Box 1 no tutorial. */
export const TUTORIAL_FILTER_TEXT = {
  pt: 'Selecione um ou mais filtros na coluna à esquerda para localizar museus, artistas, locais de formação, nacionalidade e gênero.',
  en: 'Select one or more filters on the left column to find museums, artists, educational locations, nationality and gender.',
};

/** Instruções de combinação de filtros — Box 1 no tutorial. */
export const TUTORIAL_COMBINATION_TEXT = {
  pt: 'Combine os filtros com informações sobre um/uma artista (local de nascimento, morte, instituição de ensino e museus que possuem suas obras).',
  en: 'Combine filters with information about an artist (place of birth, death, educational institution and museums that hold their works).',
};

/** Texto da caixa de tutorial do artwork strip (Box 3). */
export const TUTORIAL_STRIP_TEXT = {
  pt: 'Obras dos artistas nos acervos selecionados',
  en: 'Works by artists in the selected collections',
};

// ─── Textos de filtros, labels, buttons e seções (UI) ──────────────────────

/** Título da aplicação (PT-BR ↔ EN). */
export const APP_TITLE = {
  pt: 'Atlas dos Percursos de Artistas em Museus',
  en: 'Atlas of Artistic Trajectories in Museums',
};

/** Nomes de idiomas para seletor de idioma. */
export const LANGUAGE_NAMES = {
  pt: 'PT',
  en: 'EN',
};

/** URL do site do projeto (para o link do logo). */
export const APP_WEBSITE_URL = 'https://www.acervosdigitais.fau.usp.br/meta-acervos-navegador-para-museus-em-rede/';

/** Rótulos de filtros na sidebar. */
export const FILTER_LABELS = {
  pt: {
    acervo: 'Museus e Arquivos',
    acervo_sub: '(É preciso selecionar um ou mais museus para buscar)',
    artista: 'Artistas',
    artista_sub: '(É preciso selecionar um ou mais museus para buscar)',
    education: 'Formação',
    education_sub: '(É preciso selecionar um ou mais museus para buscar)',
    nacionalidade: 'Nacionalidade',
    gender: 'Gênero',
  },
  en: {
    acervo: 'Museums and Archives',
    acervo_sub: '(You must select one or more museums to search)',
    artista: 'Artists',
    artista_sub: '(You must select one or more museums to search)',
    education: 'Education',
    education_sub: '(You must select one or more museums to search)',
    nacionalidade: 'Nationality',
    gender: 'Gender',
  },
};

/** Placeholders para campos de autocomplete. */
export const AUTOCOMPLETE_PLACEHOLDERS = {
  pt: {
    artista: 'Digite o nome ou parte do nome',
    education: 'Digite o nome ou parte do nome',
    nacionalidade: 'Digite o nome ou parte do nome',
    acervo: 'Selecione um ou mais museus para buscar',
  },
  en: {
    artista: 'Type the name or part of the name',
    education: 'Type the name or part of the name',
    nacionalidade: 'Type the name or part of the name',
    acervo: 'Select one or more museums',
  },
};

/** Rótulos de botões em filtros e ações. */
export const BUTTON_LABELS = {
  pt: {
    selectAll: 'Selecionar todos',
    clearSelection: 'Limpar seleção',
    about: 'Sobre',
  },
  en: {
    selectAll: 'Select all',
    clearSelection: 'Clear selection',
    about: 'About',
  },
};

/** Títulos de seções na UI. */
export const SECTION_LABELS = {
  pt: {
    accordion: 'Museus e artistas',
    filterLocality: 'Filtrar por país ou região',
    trajectoryVisualization: 'Visualizar percursos',
    trajectories: 'Trajetos',
    trajectoryToggle: 'Exibir / Ocultar',
    sidebarDescription: 'Selecione os filtros e navegue pelos percursos dos artistas nos acervos',
    visualizationsAndFilters: 'Visualizações e Filtros',
    loading: 'Carregando dados\u2026',
    errorPrefix: 'Erro:',
    tutorialMobileWarning: 'Para uma melhor experiência, acesse esta plataforma pelo computador',
  },
  en: {
    accordion: 'Museums and artists',
    filterLocality: 'Filter by country or region',
    trajectoryVisualization: 'View trajectories',
    trajectories: 'Trajectories',
    trajectoryToggle: 'Show / Hide',
    sidebarDescription: 'Select filters and navigate through the artists\' journeys in the museum collections',
    visualizationsAndFilters: 'Visualizations and Filters',
    loading: 'Loading data\u2026',
    errorPrefix: 'Error:',
    tutorialMobileWarning: 'For a better experience, access this platform from a computer',
  },
};

/** Rótulos de estatísticas no mapa. */
export const STATS_LABELS = {
  pt: {
    title: 'Resultados',
    acervosSelected: 'Museus e/ou Arquivos',
    artistas: 'Artistas',
    escolas: 'Instituições educacionais',
    obras: 'Obras em museus',
  },
  en: {
    title: 'Results',
    acervosSelected: 'Museums and Archives',
    artistas: 'Artists',
    escolas: 'Educational institutions',
    obras: 'Works in museums',
  },
};

/** Mensagem padrão da faixa de obras (quando nenhuma obra está selecionada). */
export const ARTWORK_STRIP_DEFAULT_MESSAGE = {
  pt: {
    empty: 'Conheça as obras dos artistas nos museus e arquivos selecionados',
    worksBy: 'Obras de',
    imageUnavailable: 'Imagem indisponível',
  },
  en: {
    empty: 'Learn about the works of artists in the selected museums and archives',
    worksBy: 'Works by',
    imageUnavailable: 'Image unavailable',
  },
};

/** Rótulos do ArtistCard — seções e ações. */
export const ARTIST_CARD_LABELS = {
  pt: {
    worksAndCollections: 'Obras e Acervos',
    birth: 'Nascimento',
    studyLocation: 'Formação',
    death: 'Morte',
    untitled: '(sem título)',
    close: 'Fechar',
    precisionLabel: 'Precisão da Informação',
    confidenceDisclaimer: 'O grau de precisão da informação foi determinado pelo Agente de IA que criamos e define a autoridade das fontes consultadas.',
  },
  en: {
    worksAndCollections: 'Works and Collections',
    birth: 'Birth',
    studyLocation: 'Education',
    death: 'Death',
    untitled: '(untitled)',
    close: 'Close',
    precisionLabel: 'Information Precision',
    confidenceDisclaimer: 'The degree of information precision was determined by the AI Agent we created and reflects the authority of the sources consulted.',
  },
};

/**
 * Retorna o CSS var de cor do chip de precisão dado um valor de confiança.
 * Aceita tanto valores normalizados (saída de normalizeConfidence) quanto
 * valores brutos do CSV em PT e EN.
 *
 * @param {string|null|undefined} rawValue
 * @returns {string} CSS var (ex: 'var(--confidence-alta)')
 */
export function confidenceBadgeColor(rawValue) {
  const v = rawValue?.toLowerCase?.() ?? '';
  if (v === 'alta' || v === 'alto' || v === 'high') return 'var(--confidence-alta)';
  if (v === 'médio' || v === 'medio' || v === 'medium') return 'var(--confidence-media)';
  if (v === 'baixo' || v === 'baixa' || v === 'low') return 'var(--confidence-baixa)';
  return 'var(--confidence-media)';
}

/** Texto de instrução do filtro de localidade/país na sidebar. */
export const LOCALITY_FILTER_INSTRUCTION = {
  pt: 'Filtrar por país ou região',
  en: 'Filter by country or region',
};

// ─── Helpers para localidades bilíngues (países + continentes) ───────────────────────────────────

/**
 * Cria mapa inverso EN → PT de nomes de países para lookup rápido.
 * Usado internamente por `getLocalidadesList` quando locale === 'pt'.
 * @type {Map<string, string>} — EN country name → PT country name
 */
const COUNTRY_NAME_EN_TO_PT = new Map(Object.entries(COUNTRY_NAME_PTBR));

/**
 * Extrai e traduz a lista única de localidades (países + continentes) a partir de um array de bubbles.
 * Nomes de países vêm do TopoJSON (sempre em inglês; traduzidos se locale=pt).
 * Nomes de continentes usam ISO_CONTINENT (PT) ou ISO_CONTINENT_EN (EN).
 *
 * @param {object[]} bubbles — array de bubbles com campos .country e .continent
 * @param {'pt' | 'en'} locale — idioma alvo (padrão: 'pt')
 * @returns {string[]} lista única e ordenada de localidades traduzidas
 */
export function getLocalidadesList(bubbles, locale = 'pt') {
  const localidades = new Set();
  for (const b of bubbles) {
    // Traduzir país (EN → PT se locale=pt; manter EN se locale=en)
    if (b.country) {
      const translated = locale === 'pt'
        ? COUNTRY_NAME_EN_TO_PT.get(b.country) ?? b.country
        : b.country;
      localidades.add(translated);
    }
    // Continente (já vem em PT via ISO_CONTINENT ou EN via ISO_CONTINENT_EN)
    if (b.continent) {
      localidades.add(b.continent);
    }
  }
  return [...localidades].sort();
}

/**
 * Cria mapa reverso: nome traduzido de localidade → valor canônico (inglês para países, PT para continentes).
 * Usado pelo filtro para converter a seleção do usuário (exibida em tela) de volta aos valores nos bubbles.
 *
 * @param {'pt' | 'en'} locale
 * @returns {Map<string, string>}
 */
export function getLocalidadesReverseMap(locale = 'pt') {
  const map = new Map();

  if (locale === 'pt') {
    // Países: PT → EN (revertendo a tradução feita em getLocalidadesList)
    for (const [en, pt] of COUNTRY_NAME_EN_TO_PT.entries()) {
      map.set(pt, en);
    }
    // Continentes: PT → PT (identidade, pois ISO_CONTINENT já está em PT)
    for (const pt of Object.values(ISO_CONTINENT)) {
      map.set(pt, pt);
    }
  } else {
    // Inglês: EN → EN (identidade, nenhuma tradução)
    for (const en of COUNTRY_NAME_EN_TO_PT.keys()) {
      map.set(en, en);
    }
    for (const en of Object.values(ISO_CONTINENT_EN)) {
      map.set(en, en);
    }
  }
  return map;
}

/** Rótulos e textos do modal "Sobre". */
export const ABOUT_MODAL_LABELS = {
  pt: {
    title: 'Sobre',
    closeButton: 'Fechar',
    description: 'O <strong>Atlas dos Percursos de Artistas em Museus</strong> é uma ferramenta de visualização cartográfica que permite acompanhar os deslocamentos de artistas presentes em acervos museais. A partir de dados sobre local de nascimento, formação, morte e museus onde suas obras estão preservadas, o mapa revela percursos, redes de circulação e vínculos entre artistas, instituições e territórios.',
    learnMore: 'Conheça os detalhes do projeto em nosso',
    siteLabel: 'site',
    andAccessCode: 'e acesse o código da plataforma no nosso',
    githubLabel: 'GitHub',
    creditsRealization: 'Realização',
    creditsCoordination: 'Coordenação geral',
    creditsExecutiveCoordination: 'Coordenação executiva',
    creditsCreativeCode: 'Programação criativa',
    creditsDesign: 'Design de interface e interação',
    creditsData: 'Dados',
    contact: 'Contato',
    versionLabel: 'Versão',
  },
  en: {
    title: 'About',
    closeButton: 'Close',
    description: 'The <strong>Atlas of Artists\' Trajectories in Museums</strong> is a cartographic visualization tool that tracks the movements of artists in museum collections. Based on data about birthplace, education, death, and museums where their works are preserved, the map reveals trajectories, circulation networks, and connections between artists, institutions, and territories.',
    learnMore: 'Learn more about the project on our',
    siteLabel: 'website',
    andAccessCode: 'and access the platform code on our',
    githubLabel: 'GitHub',
    creditsRealization: 'Organization',
    creditsCoordination: 'General coordination',
    creditsExecutiveCoordination: 'Executive coordination',
    creditsCreativeCode: 'Creative development',
    creditsDesign: 'Interface and interaction design',
    creditsData: 'Data',
    contact: 'Contact',
    versionLabel: 'Version',
  },
};

/** Rótulos de projeção do mapa. */
export const PROJECTION_LABELS = {
  pt: {
    globe3d: 'Globo 3D',
    map2d: 'Mapa 2D',
  },
  en: {
    globe3d: '3D Globe',
    map2d: '2D Map',
  },
};

/** Rótulos de tema. */
export const THEME_LABELS = {
  pt: {
    darkTheme: 'Tema escuro',
    lightTheme: 'Tema claro',
  },
  en: {
    darkTheme: 'Dark theme',
    lightTheme: 'Light theme',
  },
};

/** Rótulos do painel de perfil de resultados. */
export const PROFILE_PANEL_LABELS = {
  pt: {
    title: 'Perfil dos Resultados',
    emptyMessage: 'Nenhum criador no conjunto filtrado.',
    formationLabel: 'Formação',
    birthLabel: 'Nascimento',
    disclaimer: 'Os dados do Atlas dos Percursos Artísticos foram extraídos do Wikidata e representam uma amostra dos acervos das instituições mapeadas, não correspondendo necessariamente à totalidade de suas coleções.',
  },
  en: {
    title: 'Results Profile',
    emptyMessage: 'No creators in the filtered set.',
    formationLabel: 'Education',
    birthLabel: 'Birth',
    disclaimer: 'The Atlas of Artistic Trajectories data was extracted from Wikidata and represents a sample of the collections held by the mapped institutions, not necessarily reflecting the entirety of their holdings.',
  },
};

// ─── Compatibilidade: aliases PT-BR das constantes bilíngues (para componentes legados) ──────────────

/**
 * Enquanto o app é puramente PT-BR, mantenha aliases PT das constantes bilíngues.
 * Componentes que usam `TYPE_LABEL.birth` continuarão funcionando via `TYPE_LABEL_PT_COMPAT.birth`,
 * ou transitoriamente via `TYPE_LABEL.pt.birth` após migração.
 */
export const TYPE_LABEL_PT_COMPAT = TYPE_LABEL.pt;
export const GENDER_LABEL_PT_COMPAT = GENDER_LABEL.pt;
export const CONFIDENCE_LABEL_PT_COMPAT = CONFIDENCE_LABEL.pt;
export const FILTER_LABELS_PT_COMPAT = FILTER_LABELS.pt;
export const AUTOCOMPLETE_PLACEHOLDERS_PT_COMPAT = AUTOCOMPLETE_PLACEHOLDERS.pt;
export const BUTTON_LABELS_PT_COMPAT = BUTTON_LABELS.pt;
export const SECTION_LABELS_PT_COMPAT = SECTION_LABELS.pt;
export const STATS_LABELS_PT_COMPAT = STATS_LABELS.pt;
export const APP_TITLE_PT_COMPAT = APP_TITLE.pt;
export const TUTORIAL_SIDEBAR_TEXT_PT_COMPAT = TUTORIAL_SIDEBAR_TEXT.pt;
export const TUTORIAL_MAP_TITLE_PT_COMPAT = TUTORIAL_MAP_TITLE.pt;
export const TUTORIAL_MAP_TEXT_NAV_PT_COMPAT = TUTORIAL_MAP_TEXT_NAV.pt;
export const TUTORIAL_MAP_TEXT_ZOOM_PT_COMPAT = TUTORIAL_MAP_TEXT_ZOOM.pt;
export const TUTORIAL_MAP_TEXT_MOBILE_SELECT_PT_COMPAT = TUTORIAL_MAP_TEXT_MOBILE_SELECT.pt;
export const TUTORIAL_MAP_TEXT_MOBILE_NAV_PT_COMPAT = TUTORIAL_MAP_TEXT_MOBILE_NAV.pt;
export const TUTORIAL_MAP_TEXT_MOBILE_ZOOM_PT_COMPAT = TUTORIAL_MAP_TEXT_MOBILE_ZOOM.pt;
export const TUTORIAL_MAP_TEXT_2D_PT_COMPAT = TUTORIAL_MAP_TEXT_2D.pt;
export const TUTORIAL_FILTER_TEXT_PT_COMPAT = TUTORIAL_FILTER_TEXT.pt;
export const TUTORIAL_COMBINATION_TEXT_PT_COMPAT = TUTORIAL_COMBINATION_TEXT.pt;
export const TUTORIAL_STRIP_TEXT_PT_COMPAT = TUTORIAL_STRIP_TEXT.pt;
export const ARTWORK_STRIP_DEFAULT_MESSAGE_PT_COMPAT = ARTWORK_STRIP_DEFAULT_MESSAGE.pt;
export const LOCALITY_FILTER_INSTRUCTION_PT_COMPAT = LOCALITY_FILTER_INSTRUCTION.pt;