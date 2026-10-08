# Connections Hub — direção de design

## 1. Diagnóstico da versão anterior

Revisão feita no navegador (1440 × 900 e 390 × 844), no código e contra o filme da marca (`Referências/ConnectionsHUb.mp4`), o manual (22 p.), os vetores e as publicações iniciais.

**O objeto 3D contradizia a marca.** O filme mostra uma esfera navy *soft-touch*, fosca, que gira e revela um núcleo areia; a borda se abre em C, o ponto surge na abertura, e a forma incha até virar o ícone. A versão anterior construía outra coisa: um ovo brilhante com reflexos em estrela e depois um tubo toroidal (uma "boia") com faixa terracota interna. Material, forma e cor divergiam do filme. Parecia um brinquedo de plástico, não um objeto de marca.

**A transição para o logo era uma emenda.** O C encolhia até um quadradinho isolado no meio de uma tela vazia, e só depois o logo aparecia em outro lugar. Eram cerca de cinco telas de rolagem com pouco conteúdo (≈ 40% da página) e um palco vazio entre o objeto e a marca.

**Não havia linguagem visual própria.** Off-white liso, títulos com a segunda linha em slate, listas simples: o resultado era indistinguível de um template. Elementos que o próprio sistema da marca oferece não eram usados: o grid fino das publicações, o anel bicolor ("bolinha"), a tipografia espaçada do manifesto e o recorte por arcos.

**O conteúdo não vendia capacidade.** Cada serviço tinha uma frase. Não ficava claro o que se entrega, que problema cada serviço resolve, o que o cliente recebe em cada etapa nem a quem se destina. O processo era uma linha com quatro pontos. O manifesto real do manual foi substituído por um texto genérico.

**Mobile:** objeto e texto disputavam a mesma tela, com grandes áreas vazias entre os capítulos.

## 2. O que fica, o que muda

- **Fica:** Next.js App Router e Server Components; scroll nativo; todos os vetores e a Satoshi intactos; paleta; contatos; nomes do processo; galeria de projetos condicionada a cases reais; gate de reduced-motion, sem JavaScript e sem WebGL.
- **Refeito:** a peça 3D inteira (técnica, forma, material, luz, coreografia), a transição para o logo, o sistema visual, o layout de todas as seções, o motion e a arquitetura de conteúdo.
- **Removido:** Three.js (ver §5) e o tubo paramétrico.

## 3. Direção: "desenho técnico sobre papel de marca"

A Connections Hub é uma empresa de engenharia de software com uma marca calorosa (areia, off-white, objeto macio). A direção junta as duas coisas:

- **O objeto** é físico, macio e fiel ao filme. É a parte humana: a ideia, o encontro.
- **O entorno** usa a linguagem do desenho técnico: o grid fino da marca como prancheta, marcas de registro, linhas de chamada que ligam o texto às partes do objeto, numeração de folhas e números tabulares. É a parte de engenharia: precisão, método, clareza.

Nada disso é imagem genérica de tecnologia (proibida no manual, p. 20). São convenções de engenharia aplicadas com o vocabulário da própria marca.

O **ponto** (o "ponto de encontro", p. 13) vira um dispositivo de leitura do site inteiro. Ele marca onde o valor acontece: o elemento-chave em cada esquema de serviço, a etapa atual no anel do processo e o item ativo da navegação.

## 4. Sistema

Tokens em `src/app/tokens.css`. Resumo:

- **Cor por papel:** superfícies off-white / areia / navy / ink; texto navy e ink; slate apenas em tamanhos grandes (4,1:1); terracota como pontuação, não como tinta; mist sobre navy para texto secundário.
- **Tipo:** só Satoshi, sem itálico. Display em 500 com tracking negativo; corpo em 400; rótulos em 500 caixa-alta com tracking .16em; a linha espaçada do manifesto (.32em) reproduz a peça do manual; numerais tabulares.
- **Grid:** 12 colunas, margens fluidas e largura máxima de 1440. O grid fino da marca aparece como textura de prancheta no palco e nas superfícies navy, sempre com máscara e baixo contraste.
- **Motion:** quatro durações (160 / 280 / 560 / 900 ms), *expo-out* para chegadas e *in-out* para trocas de estado. Os gestos são linhas de chamada que se desenham, títulos revelados por máscara de linha e hairlines que crescem, nunca o fade-up genérico. Tudo em `transform`/`opacity`. Com reduced motion, os estados finais aparecem sem pin.

## 5. 3D: campos de distância (SDF) com raymarching

A sequência do filme muda de topologia: esfera → casca oca → C aberto → placa com relevo. Malhas (Blender/GLB) exigiriam várias peças trocadas no meio do movimento ou morph targets com topologia idêntica, o que não existe aqui. Um campo de distância descreve cada estado como uma função e interpola entre elas com continuidade real. Por isso a peça é um único *fragment shader* em WebGL2:

- **Geometria exata da marca:** o C não é redesenhado. `scripts/bake-symbol-sdf.mjs` rasteriza o caminho oficial do C a partir de `logo.svg` e calcula uma transformada de distância euclidiana exata, gravada como textura de 256² (`public/sdf/symbol-c.png`). A placa e o ponto usam os valores numéricos do SVG (rx 72,76; r 14,52).
- **Material:** soft-touch fosco, com difusa envolvente, especular larga e fraca, sheen de borda, oclusão ambiente calculada no próprio campo e sombra de contato suave sobre o papel. Sem bloom e sem reflexos de estúdio.
- **Encaixe no logo:** a câmera é ortográfica e a escala/posição vêm do `<img>` oficial medido no DOM. No fim, profundidade e luz convergem para cores planas idênticas às do SVG; o arquivo oficial assume em opacidade total e o nome é revelado por máscara. O logo nunca é distorcido, girado ou transparente.
- **Por que sem Three.js:** a cena é um único quad em tela cheia. Um grafo de cena, loaders e materiais não acrescentam nada, e o renderer custa ≈ 600 KiB de JS. O módulo próprio tem poucos KiB e é carregado sob demanda.
- **Por que sem Blender:** não há malha para modelar. O único ativo "assado" é o campo de distância do C, gerado de forma reprodutível a partir do vetor oficial.

