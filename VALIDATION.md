# Validação

Medições de 08/10/2026 no build de produção local (`next start`, `127.0.0.1`). Máquina: Intel Core Ultra 5 125H com GPU integrada Intel Arc (ANGLE/D3D11), Chrome headless com GPU real. Nenhuma publicação externa foi realizada.

## Verificações automáticas

- `npm run typecheck` e `npm run build`: aprovados. A página é estática (pré-renderizada).
- `npm run verify`: aprovado. Cobre HTTP 200, metadados, um único h1, âncoras (incluindo uma por serviço), contatos oficiais, assets e copy da marca no HTML. Os SVGs e a Satoshi são idênticos aos originais byte a byte, e o renderer WebGL não entra em nenhum script inicial.
- O projeto não tem lint nem testes unitários.

## Lighthouse (produção)

| Perfil | Performance | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Mobile (3 execuções) | 98 | 100 | 100 | 100 | 0,9 s | 2,4 s | 50–60 ms | 0 |
| Desktop (2 execuções) | 100 | 100 | 100 | 100 | 0,2–0,3 s | 0,5–0,6 s | 0 ms | 0 |

O peso total da página é de 281 KiB e não há erros de console.

O elemento de LCP é o parágrafo de abertura do hero: texto do servidor que não depende de JavaScript nem de 3D. O LCP de 2,4 s é o slow 4G simulado pelo Lighthouse; o atraso de renderização medido localmente é de cerca de 110 ms.

Antes da compilação paralela do shader, o TBT mobile era de 810 ms, uma única tarefa longa causada pela compilação síncrona. Essas são medições de laboratório; Core Web Vitals reais (LCP, INP, CLS) dependem de publicação e tráfego.

## Cena 3D

**Tempo de GPU por quadro**, com sincronização forçada após cada draw, ao longo de toda a história:

| Viewport | Canvas interno | Mediana | p95 |
|---|---|---|---|
| 1440 × 900 @1x | 1440 × 900 | 5,6 ms | 9,1 ms |
| 1920 × 1080 @2x | 1756 × 988 | 7,4 ms | 9,7 ms |
| 2560 × 1440 @1x | 1492 × 839 | 6,9 ms | 10,1 ms |
| 390 × 844 @3x | 439 × 950 | 3,8 ms | 4,5 ms |

**Quadros apresentados** ao percorrer toda a história em 8 s:
- **CPU normal:** 480/480 em todos os viewports acima (60 fps). A thread principal gasta 1,6–1,9 ms por quadro, sem tarefas longas, com heap JS de cerca de 4,5 MB.
- **CPU 4× mais lenta (emulação CDP):** a thread principal sobe para 3–5 ms por quadro, mas o número de quadros apresentados variou entre execuções do mesmo build (de 480/480 a 57/478). A causa não foi isolada no modo headless.

Dois problemas encontrados e corrigidos durante o profiling:
- A sombra marchada custava 20 amostras por pixel de fundo.
- O `--story-p` era escrito no `<section>` a cada quadro, invalidando o estilo da subárvore inteira. Junto com o blur do cabeçalho sobre o canvas, isso derrubava 2560 × 1440 para cerca de 40 fps.

**Troca para o logo:** os quadros imediatamente antes (WebGL) e depois (SVG oficial) diferem em média 0,46/255 por canal. A área do navy difere 1,2% e o centróide do símbolo, 0,1 px na horizontal e 0,3 px na vertical. No fim da sequência, o estado plano é resolvido analiticamente em 2D com cobertura por pixel, o mesmo modelo de rasterização do SVG.

## Navegador e acessibilidade

- **Viewports percorridos com captura:** 1440 × 900, 1920 × 1080, 820 × 1180, 390 × 844 e 360 × 640. Sem overflow horizontal.
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
