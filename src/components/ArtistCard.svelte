<script>
  /**
   * Card persistente do artista. Substitui o tooltip efêmero.
   *
   * Aberto enquanto `artist` (bubble clicada) não for nulo. O fechamento é
   * controlado por `App.svelte` via evento `close`. Enquanto aberto, o mapa
   * é bloqueado (responsabilidade de `App.svelte`).
   */
  import { CONFIDENCE_LABEL, UNDATED_YEAR, ARTIST_CARD_WIDTH, ARTIST_CARD_LABELS, confidenceBadgeColor } from '../lib/constants.js';
  import { formatAcervoLabel } from '../lib/dataUtils.js';

  /** Locale ativo: 'pt' | 'en'. */
  export let locale = 'pt';
  /** Bubble clicada — usada apenas para obter o nome do criador. */
  export let artist = null;
  /** Todas as bubbles do dataset (já carregadas, sem filtros aplicados). */
  export let allBubbles = [];
  /** Map<creator, obras[]> de `loadData()`. */
  export let artworksByCreator = new Map();
  export let onClose = null;

  function close() {
    onClose?.();
  }

  // Bubbles do mesmo criador.
  $: creatorName = artist?.creator ?? '';
  $: creatorBubbles = creatorName
    ? allBubbles.filter(b => b.creator === creatorName)
    : [];
  $: birth = creatorBubbles.find(b => b.type === 'birth') ?? null;
  $: death = creatorBubbles.find(b => b.type === 'death') ?? null;
  $: educations = creatorBubbles.filter(b => b.type === 'education');

  // Deduplicação de educações: remove duplicatas por schoolName + lat + lon.
  // Quando o mesmo criador aparece múltiplas vezes no CSV com educações
  // sobrepostas, cada cópia cria bubbles identicamente localizadas.
  // Mantém a primeira ocorrência (preferindo maior confiança em caso de empate).
  $: uniqueEducations = (() => {
    const seen = new Set();
    const deduped = [];
    for (const e of educations) {
      const key = `${e.schoolName || e.place}|${e.lat}|${e.lon}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(e);
      } else {
        // Se já vimos este ponto, compara confiança: prefere a entrada com maior confiança
        const existingIdx = deduped.findIndex(de => `${de.schoolName || de.place}|${de.lat}|${de.lon}` === key);
        if (existingIdx >= 0) {
          const confOrder = { 'alta': 3, 'médio': 2, 'baixa': 1, null: 0 };
          const existingConf = confOrder[deduped[existingIdx].confidence] ?? 0;
          const newConf = confOrder[e.confidence] ?? 0;
          if (newConf > existingConf) {
            deduped[existingIdx] = e; // Substitui por entrada com maior confiança
          }
        }
      }
    }
    return deduped;
  })();

  // ID da primeira seção que possui dado de confiança — para exibir o label
  // "Precisão da Informação". Mostra na primeira seção com confiança em ordem:
  // nascimento → primeira educação → morte.
  $: precisionLabelFor = birth?.confidence
    ? 'birth'
    : (uniqueEducations.find(e => e.confidence)?.id ?? (death?.confidence ? 'death' : null));

  // Obras agrupadas por acervo (museum).
  $: artworks = (creatorName && artworksByCreator.get(creatorName)) || [];
  $: artworksByMuseum = artworks.reduce((acc, a) => {
    const key = a.museum || '';
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(a);
    return acc;
  }, new Map());

  function confidenceLabel(value) {
    if (!value) return '';
    return CONFIDENCE_LABEL[locale]?.[value] ?? '';
  }
</script>

{#if artist}
  <div class="artist-card" role="dialog" aria-label="Detalhes do artista">
    <header class="artist-card__header">
      <h2 class="artist-card__name">{creatorName}</h2>
      <button class="artist-card__close" on:click={close} aria-label={ARTIST_CARD_LABELS[locale].close}>×</button>
    </header>

    <div class="artist-card__body">

      <!-- Obras e Acervos (primeiro) -->
      {#if artworks.length > 0}
        <section class="section">
          <h3 class="section__label">{ARTIST_CARD_LABELS[locale].worksAndCollections}</h3>
          <ul class="artwork-list">
            {#each [...artworksByMuseum.entries()] as [museum, works]}
              <li class="artwork">
                {#each works as a, i}
                  {#if a.url}<a href={a.url} target="_blank" rel="noopener noreferrer">{a.title || ARTIST_CARD_LABELS[locale].untitled}{#if a.year && a.year !== UNDATED_YEAR} ({a.year}){/if}</a>{:else}<span class="artwork__title">{a.title || ARTIST_CARD_LABELS[locale].untitled}{#if a.year && a.year !== UNDATED_YEAR} ({a.year}){/if}</span>{/if}{#if i < works.length - 1}{', '}{/if}
                {/each}
                {#if museum}<span class="artwork__museum"> — {formatAcervoLabel(museum)}</span>{/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <!-- Nascimento -->
      {#if birth}
        <section class="section">
          <div class="section__row">
            <div class="section__left">
              <span class="section__dot" style="color: var(--birth-color)">●</span>
              <div>
                <h3 class="section__label">{ARTIST_CARD_LABELS[locale].birth}</h3>
                <p class="section__text">{birth.place || '—'}</p>
              </div>
            </div>
            {#if birth.confidence}
              <div class="section__right">
                {#if precisionLabelFor === 'birth'}
                  <span class="section__precision-label">{ARTIST_CARD_LABELS[locale].precisionLabel}</span>
                {/if}
                <span class="badge" style="color: {confidenceBadgeColor(birth.confidence)}; border-color: {confidenceBadgeColor(birth.confidence)}">{confidenceLabel(birth.confidence)}</span>
              </div>
            {/if}
          </div>
        </section>
      {/if}

      <!-- Local de Estudo -->
      {#if uniqueEducations.length > 0}
        {#each uniqueEducations as e (e.id)}
          <section class="section">
            <div class="section__row">
              <div class="section__left">
                <span class="section__dot" style="color: var(--edu-color)">●</span>
                <div>
                  <h3 class="section__label">{ARTIST_CARD_LABELS[locale].studyLocation}</h3>
                  <p class="section__text">{e.schoolName || e.place || '—'}</p>
                </div>
              </div>
              {#if e.confidence}
                <div class="section__right">
                  {#if precisionLabelFor === e.id}
                    <span class="section__precision-label">{ARTIST_CARD_LABELS[locale].precisionLabel}</span>
                  {/if}
                  <span class="badge" style="color: {confidenceBadgeColor(e.confidence)}; border-color: {confidenceBadgeColor(e.confidence)}">{confidenceLabel(e.confidence)}</span>
                </div>
              {/if}
            </div>
          </section>
        {/each}
      {/if}

      <!-- Morte -->
      {#if death}
        <section class="section">
          <div class="section__row">
            <div class="section__left">
              <span class="section__dot" style="color: var(--death-color)">●</span>
              <div>
                <h3 class="section__label">{ARTIST_CARD_LABELS[locale].death}</h3>
                <p class="section__text">{death.place || '—'}</p>
              </div>
            </div>
            {#if death.confidence}
              <div class="section__right">
                {#if precisionLabelFor === 'death'}
                  <span class="section__precision-label">{ARTIST_CARD_LABELS[locale].precisionLabel}</span>
                {/if}
                <span class="badge" style="color: {confidenceBadgeColor(death.confidence)}; border-color: {confidenceBadgeColor(death.confidence)}">{confidenceLabel(death.confidence)}</span>
              </div>
            {/if}
          </div>
        </section>
      {/if}

      <p class="confidence-disclaimer">{ARTIST_CARD_LABELS[locale].confidenceDisclaimer}</p>
    </div>
  </div>
{/if}

<style lang="scss">
  .artist-card {
    position: absolute;
    bottom: calc(var(--artwork-strip-inset, 0px) + 16px);
    right: 16px;
    z-index: 20;
    width: 360px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - var(--menu-height) - var(--artwork-strip-inset, 0px) - 32px);
    display: flex;
    flex-direction: column;
    background: var(--bg-c);
    color: var(--txt);
    border: 1px solid var(--bg-hl);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px); 
    border-radius: 16px;
    overflow: hidden;
  }

  .artist-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 14px 14px 10px;
    flex-shrink: 0;
  }

  .artist-card__name {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);
    line-height: var(--line-height-tight);
  }

  .artist-card__close {
    all: unset;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--close-target-size);
    height: var(--close-target-size);
    color: var(--txt-hl);
    font-size: var(--close-symbol-size);
    line-height: var(--line-height-none);
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 1px;

    &:hover { color: var(--txt); }
    &:focus-visible { outline: 2px solid currentColor; }
  }

  .artist-card__body {
    padding: 0 14px 14px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-hl) transparent;
  }

  /* ─── Seções ──────────────────────────────────────────────────────── */

  .section {
    padding: 10px 0;
  }

  .section__label {
    margin: 0 0 5px;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--txt-hl);
  }

  /* linha com dot + info à esquerda, badge à direita */
  .section__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .section__left {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
  }

  .section__dot {
    flex-shrink: 0;
    font-size: var(--font-size-xs);
    margin-top: 3px;
    line-height: var(--line-height-none);
  }

  .section__text {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-regular);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--txt);
    line-height: var(--line-height-normal);
  }

  .section__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .section__precision-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--confidence-alta);
    white-space: nowrap;
    line-height: var(--line-height-normal);
    text-align: right;
  }

  /* ─── Badge de precisão (pílula com cor por nível) ────────────────────────── */

  .badge {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    padding: 3px 12px;
    height: 18.7px;
    border-radius: 68px;
    border: 1px solid;
    white-space: nowrap;
    line-height: var(--line-height-normal);
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
  }

  /* ─── Obras ─────────────────────────────────────────────────────────── */

  .artwork-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .artwork {
    margin-bottom: 5px;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-regular);
    letter-spacing: var(--letter-spacing-tight);
    line-height: var(--line-height-normal);
    color: var(--txt-l);

    a {
      color: var(--txt-l);
      text-decoration: underline;
      text-underline-offset: 2px;

      &:hover { color: var(--txt); }
    }
  }

  .artwork__title {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .artwork__museum {
    color: var(--txt-hl);
  }

  /* ─── Disclaimer de precisão ─────────────────────────────────────────────── */

  .confidence-disclaimer {
    margin: 8px 0 0;
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-medium);
    letter-spacing: var(--letter-spacing-tight);
    text-transform: uppercase;
    color: var(--disclaimer);
    line-height: var(--line-height-normal);
  }
</style>
