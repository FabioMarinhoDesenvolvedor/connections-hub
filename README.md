# Connections Hub

Site institucional em Next.js 16 (App Router), React 19, TypeScript e CSS próprio. A página é estática; as ilhas client cuidam da navegação, dos efeitos de scroll e da cena 3D.

## Rodar e verificar

Node.js 20.9 ou superior:

```powershell
npm install
npm run dev
npm run typecheck
npm run build
npm run start -- --port 3001
npm run verify          # VERIFY_URL define a origem testada
npm run assets          # regenera as cópias oficiais e o favicon a partir de Referências/
npm run social          # redesenha public/images/social.jpg a partir do logo oficial
npm run post:new "Título"   # cria um rascunho de post em content/blog/ (veja content/blog/GUIA.md)
```

`NEXT_PUBLIC_SITE_URL` sobrescreve o domínio de canonical, sitemap, RSS e JSON-LD. `BLOG_DRAFTS=1` mostra os rascunhos do blog num build de produção (para revisar num preview). Os comentários usam `DATABASE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_GITHUB_LOGIN` e `SESSION_SECRET` (veja `.env.example`). Para testar localmente: `DATABASE_URL=pglite:./.pglite ADMIN_DEV_LOGIN=1 npm run dev` e o painel em `/admin/comentarios`.

## Arquitetura

- `src/app/[lang]/`: layout e página de cada idioma. O português é servido na raiz (`next.config.ts` reescreve `/` para `/pt`); inglês e japonês ficam em `/en` e `/ja`.
- `src/i18n/`: todos os textos, em `pt.ts` (fonte), `en.ts` e `ja.ts`. `types.ts` obriga os três a terem as mesmas chaves.
- `src/data/site.ts`: dados fixos (nome, canais, ordem das soluções).
- `src/components/hero/`: abertura em uma tela.
  - `hero.tsx`: markup do servidor (texto, botões, índice de soluções).
  - `hero-logo.tsx`: o símbolo oficial em 3D, que entra girando, gira como uma rodinha e recebe a gota de tinta. Mostra o arquivo oficial antes do 3D, gira em CSS sem WebGL2 e fica parado com movimento reduzido.
- `src/lib/logo/renderer.ts`: three.js em WebGL2 (geometria extrudada do `symbol-navy.svg`, acabamento laqueado, luz de estúdio e shader da tinta). Carregado sob demanda, nunca nos scripts iniciais.
- `src/components/sections/`: Sobre, Segurança, Soluções, Projetos, Processo e Contato.
- `src/components/about/board.tsx`: a seção Sobre: a frase que troca o que construímos e os quatro cartões com cenas.
- `src/components/process/journey.tsx`: a jornada da seção Processo: as quatro etapas vividas por um projeto de exemplo, com abas que avançam sozinhas.
- `src/components/solutions/stage.tsx`: as cenas da seção Soluções: cada serviço funcionando numa interface de produto em CSS, curta e direta.
- `src/components/security/shield.tsx`: a demonstração da seção Segurança: três histórias curtas (Wi-Fi, código de fora, rastreadores), cada uma num site comum e depois num site da Connections Hub. Em CSS e SVG, sem 3D.
- `src/lib/security-headers.ts`: cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), enviados pelo `next.config.ts` e mostrados na seção.
- `src/lib/highlight.ts`: realce de código nas cores da marca, usado nos blocos de código do blog.
- `src/data/projects.ts`: cada projeto por camada (stack, módulos, tabelas, sistemas externos) e os fluxos de cada ação da interface.
- `src/components/projects/`: `showcase.tsx` (a vitrine de vidro: um projeto por vez num palco preso na tela, com a interface viva e a história), `explorer.tsx` (a pilha 3D, aberta pelo "Ver por dentro": abas, demonstração, história e ficha), `scene.tsx` (a pilha em CSS 3D, órbita e requisições), `stack-face.tsx` (placas de serviços, dados e infra) e `minis/` (as interfaces vivas de cada projeto).
- `content/blog/`: os posts em Markdown, um por pasta (`AAAA/MM/DD-slug/index.md`), e o `GUIA.md` de escrita e revisão.
- `src/lib/blog/`: `posts.ts` lê e valida os posts; `markdown.ts` gera o HTML no build. Rotas em `src/app/[lang]/blog/`, componentes em `src/components/blog/` e a seção "Do blog" da home em `sections/blog-latest.tsx`.
- `src/lib/editor/`, `src/components/admin/editor.tsx` e `src/app/admin/posts/`: o editor de posts do painel (rascunhos no banco, imagens convertidas para WebP, revisão como PR e publicação pelo merge, via `GITHUB_CONTENT_TOKEN`).
- `src/lib/comments/`, `src/app/api/` e `src/app/admin/`: os comentários (banco, sessão do dono, envio e moderação) e o painel `/admin/comentarios`. A seção no post é `src/components/blog/comments.tsx`.
- `src/components/contact/composer.tsx`: o montador de mensagem do Contato, que abre o WhatsApp ou o e-mail do visitante com a mensagem pronta.
- `src/components/sticker.tsx` e `src/lib/sticker/peel.ts`: o adesivo de vinil do Contato, que se descola de verdade (three.js, sob demanda) e revela o crédito.
- `src/components/privacy-notice.tsx`: aviso de privacidade na primeira visita.
- `src/components/anchor-jump.tsx`: links internos longos cortam direto para a seção em vez de rolar por todas as cenas.
- `src/components/scroll-effects.tsx`: reveals, progresso e item ativo. Só funciona com motion permitido.
- `src/app/tokens.css`: design system (cor, tipo, espaço, grid, forma, motion). `globals.css` contém os componentes.
- `public/brand` e `public/fonts`: arquivos oficiais, intactos (verificados byte a byte).

Sem GSAP, Lenis ou R3F. O three.js só existe na abertura e no adesivo, carregado sob demanda, e o scroll é nativo. Veja `DESIGN.md` para as decisões, `VALIDATION.md` para as medições, `REVISAO.md` para o resumo das mudanças e `HANDOFF.md` para o estado atual.
