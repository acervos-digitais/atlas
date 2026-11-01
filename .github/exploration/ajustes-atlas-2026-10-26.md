# Ajustes Atlas — 26/10/2026

Refinamento consolidado para a spec dos ajustes descritos no [DOCX de referência](../../source/Ajustes%20Atlas%20_%2026_10_26.docx), incluindo suas 13 capturas. Reúne as decisões aprovadas na entrevista, os critérios de aceite e as orientações técnicas para implementação.

**Status:** Refinamento concluído; pronto para formalização via `/para-spec`.

**Data:** 01/11/2026.

## Objetivo e limites

Corrigir imagens quebradas, melhorar legibilidade e contraste, ajustar espaçamentos e eliminar sobreposições responsivas, preservando a exploração de criadores, acervos, bubbles e trajetórias.

- Incluir os 13 tópicos do DOCX.
- Usar o Figma como referência dos elementos citados, não como autorização para reconstruir telas inteiras.
- Preservar dados, regras de filtro, contagens, cores das bubbles e comportamento das projeções, salvo os ajustes explicitamente aprovados.
- Não reativar filtros ausentes da aplicação apenas porque aparecem no Figma.
- Incluir diagnóstico de carregamento móvel; otimizações e metas numéricas serão decididas após a medição.
- Não alterar a aplicação, publicar issue ou criar commit nesta etapa de refinamento.

## Decisões confirmadas

- Em 01/11/2026, foi confirmado o escopo com todos os ajustes do documento.
- O carregamento do globo no celular entra como investigação de desempenho, com meta definida após medição. Não há compromisso de ganho numérico antes desse diagnóstico.
- Os critérios visuais serão baseados na referência de design fornecida pelo usuário, em vez de valores arbitrados nesta etapa.
- O DOCX define os ajustes e prevalece em divergências. O Figma orienta medidas e aparência dos elementos citados; o restante da aplicação deve ser preservado.
- Para A01, investigar e corrigir os links recuperáveis. Quando a imagem continuar indisponível, manter a obra na faixa com o placeholder “Imagem indisponível”, preservando seus dados e acesso.
- Para A02, usar 16 px entre os dois botões de cada par de zoom, projeção e tema, mantendo 44 × 44 px por botão e preservando a distância entre os grupos.
- Para A05 e o fechamento citado em A13, padronizar o símbolo em 24 px e a área clicável mínima em 44 × 44 px no card de criador, tutoriais/aviso inicial e modal Sobre/About, em desktop, tablet e celular.
- Para A06, A07, A09, A10 e A11, foi aprovada a combinação de cores descrita nos critérios abaixo, somente no tema claro e preservando as cores das bubbles.
- Para A03, seguir a referência Figma; usar a recomendação de redução adicional somente se a implementação já for fidedigna. A consulta detalhada confirmou 44 px no design contra 56 px na composição atual do desktop, portanto o alvo para esse layout é 44 px, não os 24 px inicialmente propostos.
- Para A08, reduzir em 50% a intensidade da névoa/vinheta no tema claro e adotar sombra `0 4px 16px rgba(0, 0, 0, 0.2)` no card Resultados como alvo para a primeira validação visual. Preservar a aparência esférica e o tema escuro.
- Para A04, permitir duas linhas no cabeçalho intermediário, mantendo os filtros visíveis e sem reduzir a fonte, com altura ajustada para não cobrir o mapa ou outros controles.
- Para A12/A13, foi aprovada a escala de tipografia e dimensões descrita abaixo, nos dois temas e idiomas, preservando conteúdo, logos e hierarquia.
- Para a investigação de desempenho de A13, foi aprovado o protocolo simulado abaixo, sem depender de um celular físico.
- Foi aprovada a matriz de validação abaixo, incluindo os dois temas, idiomas e projeções, os limites responsivos e o fallback bilíngue de imagens.

## Referência de design

