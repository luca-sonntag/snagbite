import {
  type AppErrorCode,
  type ErrorParams,
  isKnownErrorCode,
  parseSerializedError,
} from './errorCodes';

export const IngredientCategory = {
  // New standardized Swiss DB main categories
  VEGETABLES: 'VEGETABLES',
  FRUITS: 'FRUITS',
  DAIRY_EGGS: 'DAIRY_EGGS',
  MEAT_POULTRY: 'MEAT_POULTRY',
  SEAFOOD: 'SEAFOOD',
  GRAINS_PASTA: 'GRAINS_PASTA',
  OILS_CONDIMENTS: 'OILS_CONDIMENTS',
  SPICES_HERBS: 'SPICES_HERBS',
  NUTS_SEEDS: 'NUTS_SEEDS',
  SWEETS_SNACKS: 'SWEETS_SNACKS',
  BEVERAGES: 'BEVERAGES',
  PANTRY_BAKING: 'PANTRY_BAKING',
  PREPARED_DISHES: 'PREPARED_DISHES',

  // Legacy categories for backward compatibility
  PRODUCE: 'PRODUCE',
  BAKERY: 'BAKERY',
  PANTRY: 'PANTRY',
  BAKING: 'BAKING',
  CONDIMENTS_OILS: 'CONDIMENTS_OILS',
  FROZEN: 'FROZEN',
  OTHER: 'OTHER'
} as const;

export type IngredientCategory = typeof IngredientCategory[keyof typeof IngredientCategory];

export type SupportedLanguage = 'de' | 'en';

export const categoryTranslations: Record<SupportedLanguage, Record<IngredientCategory, string>> = {
  de: {
    [IngredientCategory.VEGETABLES]: 'Gemüse, Pilze & Salate',
    [IngredientCategory.FRUITS]: 'Obst, Früchte & Beeren',
    [IngredientCategory.DAIRY_EGGS]: 'Milchprodukte & Eier',
    [IngredientCategory.MEAT_POULTRY]: 'Fleisch & Geflügel',
    [IngredientCategory.SEAFOOD]: 'Fisch & Meeresfrüchte',
    [IngredientCategory.GRAINS_PASTA]: 'Getreide, Nudeln & Brot',
    [IngredientCategory.OILS_CONDIMENTS]: 'Öle, Saucen & Essig',
    [IngredientCategory.SPICES_HERBS]: 'Gewürze & Kräuter',
    [IngredientCategory.NUTS_SEEDS]: 'Nüsse & Samen',
    [IngredientCategory.SWEETS_SNACKS]: 'Süßwaren & Snacks',
    [IngredientCategory.BEVERAGES]: 'Getränke',
    [IngredientCategory.PANTRY_BAKING]: 'Backzutaten & Vorrat',
    [IngredientCategory.PREPARED_DISHES]: 'Fertiggerichte',

    // Legacy
    [IngredientCategory.PRODUCE]: 'Obst & Gemüse',
    [IngredientCategory.BAKERY]: 'Brot & Backwaren',
    [IngredientCategory.PANTRY]: 'Konserven & Vorrat',
    [IngredientCategory.BAKING]: 'Backzutaten',
    [IngredientCategory.CONDIMENTS_OILS]: 'Saucen & Öle',
    [IngredientCategory.FROZEN]: 'Tiefkühlkost',
    [IngredientCategory.OTHER]: 'Sonstiges',
  },
  en: {
    [IngredientCategory.VEGETABLES]: 'Vegetables & Mushrooms',
    [IngredientCategory.FRUITS]: 'Fruits & Berries',
    [IngredientCategory.DAIRY_EGGS]: 'Dairy & Eggs',
    [IngredientCategory.MEAT_POULTRY]: 'Meat & Poultry',
    [IngredientCategory.SEAFOOD]: 'Fish & Seafood',
    [IngredientCategory.GRAINS_PASTA]: 'Grains, Pasta & Bread',
    [IngredientCategory.OILS_CONDIMENTS]: 'Oils, Sauces & Vinegar',
    [IngredientCategory.SPICES_HERBS]: 'Spices & Herbs',
    [IngredientCategory.NUTS_SEEDS]: 'Nuts & Seeds',
    [IngredientCategory.SWEETS_SNACKS]: 'Sweets & Snacks',
    [IngredientCategory.BEVERAGES]: 'Beverages',
    [IngredientCategory.PANTRY_BAKING]: 'Baking & Pantry',
    [IngredientCategory.PREPARED_DISHES]: 'Prepared Dishes',

    // Legacy
    [IngredientCategory.PRODUCE]: 'Produce',
    [IngredientCategory.BAKERY]: 'Bakery',
    [IngredientCategory.PANTRY]: 'Pantry & Canned Goods',
    [IngredientCategory.BAKING]: 'Baking',
    [IngredientCategory.CONDIMENTS_OILS]: 'Condiments & Oils',
    [IngredientCategory.FROZEN]: 'Frozen Foods',
    [IngredientCategory.OTHER]: 'Other',
  }
};

// Map legacy category names (German or generic English) to English enum keys for backward compatibility
export const legacyCategoryMap: Record<string, IngredientCategory> = {
  'gemüse': IngredientCategory.VEGETABLES,
  'gemüse, pilze & salate': IngredientCategory.VEGETABLES,
  'vegetables': IngredientCategory.VEGETABLES,
  'obst': IngredientCategory.FRUITS,
  'früchte': IngredientCategory.FRUITS,
  'obst & früchte': IngredientCategory.FRUITS,
  'fruits': IngredientCategory.FRUITS,
  'nüsse': IngredientCategory.NUTS_SEEDS,
  'nüsse & samen': IngredientCategory.NUTS_SEEDS,
  'nuts & seeds': IngredientCategory.NUTS_SEEDS,
  'süßigkeiten': IngredientCategory.SWEETS_SNACKS,
  'süßwaren & snacks': IngredientCategory.SWEETS_SNACKS,
  'sweets & snacks': IngredientCategory.SWEETS_SNACKS,
  'fertiggerichte': IngredientCategory.PREPARED_DISHES,
  'prepared dishes': IngredientCategory.PREPARED_DISHES,
  'obst & gemüse': IngredientCategory.PRODUCE,
  'obst und gemüse': IngredientCategory.PRODUCE,
  'frische kräuter': IngredientCategory.VEGETABLES,
  'brot & backwaren': IngredientCategory.GRAINS_PASTA,
  'backwaren': IngredientCategory.GRAINS_PASTA,
  'fleisch & geflügel': IngredientCategory.MEAT_POULTRY,
  'fleisch': IngredientCategory.MEAT_POULTRY,
  'geflügel': IngredientCategory.MEAT_POULTRY,
  'fisch & meeresfrüchte': IngredientCategory.SEAFOOD,
  'fisch': IngredientCategory.SEAFOOD,
  'molkereiprodukte & eier': IngredientCategory.DAIRY_EGGS,
  'molkereiprodukte': IngredientCategory.DAIRY_EGGS,
  'käse & molkereiprodukte': IngredientCategory.DAIRY_EGGS,
  'milchprodukte': IngredientCategory.DAIRY_EGGS,
  'eier': IngredientCategory.DAIRY_EGGS,
  'konserven & vorrat': IngredientCategory.PANTRY_BAKING,
  'konserven': IngredientCategory.PANTRY_BAKING,
  'vorrat': IngredientCategory.PANTRY_BAKING,
  'vorratskammer': IngredientCategory.PANTRY_BAKING,
  'getreide & nudeln': IngredientCategory.GRAINS_PASTA,
  'getreide': IngredientCategory.GRAINS_PASTA,
  'nudeln': IngredientCategory.GRAINS_PASTA,
  'gewürze & kräuter': IngredientCategory.SPICES_HERBS,
  'gewürze': IngredientCategory.SPICES_HERBS,
  'backzutaten': IngredientCategory.PANTRY_BAKING,
  'saucen & öle': IngredientCategory.OILS_CONDIMENTS,
  'öle & saucen': IngredientCategory.OILS_CONDIMENTS,
  'öle': IngredientCategory.OILS_CONDIMENTS,
  'saucen': IngredientCategory.OILS_CONDIMENTS,
  'tiefkühlkost': IngredientCategory.FROZEN,
  'getränke': IngredientCategory.BEVERAGES,
  'fruits_vegetables': IngredientCategory.PRODUCE,
  'fruit_vegetable': IngredientCategory.PRODUCE,
  'dairy': IngredientCategory.DAIRY_EGGS,
  'meat_fish': IngredientCategory.MEAT_POULTRY,
  'grains': IngredientCategory.GRAINS_PASTA,
  'spices': IngredientCategory.SPICES_HERBS,
  'condiments': IngredientCategory.OILS_CONDIMENTS,
  'sweets': IngredientCategory.SWEETS_SNACKS,
  'sonstiges': IngredientCategory.OTHER,
  'extras': IngredientCategory.OTHER,
  'ingredients': IngredientCategory.OTHER,
  'zutaten': IngredientCategory.OTHER,
};

export function translateCategory(category: string, lang: SupportedLanguage = 'de'): string {
  if (!category) return categoryTranslations[lang][IngredientCategory.OTHER];
  const cleanCategory = category.trim().toUpperCase();

  // 1. If it's already a valid enum key, translate it directly
  if (cleanCategory in IngredientCategory) {
    return categoryTranslations[lang][cleanCategory as IngredientCategory] || category;
  }

  // 2. Backward compatibility: check if it's a legacy category name
  const lowerCategory = category.trim().toLowerCase();
  const mappedKey = legacyCategoryMap[lowerCategory];
  if (mappedKey) {
    return categoryTranslations[lang][mappedKey];
  }

  // 3. Fallback: return the original string
  return category;
}

// Fixed sorting order for supermarket layout
export const categoryOrder: IngredientCategory[] = [
  IngredientCategory.VEGETABLES,
  IngredientCategory.FRUITS,
  IngredientCategory.PRODUCE,
  IngredientCategory.DAIRY_EGGS,
  IngredientCategory.MEAT_POULTRY,
  IngredientCategory.SEAFOOD,
  IngredientCategory.GRAINS_PASTA,
  IngredientCategory.BAKERY,
  IngredientCategory.OILS_CONDIMENTS,
  IngredientCategory.CONDIMENTS_OILS,
  IngredientCategory.SPICES_HERBS,
  IngredientCategory.NUTS_SEEDS,
  IngredientCategory.SWEETS_SNACKS,
  IngredientCategory.PANTRY_BAKING,
  IngredientCategory.BAKING,
  IngredientCategory.PANTRY,
  IngredientCategory.PREPARED_DISHES,
  IngredientCategory.FROZEN,
  IngredientCategory.BEVERAGES,
  IngredientCategory.OTHER
];

// Icons for each category
export const categoryIcons: Record<IngredientCategory, string> = {
  [IngredientCategory.VEGETABLES]: '🥦',
  [IngredientCategory.FRUITS]: '🍎',
  [IngredientCategory.DAIRY_EGGS]: '🥛',
  [IngredientCategory.MEAT_POULTRY]: '🥩',
  [IngredientCategory.SEAFOOD]: '🐟',
  [IngredientCategory.GRAINS_PASTA]: '🍝',
  [IngredientCategory.OILS_CONDIMENTS]: '🍶',
  [IngredientCategory.SPICES_HERBS]: '🧂',
  [IngredientCategory.NUTS_SEEDS]: '🥜',
  [IngredientCategory.SWEETS_SNACKS]: '🍫',
  [IngredientCategory.BEVERAGES]: '🥤',
  [IngredientCategory.PANTRY_BAKING]: '🥣',
  [IngredientCategory.PREPARED_DISHES]: '🍱',

  // Legacy
  [IngredientCategory.PRODUCE]: '🥦',
  [IngredientCategory.BAKERY]: '🍞',
  [IngredientCategory.PANTRY]: '🥫',
  [IngredientCategory.BAKING]: '🥣',
  [IngredientCategory.CONDIMENTS_OILS]: '🍶',
  [IngredientCategory.FROZEN]: '❄️',
  [IngredientCategory.OTHER]: '🛍️',
};

export function getCategoryIcon(category: string): string {
  if (!category) return '🛍️';
  const cleanCategory = category.trim().toUpperCase();
  if (cleanCategory in IngredientCategory) {
    return categoryIcons[cleanCategory as IngredientCategory];
  }
  const lowerCategory = category.trim().toLowerCase();
  const mappedKey = legacyCategoryMap[lowerCategory];
  if (mappedKey) {
    return categoryIcons[mappedKey];
  }
  return '🛍️'; // Default
}

export interface CategoryTheme {
  barClass: string;
  hex: string;
}

// Dedicated accent colors for each supermarket aisle/category
export const categoryColors: Record<IngredientCategory, CategoryTheme> = {
  [IngredientCategory.VEGETABLES]: {
    barClass: 'bg-emerald-500',
    hex: '#10b981',
  },
  [IngredientCategory.FRUITS]: {
    barClass: 'bg-rose-400',
    hex: '#fb7185',
  },
  [IngredientCategory.DAIRY_EGGS]: {
    barClass: 'bg-blue-500',
    hex: '#3b82f6',
  },
  [IngredientCategory.MEAT_POULTRY]: {
    barClass: 'bg-rose-600',
    hex: '#e11d48',
  },
  [IngredientCategory.SEAFOOD]: {
    barClass: 'bg-cyan-500',
    hex: '#06b6d4',
  },
  [IngredientCategory.GRAINS_PASTA]: {
    barClass: 'bg-amber-500',
    hex: '#f59e0b',
  },
  [IngredientCategory.OILS_CONDIMENTS]: {
    barClass: 'bg-violet-500',
    hex: '#8b5cf6',
  },
  [IngredientCategory.SPICES_HERBS]: {
    barClass: 'bg-teal-500',
    hex: '#14b8a6',
  },
  [IngredientCategory.NUTS_SEEDS]: {
    barClass: 'bg-orange-400',
    hex: '#fb923c',
  },
  [IngredientCategory.SWEETS_SNACKS]: {
    barClass: 'bg-pink-500',
    hex: '#ec4899',
  },
  [IngredientCategory.BEVERAGES]: {
    barClass: 'bg-lime-500',
    hex: '#84cc16',
  },
  [IngredientCategory.PANTRY_BAKING]: {
    barClass: 'bg-amber-700',
    hex: '#b45309',
  },
  [IngredientCategory.PREPARED_DISHES]: {
    barClass: 'bg-indigo-500',
    hex: '#6366f1',
  },

  // Legacy
  [IngredientCategory.PRODUCE]: {
    barClass: 'bg-emerald-500',
    hex: '#10b981',
  },
  [IngredientCategory.BAKERY]: {
    barClass: 'bg-amber-500',
    hex: '#f59e0b',
  },
  [IngredientCategory.PANTRY]: {
    barClass: 'bg-orange-500',
    hex: '#f97316',
  },
  [IngredientCategory.BAKING]: {
    barClass: 'bg-pink-500',
    hex: '#ec4899',
  },
  [IngredientCategory.CONDIMENTS_OILS]: {
    barClass: 'bg-violet-500',
    hex: '#8b5cf6',
  },
  [IngredientCategory.FROZEN]: {
    barClass: 'bg-sky-400',
    hex: '#38bdf8',
  },
  [IngredientCategory.OTHER]: {
    barClass: 'bg-slate-400',
    hex: '#94a3b8',
  },
};

export function getCategoryTheme(category: string): CategoryTheme {
  if (!category) return categoryColors[IngredientCategory.OTHER];
  const cleanCategory = category.trim().toUpperCase();
  if (cleanCategory in IngredientCategory) {
    return categoryColors[cleanCategory as IngredientCategory];
  }
  const lowerCategory = category.trim().toLowerCase();
  const mappedKey = legacyCategoryMap[lowerCategory];
  if (mappedKey && categoryColors[mappedKey]) {
    return categoryColors[mappedKey];
  }
  return categoryColors[IngredientCategory.OTHER];
}


