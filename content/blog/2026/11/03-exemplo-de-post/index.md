---
title: Exemplo de post, com tudo o que o blog sabe mostrar
description: Um rascunho que nunca vai ao ar. Serve de modelo e mostra como fica cada recurso do Markdown no blog.
date: "2026-11-03T10:00:00-03:00"
kind: artigo
tags: [blog, exemplo]
tldr: Copie este arquivo como ponto de partida, ou rode npm run post:new. Cada seção abaixo mostra um recurso.
draft: true
---

Este post é um **rascunho** (`draft: true`): aparece só no `npm run dev` e em builds com `BLOG_DRAFTS=1`. Apague-o quando o primeiro post de verdade estiver no ar.

## O cabeçalho

Tudo entre os `---` no topo é o cabeçalho do post:

| Campo | Para que serve | Obrigatório |
|---|---|---|
| `title` | O título, que vira o h1 da página | sim |
| `description` | O resumo de uma ou duas frases: aparece na lista, no Google e no RSS | sim |
| `date` | Dia e hora da publicação; precisa bater com o nome da pasta | sim |
| `kind` | `artigo`, `opiniao`, `analise`, `projeto` ou `anuncio` | sim |
| `tags` | Os temas, em minúsculas e com hífen: `[rust, seguranca]` | sim |
| `tldr` | O resumo em destaque no topo do post | não |
| `updated` | A data de uma revisão importante depois de publicado | não |
| `draft` | `true` enquanto não estiver pronto | não |

## Texto

Parágrafos são separados por uma linha em branco. Dá para usar *ênfase*, **negrito**, `código no meio da frase` e [links](https://github.com/FabioMarinhoDesenvolvedor), que abrem em outra aba quando saem do site.

> Uma citação fica assim. Use para trechos de outras pessoas, não para destacar a sua própria frase.

### Listas

- um item;
- outro item, com uma nota de rodapé[^1].

Listas de tarefas ficam numa lista própria:

- [x] escrever o rascunho;
- [ ] passar pela revisão.

1. Primeiro passo.
2. Segundo passo.

## Código

```rust
fn untrusted(conn: &Connection) -> Result<()> {
    // Recusa qualquer objeto que o Tasks não cria.
    distrust_schema(conn)?;
    Ok(())
}
```

```bash
npm run post:new "Como o Tasks trata um arquivo em que não confia"
```

## Imagens

Coloque a imagem na pasta do post e use só o nome do arquivo:

![O cartão de compartilhamento do site](capa.jpg)

[^1]: As notas de rodapé vão para o fim do post.
