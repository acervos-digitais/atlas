<script>
  import { onDestroy } from 'svelte';
import {
  UNDATED_YEAR,
  ARTWORK_STRIP_HOVER_DELAY,
  ARTWORK_STRIP_TRANSITION_DURATION,
  ARTWORK_STRIP_DEFAULT_MESSAGE,
} from '../lib/constants.js';
import { formatAcervoLabel } from '../lib/dataUtils.js';

  /** Locale ativo: 'pt' | 'en'. */
  export let locale = 'pt';

  /**
   * Lista de obras já filtrada e ordenada por `App.svelte`.
   * Cada obra: { id, creator, museum, title, year, image, url }.
   */
  export let artworks = [];

  /** Quando definido, indica que o strip está filtrado a um único criador. */
  export let selectedCreator = null;

  /**
   * Estado do collapse — controlado (bindable). Pai pode `bind:collapsed`
   * para calcular `bottomInset` do WorldMap e evitar oclusão do globo.
   */
  export let collapsed = false;

  /** Quando true, renderiza como overlay flutuante de largura variável (mobile). */
  export let mobile = false;
  export let onArtistSelect = null;

  /** Distância (em px) até o fim do scroll vertical — controla o fade. */
  let scrollEl;
  let atBottom = false;

  /** Atualiza `atBottom` quando o usuário rola a grid de obras. */
  function handleScroll() {
    if (!scrollEl) return;
    const { scrollTop, clientHeight, scrollHeight } = scrollEl;
    atBottom = scrollTop + clientHeight >= scrollHeight - 1;
  }

  /** Quando a lista de obras muda, reavalia o fade (pode ter encolhido). */
  $: if (artworks && scrollEl) {
    /* defer p/ próximo tick para garantir DOM atualizado */
    queueMicrotask(handleScroll);
  }

  /** Click numa obra → emite o criador primário (`creators[0]`) para abrir o ArtistCard. */
  function selectArtwork(artwork) {
    const primary = artwork?.creators?.[0];
    if (primary && typeof onArtistSelect === 'function') {
      onArtistSelect(primary);
    }
  }

  /** Decide se o ano deve ser exibido (oculta UNDATED_YEAR/null). */
  function showYear(year) {
    return typeof year === 'number' && year !== UNDATED_YEAR;
  }

  function toggleCollapsed() {
    collapsed = !collapsed;
  }

  /* ── Tooltip rico ─────────────────────────────────────────────────── */
  /** Obra atualmente em hover (ou null). */
  let hoveredArt = null;
  /** Coordenadas do cursor para posicionar o tooltip. */
  let tipX = 0;
  let tipY = 0;
  /** Timer do delay antes de exibir o tooltip. */
  let hoverTimer = null;

  function onArtworkPointerEnter(event, art) {
    tipX = event.clientX;
    tipY = event.clientY;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => { hoveredArt = art; }, ARTWORK_STRIP_HOVER_DELAY);
  }

  function onArtworkPointerMove(event) {
    tipX = event.clientX;
    tipY = event.clientY;
  }

  function onArtworkPointerLeave() {
    clearTimeout(hoverTimer);
    hoveredArt = null;
  }

  /* ── Lazy-load por IntersectionObserver (ativado com >50 obras) ─── */
  /** Ativo apenas quando a lista é grande o suficiente para justificar. */
  $: useObserver = artworks.length > 50;

  let observer = null;
  let failedImages = new Map();
  $: imageUnavailable = ARTWORK_STRIP_DEFAULT_MESSAGE[locale].imageUnavailable;
  $: if (artworks) {
    const sources = new Map(artworks.map(art => [art.id, art.image]));
    failedImages = new Map([...failedImages].filter(([id, src]) => sources.get(id) === src));
    onArtworkPointerLeave();
  }

  function imageFailed(art) {
    failedImages = new Map(failedImages).set(art.id, art.image);
  }

  onDestroy(() => {
    if (observer) observer.disconnect();
    clearTimeout(hoverTimer);
  });

  /**
   * O observer agenda a requisição; só o evento load confirma seu sucesso.
   * Sem suporte a IntersectionObserver, usa o carregamento nativo.
   */
  function lazyImg(node, { src, deferred }) {
    const schedule = (source, defer) => {
      observer?.unobserve(node);
      node.removeAttribute('src');
      node.removeAttribute('data-lazy-src');
      node.classList.remove('artwork__img--loaded');
      if (!source) return;
      if (!defer || typeof IntersectionObserver === 'undefined') {
        node.src = source;
        return;
      }
      if (!observer) {
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const img = entry.target;
            const lazy = img.dataset.lazySrc;
            observer.unobserve(img);
            if (lazy) {
              img.removeAttribute('data-lazy-src');
              img.src = lazy;
            }
          }
        }, { root: scrollEl, rootMargin: '80px' });
      }
      node.dataset.lazySrc = source;
      observer.observe(node);
    };
    schedule(src, deferred);
    return {
      destroy() {
        observer?.unobserve(node);
      },
      update({ src: newSrc, deferred: newDeferred }) {
        schedule(newSrc, newDeferred);
      },
    };
  }
