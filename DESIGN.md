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
- **Removido:** Three.js (ver §5; voltou depois, §11 e §12) e o tubo paramétrico.

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

> **Histórico.** Esta cena e o `scripts/bake-symbol-sdf.mjs` não existem mais. Em 17/10 a abertura voltou ao three.js (§11) e em 19/10 virou o símbolo laqueado (§12); o adesivo também usa three.js. Os dois carregam sob demanda.

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

## 11. Abertura automática e conteúdo próprio (17/10/2026)

**Por quê:** visitantes reclamaram que era preciso rolar muito para passar da história fixada (360svh), e o site publicava textos internos do manual da marca.

- **Abertura em uma tela:** sem pin e sem relógio de scroll. A peça toca sozinha assim que a página abre, em cerca de 4,7 s: semente → anéis que giram → C oficial com o ponto → placa. Termina no símbolo em 3D, com leve inclinação seguindo o mouse; clicar repete. No celular, a peça fica acima do texto e tudo cabe na primeira tela.
- **Mesma peça, mesma qualidade:** o renderer three.js e os estados (`orbits.ts`) são os mesmos; só o relógio mudou (`src/lib/hero/timeline.ts`). O motor carrega logo após o HTML; se não ficar pronto em 4,5 s, sem WebGL2, com economia de dados ou em aparelho fraco, a mesma coreografia toca em versão plana e termina no símbolo oficial. Com reduced motion, o símbolo aparece parado.
- **Removido:** capítulos do conceito, assinatura com o logo, "Pessoas. Ideias. Tecnologia." (não é o slogan), a seção Manifesto e os valores. O slogan é "Conectando ideias. Construindo soluções.".
- **Texto próprio:** "Sobre" reescrito sem frases do manual.
- **Privacidade:** aviso fixo na primeira visita. O site não coleta dados pessoais, não usa cookies, rastreadores nem analytics; só o tema e o aviso visto ficam no navegador.


## 12. O símbolo girando, em nível de produto; fotos fora do site (19/10/2026)

**Pedido:** a mesma ideia de antes (a logo girando na abertura), só que feita direito. A abertura de 17/10 parecia uma placa de plástico chapada. Duas tentativas desta data foram reprovadas:
- arcos em órbita que se montavam no logo ("amadora");
- trocar a logo por uma interface de sistema sendo construída ("genérica", e fugia do pedido).

**Regra:** melhorar o conceito pedido, não substituí-lo.

**O que é agora:** o símbolo oficial como objeto físico, renderizado em tempo real (three.js, WebGL2).
- **Geometria do arquivo oficial:** `symbol-navy.svg` é lido e extrudado (placa arredondada, C e ponto), então a silhueta é exatamente a da marca. A placa é espessa, com borda arredondada; o C e o ponto ficam em relevo, com borda suave, e repetidos no verso para o giro.
- **Acabamento laqueado:** corpo acetinado sob um verniz fino e brilhante. As faces ficam na cor da marca e as bordas desenham as luzes do estúdio como linhas limpas. Normais vincadas: suaves na curva, nítidas só nas quinas.
- **Luz de estúdio:** um softbox alto à esquerda, duas tiras verticais para os contornos, uma tira no topo, rebatida quente do papel e um preenchimento frontal. Uma luz-chave suave projeta a sombra da placa no papel atrás dela.
- **Cores:** no tema claro, as do `symbol-navy.svg` (placa navy, C terracota); no escuro, as do `logo-light.svg` (placa terracota, C papel).
- **Entrada (2,6 s):** a placa chega de perfil e gira uma volta e um quarto, rápida no começo e desacelerando, com um leve passo além do ponto antes de assentar em três-quartos. Cresce e sobe enquanto gira, a luz do estúdio corre sobre ela e o ponto encaixa por último.
- **Depois:** a peça segue viva enquanto está na tela, com balanço e flutuação lentos e inclinação na direção do mouse. Pausa fora da tela e com a aba oculta.
- **É uma rodinha:**
  - um peteleco faz girar por muito tempo (atrito quase nulo, até cerca de 10 voltas por segundo);
  - pegar enquanto gira freia na mão, e esse toque não conta como clique;
  - arrastar gira junto, e soltar com velocidade relança;
  - devagar, ela desliza e encaixa de frente.
  - A imagem de reserva não é arrastável e o `pointerdown` cancela o comportamento padrão; antes, arrastar puxava a imagem e cortava o giro.
- **Clique com a peça parada = gota de tinta na própria logo** (shader em `renderer.ts`). Ela cai no ponto clicado, e a próxima combinação oficial de cores se espalha pela peça: navy + C terracota → terracota + C papel → papel + C navy → navy + C papel.
  - **A tinta tem corpo:** um menisco na borda que pega as luzes do estúdio e uma ondulação à frente, ambos por relevo calculado na tela; o brilho molhado seca de volta para o acetinado.
  - **Gravidade:** a tinta corre mais para baixo, com escorridos.
  - **Respingos:** esticados na direção do impacto e absorvidos sem deixar marca.
  - **A peça reage:** afunda e inclina para longe do ponto atingido.
  - O tema do site não muda.
