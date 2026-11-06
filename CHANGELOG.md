# Changelog

Todas as mudanças notáveis neste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e o projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).


## [1.0.4] — 2026-11-06]

### Adicionado
- Auditoria de imagens de obras e cadeias de fallback verificadas para recuperar miniaturas
- Ordenação de obras com museus menos priorizados
- Indicadores de prontidão dos dados e do canvas para diagnóstico do mapa
- Especificação detalhada dos ajustes do Atlas

### Alterado
- Cabeçalhos mais adaptáveis, controles acessíveis junto a painéis expandidos e melhor uso do espaço em telas compactas
- Melhorias de contraste no tema claro, suavização de sobreposições e ajustes de legibilidade em cards, perfil e componentes móveis
- Ícones de fechar e estilos dos componentes padronizados
- Migração da infraestrutura de testes de Jest para Vitest

### Corrigido
- Miniaturas indisponíveis recuperadas por fallback, com estado explícito quando a imagem não pode ser carregada
- Requisições de imagem não são reiniciadas quando os dados permanecem inalterados

---

## [1.0.2] — 2026-07-21

### Adicionado
- Aviso de melhor experiência no desktop

---

## [1.0.1] — 2026-07-20

### Adicionado
- Atualização do `<title>`
- Correção de deduplicação de locais de formação no card de artista
- Versão da plataforma lida dinamicamente de `package.json` via Vite `define`

---

## [1.0.0] — 2026-07-20

### Adicionado
- Mapa interativo de criadores (nascimento, morte, formação) sobre projeção Natural Earth e globo 3D
- Filtros por tipo de bubble, acervo, gênero, escola de formação e nacionalidade
- Card de artista com trajetória biográfica e faixa de obras
- Modal "Sobre" com créditos e versão da plataforma
- Suporte a dois idiomas: português (PT-BR) e inglês
