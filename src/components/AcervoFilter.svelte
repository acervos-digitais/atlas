<script>
  import { FILTER_LABELS, BUTTON_LABELS } from '../lib/constants.js';
  import { formatAcervoLabel } from '../lib/dataUtils.js';
  import ToggleGroup from './ToggleGroup.svelte';

  export let locale = 'pt';
  export let acervos = [];
  export let activeAcervos = new Set();
  export let available = null;
  export let onChange = null;

  $: items = acervos.map(a => ({ value: a, label: formatAcervoLabel(a) }));

  /** Seleciona todos os acervos. */
  function selectAll() {
    onChange?.(new Set(acervos));
  }

  /** Limpa a seleção de acervos. */
  function selectNone() {
    onChange?.(new Set());
  }
</script>

<div class="acervo-filter">
  <div class="acervo-filter__header">
    <span class="acervo-filter__title">{FILTER_LABELS[locale].acervo}</span>
  </div>

  <ToggleGroup
    {items}
    active={activeAcervos}
    {available}
    layout="wrap"
    onChange={onChange}
  />

  <div class="acervo-filter__shortcuts">
    <button class="shortcut" on:click={selectAll}>{BUTTON_LABELS[locale].selectAll}</button>
    <span class="shortcut-sep">/</span>
    <button class="shortcut" on:click={selectNone}>{BUTTON_LABELS[locale].clearSelection}</button>
  </div>
</div>

<style lang="scss">
  .acervo-filter {
    --pill-bg: var(--acervo-pill-bg);
    --pill-bgh: var(--acervo-pill-hover);
    --pill-txt: var(--acervo-pill-txt);
    display: flex;
    flex-direction: column;

    :global(.toggle-group) {
      padding: 0.75rem 1rem;
    }
  }

  .acervo-filter__header {
    padding: 1rem 1rem 0.5rem;
    flex-shrink: 0;
  }

  .acervo-filter__title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--txt-l);
  }

  .acervo-filter__shortcuts {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 0.25rem 1rem 0.75rem;
  }

  .shortcut {
    all: unset;
    font-size: var(--font-size-md);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--txt-l);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: var(--txt);
    }
  }

  .shortcut-sep {
    font-size: var(--font-size-2xs);
    color: var(--bg-hl);
  }


</style>
