# Validação

> Terceira revisão (08/10/2026): ver a seção ao final, que substitui os números de desempenho abaixo.

Medições de 08/10/2026 (segunda iteração) no build de produção local (`next start`, `127.0.0.1`). Máquina: Intel Core Ultra 5 125H com GPU integrada Intel Arc (ANGLE/D3D11), Chrome headless com GPU real. Nenhuma publicação externa foi realizada.

## Verificações automáticas

- `npm run typecheck` e `npm run build`: aprovados. A página é estática (pré-renderizada).
- `npm run verify`: aprovado. Cobre HTTP 200, metadados, um único h1, âncoras (incluindo uma por serviço), contatos oficiais, assets e copy da marca no HTML. Os SVGs e a Satoshi são idênticos aos originais byte a byte, e o renderer WebGL não entra em nenhum script inicial.
- O projeto não tem lint nem testes unitários.

## Lighthouse (produção)

| Perfil | Performance | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Mobile (2 execuções) | 97–98 | 100 | 100 | 100 | 0,9 s | 2,4–2,5 s | 60–90 ms | 0 |
| Desktop | 100 | 100 | 100 | 100 | 0,2 s | 0,6 s | 0 ms | 0 |

Não há erros de console. O LCP é texto do hero renderizado no servidor, e os 2,4–2,5 s vêm do slow 4G simulado pelo Lighthouse: está no limite da meta de 2,5 s, sem folga. São medições de laboratório; os Core Web Vitals reais dependem de publicação e tráfego.

## Cena 3D

**Quadros apresentados** ao percorrer toda a história em 8 s, com CPU normal:

| Viewport | Quadros | Canvas interno | Thread principal por quadro |
|---|---|---|---|
| 1440 × 900 | 480/480 | 1440 × 900 (resolução total) | 1,7 ms |
| 1920 × 1080 @2x | 480/480 | 2066 × 1162 (orçamento de pixels) | 1,7 ms |
| 2560 × 1440 | 480/480 | 2066 × 1162 | 1,6 ms |
| 390 × 844 @3x | 480/480 em 2 de 3 execuções (162 e 207 na primeira de cada sequência) | 439 × 950 | 1–2 ms |

Nenhuma tarefa longa; heap JS entre 4 e 6 MB. Com a CPU 4× mais lenta (emulação CDP), o resultado varia entre execuções, como na iteração anterior; a causa não foi isolada no modo headless.

**Tempo de GPU por quadro** (1440 × 900, resolução total, com sincronização forçada):
- 6–8 ms na maior parte da história;
- cerca de 10,5 ms no instante em que placa, C pressionado, núcleo e relevo coexistem.

A primeira versão desta iteração custava cerca de 10–13 ms e caía para metade da resolução. Para isolar o problema, cada recurso foi desligado separadamente: um passe vazio custa 0,5 ms e o chão sozinho cerca de 1 ms, então o custo estava no objeto. A otimização veio de três frentes: valores de etapa calculados uma vez por pixel, ramos uniformes e esfera envolvente por etapa.

**Troca para o logo:** os quadros imediatamente antes (WebGL) e depois (SVG oficial) mostram:
- área do navy com diferença de 1,3%;
- centróide deslocado 0,5 px na horizontal e 0,3 px na vertical;
- diferença média de 2,4/255 dentro da região do símbolo.

## Navegador e acessibilidade

- **Viewports percorridos com captura nesta iteração:** 1440 × 900 e 390 × 844 em todas as seções e momentos da história; 820 × 1180 e 360 × 640 na história, em Soluções e no Processo; 1920 × 1080 e 2560 × 1440 no profiling. Comparação antes/depois em `output/qa/antes-depois-historia.png` e figuras de Soluções em `output/qa/solucoes-figuras.png`.
- **Defeito menor conhecido:** em 360 px, o rótulo "Ø 128,94 · abertura" é empurrado para dentro da tela e cruza a própria linha de chamada.
- **Reduced motion e sem JavaScript:** layout estático com a sequência do manual (p. 8) e o logo, sem pin e sem WebGL.
- **Teclado:**
  - O skip link é o primeiro foco, e a ordem de tabulação segue a leitura.
  - O hero fica `inert` quando a história passa dele.
  - O menu mobile prende o foco, deixa o fundo `inert` e fecha com Escape, devolvendo o foco ao botão.
  - O anel de foco terracota fica visível em todos os controles.

## Pendências

- Testes em Safari, Firefox e aparelhos físicos (em especial Android de entrada), para fechar a questão do throttling de CPU acima.
- Core Web Vitals de campo após a publicação.
- Revisão de acessibilidade com leitor de tela real. A auditoria automática não é certificação.
- Validação da copy de escopo dos serviços ("Pode incluir") pela empresa: ela descreve possibilidades de projeto, não trabalhos realizados.
- Cases reais: a galeria só aparece quando `src/data/projects.ts` tiver projetos aprovados.

## Terceira revisão

Build de produção local, mesma máquina.

- **Verificações:** `typecheck`, `build` e `verify` aprovados.
- **Lighthouse mobile:** 97–98 · LCP 2,5 s (no limite da meta) · TBT 30–110 ms · CLS 0.
- **Lighthouse desktop:** 100 · LCP 0,5 s · CLS 0.
- **Lighthouse geral:** acessibilidade, boas práticas e SEO em 100; nenhum erro de console.
- **Quadros apresentados** (história inteira em 8 s): 480/480 em 1440 × 900 (resolução total), 1920 × 1080 @2x, 2560 × 1440 e 390 × 844. Thread principal entre 1,2 e 1,4 ms por quadro, sem tarefas longas.
- **Custo de GPU:** a primeira versão desta revisão custava cerca de 16 ms por quadro em 1440 a resolução total. Os cortes foram: uma leitura de ambiente em vez de duas, uma luz a menos, uma amostra de sombra e AO com 2 amostras. Com sincronização forçada, os momentos finais (placa e C) ainda medem 10–12 ms; é o trecho mais pesado.
- **Movimento:** frames reais da tela foram gravados durante a rolagem, para frente e para trás e em velocidades rápidas, comparando cada quadro com o anterior. A gravação revelou um salto ao voltar a rolagem: o palco "pulava" de estado quando a distância entre o scroll e o estado mostrado passava de 0,2. A regra foi removida e saltos longos agora retrocedem em cerca de 250 ms. Depois da correção não há quadro isolado com salto; os picos restantes são sequências contínuas de movimento rápido.
- **Comparação antes/depois:** `output/qa/revisao-3-antes-depois.png`.

**Limitações:**
- O núcleo areia continua sendo uma esfera simples.
- A composição do hero (texto à esquerda, objeto à direita) mudou pouco.
- Safari, Firefox e aparelhos físicos não foram testados.