## 6. Coreografia

Um único relógio: o progresso do scroll nativo (sem scroll hijacking), amortecido por ~80 ms para suavizar os degraus da roda. Ele alimenta, no mesmo quadro, o objeto, as linhas de chamada, os textos e a troca para o logo (`src/lib/story/timeline.ts`).

1. **Hero:** semente à direita, texto à esquerda. Inclinação sutil seguindo o ponteiro (apenas em mouse/trackpad).
2. **01 A semente:** o texto sai, a semente vai para o palco e a linha de chamada se desenha até ela.
3. **02 A abertura:** a casca gira e revela o núcleo areia, como no filme.
4. **03 O ponto de encontro:** a borda se abre no C oficial e o ponto sai de trás do núcleo. A linha contorna o objeto, sem atravessá-lo.
5. **04 O hub:** a casca incha até virar a placa, o núcleo afunda e a areia reaparece como o C em relevo.
6. **Assinatura:** a placa achata, encaixa no logo e o nome é revelado por máscara.

Os capítulos usam o texto literal do manual (p. 8).

## 7. Robustez e desempenho

- **Sem loop contínuo:** render apenas quando scroll, resize ou ponteiro mudam; pausa fora da viewport e com a aba oculta.
- **Compilação fora da thread principal** (`KHR_parallel_shader_compile`): antes, a compilação do shader era uma tarefa longa de 810 ms no mobile.
- **Recorte por região do objeto** (scissor) e sombra de contato com uma única amostra do campo.
- **Resolução interna:** limite de DPR (1,5 desktop / 1,25 mobile), orçamento de pixels e redução adaptativa guiada pelo tempo de GPU medido (`EXT_disjoint_timer_query_webgl2`), com o intervalo entre quadros como alternativa.
- **Ciclo de vida:** perda de contexto tratada; tudo é descartado no unmount.
- **Fallbacks:** sem WebGL2 ou com economia de dados, os estados planos do conceito percorrem o mesmo caminho. Com reduced motion, sem JavaScript ou em telas muito baixas, a sequência estática do manual (p. 8) aparece seguida do logo oficial.

Números medidos em `VALIDATION.md`.

## 8. Segunda iteração: de apresentação de marca a prancheta de estúdio

**O que deixava a versão anterior contida:**
- A história era um único enquadramento repetido quatro vezes: câmera fixa, fundo fixo, objeto parado a 64% da largura, frase à esquerda, mesma mira técnica.
- O objeto lia como macio e de brinquedo: filetes grandes, placa espessa (17% da largura), relevo inflado e luz ampla, sem arestas definidas nem contato com o chão.
- As linhas técnicas eram decoração passiva, que apontava sem informar.
- O fim isolava o logo em uma tela vazia e cortava seco para o conteúdo.

**O que mudou:**
- **Objeto como artefato preciso:** filetes pequenos, placa fina com chanfro, relevo nítido, costura gravada na semente marcando onde ela vai se abrir, acetinado com grão de jateamento e reflexos de softbox que definem a forma.
- **Câmera com planos:** três-quartos para ver a casca abrir e a espessura da placa, frontal para ler o C, e perspectiva que vira ortográfica na troca para o logo.
- **Grid como espaço:** vira o chão em perspectiva onde o objeto se apoia (com sombra de contato) e, no fim, dobra-se para cima até virar o grid plano da página atrás do logo.
- **Cotas reais da marca, no momento em que cada parte se forma:**
  - Ø 186,84 (C externo)
  - Ø 128,94 (abertura)
  - Ø 29,04 (ponto)
  - 282,78 · R 72,76 (ícone)
  - linhas de construção do lockup (topo do ícone = altura-x de "connections", base = linha de base de "hub", nome a 67,62 do ícone)
- **Composição própria por capítulo:** o objeto atravessa o quadro; numeral grande, texto revelado por máscara, tons de atmosfera por etapa (areia na abertura, névoa no C).
- **Selo técnico no hero:** entregas, método, contato e folha; vira o índice dos capítulos durante a história e se repete no rodapé (folha 06/06).
- **Folhas:** cada seção é uma folha com topo arredondado sobre a anterior; a primeira desliza sobre a prancheta.
- **Soluções (direção preservada e refinada):**
  - Composição de front-end: 1440 → 390, componentes e refluxo.
  - Processos integrados: módulos sobre uma base de dados única, com perfis e integração.
  - Dos dados à decisão: fontes → tratamento → indicadores com meta.
  - Da vitrine ao pedido: produto, checkout e o fluxo até estoque e ERP.
  - Cada figura tem código (Fig. 03.x), título e legenda.
- **Manifesto:** o texto ganha cor à medida que é lido.

**Renderização:** continua em campos de distância. O briefing pediu mais mudança de topologia (e um chão que se dobra), e malhas continuariam exigindo trocas visíveis de peças. Para pagar pela nova luz e pela câmera:
- valores de etapa calculados uma vez por pixel;
- ramos uniformes que pulam etapas inativas;
- esfera envolvente por etapa;
- sombra de contato com uma amostra;
- qualidade adaptativa com histerese (desce sob carga sustentada, sobe quando há folga).