export const uiTranslations = {
  de: {
    ads: {
      label: 'Werbung',
      rewardedTitle: 'Gratis-Rezept freischalten',
      rewardedDesc: 'Schau ein kurzes Video an, um sofort +1 Rezept zu erhalten.',
      rewardedBtn: 'Video ansehen (+1 Rezept)',
      rewardedLoading: 'Video wird geladen...',
      rewardedSuccess: '+1 Rezept erfolgreich freigeschaltet!',
      rewardedFailed: 'Video konnte nicht geladen werden. Bitte versuche es später erneut.',
    },
    onboarding: {
      skip: 'Überspringen',
      back: 'Zurück',
      next: 'Weiter',
      cta: "Los geht's",
      replayLabel: 'Einführung erneut ansehen',
      slides: {
        welcome: {
          title: 'Willkommen bei Snagbite',
          desc: 'Verwandle Koch-Reels aus dem Netz in übersichtliche, interaktive Rezepte – automatisch aufbereitet von KI.',
        },
        import: {
          title: 'Importieren & Teilen',
          desc: 'Füge einen Link ein oder teile ein Reel direkt aus Instagram, TikTok, YouTube oder Facebook an Snagbite. Wir erstellen das komplette Rezept für dich.',
        },
        cookbook: {
          title: 'Dein Kochbuch',
          desc: 'Jedes gespeicherte Rezept landet automatisch in deinem Kochbuch – durchsuchbar, filterbar und mit anpassbarer Portionsgröße.',
        },
        organize: {
          title: 'Ordnen & Filtern',
          desc: 'Lege eigene Sammlungen mit Emoji & Farbe an, markiere Favoriten und vergib Labels. Filtere dein Kochbuch mit einem Tipp nach Sammlung, Favorit, Kochzeit oder Label.',
        },
        shopping: {
          title: 'Smarte Einkaufsliste',
          desc: 'Übernimm Zutaten mit einem Tipp in die Einkaufsliste. Sie werden automatisch zusammengefasst und nach Supermarkt-Abteilung sortiert.',
        },
        cooking: {
          title: 'Kochen wie ein Profi',
          desc: 'Schritt-für-Schritt-Kochmodus, integrierte Timer und ein KI-Copilot, der Fragen beantwortet und Rezepte anpasst.',
        },
      },
    },
    alphaWelcome: {
      badge: 'Alpha-Test',
      title: 'Willkommen zum Alpha-Test!',
      intro: 'Schön, dass du dabei bist! Du gehörst zu den Ersten, die Snagbite ausprobieren. Als Alpha-Tester hast du kostenlosen Zugriff auf alle Premium-Features.',
      info: {
        heading: 'Wichtige Infos für Alpha-Tester',
        early: 'Die App steckt noch in einer frühen Phase – einzelne Funktionen können sich ändern oder noch nicht rundlaufen.',
        keepInstalled: 'Google gibt den Test erst nach 14 Tagen frei – dafür muss die App installiert bleiben und ab und zu geöffnet werden.',
        feedback: 'Bugs, Feedback oder Feature-Wünsche? Gehen direkt in der App über „Fehler melden / Feedback“ in den',
        settingsPath: 'Einstellungen',
      },
      cta: "Los geht's",
    },
    app: {
      title: 'Snagbite',
      subtitle: 'Rezept-Assistent',
      nav: {
        newRecipe: 'Neu',
        savedRecipes: 'Rezepte',
        shoppingList: 'Einkaufsliste',
        progress: 'Fortschritt',
        settings: 'Profil',
      },
      gamification: {
        tabTitle: 'Fortschritt',
        level: 'Level {level}',
        levelShort: 'Lvl {level}',
        xpToNext: 'Noch {xp} XP bis Lvl {level}',
        maxLevel: 'Max-Level',
        xp: 'XP',
        xpGained: '+{xp} XP',
        coinsGained: '+{coins}',
        levelUp: 'Level {level}!',
        newBadge: 'Neues Abzeichen!',
        tapToContinue: 'Tippen zum Fortfahren',
        streakDays: '{days} Tage Serie',
        streakNone: 'Noch keine Serie',
        longestStreak: 'Längste Serie: {days} Tage',
        coins: 'Coins',
        totalCooks: 'Gerichte gekocht',
        badgesTitle: 'Abzeichen',
        badgesEmpty: 'Koche Gerichte, um Abzeichen freizuschalten.',
        emptyTitle: 'Leg los!',
        emptySubtitle: 'Koch dein erstes Rezept und sammle XP.',
        cooked: 'Ich hab das gekocht',
        cooking: 'Speichern…',
        cookedDone: 'Gekocht ✓',
        addPhoto: 'Foto',
        photoAdded: 'Foto ✓',
        duplicate: 'Schon gezählt',
        cookError: 'Konnte nicht gespeichert werden',
        modalTitle: 'Als gekocht eintragen & XP sichern',
        modalSubtitle: 'Lade ein Foto deines fertig gekochten Gerichts hoch, um dir deinen XP-Bonus zu sichern.',
        takePhoto: 'Foto aufnehmen',
        chooseGallery: 'Aus Galerie wählen',
        verifyBtn: 'Foto hochladen & XP sichern',
        verifyingTitle: 'Dein Foto wird hochgeladen...',
        verifyingDesc: 'Gleich geschafft — Foto wird zu deiner Historie hinzugefügt...',
        retryPhoto: 'Neues Foto versuchen',
        rejectionTitle: 'Foto nicht erkannt',
        rejectionReason: 'Das Foto passt leider nicht zu diesem Rezept.',
        cookedCardTitle: 'Du hast dieses Gericht gekocht?',
        cookedCardSubtitle: 'Lade ein Foto deines Gerichts hoch, um es in deiner Historie einzuloggen und XP zu kassieren.',
        cookedCardBtn: 'Als gekocht eintragen',
        cookedCardBtnAgain: 'Erneut gekocht ({count}×)',
        cookedChip: '{count}× gekocht',
        cookedChipLast: 'zuletzt {when}',
        cookedTimelineTitle: 'Deine Koch-Historie',
        cookedTimelineEmpty: 'Du hast dieses Rezept noch nicht gekocht.',
        cookedViaMode: 'Koch-Modus',
        cookedWithTimer: 'Timer genutzt',
        cookedAttempt: '{count}. Zubereitung',
        cookedVerified: 'Mit Foto',
        cookedNoPhoto: 'Ohne Foto',
        cookedTotalXp: '+{xp} XP gesammelt',
        streakReminder: {
          title: '🔥 Serie nicht verlieren',
          body: 'Du bist bei {days} Tagen in Folge — koch heute, um die Serie zu halten!',
        },
        progressLabel: 'Fortschritt',
        galleryTitle: 'Deine Koch-Galerie',
        galleryEmpty: 'Noch keine Fotos. Lade bei deiner nächsten Zubereitung ein Foto hoch!',
        coinsComingSoon: 'Demnächst',
        coinsNotice: 'Der Coin-Shop kommt in Kürze!',
        leaderboardTitle: 'Rangliste',
        leaderboardSubtitle: 'Deine {xp} XP zählen schon — bald misst du dich mit Freunden in der Rangliste!',
        leaderboardComingSoon: 'Demnächst',
        leaderboardNotice: 'Die Rangliste kommt bald — misst du dich mit Freunden, deine XP zählen schon mit!',
        streakWeekly: '{days} W-Serie',
        ranks: {
          level_1: 'Küchenneuling',
          level_2: 'Hobby-Chef',
          level_3: 'Küchen-Talent',
          level_4: 'Gourmet-Koch',
          level_5: 'Meisterkoch',
          level_6: 'Sternekoch',
        },
        badgeDetail: {
          statusLocked: 'Noch gesperrt',
          statusUnlocked: 'Freigeschaltet',
          reward: 'Belohnung: +{xp} XP',
          progressLabel: '{current} von {total} erreicht',
          unlockedOn: 'Freigeschaltet am {date}',
        },
        badgeDesc: {
          first_cook: 'Koche dein allererstes Rezept in der App.',
          cook_10: 'Koche insgesamt 10 leckere Gerichte.',
          cook_25: 'Koche insgesamt 25 leckere Gerichte.',
          cook_50: 'Koche insgesamt 50 leckere Gerichte.',
          cook_100: 'Koche insgesamt 100 leckere Gerichte.',
          streak_3: 'Halte deine Koch-Serie für 3 Wochen aktiv.',
          streak_7: 'Halte deine Koch-Serie für 7 Wochen aktiv.',
          streak_30: 'Halte deine Koch-Serie für 30 Wochen aktiv.',
          first_photo: 'Verifiziere ein Gericht mit deinem ersten Foto.',
          distinct_5: 'Koche 5 verschiedene Rezepte aus deiner Sammlung.',
          distinct_10: 'Koche 10 verschiedene Rezepte aus deiner Sammlung.',
          distinct_25: 'Koche 25 verschiedene Rezepte aus deiner Sammlung.',
          night_owl: 'Koche ein Gericht nach 22 Uhr.',
          weekend_chef: 'Koche 5 Gerichte am Wochenende.',
          timer_first: 'Benutze den Koch-Timer zum ersten Mal.',
          timer_10: 'Benutze den Koch-Timer insgesamt 10 Mal.',
          same_recipe_3: 'Koche dasselbe Rezept mindestens 3 Mal.',
        },
        badges: {
          first_cook: 'Erstes Gericht',
          cook_10: '10 Gerichte',
          cook_25: '25 Gerichte',
          cook_50: '50 Gerichte',
          cook_100: '100 Gerichte',
          streak_3: '3-Wochen-Serie',
          streak_7: '7-Wochen-Serie',
          streak_30: '30-Wochen-Serie',
          first_photo: 'Erstes Foto',
          distinct_5: '5 verschiedene Rezepte',
          distinct_10: '10 verschiedene Rezepte',
          distinct_25: '25 verschiedene Rezepte',
          night_owl: 'Nachteule',
          weekend_chef: 'Wochenend-Koch',
          timer_first: 'Erster Timer',
          timer_10: 'Timer-Profi',
          same_recipe_3: 'Lieblingsgericht',
        },
      },
      social: {
        sections: { overview: 'Übersicht', leaderboard: 'Rangliste', friends: 'Freunde' },
        leaderboard: {
          monthly: 'Diesen Monat',
          weekly: 'Diese Woche',
          allTime: 'Gesamt',
          scopeFriends: 'Freunde',
          scopeGlobal: 'Global',
          you: 'Du',
          empty: 'Füge Freunde hinzu, um euch zu messen.',
          emptyGlobal: 'Noch keine Einträge im globalen Leaderboard.',
          addFriend: '+ Freund',
          requested: 'Angefragt',
          friends: 'Freunde',
          accept: 'Annehmen',
          requestSuccess: 'Freundschaftsanfrage gesendet!',
        },
        friends: {
          yourCode: 'Dein Freundescode',
          share: 'Einladung teilen',
          addTitle: 'Freund hinzufügen',
          addPlaceholder: 'Freundescode',
          add: 'Hinzufügen',
          requests: 'Anfragen',
          accept: 'Annehmen',
          decline: 'Ablehnen',
          yourFriends: 'Deine Freunde',
          none: 'Noch keine Freunde. Teile deinen Code!',
          remove: 'Entfernen',
          editName: 'Namen ändern',
          requestSent: 'Anfrage gesendet.',
          requestAccepted: 'Ihr seid jetzt Freunde!',
          genericError: 'Etwas ist schiefgelaufen.',
          inviteText: 'Füge mich auf Snagbite hinzu! Mein Freundescode: {code}',
        },
      },
      settings: {
        language: 'Sprache',
        theme: 'Erscheinungsbild',
        tempUnit: 'Temperatureinheit',
        unitSystem: 'Maßsystem',
        tempUnitCelsius: 'Celsius (°C)',
        tempUnitFahrenheit: 'Fahrenheit (°F)',
        tempUnitBoth: 'Beide (°C & °F)',
        unitSystemMetric: 'Metrisch (g, ml, kg)',
        unitSystemImperial: 'Imperial (oz, cups, lbs)',
        settingInfoTooltip: 'Diese Einstellung wirkt sich nur auf neu erstellte Rezepte aus.',
        saving: 'Speichern...',
        saved: 'Einstellungen gespeichert!',
        deleteAccount: 'Konto löschen',
        upgradePremium: 'Auf Premium upgraden',
        premiumActive: 'Aktiv',
        premiumActiveDesc: 'Du hast unbegrenzten Zugriff auf alle Premium-Features.',
        alphaActive: 'Alpha-Zugriff',
        alphaActiveDesc: 'Du bist Alpha-Tester! Du hast kostenlosen Zugriff auf alle Premium-Features während der Alpha. Tageslimits gelten weiterhin.',
        premiumCardDesc: 'Schalte unbegrenzten Rezept-Import, KI-Chat & Remix und smarte Einkaufslisten frei.',
        legal: {
          section: 'Rechtliches',
          privacy: 'Datenschutzerklärung',
          terms: 'AGB',
          imprint: 'Impressum',
        },
      },
      dialog: {
        deleteAccount: {
          title: 'Konto löschen?',
          message: 'Möchtest du dein Konto wirklich unwiderruflich löschen? Alle deine gespeicherten Rezepte und Einkaufslisten gehen dauerhaft verloren. **Bitte beachte: Falls du ein aktives Premium-Abonnement hast, musst du dieses zusätzlich im Google Play Store kündigen, um weitere Zahlungen zu verhindern.**',
          confirm: 'Konto löschen',
          cancel: 'Abbrechen',
        },
        deleteAccountError: {
          title: 'Fehler beim Löschen',
          message: 'Dein Konto konnte nicht gelöscht werden. Bitte versuche es später noch einmal.',
        },
        deleteRecipe: {
          title: 'Rezept löschen?',
          message: 'Möchtest du dieses Rezept wirklich aus den gespeicherten Rezepten löschen?',
          confirm: 'Löschen',
          cancel: 'Abbrechen',
        },
        deleteError: {
          title: 'Fehler beim Löschen',
          message: 'Das Rezept konnte nicht gelöscht werden.',
        },
        connectionError: {
          title: 'Verbindungsfehler',
          message: 'Es konnte keine Verbindung zum Server hergestellt werden.',
        }
      }
    },
    job: {
      status: {
        pending: {
          text: 'In der Warteschlange...',
          sub: 'Warte auf Server-Ressourcen...',
        },
        scraping: {
          text: 'Quelle wird abgerufen...',
          sub: 'Instagram-Daten werden ausgelesen...',
        },
        processing: {
          text: 'Rezept wird erstellt...',
          sub: 'KI analysiert Audio und Text...',
        },
        completed: {
          text: 'Rezept bereit!',
          sub: 'Das Rezept wird geladen...',
        },
        failed: {
          text: 'Erstellung fehlgeschlagen',
          sub: 'Das Rezept konnte nicht erstellt werden.',
        }
      },
      progress: {
        stages: {
          queued: 'Vorbereiten...',
          scraping: 'Inhalte analysieren...',
          downloading_media: 'Zutaten erfassen...',
          extracting_frames: 'Zubereitungsschritte prüfen...',
          reading_photos: 'Rezeptkarten auslesen...',
          extracting_recipe: 'Rezept strukturieren...',
          generating_cover: 'Cover-Bild generieren...',
          finalizing: 'Fast fertig, wird serviert...'
        }
      },
      backgroundNotice: 'Dein Rezept wird im Hintergrund vorbereitet. Du kannst die App verlassen – du wirst benachrichtigt, sobald es fertig ist.'
    },
    theme: {
      toggle: 'Theme umschalten',
    },
    notification: {
      recipeReady: {
        title: 'Rezept bereit',
        body: 'Dein Rezept „{title}“ ist bereit zum Kochen!',
      },
      extractionInterrupted: {
        title: '⚠️ Rezept-Import unterbrochen',
        body: 'Rezepte können in der Free-Version nur erstellt werden, wenn die App geöffnet bleibt.',
      },
      prompt: {
        badge: 'Empfehlungen',
        title: 'Lust auf neue Koch-Inspiration?',
        description: 'Nie wieder „Was koche ich heute?“ Erhalte mehrmals in der Woche abends passende Ideen aus deinen Rezepten.',
        feature1: 'Passende Ideen aus deinen Rezepten',
        feature2: 'Mehrmals in der Woche, kein Spam',
        enable: 'Inspiration erhalten',
        later: 'Später',
        dismiss: 'Benachrichtigungshinweis schließen',
      },
    },
    auth: {
      signInTitle: 'Melde dich an, um deine Rezepte zu verwalten',
      unexpectedError: 'Ein unerwarteter Fehler ist aufgetreten.',
      signOut: 'Abmelden',
      signInWithGoogle: 'Mit Google anmelden',
      consentPrefix: 'Mit der Anmeldung akzeptierst du unsere ',
      consentTermsLink: 'AGB',
      consentConjunction: ' und ',
      consentPrivacyLink: 'Datenschutzerklärung',
      consentSuffix: '.',
    },
    error: {
      title: 'Rezept-Erstellung fehlgeschlagen',
      default: 'Beim Analysieren des Links ist ein unbekannter Fehler aufgetreten.',
      retry: 'Wiederholen',
      generic: 'Beim Erstellen des Rezepts ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      codes: {
        MISSING_FIELD: '{field} fehlt. Bitte überprüfe deine Eingabe.',
        INVALID_FIELD: '{field} ist ungültig. Bitte überprüfe deine Eingabe.',
        INVALID_URL: 'Ungültiger Link. Bitte gib einen gültigen Instagram-, TikTok-, YouTube-Shorts- oder Website-Link ein.',
        YOUTUBE_SHORTS_ONLY: 'Es werden nur YouTube Shorts unterstützt, keine regulären YouTube-Videos.',
        REMIX_PROMPT_TOO_LONG: 'Der Remix-Text darf maximal {max} Zeichen lang sein.',
        MESSAGE_TOO_LONG: 'Die Nachricht ist zu lang (max. {max} Zeichen).',
        TOO_MANY_SCREENSHOTS: 'Zu viele Screenshots (max. {max}).',
        SCREENSHOTS_TOO_LARGE: 'Die Screenshots sind zu groß. Bitte verwende kleinere Bilder.',
        TOO_MANY_PHOTOS: 'Zu viele Fotos (max. {max}).',
        PHOTOS_TOO_LARGE: 'Die Fotos sind insgesamt zu groß. Bitte wähle weniger Fotos aus.',
        PARENT_JOB_NOT_COMPLETED: 'Das Ursprungsrezept ist noch nicht fertig. Bitte warte, bis es abgeschlossen ist.',
        UNAUTHORIZED: 'Nicht autorisiert. Bitte melde dich erneut an.',
        COOKBOOK_FULL: 'Kochbuch voll ({counts}). Lösche ein Rezept oder hol dir Premium, um weitere Rezepte zu speichern.',
        RATE_LIMIT_EXCEEDED: 'Du hast dein Limit von {limit} Rezepten pro {period} erreicht. {retry}',
        ACTIVE_JOB_EXISTS: 'Du hast bereits {count} laufende Rezept-Import(e). Bitte warte, bis diese abgeschlossen sind.',
        TOO_MANY_REQUESTS: 'Zu viele Anfragen. Bitte versuche es später noch einmal.',
        JOB_NOT_FOUND: 'Rezept nicht gefunden.',
        RECIPE_NOT_FOUND: 'Rezept nicht gefunden.',
        COLLECTION_NOT_FOUND: 'Sammlung nicht gefunden.',
        PARENT_JOB_NOT_FOUND: 'Ursprungsrezept nicht gefunden.',
        FRIEND_CODE_INVALID: 'Dieser Freundescode existiert nicht.',
        FRIEND_SELF: 'Du kannst dich nicht selbst hinzufügen.',
        ALREADY_FRIENDS: 'Ihr seid bereits Freunde.',
        REQUEST_EXISTS: 'Anfrage läuft bereits.',
        FRIENDSHIP_NOT_FOUND: 'Freundschaft nicht gefunden.',
        PROFILE_NAME_INVALID: 'Name muss 1–{max} Zeichen lang sein.',
        SCRAPE_FAILED: 'Aus diesem Link konnte leider kein Rezept erkannt werden. Das Video ist privat, gelöscht oder enthält keine Rezeptbeschreibung.',
        SCRAPE_TIMEOUT: 'Das Laden hat etwas zu lange gedauert. Bitte probiere es gleich noch einmal.',
        VIDEO_TOO_LONG: 'Das Video ist leider zu lang (maximal {limit}).',
        VIDEO_TOO_LONG_NO_LIMIT: 'Das Video ist leider zu lang.',
        MEDIA_DOWNLOAD_FAILED: 'Das Video konnte nicht geladen werden. Bitte versuche es gleich noch einmal.',
        NOT_A_RECIPE: 'In diesem Beitrag wurden leider keine Zutaten oder Zubereitungsschritte gefunden. Bitte stelle sicher, dass das Rezept in der Videobeschreibung steht.',
        MULTIPLE_RECIPES: 'Dieser Beitrag enthält mehrere Rezepte auf einmal. Bitte wähle einen Beitrag mit einem einzelnen Rezept.',
        WEBSITE_NO_RECIPE: 'Auf dieser Webseite konnten wir leider kein Rezept finden.',
        PHOTO_UNREADABLE: 'Der Text war auf dem Foto leider schwer zu erkennen. Achte auf gutes Licht und fotografiere die Seite möglichst gerade.',
        PHOTO_REQUIRED: 'Für das Verifizieren deines Gerichts ist ein Foto erforderlich.',
        PHOTO_NOT_MATCHING: 'Das Foto passt leider nicht ganz zum Rezept: {reason}',
        PHOTO_IMPORT_EXPIRED: 'Deine Fotos sind nicht mehr verfügbar. Bitte wähle sie noch einmal aus.',
        PHOTO_UPLOAD_FAILED: 'Deine Fotos konnten nicht hochgeladen werden. Bitte prüfe deine Internetverbindung und versuche es noch einmal.',
        UNRELATED_REMIX_REQUEST: 'Ungültige Anfrage: Die KI hat keine Rezeptänderung im eingegebenen Text erkannt.',
        REVENUECAT_FAILED: 'Der Abo-Status konnte nicht abgerufen werden. Bitte versuche es später erneut.',
        PROFILE_UPDATE_FAILED: 'Dein Profil konnte nicht aktualisiert werden. Bitte versuche es später erneut.',
        CHAT_CHIPS_FAILED: 'Die Vorschläge konnten nicht geladen werden. Bitte versuche es später erneut.',
        REMIX_CONFIRM_FAILED: 'Der Remix konnte nicht bestätigt werden. Bitte versuche es später erneut.',
        CHAT_FAILED: 'Der Chat ist fehlgeschlagen. Bitte versuche es später erneut.',
        ACCOUNT_DELETE_FAILED: 'Dein Konto konnte nicht gelöscht werden. Bitte versuche es später erneut.',
        INTERNAL_ERROR: 'Ein interner Serverfehler ist aufgetreten. Bitte versuche es später erneut.',
      },
      premium: {
        remix: 'Rezept Remix ist eine Premium-Funktion. Hol dir Premium, um Rezepte anzupassen.',
        chat: 'Der KI-Küchenchef-Chat ist eine Premium-Funktion. Hol dir Premium, um mit dem Rezept-Copilot zu chatten.',
        collections: 'Sammlungen sind eine Premium-Funktion. Hol dir Premium, um sie zu nutzen.',
        tags: 'Eigene Tags sind eine Premium-Funktion. Hol dir Premium, um sie zu nutzen.',
        generic: 'Das ist eine Premium-Funktion. Hol dir Premium, um sie zu nutzen.',
      },
      field: {
        url: 'Der Link',
        photos: 'Die Fotos',
        prompt: 'Der Text',
        message: 'Die Nachricht',
        modificationRequest: 'Die Änderung',
        generic: 'Eine Angabe',
      },
      duration: {
        minutes: '{n} Minuten',
        seconds: '{n} Sekunden',
        day1: '1 Tag',
        dayN: '{n} Tagen',
        andHours: ' und {h} Std.',
      },
      period: {
        day: 'Tag',
        days: '{n} Tagen',
      },
      tryAgain: {
        later: 'Bitte versuche es später erneut.',
        minutes: 'Bitte versuche es in {m} Min. erneut.',
        hours: 'Bitte versuche es in {h} Std. erneut.',
        hoursMinutes: 'Bitte versuche es in {h} Std. und {m} Min. erneut.',
        days: 'Bitte versuche es in {dayStr}{hourStr} erneut.',
      },
    },
    activeExtractions: {
      title: 'Laufende Rezept-Importe',
      titleDone: 'Fertige Rezepte',
      titleFailed: 'Hinweis zum Rezept-Import',
      statusRunning: 'Wird erstellt…',
      ready: 'Rezept fertig',
      tapToOpen: 'Tippen, um das Rezept zu öffnen',
      dismiss: 'Ausblenden',
      photoSource: 'Fotos',
      stages: {
        queued: 'Wird vorbereitet…',
        scraping: 'Inhalte analysieren…',
        downloading_media: 'Zutaten erfassen…',
        extracting_frames: 'Schritte prüfen…',
        reading_photos: 'Rezeptkarten erfassen…',
        extracting_recipe: 'Rezept strukturieren…',
        generating_cover: 'Cover-Bild generieren…',
        finalizing: 'Wird serviert…',
      },
    },
    form: {
      headerTitle: 'Neues Rezept',
      headerSubtitle: 'Aus Video, Link oder Foto erstellen',
      urlLabel: 'Rezept Link',
      urlPlaceholder: 'https://www.instagram.com/reel/...',
      urlPlaceholderShort: 'Link einfügen…',
      btnPending: 'Rezept wird gelesen...',
      btnSubmit: 'Rezept erstellen',
      concurrentCounter: '{active}/{max} Rezepte werden erstellt',
      concurrentLimitReached: 'Maximal {max} Rezepte gleichzeitig – warte, bis eines fertig ist.',
      mode: {
        link: 'Link',
        photo: 'Foto',
      },
      photo: {
        emptyTitle: 'Fotos hochladen',
        emptyHint: 'Fotografiere eine Kochbuchseite oder eine handgeschriebene Rezeptkarte – wir lesen das Rezept für dich aus.',
        takePhoto: 'Foto aufnehmen',
        fromGallery: 'Aus Galerie',
        remove: 'Foto entfernen',
        counter: '{count} von {max} Fotos',
        btnUploading: 'Fotos werden hochgeladen...',
        tips: 'Gutes Licht, Seite flach hinlegen, Schrift formatfüllend. Mehrseitige Rezepte in der richtigen Reihenfolge aufnehmen.',
      },
      pasteTooltip: 'Link aus Zwischenablage einfügen',
      pasteFailed: 'Zwischenablage konnte nicht gelesen werden. Bitte manuell einfügen.',
      demoTitle: 'Beliebte Rezepte zum Ausprobieren',
      demoSubtitle: 'Tippe auf ein Rezept, um es direkt zu importieren',
      remainingExtractions: 'Noch {remaining} von {limit} Rezepten {days} übrig',
      remainingExtractionsToday: 'heute',
      remainingExtractionsDays: 'in den letzten {days} Tagen',
      platformsTitle: 'Unterstützte Plattformen',
      helpTitle: 'Wie kopiere ich einen Rezept-Link?',
      helpShareTitle: 'Direkt teilen (schnellste Methode)',
      helpShareTip: 'Tipp: Du kannst Rezepte auch direkt aus Instagram & TikTok mit Snagbite teilen!',
      helpShareDesc: 'Teile Links direkt über den Teilen-Button anderer Apps – ohne den Link zu kopieren.',
      helpShareStep: 'Tippe in Instagram, TikTok oder YouTube Shorts auf Teilen, wähle dann Snagbite aus der Liste.',
      helpShareStep1Title: '1. Papierflieger tippen',
      helpShareStep1Desc: 'Öffne das Reel oder Video (Instagram, TikTok, YouTube) und tippe auf das Teilen-Symbol (Papierflieger).',
      helpShareStep2Title: '2. Auf „Teilen“ tippen',
      helpShareStep2Desc: 'Tippe unten auf das Symbol „Teilen“ (nur bei Instagram nötig, um das Systemmenü zu öffnen).',
      helpShareStep3Title: '3. Snagbite auswählen',
      helpShareStep3Desc: 'Wähle Snagbite aus der Liste der Apps aus.',
      helpSteps: {
        instagram: 'Öffne ein Instagram Reel, tippe auf Teilen (Papierflieger-Symbol) und wähle Link kopieren.',
        tiktok: 'Öffne ein TikTok-Video, tippe auf den Teilen-Pfeil und wähle Link kopieren.',
        youtube: 'Öffne ein YouTube Short, tippe auf Teilen und wähle Link kopieren.',
        facebook: 'Öffne ein Facebook-Video, tippe auf Teilen und wähle Link kopieren.',
        website: 'Kopiere einfach die vollständige URL aus der Adresszeile deines Browsers.'
      },
      validation: {
        required: 'Rezept URL ist erforderlich.',
        invalid: 'Es muss eine gültige URL sein (z.B. Instagram, TikTok, Facebook, Website).',
        youtubeShortsOnly: 'Nur YouTube Shorts werden unterstützt, keine regulären YouTube-Videos.',
        failedCheck: 'Statusüberprüfung vom Server fehlgeschlagen.',
        failedExtraction: 'Die Rezept-Erstellung ist fehlgeschlagen.',
        lostConnection: 'Verbindung zum Backend-Server verloren.',
        unauthorized: 'Deine Sitzung ist abgelaufen oder ungültig. Bitte melde dich erneut an.',
        submitFailed: 'Auftrag konnte nicht übermittelt werden.',
        submissionError: 'Bei der Übermittlung ist ein Fehler aufgetreten.',
        serverError: 'Der Server hat keine gültige Antwort zurückgegeben. Bitte versuche es erneut.',
        backgroundCancelled: 'Der Rezept-Import wurde abgebrochen, da die App in den Hintergrund gewechselt ist (Hintergrund-Verarbeitung ist nur in Premium enthalten).',
      }
    },
    recipe: {
      copyRecipe: 'Rezept kopieren',
      copied: 'Kopiert!',
      delete: 'Rezept löschen',
      save: 'Speichern',
      prep: 'Vorbereitung',
      cook: 'Zubereitung',
      minutes: '{count} Min.',
      serves: 'Portionen',
      servingsCount: '{count} Portionen',
      decreaseServings: 'Portionen verringern',
      increaseServings: 'Portionen erhöhen',
      adjustServingsTitle: 'Portionsgröße für Nährwerte',
      adjustServingsSubtitle: 'Auf wie viele Portionen teilst du das Gesamtrezept auf? Die Nährwerte pro Portion berechnen sich daraus.',
      adjustServingsSubtitleSingular: 'Auf wie viele Portionen teilst du das Gesamtrezept auf? Die Nährwerte pro Portion berechnen sich daraus.',
      adjustServingsTargetLabel: 'Portionen',
      adjustServingsPreviewTitle: 'Nährwerte pro Portion',
      adjustServingsPreviewKcal: '{oldKcal} kcal → {newKcal} kcal pro Portion',
      adjustServingsPreviewUnchanged: 'Bleibt bei {kcal} kcal pro Portion',
      adjustServingsSave: 'Speichern',
      adjustServingsCancel: 'Abbrechen',
      adjustServingsSuccess: 'Portionen angepasst',
      adjustServingsSaving: 'Wird gespeichert...',
      metaDetails: 'Details zu Zeit, Portionen und Nährwerten anzeigen',
      infoSheetTitle: 'Rezept-Details',
      descriptionMore: 'mehr',
      descriptionLess: 'weniger',
      nutritionTitle: 'Nährwerte',
      nutritionPerServing: 'Pro Portion',
      nutritionTotal: 'Gesamt',
      nutritionCalories: 'kcal',
      calories: 'Kalorien',
      per100g: 'pro 100g',
      nutritionProtein: 'Eiweiß',
      nutritionCarbs: 'Kohlenh.',
      nutritionFat: 'Fett',
      nutritionProteinShort: 'E',
      nutritionCarbsShort: 'K',
      nutritionFatShort: 'F',
      aiEstimateNotice: 'KI-geschätzte Werte',
      aiEstimateTooltip: 'Diese Nährwerte wurden durch eine KI automatisiert basierend auf den Zutaten und Mengen geschätzt, da in der Quelle keine Angaben vorhanden waren.',
      aiIngredientsEstimateTooltip: 'Die Nährwerte der einzelnen Zutaten sind von der KI geschätzte Richtwerte und können je nach Sorte, Marke und Zubereitung variieren.',
      verifiedDatabaseTooltip: 'Nährwerte basieren auf dem Bundeslebensmittelschlüssel (BLS 4.0, laborgeprüft).',
      nutritionSourceClaim: 'Laut Rezeptquelle: {value} kcal pro Portion',
      verifiedIngredient: 'Verifizierte Zutat (BLS 4.0)',
      verifiedIngredientTooltip: 'Verifiziert über BLS 4.0: {name}',
      ingredientNutritionSheetTitle: 'Zutaten-Nährwerte',
      ingredientNutritionForPortion: 'Nährwerte für {amount} {unit}',
      ingredientNutritionDistribution: 'Kalorien-Verteilung',
      ingredientNutritionProtein: 'Eiweiß',
      ingredientNutritionCarbs: 'Kohlenhydrate',
      ingredientNutritionFat: 'Fett',
      ingredientNutritionPer100g: 'Entspricht ca. {kcal} kcal pro 100g',
      ingredientNutritionClose: 'Fertig',
      ingredientNutritionVerifiedBadge: 'Bundeslebensmittelschlüssel (BLS 4.0)',
      ingredientNutritionEstimatedBadge: 'KI-Nährwertschätzung',
      aiGeneratedNotice: 'KI-generierter Inhalt',
      aiGeneratedDisclaimer: 'Dieses Rezept wurde KI-gestützt aus einem Social-Media-Video erstellt und kann Fehler aufweisen. Bitte prüfe die Angaben sorgfältig.',
      tabIngredients: 'Zutaten',
      tabInstructions: 'Zubereitung',
      ingredientsTitle: 'Zutaten-Checkliste',
      ingredientsSubtitle: 'Bereits vorhandene Zutaten abhaken',
      staplePillLabel: 'Vorrat',
      parentDerivedLabel: 'aus {parent}',
      showNutritionPerIngredient: 'Nährwerte',
      addedToShopping: 'In Einkaufsliste hinzugefügt!',
      addToShopping: 'Zur Einkaufsliste hinzufügen',
      goToShoppingList: 'Zur Einkaufsliste hinzufügen',
      alreadyAddedTitle: 'Bereits hinzugefügt',
      alreadyAddedMessage: 'Alle Zutaten dieses Rezepts sind bereits abgehakt!',
      shoppingConfirmTitle: 'Zutaten auswählen',
      shoppingConfirmSubtitle: 'Gewürze & Vorratsartikel sind standardmäßig abgewählt.',
      shoppingConfirmAddOne: '1 Zutat hinzufügen',
      shoppingConfirmAddMany: '{count} Zutaten hinzufügen',
      shoppingConfirmCancel: 'Abbrechen',
      alternativeIngredients: 'Alternative Zutaten',
      requiredEquipment: 'Benötigte Küchengeräte',
      equipmentTooltip: 'Gerät: {name}',
      cookingProgress: 'Kochfortschritt',
      progressSteps: '{completed} von {total} Schritten ({percent}%)',
      startCooking: 'Kochen starten',
      dockCook: 'Kochen',
      dockChat: 'KI-Chat',
      dockList: 'Liste',
      dockCooked: 'Gekocht',
      stepByStep: 'Schritt-für-Schritt-Anleitung',
      step: 'Schritt',
      currentStep: 'Aktueller Schritt',
      tipsTitle: 'Kochtipps vom Chefkoch',
      cookingMode: 'Kochmodus',
      cookingModeProgress: 'Schritt {current} von {total}',
      ingredientsForStep: 'Zutaten für diesen Schritt:',
      back: 'Zurück',
      finish: 'Fertigstellen',
      doneNext: 'Erledigt & Weiter',
      cookingModeTip: 'Tipp: Wische nach links/rechts auf dem Handy.',
      finishedAlertTitle: 'Fertig!',
      finishedAlertMessage: 'Guten Appetit! Du hast das Rezept erfolgreich zubereitet.',
    },
    catalog: {
      savedOn: 'Gespeichert am {date}',
      viewReel: 'Quelle ansehen',
      photoImport: 'Foto-Import',
      title: 'Rezepte',
      emptyTitle: 'Keine gespeicherten Rezepte',
      emptyDesc: 'Erstelle Rezepte im "Neues Rezept" Tab, um sie hier zu speichern!',
      emptyState: {
        welcomeTitle: 'Dein Kochbuch wartet auf Rezepte!',
        welcomeDesc: 'Snagbite verwandelt Kochvideos von Instagram, TikTok oder YouTube in strukturierte Rezepte mit Einkaufslisten und Nährwertangaben.',
        ctaButton: 'Rezept hinzufügen',
        step1Title: '1. Entdecken',
        step1Desc: 'Suche ein Rezept-Video auf Instagram, TikTok oder YouTube.',
        step2Title: '2. Link kopieren',
        step2Desc: 'Tippe auf Teilen und kopiere den Link in die Zwischenablage.',
        step3Title: '3. Rezept erstellen',
        step3Desc: 'Füge den Link ein und tippe auf „Rezept erstellen“.',
      },
      deleteRecipe: 'Rezept löschen',
      backToSaved: 'Zurück zu gespeicherten Rezepten',
      searchPlaceholder: 'Name, Zutaten, Tags',
      viewToggle: 'Ansicht umschalten',
      selectModeToggle: 'Auswahlmodus umschalten',
      allFilter: 'Alle',
      under15: '< 15 Min.',
      under30: '< 30 Min.',
      deleteSelected: 'Ausgewählte löschen',
      addToShoppingList: 'Zutaten auf die Einkaufsliste werfen',
      addedToShoppingList: 'Hinzugefügt!',
      itemsSelected: '{count} Rezepte ausgewählt',
      confirmBulkDeleteTitle: 'Rezepte löschen?',
      confirmBulkDeleteMessage: 'Möchtest du die {count} ausgewählten Rezepte wirklich unwiderruflich löschen?',
      favoritesFilter: 'Favoriten',
      sortNewest: 'Neueste',
      sortTitle: 'Name A–Z',
      sortTime: 'Zubereitungszeit',
      dateToday: 'Heute',
      dateYesterday: 'Gestern',
      // --- Cookbook home (level 1) & list level (level 2) ---
      myCookbookTitle: 'Mein Kochbuch',
      allRecipesTitle: 'Alle Rezepte',
      allRecipes: 'Alle {count} Rezepte ansehen',
      recipeCount: '{count} Rezepte',
      recipeCountSingle: '1 Rezept',
      showAll: 'Alle {count}',
      backToCookbook: 'Zurück zum Kochbuch',
      clearSearch: 'Suche leeren',
      shelfRecent: 'Zuletzt geöffnet',
      shelfQuick: 'Schnell gekocht',
      shelfNewest: 'Zuletzt gespeichert',
      shelfRecommended: 'Für dich empfohlen',
      recommendations: {
        shelfTitle: 'Für dich empfohlen',
        subtitle: 'Empfohlene Rezepte aus deiner Sammlung',
        spring: 'Frische Frühlings-Küche',
        summer: 'Sommer-Rezepte & Frische Küche',
        autumn: 'Herbst-Genuss & Saisonales',
        winter: 'Wärmende Winter-Küche',
        fridayComfort: 'Freitagabend Comfort Food',
        weekendBrunch: 'Wochenend-Frühstück & Brunch',
        weekendProject: 'Wochenend-Kochprojekt',
        quickDinner: 'Schnelle Feierabendküche',
        rediscovery: 'Wiederentdeckt für dich',
        holidayValentine: 'Valentinstag: Dinner for Two',
        holidayAsparagus: 'Frische Spargel-Küche',
        holidayGrill: 'Sommer-Rezepte & Grillen',
        holidayOktoberfest: 'Bayerische Schmankerl & Brezen',
        holidayHalloween: 'Kürbis & Herbst-Spezial',
        holidayChristmas: 'Festliche Weihnachts-Küche',
        holidayNewYear: 'Silvester-Snacks & Party-Food',
      },
      collectionsEmptyHint: 'Ordne deine Rezepte in eigene Sammlungen ein.',
      bulkAddedMessage: 'Zutaten aus {count} Rezepten wurden erfolgreich hinzugefügt!',
      noMatches: 'Keine passenden Rezepte gefunden.',
      // --- Filter sheet ---
      filterTitle: 'Filter & Sortierung',
      sortLabel: 'Sortierung',
      quickFiltersLabel: 'Schnellfilter',
      timeLabel: 'Gesamtzeit',
      timeAny: 'Egal',
      timeUnder: 'Bis {count} Min.',
      resetFilters: 'Zurücksetzen',
      showResults: '{count} Rezepte anzeigen',
      sort: {
        newest: 'Neueste',
        recent: 'Zuletzt geöffnet',
        title: 'Name A–Z',
        time: 'Zubereitungszeit',
      },
      collectionsTitle: 'Sammlungen',
      addCollection: 'Neue Sammlung',
      editCollection: 'Sammlung bearbeiten',
      deleteCollection: 'Sammlung löschen',
      collectionName: 'Name der Sammlung',
      collectionEmoji: 'Symbol / Emoji',
      collectionPlaceholder: 'z.B. Sonntagsbrunch',
      collectionNameRequired: 'Name der Sammlung ist erforderlich',
      flagsTitle: 'Labels / Tags',
      addFlag: 'Neues Label',
      flagPlaceholder: 'z.B. Ausprobieren',
      manageCollections: 'Sammlungen verwalten',
      manageFlags: 'Labels verwalten',
      noCollections: 'Keine Sammlungen erstellt',
      noFlags: 'Keine Labels erstellt',
      premiumFeatureTitle: 'Premium-Funktion',
      premiumFeatureCollectionsDesc: 'Erstelle Sammlungen und ordne Rezepte zu, um dein Kochbuch perfekt zu strukturieren.',
      premiumFeatureFlagsDesc: 'Erstelle eigene Labels und Tags, um Rezepte noch flexibler zu filtern.',
      bulkAddToCollection: 'Zu Sammlung hinzufügen',
      assignCollectionsTitle: 'Sammlungen zuweisen',
      manageBulkCollectionsTitle: 'Sammlungen verwalten',
      closeButton: 'Schließen',
      manageRecipeFlagsTitle: 'Rezept-Labels verwalten',
    },
    shopping: {
      addTitle: 'Eintrag hinzufügen',
      placeholderName: 'Zutat (z.B. Tomaten)',
      placeholderAmount: 'Menge',
      placeholderUnit: 'Einheit',
      suggestions: 'Vorschläge:',
      suggestionsList: ['Stück', 'g', 'ml', 'Pkg.', 'Dose', 'TL', 'EL'],
      btnAdd: 'Hinzufügen',
      btnCancelInline: 'Abbrechen',
      title: 'Einkaufsliste',
      clearChecked: 'Erledigte löschen',
      clearAll: 'Liste leeren',
      dialogClear: {
        title: 'Einkaufsliste leeren?',
        message: 'Möchtest du wirklich alle Einträge von der Einkaufsliste löschen?',
        confirm: 'Leeren',
        cancel: 'Abbrechen',
      },
      emptyState: {
        welcomeTitle: 'Deine Einkaufsliste ist noch leer',
        welcomeDesc: 'Wirf die Zutaten deiner gespeicherten Rezepte mit einem Tipp auf die Liste – automatisch nach Supermarkt-Regalen sortiert.',
        ctaButton: 'Rezepte ansehen',
        step1Title: '1. Rezept öffnen',
        step1Desc: 'Öffne ein gespeichertes Rezept in deinem Kochbuch.',
        step2Title: '2. Einkaufswagen antippen',
        step2Desc: 'Tippe auf das Einkaufswagen-Symbol, um alle Zutaten hinzuzufügen.',
        step3Title: '3. Nach Regalen sortiert',
        step3Desc: 'Die Zutaten landen gebündelt nach Supermarkt-Bereich – bereit zum Einkaufen.',
      },
      toBuy: 'Noch zu kaufen ({count})',
      inCart: 'Bereits im Korb ({count})',
      progressLabel: 'Fortschritt',
      done: 'Erledigt',
      toBuyCount: 'offen',
      checkGroup: 'Gruppe abhaken',
      uncheckGroup: 'Gruppe abwählen',
      checkAll: 'Alle',
      entry: 'Eintrag',
      entries: 'Einträge',
      manual: 'Manuell',
      deleteItem: 'Eintrag löschen',
      recipeCount: '{count} Rezepte',
      recipesSectionTitle: 'Rezepte auf der Liste',
      recipesCount: '{count} Rezepte',
      recipesCountSingle: '1 Rezept',
      recipeIngredientsProgress: '{checked}/{total} Zutaten',
      recipeIngredientsCount: '{count} Zutaten',
      recipeIngredientsCountSingle: '1 Zutat',
      recipeAllChecked: '✓ Alle im Korb',
      removeRecipeConfirmTitle: 'Rezept von Liste entfernen?',
      removeRecipeConfirmMessage: 'Möchtest du alle Zutaten für „{title}“ von der Einkaufsliste löschen?',
      removeRecipeConfirmBtn: 'Zutaten entfernen',
      doneCount: 'Erledigt ({count})',
      moreActions: 'Weitere Aktionen',
      allDoneBadge: '🎉 Alles im Korb',
      allDoneTitle: 'Alles erledigt!',
      allDoneDesc: 'Du hast alle Zutaten beisammen. Viel Spaß beim Kochen & Genießen!',
      finishShopping: 'Einkauf abschließen',
      restoreItem: 'Wieder aufnehmen',
    },
    dialog: {
      confirmDefault: 'Bestätigen',
      cancelDefault: 'Abbrechen',
      closeAria: 'Schließen',
    },
    remix: {
      title: 'Rezept Remix',
      subtitle: 'Lass die KI das Rezept für dich anpassen.',
      placeholder: 'Oder schreibe deinen eigenen Wunsch... z.B. \'Ich habe keine Eier, was kann ich nehmen?\'',
      generating: 'Remix wird generiert...',
      btnCancel: 'Abbrechen',
      btnStart: 'Remix starten',
      parentLinkPrefix: 'Abgewandelt von',
      parentLinkDeleted: 'gelöscht',
      chips: {
        vegan: { label: 'Vegan', prompt: 'Mache es vegan' },
        highProtein: { label: 'High Protein', prompt: 'Mache es eiweißreich' },
        lowCalorie: { label: 'Kalorienarm', prompt: 'Mache es kalorienarm' },
        budget: { label: 'Günstig', prompt: 'Mache es günstig' },
        glutenFree: { label: 'Glutenfrei', prompt: 'Mache es glutenfrei' }
      }
    },
    copilot: {
      title: 'Rezepte Copilot',
      subtitle: 'Dein smarter KI-Küchenchef',
      placeholder: 'Frage etwas zur Zubereitung oder Zutaten...',
      sendAria: 'Nachricht senden',
      remixReady: 'Rezept-Remix bereit',
      remixLoadBtn: 'Neue Version laden & speichern',
      remixSuccessToast: 'Rezept wurde erfolgreich aktualisiert!',
      shoppingListToast: 'Zutaten zur Einkaufsliste hinzugefügt: {ingredients}',
      timerToast: 'Timer für {label} ({duration} Min.) gestartet!',
      timerNoLabel: 'Kochschritt',
      errorForbidden: 'Der Copilot ist ein Premium-Feature. Bitte upgrade auf Pro.',
      errorGeneral: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
      chipsHeaderRemix: 'Rezept anpassen',
      chipsHeaderHelp: 'Zubereitungshilfe',
      chipsHeaderSubs: 'Zutaten-Notfall',
      chipsHeaderShopping: 'Einkaufsliste',
      chipsHeaderTimer: 'Timer',
      chipVegan: 'Vegan machen',
      chipProtein: 'High-Protein',
      chipPortions: 'Portionen anpassen',
      chipAirfryer: 'Alternative ohne Airfryer?',
      chipRoux: 'Begriff: Was bedeutet "Roux"?',
      chipFreeze: 'Wie friere ich Reste ein?',
      chipSubstitute: 'Alternative für {ingredient}?',
      loading: 'Antwortet...',
      actionRunning: 'Führe Aktion aus...',
      showSuggestionsAria: 'Vorschläge anzeigen',
      remixConfirmTitle: 'Rezept-Änderung bestätigen',
      remixConfirmBody: 'Möchtest du das Rezept anpassen mit: „{request}"?',
      remixReplaceBtn: 'Aktuelles ersetzen',
      remixNewBtn: 'Als neues Rezept',
      remixCreated: 'Das Remix-Rezept „{title}“ wurde erstellt.',
      clearAria: 'Chat zurücksetzen',
      clearConfirmTitle: 'Chat zurücksetzen?',
      clearConfirmBody: 'Möchtest du diese Unterhaltung und die Vorschläge für dieses Rezept löschen? Das kann nicht rückgängig gemacht werden.',
      clearConfirmBtn: 'Zurücksetzen',
      changesTitle: 'Geplante Änderungen ({count})',
      changesHint: 'Sammle Änderungen und wende sie gemeinsam an.',
      changesApply: 'Änderungen anwenden',
      changesDiscardAll: 'Alle verwerfen',
      changesDeleteAria: 'Änderung entfernen',
      changesApplyPrompt: 'Wie möchtest du die Änderungen anwenden?',
      changesEmpty: 'Noch keine Änderungen gesammelt.',
    },
    timer: {
      confirmTitle: 'Timer starten?',
      confirmStart: 'Timer starten',
      confirmCancel: 'Abbrechen',
      adjustDuration: 'Dauer anpassen',
      finished: 'Timer abgelaufen!',
      dismiss: 'Schließen',
      activeTimers: '{count} Timer aktiv',
      minutes: '{count} Min.',
      seconds: '{count} Sek.',
      minutesShort: 'm',
      notificationBody: 'Dein Koch-Timer ist abgelaufen.',
    },
    premium: {
      modal: {
        title: 'Snagbite Premium',
        subtitle: 'Mehr kochen, weniger tippen.',
        cta: 'Jetzt Premium freischalten',
        loading: 'Zahlung wird verarbeitet...',
        success: 'Erfolgreich freigeschaltet!',
        error: 'Fehler bei der Zahlung. Bitte versuche es erneut.',
        close: 'Schließen',
        owned: 'Du hast Premium',
        alphaOwned: 'Käufe während der Alpha deaktiviert',
        verifying: 'Verifiziere Status...',
        footer: 'Jederzeit kündbar · Sicher über Google Play',
        monthly: 'Monatlich',
        yearly: 'Jährlich',
        savePercent: 'Spare {percent}%',
        bestseller: 'Bestseller',
        coffeeAnchor: 'Weniger als ein Kaffee im Monat',
        pricePeriod: '{price} / Monat',
        priceYearlyPeriod: '{price} / Jahr',
        priceMonthlyEquivalent: '{price} / Monat',
        trialBadge: '{days} Tage kostenlos',
        ctaWithTrial: 'Kostenlose Testphase starten',
        ctaWithoutTrial: 'Premium freischalten',
        cancelSubtitle: 'Kein Risiko. Jederzeit kündbar.',
        termsNoticePrefix: 'Mit dem Kauf stimmst du den ',
        termsLink: 'AGB',
        termsNoticeSuffix: ' zu.',
        trialBanner: {
          title: 'Premium kostenlos testen',
          body: 'Schalte alles frei. Jederzeit kündbar.',
          cta: 'Kostenlos starten',
          dismiss: 'Später',
          days: 'Tage',
        },
        comparison: {
          tableTitle: 'Free vs. Premium im Vergleich',
          headerFeature: 'Funktion',
          headerFree: 'Kostenlos',
          headerPremium: 'Premium',
          rowExtractions: 'Rezept-Import',
          rowExtractionsFree: '1 / Tag',
          rowExtractionsPremium: 'Unbegrenzt',
          rowCookbook: 'Kochbuch (Speichern)',
          rowCookbookFree: 'Max. 10 Rezepte',
          rowCookbookPremium: 'Unbegrenzt',
          rowShoppingList: 'Einkaufsliste',
          rowShoppingListFree: '1 Rezept',
          rowShoppingListPremium: 'Smarte Kombi',
          rowAiChat: 'Rezept-KI-Chat',
          rowAiChatFree: '❌ Nein',
          rowAiChatPremium: '✔️ Ja',
          rowNutrition: 'Nährwerte & Makros',
          rowNutritionFree: '❌ Nein',
          rowNutritionPremium: '✔️ Ja',
          rowCollections: 'Sammlungen & Labels',
          rowCookingMode: 'Kochmodus & Timer'
        },
        features: {
          extractions: {
            title: 'Mehr Rezept-Importe',
            desc: 'Bis zu 30 täglich aus Videos, Web & Fotos — im Hintergrund & mehrere gleichzeitig.'
          },
          nutrition: {
            title: 'Nährwerte & Makros',
            desc: 'Kalorien, Makros & Portionen pro Portion auf einen Blick.'
          },
          remix: {
            title: 'Rezept-KI-Chat',
            desc: 'Rezepte per Chat anpassen, Zutaten ersetzen & Kochtipps holen.'
          },
          shoppingList: {
            title: 'Smarte Einkaufsliste',
            desc: 'Zutaten aus beliebig vielen Rezepten kombinieren.'
          },
          collections: {
            title: 'Sammlungen & Labels',
            desc: 'Rezepte in eigene Sammlungen organisieren.'
          },
          cookingMode: {
            title: 'Kochmodus',
            desc: 'Schritt-für-Schritt kochen mit Timer & Fokusansicht.'
          },
          noAds: {
            title: 'Keine Werbung',
            desc: 'Genieße die App ohne Banner-Werbung.'
          }
        }
      },
      shoppingListLimit: {
        title: 'Premium-Funktion',
        message: 'Du hast bereits Zutaten von einem anderen Rezept auf deiner Einkaufsliste. Hol dir Premium, um Zutaten aus beliebig vielen Rezepten zu kombinieren!'
      },
      hint: {
        extractUnlimited: 'Premium: Unbegrenzt freischalten',
        catalogFull: 'Kochbuch voll ({count}/{limit}). Mit Premium speicherst du unbegrenzt.',
        catalogAlmostFull: 'Kochbuch fast voll ({count}/{limit})',
        extractionLimitReached: 'Tageslimit ({used}/{limit}) erreicht – Schau ein kurzes Video zum Erstellen oder upgrade auf Premium.',
        unlockNutrition: 'Nährwerte freischalten',
        unlockMacros: 'Makros freischalten',
        upgrade: 'Upgrade'
      }
    },
    feedback: {
      rowLabel: 'Fehler melden / Feedback',
      title: 'Fehler melden / Feedback',
      typeBug: 'Fehler',
      typeIdea: 'Idee',
      messageLabel: 'Deine Nachricht',
      placeholder: 'Beschreibe das Problem oder deine Idee möglichst genau...',
      screenshotLabel: 'Screenshots (optional)',
      attachScreenshot: 'Screenshots anhängen',
      addMoreScreenshots: 'Weitere hinzufügen',
      removeScreenshot: 'Screenshot entfernen',
      screenshotLimit: 'Du kannst bis zu 6 Bilder anhängen.',
      screenshotError: 'Screenshot konnte nicht verarbeitet werden.',
      diagnosticNote: 'Grundlegende Geräteinfos und die letzten App-Logs werden angehängt, damit wir Fehler schneller finden.',
      cancel: 'Abbrechen',
      submit: 'Absenden',
      submitting: 'Wird gesendet...',
      successTitle: 'Danke!',
      success: 'Danke für dein Feedback! Wir schauen es uns an.',
      error: 'Feedback konnte nicht gesendet werden. Bitte versuche es erneut.'
    },
    ota: {
      banner: {
        title: 'Neues App-Update verfügbar',
        description: 'Version {version} wurde geladen. Jetzt neu laden?',
        apply: 'Jetzt neu laden',
        later: 'Später'
      }
    }
  },
  en: {
    ads: {
      label: 'Advertisement',
      rewardedTitle: 'Unlock Free Recipe',
      rewardedDesc: 'Watch a short video to instantly get +1 free recipe.',
      rewardedBtn: 'Watch Video (+1 Recipe)',
      rewardedLoading: 'Loading video ad...',
      rewardedSuccess: '+1 recipe credit successfully unlocked!',
      rewardedFailed: 'Failed to load video ad. Please try again later.',
    },
    onboarding: {
      skip: 'Skip',
      back: 'Back',
      next: 'Next',
      cta: "Let's go",
      replayLabel: 'Replay intro',
      slides: {
        welcome: {
          title: 'Welcome to Snagbite',
          desc: 'Turn cooking reels from across the web into clean, interactive recipes — automatically prepared by AI.',
        },
        import: {
          title: 'Import & Share',
          desc: 'Paste a link or share a reel straight from Instagram, TikTok, YouTube or Facebook to Snagbite. We extract the full recipe for you.',
        },
        cookbook: {
          title: 'Your Cookbook',
          desc: 'Every extracted recipe is saved to your cookbook automatically — searchable, filterable and with adjustable serving sizes.',
        },
        organize: {
          title: 'Organize & Filter',
          desc: 'Create your own collections with emoji & color, mark favorites and add labels. Filter your cookbook with one tap by collection, favorite, cook time or label.',
        },
        shopping: {
          title: 'Smart Shopping List',
          desc: 'Add ingredients to your shopping list with one tap. They are merged automatically and sorted by grocery aisle.',
        },
        cooking: {
          title: 'Cook Like a Pro',
          desc: 'Step-by-step cooking mode, built-in timers and an AI copilot that answers questions and adapts recipes.',
        },
      },
    },
    alphaWelcome: {
      badge: 'Alpha Test',
      title: 'Welcome to the Alpha Test!',
      intro: "Glad to have you on board! You're one of the first to try Snagbite. As an alpha tester you get free access to all premium features.",
      info: {
        heading: 'Important info for alpha testers',
        early: 'The app is still in an early stage — some features may change or not work perfectly yet.',
        keepInstalled: 'Google only approves the test after 14 days — so the app needs to stay installed and be opened now and then.',
        feedback: 'Bugs, feedback or feature requests? Go straight through “Report a bug / Feedback” in',
        settingsPath: 'Settings',
      },
      cta: "Let's go",
    },
    app: {
      title: 'Snagbite',
      subtitle: 'Recipe Assistant',
      nav: {
        newRecipe: 'New',
        savedRecipes: 'Recipes',
        shoppingList: 'Shopping List',
        progress: 'Progress',
        settings: 'Profile',
      },
      gamification: {
        tabTitle: 'Progress',
        level: 'Level {level}',
        levelShort: 'Lvl {level}',
        xpToNext: '{xp} XP to Lvl {level}',
        maxLevel: 'Max level',
        xp: 'XP',
        xpGained: '+{xp} XP',
        coinsGained: '+{coins}',
        levelUp: 'Level {level}!',
        newBadge: 'New badge!',
        tapToContinue: 'Tap to continue',
        streakDays: '{days}-day streak',
        streakNone: 'No streak yet',
        longestStreak: 'Longest streak: {days} days',
        coins: 'Coins',
        totalCooks: 'Dishes cooked',
        badgesTitle: 'Badges',
        badgesEmpty: 'Cook dishes to unlock badges.',
        emptyTitle: 'Get started!',
        emptySubtitle: 'Cook your first recipe and earn XP.',
        cooked: 'I cooked this',
        cooking: 'Saving…',
        cookedDone: 'Cooked ✓',
        addPhoto: 'Photo',
        photoAdded: 'Photo ✓',
        duplicate: 'Already counted',
        cookError: 'Could not save',
        modalTitle: 'Log Dish & Claim XP',
        modalSubtitle: 'Upload a photo of your finished dish to claim your XP bonus.',
        takePhoto: 'Take Photo',
        chooseGallery: 'Choose from Gallery',
        verifyBtn: 'Upload Photo & Claim XP',
        verifyingTitle: 'Uploading your photo...',
        verifyingDesc: 'Almost done — adding photo to your history...',
        retryPhoto: 'Try another photo',
        rejectionTitle: 'Photo not recognized',
        rejectionReason: 'This photo does not seem to match this recipe.',
        cookedCardTitle: 'Did you cook this dish?',
        cookedCardSubtitle: 'Upload a photo of your dish to log it in your history and earn XP.',
        cookedCardBtn: 'Log Cooked Dish',
        cookedCardBtnAgain: 'Cooked again ({count}×)',
        cookedChip: 'Cooked {count}×',
        cookedChipLast: 'last {when}',
        cookedTimelineTitle: 'Your cook history',
        cookedTimelineEmpty: "You haven't cooked this recipe yet.",
        cookedViaMode: 'Cooking Mode',
        cookedWithTimer: 'Timer used',
        cookedAttempt: 'Cook #{count}',
        cookedVerified: 'With Photo',
        cookedNoPhoto: 'No photo',
        cookedTotalXp: '+{xp} XP total',
        streakReminder: {
          title: '🔥 Keep your streak',
          body: "You're on a {days}-day streak — cook today to keep it going!",
        },
        progressLabel: 'Progress',
        galleryTitle: 'Your Cooking Gallery',
        galleryEmpty: 'No photos yet. Upload a photo next time you cook!',
        coinsComingSoon: 'Soon',
        coinsNotice: 'The Coin Shop is coming soon!',
        leaderboardTitle: 'Leaderboard',
        leaderboardSubtitle: 'Your {xp} XP is already stacking up for the rankings',
        leaderboardComingSoon: 'Soon',
        leaderboardNotice: 'The leaderboard is coming soon — your XP already counts!',
        streakWeekly: '{days} W-Streak',
        ranks: {
          level_1: 'Kitchen Novice',
          level_2: 'Hobby Chef',
          level_3: 'Kitchen Talent',
          level_4: 'Gourmet Cook',
          level_5: 'Master Chef',
          level_6: 'Starred Chef',
        },
        badgeDetail: {
          statusLocked: 'Locked',
          statusUnlocked: 'Unlocked',
          reward: 'Reward: +{xp} XP',
          progressLabel: '{current} of {total} completed',
          unlockedOn: 'Unlocked on {date}',
        },
        badgeDesc: {
          first_cook: 'Cook your very first recipe in the app.',
          cook_10: 'Cook a total of 10 delicious dishes.',
          cook_25: 'Cook a total of 25 delicious dishes.',
          cook_50: 'Cook a total of 50 delicious dishes.',
          cook_100: 'Cook a total of 100 delicious dishes.',
          streak_3: 'Keep your cooking streak active for 3 weeks.',
          streak_7: 'Keep your cooking streak active for 7 weeks.',
          streak_30: 'Keep your cooking streak active for 30 weeks.',
          first_photo: 'Verify a cooked dish with your first photo.',
          distinct_5: 'Cook 5 different recipes from your collection.',
          distinct_10: 'Cook 10 different recipes from your collection.',
          distinct_25: 'Cook 25 different recipes from your collection.',
          night_owl: 'Cook a dish after 10 PM.',
          weekend_chef: 'Cook 5 dishes on a weekend.',
          timer_first: 'Use the cooking timer for the first time.',
          timer_10: 'Use the cooking timer a total of 10 times.',
          same_recipe_3: 'Cook the same recipe at least 3 times.',
        },
        badges: {
          first_cook: 'First dish',
          cook_10: '10 dishes',
          cook_25: '25 dishes',
          cook_50: '50 dishes',
          cook_100: '100 dishes',
          streak_3: '3-week streak',
          streak_7: '7-week streak',
          streak_30: '30-week streak',
          first_photo: 'First photo',
          distinct_5: '5 different recipes',
          distinct_10: '10 different recipes',
          distinct_25: '25 different recipes',
          night_owl: 'Night Owl',
          weekend_chef: 'Weekend Chef',
          timer_first: 'First Timer',
          timer_10: 'Timer Pro',
          same_recipe_3: 'Favourite Dish',
        },
      },
      social: {
        sections: { overview: 'Overview', leaderboard: 'Leaderboard', friends: 'Friends' },
        leaderboard: {
          monthly: 'This month',
          weekly: 'This week',
          allTime: 'All time',
          scopeFriends: 'Friends',
          scopeGlobal: 'Global',
          you: 'You',
          empty: 'Add friends to compete.',
          emptyGlobal: 'No entries in the global leaderboard yet.',
          addFriend: '+ Add',
          requested: 'Requested',
          friends: 'Friends',
          accept: 'Accept',
          requestSuccess: 'Friend request sent!',
        },
        friends: {
          yourCode: 'Your friend code',
          share: 'Share invite',
          addTitle: 'Add a friend',
          addPlaceholder: 'Friend code',
          add: 'Add',
          requests: 'Requests',
          accept: 'Accept',
          decline: 'Decline',
          yourFriends: 'Your friends',
          none: 'No friends yet. Share your code!',
          remove: 'Remove',
          editName: 'Edit name',
          requestSent: 'Request sent.',
          requestAccepted: "You're now friends!",
          genericError: 'Something went wrong.',
          inviteText: 'Add me on Snagbite! My friend code: {code}',
        },
      },
      settings: {
        language: 'Language',
        theme: 'Appearance',
        tempUnit: 'Temperature Unit',
        unitSystem: 'Unit System',
        tempUnitCelsius: 'Celsius (°C)',
        tempUnitFahrenheit: 'Fahrenheit (°F)',
        tempUnitBoth: 'Both (°C & °F)',
        unitSystemMetric: 'Metric (g, ml, kg)',
        unitSystemImperial: 'Imperial (oz, cups, lbs)',
        settingInfoTooltip: 'This setting only affects newly created recipes.',
        saving: 'Saving...',
        saved: 'Settings saved!',
        deleteAccount: 'Delete Account',
        upgradePremium: 'Upgrade to Premium',
        premiumActive: 'Active',
        premiumActiveDesc: 'You have unlimited access to all premium features.',
        alphaActive: 'Alpha Access',
        alphaActiveDesc: 'You are an alpha tester! You have free access to all premium features during the alpha. Daily limits apply.',
        premiumCardDesc: 'Unlock unlimited recipe imports, advanced remix capabilities, and smart shopping lists.',
        legal: {
          section: 'Legal',
          privacy: 'Privacy Policy',
          terms: 'Terms & Conditions',
          imprint: 'Imprint',
        },
      },
      dialog: {
        deleteAccount: {
          title: 'Delete Account?',
          message: 'Are you sure you want to permanently delete your account? All your saved recipes and shopping lists will be permanently lost. **Note: If you have an active Premium subscription, you must also cancel it in the Google Play Store to prevent future charges.**',
          confirm: 'Delete Account',
          cancel: 'Cancel',
        },
        deleteAccountError: {
          title: 'Error Deleting Account',
          message: 'Your account could not be deleted. Please try again later.',
        },
        deleteRecipe: {
          title: 'Delete Recipe?',
          message: 'Are you sure you want to delete this recipe from your saved recipes?',
          confirm: 'Delete',
          cancel: 'Cancel',
        },
        deleteError: {
          title: 'Error Deleting',
          message: 'The recipe could not be deleted.',
        },
        connectionError: {
          title: 'Connection Error',
          message: 'Could not connect to the server.',
        }
      }
    },
    job: {
      status: {
        pending: {
          text: 'In queue...',
          sub: 'Waiting for server resources...',
        },
        scraping: {
          text: 'Retrieving source...',
          sub: 'Fetching Instagram data...',
        },
        processing: {
          text: 'Generating recipe...',
          sub: 'AI is analyzing audio and description...',
        },
        completed: {
          text: 'Recipe ready!',
          sub: 'Loading recipe details...',
        },
        failed: {
          text: 'Failed to create recipe',
          sub: 'Could not create recipe from link.',
        }
      },
      progress: {
        stages: {
          queued: 'Preparing...',
          scraping: 'Analyzing content...',
          downloading_media: 'Gathering ingredients...',
          extracting_frames: 'Checking recipe steps...',
          reading_photos: 'Reading recipe cards...',
          extracting_recipe: 'Structuring & perfecting recipe...',
          generating_cover: 'Generating cover image...',
          finalizing: 'Almost ready, serving now...'
        }
      },
      backgroundNotice: 'Your recipe is being prepared in the background. You can leave the app — we will notify you once it is ready.'
    },
    theme: {
      toggle: 'Toggle Theme',
    },
    notification: {
      recipeReady: {
        title: 'Recipe Ready',
        body: 'Your recipe "{title}" is ready to cook!',
      },
      extractionInterrupted: {
        title: '⚠️ Recipe Import Interrupted',
        body: 'In the Free version, recipes can only be created while the app remains open.',
      },
      prompt: {
        badge: 'Smart recommendations',
        title: 'Need fresh cooking inspiration?',
        description: 'Never ask "What\'s for dinner?" again. Get personalized ideas from your saved recipes a few times a week in the evening.',
        feature1: 'Tailored ideas from your saved recipes',
        feature2: 'A few times a week, no spam',
        enable: 'Get inspiration',
        later: 'Later',
        dismiss: 'Dismiss notification hint',
      },
    },
    auth: {
      signInTitle: 'Sign in to manage your recipes',
      unexpectedError: 'An unexpected error occurred.',
      signOut: 'Sign Out',
      signInWithGoogle: 'Sign in with Google',
      consentPrefix: 'By signing in you accept our ',
      consentTermsLink: 'Terms & Conditions',
      consentConjunction: ' and ',
      consentPrivacyLink: 'Privacy Policy',
      consentSuffix: '.',
    },
    error: {
      title: 'Failed to create recipe',
      default: 'An unknown error occurred while analyzing the link.',
      retry: 'Retry',
      generic: 'Something went wrong while creating the recipe. Please try again.',
      codes: {
        MISSING_FIELD: '{field} is missing. Please check your input.',
        INVALID_FIELD: '{field} is invalid. Please check your input.',
        INVALID_URL: 'Invalid link. Please enter a valid Instagram, TikTok, YouTube Shorts, or website link.',
        YOUTUBE_SHORTS_ONLY: 'Only YouTube Shorts are supported, not regular YouTube videos.',
        REMIX_PROMPT_TOO_LONG: 'The remix text must not exceed {max} characters.',
        MESSAGE_TOO_LONG: 'The message is too long (max {max} characters).',
        TOO_MANY_SCREENSHOTS: 'Too many screenshots (max {max}).',
        SCREENSHOTS_TOO_LARGE: 'The screenshots are too large. Please use smaller images.',
        TOO_MANY_PHOTOS: 'Too many photos (max {max}).',
        PHOTOS_TOO_LARGE: 'Your photos are too large in total. Please pick fewer photos.',
        PARENT_JOB_NOT_COMPLETED: 'The original recipe is not ready yet. Please wait until it finishes.',
        UNAUTHORIZED: 'Unauthorized. Please sign in again.',
        COOKBOOK_FULL: 'Cookbook full ({counts}). Delete a recipe or upgrade to Premium to save more.',
        RATE_LIMIT_EXCEEDED: 'You have reached your limit of {limit} recipes per {period}. {retry}',
        ACTIVE_JOB_EXISTS: 'You already have {count} recipe import(s) in progress. Please wait for them to finish.',
        TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
        JOB_NOT_FOUND: 'Recipe not found.',
        RECIPE_NOT_FOUND: 'Recipe not found.',
        COLLECTION_NOT_FOUND: 'Collection not found.',
        PARENT_JOB_NOT_FOUND: 'Original recipe not found.',
        FRIEND_CODE_INVALID: 'That friend code does not exist.',
        FRIEND_SELF: "You can't add yourself.",
        ALREADY_FRIENDS: "You're already friends.",
        REQUEST_EXISTS: 'A request is already pending.',
        FRIENDSHIP_NOT_FOUND: 'Friendship not found.',
        PROFILE_NAME_INVALID: 'Name must be 1–{max} characters.',
        SCRAPE_FAILED: "We couldn't detect a recipe from this link. The video might be private, deleted, or missing a recipe description.",
        SCRAPE_TIMEOUT: 'Loading took a little too long. Please try again in a moment.',
        VIDEO_TOO_LONG: 'The video is too long (maximum allowed length is {limit}).',
        VIDEO_TOO_LONG_NO_LIMIT: 'The video is too long.',
        MEDIA_DOWNLOAD_FAILED: 'Could not load the video. Please give it another try.',
        NOT_A_RECIPE: 'No ingredients or cooking steps were found. Please make sure the recipe is included in the video caption.',
        MULTIPLE_RECIPES: 'This post contains multiple recipes at once. Please choose a post with a single recipe.',
        WEBSITE_NO_RECIPE: "We couldn't detect a recipe on this website.",
        PHOTO_UNREADABLE: 'The recipe text was hard to read on this photo. Please try again with good lighting and a flat angle.',
        PHOTO_REQUIRED: 'A photo is required to verify your cooked dish.',
        PHOTO_NOT_MATCHING: 'The photo does not quite match the recipe: {reason}',
        PHOTO_IMPORT_EXPIRED: 'Your photos are no longer available. Please pick them again.',
        PHOTO_UPLOAD_FAILED: 'Your photos could not be uploaded. Please check your connection and try again.',
        UNRELATED_REMIX_REQUEST: 'Invalid request: the AI did not recognize any recipe modification in the text.',
        REVENUECAT_FAILED: 'Could not fetch your subscription status. Please try again later.',
        PROFILE_UPDATE_FAILED: 'Could not update your profile. Please try again later.',
        CHAT_CHIPS_FAILED: 'Could not load suggestions. Please try again later.',
        REMIX_CONFIRM_FAILED: 'Could not confirm the remix. Please try again later.',
        CHAT_FAILED: 'The chat failed. Please try again later.',
        ACCOUNT_DELETE_FAILED: 'Could not delete your account. Please try again later.',
        INTERNAL_ERROR: 'An internal server error occurred. Please try again later.',
      },
      premium: {
        remix: 'Recipe Remix is a premium feature. Upgrade to Premium to customize recipes.',
        chat: 'AI Kitchen Chef chat is a premium feature. Upgrade to Premium to chat with Recipe Copilot.',
        collections: 'Collections are a premium feature. Upgrade to Premium to use them.',
        tags: 'Custom tags are a premium feature. Upgrade to Premium to use them.',
        generic: 'This is a premium feature. Upgrade to Premium to use it.',
      },
      field: {
        url: 'The link',
        photos: 'The photos',
        prompt: 'The text',
        message: 'The message',
        modificationRequest: 'The change request',
        generic: 'A field',
      },
      duration: {
        minutes: '{n} minutes',
        seconds: '{n} seconds',
        day1: '1 day',
        dayN: '{n} days',
        andHours: ' and {h} hr.',
      },
      period: {
        day: 'day',
        days: '{n} days',
      },
      tryAgain: {
        later: 'Please try again later.',
        minutes: 'Please try again in {m} min.',
        hours: 'Please try again in {h} hr.',
        hoursMinutes: 'Please try again in {h} hr. and {m} min.',
        days: 'Please try again in {dayStr}{hourStr}.',
      },
    },
    activeExtractions: {
      title: 'Active recipe imports',
      titleDone: 'Finished recipes',
      titleFailed: 'Import notice',
      statusRunning: 'Creating recipe…',
      ready: 'Recipe ready',
      tapToOpen: 'Tap to open the recipe',
      dismiss: 'Dismiss',
      photoSource: 'Photos',
      stages: {
        queued: 'Preparing…',
        scraping: 'Analyzing content…',
        downloading_media: 'Gathering ingredients…',
        extracting_frames: 'Checking steps…',
        reading_photos: 'Reading recipe cards…',
        extracting_recipe: 'Structuring recipe…',
        generating_cover: 'Generating cover image…',
        finalizing: 'Serving now…',
      },
    },
    form: {
      headerTitle: 'New Recipe',
      headerSubtitle: 'Create from video, link or photo',
      urlLabel: 'Recipe Link',
      urlPlaceholder: 'https://www.instagram.com/reel/...',
      urlPlaceholderShort: 'Paste link…',
      btnPending: 'Reading recipe...',
      btnSubmit: 'Import Recipe',
      concurrentCounter: '{active}/{max} recipes being created',
      concurrentLimitReached: 'Up to {max} recipes at once — wait for one to finish.',
      mode: {
        link: 'Link',
        photo: 'Photo',
      },
      photo: {
        emptyTitle: "Upload photos",
        emptyHint: 'Photograph a cookbook page or a handwritten recipe card — we read the recipe out of it for you.',
        takePhoto: 'Take photo',
        fromGallery: 'From gallery',
        remove: 'Remove photo',
        counter: '{count} of {max} photos',
        btnUploading: 'Uploading photos...',
        tips: 'Good lighting, page laid flat, writing filling the frame. Shoot multi-page recipes in the right order.',
      },
      pasteTooltip: 'Paste link from clipboard',
      pasteFailed: 'Could not read from clipboard. Please paste manually.',
      demoTitle: 'Popular Recipes to Try',
      demoSubtitle: 'Tap a recipe to import it directly',
      remainingExtractions: '{remaining} of {limit} recipes remaining {days}',
      remainingExtractionsToday: 'today',
      remainingExtractionsDays: 'in the last {days} days',
      platformsTitle: 'Supported Platforms',
      helpTitle: 'How do I copy a recipe link?',
      helpShareTitle: 'Share directly (fastest method)',
      helpShareTip: 'Tip: You can also share recipes directly from Instagram & TikTok to Snagbite!',
      helpShareDesc: 'Send links directly via the Share button in other apps — no need to copy the link.',
      helpShareStep: 'Tap Share in Instagram, TikTok, or YouTube Shorts, then select Snagbite from the list.',
      helpShareStep1Title: '1. Tap paper airplane',
      helpShareStep1Desc: 'Open the Reel or video (Instagram, TikTok, YouTube) and tap the Share icon (paper airplane).',
      helpShareStep2Title: '2. Tap "Share"',
      helpShareStep2Desc: 'Tap the "Share" button at the bottom (only required for Instagram to open the system menu).',
      helpShareStep3Title: '3. Select Snagbite',
      helpShareStep3Desc: 'Select Snagbite from the list of available apps.',
      helpSteps: {
        instagram: 'Open an Instagram Reel, tap Share (paper airplane icon) and choose Copy Link.',
        tiktok: 'Open a TikTok video, tap the Share arrow and choose Copy Link.',
        youtube: 'Open a YouTube Short, tap Share and choose Copy Link.',
        facebook: 'Open a Facebook video, tap Share and choose Copy Link.',
        website: 'Simply copy the full URL from your browser\'s address bar.'
      },
      validation: {
        required: 'Recipe URL is required.',
        invalid: 'Must be a valid URL (e.g., Instagram, TikTok, Facebook, Website).',
        youtubeShortsOnly: 'Only YouTube Shorts are supported, not regular YouTube videos.',
        failedCheck: 'Failed to check status from server.',
        failedExtraction: 'The recipe creation failed.',
        lostConnection: 'Lost connection to backend server.',
        unauthorized: 'Your session is expired or invalid. Please sign in again.',
        submitFailed: 'Failed to submit extraction job.',
        submissionError: 'An error occurred during submission.',
        serverError: 'The server returned an unexpected response. Please try again.',
        backgroundCancelled: 'Recipe import cancelled because the app entered the background (background processing is Premium only).',
      }
    },
    recipe: {
      copyRecipe: 'Copy Recipe',
      copied: 'Copied!',
      delete: 'Delete Recipe',
      save: 'Save',
      prep: 'Prep',
      cook: 'Cook',
      minutes: '{count} mins',
      serves: 'Serves',
      servingsCount: '{count} servings',
      decreaseServings: 'Decrease servings',
      increaseServings: 'Increase servings',
      adjustServingsTitle: 'Serving Size for Nutrition',
      adjustServingsSubtitle: 'How many servings do you divide this full recipe into? Per-portion nutrition is calculated from this.',
      adjustServingsSubtitleSingular: 'How many servings do you divide this full recipe into? Per-portion nutrition is calculated from this.',
      adjustServingsTargetLabel: 'Servings',
      adjustServingsPreviewTitle: 'Nutrition per serving',
      adjustServingsPreviewKcal: '{oldKcal} kcal → {newKcal} kcal per serving',
      adjustServingsPreviewUnchanged: 'Remains at {kcal} kcal per serving',
      adjustServingsSave: 'Save',
      adjustServingsCancel: 'Cancel',
      adjustServingsSuccess: 'Portions updated',
      adjustServingsSaving: 'Saving...',
      metaDetails: 'Show time, servings and nutrition details',
      infoSheetTitle: 'Recipe details',
      descriptionMore: 'more',
      descriptionLess: 'less',
      nutritionTitle: 'Nutritional Values',
      nutritionPerServing: 'Per serving',
      nutritionTotal: 'Total',
      nutritionCalories: 'kcal',
      calories: 'Calories',
      per100g: 'per 100g',
      nutritionProtein: 'Protein',
      nutritionCarbs: 'Carbs',
      nutritionFat: 'Fat',
      nutritionProteinShort: 'P',
      nutritionCarbsShort: 'C',
      nutritionFatShort: 'F',
      aiEstimateNotice: 'AI-Estimated',
      aiEstimateTooltip: 'These nutritional values were automatically estimated by an AI based on the ingredients and quantities since no specifications were present in the source.',
      aiIngredientsEstimateTooltip: 'The nutritional values for individual ingredients are guidelines estimated by the AI and may vary depending on variety, brand, and preparation.',
      verifiedDatabaseTooltip: 'Nutritional values are verified against the German Nutrient Database (BLS 4.0).',
      nutritionSourceClaim: 'Recipe source states: {value} kcal per serving',
      verifiedIngredient: 'Verified Ingredient (BLS 4.0)',
      verifiedIngredientTooltip: 'Verified against BLS 4.0: {name}',
      ingredientNutritionSheetTitle: 'Ingredient Nutrition',
      ingredientNutritionForPortion: 'Nutrition for {amount} {unit}',
      ingredientNutritionDistribution: 'Calorie Breakdown',
      ingredientNutritionProtein: 'Protein',
      ingredientNutritionCarbs: 'Carbohydrates',
      ingredientNutritionFat: 'Fat',
      ingredientNutritionPer100g: 'Approx. {kcal} kcal per 100g',
      ingredientNutritionClose: 'Done',
      ingredientNutritionVerifiedBadge: 'Federal Food Database (BLS 4.0)',
      ingredientNutritionEstimatedBadge: 'AI Nutrition Estimate',
      aiGeneratedNotice: 'AI-Generated Content',
      aiGeneratedDisclaimer: 'This recipe was created from a social media video with AI assistance and may contain errors. Please verify the information carefully.',
      tabIngredients: 'Ingredients',
      tabInstructions: 'Instructions',
      ingredientsTitle: 'Ingredients Checklist',
      ingredientsSubtitle: 'Check ingredients you have prepared',
      showNutritionPerIngredient: 'Nutrition per ingredient',
      addedToShopping: 'Added to shopping list!',
      addToShopping: 'Add to shopping list',
      goToShoppingList: 'Add to shopping list',
      alreadyAddedTitle: 'Already Added',
      alreadyAddedMessage: 'All ingredients of this recipe are already checked!',
      shoppingConfirmTitle: 'Select Ingredients',
      shoppingConfirmSubtitle: 'Pantry staples (salt, pepper...) are deselected by default.',
      shoppingConfirmAddOne: 'Add 1 ingredient',
      shoppingConfirmAddMany: 'Add {count} ingredients',
      shoppingConfirmCancel: 'Cancel',
      alternativeIngredients: 'Alternative Ingredients',
      requiredEquipment: 'Required Equipment',
      equipmentTooltip: 'Equipment: {name}',
      cookingProgress: 'Cooking Progress',
      progressSteps: '{completed} of {total} steps ({percent}%)',
      startCooking: 'Start Cooking',
      dockCook: 'Cook',
      dockChat: 'AI Chat',
      dockList: 'List',
      dockCooked: 'Cooked',
      stepByStep: 'Step-by-Step Instructions',
      step: 'Step',
      currentStep: 'Current Step',
      tipsTitle: 'Chef Cooking Tips',
      cookingMode: 'Cooking Mode',
      cookingModeProgress: 'Step {current} of {total}',
      ingredientsForStep: 'Ingredients for this step:',
      back: 'Back',
      finish: 'Finish',
      doneNext: 'Done & Next',
      cookingModeTip: 'Tip: Swipe left/right on mobile.',
      finishedAlertTitle: 'Finished!',
      finishedAlertMessage: 'Bon appétit! You have successfully prepared the recipe.',
    },
    catalog: {
      savedOn: 'Saved on {date}',
      viewReel: 'View Source',
      photoImport: 'Photo import',
      title: 'Recipes',
      emptyTitle: 'No Saved Recipes',
      emptyDesc: 'Create recipes in the "New" tab to save them here!',
      emptyState: {
        welcomeTitle: 'Your Cookbook is Waiting for Recipes!',
        welcomeDesc: 'Snagbite turns cooking videos from Instagram, TikTok, or YouTube into structured recipes with shopping lists and nutritional values.',
        ctaButton: 'Add First Recipe',
        step1Title: '1. Discover',
        step1Desc: 'Find a cooking video or Reel on Instagram, TikTok, or YouTube.',
        step2Title: '2. Copy Link',
        step2Desc: 'Tap the share icon and copy the link to your clipboard.',
        step3Title: '3. Import Recipe',
        step3Desc: 'Paste the link and tap "Import Recipe".',
      },
      deleteRecipe: 'Delete recipe',
      backToSaved: 'Back to Saved Recipes',
      searchPlaceholder: 'name, ingredients, tags',
      viewToggle: 'Switch view',
      selectModeToggle: 'Toggle select mode',
      allFilter: 'All',
      under15: '< 15 Min',
      under30: '< 30 Min',
      deleteSelected: 'Delete selected',
      addToShoppingList: 'Add ingredients to shopping list',
      addedToShoppingList: 'Added!',
      itemsSelected: '{count} recipes selected',
      confirmBulkDeleteTitle: 'Delete selected recipes?',
      confirmBulkDeleteMessage: 'Are you sure you want to permanently delete the {count} selected recipes?',
      favoritesFilter: 'Favorites',
      sortNewest: 'Newest',
      sortTitle: 'Name A–Z',
      sortTime: 'Cooking Time',
      dateToday: 'Today',
      dateYesterday: 'Yesterday',
      // --- Cookbook home (level 1) & list level (level 2) ---
      myCookbookTitle: 'My Cookbook',
      allRecipesTitle: 'All recipes',
      allRecipes: 'Browse all {count} recipes',
      recipeCount: '{count} recipes',
      recipeCountSingle: '1 recipe',
      showAll: 'All {count}',
      backToCookbook: 'Back to cookbook',
      clearSearch: 'Clear search',
      shelfRecent: 'Recently opened',
      shelfQuick: 'Quick to cook',
      shelfNewest: 'Recently saved',
      shelfRecommended: 'Recommended for you',
      recommendations: {
        shelfTitle: 'Recommended for you',
        subtitle: 'Recommended recipes from your collection',
        spring: 'Fresh Spring Kitchen',
        summer: 'Summer Recipes & Fresh Dishes',
        autumn: 'Autumn Flavors & Seasonal Produce',
        winter: 'Warming Winter Kitchen',
        fridayComfort: 'Friday Night Comfort Food',
        weekendBrunch: 'Weekend Breakfast & Brunch',
        weekendProject: 'Weekend Cooking Project',
        quickDinner: 'Quick Weeknight Dinner',
        rediscovery: 'Rediscovered for you',
        holidayValentine: "Valentine's Day: Dinner for Two",
        holidayAsparagus: 'Fresh Asparagus Season',
        holidayGrill: 'Summer Grilling & BBQ',
        holidayOktoberfest: 'Oktoberfest Delights & Pretzels',
        holidayHalloween: 'Pumpkin & Autumn Specials',
        holidayChristmas: 'Festive Holiday Kitchen',
        holidayNewYear: "New Year's Eve Party Bites",
      },
      collectionsEmptyHint: 'Group your recipes into your own collections.',
      bulkAddedMessage: 'Ingredients from {count} recipes have been successfully added!',
      noMatches: 'No matching recipes found.',
      // --- Filter sheet ---
      filterTitle: 'Filter & sorting',
      sortLabel: 'Sorting',
      quickFiltersLabel: 'Quick filters',
      timeLabel: 'Total time',
      timeAny: 'Any',
      timeUnder: 'Up to {count} min',
      resetFilters: 'Reset',
      showResults: 'Show {count} recipes',
      sort: {
        newest: 'Newest',
        recent: 'Recently opened',
        title: 'Name A–Z',
        time: 'Cooking time',
      },
      collectionsTitle: 'Collections',
      addCollection: 'New Collection',
      editCollection: 'Edit Collection',
      deleteCollection: 'Delete Collection',
      collectionName: 'Collection Name',
      collectionEmoji: 'Icon / Emoji',
      collectionPlaceholder: 'e.g. Sunday Brunch',
      collectionNameRequired: 'Collection name is required',
      flagsTitle: 'Labels & Flags',
      addFlag: 'New Label',
      flagPlaceholder: 'e.g. Try Out',
      manageCollections: 'Manage Collections',
      manageFlags: 'Manage Labels',
      noCollections: 'No collections created yet',
      noFlags: 'No labels created yet',
      premiumFeatureTitle: 'Premium Feature',
      premiumFeatureCollectionsDesc: 'Create collections and organize recipes to perfectly structure your cookbook.',
      premiumFeatureFlagsDesc: 'Create your own custom labels and tags to filter recipes even more flexibly.',
      bulkAddToCollection: 'Add to Collection',
      assignCollectionsTitle: 'Assign Collections',
      manageBulkCollectionsTitle: 'Manage Collections',
      closeButton: 'Close',
      manageRecipeFlagsTitle: 'Manage Recipe Labels',
    },
    shopping: {
      addTitle: 'Add Item',
      placeholderName: 'Ingredient (e.g., tomatoes)',
      placeholderAmount: 'Amount',
      placeholderUnit: 'Unit',
      suggestions: 'Suggestions:',
      suggestionsList: ['pcs', 'g', 'ml', 'pkg', 'can', 'tsp', 'tbsp'],
      btnAdd: 'Add',
      btnCancelInline: 'Cancel',
      title: 'Shopping List',
      clearChecked: 'Clear Checked',
      clearAll: 'Clear List',
      dialogClear: {
        title: 'Clear shopping list?',
        message: 'Are you sure you want to clear all items from the shopping list?',
        confirm: 'Clear',
        cancel: 'Cancel',
      },
      emptyState: {
        welcomeTitle: 'Your shopping list is empty',
        welcomeDesc: 'Send the ingredients of your saved recipes to the list with one tap — automatically sorted by supermarket aisle.',
        ctaButton: 'Browse recipes',
        step1Title: '1. Open a recipe',
        step1Desc: 'Open a saved recipe from your cookbook.',
        step2Title: '2. Tap the cart',
        step2Desc: 'Tap the shopping-cart icon to add all its ingredients.',
        step3Title: '3. Sorted by aisle',
        step3Desc: 'Ingredients land grouped by supermarket aisle — ready to shop.',
      },
      toBuy: 'To buy ({count})',
      inCart: 'Already in cart ({count})',
      progressLabel: 'Progress',
      done: 'Done',
      toBuyCount: 'open',
      checkGroup: 'Check group',
      uncheckGroup: 'Uncheck group',
      checkAll: 'All',
      entry: 'item',
      entries: 'items',
      manual: 'Manual',
      deleteItem: 'Delete item',
      recipeCount: '{count} recipes',
      recipesSectionTitle: 'Recipes on list',
      recipesCount: '{count} recipes',
      recipesCountSingle: '1 recipe',
      recipeIngredientsProgress: '{checked}/{total} ingredients',
      recipeIngredientsCount: '{count} ingredients',
      recipeIngredientsCountSingle: '1 ingredient',
      recipeAllChecked: '✓ All in cart',
      removeRecipeConfirmTitle: 'Remove recipe from list?',
      removeRecipeConfirmMessage: 'Do you want to remove all ingredients for "{title}" from the shopping list?',
      removeRecipeConfirmBtn: 'Remove ingredients',
      doneCount: 'Done ({count})',
      moreActions: 'More actions',
      allDoneBadge: '🎉 All in cart',
      allDoneTitle: 'All done!',
      allDoneDesc: 'You got all the ingredients. Enjoy cooking your meal!',
      finishShopping: 'Finish shopping',
      restoreItem: 'Restore item',
    },
    dialog: {
      confirmDefault: 'Confirm',
      cancelDefault: 'Cancel',
      closeAria: 'Close',
    },
    remix: {
      title: 'Recipe Remix',
      subtitle: 'Let the AI customize the recipe for you.',
      placeholder: 'Or write your own request... e.g. \'I don\'t have eggs, what can I use?\'',
      generating: 'Generating remix...',
      btnCancel: 'Cancel',
      btnStart: 'Start Remix',
      parentLinkPrefix: 'Remixed from',
      parentLinkDeleted: 'deleted',
      chips: {
        vegan: { label: 'Vegan', prompt: 'Make it vegan' },
        highProtein: { label: 'High Protein', prompt: 'Make it high protein' },
        lowCalorie: { label: 'Low Calorie', prompt: 'Make it low calorie' },
        budget: { label: 'Budget Friendly', prompt: 'Make it budget friendly' },
        glutenFree: { label: 'Gluten Free', prompt: 'Make it gluten free' }
      }
    },
    copilot: {
      title: 'Recipe Copilot',
      subtitle: 'Your smart AI sous-chef',
      placeholder: 'Ask about preparation or ingredients...',
      sendAria: 'Send message',
      remixReady: 'Recipe Remix ready',
      remixLoadBtn: 'Load & save new version',
      remixSuccessToast: 'Recipe successfully updated!',
      shoppingListToast: 'Added ingredients to shopping list: {ingredients}',
      timerToast: 'Started timer for {label} ({duration} min.)!',
      timerNoLabel: 'Cooking step',
      errorForbidden: 'The Copilot is a premium feature. Please upgrade to Pro.',
      errorGeneral: 'An error occurred. Please try again.',
      chipsHeaderRemix: 'Customize Recipe',
      chipsHeaderHelp: 'Preparation Help',
      chipsHeaderSubs: 'Ingredient Emergency',
      chipsHeaderShopping: 'Shopping List',
      chipsHeaderTimer: 'Timer',
      chipVegan: 'Make it vegan',
      chipProtein: 'Make it high protein',
      chipPortions: 'Adjust portions',
      chipAirfryer: 'Alternative without Airfryer?',
      chipRoux: 'Term: What does "Roux" mean?',
      chipFreeze: 'How to freeze leftovers?',
      chipSubstitute: 'Alternative for {ingredient}?',
      loading: 'Responding...',
      actionRunning: 'Running action...',
      showSuggestionsAria: 'Show suggestions',
      remixConfirmTitle: 'Confirm recipe change',
      remixConfirmBody: 'Do you want to modify the recipe with: "{request}"?',
      remixReplaceBtn: 'Replace current',
      remixNewBtn: 'As new recipe',
      remixCreated: 'The remix recipe "{title}" has been created.',
      clearAria: 'Reset chat',
      clearConfirmTitle: 'Reset chat?',
      clearConfirmBody: 'Do you want to clear this conversation and the suggestions for this recipe? This cannot be undone.',
      clearConfirmBtn: 'Reset',
      changesTitle: 'Planned changes ({count})',
      changesHint: 'Collect changes and apply them together.',
      changesApply: 'Apply changes',
      changesDiscardAll: 'Discard all',
      changesDeleteAria: 'Remove change',
      changesApplyPrompt: 'How do you want to apply the changes?',
      changesEmpty: 'No changes collected yet.',
    },
    timer: {
      confirmTitle: 'Start timer?',
      confirmStart: 'Start Timer',
      confirmCancel: 'Cancel',
      adjustDuration: 'Adjust duration',
      finished: 'Timer finished!',
      dismiss: 'Dismiss',
      activeTimers: '{count} timer(s) active',
      minutes: '{count} min.',
      seconds: '{count} sec.',
      minutesShort: 'm',
      notificationBody: 'Your cooking timer has finished.',
    },
    premium: {
      modal: {
        title: 'Snagbite Premium',
        subtitle: 'Cook more. Type less.',
        cta: 'Unlock Premium Now',
        loading: 'Processing payment...',
        success: 'Successfully unlocked!',
        error: 'Payment failed. Please try again.',
        close: 'Close',
        owned: 'You have Premium',
        alphaOwned: 'Purchases disabled during alpha',
        verifying: 'Verifying Status...',
        footer: 'Cancel anytime · Secure via Google Play',
        monthly: 'Monthly',
        yearly: 'Yearly',
        savePercent: 'Save {percent}%',
        bestseller: 'Best Value',
        coffeeAnchor: 'Less than the price of a coffee per month',
        pricePeriod: '{price} / month',
        priceYearlyPeriod: '{price} / year',
        priceMonthlyEquivalent: '{price} / month',
        trialBadge: '{days} days free',
        ctaWithTrial: 'Start Free Trial',
        ctaWithoutTrial: 'Unlock Premium',
        cancelSubtitle: 'No risk. Cancel anytime.',
        termsNoticePrefix: 'By purchasing you agree to the ',
        termsLink: 'Terms & Conditions',
        termsNoticeSuffix: '.',
        trialBanner: {
          title: 'Try Premium free',
          body: 'Unlock everything. Cancel anytime.',
          cta: 'Start free',
          dismiss: 'Later',
          days: 'days',
        },
        comparison: {
          tableTitle: 'Free vs. Premium Comparison',
          headerFeature: 'Feature',
          headerFree: 'Free',
          headerPremium: 'Premium',
          rowExtractions: 'Recipe Import',
          rowExtractionsFree: '1 / day',
          rowExtractionsPremium: 'Unlimited',
          rowCookbook: 'Cookbook (Save)',
          rowCookbookFree: 'Max 10 recipes',
          rowCookbookPremium: 'Unlimited',
          rowShoppingList: 'Shopping List',
          rowShoppingListFree: '1 recipe',
          rowShoppingListPremium: 'Smart Combined',
          rowAiChat: 'Recipe AI Chat',
          rowAiChatFree: '❌ No',
          rowAiChatPremium: '✔️ Yes',
          rowNutrition: 'Nutrition & Macros',
          rowNutritionFree: '❌ No',
          rowNutritionPremium: '✔️ Yes',
          rowCollections: 'Collections & Labels',
          rowCookingMode: 'Cooking Mode & Timers'
        },
        features: {
          extractions: {
            title: 'More Recipe Imports',
            desc: 'Up to 30 a day from videos, web & photos — in the background & several at once.'
          },
          nutrition: {
            title: 'Nutrition & Macros',
            desc: 'Calories, macros & portions per serving at a glance.'
          },
          remix: {
            title: 'Recipe AI Chat',
            desc: 'Adapt recipes via chat, replace ingredients & get cooking tips.'
          },
          shoppingList: {
            title: 'Smart Shopping List',
            desc: 'Combine ingredients from as many recipes as you like.'
          },
          collections: {
            title: 'Collections & Labels',
            desc: 'Organise recipes into your own collections.'
          },
          cookingMode: {
            title: 'Cooking Mode',
            desc: 'Step-by-step cooking with timer & focus view.'
          },
          noAds: {
            title: 'No Ads',
            desc: 'Enjoy the app without banner ads.'
          }
        }
      },
      shoppingListLimit: {
        title: 'Premium Feature',
        message: 'You already have ingredients from another recipe on your shopping list. Get Premium to combine ingredients from multiple recipes!'
      },
      hint: {
        extractUnlimited: 'Premium: Unlock unlimited',
        catalogFull: 'Cookbook full ({count}/{limit}). Go Premium to save unlimited recipes.',
        catalogAlmostFull: 'Cookbook almost full ({count}/{limit})',
        extractionLimitReached: 'Daily limit reached ({used}/{limit}) – Watch a short video to create or upgrade to Premium.',
        unlockNutrition: 'Unlock nutrition',
        unlockMacros: 'Unlock macros',
        upgrade: 'Upgrade'
      }
    },
    feedback: {
      rowLabel: 'Report a bug / Feedback',
      title: 'Report a bug / Feedback',
      typeBug: 'Bug',
      typeIdea: 'Idea',
      messageLabel: 'Your message',
      placeholder: 'Describe the issue or your idea in as much detail as possible...',
      screenshotLabel: 'Screenshots (optional)',
      attachScreenshot: 'Attach screenshots',
      addMoreScreenshots: 'Add more',
      removeScreenshot: 'Remove screenshot',
      screenshotLimit: 'You can attach up to 6 images.',
      screenshotError: 'Could not process the screenshot.',
      diagnosticNote: 'Basic device info and recent app logs are attached to help us debug faster.',
      cancel: 'Cancel',
      submit: 'Submit',
      submitting: 'Sending...',
      successTitle: 'Thank you!',
      success: 'Thanks for your feedback! We\'ll take a look.',
      error: 'Could not send feedback. Please try again.'
    },
    ota: {
      banner: {
        title: 'App update available',
        description: 'Version {version} has been downloaded. Reload now?',
        apply: 'Reload now',
        later: 'Later'
      }
    }
  }
} as const;

