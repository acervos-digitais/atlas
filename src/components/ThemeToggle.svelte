<script>
  import { THEME_LABELS } from '../lib/constants.js';

  /** Locale ativo: 'pt' | 'en'. */
  export let locale = 'pt';

  /** Tema ativo: 'dark' | 'light' */
  export let theme = 'dark';

  export let onThemeChange = null;

  function select(value) {
    if (value !== theme && typeof onThemeChange === 'function') {
      onThemeChange(value);
    }
  }
</script>

<div class="theme-toggle" role="group" aria-label="Tema da interface">
  <!-- Tema escuro — lua -->
  <button
    type="button"
    class="map-btn"
    class:map-btn--active={theme === 'dark'}
    on:click={() => select('dark')}
    title={THEME_LABELS[locale].darkTheme}
    aria-label={THEME_LABELS[locale].darkTheme}
    aria-pressed={theme === 'dark'}
  >
    <svg width="24" height="24" viewBox="12 12 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M36.0817 48.7557C32.5607 48.7557 29.5679 47.5233 27.1033 45.0587C24.6386 42.594 23.4062 39.6012 23.4062 36.0802C23.4062 32.5593 24.6386 29.5665 27.1033 27.1018C29.5679 24.6371 32.5607 23.4048 36.0817 23.4048C36.4103 23.4048 36.7331 23.4165 37.05 23.44C37.3668 23.4635 37.6779 23.4987 37.983 23.5456C37.0206 24.2263 36.2519 25.1124 35.6768 26.2039C35.1017 27.2954 34.8142 28.475 34.8142 29.7425C34.8142 31.8551 35.5536 33.6508 37.0324 35.1296C38.5112 36.6084 40.3068 37.3478 42.4194 37.3478C43.7104 37.3478 44.8958 37.0602 45.9756 36.4851C47.0553 35.9101 47.9356 35.1413 48.6163 34.1789C48.6632 34.4841 48.6985 34.7951 48.7219 35.112C48.7454 35.4289 48.7571 35.7516 48.7571 36.0802C48.7571 39.6012 47.5248 42.594 45.0601 45.0587C42.5955 47.5233 39.6027 48.7557 36.0817 48.7557ZM36.0817 45.9389C38.1473 45.9389 40.0017 45.3697 41.6448 44.2312C43.2879 43.0928 44.485 41.6081 45.2362 39.7772C44.7667 39.8946 44.2973 39.9885 43.8278 40.0589C43.3583 40.1293 42.8889 40.1645 42.4194 40.1645C39.5322 40.1645 37.0734 39.1493 35.043 37.1189C33.0126 35.0885 31.9974 32.6297 31.9974 29.7425C31.9974 29.273 32.0326 28.8036 32.103 28.3341C32.1734 27.8647 32.2673 27.3952 32.3847 26.9257C30.5538 27.6769 29.0691 28.874 27.9307 30.5171C26.7922 32.1602 26.223 34.0146 26.223 36.0802C26.223 38.8031 27.1854 41.1269 29.1102 43.0517C31.035 44.9765 33.3588 45.9389 36.0817 45.9389Z" fill="currentColor"/>
    </svg>
  </button>

  <!-- Tema claro — sol -->
  <button
    type="button"
    class="map-btn"
    class:map-btn--active={theme === 'light'}
    on:click={() => select('light')}
    title={THEME_LABELS[locale].lightTheme}
    aria-label={THEME_LABELS[locale].lightTheme}
    aria-pressed={theme === 'light'}
  >
    <svg width="24" height="24" viewBox="10 10 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M36.0832 40.0831C37.1951 40.0831 38.1402 39.6939 38.9185 38.9156C39.6969 38.1373 40.086 37.1922 40.086 36.0803C40.086 34.9684 39.6969 34.0233 38.9185 33.245C38.1402 32.4666 37.1951 32.0775 36.0832 32.0775C34.9713 32.0775 34.0262 32.4666 33.2479 33.245C32.4696 34.0233 32.0804 34.9684 32.0804 36.0803C32.0804 37.1922 32.4696 38.1373 33.2479 38.9156C34.0262 39.6939 34.9713 40.0831 36.0832 40.0831ZM36.0832 42.7516C34.2375 42.7516 32.6641 42.1012 31.3632 40.8003C30.0623 39.4993 29.4119 37.926 29.4119 36.0803C29.4119 34.2345 30.0623 32.6612 31.3632 31.3603C32.6641 30.0594 34.2375 29.4089 36.0832 29.4089C37.9289 29.4089 39.5023 30.0594 40.8032 31.3603C42.1041 32.6612 42.7546 34.2345 42.7546 36.0803C42.7546 37.926 42.1041 39.4993 40.8032 40.8003C39.5023 42.1012 37.9289 42.7516 36.0832 42.7516ZM26.7433 37.4145H21.4062V34.746H26.7433V37.4145ZM50.7602 37.4145H45.4231V34.746H50.7602V37.4145ZM34.7489 26.7404V21.4033H37.4175V26.7404H34.7489ZM34.7489 50.7572V45.4202H37.4175V50.7572H34.7489ZM28.6113 30.4096L25.2423 27.174L27.1436 25.206L30.3459 28.5417L28.6113 30.4096ZM45.0228 46.9546L41.7872 43.5855L43.5551 41.7509L46.9241 44.9865L45.0228 46.9546ZM41.7538 28.6084L44.9895 25.2393L46.9575 27.1407L43.6218 30.3429L41.7538 28.6084ZM25.2089 45.0199L28.5779 41.7843L30.4126 43.5522L27.177 46.9212L25.2089 45.0199Z" fill="currentColor"/>
    </svg>
  </button>
</div>

<style lang="scss">
  .theme-toggle {
    display: flex;
    flex-direction: column;
    gap: var(--map-control-gap);
    pointer-events: none;
  }

  .map-btn {
    width: var(--map-control-size);
    height: var(--map-control-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    border: 2px solid var(--map-control-idle);
    border-radius: 5.28px;
    color: var(--map-control-idle);
    cursor: pointer;
    pointer-events: auto;
    transition: color 0.16s ease, border-color 0.16s ease, background-color 0.16s ease, transform 0.16s ease;
    backdrop-filter: blur(3.52px);
    box-shadow: none;

    svg {
      width: 44px;
      height: 44px;
      display: block;
      flex-shrink: 0;
    }

    &:hover {
      border-color: var(--map-control-hover);
      color: var(--map-control-hover);
      transform: translateY(-1px);
    }

    &:focus-visible {
      outline: 2px solid var(--map-control-hover);
      outline-offset: 2px;
    }
  }

  .map-btn--active {
    background: var(--neutral-10);
    border-color: var(--neutral-10);
    color: var(--color-black);
    cursor: default;

    &:hover {
      background: var(--neutral-30);
      border-color: var(--neutral-30);
      color: var(--color-black);
      transform: none;
    }
  }
</style>
