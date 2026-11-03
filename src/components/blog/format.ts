import { localeInfo, type Locale } from '@/i18n/config';

// Dates are shown in Brasília time, the zone the posts are written in, so a post published
// late in the evening never shows the next day.
const ZONE = 'America/Sao_Paulo';

export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

export const longDate = (locale: Locale, date: Date) =>
  new Intl.DateTimeFormat(localeInfo[locale].html, { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONE }).format(date);

export const shortDate = (locale: Locale, date: Date) =>
  new Intl.DateTimeFormat(localeInfo[locale].html, { day: '2-digit', month: 'short', timeZone: ZONE }).format(date);

export const monthOf = (locale: Locale, date: Date) =>
  new Intl.DateTimeFormat(localeInfo[locale].html, { month: 'long', year: 'numeric', timeZone: ZONE }).format(date);

export const isoDay = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: ZONE });

export const count = (forms: { one: string; other: string }, n: number) => fill(n === 1 ? forms.one : forms.other, { n });
