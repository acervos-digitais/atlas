<script>
  import { onMount } from 'svelte';
  import { profileStats } from '../lib/profileStats.js';
  import { LS_PROFILE_PANEL_KEY, FILTER_LABELS, PROFILE_PANEL_LABELS } from '../lib/constants.js';

  /** Locale ativo: 'pt' | 'en'. */
  export let locale = 'pt';

  /** Bubbles filtradas passadas pelo App.svelte (excluir acervos internamente). */
  export let bubbles = [];
  /** Faixa de layout: 'mobile' | 'tablet' | 'desktop'. */
  export let breakpoint = 'desktop';

  /** Espaçamento do topo da faixa de obras (em px), para ajustar a posição do painel. */
  export let artworkStripInset = 0;

  // ─── Estado colapsado — persiste em localStorage ───────────────────────────
  let collapsed = (() => {
    try {
      const saved = localStorage.getItem(LS_PROFILE_PANEL_KEY);
      if (saved !== null) return saved === 'true';
    } catch { /* silencioso */ }
    // Padrão: colapsado em mobile, aberto em tablet/desktop
    return breakpoint === 'mobile';
  })();

  function toggleCollapsed() {
    collapsed = !collapsed;
    try { localStorage.setItem(LS_PROFILE_PANEL_KEY, String(collapsed)); } catch { /* silencioso */ }
  }

  // ─── Métricas derivadas reativamente ──────────────────────────────────────
  $: stats = profileStats(bubbles.filter(b => b.type !== 'acervo'), locale);
  $: empty = !stats.genderTop && !stats.formationTop && stats.birthByRegion.length === 0;

  // ─── Geometria do donut SVG ────────────────────────────────────────────────
  // Tamanhos responsivos: desktop 26px raio, mobile 20px raio
  $: isMobileView = breakpoint === 'mobile';
  $: DONUT_R = isMobileView ? 20 : 26;
  $: DONUT_SW = isMobileView ? 4 : 5;
  $: DONUT_SIZE = (DONUT_R + DONUT_SW) * 2 + 2;
  $: CIRCUMFERENCE = 2 * Math.PI * DONUT_R;

  function arcDash(pct) {
    const filled = (pct / 100) * CIRCUMFERENCE;
    return `${filled} ${CIRCUMFERENCE}`;
  }
</script>

