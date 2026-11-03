/*
  Reading what visitors send, defensively.

  - Bodies: only a plain URL-encoded form, never compressed, at most MAX_BODY bytes. The size
    is checked before reading (Content-Length) and again while reading, so a huge or endless
    body is cut off instead of filling the server's memory. The server never inflates a
    request body (a gzip "bomb" is refused as an unknown encoding), but the encoding is
    refused explicitly anyway.
  - Text: Unicode normalised, invisible and direction-changing characters removed (they can
    hide or reorder what the owner reads in the panel), whitespace tidied.
*/
export const MAX_BODY = 64 * 1024; // a 3,000-character comment, URL-encoded, fits many times over

export class BadBody extends Error {}

export async function readForm(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get('content-type') ?? '';
  const encoding = (request.headers.get('content-encoding') ?? 'identity').toLowerCase();
  if (!type.toLowerCase().startsWith('application/x-www-form-urlencoded')) throw new BadBody('type');
  if (encoding !== 'identity') throw new BadBody('encoding');
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY) throw new BadBody('size');
  if (!request.body) return new URLSearchParams();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new BadBody('size'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new URLSearchParams(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
}

// C0/C1 controls (except tab and newline), zero-width characters, bidi embeddings, overrides
// and isolates, the BOM and the soft hyphen.
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁩﻿]/g;

export const cleanLine = (text: string) => text.normalize('NFC').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
export const cleanText = (text: string) => text.normalize('NFC').replace(/\r\n?/g, '\n').replace(INVISIBLE, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

// Addresses with characters that could add mailto: parameters (?cc=, &body=) or break out of
// a link are refused, not cleaned.
export const EMAIL = /^[^\s@?&#/:;,<>"'()[\]\\]+@[^\s@?&#/:;,<>"'()[\]\\]+\.[a-z]{2,}$/i;

/*
  A hint for the owner in the moderation panel, never an automatic decision: text that reads
  like orders to an AI assistant (prompt injection) or like link spam. Approving or deleting
  stays a person's choice.
*/
const INJECTION = [
  /ignor(e|ar|e todas?|a)\b.{0,40}\b(instru|instruction|prompt|regra|rule)/i,
  /\b(system|sistema)\s*prompt\b/i,
  /\b(you are|voc[eê] [eé]|act as|aja como|finja ser)\b.{0,40}\b(ai|ia|assistant|assistente|model|modelo)\b/i,
  /\b(claude|chatgpt|gpt-?\d|gemini|copilot|llm|anthropic|openai)\b/i,
  /\b(approve|aprove|aprovar|delete|apague|apagar|execute|run|rode)\b.{0,30}\b(comment|coment|command|comando|all|todos)/i,
  /<\s*\/?\s*(system|assistant|instructions?|script)\b/i,
  /\[\s*(INST|SYSTEM)\s*\]/i,
];

export function warnings(text: string): ('ia' | 'links')[] {
  const found: ('ia' | 'links')[] = [];
  if (INJECTION.some(pattern => pattern.test(text))) found.push('ia');
  if ((text.match(/https?:\/\/|www\./gi) ?? []).length >= 2) found.push('links');
  return found;
}
