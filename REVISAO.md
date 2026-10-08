# Revisão — Connections Hub (outubro de 2026)

**Por que refazer:** a peça 3D não correspondia ao filme da marca (ovo brilhante e uma "boia" toroidal), a transição para o logo passava por várias telas vazias, o site não tinha linguagem visual própria e o conteúdo não explicava o que é entregue. O diagnóstico completo está em `DESIGN.md` §1.

**Mantido:**
- Next.js, scroll nativo e Server Components.
- Vetores e Satoshi oficiais, intactos; paleta; contatos.
- Nomes do processo, tagline e frases da marca.
- Galeria condicionada a cases reais.

**Refeito:**
1. **Cena 3D:** raymarching de campos de distância em WebGL2, fiel ao filme: semente fosca → casca que gira e revela o núcleo → C oficial com o ponto → placa → símbolo plano. O C vem do vetor oficial por transformada de distância (`npm run bake`). A troca para o `logo.svg` não tem diferença perceptível (medida em `VALIDATION.md`).
2. **Linguagem visual:** desenho técnico sobre o papel da marca. Grid da marca, marcas de registro, linhas de chamada que se desenham até o objeto, numeração de folhas, tipografia espaçada do manifesto, um único bloco terracota. O ponto marca onde o valor acontece em todo o site.
3. **Design system:** tokens por papel para cor, tipo, espaço, grid de 12 colunas, forma e motion (`tokens.css`).
4. **Conteúdo:**
   - Cada serviço diz o que é, o que resolve e o que pode incluir, com um desenho técnico próprio.
   - O processo diz o que o cliente recebe em cada etapa.
   - O manifesto oficial (manual p. 10) substitui o texto adaptado.
   - O contato usa as perguntas do post da marca.
5. **Motion:** um relógio de scroll para a história. Títulos revelados por linha, hairlines que se desenham, esquemas que se traçam, anel do processo que avança com o ponto. Nada em loop; reduced motion recebe o layout estático.

**Removidos:** Three.js e `@types/three`; a cena e o tubo paramétrico anteriores; o rodapé 3D.

**Performance:** Lighthouse mobile 98 / desktop 100, CLS 0, TBT mobile 50–60 ms (era 810 ms antes da compilação paralela do shader), 60 fps na história com CPU normal em todos os viewports testados. Detalhes e limites em `VALIDATION.md`.

**Precisa da empresa:**
- Confirmar os escopos "Pode incluir" de cada serviço.
- Enviar cases reais aprovados para a galeria.
- Testar em aparelhos físicos depois da publicação.

## Segunda iteração (08/10/2026)

Diagnóstico e direção em `DESIGN.md` §8. Em resumo:
- **História:** cada capítulo é um plano próprio, com câmera, enquadramento e atmosfera.
- **Objeto:** artefato preciso em vez de inflado.
- **Grid:** vira chão em perspectiva e depois se dobra na página.
- **Cotas:** dimensões reais do símbolo.
- **Hero:** selo técnico que vira o índice dos capítulos.
- **Página:** folhas sobrepostas.
- **Soluções:** direção preservada, com figuras específicas por serviço.
- **Manifesto:** leitura progressiva.

Desempenho medido em `VALIDATION.md`.

**Não alterado:** vetores, fonte, conteúdo factual, escopo dos serviços, acessibilidade e reduced motion.

**Ponto fraco ainda aberto:** a composição do hero (texto à esquerda, objeto à direita) é a que menos mudou.
