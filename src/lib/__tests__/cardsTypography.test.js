import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { render } from 'svelte/server';
import TutorialBox from '../../components/TutorialBox.svelte';

function styles(name) {
  const source = readFileSync(new URL(`../../components/${name}.svelte`, import.meta.url), 'utf8');
  return compileString(source.match(/<style lang="scss">([\s\S]*?)<\/style>/)[1]).css;
}

describe('Cards e Sobre — contrato visual compartilhado', () => {
  test('fechamento do artista acompanha a cor do nome em ambos os temas', () => {
    const css = styles('ArtistCard');
    const close = css.match(/\.artist-card__close\s*\{([^}]+)\}/)[1];
    const icon = css.match(/\.artist-card__close-icon\s*\{([^}]+)\}/)[1];
    expect(close).toContain('color: var(--txt)');
    expect(icon).toContain('background-color: currentColor');
    expect(icon).toContain('mask: url("/close-icon.png")');
    expect(icon).not.toContain('opacity:');
  });

  test.each(['ArtistCard', 'TutorialBox'])('%s posiciona o ícone independentemente do alvo de fechamento', (name) => {
    const css = styles(name);
    expect(css).toContain('position: absolute');
    expect(css).toContain('width: var(--card-close-icon-size)');
    expect(css).toContain('(var(--close-target-size) - var(--card-close-icon-size)) / 2');
  });

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
    expect(css).toContain('font-size: var(--about-title-size)');
    expect(css).toContain('line-height: var(--about-line-height)');
    expect(css).toContain('width: min(var(--about-modal-width), 100vw - 32px)');
    expect(css).toContain('border-radius: var(--about-modal-radius)');
    expect(css).toContain('box-shadow: var(--about-modal-shadow)');
    expect(css).toContain('line-height: 1.4');
    expect(css).toContain('white-space: normal');
  });
});
