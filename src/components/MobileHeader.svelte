<script>
  /**
   * Header simplificado para mobile (< 760px) — referência Figma node 505-4840.
   * Contém apenas: marca (logo), título, botão "Sobre" e seletor de idioma PT|EN.
   * Os controles de filtro NÃO ficam aqui no mobile; vão para o FilterAccordion.
   */
  import { APP_TITLE, BUTTON_LABELS } from '../lib/constants.js';

  export let locale = 'pt';
  export let onAboutOpen = null;

  /** Navega para URL com ou sem ?lang=en */
  function handleLanguageChange(targetLocale) {
    const url = new URL(window.location);
    if (targetLocale === 'en') {
      url.searchParams.set('lang', 'en');
    } else {
      url.searchParams.delete('lang');
    }
    window.location.href = url.toString();
  }
</script>

<header class="mobile-header">
  <img
    class="mobile-header__logo"
    src="{import.meta.env.BASE_URL}logo_acervos-digitais_pt.svg"
    alt={APP_TITLE[locale]}
  />
  <div class="mobile-header__brand-text">
    <span class="mobile-header__title">{APP_TITLE[locale]}</span>
  </div>
  <div class="mobile-header__actions">
    <button class="mobile-header__action-btn" on:click={() => onAboutOpen?.()}>{BUTTON_LABELS[locale].about}</button>
    <div class="mobile-header__lang">
      <button 
        class="mobile-header__lang-btn"
        class:mobile-header__lang-btn--active={locale === 'pt'}
        on:click={() => handleLanguageChange('pt')}
      >
        PT
      </button>
      <button 
        class="mobile-header__lang-btn"
        class:mobile-header__lang-btn--active={locale === 'en'}
        on:click={() => handleLanguageChange('en')}
      >
        EN
      </button>
    </div>
  </div>
</header>

<style lang="scss">
  .mobile-header {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 90px;
    box-sizing: border-box;
    padding: 12px 20px;
    background: var(--chrome-bg);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    flex-shrink: 0;
  }

  .mobile-header__logo {
    height: var(--mobile-logo-height);
    width: auto;
    display: block;
    flex-shrink: 0;
  }

  .mobile-header__brand-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .mobile-header__title {
    font-size: var(--mobile-title-size);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-snug);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--chrome-txt);
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .mobile-header__actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .mobile-header__action-btn {
    all: unset;
    font-size: var(--mobile-action-size);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--chrome-txt-l);
    cursor: pointer;
    white-space: nowrap;

    &:hover { color: var(--chrome-txt); }
    &:focus-visible { outline: 2px solid currentColor; }
  }

  .mobile-header__lang {
    display: flex;
    gap: 6px;
  }

  .mobile-header__lang-btn {
    all: unset;
    font-size: var(--mobile-action-size);
    font-weight: var(--font-weight-medium);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--chrome-txt-l);
    cursor: pointer;

    &:hover { color: var(--chrome-txt); }
    &:focus-visible { outline: 2px solid currentColor; }
  }

  .mobile-header__lang-btn--active {
    color: var(--chrome-txt);
    font-weight: var(--font-weight-bold);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