export function getTranslation(key: string, lang: SupportedLanguage, variables?: Record<string, string | number>): string {
  const keys = key.split('.');
  let current: any = uiTranslations[lang];
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return key;
    }
  }
  if (typeof current !== 'string') {
    return key;
  }
  let result = current;
  if (variables) {
    Object.entries(variables).forEach(([name, val]) => {
      result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(val));
    });
  }
  return result;
}

/**
 * Substrings that mark a message as a raw backend/worker/library error rather
 * than something written for a human. When an unrecognized error still contains
 * one of these (or is unusually long), {@link translateApiError} swaps it for a
 * friendly generic message instead of leaking internals to the user.
 */
const TECHNICAL_ERROR_MARKERS = [
  '://',
  'status:',
  'error:',
  'exception',
  'traceback',
  'stack trace',
  'rapidapi',
  'yt-dlp',
  'ytdlp',
  'apify',
  'actor run',
  'econnreset',
  'etimedout',
  'enoent',
  'undefined',
  'typeerror',
  'referenceerror',
  'cannot read',
  'fetch failed',
  ' | ',
  'http error',
];

/** True when a message looks like a raw technical dump not meant for end users. */
function looksTechnical(msg: string): boolean {
  const lower = msg.toLowerCase();
  if (TECHNICAL_ERROR_MARKERS.some((marker) => lower.includes(marker))) return true;
  // Genuine user-facing messages are short; raw dumps tend to be long.
  return msg.length > 180;
}

