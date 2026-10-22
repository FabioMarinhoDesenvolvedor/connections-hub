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
npm run bake            # regenera public/sdf/symbol-c.png a partir de public/brand/logo.svg
npm run assets          # regenera imagens e cópias oficiais a partir de Referências/
```

`NEXT_PUBLIC_SITE_URL` sobrescreve o domínio de canonical, sitemap e JSON-LD.

## Arquitetura

- `src/app/page.tsx`: composição das seções.
- `src/data/site.ts`: dados fixos (nome, canais, ordem das soluções). Os textos ficam em `src/i18n/`.
- `src/components/hero/`: abertura em uma tela.
  - `hero.tsx`: markup do servidor (texto, botões, índice de soluções).
  - `hero-stage.tsx`: toca a animação sozinha ao abrir a página (semente → anéis → C oficial → placa), com versão plana sem WebGL e símbolo parado com reduced motion. Clicar no símbolo repete.
- `src/lib/hero/`: cena 3D, isolada do React.
  - `timeline.ts`: o relógio da abertura (etapas e duração).
  - `orbits.ts`: estados da peça (anéis, semente, placa), lidos pelo 3D e pela versão plana.
  - `geometry.ts`: medidas do símbolo oficial.
  - `renderer.ts`: three.js em WebGL2, sombras, resolução adaptativa e ciclo de vida.
- `src/components/privacy-notice.tsx`: aviso de privacidade na primeira visita.
- `src/components/sections/`: Sobre, Segurança, Projetos, Processo e Contato.
- `src/components/cipher-bench.tsx`: a bancada da seção Segurança: o código de segurança deste site cifrado de verdade no navegador (AES-256-GCM, WebCrypto), em placa CSS 3D.
- `src/lib/security-headers.ts`: cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), enviados pelo `next.config.ts` e mostrados na seção.
- `src/data/projects.ts`: cada projeto por camada (stack, módulos, tabelas, sistemas externos) e os fluxos de cada ação da interface.
- `src/components/projects/`: `explorer.tsx` (abas e ficha), `scene.tsx` (a pilha em CSS 3D, órbita e requisições), `stack-face.tsx` (placas de serviços, dados e infra) e `minis/` (as interfaces vivas de cada projeto).
- `src/components/anchor-jump.tsx`: links internos longos cortam direto para a seção em vez de rolar por todas as cenas.
- `src/lib/three-studio.ts`: luz de estúdio da peça 3D da abertura.
- `src/components/scroll-effects.tsx`: reveals, progresso e item ativo. Só funciona com motion permitido.
- `src/app/tokens.css`: design system (cor, tipo, espaço, grid, forma, motion). `globals.css` contém os componentes.
- `public/brand` e `public/fonts`: arquivos oficiais, intactos (verificados byte a byte).

Sem GSAP, Lenis ou R3F: three.js só na abertura, carregado sob demanda, e o scroll é nativo. Veja `DESIGN.md` para as decisões, `VALIDATION.md` para as medições e `REVISAO.md` para o resumo das mudanças.
