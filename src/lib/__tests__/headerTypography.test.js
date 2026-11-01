import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { render } from 'svelte/server';
import MobileHeader from '../../components/MobileHeader.svelte';
import FilterAccordion from '../../components/FilterAccordion.svelte';

function styles(name) {
  const source = readFileSync(new URL(`../../components/${name}.svelte`, import.meta.url), 'utf8');
  return compileString(source.match(/<style lang="scss">([\s\S]*?)<\/style>/)[1]).css;
}

describe('Cabeçalhos — contrato de crescimento', () => {
  test.each(['pt', 'en'])('renderiza ações móveis em %s', (locale) => {
    const { body } = render(MobileHeader, { props: { locale } });
    expect(body).toContain(locale === 'pt' ? 'Sobre' : 'About');
    const css = styles('MobileHeader');
    expect(css).toContain('font-size: var(--mobile-title-size)');
    expect(css).toContain('font-size: var(--mobile-action-size)');
    expect(css).toContain('height: var(--mobile-logo-height)');
    expect(css).not.toContain('height: var(--menu-height)');
  });

  test('menu mantém rótulo longo completo e estado expandido', () => {
    const label = 'Visualizações, filtros e exploração de trajetórias';
    const { body } = render(FilterAccordion, {
      props: { items: [{ id: 'level1', label }], expandedId: 'level1' },
    });
    expect(body).toContain(label);
    expect(body).toContain('aria-expanded="true"');
    const css = styles('FilterAccordion');
    expect(css).toContain('min-height: var(--mobile-menu-min-height)');
    expect(css).toContain('font-size: var(--mobile-menu-title-size)');
    expect(css).not.toContain('text-overflow: ellipsis');
  });

  test('controles intermediários podem formar linhas reais', () => {
    expect(styles('Header')).toContain('flex-wrap: wrap');
  });
});