export function translateApiError(errorMsg: string | null | undefined, lang: SupportedLanguage = 'de'): string {
  if (!errorMsg) return '';

  const lowerMsg = errorMsg.toLowerCase();

  if (lowerMsg.includes('rate limit:')) {
    const limitMatch = errorMsg.match(/limit of (\d+)/i);
    const daysMatch = errorMsg.match(/per (\d+) days/i);
    const minMatch = errorMsg.match(/in (\d+) minutes/i);

    const limit = limitMatch ? limitMatch[1] : '10';
    const days = daysMatch ? daysMatch[1] : '1';
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;

    let timeTextDe = '';
    let timeTextEn = '';

    if (minutes > 0) {
      if (minutes >= 1440) {
        const d = Math.floor(minutes / 1440);
        const remainingMin = minutes % 1440;
        const h = Math.floor(remainingMin / 60);

        const dayStrDe = d === 1 ? '1 Tag' : `${d} Tagen`;
        const dayStrEn = d === 1 ? '1 day' : `${d} days`;

        const hourTextDe = h > 0 ? ` und ${h} Std.` : '';
        const hourTextEn = h > 0 ? ` and ${h} hr.` : '';

        timeTextDe = `Bitte versuche es in ${dayStrDe}${hourTextDe} erneut.`;
        timeTextEn = `Please try again in ${dayStrEn}${hourTextEn}.`;
      } else if (minutes >= 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        timeTextDe = m > 0
          ? `Bitte versuche es in ${h} Std. und ${m} Min. erneut.`
          : `Bitte versuche es in ${h} Std. erneut.`;
        timeTextEn = m > 0
          ? `Please try again in ${h} hr. and ${m} min.`
          : `Please try again in ${h} hr.`;
      } else {
        timeTextDe = `Bitte versuche es in ${minutes} Min. erneut.`;
        timeTextEn = `Please try again in ${minutes} min.`;
      }
    } else {
      timeTextDe = 'Bitte versuche es später erneut.';
      timeTextEn = 'Please try again later.';
    }

    const daysStr = days === '1'
      ? (lang === 'de' ? 'Tag' : 'day')
      : (lang === 'de' ? `${days} Tagen` : `${days} days`);

    return lang === 'de'
      ? `Du hast dein Limit von ${limit} Rezepten pro ${daysStr} erreicht. ${timeTextDe}`
      : `You have reached your limit of ${limit} recipes per ${daysStr}. ${timeTextEn}`;
  }

  if (lowerMsg.includes('too many requests')) {
    return lang === 'de'
      ? 'Zu viele Anfragen. Bitte versuche es später noch einmal.'
      : 'Too many requests. Please try again later.';
  }

  if (lowerMsg.includes('active job')) {
    const match = errorMsg.match(/\d+/);
    const count = match ? match[0] : '1';
    return lang === 'de'
      ? `Du hast bereits ${count} laufende(n) Rezept-Import(e). Bitte warte, bis diese abgeschlossen sind.`
      : `You already have ${count} active recipe import(s). Please wait for them to finish.`;
  }

  if (lowerMsg.includes('cookbook full')) {
    const m = errorMsg.match(/\((\d+)\/(\d+)\)/);
    const count = m ? m[1] : '';
    const limit = m ? m[2] : '5';
    const countStr = count ? `${count}/${limit}` : `${limit}`;
    return lang === 'de'
      ? `Kochbuch voll (${countStr}). Lösche ein Rezept oder hol dir Premium, um weitere Rezepte zu speichern.`
      : `Cookbook full (${countStr}). Delete a recipe or upgrade to Premium to save more.`;
  }

  if (lowerMsg.includes('youtube shorts')) {
    return lang === 'de'
      ? 'Nur YouTube Shorts werden unterstützt, keine regulären YouTube-Videos.'
      : 'Only YouTube Shorts are supported, not regular YouTube videos.';
  }

  if (lowerMsg.includes('invalid url')) {
    return lang === 'de'
      ? 'Ungültige URL. Bitte überprüfe den Link (muss Instagram, TikTok, YouTube Shorts oder Website sein).'
      : 'Invalid URL. Please check the link (must be Instagram, TikTok, YouTube Shorts, or website).';
  }

  if (lowerMsg.includes('unauthorized') || lowerMsg.includes('not authorized') || lowerMsg.includes('401')) {
    return lang === 'de'
      ? 'Nicht autorisiert. Bitte melde dich erneut an.'
      : 'Unauthorized. Please sign in again.';
  }

  if (lowerMsg.includes('parent job not found') || lowerMsg.includes('parent job or recipe not found')) {
    return lang === 'de'
      ? 'Ursprungsrezept nicht gefunden.'
      : 'Parent recipe not found.';
  }

  if (lowerMsg.includes('remix prompt must not exceed')) {
    return lang === 'de'
      ? 'Der Remix-Text darf maximal 250 Zeichen lang sein.'
      : 'Remix prompt must not exceed 250 characters.';
  }

  if (lowerMsg.includes('unrelated request')) {
    return lang === 'de'
      ? 'Ungültige Anfrage: Die KI hat keine Rezeptänderung im eingegebenen Text erkannt.'
      : 'Invalid request: The AI did not recognize any recipe modifications in the text.';
  }

  if (lowerMsg.includes('failed to scrape instagram') || lowerMsg.includes('instagram data')) {
    return lang === 'de'
      ? 'Fehler beim Abrufen des Instagram Reels. Bitte überprüfe, ob das Video öffentlich und der Link korrekt ist.'
      : 'Failed to retrieve the Instagram Reel. Please make sure the video is public and the link is correct.';
  }

  // ── Media / scraping failures ──────────────────────────────────────────────
  // When every scrape provider (RapidAPI → yt-dlp → Apify actor) fails, the
  // backend throws one aggregated message that leaks provider names, raw URLs,
  // "Unsupported URL", actor run IDs and "TIMED-OUT" statuses. None of that is
  // actionable for a cook, so collapse the whole family of download/extraction
  // failures into a single friendly explanation. Checked before the timeout
  // branch below so the aggregate (which may contain "TIMED-OUT") lands here.
  if (
    lowerMsg.includes('social provider(s) failed') ||
    lowerMsg.includes('no social scrape providers') ||
    lowerMsg.includes('no usable video media') ||
    lowerMsg.includes('unsupported url') ||
    lowerMsg.includes('no dataset items') ||
    lowerMsg.includes('produced no video url') ||
    lowerMsg.includes('failed to retrieve status for actor') ||
    lowerMsg.includes('finished with status')
  ) {
    return lang === 'de'
      ? 'Aus diesem Link konnte kein Rezept geladen werden. Das Video ist möglicherweise privat, wurde gelöscht oder wird nicht unterstützt. Bitte überprüfe den Link oder versuche es mit einem anderen Beitrag.'
      : "We couldn't load a recipe from this link. The video may be private, deleted, or unsupported. Please check the link or try another post.";
  }

  // Transient network / provider timeouts — a plain retry usually succeeds.
  if (
    lowerMsg.includes('timed-out') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('network error')
  ) {
    return lang === 'de'
      ? 'Zeitüberschreitung beim Laden des Videos. Bitte versuche es in einem Moment noch einmal.'
      : 'The video took too long to load. Please try again in a moment.';
  }

  if (lowerMsg.includes('video too long')) {
    const limitMatch = errorMsg.match(/the\s+(\d+)\s*s limit/i);
    const limitSec = limitMatch ? parseInt(limitMatch[1], 10) : null;
    // Whole minutes read as "X min"; anything else stays in seconds (e.g. 90s).
    const limitLabel =
      limitSec != null && limitSec % 60 === 0
        ? lang === 'de'
          ? `${limitSec / 60} Minuten`
          : `${limitSec / 60} minutes`
        : limitSec != null
          ? lang === 'de'
            ? `${limitSec} Sekunden`
            : `${limitSec} seconds`
          : null;
    return lang === 'de'
      ? limitLabel
        ? `Das Video ist zu lang. Es sind maximal ${limitLabel} erlaubt.`
        : 'Das Video ist zu lang.'
      : limitLabel
        ? `The video is too long. The maximum allowed length is ${limitLabel}.`
        : 'The video is too long.';
  }

  if (lowerMsg.includes('could not find any recipe details')) {
    return lang === 'de'
      ? 'Auf dieser Website konnte kein Rezept gefunden werden.'
      : 'Could not find any recipe details on this website.';
  }

  if (lowerMsg.includes('failed to download') || lowerMsg.includes('audio download failed') || lowerMsg.includes('video download failed')) {
    return lang === 'de'
      ? 'Fehler beim Herunterladen der Medien-Audiodatei. Bitte versuche es noch einmal.'
      : 'Failed to download the media audio file. Please try again.';
  }

  if (lowerMsg.includes('internal server error')) {
    return lang === 'de'
      ? 'Ein interner Serverfehler ist aufgetreten. Bitte versuche es später erneut.'
      : 'An internal server error occurred. Please try again later.';
  }

  // Handle standard default messages
  if (errorMsg === 'failed_check' || errorMsg === 'failedCheck') {
    return lang === 'de' ? 'Statusüberprüfung vom Server fehlgeschlagen.' : 'Failed to check status from server.';
  }
  if (errorMsg === 'failed_extraction' || errorMsg === 'failedExtraction') {
    return lang === 'de' ? 'Die Rezept-Erstellung ist fehlgeschlagen.' : 'The recipe creation failed.';
  }
  if (errorMsg === 'lost_connection' || errorMsg === 'lostConnection') {
    return lang === 'de' ? 'Verbindung zum Backend-Server verloren.' : 'Lost connection to backend server.';
  }
  if (errorMsg === 'submit_failed' || errorMsg === 'submitFailed') {
    return lang === 'de' ? 'Auftrag konnte nicht übermittelt werden.' : 'Failed to submit extraction job.';
  }

  // Safety net: anything unmatched that still looks like a raw technical dump
  // (stack fragments, HTTP codes, provider internals, file paths…) gets replaced
  // by a friendly generic message so we never surface internals to the user.
  // Short, clean human sentences pass through unchanged.
  if (looksTechnical(errorMsg)) {
    return lang === 'de'
      ? 'Beim Erstellen des Rezepts ist ein Fehler aufgetreten. Bitte versuche es erneut.'
      : 'Something went wrong while creating the recipe. Please try again.';
  }

  return errorMsg;
}

