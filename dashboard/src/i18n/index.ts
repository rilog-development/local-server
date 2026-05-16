import { en } from './en';
import { uk } from './uk';

export type { Translations } from './types';
export type Lang = 'en' | 'uk';

export const translations: Record<Lang, import('./types').Translations> = { en, uk };

export { en, uk };