- **Removido:** a aba de puxar o tema na lateral da página (theme-peel). O tema troca só pelo botão do menu.
- **Alternativas:**
  - antes do 3D carregar, o arquivo oficial ocupa o lugar;
  - sem WebGL2, com economia de dados ou em aparelho fraco, o arquivo oficial entra girando em CSS;
  - com movimento reduzido, fica parado.
- **Código:** `src/lib/logo/renderer.ts` e `src/components/hero/hero-logo.tsx`. Em desenvolvimento, `?logo=1200` congela a entrada nesse instante.
- **Medido:** 60 fps em desktop e no celular emulado; o three.js continua fora dos scripts iniciais.

**Sobre: um terminal com código de verdade no lugar da foto.** Um primeiro painel da marca (assinatura e slogan sobre navy) foi reprovado como sem criatividade.

O terminal (`components/code-terminal.tsx`), no navy da marca:
- abas por arquivo, linhas numeradas e cursor terracota;
- realce de sintaxe próprio (`lib/highlight.ts`) com cores só da paleta;
- fonte JetBrains Mono (só para código), sem ligaduras, para mostrar os caracteres exatos.

Digita trechos reais dos projetos (`data/code.ts`, copiados dos repositórios, apenas cortados), em cinco linguagens:
- TypeScript: prazo em horas úteis (WorkHub);
- Rust: restauração de backup sem confiar no arquivo (Tasks);
- SQL: migration de revogação de tokens (WorkHub);
- Ruby: regra única do frete grátis (WSN Loja);
- GLSL: o shader da gota desta página.

O comportamento: **o visitante escreve o código.** A versão de digitação automática foi reprovada como pouco interativa.
- **Com teclado:** clicando no terminal, qualquer tecla escreve os próximos caracteres do arquivo real, já com cores. Backspace volta, Enter completa a linha. Ao terminar, o arquivo é anunciado como completo e o próximo abre.
- **No celular:** um botão "Segure para programar". Segurando, o código sai cada vez mais rápido, com uma vibração leve a cada linha nova.
- Ao lado do código ficam o projeto, a linguagem, o que o trecho resolve e quantos caracteres o visitante já escreveu.
- Com movimento reduzido, ou sem JavaScript, o código aparece completo.
- **Atenção:** Tasks, WorkHub e WSN Loja têm repositório privado; os trechos publicados precisam do aval do dono.

**Adesivo (rodapé), refeito como papel de verdade** (`components/sticker.tsx`, `lib/sticker/peel.ts`). A versão anterior era uma dobra plana com vinco reto, que um clique arrancava com uma animação pronta; foi reprovada.
- Pega-se por qualquer borda e puxa-se de volta por cima dele: o papel enrola numa curva (não vinco), dobra e mostra o verso.
- A cola resiste: a frente de descolamento avança devagar e cede aos saltos, e a linha não é reta.
- Soltar antes da hora cola de novo. Puxar para fora só estica a borda.
- Arrancado, ele fica pendurado no ponto onde foi pego e balança com a gravidade e a aceleração da mão. Solto, cai com a velocidade do arremesso, girando e dando cambalhota, e os créditos aparecem.
- Um clique simples só levanta a pontinha. O teclado tira num gesto.
- Sem WebGL, ou com movimento reduzido, fica o adesivo plano oficial, e o clique o tira.

**Compartilhamento:** `public/images/social.jpg` é desenhada a partir do `logo-light.svg` sobre navy com o grid (`npm run social`), sem foto.

**Removido:** `brand-office`, `brand-people` e `brand-technology` (todas as variantes) e o componente `BrandImage`. O `verify` falha se alguma delas voltar ao HTML e confere que a abertura se apoia no arquivo oficial do símbolo.

## 13. Segurança no lugar do terminal de código (22/10/2026)

**Pedido:** uma seção que mostre que o site que a Connections Hub entrega é seguro, e nada além disso, no lugar do terminal de código do Sobre (o "segure para programar").

**Histórico:** duas versões reprovadas no mesmo dia, e ambas trocaram Soluções por engano.
- Um cartão de código inclinado em CSS, com painel de leitura e listas longas: "lixo".
- Um cofre 3D com chave, IV, adulteração, checagem ao vivo dos cabeçalhos e listas: informação demais para vender a marca.

Soluções voltou como era.