// ── Error-code → localized message resolution ────────────────────────────────
// The message templates live in the i18n dictionary (`error.codes.*` and the
// `error.{premium,field,duration,period,tryAgain}` helper groups). The builders
// below only compose the dynamic fragments (plural periods, retry phrasing, unit
// labels, feature/field labels) — each of which is itself pulled from i18n — and
// feed them as `{variables}` into `getTranslation`. No user-facing copy is
// hardcoded here.

/** Translates a form-field name into its friendly, localized label. */
function fieldLabel(field: string, lang: SupportedLanguage): string {
  const known = ['url', 'prompt', 'message', 'modificationRequest'];
  return getTranslation(`error.field.${known.includes(field) ? field : 'generic'}`, lang);
}

/** Localized premium-feature message (per-feature copy, generic fallback). */
function premiumText(feature: string, lang: SupportedLanguage): string {
  const known = ['remix', 'chat', 'collections', 'tags'];
  return getTranslation(`error.premium.${known.includes(feature) ? feature : 'generic'}`, lang);
}

/** Localized "per <period>" fragment for the rate-limit message. */
function ratePeriod(days: number, lang: SupportedLanguage): string {
  return days === 1
    ? getTranslation('error.period.day', lang)
    : getTranslation('error.period.days', lang, { n: days });
}

