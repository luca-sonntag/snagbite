import { PRO_FEATURES_DE } from './data/de';
import { PRO_FEATURES_EN } from './data/en';
import type { ProFeatureContent, ProFeatureId } from './types';

export const PRO_FEATURES_DATA: Record<'de' | 'en', Record<ProFeatureId, ProFeatureContent>> = {
  de: PRO_FEATURES_DE,
  en: PRO_FEATURES_EN,
};

export function getProFeatureContent(id: ProFeatureId, lang: string = 'de'): ProFeatureContent {
  const normalizedLang = lang.startsWith('en') ? 'en' : 'de';
  return PRO_FEATURES_DATA[normalizedLang][id] ?? PRO_FEATURES_DATA.de[id];
}