**O que é agora:**
- **Uma mensagem:** "Seguro desde a primeira linha." Uma frase ("Todo site da Connections Hub já nasce protegido. Este aqui é a prova") e três selos curtos: conexão cifrada, só código próprio, seus dados em paz.
- **A peça:** numa janela navy com o grid da marca, o código de segurança deste site (a CSP que `next.config.ts` envia) em peças laqueadas 3D, uma por caractere, no acabamento e na luz da logo da abertura (`components/security/vault.tsx`, `lib/cipher/renderer.ts`).
  - **Ao entrar na tela,** o código é criptografado de verdade no navegador (AES-256-GCM, chave nova que nunca sai da página).
  - Cada peça levanta, gira, troca de caractere e de cor e o bloco fecha retangular em terracota; o contorno do código original fica tracejado.
  - Um botão repete. Arrastar gira.
  - No celular, o código quebra as linhas como num editor e o botão fica abaixo da janela.
- **Promessas verdadeiras:** os selos correspondem aos cabeçalhos que o site envia (`src/lib/security-headers.ts`): HSTS, CSP só com o próprio domínio, `frame-ancestors 'none'`, `nosniff`, Referrer-Policy, Permissions-Policy e COOP. O `verify` confere cada um.
- **Verificação (nossa obrigação):** varredura automática em PT, EN e JA, desktop e celular, usando todas as interações do site. Zero violações de CSP, erros, falhas de rede ou estouro de largura.
- **Removido:** o terminal de código (`code-terminal.tsx`, `data/code.ts`), que também publicava trechos de repositórios privados.

**Refeita em 05/11/2026.** O cofre 3D foi reprovado: "um leigo vai ver isso e não vai entender nada". No lugar, cada selo virou uma história curta que qualquer pessoa entende (`components/security/shield.tsx`), com o mesmo golpe primeiro num **site comum** e depois num **site Connections Hub**:
- **Conexão cifrada:** uma mensagem sai do celular pelo Wi-Fi do café; o curioso na rede lê tudo, ou só vê embaralhado. O embaralhado é o texto que a pessoa digitou, cifrado de verdade no navegador (AES-GCM). Dá para escrever a própria mensagem.
- **Só o que é nosso:** script de outro site, anúncio injetado e página falsa voam até a página; no site comum entram (faixa de prêmio, anúncio, tela pedindo senha), no nosso batem no contorno e voltam com "Barrado".
- **Seus dados em paz:** no site comum, rastreadores montam um perfil da visita; no nosso, "Nenhum rastreador" e o perfil fica vazio.
- A barra de endereço mostra o que o navegador mostraria ("Não seguro" ou o cadeado). Terracota marca o que dá errado; areia, o que está protegido.
- Ao entrar na tela, as três tocam sozinhas uma vez. Clicar num selo, no seletor ou em "Ver de novo" assume o controle.
- Em CSS e SVG, sem three.js. Os estilos em repouso são o último quadro, então movimento reduzido e sem JavaScript mostram direto o final no nosso site. Em janelas estreitas cada história corre de cima para baixo (container query).

## 14. Blog (03/11/2026)

**Pedido:** um lugar para artigos, opiniões, análises e bastidores de projetos, no espírito do blog do Akita (akitaonrails.com), com anúncios como na página de notícias da Anthropic. O dono escreve; o Claude revisa sem reescrever.

**Referência e o que foi adaptado:**
- O Akita usa Hugo, um `index.md` por post e endereços por data. Aqui o blog fica no próprio Next.js, para manter o design system, os três idiomas e o deploy pela Vercel.
- Dele vêm os endereços por data, a listagem agrupada por mês, o índice "Nesta página", o resumo no topo, os temas, o RSS e o link para o post vizinho.
- Não veio o Disqus: quebraria o aviso de privacidade (sem cookies e sem terceiros). No lugar, "Responder por e-mail".

**Conteúdo:**
- `content/blog/AAAA/MM/DD-slug/index.md` (traduções em `index.en.md` e `index.ja.md`), com as imagens na mesma pasta.
- O cabeçalho é validado no build (`src/lib/blog/posts.ts`): um campo errado para o build com o nome do arquivo e do campo.
- Rascunhos aparecem só no `npm run dev` ou num build com `BLOG_DRAFTS=1`, sempre com `noindex` e fora do sitemap e do RSS.

**Renderização:**
- Markdown → HTML no servidor, com remark e rehype (`src/lib/blog/markdown.ts`): tabelas, notas, listas de tarefas, âncoras nos títulos e HTML sanitizado.
- O código usa o realce próprio do site (`lib/highlight.ts`, o mesmo da peça da Segurança, agora com shell e JSON), nas cores da marca, em vez de um tema pronto.
- As imagens recebem a largura e a altura reais no build, para não deslocar o layout.
- A página do post não manda JavaScript próprio; o `verify` confere que nenhuma lib de Markdown chega ao navegador.
- O `@next/mdx` foi descartado: é feito para páginas com JSX e não lê o cabeçalho sem plugins extras. Posts em Markdown puro são mais simples de escrever e de revisar.