/** Localized human duration label for the video-length cap. */
function videoLimit(seconds: number, lang: SupportedLanguage): string {
  return seconds % 60 === 0
    ? getTranslation('error.duration.minutes', lang, { n: seconds / 60 })
    : getTranslation('error.duration.seconds', lang, { n: seconds });
}

/** Localized "please try again in …" phrasing from a minutes-remaining count. */
function retryAfter(minutes: number, lang: SupportedLanguage): string {
  if (!minutes || minutes <= 0) return getTranslation('error.tryAgain.later', lang);
  if (minutes >= 1440) {
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const dayStr = d === 1
      ? getTranslation('error.duration.day1', lang)
      : getTranslation('error.duration.dayN', lang, { n: d });
    const hourStr = h > 0 ? getTranslation('error.duration.andHours', lang, { h }) : '';
    return getTranslation('error.tryAgain.days', lang, { dayStr, hourStr });
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0
      ? getTranslation('error.tryAgain.hoursMinutes', lang, { h, m })
      : getTranslation('error.tryAgain.hours', lang, { h });
  }
  return getTranslation('error.tryAgain.minutes', lang, { m: minutes });
}

/**
 * Builds the localized message for an error code + params. Unknown codes and the
 * generic worker fallback resolve to a friendly generic message — never a raw
 * dump. Codes with dynamic content compose their `{variables}` from i18n; the
 * rest are a direct dictionary lookup.
 */
