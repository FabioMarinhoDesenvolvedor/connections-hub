# Validação do site Connections Hub

Revisão local em 29/09/2026. Auditoria do build de produção em `http://127.0.0.1:3001`. Prévia final também disponibilizada em `http://127.0.0.1:3000`, com o mesmo build, em processo de background sem janela visível.

## Verificações concluídas

- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run build`: aprovado; homepage, robots e sitemap pré-renderizados.
- `npm.cmd run verify`: aprovado na versão final. HTTP 200, metadados, h1 único, âncoras, contatos e assets; SVGs e Satoshi iguais aos arquivos oficiais em bytes.
- `npm.cmd audit`: zero vulnerabilidades na última verificação. Sharp atualizado para 0.35.5.
- Revisão visual em desktop 1440/1920px, notebook 1280px, tablet 768px e celulares 390/320px. Sem overflow horizontal nas larguras verificadas.
- Menu móvel aberto, fechado por Escape e foco devolvido ao controle. Soluções expandidas por interação nativa, com uma aberta por vez no Chrome testado.
- Links `wa.me/5511974589226`, `tel:+5511974589226` e `mailto:contato.connectionstree@gmail.com` conferidos. Nenhuma mensagem enviada durante os testes.
- Fontes locais carregadas; versões móveis das imagens selecionadas pelo navegador; imagens abaixo da dobra carregadas sob demanda.
- Cena WebGL funcionando em desktop/tablet: três draw calls, 900 triângulos. Contador de frames permaneceu em 48 entre observações em repouso; fora da viewport, a renderização é suspensa. Em mobile, nenhum Canvas é criado; ao mudar o breakpoint, o Canvas de desktop é descartado.
- `prefers-reduced-motion`, economia de dados, limite de núcleos, importação/GPU indisponíveis e perda de contexto têm fallback implementado. A preferência de movimento reduzido foi revisada no código; não foi alterada a configuração do sistema do usuário para simular esse estado.

## Lighthouse local

| Métrica | Mobile, versão final | Desktop, auditoria de polimento |
| --- | ---: | ---: |
| Performance | 97 | 100 |
| Acessibilidade automatizada | 100 | 100 |
| Boas práticas | 100 | 100 |
| SEO | 100 | 100 |
| FCP | 0,76 s | 0,22 s |
| LCP | 2,40 s | 0,64 s |
| TBT | 76 ms | 0 ms |
| CLS | 0 | 0 |

Mobile: preset padrão Lighthouse com rede/CPU simuladas, em produção, às 21:01 UTC. Uma medição anterior chegou a 98; reportamos a última execução concluída, 97. Desktop: preset desktop, às 20:58 UTC. Consulte o horário exato nos relatórios JSON em `.audit`.

A auditoria desktop antecede o último ajuste de áreas de toque e de progressão da cena por scroll. Duas tentativas de repeti-la depois da mudança de permissões da sessão não conseguiram conectar o Lighthouse ao Chrome. A revisão visual e a verificação HTTP/TypeScript da versão final foram concluídas normalmente no navegador conectado. O valor desktop acima é a medição registrada, não uma nova medição do último build.

São métricas de laboratório em localhost, sem a latência de uma hospedagem real. INP de campo e o percentil 75 dos Core Web Vitals dependem de publicação e tráfego real; não foram inventados nem substituídos por TBT. A nota de acessibilidade automatizada complementa a revisão manual e não é certificação de conformidade completa.

## Otimizações efetivas

- Hero mobile: AVIF de 24.852 bytes, ante 48.280 bytes no fallback WebP; desktop: AVIF de 115.336 bytes, ante 213.666 bytes no WebP.
- Imagens de pessoas: 81.202 bytes desktop / 22.992 bytes mobile em AVIF.
- Imagem de tablet: 35.958 bytes desktop / 14.885 bytes mobile em AVIF.
- Uma fonte variável oficial de 42.588 bytes, hospedada localmente e com preload gerenciado por Next/font.
- Imagem principal descoberta no HTML e com `fetchpriority="high"`; demais imagens lazy. Dimensões e superfícies reservadas evitam deslocamento de layout.
- HTML estático; apenas menu e gate do WebGL como componentes client. Engine Three.js em chunk separado, importado perto do processo em dispositivos elegíveis. Não há GSAP, R3F, biblioteca de ícones ou scripts de terceiros.
- JavaScript inicial transferido em torno de 135 KiB comprimidos na auditoria; 556 KiB de fonte sem compressão na verificação HTTP. O engine Three.js não integra a carga inicial.

## Antes de publicar

Informar o domínio real em `NEXT_PUBLIC_SITE_URL` e gerar novo build para canonical, sitemap, Open Graph e Organization. Não foi fornecido domínio, nem realizada publicação externa. Conteúdo comercial confirmado já está implementado; cases, depoimentos, resultados, vídeos e fotografia documental continuam dependentes de materiais reais autorizados.
