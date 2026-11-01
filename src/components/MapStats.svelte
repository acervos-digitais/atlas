<script>
  import { STATS_LABELS } from '../lib/constants.js';

  /** Locale ativo: 'pt' | 'en'. */
  export let locale = 'pt';

  /**
   * Overlay de contagens no mapa. Recebe quatro valores agregados; não calcula nada.
   */
  export let stats = { acervos: 0, artistas: 0, escolas: 0, obras: 0 };
</script>

<figure class="map-stats" aria-label="Resultados">
  <figcaption class="map-stats__title">{STATS_LABELS[locale].title}</figcaption>
  <p class="map-stats__line">{stats.acervos} {STATS_LABELS[locale].acervosSelected}</p>
  <p class="map-stats__line">{stats.artistas} {STATS_LABELS[locale].artistas}</p>
  <p class="map-stats__line">{stats.escolas} {STATS_LABELS[locale].escolas}</p>
  <p class="map-stats__line">{stats.obras} {STATS_LABELS[locale].obras}</p>
</figure>

<style lang="scss">
  .map-stats {
    position: absolute;
    top: 32px;
    left: 32px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: none;
    padding: 14px;
    background: var(--bg-c);
    border-radius: 16px;
    box-shadow: var(--results-shadow);
    backdrop-filter: blur(10px);
    overflow: hidden;
    font-family: var(--font-family-base);
    font-style: normal;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
    text-transform: uppercase;
    color: var(--txt-l);
  }

  .map-stats__title {
    margin: 0 0 4px 0;
    font-size: var(--font-size-xl);
    line-height: var(--line-height-snug);
    text-transform: uppercase;
  }

  /* Tema claro: inverte para texto escuro (contraste sobre fundo claro). */
  :global([data-theme="light"]) .map-stats {
    color: rgba(0, 0, 0, 0.64);
  }

  .map-stats__line {
    margin: 0;
  }

  @media (max-width: 768px) {
    .map-stats {
      top: 16px;
      left: 16px;
      font-size: var(--font-size-xs);
    }

    .map-stats__title {
      font-size: var(--font-size-lg);
    }
  }
</style>