**Rotas:**
- `/blog`, `/blog/AAAA/MM/DD/slug`, `/blog/anuncios`, `/blog/tags/[tag]` e `/blog/rss.xml`, mais as imagens ao lado de cada post. Tudo estático.
- O português fica na raiz, como a home (`next.config.ts` reescreve `/blog` para `/pt/blog`). Inglês e japonês ficam em `/en/blog` e `/ja/blog`, com o mesmo slug.
- **Pegadinha:** nas rotas internas, o `generateStaticParams` precisa devolver todas as combinações, com o idioma junto. Uma lista montada só a partir do idioma recebido do layout `[lang]` foi ignorada pelo build e as páginas não foram geradas.

**Desenho:** o caderno de trabalho sobre o papel da marca.
- **Listagem:** linhas finas separam os meses, cada um com a contagem de posts; cada post mostra o dia, o tipo, o título, o resumo e os temas.
- **Ponto terracota:** marca os anúncios e o lugar atual.
- **Post:** coluna de leitura de cerca de 68 caracteres e índice fixo ao lado. No celular, o índice fica dobrável acima do texto.
- **Código:** no navy do terminal.
- **Fim do post:** a caixa de conversa no navy e os posts vizinhos.

**Menu:** ganha "Blog". Fora da home, os links das seções levam de volta a ela (`/#sobre`). O `AnchorJump` trata `/#sobre` como link interno quando já se está na home. O seletor de idioma, dentro do blog, leva ao blog do outro idioma.

**Escrita e revisão:** `npm run post:new` cria o rascunho. `content/blog/GUIA.md` define o fluxo, o cabeçalho e as regras da revisão: o revisor aponta, com a menor correção em diff, e não reescreve nem muda a opinião. A regra também está no `CLAUDE.md`.

## 15. Comentários com aprovação (03/11/2026)

**Pedido:** comentários nos artigos, que só aparecem depois que o dono aprova e que podem ser apagados a qualquer momento.

**Escolhas do usuário:** banco Neon Postgres (integração da Vercel); nome + comentário + e-mail opcional que nunca aparece; login com GitHub no painel; sem aviso por e-mail (o painel mostra os pendentes).

**Como funciona:**
- **Envio:** o formulário no fim do post é HTML puro e funciona sem JavaScript. Ele envia para `POST /api/comments`, e a resposta redireciona de volta ao post numa âncora (`#comentario-enviado` ou `#comentario-erro-…`) que o CSS revela com `:target`. A página do post continua estática.
- **Leitura:** a lista dos aprovados é buscada no navegador (`GET /api/comments?post=…`, cache de 10 s). Por isso um comentário aprovado aparece e um apagado some sem rebuild do site. É o único JavaScript próprio da página do post. Nome e texto são exibidos como texto, nunca como HTML.
- **Moderação:** `/admin/comentarios` mostra primeiro os pendentes. Os botões:
  - **Aprovar:** publica o comentário;
  - **Apagar:** um `DELETE` de verdade, para pendentes e publicados.

  O painel é só em português, tem layout próprio e não é indexado.
- **Login:** OAuth App do GitHub, sem escopo nenhum (só para saber quem é). Só a conta em `ADMIN_GITHUB_LOGIN` entra. A sessão é um cookie HttpOnly assinado com `SESSION_SECRET`, por 12 horas. É o único cookie do site, e só o dono o recebe. As ações exigem a sessão e a mesma origem.
- **Spam, sem captcha de terceiros:**
  - um campo escondido que só robôs preenchem: o comentário é descartado e o robô recebe "enviado";
  - 3 envios por pessoa a cada 10 minutos;
  - um teto de 300 pendentes.
- **Privacidade:** o IP nunca é guardado. Para o limite de envios, um hash do IP com chave fica numa tabela à parte (`comment_attempts`), separado dos comentários, e é apagado depois de 10 minutos. A checagem dos limites e a gravação acontecem numa única instrução SQL, para envios paralelos não furarem o limite, e moderar um comentário não zera a contagem. O aviso de privacidade e o selo "Seus dados em paz" foram reescritos para dizer o que é guardado quando alguém comenta. O aviso subiu de versão e aparece de novo uma vez.

**Região:** o banco Neon fica em São Paulo, e o `vercel.json` põe as funções do site em São Paulo também (`gru1`). Assim cada consulta não atravessa EUA–Brasil, e os dados dos comentários ficam no país.

**Desenvolvimento local:**
- `DATABASE_URL=pglite:./.pglite` roda um Postgres dentro do Node (PGlite, dependência de desenvolvimento), sem instalar nada.
- `ADMIN_DEV_LOGIN=1` entra no painel sem GitHub, e só no `npm run dev`.