</script>

{#if artworks.length > 0}
  <section
    class="artwork-strip"
    class:artwork-strip--collapsed={collapsed}
    class:artwork-strip--mobile={mobile}
    aria-label="Obras dos artistas selecionados"
  >
    <button
      type="button"
      class="artwork-strip__header"
      aria-expanded={!collapsed}
      on:click={toggleCollapsed}
    >
      <span
        class="artwork-strip__chevron"
        class:artwork-strip__chevron--collapsed={collapsed}
        aria-hidden="true"
      >▾</span>
      <span class="artwork-strip__label">
        {selectedCreator ? `${ARTWORK_STRIP_DEFAULT_MESSAGE[locale].worksBy} ${selectedCreator}` : ARTWORK_STRIP_DEFAULT_MESSAGE[locale].empty}
      </span>
    </button>

    <!-- Wrapper animado: sempre no DOM, altura 0 quando colapsado -->
    <div class="artwork-strip__body" class:artwork-strip__body--collapsed={collapsed} inert={collapsed}>
      <div
        class="artwork-strip__scroll"
        class:artwork-strip__scroll--at-bottom={atBottom}
        bind:this={scrollEl}
        on:scroll={handleScroll}
      >
        <ul class="artwork-strip__grid">
          {#each artworks as art (art.id)}
            <li class="artwork">
              <button
                type="button"
                class="artwork__btn"
                aria-label={[art.title, ...(art.creators ?? []), art.museum, showYear(art.year) ? art.year : null, !art.image || failedImages.get(art.id) === art.image ? imageUnavailable : null].filter(Boolean).join(' — ')}
                on:click={() => selectArtwork(art)}
                on:pointerenter={(e) => onArtworkPointerEnter(e, art)}
                on:pointermove={onArtworkPointerMove}
                on:pointerleave={onArtworkPointerLeave}
              >
                {#if art.image && failedImages.get(art.id) !== art.image}
                  {#key art.image}
                    <img
                      class="artwork__img"
                      use:lazyImg={{ src: art.image, deferred: useObserver }}
                      alt={art.title || 'Obra'}
                      loading="lazy"
                      draggable="false"
                      on:load={(event) => event.currentTarget.classList.add('artwork__img--loaded')}
                      on:error={() => imageFailed(art)}
                    />
                  {/key}
                {:else}
                  <div class="artwork__img artwork__img--placeholder" class:artwork__img--compact={mobile}>{imageUnavailable}</div>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </section>
{/if}

<!-- Tooltip rico — renderizado fora do <section> para evitar clipping -->
{#if hoveredArt}
  <div
    class="artwork-tip"
    style="left: {tipX + 14}px; top: {tipY - 100}px;"
    role="tooltip"
    aria-live="polite"
  >
    <p class="artwork-tip__title">{hoveredArt.title || 'Sem título'}</p>
    {#if showYear(hoveredArt.year)}
      <p class="artwork-tip__year">{hoveredArt.year}</p>
    {/if}
    <p class="artwork-tip__creator">{(hoveredArt.creators ?? []).join(' / ')}</p>
    {#if hoveredArt.museum}
      <p class="artwork-tip__museum">{formatAcervoLabel(hoveredArt.museum)}</p>
    {/if}
  </div>
{/if}

<style lang="scss">
  .artwork-strip {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg);
    color: var(--txt);
    pointer-events: auto;
    /* height: ARTWORK_STRIP_HEIGHT_EXPANDED (248px) */
    height: auto;
    max-height: 248px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    z-index: 5;
    /* transition: height ARTWORK_STRIP_TRANSITION_DURATION (200ms) */
    transition: height 200ms ease-out;
  }

  .artwork-strip--collapsed {
    /* height: ARTWORK_STRIP_HEIGHT_COLLAPSED (36px) */
    height: 36px;
  }

  /* ── Mobile: overlay flutuante de largura variável ─────────────────── */
  .artwork-strip--mobile {
    left: auto;
    right: 12px;
    bottom: 12px;
    width: auto;
    max-width: calc(100% - 24px);
    border-radius: 8px;
    border: 1px solid var(--bg-hl);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
    /* height: ARTWORK_STRIP_HEIGHT_MOBILE_EXPANDED (65px) */
    height: 65px;
  }

  .artwork-strip--mobile.artwork-strip--collapsed {
    /* height: ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED (31px) */
    height: 31px;
  }

  /* No mobile a aba é mais baixa (31px) e a grid vira fileira horizontal. */
  .artwork-strip--mobile .artwork-strip__header {
    height: 31px;
    padding: 0 12px;
    font-size: var(--font-size-xs);
  }

  .artwork-strip--mobile .artwork-strip__grid {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: 80px;
    padding: 4px 12px 6px;
  }

  .artwork-strip--mobile .artwork-strip__scroll {
    overflow-x: auto;
    overflow-y: hidden;
  }

  /* ── Header clicável (chevron + label) ─────────────────────────────── */
  .artwork-strip__header {
    all: unset;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 36px;
    padding: 0 20px;
    cursor: pointer;
    color: var(--txt-l);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-wider);
    text-transform: uppercase;
    flex-shrink: 0;
    box-sizing: border-box;

    &:hover {
      color: var(--txt);
    }

    &:focus-visible {
      outline: 2px solid var(--txt);
      outline-offset: -2px;
    }
  }

  .artwork-strip__chevron {
    display: inline-block;
    width: 12px;
    text-align: center;
    color: var(--txt);
    transform: rotate(0deg);
    transition: transform 200ms ease-out;
  }

  .artwork-strip__chevron--collapsed {
    transform: rotate(-90deg);
  }

  .artwork-strip__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Wrapper do body animado ──────────────────────────────────────── */
  .artwork-strip__body {
    flex: 1 1 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── Container scrollável da grid ──────────────────────────────────── */
  .artwork-strip__scroll {
    position: relative;
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-hl) transparent;

    /* Gradiente sutil sobre a última fileira indicando mais conteúdo abaixo.
       Some quando o scroll chega ao fim. Nunca clicável. */
    &::after {
      content: '';
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      display: block;
      height: 50px;
      margin-top: -50px;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0) 38.46%, #000000 100%);
      pointer-events: none;
      opacity: 1;
      transition: opacity 120ms linear;
    }

    /* `--at-bottom` é aplicada dinamicamente via class:; :global evita
       falso aviso de seletor não utilizado, mantendo a base com escopo. */
    &:global(.artwork-strip__scroll--at-bottom)::after {
      opacity: 0;
    }
  }

  /* ── Grid vertical de thumbnails quadrados ─────────────────────────── */
  .artwork-strip__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
    padding: 8px 20px 16px;
    margin: 0;
    list-style: none;
  }

  .artwork {
    aspect-ratio: 1 / 1;
  }

  .artwork-strip--mobile .artwork {
    aspect-ratio: auto;
    height: 24px;
  }

  .artwork__btn {
    all: unset;
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;
    box-sizing: border-box;

    &:hover .artwork__img {
      outline: 2px solid var(--txt);
    }

    &:focus-visible {
      outline: 2px solid var(--txt);
      outline-offset: 2px;
    }
  }

  .artwork__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: var(--bg-l);
    display: block;
    transition: outline 0.1s, opacity 180ms;
  }

  /* `--loaded` é adicionada via classList.add em JS (lazy-load); :global
     evita falso aviso de seletor não utilizado. */
  .artwork__img:global(.artwork__img--loaded) {
    animation: artwork-fadein 180ms ease-out;
  }

  @keyframes artwork-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .artwork__img--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--txt-l);
    font-size: var(--font-size-xs);
    line-height: 1.1;
    text-align: center;
    overflow-wrap: anywhere;
    box-sizing: border-box;
  }

  .artwork__img--compact {
    font-size: var(--font-size-2xs);
  }

  /* ── Tooltip rico das obras ─────────────────────────────────────────── */
  :global(.artwork-tip) {
    position: fixed;
    z-index: 100;
    background: var(--bg-l);
    color: var(--txt);
    border: 1px solid var(--bg-hl);
    border-radius: 4px;
    padding: 8px 12px;
    max-width: 220px;
    pointer-events: none;
    font-size: var(--font-size-xs);
    line-height: var(--line-height-normal);

    p {
      margin: 0;
    }
  }

  :global(.artwork-tip__title) {
    font-weight: var(--font-weight-semibold);
    margin-bottom: 2px !important;
  }

  :global(.artwork-tip__year) {
    color: var(--txt-l);
  }

  :global(.artwork-tip__creator) {
    margin-top: 4px !important;
    color: var(--txt-l);
    font-style: italic;
  }

  :global(.artwork-tip__museum) {
    margin-top: 2px !important;
    font-size: var(--font-size-xs);
    color: var(--txt-hl);
  }
</style>
