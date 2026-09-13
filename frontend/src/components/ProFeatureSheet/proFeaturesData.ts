import {
  PieChart,
  HeartPulse,
  Scale,
  Play,
  Sparkles,
  Infinity as InfinityIcon,
  FolderHeart,
} from 'lucide-react';
import type { ProFeatureContent, ProFeatureId } from './types';

export const PRO_FEATURES_DATA: Record<'de' | 'en', Record<ProFeatureId, ProFeatureContent>> = {
  de: {
    macros: {
      id: 'macros',
      title: 'Makronährstoff-Verteilung',
      tagline: 'Volle Transparenz über Protein, Kohlenhydrate & Fett',
      bullets: [
        'Exakte Gramm- und Prozentangaben je Portion',
        'Ausgewogene Makro-Balance nach DGE-Referenzwerten',
        'Automatische Neuberechnung bei Portionsänderungen',
      ],
      screenshotUrl: '/pro-features/macros.png',
      icon: PieChart,
    },
    healthy_score: {
      id: 'healthy_score',
      title: 'Healthy Score Deep-Dive',
      tagline: 'Umfassende 4-Säulen-Ernährungsanalyse',
      bullets: [
        'DGE-, WHO- & NOVA-Klassifizierung auf einen Blick',
        'Pflanzenvielfalt & exakte Gemüsemengen pro Portion',
        'Transparente Highlights & Optimierungspotenziale',
      ],
      screenshotUrl: '/pro-features/healthy-score.png',
      icon: HeartPulse,
    },
    ingredient_nutrition: {
      id: 'ingredient_nutrition',
      title: 'Zutaten-Nährwertanalyse',
      tagline: 'Detaillierte Nährwerte für jede einzelne Zutat',
      bullets: [
        'Kalorien, Makros & Ballaststoffe pro Einzelzutat',
        'Versteckte Zucker- und Fettquellen sofort aufdecken',
        'Perfekt zum Abstimmen persönlicher Ernährungsziele',
      ],
      screenshotUrl: '/pro-features/ingredient-nutrition.png',
      icon: Scale,
    },
    cooking_mode: {
      id: 'cooking_mode',
      title: 'Fokus-Kochmodus & Timer',
      tagline: 'Entspanntes Kochen ohne Display-Timeout',
      bullets: [
        'Große, ablenkungsfreie Schritt-für-Schritt-Ansicht',
        'Integrierte, parallele Timer mit Alarmton',
        'Zutatenmengen jederzeit im Schritt griffbereit',
      ],
      screenshotUrl: '/pro-features/cooking-mode.png',
      icon: Play,
    },
    recipe_copilot: {
      id: 'recipe_copilot',
      title: 'Recipe Copilot & KI-Remix',
      tagline: 'Dein persönlicher KI-Chefkoch für jedes Rezept',
      bullets: [
        'Zutaten per Klick tauschen (vegan, laktosefrei, etc.)',
        'Rezepte gesünder machen oder Beilagen ergänzen',
        'Präzise automatische Neuberechnung der Zubereitung',
      ],
      screenshotUrl: '/pro-features/recipe-copilot.png',
      icon: Sparkles,
    },
    unlimited_extractions: {
      id: 'unlimited_extractions',
      title: 'Unbegrenzte Extraktionen',
      tagline: 'Rezept-Videos & Fotos ohne Tageslimit importieren',
      bullets: [
        'Unbegrenzt aus Instagram, TikTok & YouTube importieren',
        'Foto-Scan von Kochbuchseiten & handschriftlichen Karten',
        'Keine Wartezeiten, keine täglichen Obergrenzen',
      ],
      screenshotUrl: '/pro-features/unlimited-extractions.png',
      icon: InfinityIcon,
    },
    collections_labels: {
      id: 'collections_labels',
      title: 'Sammlungen & Eigene Tags',
      tagline: 'Dein Kochbuch maßgeschneidert organisieren',
      bullets: [
        'Eigene thematische Ordner & Sammlungen erstellen',
        'Benutzerdefinierte Tags für blitzschnelle Filterung',
        'Volle Ordnung über deine persönliche Rezeptbibliothek',
      ],
      screenshotUrl: '/pro-features/collections-labels.png',
      icon: FolderHeart,
    },
  },
  en: {
    macros: {
      id: 'macros',
      title: 'Macronutrient Breakdown',
      tagline: 'Complete insight into protein, carbohydrates & fat',
      bullets: [
        'Exact gram and percentage values per serving',
        'Balanced macro distribution based on nutrition guidelines',
        'Instant recalculation when scaling servings',
      ],
      screenshotUrl: '/pro-features/macros.png',
      icon: PieChart,
    },
    healthy_score: {
      id: 'healthy_score',
      title: 'Healthy Score Deep-Dive',
      tagline: 'Comprehensive 4-pillar nutritional audit',
      bullets: [
        'DGE, WHO & NOVA classification at a glance',
        'Plant diversity and vegetable weight per portion',
        'Transparent highlights and personalized health insights',
      ],
      screenshotUrl: '/pro-features/healthy-score.png',
      icon: HeartPulse,
    },
    ingredient_nutrition: {
      id: 'ingredient_nutrition',
      title: 'Ingredient Nutrition',
      tagline: 'Detailed nutritional breakdown of every ingredient',
      bullets: [
        'Calories, macros & fiber for each individual item',
        'Instantly spot hidden sugars and high-fat ingredients',
        'Perfect for fine-tuning fitness and dietary goals',
      ],
      screenshotUrl: '/pro-features/ingredient-nutrition.png',
      icon: Scale,
    },
    cooking_mode: {
      id: 'cooking_mode',
      title: 'Focus Cooking Mode & Timers',
      tagline: 'Stress-free cooking without screen timeouts',
      bullets: [
        'Large, distraction-free step-by-step guidance',
        'Parallel in-app cooking timers with audio alerts',
        'Always check ingredient portions without leaving the step',
      ],
      screenshotUrl: '/pro-features/cooking-mode.png',
      icon: Play,
    },
    recipe_copilot: {
      id: 'recipe_copilot',
      title: 'Recipe Copilot & AI Remix',
      tagline: 'Your personal AI chef for every dish',
      bullets: [
        'Swap ingredients with 1 tap (vegan, dairy-free, low-carb)',
        'Optimize recipes for health or add side dishes',
        'Precise automatic recalculation of steps and nutrition',
      ],
      screenshotUrl: '/pro-features/recipe-copilot.png',
      icon: Sparkles,
    },
    unlimited_extractions: {
      id: 'unlimited_extractions',
      title: 'Unlimited Extractions',
      tagline: 'Import recipe videos & photos without daily limits',
      bullets: [
        'Unlimited imports from Instagram, TikTok & YouTube',
        'Photo scan of cookbook pages and handwritten recipes',
        'Zero daily restrictions or waiting cooldowns',
      ],
      screenshotUrl: '/pro-features/unlimited-extractions.png',
      icon: InfinityIcon,
    },
    collections_labels: {
      id: 'collections_labels',
      title: 'Collections & Custom Tags',
      tagline: 'Organize your cookbook exactly your way',
      bullets: [
        'Create custom folders and recipe collections',
        'Custom tags for effortless and fast filtering',
        'Complete structure across your personal cookbook',
      ],
      screenshotUrl: '/pro-features/collections-labels.png',
      icon: FolderHeart,
    },
  },
};

export function getProFeatureContent(id: ProFeatureId, lang: string = 'de'): ProFeatureContent {
  const normalizedLang = lang.startsWith('en') ? 'en' : 'de';
  return PRO_FEATURES_DATA[normalizedLang][id] ?? PRO_FEATURES_DATA.de[id];
}
