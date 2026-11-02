# Handoff — atualizado em 02/11/2026

Estado do que foi feito e do que está em andamento. Leia antes de continuar o trabalho no site ou no Tasks. O próximo trabalho planejado está na seção 4.

**Antes de mexer no código:** `node_modules` não existe nesta máquina. Rode `npm install` e leia o guia do Next em `node_modules/next/dist/docs/` (exigência do `AGENTS.md`).

**Docs desatualizados:** o `README.md` ainda cita `hero-stage.tsx`, `src/lib/hero/`, `three-studio.ts` e `npm run bake`, que não existem mais, e diz que o three.js saiu (ele voltou para a logo). O mesmo vale para `DESIGN.md` §5 e `REVISAO.md`. Corrigir junto com a seção 4.

## 1. Seção Projetos do site (em produção)

**Histórico das versões**

- 14/10: uma pilha abstrata de placas gravadas. Reprovada: não mostrava os projetos.
- 15/10 manhã: prints reais das telas, separados em camadas no WebGL. Reprovada: parecia ridícula, quebrava, não reagia ao tema e não era responsiva.
- 15/10: **a versão atual**, aprovada ("NOW THIS IS WHAT I'M TALKING ABOUT"). Cada projeto aparece desmontado na stack em que foi feito, em CSS 3D com DOM real:
  - Interface: o produto reconstruído no design dele, funcionando com dados fictícios.
  - Serviços: placa navy com os módulos e as rotas reais.
  - Dados: diagrama ER com as colunas e as chaves estrangeiras reais.
  - Infraestrutura: sistemas externos num barramento.

**Projetos mostrados:** Marketing Dashboard, WorkHub, WSN Loja, Tasks e Connections Hub. Clozi, Tina Tur e Cifra Pompeia saíram a pedido.

**O que a seção faz**

- Clicar na interface manda a requisição descer pela stack: o método aparece no módulo, a operação SQL na tabela (com a linha nascendo), o sistema externo acende e a resposta volta.
- O painel inspeciona a requisição: rota, corpo, SQL com as colunas reais, efeito e resposta.
- Raio-X: passar o ponteiro num controle ou num nó mostra tudo o que está ligado a ele.
- "Ver em ação": um roteiro guiado com o anel oficial da marca, legendas e linha do tempo. Pausa quando a pessoa põe a mão na interface, quando a seção sai da tela e no modo de frente.
- Funciona nos temas claro e escuro, em PT, EN e JA, no celular (placas em retrato, toque roteado ao controle), pelo teclado e com movimento reduzido.

**Regras que valem para a seção**

- Nada se move sob o ponteiro. Um alvo que foge do cursor não se clica: foi isso que deixou os cliques bugados.
- Apertar e soltar no mesmo controle o aciona uma única vez (`scene.tsx`, roteamento do clique).
- Clicar numa placa só seleciona. O modo de frente só abre pelo botão do painel ou pela etiqueta da camada clicada duas vezes.
- Fidelidade à marca: paleta, Satoshi e linguagem de desenho técnico do `DESIGN.md`. Nada de neon, LED ou cores inventadas. As interfaces dos produtos usam os tokens do próprio produto.
- Fatos só dos repositórios: módulos, rotas, tabelas, colunas e contagens. Nenhum número de uso publicado.

**Código**

- `src/data/projects.ts`: dados e fluxos de cada projeto.
- `src/components/projects/`: `explorer.tsx`, `scene.tsx`, `stack-face.tsx` e `minis/`.
- `src/components/anchor-jump.tsx`: links longos do menu saltam direto para a seção.
- Decisões em `DESIGN.md` §10.

**Deploy**

- Fluxo: PRs #4, #5 e #6 no `main`. A Vercel publica produção sozinha em https://connections-hub-zeta.vercel.app.
- Como fazer: o `gh` não está instalado e o Git não tem identidade global. Commit com `-c user.name="Fabio Marinho" -c user.email=…` e PR e merge pela API do GitHub, com o token de `git credential fill`. Esperar o preview da Vercel ficar verde antes do merge.
- Verificação: `scripts/verify.mjs` passa tudo, menos a checagem que exige a pasta `Referências/`, que não existe nesta máquina.

## 1b. Abertura e fotos (19/10, em produção pelo PR #7)

- **Pedido:** tirar as fotos de escritório, porque não há escritório para visitar, e fazer a logo girando da abertura em nível profissional.
- **Reprovadas no caminho:**
  - arcos em órbita ("amadora");
  - interface de sistema no lugar da logo ("genérica"; fugia do pedido).
  - Não trocar o conceito pedido.
