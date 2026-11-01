<script>
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import {
    ACCORDION_ANIMATION_DURATION,
  } from '../lib/constants.js';

  /**
   * Níveis do accordion (ordem + rótulos). O conteúdo de cada nível é provido
   * via slot nomeado igual ao `id` do item.
   *
   * Layout mobile (< 760px) — referência Figma node 505-7120 "painel expansível".
   * Estrutura de 2 níveis:
   *   - 'level1' → "Acervos e Artistas" (conteúdo do Sidebar)
   *   - 'level2' → "Visualizações e Filtros" (controles do Header)
   *
   * @type {Array<{ id: string, label: string }>}
   */
  export let items = [];

  /**
   * Id do nível atualmente expandido, ou `null` quando todos estão colapsados.
   * Bindable: o pai (App.svelte) persiste em localStorage durante a sessão.
   */
  export let expandedId = null;
  export let onToggle = null;

  /** Alterna o nível: abre se fechado, fecha se já aberto. Só um aberto por vez. */
  function toggle(id) {
    expandedId = expandedId === id ? null : id;
    onToggle?.(expandedId);
  }
</script>

<div class="filter-accordion" role="presentation">
  {#each items as item (item.id)}
    <section
      class="accordion-section"
      class:accordion-section--open={expandedId === item.id}
    >
      <button
        type="button"
        class="accordion-header"
        aria-expanded={expandedId === item.id}
        on:click={() => toggle(item.id)}
      >
        <span class="accordion-header__label">{item.label}</span>
        <span class="accordion-header__toggle" aria-hidden="true">
          {#if expandedId === item.id}
            <span class="icon-minus"></span>
          {:else}
            <span class="icon-plus"></span>
          {/if}
        </span>
      </button>

      {#if expandedId === item.id}
        <div
          class="accordion-panel"
          transition:slide={{ duration: ACCORDION_ANIMATION_DURATION, easing: cubicOut }}
        >
          {#if item.id === 'level1'}
            <slot name="level1" />
          {:else if item.id === 'level2'}
            <slot name="level2" />
          {/if}
        </div>
      {/if}
    </section>
  {/each}
</div>

<style lang="scss">
  .filter-accordion {
    display: flex;
    flex-direction: column;
    width: 100%;
    background: var(--bg);
  }

  .accordion-section {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--bg-hl);
    /* Quando aberto, ocupa o espaço disponível e permite scroll interno. */
    &.accordion-section--open {
      flex: 1;
      min-height: 0;
    }
  }

  /* ─── Cabeçalho do nível (ACCORDION_ITEM_HEIGHT: 52px) ─────────────────── */
  .accordion-header {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: var(--mobile-menu-min-height);
    flex-shrink: 0;
    padding: 12px 20px;
    cursor: pointer;
    background: var(--bg);
    transition: background 0.12s;

    &:hover {
      background: var(--bg-l);
    }
    &:focus-visible { outline: 2px solid var(--txt); outline-offset: -2px; }
  }

  .accordion-header__label {
    font-family: var(--font-family-base);
    font-size: var(--mobile-menu-title-size);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--txt);
    white-space: normal;
    overflow-wrap: anywhere;
  }

  /* ─── Botão circular de toggle (+ / −) ────────────────────────────────── */
  .accordion-header__toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border: 1px solid var(--txt-l);
    border-radius: 50%;
    color: var(--txt-l);
    position: relative;
  }

  .accordion-header:hover .accordion-header__toggle {
    border-color: var(--txt);
    color: var(--txt);
  }

  /* Ícones + / − desenhados via pseudo-elementos para precisão visual */
  .icon-plus,
  .icon-minus {
    position: relative;
    width: 10px;
    height: 10px;
    display: block;
  }

  .icon-plus::before,
  .icon-plus::after,
  .icon-minus::before {
    content: '';
    position: absolute;
    background: currentColor;
  }

  .icon-plus::before,
  .icon-minus::before {
    top: 50%;
    left: 0;
    width: 100%;
    height: 1.5px;
    transform: translateY(-50%);
  }

  .icon-plus::after {
    left: 50%;
    top: 0;
    height: 100%;
    width: 1.5px;
    transform: translateX(-50%);
  }

  /* ─── Painel expandido ─────────────────────────────────────────────────── */
  .accordion-panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-hl) transparent;
  }
</style>
