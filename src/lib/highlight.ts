export type CodeLanguage = 'ts' | 'rust' | 'sql' | 'ruby' | 'glsl';

/*
  A small syntax highlighter (used by the Security vault): enough to read TypeScript, Rust,
  SQL, Ruby and GLSL the way an editor shows them. Colours are roles mapped to the brand palette
  in globals.css (.tk-*), never a third-party theme.
*/
export type TokenKind = 'plain' | 'comment' | 'string' | 'number' | 'keyword' | 'type' | 'fn' | 'punct';
export type Token = { kind: TokenKind; text: string };

const KEYWORDS: Record<CodeLanguage, string[]> = {
  ts: ['export', 'function', 'return', 'const', 'let', 'if', 'else', 'for', 'while', 'new', 'import', 'from', 'type', 'string', 'number', 'boolean', 'null', 'true', 'false'],
  rust: ['fn', 'let', 'mut', 'match', 'if', 'for', 'in', 'return', 'pub', 'use', 'impl', 'as', 'true', 'false', 'Ok', 'Err', 'Some', 'None'],
  sql: ['ALTER', 'TABLE', 'ADD', 'COLUMN', 'INTEGER', 'NOT', 'NULL', 'DEFAULT', 'DROP', 'CONSTRAINT', 'CHECK', 'IS', 'OR', 'IN', 'AND', 'SELECT', 'FROM', 'WHERE'],
  ruby: ['module', 'def', 'self', 'end', 'class', 'if', 'else', 'return', 'true', 'false', 'nil'],
  glsl: ['float', 'vec2', 'vec3', 'vec4', 'int', 'if', 'for', 'return', 'uniform', 'varying', 'void'],
};
const LINE_COMMENT: Record<CodeLanguage, string> = { ts: '//', rust: '//', sql: '--', ruby: '#', glsl: '//' };

/** Splits one line into tokens. */
function line(text: string, language: CodeLanguage): Token[] {
  const tokens: Token[] = [];
  const keywords = new Set(KEYWORDS[language]);
  const comment = LINE_COMMENT[language];
  let i = 0;
  const push = (kind: TokenKind, value: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) last.text += value; else tokens.push({ kind, text: value });
  };
  while (i < text.length) {
    const rest = text.slice(i);
    if (rest.startsWith(comment)) { push('comment', rest); break; }
    const quote = rest[0];
    if (quote === '"' || quote === "'" || (quote === '`' && language === 'ts')) {
      let j = 1;
      while (j < rest.length && rest[j] !== quote) j += rest[j] === '\\' ? 2 : 1;
      push('string', rest.slice(0, j + 1));
      i += j + 1;
      continue;
    }
    const number = /^\d+(\.\d+)?/.exec(rest);
    if (number && !/[\w]/.test(text[i - 1] ?? '')) { push('number', number[0]); i += number[0].length; continue; }
    const word = /^[A-Za-z_][\w]*/.exec(rest);
    if (word) {
      const w = word[0];
      const after = text.slice(i + w.length);
      const kind: TokenKind = keywords.has(w) ? 'keyword'
        : /^\s*\(/.test(after) ? 'fn'
        : /^[A-Z]/.test(w) ? 'type'
        : 'plain';
      push(kind, w);
      i += w.length;
      continue;
    }
    push(/[{}()[\];,.:<>=!&|+\-*/?]/.test(rest[0]) ? 'punct' : 'plain', rest[0]);
    i += 1;
  }
  return tokens;
}

export function highlight(source: string, language: CodeLanguage): Token[][] {
  return source.split('\n').map(text => line(text, language));
}