**Pegadinhas:**
- O PGlite precisa ficar fora do bundle (`serverExternalPackages`) e ter uma instância só por processo (em `globalThis`). O dev carrega páginas e rotas como grafos de módulos separados, e duas instâncias na mesma pasta viam dados diferentes.
- No dev, `request.url` diz `localhost` mesmo quando o navegador usa `127.0.0.1`. Por isso os redirecionamentos e a checagem de origem usam o cabeçalho `Host` (ou `X-Forwarded-Host`).
- As rotas que leem posts em tempo de execução precisam dos arquivos Markdown no deploy (`outputFileTracingIncludes`).
- Qualquer falha do banco (rede, timeout, Neon suspenso) ou um `SESSION_SECRET` ausente vira "indisponível" para o visitante, nunca um erro 500; a causa fica no log.
- A CSP continua igual: tudo é da própria origem, o formulário posta para o próprio site (`form-action 'self'`) e o login é uma navegação até o GitHub, não um formulário.

**Verificação de segurança (03/11/2026, a pedido do usuário):**
- **Bombas de descompressão:**
  - O servidor não descompacta o corpo das requisições. Um gzip de 200 KB que se expandiria para 200 MB foi recusado em 10 ms, sem gasto de memória, e agora qualquer `Content-Encoding` é recusado explicitamente (415).
  - Imagens de post com mais de 40 milhões de pixels ou 15 MB param o build. O `sharp` só lê o cabeçalho, nunca os pixels.
  - O único corpo comprimido que o servidor lê é a resposta do GitHub no login, que tem prazo de 8 s.
- **Corpo gigante:** antes, um envio de 60 MB era lido inteiro (cerca de 120 MB de memória a mais). Agora o corpo é recusado acima de 64 KB, antes de ler (pelo `Content-Length`) e durante a leitura (envio em partes). Aceita só formulário URL-encoded, sem multipart.
- **XSS:** nome e comentário são sempre texto (React escapa). Um `<script>` enviado aparece escrito no painel e no post. Caracteres invisíveis e de direção da escrita são removidos, e o texto é normalizado (NFC). E-mails com caracteres que acrescentariam parâmetros a um link `mailto:` são recusados.
- **Redirecionamentos:** só para endereços do próprio site (domínio de produção, URLs da Vercel, localhost). Um `Host` falsificado leva ao domínio oficial.
- **Prompt injection:**
  - Comentários são texto de visitantes. Uma regra no `CLAUDE.md` diz que nenhum assistente segue o que eles pedem nem aprova ou apaga comentários por conta própria.
  - O painel marca com um aviso os textos que parecem ordens para uma IA ou spam de links. O aviso só informa: a decisão continua com o dono.
  - **Risco que fica:** um comentário aprovado pode enganar a IA de quem lê a página, como um assistente que resume posts. A aprovação existe também para isso: não aprovar o que tem instruções escondidas (`GUIA.md`).

## 16. Editor de posts no painel (03/11/2026)

**Pedido:** escrever posts pelo próprio site, numa interface de administrador, sem terminal nem git.

**Escolhas do usuário:** revisão antes de publicar (PR com preview, depois um botão Publicar), rascunhos no banco Neon e acesso ao GitHub por um token só deste repositório.

**Como funciona** (`/admin/posts`, mesmo login do GitHub dos comentários):
- **Lista:** rascunhos (escrevendo ou em revisão) e posts publicados; **Novo post** abre um rascunho vazio.
- **Editor** (`components/admin/editor.tsx`):
  - campos de título, resumo, tipo, temas, endereço e resumo em destaque;
  - texto em Markdown com uma barra de formatação para o que é fácil de esquecer (negrito, seção, link, lista, citação, código, imagem) e atalhos Ctrl+B, Ctrl+I e Ctrl+K;
  - prévia ao lado, gerada pelo mesmo código do post publicado (`renderMarkdown`);
  - salva sozinho 1,2 s depois de cada mudança; no celular, abas "Escrever" e "Prévia".
- **Imagens:** arrastar, colar ou escolher. No servidor, o `sharp` decodifica com teto de 40 MP (bombas falham), corrige a orientação, reduz para no máximo 2000 px de largura e regrava em WebP, o que também tira os metadados (câmera, localização). Até 4 MB por envio (limite da Vercel) e 40 por post.
- **Pedir revisão:** valida como o build valida, gera o `index.md` e grava post e imagens num único commit na branch `post/<slug>` (Git Data API), abrindo um PR para o `main`. A Vercel gera o preview. O dia da primeira revisão dá nome à pasta e é a data do post (meio-dia em Brasília). Depois disso o endereço fica fixo, porque a branch leva o nome dele. **Atualizar a revisão** faz um commit novo no mesmo PR.
- **Publicar:** só com o check da Vercel verde. Faz o merge do PR e apaga a branch, e o deploy de produção publica o post.
- **Descartar:** fecha o PR, se houver, e apaga o rascunho.
- Os botões que mexem no GitHub pedem um segundo clique. A barra de formatação não rouba o foco do texto: o clique é cancelado no `mousedown`.

**Por que PR e não gravar direto:** o post continua sendo um arquivo Markdown no repositório, com histórico, preview e revisão. O site segue estático, e o editor só escreve no GitHub em nome do dono.

