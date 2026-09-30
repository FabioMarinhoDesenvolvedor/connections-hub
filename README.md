# Connections Hub

Site institucional em Next.js App Router, React, TypeScript e CSS próprio. Conteúdo estático gerado no build; ilhas interativas apenas para navegação móvel e a cena 3D opcional.

## Rodar

Requer Node.js 20.9 ou superior.

```powershell
npm.cmd install
npm.cmd run dev
```

Abra `http://127.0.0.1:3000`. Em shells sem a restrição de execução do PowerShell, use `npm` normalmente.

## Produção e verificações

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run start
```

Para a verificação HTTP, inicie a produção na porta 3001 e execute:

```powershell
npm.cmd run start -- --port 3001
npm.cmd run verify
```

`VERIFY_URL` permite verificar outra origem. A verificação confere respostas HTTP, metadados, heading, âncoras, canais de contato e hashes dos SVGs/fontes publicados contra os originais.

Antes de publicar, copie `.env.example` para `.env.local` e informe o domínio real em `NEXT_PUBLIC_SITE_URL`. Faça novo build. Sem domínio, canonical e dados Organization ficam ausentes e o sitemap vazio, evitando inventar uma URL da empresa. A imagem Open Graph usa a origem local no ambiente de desenvolvimento.

## Arquivos

- `src/app/page.tsx`: composição e narrativa institucional.
- `src/app/layout.tsx`: Satoshi, metadata, navegação e rodapé.
- `src/app/tokens.css` e `globals.css`: identidade, componentes e responsividade.
- `src/data/site.ts`: textos, soluções, etapas e contatos.
- `src/components/concept-stage.tsx`: palco do conceito (progresso do scroll, fallback SVG, carregamento do 3D).
- `src/components/scroll-effects.tsx`: única primitiva de motion (revelações, progresso, item ativo).
- `src/components/`: navegação, imagens responsivas, texto revelado e rodapé.
- `src/lib/concept-scene.ts`: cena Three.js isolada (semente → anel → ponto de encontro).
- `public/brand`: SVGs oficiais intactos.
- `public/images`: derivados AVIF/WebP, fallback WebP e imagem social.
- `scripts/prepare-assets.mjs`: reprodução determinística das cópias e otimizações.
- `DESIGN.md`: auditoria, fontes, decisões visuais e pendências.
- `VALIDATION.md`: resultados e limites da validação.

## Atualizar materiais

Os arquivos originais permanecem em `Referências`, sem alterações. `npm.cmd run assets` recria os derivados publicados. A licença Satoshi está junto à fonte em `public/fonts/LICENSE.txt`. Não aplique filtros, transparência ou transformações aos SVGs da marca.

## Dependências

Next/React fornecem prerender, metadata, fonte local e as pequenas ilhas interativas. Three.js é importado dinamicamente, em idle, apenas em dispositivos elegíveis. Sharp é uma ferramenta de build para otimizar os materiais originais; TypeScript e os pacotes de tipos permitem checagem estática. Não há biblioteca de animação, componentes, ícones, Tailwind ou formulário desnecessária.
