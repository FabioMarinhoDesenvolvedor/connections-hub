# Guia do blog: escrever e revisar

Este guia vale para quem escreve (o Fabio) e para quem revisa (o Claude ou qualquer outro agente). Ele não vira página do site: o blog só lê as pastas `AAAA/MM/DD-slug`.

## O princípio

**Você escreve; a revisão aponta.** O texto, a opinião e o jeito de falar são seus. A revisão existe para pegar o que escapa: erro, trecho confuso, fato errado, afirmação sem base, código que não roda. Ela não reescreve o post.

O post perfeito não existe. Publicar um texto bom é melhor que guardar um texto ótimo que nunca sai.

## O fluxo

1. **Começar:** `npm run post:new "Título do post"` cria `content/blog/AAAA/MM/DD-slug/index.md` com `draft: true`. Para já definir o tipo e os temas: `npm run post:new "Título" -- --kind analise --tags rust,seguranca`.
2. **Escrever:** `npm run dev` e abrir o endereço que o comando mostra. A página atualiza a cada vez que você salva. Imagens vão na mesma pasta do post e entram no texto só pelo nome: `![Descrição da imagem](tela.webp)`.
3. **Pedir a revisão:** com o texto inteiro escrito, peça: *"Revise o post `content/blog/…/index.md` seguindo o `content/blog/GUIA.md`."*
4. **Decidir:** responda item por item (aceito, recuso ou ajusto). Só o que você aceitar entra no arquivo.
5. **Publicar:**
   - troque para `draft: false`;
   - crie a branch `post/slug` e abra um PR;
   - leia o post no preview da Vercel;
   - faça o merge, que publica.

## O cabeçalho

| Campo | O que é | Obrigatório |
|---|---|---|
| `title` | O título (vira o único h1 da página) | sim |
| `description` | Uma ou duas frases, até uns 160 caracteres: aparece na lista, no Google e no RSS | sim |
| `date` | Dia e hora, como `"2026-11-03T10:00:00-03:00"`; o dia precisa bater com o nome da pasta | sim |
| `kind` | `artigo`, `opiniao`, `analise`, `projeto` ou `anuncio` | sim |
| `tags` | Temas em minúsculas, sem acento, com hífen: `[rust, seguranca, tasks]` | sim |
| `tldr` | O resumo em destaque no topo, para quem tem pressa | não |
| `updated` | Data de uma correção importante depois de publicado | não |
| `draft` | `true` enquanto não estiver pronto | não |

**Os tipos:**
- `artigo`: explica algo, como um tutorial ou um conceito;
- `opiniao`: o que você pensa sobre um tema;
- `analise`: compara, mede ou investiga;
- `projeto`: os bastidores de um projeto seu;
- `anuncio`: uma versão nova, um lançamento. Aparece também em `/blog/anuncios`.

Um campo errado faz o build parar com uma mensagem dizendo o arquivo e o campo. É de propósito: um post quebrado nunca chega ao site.

**Traduções:** um `index.en.md` ou `index.ja.md` na mesma pasta, com o mesmo cabeçalho traduzido. São opcionais e podem vir depois.

## Regras da revisão (para o Claude)

### Pode e deve apontar

- **Língua:** ortografia, gramática, concordância, regência, pontuação e repetição de palavras.
- **Clareza:** frase ambígua, longa demais ou que exige reler, parágrafo que mistura duas ideias, termo usado antes de ser explicado.
- **Fatos:**
  - afirmação técnica errada ou desatualizada;
  - número, versão ou data que não confere;
  - fato sobre um projeto que não bate com o repositório: conferir no código antes de apontar.
- **Base:** afirmação forte sem fonte ou sem exemplo. A revisão diz que falta; ela não inventa a fonte.
- **Código:** trecho que não compila, comando errado, nome de função ou arquivo que não existe.
- **Links e imagens:** link quebrado, imagem sem descrição (`![]()` vazio) ou arquivo que não está na pasta.
- **Cabeçalho:**
  - `description` que não resume o post ou que passa muito de 160 caracteres;
  - tags fora do padrão;
  - `kind` que não combina com o texto.
- **Exposição:**
  - token, senha, e-mail ou dado pessoal no texto ou numa imagem;
  - trecho de código de repositório privado (Tasks, WorkHub, WSN Loja) sem o aval do dono;
  - nome de cliente.

### Não pode

- Reescrever parágrafos ou "melhorar o estilo" de um trecho que está correto.
- Mudar a opinião, suavizar uma crítica ou acrescentar ressalvas que você não fez.
- Acrescentar argumentos, exemplos ou seções novas sem pedido.
- Trocar palavras suas por sinônimos "mais elegantes" ou deixar o texto genérico.
- Inventar fontes, números ou citações.
- Editar o arquivo antes da sua resposta.

### Formato da revisão

Uma lista numerada, da mais grave para a menos grave, em três níveis:

- **Bloqueia:** fato errado, código que não roda, dado exposto. Não publicar sem resolver.
- **Importante:** trecho confuso, afirmação sem base, erro de língua.
- **Sugestão:** detalhe que você pode ignorar sem prejuízo.

Cada item traz:
- o trecho citado;
- o problema em uma frase;
- a menor mudança que resolve, como diff (`- antes` / `+ depois`).

No fim, no máximo três linhas sobre o post como um todo: o que está forte e o que mais pesa.

Depois da sua resposta, a revisão aplica só os itens aceitos e mostra o diff final.

## Comentários

- Cada post tem comentários no fim. Nenhum aparece sem a sua aprovação.
- Para moderar, entre em `/admin/comentarios` com o GitHub. Lá os pendentes vêm primeiro:
  - **Aprovar** publica na hora;
  - **Apagar** remove de vez, seja pendente ou publicado.
- Quem comentou pode pedir para apagar pelo e-mail de contato; o aviso de privacidade diz isso.
- O e-mail de quem comenta aparece só para você, no painel.

## Voz e estilo

Valem para você e para qualquer tradução:
- primeira pessoa e frases diretas;
- o termo técnico em inglês quando é o que se usa no dia a dia (*deploy*, *commit*, *build*), sem forçar tradução;
- exemplos concretos dos seus projetos em vez de exemplos genéricos;
- sem clichês de abertura ("No mundo de hoje…") nem de fechamento ("E aí, o que achou?").

## Antes de publicar

- [ ] A revisão foi feita e cada item foi respondido.
- [ ] `description`, `kind` e `tags` estão certos.
- [ ] As imagens têm descrição e estão na pasta do post.
- [ ] Não há dado sensível nem trecho de código privado sem aval.
- [ ] `draft: false`.
- [ ] O post foi lido no preview da Vercel, no celular também.