<!-- Botão de colapso / cabeçalho do painel -->
<div class="profile-panel" class:profile-panel--collapsed={collapsed} style="--artwork-strip-inset: {artworkStripInset}px">
  <button
    type="button"
    class="profile-panel__header"
    on:click={toggleCollapsed}
    aria-expanded={!collapsed}
    aria-controls="profile-panel-content"
  >
    <span class="profile-panel__title">{PROFILE_PANEL_LABELS[locale].title}</span>
    <svg
      class="profile-panel__chevron"
      class:profile-panel__chevron--open={!collapsed}
      width="19"
      height="17"
      viewBox="0 0 19 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M3.75231 8.04069L9.91681 1.87619L8.04066 3.65173e-05L2.55584e-07 8.04069L8.04066 16.0814L9.91681 14.2052L3.75231 8.04069Z" fill="var(--neutral-50)"/>
      <path d="M12.1195 8.04069L18.284 1.87619L16.4078 3.65173e-05L8.36719 8.04069L16.4078 16.0814L18.284 14.2052L12.1195 8.04069Z" fill="var(--neutral-50)"/>
    </svg>
  </button>

  {#if !collapsed}
    <div class="profile-panel__content" id="profile-panel-content">
      {#if empty}
        <p class="profile-panel__empty">{PROFILE_PANEL_LABELS[locale].emptyMessage}</p>
      {:else}
        <!-- Donuts: gênero + local de formação predominante -->
        <div class="profile-panel__donuts">
          <!-- Donut: gênero -->
          <div class="profile-panel__donut-item">
            <svg
              width={DONUT_SIZE}
              height={DONUT_SIZE}
              viewBox="0 0 {DONUT_SIZE} {DONUT_SIZE}"
              aria-hidden="true"
            >
              <!-- Trilho cinza -->
              <circle
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={DONUT_R}
                fill="none"
                stroke="var(--neutral-70)"
                stroke-width={DONUT_SW}
              />
              <!-- Arco preenchido -->
              {#if stats.genderTop}
                {#if stats.genderTop.pct === 100}
                  <!-- A 100%, desenha círculo sólido completo -->
                  <circle
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_R}
                    fill="none"
                    stroke="var(--neutral-30)"
                    stroke-width={DONUT_SW}
                    stroke-linecap="round"
                  />
                {:else}
                  <!-- Parcial: arco proporcional -->
                  <circle
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_R}
                    fill="none"
                    stroke="var(--neutral-30)"
                    stroke-width={DONUT_SW}
                    stroke-linecap="round"
                    stroke-dasharray={arcDash(stats.genderTop.pct)}
                    transform="rotate(-90 {DONUT_SIZE / 2} {DONUT_SIZE / 2})"
                  />
                {/if}
              {/if}
              <!-- % centralizado -->
              <text
                x={DONUT_SIZE / 2}
                y={DONUT_SIZE / 2}
                text-anchor="middle"
                dominant-baseline="central"
                class="donut-pct"
                fill="var(--txt)"
              >{stats.genderTop?.pct ?? 0}%</text>
            </svg>
            <p class="profile-panel__donut-label">{FILTER_LABELS[locale].gender}</p>
            <p class="profile-panel__donut-value">{stats.genderTop?.label ?? '—'}</p>
          </div>

          <!-- Donut: local de formação -->
          <div class="profile-panel__donut-item">
            <svg
              width={DONUT_SIZE}
              height={DONUT_SIZE}
              viewBox="0 0 {DONUT_SIZE} {DONUT_SIZE}"
              aria-hidden="true"
            >
              <circle
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={DONUT_R}
                fill="none"
                stroke="var(--neutral-70)"
                stroke-width={DONUT_SW}
              />
              {#if stats.formationTop}
                {#if stats.formationTop.pct === 100}
                  <!-- A 100%, desenha círculo sólido completo -->
                  <circle
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_R}
                    fill="none"
                    stroke="var(--neutral-30)"
                    stroke-width={DONUT_SW}
                    stroke-linecap="round"
                  />
                {:else}
                  <!-- Parcial: arco proporcional -->
                  <circle
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_R}
                    fill="none"
                    stroke="var(--neutral-30)"
                    stroke-width={DONUT_SW}
                    stroke-linecap="round"
                    stroke-dasharray={arcDash(stats.formationTop.pct)}
                    transform="rotate(-90 {DONUT_SIZE / 2} {DONUT_SIZE / 2})"
                  />
                {/if}
              {/if}
              <text
                x={DONUT_SIZE / 2}
                y={DONUT_SIZE / 2}
                text-anchor="middle"
                dominant-baseline="central"
                class="donut-pct"
                fill="var(--txt)"
              >{stats.formationTop?.pct ?? 0}%</text>
            </svg>
            <p class="profile-panel__donut-label">{PROFILE_PANEL_LABELS[locale].formationLabel}</p>
            <p class="profile-panel__donut-value">{stats.formationTop?.label ?? '—'}</p>
          </div>
        </div>

        <!-- Barras: nascimento por região -->
        {#if stats.birthByRegion.length > 0}
          <section class="profile-panel__bars-section">
            <h3 class="profile-panel__bars-title profile-panel__bars-title--birth">{PROFILE_PANEL_LABELS[locale].birthLabel}</h3>
            {#each stats.birthByRegion as row}
              <div class="profile-panel__bar-item">
                <span class="profile-panel__bar-label">{row.label}</span>
                <div class="profile-panel__bar-row">
                  <div class="profile-panel__bar-track">
                    <div class="profile-panel__bar-fill" style="width: {row.pct}%"></div>
                  </div>
                  <span class="profile-panel__bar-pct">{row.pct}%</span>
                </div>
              </div>
            {/each}
          </section>
        {/if}

        <!-- Barras: formação por região -->
        {#if stats.formationByRegion.length > 0}
          <section class="profile-panel__bars-section">
            <h3 class="profile-panel__bars-title">{PROFILE_PANEL_LABELS[locale].formationLabel}</h3>
            {#each stats.formationByRegion as row}
              <div class="profile-panel__bar-item">
                <span class="profile-panel__bar-label">{row.label}</span>
                <div class="profile-panel__bar-row">
                  <div class="profile-panel__bar-track">
                    <div class="profile-panel__bar-fill" style="width: {row.pct}%"></div>
                  </div>
                  <span class="profile-panel__bar-pct">{row.pct}%</span>
                </div>
              </div>
            {/each}
          </section>
        {/if}
      {/if}

      <!-- Disclaimer sobre a fonte dos dados -->
      <p class="profile-panel__disclaimer">{PROFILE_PANEL_LABELS[locale].disclaimer}</p>
    </div>
  {/if}
</div>

<style lang="scss">
  .profile-panel {
    position: absolute;
    top: 0;
    right: var(--map-control-rail-width);
    width: 260px;
    background: var(--bg-c);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    overflow: hidden;
    z-index: 10;
    font-family: var(--font-family-base);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    pointer-events: auto;
    max-height: calc(100% - var(--artwork-strip-inset, 0px));
  }

  .profile-panel--collapsed {
    right: 0;
    border-bottom-left-radius: 14px;
    border-bottom: 1px solid var(--bg-hl);
    border-left: 1px solid var(--bg-hl);
    background: var(--bg-c);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .profile-panel__header {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 14.4px 18px 14.4px 13px;
    background: var(--bg-c);
    border: none;
    color: var(--txt);
    font-family: var(--font-family-base);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
    gap: 14.4px;

    &:hover {
      background: var(--bg);
    }
  }

  .profile-panel__title {
    font-family: var(--font-family-base);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--txt);
    letter-spacing: var(--letter-spacing-tight);
    margin: 0;
  }

  .profile-panel__chevron {
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }

  .profile-panel__chevron--open {
    transform: scaleX(-1);
  }

  .profile-panel__content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: calc(100vh - 148px - var(--artwork-strip-inset, 0px));
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-hl) transparent;
  }

  .profile-panel__empty {
    font-size: var(--font-size-xs);
    color: var(--txt-hl);
    text-align: center;
    padding: 10px 0;
  }

  /* ─── Donuts ──────────────────────────────────────────────────────────── */
  .profile-panel__donuts {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    align-items: flex-start;
  }

  .profile-panel__donut-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1;
  }

  :global(.donut-pct) {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    font-family: inherit;
    fill: var(--profile-donut-pct);
  }

  .profile-panel__donut-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-regular);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--txt-hl);
    margin: 0;
  }

  .profile-panel__donut-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--txt);
    margin: 0;
    text-align: center;
    max-width: 80px;
    word-break: break-word;
    hyphens: auto;
  }

  /* ─── Barras horizontais ──────────────────────────────────────────────── */
  .profile-panel__bars-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .profile-panel__bars-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--txt);
    padding-top: 44px;
  }

  .profile-panel__bars-title--birth {
    padding-top: var(--profile-first-section-padding);
  }

  .profile-panel__bar-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .profile-panel__bar-label {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--txt);
  }

  .profile-panel__bar-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .profile-panel__bar-track {
    flex: 1;
    height: 4px;
    background: var(--neutral-70);
    border-radius: 2px;
    overflow: hidden;
  }

  .profile-panel__bar-fill {
    height: 100%;
    background: var(--neutral-30);
    border-radius: 2px;
    transition: width 0.3s ease-out;
  }

  .profile-panel__bar-pct {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--profile-bar-pct);
    white-space: nowrap;
    min-width: 30px;
    text-align: right;
  }

  /* ─── Disclaimer ─────────────────────────────────────────────────────── */
  .profile-panel__disclaimer {
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-medium);
    font-family: var(--font-family-base);
    letter-spacing: var(--letter-spacing-tight);
    line-height: var(--line-height-normal);
    text-transform: uppercase;
    color: var(--neutral-40);
    margin: 0;
    padding-top: 12px;
    border-top: 1px solid var(--bg-hl);
  }

  /* ─── Responsividade: Tablet ──────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .profile-panel {
      width: calc(100% - var(--map-control-rail-width));
      max-width: 100%;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    .profile-panel--collapsed {
      width: 100%;
    }

    .profile-panel__header {
      padding: 12px 12.8px;
      gap: 12px;
      font-size: 12px;
    }

    .profile-panel__title {
      font-size: 12px;
    }

    .profile-panel__chevron {
      width: 15px;
      height: 15px;
    }

    .profile-panel__content {
      padding: 12px;
      gap: 12px;
      max-height: calc(100vh - 120px);
    }

    .profile-panel__donuts {
      gap: 8px;
    }

    .profile-panel__donut-item {
      gap: 3px;
    }

    :global(.donut-pct) {
      font-size: 14px;
    }

    .profile-panel__donut-label {
      font-size: 10px;
    }

    .profile-panel__donut-value {
      font-size: 12px;
      max-width: 70px;
    }

    .profile-panel__bars-section {
      gap: 5px;
    }

    .profile-panel__bars-title {
      font-size: 12px;
      padding-top: 12px;
    }

    .profile-panel__bars-title--birth {
      padding-top: 12px;
    }

    .profile-panel__bar-item {
      gap: 4px;
    }

    .profile-panel__bar-label {
      font-size: 11px;
    }

    .profile-panel__bar-row {
      gap: 5px;
    }

    .profile-panel__bar-pct {
      font-size: 12px;
      min-width: 25px;
    }

    .profile-panel__bar-track {
      height: 3px;
    }
  }

  /* ─── Responsividade: Mobile ──────────────────────────────────────────── */
  @media (max-width: 640px) {
    .profile-panel {
      display: none;
    }
  }
</style>
