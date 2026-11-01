<script>
  export let onZoomIn = null;
  export let onZoomOut = null;
</script>

<div class="zoom-buttons" role="group" aria-label="Controles de zoom">
  <button
    type="button"
    class="zoom-btn"
    on:click={() => onZoomIn?.()}
    title="Aproximar"
    aria-label="Aproximar"
  >
    <!-- Ícone + (cruz) -->
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none">
      <path d="M10.7958 14.1203H0.816406V10.7939H10.7958V0.814453H14.1223V10.7939H24.1017V14.1203H14.1223V24.0998H10.7958V14.1203Z" fill="currentColor" stroke="currentColor" stroke-width="1.62914"/>
    </svg>
  </button>

  <button
    type="button"
    class="zoom-btn"
    on:click={() => onZoomOut?.()}
    title="Afastar"
    aria-label="Afastar"
  >
    <!-- Ícone − (traço horizontal) -->
    <svg width="19" height="5" viewBox="0 0 19 5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="19" height="4.555665" fill="currentColor"/>
    </svg>
  </button>
</div>

<style lang="scss">
  .zoom-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--map-control-gap);
    pointer-events: none; /* container passthrough — apenas botões capturam */
  }

  .zoom-btn {
    width: var(--map-control-size);
    height: var(--map-control-size);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-white);
    border: none;
    border-radius: 5.28px;
    color: var(--color-black);
    cursor: pointer;
    pointer-events: auto;
    backdrop-filter: blur(3.52px);
    -webkit-backdrop-filter: blur(3.52px);
    transition: background 0.12s;

    &:hover {
      background: var(--neutral-30); /* #BBBBBB */
    }

    &:active {
      background: var(--neutral-10); /* #E8E8E8 */
    }
  }
</style>
