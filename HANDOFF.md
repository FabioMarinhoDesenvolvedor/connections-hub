# Handoff — atualizado em 03/11/2026

Estado do que foi feito e do que está em andamento. Leia antes de continuar o trabalho no site ou no Tasks.

**Agora:**
- O blog está pronto na branch `feature/blog`, em PR (#8). Detalhes na seção 4.
- Os comentários com aprovação estão na branch `feature/comentarios`, feita em cima do blog (seção 4b). Eles dependem de três configurações que o usuário faz na Vercel e no GitHub.
- O próximo trabalho é refazer a seção Segurança (seção 5), que o usuário deixou para o fim.

**Antes de mexer no código:**
- Rode `npm install` e leia o guia do Next em `node_modules/next/dist/docs/` (exigência do `AGENTS.md`).
- Rode `git fetch` antes de começar: em 22/10, outra sessão publicou três commits da seção Segurança direto no `main`, e este handoff não sabia deles até 03/11.

**Commits:** o Git desta máquina não tem identidade global. Use `git -c user.name="Fabio Marinho" -c user.email=fabiomarinho202020@gmail.com commit …`.

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
- Como fazer: commit com a identidade explícita (ver o topo), push da branch e PR com o `gh` (instalado e logado desde 03/11). Esperar o preview da Vercel ficar verde antes do merge.
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
- **"Sobre":** o painel da marca foi reprovado e trocado por um terminal que digitava código real de cinco projetos. Em 22/10 o terminal saiu, junto com os trechos de repositórios privados, e deu lugar à seção Segurança (seção 5).
- **Também:** logo com rotação livre em todas as direções; terminal interativo (qualquer tecla vira código, e segurar no celular); adesivo refeito como papel de verdade em 3D.
- **Status:** aprovado e publicado (commit 412844d, PR #7).

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

## 4. Blog (feito em 03/11/2026, branch `feature/blog`)

**Pedido:** um lugar para artigos, opiniões, análises e bastidores de projetos, no espírito do blog do Akita (akitaonrails.com), com anúncios como a página de notícias da Anthropic. O usuário quer criar o hábito de escrever; o Claude revisa sem reescrever.

**O que foi feito** (decisões em `DESIGN.md` §14):
- **Posts:** Markdown em `content/blog/AAAA/MM/DD-slug/index.md`, com imagens na mesma pasta e traduções opcionais em `index.en.md` e `index.ja.md`. O cabeçalho é validado no build.
- **Rotas:** `/blog`, `/blog/AAAA/MM/DD/slug`, `/blog/anuncios`, `/blog/tags/[tag]` e `/blog/rss.xml`, também em `/en` e `/ja`. "Blog" entra no menu e no rodapé, e a home ganha a seção "Do blog", que fica escondida enquanto não houver posts.
- **Escrita:** `npm run post:new "Título"` cria o rascunho. `content/blog/GUIA.md` tem o fluxo e as regras da revisão; a regra também está no `CLAUDE.md`.
- **Rascunhos:** só no dev ou com `BLOG_DRAFTS=1`. Existe um post de exemplo em rascunho (`content/blog/2026/11/03-exemplo-de-post`), para apagar quando sair o primeiro post de verdade.
- **Também nesta branch:**
  - ai-memory no `CLAUDE.md`;
  - Next 16.3.7 → 16.4.4 pelo `npm audit` (1 falha crítica e 1 alta, agora 0);
  - README, DESIGN §5 e REVISAO corrigidos;
  - `verify` pula com aviso a checagem de `Referências/` quando a pasta não existe.

**Verificado:**
- `typecheck`, `build` e `verify` passam, com e sem `BLOG_DRAFTS=1`.
- Navegador em 1440 px nos temas claro e escuro, e em 390 px (antes do rebase sobre a Segurança), sem erros de console.
- Uma revisão de código (`/code-review`) achou 10 problemas, todos corrigidos no commit `fix(blog)`.

**Pegadinhas:**
- Nas rotas internas do blog, o `generateStaticParams` precisa devolver todas as combinações, já com o `lang`. Uma lista montada a partir do idioma recebido do layout foi ignorada pelo build.
- O `usePathname` vê `/pt/...` no pré-render e `/...` no navegador; o menu normaliza isso.
- A CSP (`security-headers.ts`) e o `X-Frame-Options: DENY` valem para o blog. Uma página não abre dentro de iframe, nem para testar o celular: use outro jeito de mudar a largura.

**Próximos passos:**
1. O usuário revisa o PR no preview da Vercel e faz o merge.
2. Escrever o primeiro post. O tema é o que o usuário escolher; ele quer que o primeiro post seja dele. Depois, passar pela revisão do guia.
3. Apagar o post de exemplo quando o primeiro post de verdade sair.

## 4b. Comentários com aprovação (feito em 03/11/2026, branch `feature/comentarios`)

**Pedido:** comentários nos artigos, que só aparecem depois que o dono aprova e que podem ser apagados.

**Escolhas do usuário:**
- banco Neon Postgres;
- nome + comentário + e-mail opcional, que nunca aparece no site;
- login com GitHub no painel;
- sem aviso de comentário novo por e-mail.

**O que foi feito** (decisões em `DESIGN.md` §15):
- formulário no fim de cada post, que funciona sem JavaScript;
- painel `/admin/comentarios`, com os botões Aprovar e Apagar;
- proteção contra spam: campo escondido, limite por pessoa e teto de pendentes;
- aviso de privacidade e selo "Seus dados em paz" reescritos nos três idiomas.

**Verificado:**
- `typecheck`, `build` e `verify` passam: sem banco, e com banco local e rascunhos.
- Testado de ponta a ponta com o PGlite: envio válido e inválido, robô, outra origem, limite de envios, aprovar, apagar, painel sem login e ações sem sessão. No navegador, nos temas claro e escuro, sem erros.
- **Não testado:** o login real com o GitHub e o Neon de verdade, que dependem das configurações abaixo.

**Segurança verificada em 03/11:**
- bombas de descompressão (corpo gzip e imagens);
- corpo gigante;
- XSS e caracteres invisíveis;
- `Host` falsificado;
- prompt injection.

Detalhes e o risco que fica em `DESIGN.md` §15. O `verify` cobre corpo gigante, gzip e `Host` falsificado.

**Configuração de produção (03/11, feita no navegador junto com o usuário):**
1. **Banco: feito.** Neon `connections-hub-comentarios`, plano Free, região São Paulo (gru1), sem Neon Auth nem Realtime. Ligado só ao ambiente Production, com prefixo `DATABASE` (gera `DATABASE_URL`, marcado como Sensitive).
   - Não foi ligado ao Preview: os previews gravariam no banco de produção, e o login nem funcionaria lá (o callback é só do domínio oficial).
   - As funções rodam em São Paulo pelo `vercel.json`.
2. **OAuth App do GitHub: feito.** "Connections Hub moderação", callback `https://www.connectionshub.com.br/api/auth/github/callback`. O usuário gera e guarda o Client Secret.
3. **Variáveis no ambiente Production da Vercel: o usuário cadastra.**
   - `GITHUB_CLIENT_ID`;
   - `GITHUB_CLIENT_SECRET` (Sensitive);
   - `SESSION_SECRET` (Sensitive), gerado com `openssl rand -base64 48`.

   `ADMIN_GITHUB_LOGIN` é opcional: o padrão no código já é `FabioMarinhoDesenvolvedor`.
4. **Publicar:** merge do PR #8 e depois do #9, e então entrar em `/admin/comentarios`.

**Desenvolvimento local:** `DATABASE_URL=pglite:./.pglite ADMIN_DEV_LOGIN=1 npm run dev`. O banco local fica em `.pglite/`, que está no `.gitignore`.

## 5. Próximo: refazer a seção Segurança

- **O que existe** (em produção desde 22/10, `DESIGN.md` §13): "Seguro desde a primeira linha.", com três selos (conexão cifrada, só o que é nosso, seus dados em paz) e o cofre 3D que criptografa a CSP do site ao vivo.
  - Código em `components/sections/security.tsx`, `components/security/vault.tsx`, `lib/cipher/renderer.ts` e `lib/security-headers.ts`.
- **O pedido do usuário (02/11):** achou a seção "curta e sem graça" e quer melhorar bastante. Ficou para o fim, depois do blog.
- **Cuidado com o histórico de 22/10:**
  - duas versões foram reprovadas por excesso de informação ("lixo"; "informação demais para vender a marca");
  - as duas trocaram a seção Soluções por engano.
  - Melhorar sem voltar a encher de lista técnica, e sem tocar em Soluções.
- **Primeiro passo:** perguntar ao usuário o que falta (profundidade, interação, prova, visual) antes de propor. Uma ideia possível é ligar a seção a um post do blog com os detalhes técnicos, para manter a seção enxuta.
- **Já mudou um pouco:** o texto do selo "Seus dados em paz" passou a ser "Sem rastreadores. Só fica guardado o que você escolhe escrever.", para continuar verdadeiro com os comentários.
- **Fica para depois:** a página de segurança do Tasks e o README do repositório público, ideias do plano de 02/11, ainda sem pedido confirmado.
