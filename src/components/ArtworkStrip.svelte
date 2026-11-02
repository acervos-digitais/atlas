<script>
  import { onDestroy } from 'svelte';
import {
  UNDATED_YEAR,
  ARTWORK_STRIP_HOVER_DELAY,
  ARTWORK_STRIP_DEFAULT_MESSAGE,
  ARTWORK_STRIP_HEIGHT_EXPANDED,
  ARTWORK_STRIP_HEIGHT_COLLAPSED,
  ARTWORK_STRIP_HEIGHT_MOBILE_EXPANDED,
  ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED,
  ARTWORK_STRIP_MAX_FRACTION,
  ARTWORK_STRIP_KEYBOARD_STEP,
  ARTWORK_STRIP_CHEVRON_PATH,
} from '../lib/constants.js';
import { formatAcervoLabel } from '../lib/dataUtils.js';
import { availableArtworkImage, imageSourceKey, recordImageFailure } from '../lib/artworkImages.js';

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
   * Estado do collapse — controlado (bindable).
   */
  export let collapsed = false;
  /** Altura real para reservar espaço no mapa, inclusive quando a faixa é limitada. */
  export let renderedHeight = 0;

  function measureHeight(node) {
    const update = () => { renderedHeight = node.getBoundingClientRect().height; };
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(node);
    update();
    return {
      destroy() {
        resizeObserver.disconnect();
        renderedHeight = 0;
      },
    };
  }

  /** Quando true, usa as dimensões compactas do layout mobile. */
  export let mobile = false;
  export let onArtistSelect = null;

  let availableHeight = null;
  let customHeight = null;
  let drag = null;
  let dragFrame = null;
  let pendingHeight = null;
  $: tabHeight = mobile ? ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED : ARTWORK_STRIP_HEIGHT_COLLAPSED;
  $: initialHeight = mobile ? ARTWORK_STRIP_HEIGHT_MOBILE_EXPANDED : ARTWORK_STRIP_HEIGHT_EXPANDED;
  $: maxHeight = availableHeight === null ? initialHeight : availableHeight * ARTWORK_STRIP_MAX_FRACTION;
  $: minHeight = Math.min(tabHeight, maxHeight);
  $: stripHeight = Math.min(maxHeight, collapsed ? minHeight : Math.max(minHeight, customHeight ?? initialHeight));
  $: labels = ARTWORK_STRIP_DEFAULT_MESSAGE[locale];
  $: artworkLabel = selectedCreator ? `${labels.worksBy} ${selectedCreator}` : labels.empty;

  function observeAvailableSpace(node) {
    const update = () => {
      availableHeight = node.parentElement.getBoundingClientRect().height;
    };
    const observer = new ResizeObserver(update);
    observer.observe(node.parentElement);
    update();
    return { destroy: () => observer.disconnect() };
  }

  function observeScroll(node) {
    const observer = new ResizeObserver(handleScroll);
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }

  function setHeight(height) {
    const next = Math.max(minHeight, Math.min(maxHeight, height));
    collapsed = next <= minHeight;
    if (!collapsed) customHeight = next;
  }

  function startResize(event) {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    event.preventDefault();
    onArtworkPointerLeave();
    drag = { id: event.pointerId, y: event.clientY, height: stripHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event) {
    if (!drag || drag.id !== event.pointerId) return;
    pendingHeight = drag.height + drag.y - event.clientY;
    if (dragFrame !== null) return;
    dragFrame = requestAnimationFrame(() => {
      dragFrame = null;
      setHeight(pendingHeight);
      pendingHeight = null;
    });
  }

  function endResize(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
    dragFrame = null;
    if (event.type === 'pointerup') setHeight(drag.height + drag.y - event.clientY);
    else if (pendingHeight !== null) setHeight(pendingHeight);
    pendingHeight = null;
    drag = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resizeByKeyboard(event) {
    const heights = {
      ArrowUp: stripHeight + ARTWORK_STRIP_KEYBOARD_STEP,
      ArrowDown: stripHeight - ARTWORK_STRIP_KEYBOARD_STEP,
      Home: minHeight,
      End: maxHeight,
    };
    if (!(event.key in heights)) return;
    event.preventDefault();
    setHeight(heights[event.key]);
  }

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
    const sources = new Map(artworks.map(art => [art.id, imageSourceKey(art)]));
    failedImages = new Map([...failedImages].filter(([id, failure]) => sources.get(id) === failure.key));
    onArtworkPointerLeave();
  }

  function imageFailed(art, source) {
    failedImages = new Map(failedImages).set(art.id, recordImageFailure(art, source, failedImages.get(art.id)));
  }

  onDestroy(() => {
    if (observer) observer.disconnect();
    clearTimeout(hoverTimer);
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
  });

  /**
   * O observer agenda a requisição; só o evento load confirma seu sucesso.
   * Sem suporte a IntersectionObserver, usa o carregamento nativo.
   */
  function lazyImg(node, { src, deferred }) {
    let scheduledSource;
    let scheduledDeferred;
    const schedule = (source, defer) => {
      if (source === scheduledSource && defer === scheduledDeferred) return;
      scheduledSource = source;
      scheduledDeferred = defer;
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
    use:measureHeight
    use:observeAvailableSpace
    style:height="{stripHeight}px"
    style:--artwork-tab-height="{tabHeight}px"
    class:artwork-strip--collapsed={collapsed}
    class:artwork-strip--mobile={mobile}
    aria-label={artworkLabel}
  >
    <button
      type="button"
      class="artwork-strip__header"
      aria-expanded={!collapsed}
      aria-label={`${labels.toggle} — ${artworkLabel}`}
      on:click={toggleCollapsed}
    >
      <span
        class="artwork-strip__chevron"
        class:artwork-strip__chevron--collapsed={collapsed}
        style="--artwork-chevron: url('{import.meta.env.BASE_URL}{ARTWORK_STRIP_CHEVRON_PATH}')"
        aria-hidden="true"
      ></span>
      <span class="artwork-strip__label">{artworkLabel}</span>
    </button>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions (Separador redimensionável segue o padrão WAI-ARIA Window Splitter.) -->
    <div
      class="artwork-strip__resize"
      style:top="{tabHeight}px"
      role="separator"
      tabindex={collapsed ? -1 : 0}
      aria-label={labels.resize}
      aria-orientation="horizontal"
      aria-valuemin={Math.round(minHeight)}
      aria-valuemax={Math.round(maxHeight)}
      aria-valuenow={Math.round(stripHeight)}
      on:pointerdown={startResize}
      on:pointermove={moveResize}
      on:pointerup={endResize}
      on:pointercancel={endResize}
      on:lostpointercapture={endResize}
      on:keydown={resizeByKeyboard}
    ></div>

    <!-- Mantém as obras no DOM ao recolher a faixa. -->
    <div class="artwork-strip__body" class:artwork-strip__body--collapsed={collapsed} inert={collapsed}>
      <div
        class="artwork-strip__scroll"
        class:artwork-strip__scroll--at-bottom={atBottom}
        bind:this={scrollEl}
        use:observeScroll
        on:scroll={handleScroll}
      >
        <ul class="artwork-strip__grid">
          {#each artworks as art (art.id)}
            {@const imageSource = availableArtworkImage(art, failedImages.get(art.id))}
            <li class="artwork">
              <button
                type="button"
                class="artwork__btn"
                aria-label={[art.title, ...(art.creators ?? []), art.museum, showYear(art.year) ? art.year : null, !imageSource ? imageUnavailable : null].filter(Boolean).join(' — ')}
                on:click={() => selectArtwork(art)}
                on:pointerenter={(e) => onArtworkPointerEnter(e, art)}
                on:pointermove={onArtworkPointerMove}
                on:pointerleave={onArtworkPointerLeave}
              >
                {#if imageSource}
                  {#key imageSource}
                    <img
                      class="artwork__img"
                      use:lazyImg={{ src: imageSource, deferred: useObserver }}
                      alt={art.title || 'Obra'}
                      loading="lazy"
                      draggable="false"
                      on:load={(event) => event.currentTarget.classList.add('artwork__img--loaded')}
                      on:error={() => imageFailed(art, imageSource)}
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
    color: var(--txt);
    pointer-events: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    z-index: var(--artwork-strip-layer);
  }

  .artwork-strip--mobile {
    --artwork-strip-tab-width: var(--artwork-strip-tab-mobile-width);
    --artwork-strip-thumb-size: var(--artwork-strip-thumb-mobile-size);
    --artwork-strip-padding-x: var(--artwork-strip-padding-mobile-x);
  }

  .artwork-strip__header {
    all: unset;
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--artwork-strip-tab-gap);
    width: min(100%, var(--artwork-strip-tab-width));
    height: var(--artwork-tab-height);
    min-height: 0;
    overflow: hidden;
    cursor: pointer;
    pointer-events: auto;
    flex-shrink: 0;
    box-sizing: border-box;
    padding: 0 var(--artwork-strip-tab-padding);
    background: var(--artwork-strip-tab-bg);
    color: var(--artwork-strip-tab-txt);
    border: var(--artwork-strip-tab-border-width) solid var(--artwork-strip-tab-border);
    border-bottom: none;
    border-top-right-radius: var(--artwork-strip-tab-radius);
    font-size: var(--font-size-xs);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);

    &:focus-visible {
      outline: 2px solid var(--txt);
      outline-offset: -2px;
    }
  }

  .artwork-strip__chevron {
    display: block;
    width: var(--font-size-xs);
    height: var(--font-size-md);
    flex-shrink: 0;
    background: currentColor;
    mask: var(--artwork-chevron) center / contain no-repeat;
    -webkit-mask: var(--artwork-chevron) center / contain no-repeat;
  }

  .artwork-strip__chevron--collapsed {
    transform: rotate(180deg);
  }

  .artwork-strip__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artwork-strip__resize {
    position: absolute;
    left: 0;
    z-index: 1;
    width: 100%;
    height: var(--artwork-strip-handle-height);
    background: var(--artwork-strip-bg);
    cursor: ns-resize;
    touch-action: none;
    user-select: none;
    pointer-events: auto;

    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      width: var(--artwork-strip-grip-width);
      height: var(--artwork-strip-grip-height);
      background: linear-gradient(to bottom, var(--artwork-strip-tab-txt) 33.333%, transparent 33.333% 66.667%, var(--artwork-strip-tab-txt) 66.667%);
      opacity: var(--artwork-strip-grip-opacity);
    }

    &:focus-visible {
      outline: 2px solid var(--txt);
      outline-offset: -2px;
    }
  }

  /* ── Wrapper do body animado ──────────────────────────────────────── */
  .artwork-strip__body {
    flex: 1 1 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-top: var(--artwork-strip-handle-height);
    pointer-events: auto;
    background: var(--artwork-strip-bg);
    backdrop-filter: blur(var(--artwork-strip-blur));
    -webkit-backdrop-filter: blur(var(--artwork-strip-blur));
  }

  /* ── Container scrollável da grid ──────────────────────────────────── */
  .artwork-strip__scroll {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--artwork-strip-thumb-size)), 1fr));
    gap: var(--artwork-strip-gap-y) var(--artwork-strip-gap-x);
    padding: 0 var(--artwork-strip-padding-x) var(--artwork-strip-padding-y);
    margin: 0;
    list-style: none;
  }

  .artwork {
    aspect-ratio: 1 / 1;
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
