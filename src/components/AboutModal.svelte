<script>
  import { onMount, onDestroy } from 'svelte';
  import { ABOUT_MODAL_LABELS, APP_VERSION } from '../lib/constants.js';

  /** Locale ativo: 'pt' | 'en'. */
  export let locale = 'pt';
  export let onClose = null;

  let modalEl;
  let triggerEl;  // guardado para devolver foco ao fechar

  function close() {
    onClose?.();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    // Armadilha de foco: Tab e Shift+Tab circulam dentro do modal
    if (e.key === 'Tab') {
      if (!modalEl) return;
      const focusable = [...modalEl.querySelectorAll(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )].filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  onMount(() => {
    // Salva o elemento que abriu o modal para devolver o foco
    triggerEl = document.activeElement;
    // Foca o primeiro elemento focável dentro do modal (botão ×)
    const first = modalEl?.querySelector('button, a[href]');
    if (first) first.focus();

    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
    // Devolve foco ao elemento que abriu o modal
    if (triggerEl && typeof triggerEl.focus === 'function') {
      triggerEl.focus();
    }
  });
</script>

<!-- Backdrop -->
<div
  class="about-backdrop"
  on:click={close}
  role="presentation"
  aria-hidden="true"
></div>

<!-- Painel do modal -->
<div
  class="about-modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="about-modal-title"
  bind:this={modalEl}
>
  <!-- Botão fechar -->
  <button
    type="button"
    class="about-modal__close"
    on:click={close}
    aria-label={ABOUT_MODAL_LABELS[locale].closeButton}
  >×</button>

  <!-- Título -->
  <h2 class="about-modal__title" id="about-modal-title">{ABOUT_MODAL_LABELS[locale].title}</h2>

  <!-- Descrição -->
  <p class="about-modal__body">
    {@html ABOUT_MODAL_LABELS[locale].description}
  </p>

  <!-- Links -->
  <p class="about-modal__body">
    {ABOUT_MODAL_LABELS[locale].learnMore}{' '}
    <a
      class="about-modal__link"
      href="https://www.acervosdigitais.fau.usp.br/"
      target="_blank"
      rel="noopener noreferrer"
    >{ABOUT_MODAL_LABELS[locale].siteLabel}</a>
    {' '}{ABOUT_MODAL_LABELS[locale].andAccessCode}{' '}
    <a
      class="about-modal__link"
      href="https://github.com/acervos-digitais/"
      target="_blank"
      rel="noopener noreferrer"
    >{ABOUT_MODAL_LABELS[locale].githubLabel}</a>.
  </p>

  <!-- Créditos -->
  <dl class="about-modal__credits">
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].creditsRealization}</dt>
      <dd>
        Projeto Temático FAPESP – <a
          class="about-modal__link"
          href="https://www.acervosdigitais.fau.usp.br/"
          target="_blank"
          rel="noopener noreferrer"
        >Acervos Digitais e Pesquisa</a>
      </dd>
    </div>
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].creditsCreativeCode}</dt>
      <dd>Carlos Tremonte de Lemos</dd>
    </div>
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].creditsDesign}</dt>
      <dd>Luisa Rodrigues e Bruna Keese</dd>
    </div>
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].creditsData}</dt>
      <dd>Gilberto Paschoal e Giselle Beiguelman</dd>
    </div>
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].creditsCoordination}</dt>
      <dd>Giselle Beiguelman</dd>
    </div>
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].creditsExecutiveCoordination}</dt>
      <dd>Gilberto Paschoal</dd>
    </div>
  </dl>
  <dl class="about-modal__credits">
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].contact}</dt>
      <dd>
        <a
          class="about-modal__link"
          href="mailto:acervosdigitais@usp.br"
          target="_blank"
          rel="noopener noreferrer"
        >acervosdigitais@usp.br</a>
      </dd>
    </div>
    <div class="about-modal__credits-row">
      <dt>{ABOUT_MODAL_LABELS[locale].versionLabel}</dt>
      <dd>{APP_VERSION}</dd>
    </div>
  </dl>

  <!-- Logo FAPESP -->
  <div class="about-modal__logo-group">
    <img
      class="about-modal__logo"
      src="{import.meta.env.BASE_URL}fapesp-logo.svg"
      alt="FAPESP"
      loading="lazy"
    />
    <img
      class="about-modal__logo"
      src="{import.meta.env.BASE_URL}logo-fau-horizontal-full.svg"
      alt="FAU-USP"
      loading="lazy"
    />
  </div>
</div>

<style lang="scss">
  .about-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100;
  }

  .about-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 101;
    width: min(560px, calc(100vw - 32px));
    box-sizing: border-box;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    background: var(--color-black);
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 0 60px rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-wrap: anywhere;

    @media (max-width: 760px) {
      padding: calc(var(--close-target-size) + 24px) 20px 24px;
      border-radius: 12px;
    }
  }

  .about-modal__close {
    position: absolute;
    top: 16px;
    right: 20px;
    background: none;
    border: none;
    color: var(--neutral-10);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--close-target-size);
    height: var(--close-target-size);
    box-sizing: border-box;
    font-size: var(--close-symbol-size);
    line-height: 1;
    cursor: pointer;
    padding: 0;
    border-radius: 4px;
    transition: color 0.12s;

    &:hover {
      color: var(--neutral-10);
    }
    &:focus-visible { outline: 2px solid currentColor; }
  }

  .about-modal__title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--txt);
    margin: 0;
    padding-right: var(--close-target-size);
  }

  .about-modal__body {
    font-size: var(--about-body-size);
    line-height: 1.4;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--neutral-10);
    margin: 0;
  }

  .about-modal__link {
    color: var(--neutral-10);
    text-underline-offset: 3px;

    &:hover {
      color: var(--neutral-30);
    }
  }

  /* ─── Créditos ─────────────────────────────────────────────── */
  .about-modal__credits {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
    border-top: 1px solid var(--neutral-60);
    padding-top: 16px;
    font-size: var(--about-meta-size);
    line-height: 1.4;
  }

  .about-modal__credits-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 12px;
    align-items: baseline;
  }

  dt {
    font-size: inherit;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--neutral-10);
    white-space: normal;
  }

  dd {
    font-size: inherit;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--neutral-10);
    margin: 0;
  }

  /* ─── Logos FAPESP e FAU-USP ──────────────────────────────────────────── */
  .about-modal__logo-group {
    padding-top: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .about-modal__logo {
    color: var(--color-white);
    height: 32px;
    width: auto;
    opacity: 0.9;
    /* Oculta o broken-image indicator se o arquivo não existir */
    &:not([src]), &[src=''] {
      display: none;
    }
  }
</style>
