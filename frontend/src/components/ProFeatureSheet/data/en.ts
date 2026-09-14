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

export const PRO_FEATURES_EN: Record<ProFeatureId, ProFeatureContent> = {
  macros: {
    id: 'macros',
    title: 'Macronutrient Breakdown',
    tagline: 'Complete insight into protein, carbohydrates & fat',
    bullets: [
      'Exact gram and percentage values per serving',
      'Balanced macro distribution based on nutrition guidelines',
      'Instant recalculation when scaling servings',
    ],
    highlights: [
      {
        icon: PieChart,
        title: 'Exact Macro Balance',
        description: 'Protein, carbs, and fats in grams and percentages per portion.',
      },
      {
        icon: Target,
        title: 'Dietary Reference Values',
        description: 'Balanced macro distribution based on official nutrition guidelines.',
      },
      {
        icon: RefreshCw,
        title: 'Dynamic Scaling',
        description: 'Instant recalculation of all nutrients when changing servings.',
      },
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
    highlights: [
      {
        icon: HeartPulse,
        title: '4-Pillar Nutritional Audit',
        description: 'Evidence-based analysis adhering to DGE, WHO, and NOVA standards.',
      },
      {
        icon: Leaf,
        title: 'Plant Diversity & Veggies',
        description: 'Tracks exact vegetable weight and botanical ingredient diversity.',
      },
      {
        icon: Sparkles,
        title: 'Actionable Insights',
        description: 'Highlights recipe strengths and personalized health recommendations.',
      },
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
    highlights: [
      {
        icon: Scale,
        title: 'Per-Ingredient Values',
        description: 'Calories, macronutrients, and fiber for every single ingredient.',
      },
      {
        icon: Search,
        title: 'Uncover Hidden Traps',
        description: 'Instantly spot calorie-dense items, sugars, and hidden fats.',
      },
      {
        icon: Target,
        title: 'Precision Nutrition',
        description: 'Tailor macro targets seamlessly to your personal fitness plan.',
      },
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
    highlights: [
      {
        icon: Maximize2,
        title: 'Distraction-Free Focus',
        description: 'Large type, screen stays on, and effortless step gestures.',
      },
      {
        icon: Timer,
        title: 'Parallel In-App Timers',
        description: 'Start timers directly from recipe steps with audio alerts.',
      },
      {
        icon: ChefHat,
        title: 'Ingredients in Reach',
        description: 'Exact quantities for the current step without scrolling back.',
      },
    ],
    screenshotUrl: '/pro-features/cooking-mode.png',
    icon: Maximize2,
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
    highlights: [
      {
        icon: Sparkles,
        title: 'Smart AI Remix',
        description: 'Swap ingredients with one tap – vegan, gluten-free, or low-carb.',
      },
      {
        icon: Utensils,
        title: 'Personal Sous-Chef',
        description: 'Ask for side dish ideas, leftover usage, or kitchen techniques.',
      },
      {
        icon: RefreshCw,
        title: 'Instant Recalculation',
        description: 'Step instructions and nutrition adapt seamlessly in real time.',
      },
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
    highlights: [
      {
        icon: Video,
        title: 'All Video Platforms',
        description: 'Instantly import recipe reels from Instagram, TikTok & YouTube Shorts.',
      },
      {
        icon: Camera,
        title: 'Cookbook Photo Scan',
        description: 'Smart OCR scan for handwritten family cards, magazines, and books.',
      },
      {
        icon: InfinityIcon,
        title: 'Zero Limitations',
        description: 'No daily quotas, cooldown timers, or extraction caps.',
      },
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
    highlights: [
      {
        icon: FolderHeart,
        title: 'Custom Collections',
        description: 'Organize dishes by occasion, meal prep days, or personal favorites.',
      },
      {
        icon: Tag,
        title: 'Tailored Tags',
        description: 'Assign custom tags for lightning-fast multi-facet filtering.',
      },
      {
        icon: BookOpen,
        title: 'Your Digital Cookbook',
        description: 'Full sovereignty and clear structure over your culinary library.',
      },
    ],
    screenshotUrl: '/pro-features/collections-labels.png',
    icon: FolderHeart,
  },
};
