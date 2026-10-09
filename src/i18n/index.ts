import type { Locale } from './config';
import type { Dictionary } from './types';
import { en } from './en';
import { ja } from './ja';
import { pt } from './pt';

const dictionaries: Record<Locale, Dictionary> = { pt, en, ja };

/** Server-side lookup; client components receive only the strings they render, as props. */
export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export type { Dictionary, Locale };
export { isLocale, localeInfo, locales, defaultLocale } from './config';
