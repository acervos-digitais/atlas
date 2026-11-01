<script>
  import { TYPE_COLOR, TYPE_COLOR_HOVER, TYPE_LABEL, SECTION_LABELS, AUTOCOMPLETE_PLACEHOLDERS } from '../lib/constants.js';
  import AutocompleteSelect from './AutocompleteSelect.svelte';

  /** Locale ativo: 'pt' | 'en'. */
  export let locale = 'pt';

  /** Conjunto de tipos de bubble visíveis. */
  export let activeTypes = new Set(['birth', 'education']);

  /** Localidade selecionada (país OU continente). String vazia = sem filtro. */
  export let selectedLocalidade = '';

  /** Opções para o autocomplete de localidade (países + continentes). */
  export let localidades = [];

  /**
   * Conjunto de localidades disponíveis no recorte atual (nomes traduzidos).
   * `null` → sem restrição. Facetamento N-1: localidades sem bubble somem.
   */
  export let availableLocalidades = null;

  /** Trajetórias visíveis ou ocultas. */
  export let showTrajectories = true;
  export let onTypesChange = null;
  export let onLocalityChange = null;
  export let onTrajectoriesChange = null;

  $: FILTERS = [
    { type: 'birth',     label: TYPE_LABEL[locale].birth,     color: TYPE_COLOR.birth,     colorHover: TYPE_COLOR_HOVER.birth },
    { type: 'education', label: TYPE_LABEL[locale].education, color: TYPE_COLOR.education, colorHover: TYPE_COLOR_HOVER.education },
    { type: 'death',     label: TYPE_LABEL[locale].death,     color: TYPE_COLOR.death,     colorHover: TYPE_COLOR_HOVER.death },
    { type: 'acervo',    label: TYPE_LABEL[locale].acervo,    color: TYPE_COLOR.acervo,    colorHover: TYPE_COLOR_HOVER.acervo },
  ];

  /** Alterna a presença de um tipo no conjunto e dispatcha `typeschange`. */
  function toggleType(type) {
    const next = new Set(activeTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onTypesChange?.(next);
  }

  /** Repassa seleção de localidade do AutocompleteSelect como string ou ''. */
  function handleLocalidadeSelect(value) {
    onLocalityChange?.(value ?? '');
  }

  /** Limpa o filtro de localidade no mesmo fluxo usado pelo autocomplete. */
  function clearLocalidade() {
    onLocalityChange?.('');
  }
</script>

<div class="header-bar" role="group" aria-label="Controles do mapa">

  <!-- Seção 1: Tipos de bubble -->
  <div class="header-section">
    <span class="header-section__label">{SECTION_LABELS[locale].trajectoryVisualization}</span>
    <div class="header-bar__pills">
      {#each FILTERS as filter}
        <button
          type="button"
          class="pill"
          class:pill--active={activeTypes.has(filter.type)}
          style="--accent: {filter.color}; --accent-hover: {filter.colorHover}"
          aria-pressed={activeTypes.has(filter.type)}
          on:click={() => toggleType(filter.type)}
        >
          <span class="pill__dot"></span>
          {filter.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Seção 2: Filtro de localidade -->
  <div class="header-section header-section--locality">
    <span class="header-section__label">{SECTION_LABELS[locale].filterLocality}</span>
    <div class="header-bar__locality">
      <AutocompleteSelect
        label=""
        placeholder={AUTOCOMPLETE_PLACEHOLDERS[locale].nacionalidade}
        options={localidades}
        value={selectedLocalidade || null}
        available={availableLocalidades}
        multiple={false}
        onSelect={handleLocalidadeSelect}
      />
      {#if selectedLocalidade}
        <button
          type="button"
          class="locality-clear"
          on:click={clearLocalidade}
          aria-label="Limpar filtro de localidade"
        >
          ✕
        </button>
      {/if}
    </div>
  </div>

  <!-- Seção 3: Toggle de trajetórias (radio style) -->
  <div class="header-section">
    <span class="header-section__label">{SECTION_LABELS[locale].trajectories}</span>
    <div class="trajectory-group" role="group" aria-label="Visibilidade das trajetórias">
      <button
        type="button"
        class="trajectory-option"
        class:trajectory-option--active={showTrajectories}
        aria-pressed={showTrajectories}
        on:click={() => !showTrajectories && onTrajectoriesChange?.(true)}
      >
        <span class="trajectory-dot"></span>
        {SECTION_LABELS[locale].trajectoryToggle.split(' / ')[0]}
      </button>
      <button
        type="button"
        class="trajectory-option"
        class:trajectory-option--active={!showTrajectories}
        aria-pressed={!showTrajectories}
        on:click={() => showTrajectories && onTrajectoriesChange?.(false)}
      >
        <span class="trajectory-dot"></span>
        {SECTION_LABELS[locale].trajectoryToggle.split(' / ')[1]}
      </button>
    </div>
  </div>

</div>

<style lang="scss">
  .header-bar {
    display: flex;
    align-items: flex-start;
    gap: 30px;
    flex: 1;
    flex-wrap: wrap;
    min-width: 0;
  }

  /* ── Seções com label + controle ──────────────────────────────────────── */
  .header-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  .header-section--locality {
    flex: 0 1 345px;
    min-width: var(--header-locality-min-width);
    flex-shrink: 1;
    width: 100%;
  }

  .header-section__label {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--chrome-txt);
    white-space: nowrap;
  }

  /* ── Pills de tipo (cores por TYPE_COLOR) ─────────────────────────────── */
  .header-bar__pills {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pill {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0.25rem 0.6rem;
    border-radius: 0.25rem;
    border: 1.5px solid var(--accent);
    font-family: var(--font-family-base);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--accent);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    box-sizing: border-box;

    &:not(.pill--active):hover {
      border-color: var(--accent-hover);
      color: var(--accent-hover);

      .pill__dot {
        background: var(--accent-hover);
      }
    }
  }

  .pill--active {
    background-color: var(--accent);
    border-color: var(--accent);
    color: var(--color-black);

    &:hover {
      background-color: var(--accent-hover);
      border-color: var(--accent-hover);
      color: var(--color-black);
    }

    .pill__dot {
      background: var(--color-black);
    }
  }

  .pill__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    transition: background 0.12s;
  }

  /* ── Localidade (AutocompleteSelect inline) ──────────────────────────── */
  .header-bar__locality {
    display: flex;
    align-items: center;
    gap: 6px;

    /* O AutocompleteSelect traz padding/border-top próprios pensados para
       a sidebar. Neutralizamos aqui para a barra horizontal. */
    :global(.autocomplete-section) {
      border-top: none;
      padding: 0;
      min-width: 0;
      flex: 1;
    }
    :global(.section-header) {
      display: none;
    }
    :global(.autocomplete__input) {
      font-size: var(--font-size-md);
      padding: 0.35rem 0.75rem;
    }
  }

  .locality-clear {
    all: unset;
    cursor: pointer;
    color: var(--chrome-txt-l);
    font-size: var(--font-size-md);
    line-height: 1;
    flex-shrink: 0;

    &:hover {
      color: var(--chrome-txt);
    }
  }

  /* ── Toggle de trajetórias (radio style) ─────────────────────────────── */
  .trajectory-group {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  .trajectory-option {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-family-base);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--chrome-txt-l);
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      color: var(--chrome-txt);
    }
  }

  .trajectory-option--active {
    color: var(--chrome-txt);
  }

  .trajectory-dot {
    position: relative;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid var(--txt-l);
    box-sizing: border-box;
    background: transparent;
    flex-shrink: 0;
    transition: border-color 0.12s, background 0.12s;

    &::after {
      content: '';
      position: absolute;
      inset: 2px;
      border-radius: 50%;
      background: transparent;
      transition: background 0.12s;
    }

    .trajectory-option--active & {
      border-color: currentColor;

      &::after {
        background: currentColor;
      }
    }
  }

  @media (min-width: 760px) and (max-width: 1024px) {
    .header-bar {
      gap: var(--header-compact-gap);
    }

    .header-section {
      max-width: 100%;
    }

    .header-section--locality {
      flex-basis: var(--header-locality-min-width);
    }

    .header-section__label {
      white-space: normal;
    }

    .header-bar__pills {
      flex-wrap: wrap;
    }
  }
</style>
