import {
  PieChart,
  Target,
  RefreshCw,
  HeartPulse,
  Leaf,
  Sparkles,
  Scale,
  Search,
  Maximize2,
  Timer,
  ChefHat,
  Utensils,
  Infinity as InfinityIcon,
  Video,
  Camera,
  FolderHeart,
  Tag,
  BookOpen,
} from 'lucide-react';
import type { ProFeatureContent, ProFeatureId } from '../types';

export const PRO_FEATURES_DE: Record<ProFeatureId, ProFeatureContent> = {
  macros: {
    id: 'macros',
    title: 'Makronährstoff-Verteilung',
    tagline: 'Volle Transparenz über Protein, Kohlenhydrate & Fett',
    bullets: [
      'Exakte Gramm- und Prozentangaben je Portion',
      'Ausgewogene Makro-Balance nach DGE-Referenzwerten',
      'Automatische Neuberechnung bei Portionsänderungen',
    ],
    highlights: [
      {
        icon: PieChart,
        title: 'Exakte Makro-Balance',
        description: 'Protein, Kohlenhydrate und Fett in Gramm und Prozent je Portion.',
      },
      {
        icon: Target,
        title: 'DGE-Referenzwerte',
        description: 'Ausgewogene Makro-Verteilung nach aktuellen Ernährungsempfehlungen.',
      },
      {
        icon: RefreshCw,
        title: 'Dynamische Skalierung',
        description: 'Berechnet alle Nährwerte sofort neu, wenn du Portionen anpasst.',
      },
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
    highlights: [
      {
        icon: HeartPulse,
        title: '4-Säulen-Ernährungsaudit',
        description: 'Wissenschaftlich fundierte Analyse nach DGE-, WHO- und NOVA-Standards.',
      },
      {
        icon: Leaf,
        title: 'Pflanzenvielfalt & Gemüse',
        description: 'Erfasst die genaue Gemüsedosis und Vielfalt pflanzlicher Zutaten.',
      },
      {
        icon: Sparkles,
        title: 'Transparente Insights',
        description: 'Konkrete Stärken des Rezepts und Tipps zur gesunden Optimierung.',
      },
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
    highlights: [
      {
        icon: Scale,
        title: 'Nährwerte je Einzelzutat',
        description: 'Kalorien, Makros und Ballaststoffe für jeden einzelnen Bestandteil.',
      },
      {
        icon: Search,
        title: 'Zucker- & Fettfallen erkennen',
        description: 'Entlarvt versteckte Kalorientreiber auf einen Blick.',
      },
      {
        icon: Target,
        title: 'Ziele punktgenau abstimmen',
        description: 'Passe Rezepte gezielt an deine persönlichen Fitness- & Makro-Ziele an.',
      },
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
    highlights: [
      {
        icon: Maximize2,
        title: 'Ablenkungsfreie Fokusansicht',
        description: 'Große Schrift, kein Display-Standby und entspannte Schrittführung.',
      },
      {
        icon: Timer,
        title: 'Parallele In-App-Timer',
        description: 'Garschritte direkt aus dem Text timen – mit akustischem Signal.',
      },
      {
        icon: ChefHat,
        title: 'Zutaten jederzeit griffbereit',
        description: 'Exakte Portionen direkt im Schritt ohne langes Scrollen.',
      },
    ],
    screenshotUrl: '/pro-features/cooking-mode.png',
    icon: Maximize2,
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
    highlights: [
      {
        icon: Sparkles,
        title: 'Intelligenter KI-Remix',
        description: 'Zutaten flexibel austauschen – ob vegan, laktosefrei oder Low-Carb.',
      },
      {
        icon: Utensils,
        title: 'Persönlicher Küchenchef',
        description: 'Frage die KI nach Beilagen-Tipps, Resteverwertung oder Kochtricks.',
      },
      {
        icon: RefreshCw,
        title: 'Automatische Neuberechnung',
        description: 'Zubereitungsschritte und Nährwerte passen sich sofort an.',
      },
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
    highlights: [
      {
        icon: Video,
        title: 'Alle Video-Plattformen',
        description: 'Reels aus Instagram, TikTok und YouTube Shorts blitzschnell importieren.',
      },
      {
        icon: Camera,
        title: 'Foto-Scan von Kochbüchern',
        description: 'Smarter OCR-Scan für Familienrezepte, Magazine und Buchseiten.',
      },
      {
        icon: InfinityIcon,
        title: 'Grenzenlose Freiheit',
        description: 'Keine täglichen Quoten, kein Cooldown und keine Wartezeiten.',
      },
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
    highlights: [
      {
        icon: FolderHeart,
        title: 'Eigene Rezept-Sammlungen',
        description: 'Ordne Rezepte nach Anlässen, Wochentagen oder Lieblingsgerichten.',
      },
      {
        icon: Tag,
        title: 'Benutzerdefinierte Tags',
        description: 'Erstelle eigene Schlagwörter für blitzschnelle Filtersuche.',
      },
      {
        icon: BookOpen,
        title: 'Persönliches Kochbuch',
        description: 'Behalte jederzeit den perfekten Überblick über deine Bibliothek.',
      },
    ],
    screenshotUrl: '/pro-features/collections-labels.png',
    icon: FolderHeart,
  },
};
