import { mount, unmount } from 'svelte';
import Harness from './fixtures/ArtworkStripHarness.svelte';

/** Costura de navegador: importar pelo Vite e executar em uma página de teste. */
export function mountArtworkFixture() {
  const originalTheme = document.documentElement.getAttribute('data-theme');
  const target = document.createElement('div');
  target.style.cssText = 'position:fixed;inset:0;z-index:1000;background:var(--bg)';
  document.body.append(target);
  const good = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="green"/></svg>',
  );
  const artworks = [
    { id: 'valid', title: 'Valid', creators: ['Artist'], image: good },
    { id: 'missing', title: 'Missing', creators: ['Artist'], image: '' },
    { id: 'failed', title: 'Failed', creators: ['Artist'], image: '/nonexistent-artwork.jpg' },
  ];
  let selected = null;
  const component = mount(Harness, {
    target, props: { artworks, onArtistSelect: name => { selected = name; } },
  });

  return {
    target, component, artworks, good,
    get selected() { return selected; },
    async verify({ locale, theme, observer, width }) {
      document.documentElement.dataset.theme = theme;
      const works = artworks.map(art => ({ ...art }));
      if (observer) {
        for (let i = 3; i < 51; i++) {
          works.push({ id: `extra${i}`, title: `Extra ${i}`, creators: ['Artist'], image: good });
        }
      }
      component.configure({ artworks: works, locale, mobile: width < 760, selectedCreator: null });
      await new Promise(resolve => setTimeout(resolve, 150));
      const buttons = [...target.querySelectorAll('.artwork__btn')];
      const label = buttons[1].querySelector('.artwork__img--placeholder');
      const expected = locale === 'pt' ? 'Imagem indisponível' : 'Image unavailable';
      const checks = {
        valid: buttons[0].querySelector('img')?.naturalWidth > 0,
        missing: buttons[1].textContent === expected,
        error: buttons[2].textContent === expected,
        noBroken: !buttons[2].querySelector('img'),
        unclipped: label.scrollHeight <= label.clientHeight && label.scrollWidth <= label.clientWidth,
        count: buttons.length === (observer ? 51 : 3),
      };
      if (Object.values(checks).some(value => !value)) {
        throw new Error(JSON.stringify({ locale, theme, observer, width, checks }));
      }
      return checks;
    },
    async destroy() {
      await unmount(component);
      target.remove();
      if (originalTheme === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', originalTheme);
    },
  };
}