**Segurança:**
- **Acesso:** todas as rotas exigem a sessão do dono e a mesma origem. O token (`GITHUB_CONTENT_TOKEN`) só alcança este repositório.
- **Corpos das requisições:** JSON até 256 KB e imagens até 4 MB, recusados se comprimidos.
- **Prévia:** sai sanitizada pelo mesmo pipeline do site.
- **Imagens do rascunho:** só o dono as vê, e elas não ficam em cache compartilhado.

**Correções da revisão de código** (10 achados, todos corrigidos):
- **Imagens:** com o mesmo nome (duas capturas de tela são ambas `image.png`), viram `image-2.webp` em vez de se sobrescrever; várias de uma vez entram todas, em ordem, no texto atual.
- **Publicar:**
  - recusa se o rascunho mudou depois da última revisão: uma impressão digital do arquivo enviado é comparada com o rascunho atual;
  - faz o merge só do commit exato cujo check passou (`sha`), e o GitHub recusa se a branch andou.
- **Endereço:** um endereço já usado por outro post, rascunho em revisão ou branch é recusado antes de criar a branch. O campo aceita hífen enquanto se digita e é limpo ao sair dele.
- **Temas:** vão entre aspas no cabeçalho (`2025` e `null` viravam número e nada, e quebravam o build).
- **Limites:** o JSON aceita até 1 MB (um texto longo e acentuado passava de 256 KB). Regras e limites ficam em `lib/editor/shared.ts`, usado pelo navegador e pelo servidor.
- **Banco:** as imagens da revisão saem numa consulta só.

**Testado:** de ponta a ponta contra um GitHub falso local (`GITHUB_API_URL`): criar, salvar, prévia, imagem (EXIF removido, 3000 → 2000 px), arquivo que não é imagem, revisão incompleta e completa, segunda revisão no mesmo PR, publicar e descartar. Um post gerado pelo editor passou pelo build de produção. O GitHub de verdade só depois do token.

## 17. Soluções: do problema à solução (06/11/2026)

**Pedido:** os desenhos técnicos da seção ("o esboço") pareciam amadores. O usuário pediu o mesmo padrão da Segurança nova: moderno, bem feito e responsivo.

**O que é agora** (`components/solutions/stage.tsx`): o título da seção virou a história. Cada serviço tem uma cena em duas partes, **o problema** e **a solução**:
- **Sites:** a busca por "clínica veterinária perto de mim" não mostra a empresa e o site tem 0 contatos. Depois: 1º na busca, o mesmo site no computador e no celular, e chega um contato.
- **Sistemas e ERP:** planilhas espalhadas com estoque 12 numa e 7 na outra, e "só a Maria sabe atualizar". Depois: os arquivos se juntam num sistema só, o pedido passa de Novo a Separado e a Faturado, e o estoque baixa sozinho de 12 para 11.
- **Dashboards:** "Quanto vendemos este mês?" respondido em 3 dias, com o calendário virando. Depois: um painel ao vivo, com números contando, a linha de vendas contra a meta e a unidade abaixo da meta marcada.
- **E-commerces:** mensagens sem resposta às 23h e clientes que desistem. Depois: o cliente escolhe, paga e recebe o pedido às 23:41, com o estoque atualizado e o fluxo do catálogo ao estoque aceso passo a passo.

**Linguagem:** o problema aparece no escuro, com alertas em terracota; a solução é uma interface clara de produto, em off-white, navy e areia. Os dados são fictícios.

**Comportamento:**
- No desktop, uma janela fixa acompanha o serviço lido (o `data-active` do scroll-spy). Cada troca toca o problema e depois a solução.
- No celular, cada serviço tem a sua janela, que toca quando aparece na tela.
- O seletor e "Ver de novo" assumem o controle.

**Técnica:**
- As cenas são medidas em em, a partir da largura da janela (container query). Elas mantêm a composição do desktop ao celular; abaixo de 520 px, as colunas que apertariam viram uma só.
- Os estilos em repouso são o último quadro, então movimento reduzido e sem JavaScript mostram a solução.

**Removido:** `components/schematic.tsx` e o `[data-draw]` do `scroll-effects.tsx`, que só os desenhos usavam.

## 18. Projetos: a pilha 3D explicada em palavras simples (06/11/2026)

**Pedido:** melhorar bastante a seção.
- **Primeira tentativa, reprovada:** um modo "caso de cliente", com a interface de frente e a pilha 3D escondida atrás de "Ver por dentro". O usuário respondeu: "acho que os projetos estavam melhores".
- **Lição:** a pilha 3D é o que impressiona e deve continuar como protagonista. A explicação para leigos entra em cima dela, sem esconder nada.