- **Feito:** símbolo oficial em 3D laqueado (`src/lib/logo/renderer.ts`, `hero-logo.tsx`), painel da marca no "Sobre" e `social.jpg` a partir do logo. As três fotos saíram. Detalhes em `DESIGN.md` §12.
- **Verificação:**
  - `tsc` e build passam. O `verify` passa tudo, menos a checagem de `Referências/`, que continua ausente.
  - Testado: 1440 claro e escuro e 390, sem WebGL e com movimento reduzido, sem erros.
- **Logo:** rodinha (girar, pegar, soltar, encaixar), gota de tinta com relevo, escorridos e ondulação, que muda só a cor da logo. A aba lateral de puxar o tema saiu.
- **"Sobre":** o painel da marca foi reprovado e trocado por um terminal que digita código real de cinco projetos/linguagens (`code-terminal.tsx`, `data/code.ts`). Os trechos de Tasks, WorkHub e WSN vêm de repositórios privados: confirmar com o usuário que pode publicar.
- **Também:** logo com rotação livre em todas as direções; terminal interativo (qualquer tecla vira código, e segurar no celular); adesivo refeito como papel de verdade em 3D.
- **Status:** aprovado e publicado (commit 412844d, PR #7). A pendência dos trechos privados continua.

## 2. Tasks público (download)

- Repositório público só de releases: https://github.com/FabioMarinhoDesenvolvedor/tasks. Tem README com seção de segurança, captura e Releases. O código continua privado em `Projetos/Tasks`, que não é um repositório Git.
- O botão "Baixar para Windows" na ficha do Tasks aponta para `releases/latest/download/Tasks_x64-setup.exe`. Toda release precisa usar exatamente esse nome de arquivo.
- **Versão atual: 0.4.1** (SHA-256 `c046c6ab6a398ef12f81ba42404b4ac6e05ff3c990ba85aca353fa42f66ccfa3`).

**Revisão de segurança (sem falhas encontradas) e reforços aplicados na 0.4.1**

- A restauração de `.sqlite3` não confia no esquema do arquivo (`trusted_schema=OFF` e modo defensivo) e recusa triggers, views, tabelas ou índices desconhecidos. Há um teste para isso.
- `npm run audit` roda `cargo audit` e `npm audit`; `npm run release` roda a auditoria antes do build. Os avisos que não chegam ao instalador estão justificados em `.cargo/audit.toml`.
- Como publicar uma versão nova: rodar `npm run release`, criar a release com o arquivo `Tasks_x64-setup.exe` e o SHA-256 nas notas, e atualizar a versão em `src/data/projects.ts` por PR.
- **Não testado:** instalar a 0.4.1 por cima da instalação que você usa. Faça isso uma vez para conferir.

## 3. Tirar o aviso do Windows: Microsoft Store (em andamento)

O aviso "O Windows protegeu o computador" aparece porque o `.exe` não tem assinatura digital. As opções:

- Azure Artifact Signing: não aceita pessoa física no Brasil.
- Certificado OV: pago, e o aviso continua até o app ganhar reputação.
- **Escolhida:** Microsoft Store com pacote MSIX. A conta individual é gratuita e a Microsoft assina o pacote.

**Feito**

- Conta no Partner Center criada pelo usuário, com o nome de editor **"Connections Chore Hub"**. Confirme se é esse mesmo o nome: ele aparece publicamente na loja.
- `Tasks/scripts/pack-msix.mjs` gera o MSIX. O manifesto foi validado com o `makeappx` usando uma identidade provisória.
- Dentro do pacote, o app desliga a opção "Iniciar com o Windows", porque lá o registro é virtualizado.
- Passo a passo completo, com os dados da submissão, em `Tasks/docs/handoffs.md`, seção "Microsoft Store". Opções e motivos em `Tasks/docs/signing.md`.

**Próximo passo, que depende do usuário:** no Partner Center, reservar o nome do app (provavelmente "Tasks" já existe) e copiar de *Product identity* o Package/Identity/Name, o Publisher (`CN=…`) e o PublisherDisplayName. Com esses três valores:

1. Gerar o MSIX final.
2. Publicar uma página de política de privacidade (o app não coleta nada; pode ficar no próprio site).
3. Preparar a ficha da loja e enviar.
4. Depois da aprovação, trocar o botão do site para a loja.

**Não testado:** instalar o MSIX localmente. Exige o Modo de Desenvolvedor do Windows, que está desligado.

## 4. Próximo: blog e seção de segurança (planejado em 02/11/2026, nada implementado)

**Pedido:** um lugar para publicar artigos de tecnologia, opiniões, análises e projetos, no espírito do blog do Akita (akitaonrails.com), com uma área de anúncios como a da Anthropic. O usuário quer criar o hábito de escrever e passar cada texto por uma revisão com o Claude. Também quer refazer a seção de segurança, que achou curta e sem graça.

### Referência: como o Akita faz

- **Fontes:** "Meu Novo Blog - Como Eu Fiz" (10/09/2025), "20 Anos de Blog" (09/04/2026), o guia de contribuição com Docker (29/08/2025) e o FrankMD parte 1 (01/02/2026).
- **Stack:** Hugo com tema Hextra, um `index.md` por post, deploy por push no Git. Imagens num bucket S3, fora do repositório.
- **URLs por data:** `/AAAA/MM/DD/slug/`. A tradução fica em `/en/...` com o slug traduzido, num arquivo irmão `index.en.md`.
- **Front matter:** title, date, slug, tags, draft, description.
- **Home:** destaques num carrossel e artigos agrupados por mês com contagem. Tags em `/tags/`, arquivo completo e RSS.
- **Página do post:** índice "Nesta página", tags, data, bloco TL;DR no início, botão "TL;DR com IA", Disqus e link para o próximo post.
- **Escrita:** ele escreve tudo em Markdown. A IA só corrige gramática e devolve um diff para aceitar, editar ou cancelar; não reescreve o texto. Na tradução, a IA não "corrige" as ideias técnicas e segue instruções de voz e estilo. Lemas: "Just f…ng write!!" e "O blog perfeito não existe".

### Decisões propostas

- **Continuar no Next.js, sem Hugo:** o blog fica no mesmo site, com o mesmo design system e o mesmo deploy (PR → preview da Vercel → merge publica).
- **Conteúdo:** `content/blog/AAAA/MM/DD-slug/index.md`, com imagens na mesma pasta (sem S3). Front matter: `title`, `date`, `description`, `tags`, `kind` (artigo, opinião, análise, projeto, anúncio), `draft` e `tldr`.
- **Rotas:** `/blog`, `/blog/AAAA/MM/DD/slug`, `/blog/tags/[tag]`, `/blog/anuncios` e `/blog/rss.xml`. Tudo estático (`generateStaticParams`), sem JavaScript no cliente para ler um post.
- **Idiomas:** PT primeiro. A versão em inglês ou japonês existe só quando houver um `index.en.md` ou `index.ja.md`, e só então o seletor de idioma aparece no post.
- **Sem Disqus nem comentários de terceiros:** quebrariam o aviso de privacidade (sem cookies e sem rastreadores). Em troca, um link "Comentar no GitHub" ou por e-mail.
- **Anúncios:** posts com `kind: anuncio` (lançamento de versão do Tasks, novidades do site) aparecem em `/blog/anuncios` e nos três últimos da home do site.
- **Antes de escolher a lib de Markdown e o realce de código no servidor:** ler o guia de MDX em `node_modules/next/dist/docs/` e comparar com o `src/lib/highlight.ts` que já existe.

### Fluxo de escrita e revisão

1. `npm run post:new "Título"` cria a pasta do dia e o `index.md` com `draft: true`.
2. O usuário escreve o texto inteiro.
3. A revisão segue o guia `content/blog/GUIA.md`. A IA aponta erros, trechos confusos, afirmações sem fonte e fatos que não batem com os repositórios. Ela não reescreve parágrafos nem muda a opinião; cada sugestão vem como diff para aceitar ou recusar.
4. Branch `post/slug` e PR; o preview da Vercel serve para ler o post publicado antes do merge.
5. O merge publica. O `verify.mjs` passa a checar `/blog`, o RSS e o sitemap.

### Seção de segurança

- **Suposição a confirmar:** é a seção "Segurança" do README público do Tasks (cinco tópicos curtos), que o site não tem.
- **Proposta para o site:** uma página `/projetos/tasks/seguranca` no visual de desenho técnico do site, com:
  - um diagrama das fronteiras de confiança (interface → comandos validados → SQLite);
  - o caminho da restauração de backup passo a passo, com o trecho Rust real que já está em `data/code.ts`;
  - uma tabela do que o app faz e do que ele não faz;
  - o portão de auditoria do release (`cargo audit` e `npm audit`);
  - como conferir o SHA-256 no PowerShell (`Get-FileHash`).
- **README do Tasks:** a seção fica com a mesma estrutura, mais curta, e um link para a página. Também ganha um `SECURITY.md` com o relato privado de vulnerabilidades do GitHub, no lugar de pedir uma issue pública.
- **Primeiro post sugerido:** "Como o Tasks trata um arquivo em que não confia", escrito pelo usuário a partir dessa página.

### Ordem sugerida

1. Corrigir os docs desatualizados (README, DESIGN §5, REVISAO).
2. Montar a estrutura do blog: rotas, listagem, página do post, RSS, sitemap e verify.
3. Criar `post:new` e o `GUIA.md`.
4. Fazer a página de segurança e o README do Tasks.
5. Primeiro post, para testar o fluxo inteiro.
