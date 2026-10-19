# Handoff — 19/10/2026

Estado de tudo o que foi feito nesta sessão e do que está em andamento. Leia antes de continuar o trabalho no site ou no Tasks.

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

## 1b. Abertura e fotos (19/10, não commitado)

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
- **Próximo passo:** aprovação do usuário, depois commit, PR e merge.

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
