import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { render } from 'svelte/server';
import TutorialBox from '../../components/TutorialBox.svelte';

function styles(name) {
  const source = readFileSync(new URL(`../../components/${name}.svelte`, import.meta.url), 'utf8');
  return compileString(source.match(/<style lang="scss">([\s\S]*?)<\/style>/)[1]).css;
}

describe('Cards e Sobre — contrato visual compartilhado', () => {
  test.each(['ArtistCard', 'TutorialBox', 'AboutModal'])('%s preserva alvo e símbolo independentes', (name) => {
    const css = styles(name);
    expect(css).toContain('width: var(--close-target-size)');
    expect(css).toContain('height: var(--close-target-size)');
    expect(css).toContain('font-size: var(--close-symbol-size)');
    expect(css).toContain(':focus-visible');
  });

  test('tutorial renderiza controle de dispensação acessível e título longo', () => {
    const title = 'Como explorar criadores, acervos, bubbles e trajetórias';
    const { body } = render(TutorialBox, { props: { title } });
    expect(body).toContain('aria-label="Fechar tutorial"');
    expect(body).toContain(title);
    expect(styles('TutorialBox')).toContain('background: var(--tutorial-bg)');
    expect(styles('TutorialBox')).toContain('color: var(--tutorial-txt)');
  });

  test('Sobre usa tipografia principal e metadados sem restringir créditos a uma linha', () => {
    const css = styles('AboutModal');
    expect(css).toContain('font-size: var(--about-body-size)');
    expect(css).toContain('font-size: var(--about-meta-size)');
    expect(css).toContain('line-height: 1.4');
    expect(css).toContain('white-space: normal');
  });
});