[Atlas dos Percursos de Artistas em Museus — Figma, nó 1:6176](https://www.figma.com/design/65VY0RJh4omVZFM7FCBbAL/Atlas-dos-Percursos-de-Artistas-em-Museus?node-id=1-6176&m=dev).

A leitura pelo MCP do Figma foi iniciada em 01/11/2026. O nó fornecido é um agrupamento amplo de referências, não uma única tela. Foram identificadas as áreas abaixo:

| Área | Nó |
| --- | --- |
| Modo Claro | `1:6177` |
| Desktop | `1:7459` |
| Componentes | `9:2514` |
| Tablet e Mobile | `1:10045` |

A captura de Modo Claro apresenta tanto a projeção 3D quanto a 2D. O contexto detalhado do par de tema (`1:6442`) informa controles de 44 × 44 px e espaçamento de aproximadamente 17,77 px. A geometria do par de zoom (`1:6454`) informa controles de 44 × 44 px e espaço de aproximadamente 16,04 px. São valores observados no design, ainda não critérios aprovados para a aplicação.

A referência também contém elementos que diferem da interface retratada no DOCX, como o filtro de nacionalidade e a composição do painel de perfil. Essas diferenças não ampliam o escopo: prevalecem os pedidos do DOCX, sem reprodução integral de telas.

## Pedidos do documento

Os identificadores seguem a ordem dos tópicos do DOCX. O último tópico reúne ajustes de interface e a investigação de desempenho.

| ID | Pedido | Evidência na captura |
| --- | --- | --- |
| A01 | Corrigir links de imagens quebrados. | Faixa de obras com várias miniaturas não carregadas. |
| A02 | Aumentar um pouco a distância entre os pares de botões na lateral direita. | Recorte do par de zoom; confirmado como espaço dentro de cada um dos três pares. |
| A03 | Diminuir a distância entre os dados de Perfil dos Resultados e Nascimento. | Espaço entre os indicadores de gênero/formação e a seção Nascimento. |
| A04 | Eliminar a sobreposição de Filtrar por País e Trajetos na versão intermediária/tablet. | Títulos e controles disputam espaço no cabeçalho. |
| A05 | Aumentar o “X” de fechar nos cards em geral. | Card de criador com controle pequeno no canto superior direito. |
| A06 | Escurecer continentes para melhorar o contraste com as bubbles no tema claro. | Globo com continentes cinza e bubbles coloridas. |
| A07 | No tema claro, usar preto em Museus e Arquivos selecionados e cinza um pouco mais claro no hover. | Pills de acervo no filtro lateral; não é uma referência à cor das bubbles de acervo. |
| A08 | Reduzir vinheta/névoa ao redor do globo no tema claro e a sombra de Resultados. | Captura ampla do globo e do card de contagens. |
| A09 | Usar nas porcentagens o mesmo cinza dos continentes para melhorar o contraste. | Porcentagens das barras de Nascimento no tema claro. |
| A10 | Inverter a cor dos botões não selecionados da lateral direita em relação ao fundo. | Controles de projeção e tema quase desaparecem sobre áreas claras. |
| A11 | Escurecer o fundo dos cards iniciais no tema claro. | Card de tutorial “Como navegar”. |
| A12 | Aumentar a proporção do texto de Sobre/About. | Modal em inglês com texto, créditos e links. |
| A13 | Aumentar a proporção do header e menus no celular, aumentar o “X” do modal de aviso e investigar o carregamento do globo. | Interface móvel exibindo “Carregando dados...”; a captura não permite medir a duração. |

## Contexto técnico observado

- O módulo de dados concentra a transformação das fontes em bubbles, trajetórias e obras por criador. Sua interface de carregamento já busca as fontes em paralelo; a causa das falhas de imagem e da demora ainda não foi diagnosticada.
- O módulo de filtragem oferece uma costura pura para verificar seleção de criador, acervo e localidade. Os pedidos visuais não especificam mudanças nesses predicados.
- Há constantes compartilhadas de cores, dimensões e breakpoints. Os valores finais dos ajustes ainda precisam ser definidos.
- O projeto possui testes Vitest, incluindo dados, filtros, layout e desempenho. Ainda será necessário verificar quais asserções cobrem os critérios acordados.
- Nenhuma nova costura ou adaptador foi decidido nesta etapa.

## Critérios de aceite confirmados

### A01 — Imagens de obras

- Investigar a causa das falhas e corrigir os links recuperáveis; o placeholder não substitui essa correção.
- Se a imagem estiver indisponível, exibir “Imagem indisponível” no lugar da miniatura quebrada, sem remover a obra da faixa.
- Preservar os dados e o acesso à obra, inclusive quando a miniatura não carregar.
- O estado de falha deve ser explícito para o usuário, em vez de aparentar carregamento bem-sucedido.

- Usar “Imagem indisponível” em PT e “Image unavailable” em EN.
- Cobrir imagens ausentes e falhas de carregamento tanto no fluxo nativo quanto no fluxo por observer.
- A falha de uma miniatura não deve impedir a exibição das demais obras.

### A02 — Espaçamento dos controles

- Os pares de zoom, projeção e tema devem ter 16 px de espaço entre seus dois botões.
- Cada botão mantém 44 × 44 px.
- A distância entre os grupos de controles não muda.
- As ações de zoom, troca de projeção e troca de tema permanecem inalteradas.

### A05 e A13 — Controles de fechamento

- Usar símbolo de 24 px e área clicável mínima de 44 × 44 px.
- Aplicar ao card de criador, aos tutoriais/aviso inicial e ao modal Sobre/About.
- Aplicar em desktop, tablet e celular.
- Preservar os comportamentos existentes de fechamento e dispensação.

### A03 — Espaçamento antes de Nascimento

- No desktop, usar 44 px de separação entre o bloco de indicadores e o bloco Nascimento, conforme o `gap` do nó Figma `1:6467`.
- Medir a separação entre os limites de layout dos blocos, após o indicador mais alto, inclusive com nomes de escola em várias linhas.
- Evitar a soma atual de 12 px entre blocos com 44 px adicionais acima do título.
- Preservar os demais intervalos do painel e aplicar a correção nos dois temas.

Preservar os intervalos menores já usados nos layouts compactos; este ajuste de redução não deve ampliá-los para 44 px.

### A04 — Cabeçalho intermediário

- Quando o cabeçalho não couber em uma linha, permitir duas linhas, mantendo os filtros visíveis.
- Não reduzir a fonte nem antecipar o layout recolhível de celular como solução para esse problema.
- Filtrar por País e Trajetos devem permanecer legíveis, sem sobreposição entre títulos ou controles.
- A altura do cabeçalho e a área reservada no layout devem acompanhar a quebra, sem cobrir o mapa nem outros controles.

### A06, A07, A09, A10 e A11 — Contraste no tema claro

Os valores abaixo foram propostos a partir da paleta existente no Figma e aprovados pelo usuário. Não são uma transcrição de todos os estilos aplicados aos respectivos elementos no design.

| Elemento | Valor aprovado |
| --- | --- |
| Continentes nas projeções 2D e 3D | `#383838` |
| Porcentagens do Perfil dos Resultados | `#383838` |
| Fundo das pills de acervo selecionadas | `#121212` |
| Fundo das pills de acervo selecionadas em hover | `#383838` |
| Texto das pills de acervo selecionadas | Branco |
| Ícones e bordas dos controles não selecionados da lateral direita | `#121212` |
| Fundo dos cards iniciais de tutorial | `#4B4B4B` |
| Texto dos cards iniciais de tutorial | Claro |

- Aplicar essas mudanças somente no tema claro.
- Preservar as cores das bubbles.
- A alteração das pills se refere ao filtro de Museus e Arquivos; não altera a seleção nem o predicado de acervo.
- Aplicar a cor de porcentagens a todas as porcentagens do Perfil, incluindo indicadores circulares e barras.
- Usar branco `#FFFFFF` nas pills selecionadas e texto claro da paleta existente nos tutoriais, verificando a leitura sobre o fundo efetivamente composto.
- Manter distinção entre os estados selecionado, não selecionado, hover e foco dos controles.

### A08 — Névoa, vinheta e sombra

- Reduzir em 50% a intensidade dos efeitos de névoa/vinheta no tema claro em relação à implementação de referência deste refinamento.
- Preservar a aparência esférica do globo; não remover indiscriminadamente os efeitos de profundidade.
- Alterar a sombra de Resultados de `0 8px 24px rgba(0, 0, 0, 0.5)` para `0 4px 16px rgba(0, 0, 0, 0.2)` no tema claro.
- Preservar o tema escuro.
- Tratar esses valores como alvo da primeira validação visual.

Mapeamento técnico da redução, derivado da implementação consultada:

| Camada no tema claro | Referência atual | Alvo |
| --- | --- | --- |
| Opacidade da vinheta radial de interface | 1 | 0,5 |
| Opacidade do gradiente superior | 0,5 | 0,25 |
| Opacidade do gradiente lateral | 0,5 | 0,25 |
| Alpha dos pontos do brilho externo do globo | 0,55 / 0,18 / 0 | 0,275 / 0,09 / 0 |

Preservar a sombra interna da esfera, que define sua profundidade, e não aplicar uma segunda redução sobre uma camada já ajustada. Comparar capturas antes/depois com a mesma projeção, posição, zoom e viewport.

### A12 e A13 — Leitura e navegação

| Elemento | Valor aprovado |
| --- | --- |
| Texto principal de Sobre/About | 15 px |
| Créditos, contato e versão em Sobre/About | 12 px |
| Entrelinha de Sobre/About | 1,4 |
| Título do Atlas no celular | 17 px |
| Sobre/PT/EN no cabeçalho do celular | 14 px |
| Títulos dos menus do celular | 16 px |
| Logo no cabeçalho do celular | Aproximadamente 50 px de altura, preservando proporção |
| Barras dos menus do celular | Altura mínima de 60 px, em vez de 52 px |

- Aplicar nos dois temas e idiomas.
- Permitir que a altura do cabeçalho cresça conforme o texto; não cortar conteúdo.
- Preservar conteúdo, logos e hierarquia.
- A área reservada no layout deve acompanhar a altura efetiva do cabeçalho.

### A13 — Investigação do carregamento

- Medir uma build de produção, com viewport de 390 × 844 px.
- Simular rede com 9 Mbps de download, 1,5 Mbps de upload e latência de 150 ms.
- Usar desaceleração de CPU de 4×.
- Fazer cinco execuções com cache frio e cinco com cache quente, registrando mediana e pior tempo separadamente para cada condição.
- Medir desde o início da navegação até o globo estar visível com bubbles e responder à interação.
- Separar os custos de rede, preparação dos dados e renderização.
- Entregar diagnóstico e definir a meta de melhoria somente após a medição.

Para reprodutibilidade, registrar versão do navegador, máquina utilizada, versão da aplicação e dataset. Usar a mesma configuração de tema, idioma, filtros e projeção em todas as execuções. No cache frio, limpar o cache HTTP; no cache quente, aquecê-lo com uma navegação anterior. Manter o estado persistido da interface igual entre as condições. Informar como foi verificada a prontidão para interação.

## Costuras e preservação de comportamento

As orientações abaixo não exigem novos módulos ou adaptadores; servem para concentrar as mudanças nas costuras existentes.

- **Módulo de dados:** investigar as URLs de imagens na origem e na transformação das obras. Corrigir URLs apenas quando houver uma substituição verificável, sem inventar endereços nem substituir uma obra por imagem de outra.
- **Módulo da faixa de obras:** representar explicitamente o estado de imagem indisponível, preservando a identidade e a interface de acesso à obra. O usuário continua acessando seus dados mesmo quando a miniatura falha.
- **Módulo de filtragem:** preservar os predicados existentes. A troca de aparência da seleção de acervo não muda o conjunto selecionado nem as bubbles e trajetórias resultantes.
- **Módulos de layout:** sincronizar o espaço reservado com a altura efetiva de cabeçalhos e menus. Não esconder sobreposições com cortes de conteúdo.
- **Módulo de mapa e estilos compartilhados:** concentrar os valores de cor, dimensão e intensidade nas fontes de verdade existentes. Manter a localidade das mudanças de tema, sem duplicar cores ou alterar o tema escuro por efeito colateral.
- **Testabilidade:** medir o resultado renderizado pela mesma interface usada pelo usuário. Testes apenas de constantes ou de funções isoladas não demonstram que os controles deixaram de se sobrepor.

## Matriz de validação aprovada

| Dimensão | Cobertura |
| --- | --- |
| Idioma | PT e EN |
| Tema | Claro e escuro |
| Projeção | 2D e 3D |
| Larguras de referência | 320, 390, 768, 1024, 1280 e 1440 px |
| Limites responsivos | 759/760 e 1379/1380 px |
| Interação | Mouse, toque e teclado |
| Imagens | Válida, ausente e falha de carregamento; fluxos nativo e por observer |

- Exercitar os cenários aplicáveis em todas as combinações de tema, idioma e projeção nas larguras de referência.
- Verificar os limites responsivos sem alterar os breakpoints apenas para ocultar a sobreposição.
- Verificar menus abertos e fechados, Perfil expandido e recolhido, faixa de obras expandida e recolhida e textos longos.
- Não aceitar sobreposição, corte de conteúdo, fechamento inacessível ou controles encobertos.
- Medir os 16 px entre botões, as áreas de 44 × 44 px e a separação de 44 px do Perfil no desktop; não usar apenas inspeção de constantes como evidência.
- Confirmar os tamanhos tipográficos e as cores por estilos computados, complementando com capturas e inspeção visual das camadas Canvas.
- Confirmar que filtros, contagens e trajetórias permanecem iguais antes/depois para os mesmos dados e seleções.
- Validar que o placeholder preserva a obra e seu acesso, sem alterar contagens nem esconder falhas de origem.
- Verificar fechamento, foco e navegação por teclado, preservando os comportamentos existentes dos modais.

## Estratégia de verificação técnica

- Usar os testes Vitest existentes para regressões de dados, filtros, estatísticas e lógica responsiva, ajustando os testes diretamente relacionados aos novos critérios.
- Cobrir no navegador as medidas e interações reais; os testes atuais de layout verificam decisões e constantes sem renderizar os módulos.
- Não usar a suíte atual de desempenho em Node como substituta do protocolo de carregamento no navegador.
- Na implementação, executar os testes focados nos módulos alterados e a build de produção. Adicionar ferramenta de teste somente se necessária para cobrir uma lacuna concreta.
- Registrar evidências antes/depois e os resultados da matriz. Neste refinamento, os critérios foram definidos, não executados contra uma implementação modificada.

## Questões reservadas ao diagnóstico

- Quais imagens falham e por quais causas; quais URLs possuem substituição recuperável.
- Qual etapa domina o carregamento móvel e qual meta de melhoria é realista.
- Se a primeira validação visual de A08 exige ajuste adicional, documentar a revisão dos valores em vez de declarar conformidade com valores diferentes.

Esses pontos são entregáveis de investigação, não decisões visuais pendentes da entrevista.

## Próximo passo

Usar `/para-spec` para formalizar este refinamento e, depois, `/para-tickets` para dividir a implementação em entregas verificáveis. Não foi necessário criar ADR nem adicionar termo ao glossário: não houve decisão estrutural que rejeitasse uma abordagem nem novo conceito de domínio.
