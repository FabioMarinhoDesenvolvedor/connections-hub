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

## 9. Terceira revisão: menos, melhor

**Removido** (decoração que não informava):
- numeração de seções e capítulos, "Folha 0x/06", selo técnico e índice;
- cotas, linhas de chamada e de construção;
- chão quadriculado e grids fora de Soluções;
- bordas de folha entre todas as seções (fica só a entrada de Sobre sobre o palco);
- numeração dos valores e do menu.

**Objeto reconstruído com as medidas do símbolo:** em vez de uma esfera com "íris" e uniões de argila, uma esfera oca cuja parede é exatamente o anel do C, aberta por um único corte plano. A face de corte é o anel do C, de onde o C oficial é recortado. O ponto sai do núcleo areia (a ideia gera o ponto de encontro); a placa é o quadrado oficial crescendo por trás; uma linha de partição fina marca onde a semente abre. Arestas com filete de cerca de um pixel e luz de estúdio mais calma (uma leitura de ambiente, faixas de recorte suaves).

**Narrativa:** 3 momentos em vez de 4 e 360svh de rolagem em vez de 520, com o texto do manual num lugar fixo e sem numerais.

**Encerramento:** contato e rodapé numa única superfície navy (a mesma em que o filme da marca termina): um convite, dois canais diretos com o número e o endereço visíveis, uma linha final com o logo oficial claro, a navegação e o ©.

**Preservado:** Soluções inteira (figuras, placa, interação), vetores, fonte, conteúdo factual, acessibilidade e reduced motion.

**Renderização:** continua em campos de distância. O corte plano, o C recortado e a placa crescendo são operações exatas sobre as medidas do símbolo, e a troca de topologia continua inviável com malhas trocadas.

## 10. Projetos: abertos por dentro (15/10/2026)

**Histórico:** duas versões reprovadas. A primeira (14/10) era uma pilha abstrata de placas gravadas; não mostrava os projetos. A segunda (15/10) separava prints das telas em camadas no WebGL: imagem parada, sem tema, sem responsividade.

**Direção:** cada projeto é desmontado na stack em que foi construído, em **DOM real com CSS 3D**: o texto continua nítido, o tema é o da página e a placa de cima é a interface funcionando.

1. **Interface:** o produto reconstruído no próprio design (cores, raios e tipografia de cada sistema, em claro e escuro), com dados fictícios e ações de verdade: enviar um post ao cliente, atender um chamado, encher o carrinho até o frete grátis, criar tarefa escrevendo "amanhã !alta #casa", trocar idioma e tema.
2. **Serviços**, **3. Dados**, **4. Infraestrutura:** módulos, tabelas e sistemas externos com os nomes que têm no código.

- **Materiais por camada:** serviços numa placa escura de módulos, cada um com uma rota real e o número de rotas; dados como diagrama ER em papel, com colunas e chaves estrangeiras reais (lidas do esquema gerado pelas migrations de cada projeto) e as relações desenhadas; infraestrutura como sistemas num barramento de rede, cada um com seu papel. Clicar num nó abre os detalhes dele na ficha.
- **Ver em ação:** um roteiro por projeto executa um fluxo real de trabalho na interface viva. O anel oficial da marca (`ring-orange.svg`, sem distorção) vai até cada controle, digita e clica; a pilha e o inspetor respondem como responderiam a um visitante; legenda e linha do tempo acompanham. Pôr a mão na interface pausa. No celular é a forma principal de ver.
- **Raio-X:** passar o ponteiro num botão mostra, antes do clique, o caminho que ele percorre; num módulo, tabela ou sistema, liga tudo que depende dele nas quatro camadas. Linhas de chamada tracejadas; o resto esmaece.
- **O dado nascendo:** a linha escrita aparece dentro da tabela no 3D (+ inserção, ~ atualização), e o inspetor mostra requisição (com o corpo, quando conhecido do código), serviço, SQL com as colunas reais e os valores da ação, efeito externo e resposta.
- **Fidelidade à marca:** placa de serviços no navy oficial com o grid fino da marca; nada de LED, neon ou brilho. O ponto terracota é o ponto de encontro: marca o que a interface alcança e onde algo acontece; a resposta volta como o anel areia sobre navy.
- **Fluxo:** cada ação da interface vira uma requisição desenhada no espaço 3D: um raio sai do controle clicado, acende o módulo do serviço, a tabela e o sistema externo, nesta ordem. Cada parada recebe o carimbo do que aconteceu ali (método HTTP no serviço, operação SQL na tabela) e a resposta sobe de volta até o controle. O painel escreve a mesma rota (por exemplo `POST /api/cards/:id/enviar-ao-cliente → UPDATE cards → Web Push`). Os raios vivem num mundo gêmeo por cima, para as placas não os esconderem.
- **Desenho:** placas em escada (afastadas na normal e deslocadas para a frente), com espessura, linhas tracejadas ligando os cantos e chamadas laterais que sempre olham para o leitor, com o nome da camada e a stack. O que a interface alcança fica na faixa da placa que nunca é coberta.
- **Vida:** a interface pega um brilho do ponteiro, mas nada se move sob ele (um alvo que foge do cursor não se clica); uma sombra de contato a assenta na bancada; o primeiro controle da interface pulsa até o primeiro uso; trocar de projeto recua a cena antes da próxima entrar; os números da ficha contam ao aparecer.
- **Cliques confiáveis:** dentro do 3D o navegador pode reapontar um clique (ajuste de toque, ou a soltura do mouse caindo uns pixels fora); apertar e soltar no mesmo controle sempre o aciona, uma única vez. Usar a interface não muda a camada aberta na ficha.
- **Interação:** arrastar gira; passar o mouse levanta a camada; clicar abre a ficha dela no painel (e vice-versa). "Ver de frente", ou a etiqueta da camada clicada de novo, traz ela para a frente; um clique solto na placa só a seleciona, plana e legível; no celular é assim que se usa a interface.
- **Entrada:** a interface chega de frente e, ao entrar na tela, a pilha se abre embaixo dela.
- **Enquadramento:** calculado com a perspectiva, para a pilha nunca encostar nas bordas. Tamanho da placa, espaçamento e pose mudam por breakpoint (placas em retrato no celular, onde cada interface se reorganiza por container query).
- **Ficha:** números lidos dos repositórios (endpoints, tabelas, migrations, arquivos de teste), o papel de cada tecnologia e a última requisição.
- **Sem JavaScript:** a ficha e as camadas estão no HTML. Com reduced motion, tudo funciona, sem transições e sem raios.
- **Projetos:** Marketing Dashboard, WorkHub, WSN Loja, Tasks e este site. Só este site tem repositório público; o perfil do GitHub está no menu, no rodapé e na seção.

**Menu:** um link interno que leva a mais de 1,5 tela de distância não rola: a página some em 150 ms, salta e volta já na seção, sem tocar as cenas no caminho (`src/components/anchor-jump.tsx`).
