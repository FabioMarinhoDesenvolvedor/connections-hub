# Connections Hub — direção e sistema visual

## Fontes de verdade

- `Referências/MANUAL DE MARCA - CONNECTIONS HUB.pdf` (22 páginas). As páginas mais usadas: 8 (conceito), 9 (valores), 10 (manifesto), 11 (tom de voz), 13–14 (marca), 16 (cores), 17 (tipografia), 18 (fotografia), 20–21 (proibições).
- SVGs originais em `Referências/CONNECTIONS HUB ID VISUAL/SVG`, copiados sem alteração (conferido byte a byte por `npm run verify`).
- Publicações iniciais (PNG) e `DOCUMENTO INICIAL` (DOCX) para textos, soluções e processo.
- Referência de disciplina visual: Apple no Refero Styles. Usada como estrutura (escala, superfícies, ritmo, pills, hairlines, ausência de sombras), nunca como valores de cor, fonte ou conteúdo.

## Ideia central

O manual, na página 8, conta a marca em quatro momentos: **a semente de uma ideia → ao abrir, se torna uma possibilidade de conexão → mas ainda precisa de um ponto de encontro → Connections Hub**. O site inteiro abre com essa história, contada em 3D e controlada pelo scroll natural.

O hero e o conceito compartilham um palco fixo (sticky). O texto rola normalmente por cima dele e o objeto se transforma:

1. **Hero:** uma esfera navy (a semente) ao lado do título "Conectando ideias. Construindo soluções."
2. **01:** a semente vai para o centro da composição.
3. **02:** a esfera se abre num anel, deitado no espaço.
4. **03:** o anel se levanta, se abre em C e o ponto de encontro chega e se encaixa.
5. **Final em 3D, a marca completa (2 viewports de scroll):** o C e o ponto dão uma volta no espaço e viram cerâmica off-white. O bloco navy do símbolo surge da profundidade e o C se encaixa em relevo. A câmera recua para enquadrar o logo inteiro, e o nome "connections hub" sai da parede letra por letra, em ordem de leitura, como a sinalização 3D dos mockups da marca. As letras são extrudadas dos **caminhos vetoriais do próprio logo.svg** (SVGLoader + ExtrudeGeometry), com as cores e a ordem de camadas do arquivo, incluindo os arcos laranja dos "o"s. O conjunto se apresenta em ângulo e pousa de frente sobre o lockup oficial em HTML (maior agora: clamp(300px, 48vw, 720px) no desktop, 86vw no celular). Gêmeos planos sem luz levam tudo às cores exatas, o SVG por baixo fica idêntico e o canvas sai sem emenda.

Refinamentos de movimento: a semente entra suavemente ao carregar, respira uma vez antes de abrir (antecipação, sem bounce), a fase de dobra da abertura foi encurtada, o ponto de encontro chega por uma curva de Bézier desacelerando e o C responde com um giro mínimo quando ele encaixa. O amortecimento é independente do frame rate (mesma sensação a 30, 60 ou 120 fps).

### Por que isso respeita o manual

- O logo nunca é renderizado, recolorido, distorcido ou girado. O fechamento é sempre o arquivo SVG oficial, em HTML e sem efeitos.
- A forma 3D reproduz os estágios ilustrados do conceito (p.8), não a marca registrada: esfera, anel e arco aberto com ponto, em navy sólido.
- A troca entre o logo claro e o escuro na navegação é instantânea, porque o manual proíbe reduzir a opacidade da marca, mesmo durante uma transição.

## Paleta (manual p.16 + SVGs)

| Papel | Valor | Uso |
| --- | --- | --- |
| Canvas | `#F8F6F0` | superfície principal |
| Navy | `#183255` | ação, títulos, superfície profunda (Soluções, pessoas, rodapé) |
| Ink | `#20252B` | texto corrido |
| Slate | `#6B7C8E` | segunda linha dos grandes títulos |
| Mist | `#CCD6DB` | texto sobre navy |
| Areia | `#E8D8C5` | superfície do Processo |
| Laranja | `#C16042` | apenas pontuação: sinal do eyebrow, traço do contador do conceito (eco das setas da p.8), marcador da solução ativa, ponto que percorre o processo |

O rótulo do laranja na p.16 repete o hex da areia, então o valor vem dos arquivos vetoriais oficiais.

## Tokens