**O que mudou:**
- **Ela se mostra sozinha:** na primeira vez que a bancada fica bem visível, o "Ver em ação" começa por conta própria (1,8 s depois de a pilha abrir). Não começa se a pessoa já usou a interface, nem com movimento reduzido. Pôr a mão ou sair da tela pausa, como antes.
- **Camadas com nome simples:** "O que você vê", "O que processa", "Onde guarda" e "Com quem conversa" nas etiquetas e no painel. Logo depois vem o nome técnico e a stack (`plain` no dicionário).
- **Cada ação explicada em uma frase** (`effects`, uma por fluxo). Exemplo: "O post foi para o cliente aprovar, e ele recebeu um aviso no celular".
  - A frase aparece como aviso no palco e fica no registro "O que acabou de acontecer", no topo do painel.
  - O aviso some durante a demonstração, que já tem a sua legenda.
- **A história no painel,** antes da ficha técnica: para quem é, o desafio e o que construímos. O desafio descreve o problema que o produto resolve, não um histórico inventado do cliente.
- **Ficou igual:** o título, as miniaturas, os fluxos, o raio-X, a ficha, os números do repositório e as regras da seção.

## 19. Processo como jornada, e o rodapé completo (06/11/2026)

**Pedido:** a seção das quatro etapas, "interativa, bonita e amigável", e um rodapé menos simples.

**Processo** (`components/process/journey.tsx`). A rosca que preenchia com a rolagem deu lugar a uma jornada. Um projeto de exemplo, a clínica veterinária das cenas de Soluções, vive cada etapa numa janela navy, como a da Segurança:
- **Entendemos:** a primeira conversa; o que foi ouvido vira post-its; nasce o diagnóstico.
- **Planejamos:** prioridades ("Essencial" / "Depois"), as etapas numa linha do tempo e a decisão explicada em linguagem simples.
- **Desenvolvemos:** a tela vai do rascunho (v0.1) à v1.0, e o comentário do cliente é atendido na v0.2.
- **Implementamos:** "No ar", a agenda enchendo, equipe treinada e dados migrados, e o suporte respondendo.
- Cada etapa termina com um aviso do que o cliente recebeu.

**Como funciona:**
- Abas grandes com barra de progresso avançam sozinhas (8,5 s por etapa) enquanto a seção está na tela.
- Clicar numa aba, usar as setas do teclado ou os botões anterior/próximo assume o controle.
- Os textos e o "Você recebe" de cada etapa continuam os da marca.
- As cenas reaproveitam o canvas das cenas de Soluções (`.sx`).

**Rodapé** (`components/footer.tsx`):
- o slogan como frase de fechamento e um botão "Voltar ao topo";
- quatro colunas: o site, as soluções, os contatos e o idioma;
- o logo oficial na largura toda, só em escala, revelado de baixo para cima quando a página termina;
- embaixo, o copyright, "Sem cookies e sem rastreadores" e o crédito.

**Removido:** a rosca do Processo, os tokens `--dial-*` e o `[data-progress]` do `scroll-effects.tsx`, que só ela usava.

## 20. Contato com montador de mensagem e o adesivo novo (06/11/2026)

**Pedido:** a área de contato e o adesivo estavam "muito ruins".

**Contato** (`components/contact/composer.tsx`). Ao lado da pergunta, um cartão de papel monta a mensagem:
- a pessoa escolhe o que precisa (Site, Sistema ou ERP, Dashboard, E-commerce, Ainda não sei), escreve uma linha e, se quiser, o nome;
- a prévia aparece como um balão de conversa;
- os botões abrem o WhatsApp (`wa.me` com o texto) ou o e-mail (`mailto:` com assunto e corpo) do próprio visitante, com a mensagem pronta;
- o site não envia nem guarda nada, então a promessa de privacidade continua valendo, e o cartão diz isso;
- os canais diretos (WhatsApp, e-mail e telefone) ficam embaixo da pergunta;
- no celular, o cartão vem logo depois da pergunta, e os canais e o adesivo vêm em seguida.

**Adesivo** (`components/sticker.tsx`). O de descolar em three.js (`lib/sticker/peel.ts`), que quase ninguém descobria como usar, saiu. No lugar:
- um adesivo de vinil com o ícone oficial numa margem de papel recortada e brilho holográfico;
- ele se inclina na direção do mouse, com a luz andando sobre ele;
- um clique (ou Enter) o vira, e o verso assina o site, com o link para o GitHub ao lado;
- é tudo em CSS. Com movimento reduzido, não se inclina e vira sem animação.

## 21. Sobre: a frase viva e os quatro cartões (06/11/2026)

**Pedido:** melhorar a seção Sobre, que era um título, dois parágrafos e uma tabela de quatro linhas.

**O que é agora** (`components/about/board.tsx`):
- **Uma frase viva:** abaixo do título, "Construímos [sites]", com a palavra trocando a cada 2,2 s (sistemas e ERP, dashboards, e-commerces, aplicativos) e um sublinhado que marca o tempo. Leitores de tela recebem a lista inteira.
- **As quatro linhas viraram cartões,** cada um com uma pequena cena e um atalho para a seção que prova o que ele diz:
  - **Construímos:** os cinco tipos de produto, que acendem junto com a palavra → Soluções.
  - **Para:** "Os pedidos se perdem no WhatsApp" é riscado e vira "Resolvido" → Projetos.
  - **Do:** o ponto da marca percorre as quatro etapas do Processo → Processo.
  - **Com:** você e quem desenvolve, ligados direto, numa troca de mensagens → Contato.
