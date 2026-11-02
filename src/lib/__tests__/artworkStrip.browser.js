import { mount, unmount, tick } from 'svelte';
import Harness from './fixtures/ArtworkStripHarness.svelte';
import { ARTWORK_STRIP_MAX_FRACTION } from '../constants.js';

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
    async verifyProtectedArea(width) {
      target.style.width = `${width}px`;
      target.style.height = '400px';
      const works = Array.from({ length: 120 }, (_, i) => ({
        id: `scroll-${i}`, title: `Obra ${i}`, creators: ['Artist'], image: good,
      }));
      component.configure({ artworks: works, mobile: width < 760, collapsed: false });
      await tick();
      const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const handle = target.querySelector('.artwork-strip__resize');
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await tick();
      await settle();
      const body = target.querySelector('.artwork-strip__body');
      const scroll = target.querySelector('.artwork-strip__scroll');
      scroll.scrollTop = 0;
      await settle();
      const band = handle.getBoundingClientRect();
      const grip = getComputedStyle(handle, '::after');
      const firstTop = scroll.querySelector('.artwork').getBoundingClientRect().top;
      const checks = {
        protectedHeight: Math.abs(band.height - 16) < 0.1,
        fullWidth: Math.abs(band.width - body.getBoundingClientRect().width) < 1,
        centeredVertically: Math.abs(parseFloat(grip.top) - band.height / 2) < 0.1,
        centeredHorizontally: Math.abs(parseFloat(grip.left) - band.width / 2) < 0.1,
        grayBand: getComputedStyle(handle).backgroundColor === getComputedStyle(body).backgroundColor,
        scrollStartsBelowBand: Math.abs(scroll.getBoundingClientRect().top - band.bottom) < 1,
      };
      for (const fraction of [0.5, 1]) {
        scroll.scrollTop = scroll.scrollHeight * fraction;
        await settle();
        checks[`fixedAt${fraction}`] = Math.abs(handle.getBoundingClientRect().top - band.top) < 0.1
          && Math.abs(scroll.getBoundingClientRect().top - band.bottom) < 1
          && document.elementFromPoint(band.left + band.width / 2, band.top + band.height / 2) === handle;
      }
      checks.imagesScrolled = scroll.scrollTop > 0 && scroll.querySelector('.artwork').getBoundingClientRect().top < firstTop;
      if (Object.values(checks).some(value => !value)) throw new Error(JSON.stringify({ width, checks }));
      return checks;
    },
    async verifyProfile() {
      target.style.width = '700px';
      target.style.height = '800px';
      component.configure({ showProfile: true, mobile: false, collapsed: false });
      const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await tick();
      await settle();
      const strip = target.querySelector('.artwork-strip');
      const profile = target.querySelector('.profile-panel');
      const profileToggle = profile.querySelector('.profile-panel__header');
      if (profileToggle.getAttribute('aria-expanded') === 'false') profileToggle.click();
      await tick();
      const toggle = strip.querySelector('.artwork-strip__header');
      const body = strip.querySelector('.artwork-strip__body');
      const tab = toggle.getBoundingClientRect();
      const panel = profile.getBoundingClientRect();
      const checks = {
        profileMeetsImages: Math.abs(panel.bottom - body.getBoundingClientRect().top) < 1,
        tabHeight: Math.abs(tab.height - 30) < 1,
        tabWidth: Math.abs(tab.width - parseFloat(getComputedStyle(strip).getPropertyValue('--artwork-strip-tab-width'))) < 1,
        visibleText: strip.querySelector('.artwork-strip__label').getBoundingClientRect().width > 0,
        tabAboveProfile: document.elementFromPoint(tab.right - 4, tab.top + 2)?.closest('.artwork-strip__header') === toggle,
      };
      const handle = strip.querySelector('.artwork-strip__resize');
      const handleRect = handle.getBoundingClientRect();
      checks.handlePosition = Math.abs(handleRect.left - tab.left) < 1 && Math.abs(handleRect.width - strip.getBoundingClientRect().width) < 1;
      checks.handleAtImageEdge = Math.abs(handleRect.top - body.getBoundingClientRect().top) < 1;
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      await tick();
      await settle();
      checks.resizedProfileMeetsImages = Math.abs(profile.getBoundingClientRect().bottom - body.getBoundingClientRect().top) < 1;
      toggle.click();
      await tick();
      await settle();
      checks.collapsedProfileReachesBottom = Math.abs(profile.getBoundingClientRect().bottom - target.getBoundingClientRect().bottom) < 1;
      toggle.click();
      await tick();
      await settle();
      checks.expandedProfileMeetsImages = Math.abs(profile.getBoundingClientRect().bottom - body.getBoundingClientRect().top) < 1;
      if (Object.values(checks).some(value => !value)) throw new Error(JSON.stringify(checks));
      component.configure({ showProfile: false });
      return checks;
    },
    async verifyResize({ width, height }) {
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      component.configure({ mobile: width < 760, collapsed: false });
      const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await tick();
      await settle();
      const strip = target.querySelector('.artwork-strip');
      const handle = target.querySelector('.artwork-strip__resize');
      const toggle = target.querySelector('.artwork-strip__header');
      const actualHeight = () => strip.getBoundingClientRect().height;
      const key = async key => {
        handle.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        await tick();
        await settle();
      };
      await key('End');
      const expanded = actualHeight();
      const checks = {
        maximum: Math.abs(expanded - height * ARTWORK_STRIP_MAX_FRACTION) < 1,
        measuredInset: Math.abs(component.height() - expanded) < 1,
        noHorizontalOverflow: strip.scrollWidth <= strip.clientWidth,
      };
      const tab = toggle.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();
      const body = target.querySelector('.artwork-strip__body').getBoundingClientRect();
      checks.tabWidth = Math.abs(tab.width - Math.min(width, parseFloat(getComputedStyle(strip).getPropertyValue('--artwork-strip-tab-width')))) < 1;
      checks.tabHeight = Math.abs(tab.height - (width < 760 ? 31 : 30)) < 1;
      checks.handlePosition = Math.abs(handleRect.left - tab.left) < 1 && Math.abs(handleRect.width - strip.getBoundingClientRect().width) < 1;
      checks.handleAtImageEdge = Math.abs(handleRect.top - body.top) < 1;
      if (width === 375 || width === 1075) {
        const grid = target.querySelector('.artwork-strip__grid');
        checks.figmaColumns = getComputedStyle(grid).gridTemplateColumns.split(' ').length === (width === 375 ? 6 : 19);
      }
      toggle.click();
      await tick();
      await settle();
      checks.collapsed = actualHeight() <= 31;
      toggle.click();
      await tick();
      await settle();
      checks.restored = Math.abs(actualHeight() - expanded) < 1;
      target.style.height = `${height / 2}px`;
      await settle();
      await settle();
      checks.viewportClamp = actualHeight() <= height / 2 * ARTWORK_STRIP_MAX_FRACTION + 1;
      await key('Home');
      checks.keyboardCollapse = toggle.getAttribute('aria-expanded') === 'false';
      await key('ArrowUp');
      checks.keyboardExpand = toggle.getAttribute('aria-expanded') === 'true';
      if (Object.values(checks).some(value => !value)) {
        throw new Error(JSON.stringify({ width, height, checks }));
      }
      return checks;
    },
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