export function messageForCode(
  code: string | null | undefined,
  params: ErrorParams | undefined,
  lang: SupportedLanguage,
): string {
  if (!code || !isKnownErrorCode(code)) return getTranslation('error.generic', lang);
  const p: ErrorParams = params ?? {};
  const c: AppErrorCode = code;

  switch (c) {
    case 'EXTRACTION_FAILED':
      return getTranslation('error.generic', lang);
    case 'MISSING_FIELD':
    case 'INVALID_FIELD':
      return getTranslation(`error.codes.${c}`, lang, { field: fieldLabel(String(p.field ?? ''), lang) });
    case 'PREMIUM_REQUIRED':
      return premiumText(String(p.feature ?? ''), lang);
    case 'COOKBOOK_FULL': {
      const counts = p.count != null && p.limit != null ? `${p.count}/${p.limit}` : `${p.limit ?? ''}`;
      return getTranslation('error.codes.COOKBOOK_FULL', lang, { counts });
    }
    case 'RATE_LIMIT_EXCEEDED':
      return getTranslation('error.codes.RATE_LIMIT_EXCEEDED', lang, {
        limit: p.limit ?? 10,
        period: ratePeriod(Number(p.days ?? 1), lang),
        retry: retryAfter(Number(p.minutes ?? 0), lang),
      });
    case 'VIDEO_TOO_LONG': {
      const seconds = Number(p.maxSeconds ?? 0);
      return seconds > 0
        ? getTranslation('error.codes.VIDEO_TOO_LONG', lang, { limit: videoLimit(seconds, lang) })
        : getTranslation('error.codes.VIDEO_TOO_LONG_NO_LIMIT', lang);
    }
    case 'REMIX_PROMPT_TOO_LONG':
      return getTranslation('error.codes.REMIX_PROMPT_TOO_LONG', lang, { max: p.max ?? 250 });
    case 'MESSAGE_TOO_LONG':
      return getTranslation('error.codes.MESSAGE_TOO_LONG', lang, { max: p.max ?? 4000 });
    case 'TOO_MANY_SCREENSHOTS':
      return getTranslation('error.codes.TOO_MANY_SCREENSHOTS', lang, { max: p.max ?? 6 });
    case 'ACTIVE_JOB_EXISTS':
      return getTranslation('error.codes.ACTIVE_JOB_EXISTS', lang, { count: p.count ?? 1 });
    case 'PHOTO_NOT_MATCHING':
      return getTranslation('app.gamification.rejectionReason', lang);
    default:
      return getTranslation(`error.codes.${c}`, lang);
  }
}