`src/app/tokens.css`: cores da marca → papéis semânticos (superfície, texto, ação, acento, linhas), espaçamento em base de 4px, `--section`, largura máxima de 1360px, raios (8px para mídia, pill), escala tipográfica fluida e curvas/durações de movimento. Os componentes usam apenas papéis, nunca cores cruas.

## Tipografia

Satoshi Variable (arquivo oficial, sem itálico). Peso 400 para leitura; 500 para títulos, navegação e botões. Tracking de -0,045 a -0,05em nos títulos grandes; eyebrows em caixa-alta com +0,08em.

## Narrativa

| # | Seção | Superfície | Conteúdo (fonte) |
| --- | --- | --- | --- |
| 01 | Hero + Conceito | canvas | conceito p.8, tagline p.11 |
| 02 | Sobre | canvas | Post 01 |
| 03 | Momento | imagem full-bleed | mockup escritório; palavra-chave p.11 |
| 04 | Soluções | navy | destaque Soluções, bio |
| 05 | Processo | areia | destaque Processos |
| 06 | Manifesto + valores | canvas | p.10, p.9 |
| — | Pessoas | imagem + navy | p.10 |
| 07 | Contato | canvas + anel oficial (Bolinha) | destaque Contato |

## Motion

Uma única primitiva (`scroll-effects.tsx`): um listener passivo e um rAF. Faz a entrada curta dos blocos (16px), as palavras que se acendem nos textos de destaque, a imagem que abre até o full-bleed, a parallax leve das pessoas, a solução em foco (as outras recuam) e a trilha do processo com o ponto laranja. Nada sequestra o scroll. No desktop com mouse, o Lenis suaviza só a roda (o documento continua rolando de forma nativa, e sticky, teclado e busca funcionam normalmente); toque e movimento reduzido mantêm o scroll do sistema. Entradas: subida, desfoque que vira foco e títulos revelados por máscara, com 90ms de escalonamento entre irmãos. Com `prefers-reduced-motion`, o conteúdo aparece completo e o conceito avança em estados discretos.

## 3D (Three.js)

- `src/lib/concept-scene.ts`: uma superfície paramétrica (toro com raio maior, raio do tubo e arco como uniforms, calculado no vertex shader). Com raio maior zero, ela é uma esfera; por isso "abrir" é uma forma contínua, sem troca de malhas. Duas esferas fecham as pontas e uma é o ponto de encontro.
- Três.js puro em vez de R3F: é uma única cena imperativa, e o R3F acrescentaria cerca de 150 KB sem ganho de manutenção. Sem GSAP: o scroll é lido diretamente.
- ~5 draw calls, nenhum modelo, textura ou sombra em mapa. Reflexos com `RoomEnvironment` (PMREM gerado localmente, sem HDR externo). A sombra de contato é um quad com gradiente.
- Importação dinâmica em `requestIdleCallback`: o Three.js não entra no bundle inicial (verificado). DPR máximo de 1,75 no desktop e 1,5 no touch, com redução automática para 1 se houver frames lentos persistentes. O render para fora da viewport ou com a aba oculta. Perda de contexto devolve o fallback. `dispose` completo.
- **Fallback**: SVG com as mesmas proporções e a mesma coreografia (stroke e dasharray). Aparece sem WebGL, com economia de dados, em aparelhos com até 2 núcleos e com movimento reduzido. É idêntico ao desenho da p.8.

## Responsivo

- Desktop: objeto a 30vw da direita no hero e 16vw no conceito, com texto à esquerda.
- Proporção abaixo de 6:5 (celular e tablet em retrato): objeto no alto e centralizado, texto ancorado embaixo. Escala 0,52 no celular e 0,7 no tablet.
- Soluções: a imagem fixa (sticky) vira uma imagem acima da lista. Processo: trilha vertical. Pessoas: imagem acima e texto sobre navy. Contato: botões em largura total.
- Menu móvel em tela cheia, com `inert` quando fechado, Escape e retorno de foco.

## Pendências de conteúdo real

- Domínio de produção (`NEXT_PUBLIC_SITE_URL`) para canonical, sitemap e dados Organization.
- Cases, portfólio e depoimentos autorizados (não inventados; não há seção para eles).
- Fotografia documental real. As imagens atuais são mockups oficiais e estão identificadas como tal.
- Vídeo institucional (mencionado como "em confecção").
