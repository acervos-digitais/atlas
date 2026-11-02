/** Verifica o CSS real dos controles, sem alterar o estado do mapa. */
export async function verifyMapOverlays() {
  const source = document.querySelector('.map-overlays');
  if (!source) throw new Error('Controles do mapa não encontrados.');
  const previousFocus = document.activeElement;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:1000;background:var(--bg)';
  const rail = source.cloneNode(true);
  host.append(rail);
  document.body.append(host);
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const results = [];
  try {
    for (const [width, height] of [[375, 120], [375, 180], [760, 320], [1075, 600], [1440, 900]]) {
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;
      for (const inset of [0, 31, height * 0.6]) {
        host.style.setProperty('--artwork-strip-inset', `${inset}px`);
        rail.scrollTop = 0;
        await settle();
        const groups = [...rail.children];
        const gap = parseFloat(getComputedStyle(rail).gap);
        const checks = {
          gap: groups.every((group, i) => i === 0 || group.getBoundingClientRect().top - groups[i - 1].getBoundingClientRect().bottom >= gap - 1),
          accessibleByKeyboard: true,
        };
        for (const button of rail.querySelectorAll('button')) {
          button.focus();
          await settle();
          const bounds = rail.getBoundingClientRect();
          const rect = button.getBoundingClientRect();
          checks.accessibleByKeyboard &&= rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1
            && rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
        }
        if (Object.values(checks).some(value => !value)) {
          throw new Error(JSON.stringify({ width, height, inset, checks }));
        }
        results.push({ width, height, inset, ...checks });
      }
    }
    return results;
  } finally {
    host.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
}