/**
 * Resolves a *stored* job error into localized display text using the CURRENT
 * language. Hooks keep the raw error in state instead of pre-translated text, so
 * the message re-localizes when the user switches language rather than freezing
 * in whatever language was active when the job failed.
 *
 * Resolution order (codes first — see `errorCodes.ts`):
 *   1. `form.validation.*` i18n key → dictionary lookup.
 *   2. A serialized `{code, params}` envelope (how the worker persists failures).
 *   3. A bare known error code string (how API responses surface `data.code`).
 *   4. Legacy raw backend text → `translateApiError` string-matching fallback.
 *      This path exists only for jobs persisted before the code system and for
 *      any un-coded throw; new failures always carry a code.
 */
export function resolveJobError(err: string | null | undefined, lang: SupportedLanguage): string {
  if (!err) return '';
  if (err.startsWith('form.validation.')) return getTranslation(err, lang);

  const envelope = parseSerializedError(err);
  if (envelope) return messageForCode(envelope.code, envelope.params, lang);

  if (isKnownErrorCode(err)) return messageForCode(err, undefined, lang);

  return translateApiError(err, lang);
}

/**
 * Resolves a synchronous API error (a `code` + `params` from a `{ success:false }`
 * response) into localized text. Falls back to `translateApiError` on the raw
 * `error` string when no known code is present (older clients/responses).
 */
export function resolveErrorCode(
  code: string | null | undefined,
  params: ErrorParams | undefined,
  rawError: string | null | undefined,
  lang: SupportedLanguage,
): string {
  if (code && isKnownErrorCode(code)) return messageForCode(code, params, lang);
  if (rawError) return resolveJobError(rawError, lang);
  return messageForCode(undefined, undefined, lang);
}


