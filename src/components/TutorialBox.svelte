<script>
  /** Título opcional exibido na linha de cabeçalho (em maiúsculas). */
  export let title = '';
  export let onDismiss = null;

  function dismiss() {
    onDismiss?.();
  }
</script>

<div class="tutorial-box">
  <button
    class="tutorial-box__close"
    type="button"
    on:click={dismiss}
    aria-label="Fechar tutorial"
  >×</button>
  {#if title}
    <p class="tutorial-box__title">{title}</p>
  {/if}
  <div class="tutorial-box__body">
    <slot />
  </div>
</div>

<style lang="scss">
  .tutorial-box {
    pointer-events: auto;
    position: relative;
    background: var(--tutorial-bg);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid var(--neutral-70);
    border-radius: 16px;
    padding: 16px 24px;
    padding-right: calc(var(--close-target-size) + 24px);
    width: 246px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .tutorial-box__title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--tutorial-txt);
    text-transform: uppercase;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .tutorial-box__close {
    all: unset;
    position: absolute;
    top: 12px;
    right: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--close-target-size);
    height: var(--close-target-size);
    font-size: var(--close-symbol-size);
    line-height: var(--line-height-none);
    color: var(--tutorial-txt);
    cursor: pointer;
    transition: color 0.12s;

    &:hover {
      color: var(--tutorial-txt);
    }
    &:focus-visible { outline: 2px solid currentColor; }
  }

  .tutorial-box__body {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--tutorial-txt);
    overflow-wrap: anywhere;

    :global(p) {
      margin: 0;
    }

    :global(p + p) {
      margin-top: 9px;
    }

    :global(strong) {
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-tighter);
    }
  }
</style>
