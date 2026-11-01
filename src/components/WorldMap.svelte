<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import * as topojson from 'topojson-client';
  import {
  TYPE_COLOR,
  TYPE_COLOR_ACERVO_LIGHT,
  BUBBLE_RADIUS,
  BUBBLE_HIGHLIGHT_RING_WIDTH,
  CENTRAL_ROTATION,
  TRAJECTORY_FLOW_ENABLED,
  TRAJECTORY_FLOW_SPEED_PX,
  TRAJECTORY_FLOW_DOT_RADIUS,
  TRAJECTORY_FLOW_COLOR_NORMAL,
  TRAJECTORY_FLOW_COLOR_HIGHLIGHT,
  TRAJECTORY_FLOW_COLOR_NORMAL_LIGHT,
  TRAJECTORY_FLOW_COLOR_HIGHLIGHT_LIGHT,
  PROJECTION_MORPH_ENABLED,
  PROJECTION_MORPH_DURATION,
  PROJECTION_3D_SCALE_FACTOR,
  PROJECTION_2D_BASE_SCALE,
  MAP_LAND_COLOR_LIGHT,
  MAP_GLOW_STOPS_LIGHT,
} from '../lib/constants.js';

  export let bubbles = [];
  export let trajectories = [];
  export let activeTypes = new Set(['birth', 'education', 'death']);
  export let projectionType = '2d';
  /** 'dark' | 'light' — controla paleta do canvas (sphere, países, trajetórias). */
  export let theme = 'dark';
  /** Quando `true`, bloqueia totalmente interação (mouse, drag, zoom). */
  export let locked = false;
  /** Nome do criador a manter destacado enquanto o card estiver aberto (`locked=true`). */
  export let pinnedCreator = null;
  /**
   * Margem inferior (em px) ocupada por overlays externos (ex.: ArtworkStrip).
   * O canvas continua ocupando toda a altura do container, mas a projeção é
   * centralizada apenas na altura visível (`height - bottomInset`), de modo
   * que o globo não fique escondido sob o overlay.
   */
  export let bottomInset = 0;
  export let onArtistClick = null;



  const TAU = 2 * Math.PI;

  // ─── Animação de fluxo nas trajetórias ───────────────────────────────────
  // Valores importados de constants.js

  // Dimensões do canvas — atualizadas dinamicamente via ResizeObserver
  let width = 960;
  let height = 500;
  // Offset do canvas em relação à viewport — cacheado para evitar
  // getBoundingClientRect() no hot path de mouse/click (forced reflow).
  let canvasLeft = 0;
  let canvasTop = 0;
  let containerEl;
  let canvasEl;        // camada dinâmica (bubbles + trajetórias)
  let bgCanvasEl;      // camada estática (sphere + países)
  let ctx;
  let bgCtx;
  let dpr = 1;
  let resizeObserver;
  let countriesFeature = null;
  let countriesMesh = null;
  let initialPaintRecorded = false;

  // Meridiano central ~-54°W — Brasil no centro do mundo (estilo IBGE, abr/2024).
  // CENTRAL_ROTATION importado de constants.js

  // Estado por projeção — preservado ao alternar de volta.
  // 2D: transform de zoom {k, x, y}. 3D: rotação + fator de zoom k.
  const state2d = { k: 1, x: 0, y: 0 };
  const state3d = { rotate: [CENTRAL_ROTATION[0], -10, 0], k: 1 };

  // ─── Referências para zoom programático (expostas para botões de zoom) ────
  let zoomSelection = null;       // D3 selection do canvas
  let zoomBehavior2d = null;      // objeto d3.zoom() para 2D
  let zoomBehavior3d = null;      // objeto d3.zoom() para 3D

  // ─── Morph entre projeções (2D ↔ 3D) ─────────────────────────
  // Valores importados de constants.js: PROJECTION_MORPH_ENABLED, PROJECTION_MORPH_DURATION
  let morphing = false;
  let morphT = 0;            // 0 = pose `morphFrom`, 1 = pose `morphTo`
  let morphFrom = '2d';
  let morphTo = '3d';
  let morphStartTime = 0;
  let morphRaf = 0;
  let currentProjection = projectionType;
  let prefersReducedMotion = false;
  // Estado do clipping da projeção-morph corrente — usado também no
  // culling manual das bubbles (geoPath já usa via .clipAngle).
  let morphClipAngleRad = Math.PI;          // π = sem clip
  let morphRotateCenter = [-CENTRAL_ROTATION[0], -CENTRAL_ROTATION[1]];

  // Parâmetros base proporcionais ao tamanho atual do canvas.
  // 2D: "content-fit" pela altura — o mapa preenche toda a altura do canvas
  // (pode ficar mais largo que o container; o pan revela o resto, contido).
  /* Altura efetiva para centralizar a projeção, descontando overlays. */
  $: effHeight = Math.max(1, height - bottomInset);
  $: BASE_2D = (() => {
    if (width <= 0 || effHeight <= 0) return { scale: PROJECTION_2D_BASE_SCALE, translate: [width / 2, effHeight / 2] };
    const tmp = d3.geoEqualEarth().rotate(CENTRAL_ROTATION).fitSize([Infinity, effHeight], SPHERE);
    return { scale: tmp.scale(), translate: [width / 2, effHeight / 2] };
  })();
  $: BASE_3D = {
    scale: Math.min(width, effHeight) * PROJECTION_3D_SCALE_FACTOR,
  };

  // Bounds do mapa renderizado em pixels (no estado base k=1) — usado para
  // limitar o pan ao conteúdo real, sem mostrar área vazia além do mapa.
  $: mapBounds2D = (() => {
    if (projectionType !== '2d' || width <= 0 || height <= 0) return null;
    const baseProj = d3.geoEqualEarth()
      .scale(BASE_2D.scale)
      .translate(BASE_2D.translate)
      .rotate(CENTRAL_ROTATION);
    return d3.geoPath().projection(baseProj).bounds(SPHERE);
  })();

  // Projeção — reconstruída dentro do rAF de draw (buildProjection), não mais reativa.
  let projection;
  let projectionUnclipped;

  /**
   * Constrói a projeção-morph para um t∈[0,1] entre `morphFrom` e `morphTo`.
   *
   * Estratégia: combinação linear ponderada das raw functions (já com a
   * escala-alvo de cada modo aplicada *dentro* do raw, pois as duas raws
   * produzem ranges diferentes). Translate e rotate sofrem lerp comum.
   *
   * @param {number} t
   * @returns {d3.GeoProjection}
   */
  function makeMorphProjection(t) {
    const tx2d = BASE_2D.translate[0] * state2d.k + state2d.x;
    const ty2d = BASE_2D.translate[1] * state2d.k + state2d.y;
    const s2d = BASE_2D.scale * state2d.k;
    const s3d = BASE_3D.scale * state3d.k;

    const txFrom = morphFrom === '2d' ? tx2d : width / 2;
    const tyFrom = morphFrom === '2d' ? ty2d : effHeight / 2;
    const txTo   = morphTo   === '2d' ? tx2d : width / 2;
    const tyTo   = morphTo   === '2d' ? ty2d : effHeight / 2;
    const rotFrom = morphFrom === '2d' ? CENTRAL_ROTATION : state3d.rotate;
    const rotTo   = morphTo   === '2d' ? CENTRAL_ROTATION : state3d.rotate;

    // Peso da componente equal-earth (w2d) e ortho (w3d) — soma = 1.
    const w2d = morphFrom === '2d' ? (1 - t) : t;
    const w3d = 1 - w2d;

    const eeRaw = d3.geoEqualEarthRaw;
    const orRaw = d3.geoOrthographicRaw;
    const raw = (lambda, phi) => {
      const a = eeRaw(lambda, phi);
      const b = orRaw(lambda, phi);
      return [
        a[0] * s2d * w2d + b[0] * s3d * w3d,
        a[1] * s2d * w2d + b[1] * s3d * w3d,
      ];
    };

    const lerp = (a, b) => a + (b - a) * t;
    const lerpAng = (a, b) => {
      let d = b - a;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return a + d * t;
    };
    const tx = lerp(txFrom, txTo);
    const ty = lerp(tyFrom, tyTo);
    const rot = [
      lerpAng(rotFrom[0], rotTo[0]),
      lerpAng(rotFrom[1], rotTo[1]),
      lerpAng(rotFrom[2], rotTo[2]),
    ];

    // ClipAngle interpolado: 180° (sem clip) em w3d=0 → 90° (hemisfério) em w3d=1.
    // Mantém a face oculta do globo invisível à medida que a esfericidade aumenta
    // e casa exatamente com a projeção ortográfica final (clipAngle=90).
    const clipAngDeg = 180 - 90 * w3d;
    morphClipAngleRad = clipAngDeg * Math.PI / 180;
    morphRotateCenter = [-rot[0], -rot[1]];

    return d3.geoProjection(raw)
      .scale(1)
      .translate([tx, ty])
      .rotate(rot)
      .clipAngle(clipAngDeg);
  }

  /**
   * Reconstrói os objetos de projeção com o estado atual de pan/zoom/morph.
   * Chamado dentro do rAF de draw — sem passar pelo flush() do Svelte.
   */
  function buildProjection() {
    if (morphing) {
      projection = makeMorphProjection(morphT);
      projectionUnclipped = projection;
    } else if (projectionType === '3d') {
      projection = d3.geoOrthographic()
        .scale(BASE_3D.scale * state3d.k)
        .translate([width / 2, effHeight / 2])
        .rotate(state3d.rotate)
        .clipAngle(90);
      projectionUnclipped = d3.geoOrthographic()
        .scale(BASE_3D.scale * state3d.k)
        .translate([width / 2, effHeight / 2])
        .rotate(state3d.rotate);
    } else {
      const tx = BASE_2D.translate[0] * state2d.k + state2d.x;
      const ty = BASE_2D.translate[1] * state2d.k + state2d.y;
      projection = d3.geoEqualEarth()
        .scale(BASE_2D.scale * state2d.k)
        .translate([tx, ty])
        .rotate(CENTRAL_ROTATION);
      projectionUnclipped = projection;
    }
  }

  /**
   * Inicia o tween de transição entre duas projeções.
   *
   * @param {'2d'|'3d'} from
   * @param {'2d'|'3d'} to
   */
  function startMorph(from, to) {
    if (!PROJECTION_MORPH_ENABLED || prefersReducedMotion || from === to) return;
    if (morphRaf) cancelAnimationFrame(morphRaf);
    morphFrom = from;
    morphTo = to;
    morphing = true;
    morphT = 0;
    morphStartTime = performance.now();
    attachedKey = null; // detach drag/zoom durante o tween
    stepMorph();
  }

  /** Avança um frame do tween de morph. */
  function stepMorph() {
    const elapsed = performance.now() - morphStartTime;
    const u = Math.min(1, elapsed / PROJECTION_MORPH_DURATION);
    morphT = d3.easeCubicInOut(u);
    markStaticDirty();
    markDynamicDirty();
    if (u < 1) {
      morphRaf = requestAnimationFrame(stepMorph);
    } else {
      morphRaf = 0;
      morphing = false;
      // buildProjection() lê morphing=false no próximo rAF — sem morphTick necessário.
      markStaticDirty();
      markDynamicDirty();
    }
  }

  // Detecta mudança de projectionType vinda do parent.
  $: if (projectionType !== currentProjection) {
    const from = currentProjection;
    currentProjection = projectionType;
    if (canvasEl && ctx) {
      startMorph(from, projectionType);
      // Se morph não iniciou (prefersReducedMotion ou MORPH_ENABLED=false),
      // garante redraw imediato com a nova projeção.
      if (!morphing) markStaticDirty();
    }
  }

  const SPHERE = { type: 'Sphere' };

  // TYPE_COLOR importado de constants.js

  /**
   * Atualiza o offset do canvas em relação à viewport.
   * Deve ser chamado após qualquer mudança de layout (resize, sidebar, scroll).
   * Seguro em ResizeObserver (pós-layout) e em onMount — não causa forced reflow
   * no hot path de interação.
   */
  function updateCanvasOffset() {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    canvasLeft = rect.left;
    canvasTop = rect.top;
  }

  /** Ajusta as dimensões internas dos canvases (foreground e background) ao DPR atual. */
  function applyCanvasDims() {
    if (canvasEl) {
      canvasEl.width = Math.max(1, Math.round(width * dpr));
      canvasEl.height = Math.max(1, Math.round(height * dpr));
    }
    if (bgCanvasEl) {
      bgCanvasEl.width = Math.max(1, Math.round(width * dpr));
      bgCanvasEl.height = Math.max(1, Math.round(height * dpr));
    }
  }

  onMount(async () => {
    dpr = window.devicePixelRatio || 1;

    // prefers-reduced-motion: troca instantânea sem tween.
    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion = mq.matches;
      mq.addEventListener?.('change', (e) => { prefersReducedMotion = e.matches; });
    }

    // Tamanho inicial a partir do container
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        width = rect.width;
        height = rect.height;
      }
    }
    applyCanvasDims();
    ctx = canvasEl.getContext('2d');
    bgCtx = bgCanvasEl.getContext('2d');
    // Captura offset inicial do canvas (pós-layout, seguro aqui).
    updateCanvasOffset();

    // Observa redimensionamento do container
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0 && (cr.width !== width || cr.height !== height)) {
          width = cr.width;
          height = cr.height;
          applyCanvasDims();
          // força reanexar zoom para atualizar translateExtent
          attachedKey = null;
          markStaticDirty();
          markDynamicDirty();
        }
        // Atualiza offset mesmo que só a posição tenha mudado (ex.: sidebar
        // abrindo/fechando pode deslocar o canvas sem alterar seu tamanho).
        updateCanvasOffset();
      }
    });
    resizeObserver.observe(containerEl);

    const topo = await d3.json('countries-110m.json');
    countriesFeature = topojson.feature(topo, topo.objects.countries);
    countriesMesh = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
    markStaticDirty();

    // Inicia animação de fluxo se habilitada e respeitando reduced-motion.
    if (TRAJECTORY_FLOW_ENABLED && !prefersReducedMotion) {
      flowLastTs = 0;
      flowRaf = requestAnimationFrame(tickFlow);
    }
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    if (rafHandle) cancelAnimationFrame(rafHandle);
    if (morphRaf) cancelAnimationFrame(morphRaf);
    if (flowRaf) cancelAnimationFrame(flowRaf);
  });

  // ─── rAF scheduler ────────────────────────────────────────────────────────
  // Coalescing: vários `dragTick`/hover/etc dentro do mesmo frame produzem
  // um único redraw. Camada estática (basemap) e dinâmica (bubbles/trajetórias)
  // têm flags independentes para que hover só repinte o que precisa.
  let rafHandle = 0;
  let staticDirty = false;
  let dynamicDirty = false;

  // ─── Estado da animação de fluxo ─────────────────────────────────────────
  // flowPhase = distância acumulada (px) — cada segmento usa o módulo do seu
  // próprio comprimento, garantindo velocidade visual constante em todos.
  let flowPhase = 0;
  let flowRaf = 0;
  let flowLastTs = 0;

  /**
   * Hash determinístico string → [0,1). Usado para desfasar cada segmento e
   * produzir efeito orgânico (cada trajetória pulsa em fase distinta).
   *
   * @param {string} id
   * @returns {number}
   */
  function flowOffsetFor(id) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000;
  }

  /** Tick do rAF para atualizar a fase do fluxo das trajetórias. */
  function tickFlow(ts) {
    if (flowLastTs) {
      flowPhase += (ts - flowLastTs) * TRAJECTORY_FLOW_SPEED_PX;
    }
    flowLastTs = ts;
    markDynamicDirty();
    flowRaf = requestAnimationFrame(tickFlow);
  }

  /** Marca a camada estática (basemap) e a dinâmica como sujas e agenda redraw. */
  function markStaticDirty() {
    staticDirty = true;
    dynamicDirty = true; // mudanças de projeção/dim afetam ambos
    scheduleDraw();
  }
  /** Marca apenas a camada dinâmica como suja e agenda redraw. */
  function markDynamicDirty() {
    dynamicDirty = true;
    scheduleDraw();
  }
  /** Coalesce múltiplas marcações no mesmo frame em um único redraw. */
  function scheduleDraw() {
    if (rafHandle) return;
    rafHandle = requestAnimationFrame(() => {
      rafHandle = 0;
      // Reconstrói projeção, posições e highlights com estado atual —
      // sem passar pelo flush() do Svelte no hot path de drag/zoom.
      buildProjection();
      buildPositions();
      buildHighlights();
      if (staticDirty) {
        staticDirty = false;
        redrawStatic();
      }
      if (dynamicDirty) {
        dynamicDirty = false;
        redrawDynamic();
      }
      if (!initialPaintRecorded && bgCtx && ctx && projection && countriesFeature && bubbles.length > 0) {
        initialPaintRecorded = true;
        globalThis.performance?.mark('atlas:map-ready');
      }
    });
  }

  // Anexa drag & zoom — reexecuta quando o modo de projeção OU as dimensões mudam.
  // Durante o morph, handlers ficam desanexados (cursor neutro, sem interação).
  let attachedKey = null;
  $: if (canvasEl && ctx) {
    const key = morphing
      ? 'morph'
      : `${projectionType}|${Math.round(width)}x${Math.round(height)}|${locked ? 'L' : 'U'}`;
    if (attachedKey !== key) {
      attachedKey = key;
      const sel = d3.select(canvasEl);
      zoomSelection = sel;  // Guardar referência para zoom programático
      sel.on('.drag', null);
      sel.on('.zoom', null);

      if (morphing) {
        // cursor gerenciado via class:is-morphing no elemento canvas
      } else if (projectionType === '3d') {
        const zoom = d3.zoom()
          .scaleExtent([0.5, 5])
          .filter((e) => {
            if (locked) return false;
            // Zoom: só wheel e dois dedos (pinch) em touch
            // Drag (um dedo/mouse) passa direto para d3.drag, sem filtro
            if (e.type === 'wheel') return true;
            if (e.type === 'touchstart' || e.type === 'touchmove') {
              return e.touches && e.touches.length >= 2; // pinch zoom
            }
            return false;
          })
          .on('zoom', (e) => {
            state3d.k = e.transform.k;
            markStaticDirty();
          });

        zoomBehavior3d = zoom;  // Guardar referência para zoom programático
        const drag = d3.drag()
          .filter(() => !locked)
          .on('start', () => { isDragging = true; })
          .on('drag', (e) => {
            const k = 75 / (BASE_3D.scale * state3d.k);
            const [λ, φ, γ] = state3d.rotate;
            state3d.rotate = [λ + e.dx * k, Math.max(-90, Math.min(90, φ - e.dy * k)), γ];
            markStaticDirty();
          })
          .on('end', () => { isDragging = false; });

        sel.call(zoom).call(drag);
        sel.call(zoom.transform, d3.zoomIdentity.scale(state3d.k));
      } else {
        // Pan clamping: translateExtent baseado nos bounds reais do mapa,
        // permitindo ver todo o conteúdo mas não área vazia além dele.
        const b = mapBounds2D ?? [[0, 0], [width, height]];
        const zoom = d3.zoom()
          .scaleExtent([1, 8])
          .extent([[0, 0], [width, height]])
          .translateExtent(b)
          .filter(() => !locked)
          .on('zoom', (e) => {
            state2d.k = e.transform.k;
            state2d.x = e.transform.x;
            state2d.y = e.transform.y;
            markStaticDirty();
          });

        zoomBehavior2d = zoom;  // Guardar referência para zoom programático
        sel.call(zoom);
        // Reaplica transform corrente (ou identity se vinha de outro modo / resize forçou clamp)
        const clampedK = Math.max(1, Math.min(8, state2d.k));
        sel.call(
          zoom.transform,
          d3.zoomIdentity.translate(state2d.x, state2d.y).scale(clampedK)
        );
      }
    }
  }

  /**
   * Verifica se uma coordenada (lon, lat) está na face visível do globo.
   * Em 2D, sempre retorna `true`.
   *
   * @param {number} lon
   * @param {number} lat
   * @returns {boolean}
   */
  function isVisibleOnGlobe(lon, lat) {
    if (morphing) {
      // Usa o clipAngle e o centro de rotação atual interpolados.
      return d3.geoDistance(morphRotateCenter, [lon, lat]) < morphClipAngleRad;
    }
    if (projectionType !== '3d') return true;
    const [λ, φ] = state3d.rotate;
    const center = [-λ, -φ];
    return d3.geoDistance(center, [lon, lat]) < Math.PI / 2;
  }

  // Posições, quadtree e trajetórias calculados dentro do rAF de draw (buildPositions).
  let visibleBubbles = [];
  let positionedBubbles = [];
  let bubbleQuadtree = d3.quadtree().x(d => d.x).y(d => d.y);
  let positionedTrajectories = [];

  /**
   * Reconstrói visibleBubbles, positionedBubbles, bubbleQuadtree e
   * positionedTrajectories com a projeção atual (já atualizada por buildProjection).
   * Chamado dentro do rAF de draw — sem passar pelo flush() do Svelte.
   */
  function buildPositions() {
    if (!projection) return;
    visibleBubbles = bubbles.filter(b => activeTypes.has(b.type));

    const isGlobe = projectionType === '3d';
    const k2d = state2d.k || 1;
    const pb = [];
    for (const b of visibleBubbles) {
      if (morphing) {
        if (!isVisibleOnGlobe(b.lon, b.lat)) continue;
      } else if (isGlobe && !isVisibleOnGlobe(b.lon, b.lat)) continue;
      const pt = projection([b.lon, b.lat]);
      if (!pt) continue;
      const dx = b.dxBase || 0;
      const dy = b.dyBase || 0;
      // Durante o morph, ignoramos offsets de descolisão (não escalam bem na
      // projeção interpolada). Voltam no estado final.
      const x = morphing ? pt[0] : (isGlobe ? pt[0] + dx : pt[0] + dx / k2d);
      const y = morphing ? pt[1] : (isGlobe ? pt[1] + dy : pt[1] + dy / k2d);
      pb.push({ bubble: b, x, y });
    }
    positionedBubbles = pb;

    const qt = d3.quadtree().x(d => d.x).y(d => d.y);
    qt.addAll(positionedBubbles);
    bubbleQuadtree = qt;

    const isGlobeT = morphing || projectionType === '3d';
    const proj = projectionUnclipped;
    const pt2 = [];
    for (const t of trajectories) {
      for (const seg of t.segments) {
        const id = `${seg.from.id}__${seg.to.id}`;
        if (isGlobeT) {
          // Em 3D não pré-calculamos pontos de tela: deixamos a projeção
          // ortográfica (clipada) cortar o arco geodésico na linha do horizonte.
          // Pulamos apenas se ambos os extremos estão na face oculta.
          const fromVisible = isVisibleOnGlobe(seg.from.lon, seg.from.lat);
          const toVisible = isVisibleOnGlobe(seg.to.lon, seg.to.lat);
          if (!fromVisible && !toVisible) continue;
          // Comprimento aproximado em pixels: distância entre extremos
          // projetados (sem clip) — dá length consistente mesmo se um lado
          // estiver na face oculta do globo.
          const apU = proj([seg.from.lon, seg.from.lat]);
          const bpU = proj([seg.to.lon, seg.to.lat]);
          const length = (apU && bpU)
            ? Math.hypot(bpU[0] - apU[0], bpU[1] - apU[1])
            : 0;
          pt2.push({
            id,
            kind: seg.kind,
            fromId: seg.from.id,
            toId: seg.to.id,
            fromBubble: seg.from,
            fromLon: seg.from.lon,
            fromLat: seg.from.lat,
            toLon: seg.to.lon,
            toLat: seg.to.lat,
            flowOffset: flowOffsetFor(id),
            length,
            geo: {
              type: 'LineString',
              coordinates: [
                [seg.from.lon, seg.from.lat],
                [seg.to.lon, seg.to.lat],
              ],
            },
          });
        } else {
          const ap = proj([seg.from.lon, seg.from.lat]);
          const bp = proj([seg.to.lon, seg.to.lat]);
          if (!ap || !bp) continue;
          const [ax, ay] = ap;
          const [bx, by] = bp;
          const dx = bx - ax;
          const dy = by - ay;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) continue;
          const offset = dist * 0.2;
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          const cpx = mx + (-dy / dist) * offset;
          const cpy = my + (dx / dist) * offset;
          pt2.push({
            id,
            kind: seg.kind,
            fromId: seg.from.id,
            toId: seg.to.id,
            fromBubble: seg.from,
            flowOffset: flowOffsetFor(id),
            length: dist,
            ax, ay, cpx, cpy, bx, by,
          });
        }
      }
    }
    positionedTrajectories = pt2;
  }

  let hoveredBubbleId = null;
  // Controla cursor via CSS class (evita DOM write no flush do Svelte).
  let isDragging = false;
  // Highlights calculados no rAF de draw (via buildHighlights).
  let effectiveBubbleId = null;
  let highlightedBubbleIds = null;
  let highlightedSegmentIds = null;

  /**
   * Reconstrói effectiveBubbleId, highlightedBubbleIds e highlightedSegmentIds.
   * Chamado dentro do rAF de draw, após buildPositions().
   */
  function buildHighlights() {
    if (pinnedCreator) {
      const found = bubbles.find(b => b.creator === pinnedCreator && b.type !== 'acervo');
      effectiveBubbleId = found?.id ?? null;
    } else {
      effectiveBubbleId = hoveredBubbleId;
    }

    if (!effectiveBubbleId) {
      highlightedBubbleIds = null;
      highlightedSegmentIds = null;
      return;
    }

    const ids = new Set();
    for (const t of trajectories) {
      const touches = t.segments.some(s => s.from.id === effectiveBubbleId || s.to.id === effectiveBubbleId);
      if (touches) {
        for (const s of t.segments) {
          ids.add(s.from.id);
          ids.add(s.to.id);
        }
      }
    }
    ids.add(effectiveBubbleId);
    highlightedBubbleIds = ids;

    const segIds = new Set();
    for (const seg of positionedTrajectories) {
      if (seg.fromId === effectiveBubbleId || seg.toId === effectiveBubbleId) {
        segIds.add(seg.id);
      } else if (highlightedBubbleIds.has(seg.fromId) && highlightedBubbleIds.has(seg.toId)) {
        segIds.add(seg.id);
      }
    }
    highlightedSegmentIds = segIds;
  }


  // ─── Canvas redraw — camada estática (basemap) ────────────────────────
  /** Repinta o basemap (sphere + países + bordas). */
  function redrawStatic() {
    if (!bgCtx || !projection) return;
    // Durante o morph: trata como globo (sphere fill consistente) e
    // pula o mesh de bordas para reduzir custo por frame.
    const isGlobe = morphing || projectionType === '3d';
    const isLight = theme === 'light';
    const geoPath = d3.geoPath().projection(projection).context(bgCtx);

    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgCtx.clearRect(0, 0, width, height);

    if (isGlobe) {
      /* Gradiente vertical: tema escuro topo preto → cinza; claro neutro → branco */
      const vertGrad = bgCtx.createLinearGradient(0, 0, 0, height);
      if (isLight) {
        vertGrad.addColorStop(0, 'rgba(240, 240, 240, 1)');
        vertGrad.addColorStop(1, 'rgba(248, 248, 248, 1)');
      } else {
        vertGrad.addColorStop(0,    'rgba(0, 0, 0, 1)');
        vertGrad.addColorStop(1,    'rgba(94, 94, 94, 1)');
      }
      bgCtx.fillStyle = vertGrad;
      bgCtx.fillRect(0, 0, width, height);

      /* Glow por trás do globo */
      const [glowCx, glowCy] = projection.translate();
      const glowSc = projection.scale();
      const glow = bgCtx.createRadialGradient(
        glowCx, glowCy, glowSc * 0.8,
        glowCx, glowCy, glowSc * 2.4
      );
      if (isLight) {
        /* Brilho sutil (clareia levemente ao redor da esfera) — evita halo cinza. */
        for (const [offset, color] of MAP_GLOW_STOPS_LIGHT) {
          glow.addColorStop(offset, color);
        }
      } else {
        glow.addColorStop(0,   'rgba(94, 94, 94, 1)');
        glow.addColorStop(0.3, 'rgba(94, 94, 94, 0.3)');
        glow.addColorStop(1,   'rgba(94, 94, 94, 0)');
      }
      bgCtx.fillStyle = glow;
      bgCtx.fillRect(0, 0, width, height);

      bgCtx.beginPath();
      geoPath(SPHERE);
      bgCtx.fillStyle = isLight ? '#ececec' : '#141414';
      bgCtx.fill();
      bgCtx.strokeStyle = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)';
      bgCtx.lineWidth = 0.6;
      bgCtx.stroke();
    } else {
      /* Fundo do mapa 2D */
      const vertGrad2d = bgCtx.createLinearGradient(0, 0, 0, height);
      if (isLight) {
        vertGrad2d.addColorStop(0, 'rgba(240, 240, 240, 1)');
        vertGrad2d.addColorStop(1, 'rgba(248, 248, 248, 1)');
      } else {
        vertGrad2d.addColorStop(0, 'rgba(0, 0, 0, 1)');
        vertGrad2d.addColorStop(1, 'rgba(94, 94, 94, 1)');
      }
      bgCtx.fillStyle = vertGrad2d;
      bgCtx.fillRect(0, 0, width, height);
    }

    if (countriesFeature) {
      bgCtx.beginPath();
      geoPath(countriesFeature);
      if (isLight) {
        /* Continentes escuros (carvão) sobre esfera/fundo claro — alto contraste. */
        bgCtx.fillStyle = MAP_LAND_COLOR_LIGHT;
      } else {
        bgCtx.fillStyle = isGlobe ? '#404040' : 'rgba(125, 125, 125, 1)';
      }
      bgCtx.fill();

      if (countriesMesh) {
        bgCtx.beginPath();
        geoPath(countriesMesh);
        if (isLight) {
          /* Bordas internas mais escuras que o preenchimento — definição sutil. */
          bgCtx.strokeStyle = isGlobe ? '#2a2a2a' : '#2a2a2a';
        } else {
          bgCtx.strokeStyle = isGlobe ? '#121212' : '#383838';
        }
        bgCtx.lineWidth = 0.5;
        bgCtx.stroke();
      }
    }

    /* Efeitos 3D clipsados na esfera: sombra interna (rim) + brilho superior */
    if (isGlobe) {
      const [cx, cy] = projection.translate();
      const sc = projection.scale();

      bgCtx.save();
      bgCtx.beginPath();
      geoPath(SPHERE);
      bgCtx.clip();

      /* Sombra interna — borda escura (efeito atmosférico / profundidade) */
      const rim = bgCtx.createRadialGradient(cx, cy, sc * 0.42, cx, cy, sc);
      if (isLight) {
        /* Rim bem sutil no tema claro — evita aspecto de esfera metálica. */
        rim.addColorStop(0,    'rgba(0,0,0,0)');
        rim.addColorStop(0.7,  'rgba(0,0,0,0.03)');
        rim.addColorStop(1,    'rgba(0,0,0,0.16)');
      } else {
        rim.addColorStop(0,    'rgba(0,0,0,0)');
        rim.addColorStop(0.65, 'rgba(0,0,0,0.10)');
        rim.addColorStop(1,    'rgba(0,0,0,0.58)');
      }
      bgCtx.fillStyle = rim;
      bgCtx.fillRect(0, 0, width, height);

      /* Brilho fixo superior-central — dá tridimensionalidade à esfera.
         Só no tema escuro; num globo claro o brilho branco não aparece. */
      if (!isLight) {
        const halo = bgCtx.createRadialGradient(cx, cy - sc * 0.30, 0, cx, cy - sc * 0.30, sc * 0.80);
        halo.addColorStop(0,   'rgba(255,255,255,0.07)');
        halo.addColorStop(0.5, 'rgba(255,255,255,0.02)');
        halo.addColorStop(1,   'rgba(255,255,255,0)');
        bgCtx.fillStyle = halo;
        bgCtx.fillRect(0, 0, width, height);
      }

      bgCtx.restore();
    }
  }

  // ─── Canvas redraw — camada dinâmica (trajetórias + bubbles) ─────────────
  /** Repinta as trajetórias, fluxo e bubbles. */
  function redrawDynamic() {
    if (!ctx || !projection) return;

    const isHovering = !!effectiveBubbleId;
    const isGlobe = projectionType === '3d';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Cores de trajetória adaptáveis ao tema (contraste sobre fundo claro/escuro).
    const flowHighlightColor = theme === 'light'
      ? TRAJECTORY_FLOW_COLOR_HIGHLIGHT_LIGHT
      : TRAJECTORY_FLOW_COLOR_HIGHLIGHT;
    const flowNormalColor = theme === 'light'
      ? TRAJECTORY_FLOW_COLOR_NORMAL_LIGHT
      : TRAJECTORY_FLOW_COLOR_NORMAL;

    // Trajetórias — agrupadas por estilo para reduzir trocas de strokeStyle.
    if (positionedTrajectories.length) {
      const baseColor = theme === 'light' ? '#888' : '#ccc';

      if (isGlobe) {
        // Em 3D, desenhamos cada trajetória como uma LineString geodésica.
        // A projeção ortográfica clipada corta o arco no horizonte automaticamente,
        // fazendo a curva acompanhar a superfície do globo.
        const geoPath = d3.geoPath().projection(projection).context(ctx);

        // Path padrão (uma única chamada de stroke)
        ctx.beginPath();
        let hasDefault = false;
        for (const seg of positionedTrajectories) {
          const isHighlightSeg = highlightedSegmentIds && highlightedSegmentIds.has(seg.id);
          if (isHovering && isHighlightSeg) continue;
          geoPath(seg.geo);
          hasDefault = true;
        }
        if (hasDefault) {
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = isHovering ? 0.05 : 0.3
          ctx.stroke();
        }

        // Path destacado
        if (isHovering) {
          ctx.beginPath();
          let hasHighlight = false;
          for (const seg of positionedTrajectories) {
            const isHighlightSeg = highlightedSegmentIds && highlightedSegmentIds.has(seg.id);
            if (!isHighlightSeg) continue;
            geoPath(seg.geo);
            hasHighlight = true;
          }
          if (hasHighlight) {
            ctx.strokeStyle = flowHighlightColor;
            ctx.lineWidth = 1.6;
            ctx.globalAlpha = 1;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      } else {
        // Em 2D, mantemos as curvas Bézier pré-calculadas.
        const defaultPath = new Path2D();
        const highlightPath = new Path2D();
        let hasDefault = false;
        let hasHighlight = false;

        for (const seg of positionedTrajectories) {
          const isHighlightSeg = highlightedSegmentIds && highlightedSegmentIds.has(seg.id);
          if (isHovering && isHighlightSeg) {
            highlightPath.moveTo(seg.ax, seg.ay);
            highlightPath.quadraticCurveTo(seg.cpx, seg.cpy, seg.bx, seg.by);
            hasHighlight = true;
          } else {
            defaultPath.moveTo(seg.ax, seg.ay);
            defaultPath.quadraticCurveTo(seg.cpx, seg.cpy, seg.bx, seg.by);
            hasDefault = true;
          }
        }

        if (hasDefault) {
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = isHovering ? 0.05 : 0.3;
          ctx.stroke(defaultPath);
        }
        if (hasHighlight) {
          ctx.strokeStyle = flowHighlightColor;
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = 1;
          ctx.stroke(highlightPath);
        }
        ctx.globalAlpha = 1;
      }
    }

    // Dots de fluxo — pulso percorrendo cada segmento (from → to). Acumulamos
    // em dois Path2D (normal/highlight) para reduzir o número de chamadas.
    if (TRAJECTORY_FLOW_ENABLED && positionedTrajectories.length) {
      const normalPath = new Path2D();
      const highlightPath = new Path2D();
      let hasNormal = false;
      let hasHighlight = false;
      // Em 3D/morph as trajetórias têm `geo`; em 2D têm Bézier.
      const useGeo = morphing || projectionType === '3d';
      const r = TRAJECTORY_FLOW_DOT_RADIUS;
      const rH = TRAJECTORY_FLOW_DOT_RADIUS * 1.6;

      for (const seg of positionedTrajectories) {
        if (!seg.length) continue;
        // flowPhase em px; offset desfasado proporcional ao length do seg.
        const t = ((flowPhase + seg.flowOffset * seg.length) % seg.length) / seg.length;
        let x, y;
        if (useGeo) {
          const ll = d3.geoInterpolate(
            [seg.fromLon, seg.fromLat],
            [seg.toLon, seg.toLat]
          )(t);
          if (!isVisibleOnGlobe(ll[0], ll[1])) continue;
          const pt = projection(ll);
          if (!pt) continue;
          x = pt[0]; y = pt[1];
        } else {
          const mt = 1 - t;
          x = mt * mt * seg.ax + 2 * mt * t * seg.cpx + t * t * seg.bx;
          y = mt * mt * seg.ay + 2 * mt * t * seg.cpy + t * t * seg.by;
        }
        const isHighlightSeg = highlightedSegmentIds && highlightedSegmentIds.has(seg.id);
        if (isHovering && isHighlightSeg) {
          highlightPath.moveTo(x + rH, y);
          highlightPath.arc(x, y, rH, 0, TAU);
          hasHighlight = true;
        } else {
          normalPath.moveTo(x + r, y);
          normalPath.arc(x, y, r, 0, TAU);
          hasNormal = true;
        }
      }

      if (hasNormal) {
        ctx.globalAlpha = isHovering ? 0.05 : 0.3;
        ctx.fillStyle = flowNormalColor;
        ctx.fill(normalPath);
      }
      if (hasHighlight) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = flowHighlightColor;
        ctx.fill(highlightPath);
      }
      ctx.globalAlpha = 1;
    }

    // Bubbles — agrupadas por cor (3 paths em vez de N).
    // Bubbles de acervo são renderizadas separadamente como anéis (fill transparente + stroke colorido).
    // Quando há hover, separamos também as destacadas.
    const fillByColor = new Map(); // color → Path2D (bubbles de trajetória)
    const ringByColor = new Map(); // color → Path2D (bubbles de acervo — stroke only)
    const highlightArcs = [];      // {x, y, color, isAcervo}
    const dimAlpha = isHovering ? 0.25 : 0.85;
    // Halo/traço das bubbles adaptáveis ao tema (contraste sobre fundo claro/escuro).
    const bubbleHaloColor = theme === 'light' ? '#121212' : '#ffffff';
    const bubbleStrokeColor = theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    for (const { bubble, x, y } of positionedBubbles) {
      let color = TYPE_COLOR[bubble.type];
      if (bubble.type === 'acervo' && theme === 'light') {
        color = TYPE_COLOR_ACERVO_LIGHT;
      }
      if (!color) continue;
      const isAcervo = bubble.type === 'acervo';
      const isHighlightBubble = highlightedBubbleIds && highlightedBubbleIds.has(bubble.id);
      if (isHovering && isHighlightBubble) {
        highlightArcs.push({ x, y, color, isAcervo });
      } else if (isAcervo) {
        let p = ringByColor.get(color);
        if (!p) { p = new Path2D(); ringByColor.set(color, p); }
        p.moveTo(x + BUBBLE_RADIUS, y);
        p.arc(x, y, BUBBLE_RADIUS, 0, TAU);
      } else {
        let p = fillByColor.get(color);
        if (!p) { p = new Path2D(); fillByColor.set(color, p); }
        p.moveTo(x + BUBBLE_RADIUS, y);
        p.arc(x, y, BUBBLE_RADIUS, 0, TAU);
      }
    }

    // Fills agrupados (bubbles de trajetória)
    ctx.globalAlpha = dimAlpha;
    ctx.strokeStyle = bubbleStrokeColor;
    ctx.lineWidth = 0.1;
    for (const [color, path] of fillByColor) {
      ctx.fillStyle = color;
      ctx.fill(path);
      ctx.stroke(path);
    }

    // Anéis de acervo — fill transparente + stroke na cor do acervo
    ctx.globalAlpha = dimAlpha;
    ctx.lineWidth = BUBBLE_HIGHLIGHT_RING_WIDTH;
    for (const [color, path] of ringByColor) {
      ctx.strokeStyle = color;
      ctx.stroke(path);
    }

    // Bubbles destacadas — desenhadas individualmente com halo externo
    if (highlightArcs.length) {
      ctx.globalAlpha = 1;
      for (const a of highlightArcs) {
        if (a.isAcervo) {
          // Acervo destacado: anel mais espesso na cor do acervo
          ctx.beginPath();
          ctx.arc(a.x, a.y, BUBBLE_RADIUS, 0, TAU);
          ctx.strokeStyle = a.color;
          ctx.lineWidth = BUBBLE_HIGHLIGHT_RING_WIDTH * 2;
          ctx.stroke();
        } else {
          // Anel externo (halo) — cor adaptável ao tema
          ctx.beginPath();
          ctx.arc(a.x, a.y, BUBBLE_RADIUS + BUBBLE_HIGHLIGHT_RING_WIDTH, 0, TAU);
          ctx.fillStyle = bubbleHaloColor;
          ctx.fill();

          // Fill colorido interno
          ctx.beginPath();
          ctx.arc(a.x, a.y, BUBBLE_RADIUS, 0, TAU);
          ctx.fillStyle = a.color;
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;

    // Label de hover desenhado diretamente no canvas
    if (hoveredBubbleId) {
      const found = positionedBubbles.find(pb => pb.bubble.id === hoveredBubbleId);
      if (found) {
        const { bubble, x, y } = found;
        const label = (bubble.creator || bubble.place || '').toUpperCase();
        if (label) {
          const PAD = 4;
          const FONT_SIZE = 10;
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.font = `500 ${FONT_SIZE}px "JetBrains Mono", monospace`;
          ctx.textBaseline = 'alphabetic';
          const tw = ctx.measureText(label).width;
          const boxW = tw + PAD * 2;
          const boxH = FONT_SIZE + PAD * 2;
          let lx = x + BUBBLE_RADIUS + 6;
          let ly = y - BUBBLE_RADIUS - 4;
          if (lx + boxW > width) lx = x - boxW - BUBBLE_RADIUS - 6;
          if (ly - boxH < 0) ly = y + BUBBLE_RADIUS + boxH + 4;
          ctx.fillStyle = 'rgba(20,20,20,0.88)';
          ctx.fillRect(lx, ly - boxH, boxW, boxH);
          ctx.fillStyle = '#f4f6f8';
          ctx.fillText(label, lx + PAD, ly - PAD);
          ctx.restore();
        }
      }
    }
  }

  // Triggers reativos mínimos — acionados apenas por mudanças de props externas
  // ou hover (não por drag/zoom, que chamam markStaticDirty() diretamente).
  // Dados ou filtros externos mudaram: recalcula tudo no próximo rAF.
  $: { void bubbles; void trajectories; void activeTypes; void bottomInset; void pinnedCreator;
       if (ctx) markStaticDirty(); }
  // Hover muda apenas a camada dinâmica.
  $: { void hoveredBubbleId; if (ctx) markDynamicDirty(); }
  // Tema muda ambas as camadas (paleta do canvas).
  $: { void theme; if (bgCtx) markStaticDirty(); }
  // TopoJSON carregado em onMount — já chama markStaticDirty() explicitamente.
  // Mantido como safety-net para HMR em desenvolvimento.
  $: { void countriesFeature; void countriesMesh; if (bgCtx) markStaticDirty(); }

  // ─── Interação do mouse (hit-test) ───────────────────────────────
  // Throttled via rAF: no máximo uma checagem por frame.
  let pendingMouse = null;
  let mouseRaf = 0;
  /** Hit-test em quadtree para detectar bubble sob o cursor. */
  function onMouseMove(e) {
    if (!canvasEl) return;
    if (locked) { if (hoveredBubbleId) hoveredBubbleId = null; return; }
    pendingMouse = { clientX: e.clientX, clientY: e.clientY };
    if (mouseRaf) return;
    mouseRaf = requestAnimationFrame(() => {
      mouseRaf = 0;
      if (!pendingMouse) return;
      const { clientX, clientY } = pendingMouse;
      pendingMouse = null;
      // Usa offset cacheado (atualizado no ResizeObserver) em vez de
      // getBoundingClientRect() para não forçar reflow no hot path.
      // scaleX/scaleY são sempre 1.0 pois width/height refletem as dimensões CSS.
      const mx = clientX - canvasLeft;
      const my = clientY - canvasTop;

      const found = bubbleQuadtree
        ? bubbleQuadtree.find(mx, my, BUBBLE_RADIUS + 4)
        : null;

      if (found) {
        hoveredBubbleId = found.bubble.id;
        return;
      }

      // Sem bubble sob o cursor — tenta acertar uma trajetória.
      const seg = hitTrajectory(mx, my, 4);
      if (seg) {
        // Usa o id do extremo `from` para reaproveitar a lógica existente de
        // destaque por criador (highlightedBubbleIds/highlightedSegmentIds).
        if (hoveredBubbleId !== seg.fromId) hoveredBubbleId = seg.fromId;
      } else if (hoveredBubbleId) {
        hoveredBubbleId = null;
      }
    });
  }

  /** Limpa estado de hover ao sair do canvas. */
  function onMouseLeave() {
    if (mouseRaf) { cancelAnimationFrame(mouseRaf); mouseRaf = 0; }
    pendingMouse = null;
    if (hoveredBubbleId) {
      hoveredBubbleId = null;
    }
  }

  /** Click no canvas: hit-test e dispatch de `artistclick` se acertou uma bubble. */
  function onClick(e) {
    if (!canvasEl || !bubbleQuadtree) return;
    // Usa offset cacheado — mesma razão de onMouseMove.
    const mx = e.clientX - canvasLeft;
    const my = e.clientY - canvasTop;
    const found = bubbleQuadtree.find(mx, my, BUBBLE_RADIUS + 4);
    // Bubbles de acervo não disparam interação de artista.
    if (found && found.bubble.type !== 'acervo') {
      onArtistClick?.(found.bubble);
      return;
    }
    if (found) return; // acervo: ignora
    // Sem bubble — tenta acertar trajetória.
    const seg = hitTrajectory(mx, my, 4);
    if (seg?.fromBubble) {
      onArtistClick?.(seg.fromBubble);
    }
  }

  // ─── Hit-test em trajetórias ─────────────────────────────────
  // Itera `positionedTrajectories` amostrando cada segmento e calculando
  // distância ponto-a-polilinha. Retorna o segmento mais próximo se
  // estiver dentro de `tol` pixels. Em 2D usa Bézier quadrática
  // pré-calculada; em 3D amostra o arco geodésico pela projeção atual.
  const HIT_SAMPLES = 10;

  function distPointSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  function hitTrajectory(mx, my, tol) {
    if (!positionedTrajectories.length) return null;
    const isGlobe = morphing || projectionType === '3d';
    let best = null;
    let bestDist = tol;

    for (const seg of positionedTrajectories) {
      // Reusa um array de amostras locais para evitar alocações.
      const pts = [];
      if (isGlobe) {
        const interp = d3.geoInterpolate(
          [seg.fromLon, seg.fromLat],
          [seg.toLon, seg.toLat]
        );
        for (let i = 0; i <= HIT_SAMPLES; i++) {
          const t = i / HIT_SAMPLES;
          const ll = interp(t);
          if (!isVisibleOnGlobe(ll[0], ll[1])) continue;
          const pt = projection(ll);
          if (pt) pts.push(pt[0], pt[1]);
        }
      } else {
        for (let i = 0; i <= HIT_SAMPLES; i++) {
          const t = i / HIT_SAMPLES;
          const mt = 1 - t;
          const x = mt * mt * seg.ax + 2 * mt * t * seg.cpx + t * t * seg.bx;
          const y = mt * mt * seg.ay + 2 * mt * t * seg.cpy + t * t * seg.by;
          pts.push(x, y);
        }
      }
      // Bounding box rápido para descartar segmentos muito distantes.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i], y = pts[i + 1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      if (mx < minX - bestDist || mx > maxX + bestDist ||
          my < minY - bestDist || my > maxY + bestDist) continue;

      for (let i = 0; i + 3 < pts.length; i += 2) {
        const d = distPointSeg(mx, my, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
        if (d < bestDist) {
          bestDist = d;
          best = seg;
        }
      }
    }
    return best;
  }

  /**
   * Aplica zoom programático (botões +/-).
   * Multiplicá a escala atual por `factor`, respeitando os limites da projeção.
   *
   * @param {number} factor - Fator multiplicativo (ex: 1.3 para aumentar, 1/1.3 para diminuir)
   */
  export function zoomBy(factor) {
    if (!zoomSelection) return;
    const behavior = projectionType === '2d' ? zoomBehavior2d : zoomBehavior3d;
    if (behavior) {
      zoomSelection.call(behavior.scaleBy, factor);
    }
  }
</script>

<div class="world-map-wrap" bind:this={containerEl}>
  <canvas
    bind:this={bgCanvasEl}
    class="world-map world-map--bg"
    class:world-map--globe={projectionType === '3d'}
    aria-hidden="true"
  ></canvas>
  <canvas
    bind:this={canvasEl}
    class="world-map world-map--fg"
    class:world-map--globe={projectionType === '3d'}
    class:world-map--locked={locked}
    class:is-hovering={!morphing && !isDragging && !!hoveredBubbleId}
    class:is-dragging={isDragging}
    class:is-morphing={morphing}
    aria-label="Mapa interativo de criadores"
    on:mousemove={onMouseMove}
    on:mouseleave={onMouseLeave}
    on:click={onClick}
  ></canvas>
  <!-- Gradientes de profundidade sobre o canvas: apenas no modo globo 3D -->
  {#if projectionType === '3d'}
  <div class="map-vignette" aria-hidden="true"></div>
  <div class="map-gradient-top" aria-hidden="true"></div>
  <div class="map-gradient-left" aria-hidden="true"></div>
  {/if}
</div>

<style lang="scss">
  .world-map-wrap {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .world-map {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }

  .world-map--bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .world-map--fg {
    position: relative;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .world-map--locked {
    /* Bloqueia hover/cursor; pan/zoom desligados via filter() do d3, mas o
       click permanece ativo para permitir troca de artista no card. */
    cursor: default;
  }

  /* Cursor declarativo via classes — evita sel.style() no flush do Svelte */
  .world-map--fg.is-hovering  { cursor: pointer; }
  .world-map--fg.is-dragging  { cursor: grabbing; }
  .world-map--fg.is-morphing  { cursor: progress; }

  /* ── Gradientes de profundidade ────────────────────────────────────── */
  .map-vignette,
  .map-gradient-top,
  .map-gradient-left {
    position: absolute;
    pointer-events: none;
    z-index: 3;
  }

  /* Vignette radial: cantos escuros, centro aberto */
  .map-vignette {
    inset: 0;
    opacity: var(--map-vignette-opacity);
    background: radial-gradient(
      ellipse 70% 60% at 60% 50%,
      transparent 30%,
      var(--bg-vignette-left) 100%
    );
  }

  /* Gradiente superior — separa canvas do header */
  .map-gradient-top {
    top: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(to bottom, var(--bg-vignette-top) 0%, transparent 100%);
    opacity: var(--map-edge-gradient-opacity);
  }

  /* Gradiente lateral esquerdo — suaviza transição com a sidebar */
  .map-gradient-left {
    top: 0;
    left: 0;
    bottom: 0;
    width: 200px;
    background: linear-gradient(to right, var(--bg-vignette-left) 0%, transparent 100%);
    opacity: var(--map-edge-gradient-opacity);
  }
</style>