- **Animação:** as cenas tocam quando os cartões entram na tela e de novo ao passar o mouse. Com movimento reduzido, a palavra fica parada e as cenas mostram o último quadro.
- **Removido:** a tabela "spec" e as regras de revelação que só ela usava.

## 22. Adesivo de volta, Soluções direto ao ponto e a abertura refinada (06/11/2026)

**Adesivo.**
- **Reprovado:** o adesivo holográfico de virar (§20). Nas palavras do usuário, "ficou um lixo" e "genérico".
- **Voltou o de descolar,** em 3D (`components/sticker.tsx`, `lib/sticker/peel.ts`), com toda a física: cola que resiste, papel que enrola, adesivo pendurado na mão, arremessar e colar de volta.
- **Acabamento de vinil:** verniz, um filme iridescente discreto nas cores da marca (areia, mist e terracota, nunca arco-íris) e um reflexo que segue o mouse mesmo com o adesivo colado. O verniz foi dosado para o navy do símbolo continuar navy.
- **Convite:** na primeira vez que aparece inteiro na tela, o canto levanta alto e volta; uma seta desenhada à mão se traça até ele, com "Puxe pelo canto".
- **Tamanho:** passou de 132 para 156 px (124 no celular).

**Soluções.** Pedido: "animação só de soluções, ninguém perde tempo olhando muito".
- Saíram a parte do problema, o seletor problema/solução e os textos que só ela usava.
- Cada janela toca só a solução, uma vez, quando aparece. As entradas ficam 40% mais rápidas na janela (`--pace: .6`, que também escala os tempos fixos).
- "Ver de novo" fica no cabeçalho da janela, e a frase do resultado embaixo.

**Abertura.** Pedido: melhorar sem perder o símbolo 3D, com cara de design profissional.
- **Prancheta de estúdio** em volta do símbolo, na linguagem de desenho técnico da marca: marcas de registro nos cantos, uma órbita tracejada com o ponto terracota (uma volta por minuto) e a legenda "Fig. 01 — Símbolo oficial · Laca · 3D em tempo real". Tudo em baixo contraste.
- **As quatro cores oficiais** do símbolo como amostras: a que ele veste fica marcada, e escolher outra joga a gota de tinta dela sobre ele.
  - O renderer ganhou `splash(x, y, to)` e `colourway`.
  - As cores ficam em `lib/logo/colourways.ts`, para a página não carregar o three.js só por elas.
- **Uma dica** ("Arraste para girar · clique para pintar"), que some no primeiro uso.
- **Fechamento:** o índice das soluções numerado e "Role para conhecer", com uma linha que cai.

## 23. Vidro: a vitrine dos Projetos e a abertura (06/11/2026)

**Pedido:** a moldura da abertura (§22) foi reprovada ("que lixo"), e Projetos tinha "zero criatividade". O usuário pediu estilo glass e escolheu a "vitrine cinematográfica".

**Projetos** (`components/projects/showcase.tsx`).
- **No computador,** a seção é uma trilha de rolagem com um palco preso na tela, e a rolagem é a câmera: o projeto que sai sobe e some, o próximo sobe de baixo.
- **Cada projeto toma o palco:**
  - atrás, três luzes difusas nas cores do próprio produto (terracota e navy no Marketing, grená no WorkHub, azul e verde na WSN, laranja-queimado no Tasks), derivando devagar;
  - mais atrás, o nome do projeto enorme, desfocado pelo vidro;
  - na frente, uma tela de vidro fosco com a interface funcionando. Ela fica no tamanho em que foi desenhada e é escalada inteira para caber, sem refluxo nem corte;
  - ao lado, um "celular" de vidro com a história: resumo, para quem, desafio, o que construímos e o que acabou de acontecer.
- **Cada ação da interface** diz em uma frase o que fez.
- **"Ver em ação"** conduz a interface com o anel da marca e uma legenda sobre a tela; pôr a mão para.
- **"Ver por dentro em 3D"** abre a pilha 3D (explorer.tsx), já no projeto, numa janela sobre a página. Ela continua no HTML, então os fatos dos repositórios seguem verificáveis.
- **Embaixo,** os projetos como pontos, para pular direto, e a barra de quanto da trilha já foi.
- **Abaixo de 1100 px,** os projetos vêm um embaixo do outro, cada um no seu vidro, com a interface em retrato no celular.

**Abertura.** Saíram as marcas de registro, a órbita, a legenda e o "Role para conhecer".
- Atrás do símbolo 3D, luz suave da marca sob uma placa de vidro fosco; as duas derivam um pouco com o ponteiro, em profundidades diferentes, e a placa inclina levemente.
- As cores oficiais ficam numa pílula de vidro.

