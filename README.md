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
- `src/data/site.ts`: todo o conteúdo, com as fontes indicadas (manual, posts, bio).
- `src/components/story/`: história fixada (hero + conceito + assinatura).
  - `story.tsx`: markup do servidor.
  - `story-stage.tsx`: relógio de scroll, overlay técnico e troca para o logo.
  - `concept-figure.tsx`: diagrama estático do manual.
- `src/lib/story/`: cena 3D, isolada do React.
  - `timeline.ts`: tempos, planos de câmera, enquadramento, chão e atmosfera, compartilhados por DOM e GPU.
  - `camera.ts`: câmera única (perspectiva → ortográfica) para o shader e para a projeção das cotas.
  - `annotations.ts`: cotas reais do símbolo e linhas de construção do lockup.
  - `geometry.ts`: medidas do símbolo oficial.
  - `shader.ts`: campos de distância e iluminação.
  - `renderer.ts`: WebGL2, compilação paralela, resolução adaptativa e ciclo de vida.
- `src/components/sections/`: Sobre, Soluções, Processo, Manifesto e Contato. `schematic.tsx` contém os desenhos técnicos de cada serviço.
- `src/components/scroll-effects.tsx`: reveals, progresso e item ativo. Só funciona com motion permitido.
- `src/app/tokens.css`: design system (cor, tipo, espaço, grid, forma, motion). `globals.css` contém os componentes.
- `scripts/bake-symbol-sdf.mjs`: transforma o C oficial em campo de distância.
- `public/brand` e `public/fonts`: arquivos oficiais, intactos (verificados byte a byte).

Sem Three.js, GSAP, Lenis ou R3F: a cena é um único passe de shader e o scroll é nativo. Veja `DESIGN.md` para as decisões, `VALIDATION.md` para as medições e `REVISAO.md` para o resumo das mudanças.
