/*
  Languages. Portuguese is the brand's own language and lives at the root; English and
  Japanese live under /en and /ja. Section anchors (#sobre, #solucoes…) are identifiers, not
  copy, so they stay the same in every language and links can be shared across them.
*/
export const locales = ['pt', 'en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt';

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

export const localeInfo: Record<Locale, { html: string; og: string; path: string; label: string; short: string }> = {
  pt: { html: 'pt-BR', og: 'pt_BR', path: '/', label: 'Português', short: 'PT' },
  en: { html: 'en', og: 'en_US', path: '/en', label: 'English', short: 'EN' },
  ja: { html: 'ja', og: 'ja_JP', path: '/ja', label: '日本語', short: 'JA' },
};
