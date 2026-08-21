import type { SavedRecipe, Recipe } from '../types.js';
import { countKeywordMatches, seasonKeywords } from './season.js';
import {
  TYPE_CATEGORY,
  type Candidate,
  type NotificationContext,
  type NotificationType,
} from './types.js';

// ── small helpers ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function ageDays(entry: SavedRecipe, now: Date): number {
  const added = new Date(entry.addedAt).getTime();
  return Math.floor((now.getTime() - added) / DAY_MS);
}

/**
 * The user's cookbook. There is nothing left to filter here — a cookbook entry
 * only exists for a recipe that was successfully extracted, so the old
 * `status === 'completed' && j.recipe` guard has no work to do.
 */
function savedRecipes(ctx: NotificationContext): SavedRecipe[] {
  return ctx.recipes;
}

function totalMinutes(recipe: Recipe): number {
  return (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
}

function flatBaseNames(recipe: Recipe): string[] {
  const names: string[] = [];
  for (const group of recipe.ingredients || []) {
    for (const item of group.items || []) {
      const n = (item.baseName || item.name || '').trim().toLowerCase();
      if (n) names.push(n);
    }
  }
  return names;
}

/** Make a candidate, filling in the category from the central map. */
function candidate(
  type: NotificationType,
  score: number,
  recipeId: string | null,
  slots: Record<string, unknown>,
): Candidate {
  return { type, category: TYPE_CATEGORY[type], score, recipeId, slots };
}

/** Deterministic-ish "random" pick seeded by the day, so a tick is stable within a day. */
function pickOne<T>(items: T[], seed: number): T | undefined {
  if (items.length === 0) return undefined;
  return items[seed % items.length];
}

// ── generators ────────────────────────────────────────────────────────────────
// Each returns 0..n candidates. They never read opt-in/dedupe state — that is
// applied centrally in buildCandidates so the generators stay pure & testable.

function genSeasonal(ctx: NotificationContext): Candidate[] {
  const kws = seasonKeywords(ctx.season);
  const matches = savedRecipes(ctx)
    .map((j) => ({ j, n: countKeywordMatches(j.recipe as Recipe, kws) }))
    .filter((m) => m.n > 0)
    .sort((a, b) => b.n - a.n);
  if (matches.length === 0) return [];
  const best = matches[0].j;
  return [
    candidate('seasonal', 60 + Math.min(matches.length, 5) * 4, best.recipeId, {
      season: ctx.season,
      recipeTitle: best.recipe!.title,
      recipeEmoji: best.recipe!.emoji ?? null,
      matchCount: matches.length,
    }),
  ];
}

function genHolidayEvent(ctx: NotificationContext): Candidate[] {
  const out: Candidate[] = [];
  for (const holiday of ctx.holidays) {
    const matches = savedRecipes(ctx)
      .map((j) => ({ j, n: countKeywordMatches(j.recipe as Recipe, holiday.keywords) }))
      .filter((m) => m.n > 0)
      .sort((a, b) => b.n - a.n);
    if (matches.length === 0) continue;
    const best = matches[0].j;
    out.push(
      candidate('holiday_event', 66 + Math.min(matches.length, 4) * 3, best.recipeId, {
        holiday: holiday.label,
        recipeTitle: best.recipe!.title,
        recipeEmoji: best.recipe!.emoji ?? null,
        matchCount: matches.length,
      }),
    );
  }
  return out;
}

function genSavedReminder(ctx: NotificationContext): Candidate[] {
  const aged = savedRecipes(ctx)
    .map((j) => ({ j, age: ageDays(j, ctx.now) }))
    .filter((m) => m.age >= 14);
  if (aged.length === 0) return [];
  // Prefer a favorite; among those, the oldest.
  aged.sort((a, b) => {
    const favDiff = Number(!!b.j.isFavorite) - Number(!!a.j.isFavorite);
    return favDiff !== 0 ? favDiff : b.age - a.age;
  });
  const top = aged[0];
  const weeks = Math.floor(top.age / 7);
  return [
    candidate('saved_reminder', 55 + (top.j.isFavorite ? 15 : 0) + Math.min(weeks, 8), top.j.recipeId, {
      recipeTitle: top.j.recipe!.title,
      recipeEmoji: top.j.recipe!.emoji ?? null,
      weeksAgo: weeks,
      isFavorite: !!top.j.isFavorite,
    }),
  ];
}

function genDormantRediscovery(ctx: NotificationContext): Candidate[] {
  const dormant = savedRecipes(ctx).filter(
    (j) => ageDays(j, ctx.now) >= 30 && (j.collectionIds?.length ?? 0) === 0,
  );
  const pick = pickOne(dormant, ctx.localWeekday + ctx.now.getUTCDate());
  if (!pick) return [];
  return [
    candidate('dormant_rediscovery', 45, pick.recipeId, {
      recipeTitle: pick.recipe!.title,
      recipeEmoji: pick.recipe!.emoji ?? null,
      weeksAgo: Math.floor(ageDays(pick, ctx.now) / 7),
    }),
  ];
}

function genCollectionNudge(ctx: NotificationContext): Candidate[] {
  const out: Candidate[] = [];
  for (const [, col] of ctx.collections) {
    if (col.recipeIds.length < 3) continue;
    const memberEntry = savedRecipes(ctx).find((j) => col.recipeIds.includes(j.recipeId));
    if (!memberEntry) continue;
    out.push(
      candidate('collection_nudge', 50 + Math.min(col.recipeIds.length, 10), memberEntry.recipeId, {
        collectionName: col.name,
        recipeCount: col.recipeIds.length,
        recipeTitle: memberEntry.recipe!.title,
      }),
    );
  }
  return out;
}

function genAnniversary(ctx: NotificationContext): Candidate[] {
  const out: Candidate[] = [];
  for (const j of savedRecipes(ctx)) {
    const age = ageDays(j, ctx.now);
    // Fire within a 1-day window around the 6- and 12-month marks.
    if (Math.abs(age - 365) <= 1) {
      out.push(candidate('anniversary', 72, j.recipeId, {
        recipeTitle: j.recipe!.title, recipeEmoji: j.recipe!.emoji ?? null, period: '1 year',
      }));
    } else if (Math.abs(age - 182) <= 1) {
      out.push(candidate('anniversary', 68, j.recipeId, {
        recipeTitle: j.recipe!.title, recipeEmoji: j.recipe!.emoji ?? null, period: '6 months',
      }));
    }
  }
  return out;
}

function daypart(hour: number): 'morning' | 'midday' | 'evening' {
  if (hour < 11) return 'morning';
  if (hour < 16) return 'midday';
  return 'evening';
}

function genWeekdaySuggestion(ctx: NotificationContext): Candidate[] {
  const part = daypart(ctx.localHour);
  const isFriday = ctx.localWeekday === 5;
  const isWeekend = ctx.localWeekday === 0 || ctx.localWeekday === 6;
  const recipes = savedRecipes(ctx);
  if (recipes.length === 0) return [];

  let wanted: string[] = [];
  let hint = '';
  if (isFriday && part === 'evening') {
    wanted = ['pizza', 'burger', 'pasta', 'comfort', 'fritten', 'fries', 'taco', 'nacho'];
    hint = 'friday_comfort';
  } else if (part === 'morning') {
    wanted = ['frühstück', 'breakfast', 'pancake', 'ei', 'egg', 'porridge', 'müsli', 'toast', 'brunch'];
    hint = 'breakfast';
  } else if (isWeekend) {
    wanted = []; // pick something more elaborate (higher cook time) below
    hint = 'weekend_project';
  } else {
    wanted = ['schnell', 'quick', 'easy', 'einfach', 'pfanne', 'onepot', 'one-pot'];
    hint = 'weeknight';
  }

  let target: SavedRecipe | undefined;
  if (hint === 'weekend_project') {
    target = [...recipes].sort((a, b) => totalMinutes(b.recipe!) - totalMinutes(a.recipe!))[0];
  } else {
    const matched = recipes
      .map((j) => ({ j, n: countKeywordMatches(j.recipe as Recipe, wanted) }))
      .filter((m) => m.n > 0)
      .sort((a, b) => b.n - a.n);
    target = matched[0]?.j;
  }
  if (!target) return [];

  return [
    candidate('weekday_suggestion', 50, target.recipeId, {
      recipeTitle: target.recipe!.title,
      recipeEmoji: target.recipe!.emoji ?? null,
      weekday: ctx.localWeekday,
      daypart: part,
      hint,
    }),
  ];
}

function genQuickWin(ctx: NotificationContext): Candidate[] {
  const isWeekend = ctx.localWeekday === 0 || ctx.localWeekday === 6;
  if (isWeekend || daypart(ctx.localHour) === 'morning') return [];
  const quick = savedRecipes(ctx)
    .map((j) => ({ j, mins: totalMinutes(j.recipe as Recipe) }))
    .filter((m) => m.mins > 0 && m.mins <= 25)
    .sort((a, b) => a.mins - b.mins);
  if (quick.length === 0) return [];
  const top = quick[0];
  return [
    candidate('quick_win', 52 + Math.min(quick.length, 5), top.j.recipeId, {
      recipeTitle: top.j.recipe!.title,
      recipeEmoji: top.j.recipe!.emoji ?? null,
      totalMinutes: top.mins,
      count: quick.length,
    }),
  ];
}

function genOccasionServings(ctx: NotificationContext): Candidate[] {
  const isWeekend = ctx.localWeekday === 0 || ctx.localWeekday === 6;
  if (!isWeekend) return [];
  const big = savedRecipes(ctx)
    .filter((j) => (j.recipe!.servings ?? 0) >= 5)
    .sort((a, b) => (b.recipe!.servings ?? 0) - (a.recipe!.servings ?? 0));
  if (big.length === 0) return [];
  const top = big[0];
  return [
    candidate('occasion_servings', 48, top.recipeId, {
      recipeTitle: top.recipe!.title,
      recipeEmoji: top.recipe!.emoji ?? null,
      servings: top.recipe!.servings,
    }),
  ];
}

/** Most frequent value in a list of arrays, with a minimum occurrence threshold. */
function topFrequency(lists: string[][], min: number): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const list of lists) {
    for (const v of new Set(list)) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) {
    if (count >= min && (!best || count > best.count)) best = { value, count };
  }
  return best;
}

function genTasteAffinity(ctx: NotificationContext): Candidate[] {
  const recipes = savedRecipes(ctx);
  const top = topFrequency(recipes.map((j) => (j.recipe!.tags ?? []).map((t) => t.toLowerCase())), 3);
  if (!top) return [];
  const target = recipes.find((j) =>
    (j.recipe!.tags ?? []).some((t) => t.toLowerCase() === top.value),
  );
  if (!target) return [];
  return [
    candidate('taste_affinity', 50, target.recipeId, {
      tag: top.value,
      tagCount: top.count,
      recipeTitle: target.recipe!.title,
      recipeEmoji: target.recipe!.emoji ?? null,
    }),
  ];
}

function genNutritionGoal(ctx: NotificationContext): Candidate[] {
  const highProtein = savedRecipes(ctx)
    .map((j) => ({ j, protein: j.recipe!.nutritionalValues?.protein ?? 0 }))
    .filter((m) => (m.protein ?? 0) >= 30)
    .sort((a, b) => (b.protein ?? 0) - (a.protein ?? 0));
  if (highProtein.length === 0) return [];
  const top = highProtein[0];
  return [
    candidate('nutrition_goal', 47, top.j.recipeId, {
      recipeTitle: top.j.recipe!.title,
      recipeEmoji: top.j.recipe!.emoji ?? null,
      protein: Math.round(top.protein ?? 0),
    }),
  ];
}

function genIngredientSpotlight(ctx: NotificationContext): Candidate[] {
  const recipes = savedRecipes(ctx);
  const top = topFrequency(recipes.map((j) => flatBaseNames(j.recipe as Recipe)), 3);
  if (!top) return [];
  const target = recipes.find((j) => flatBaseNames(j.recipe as Recipe).includes(top.value));
  if (!target) return [];
  return [
    candidate('ingredient_spotlight', 46, target.recipeId, {
      ingredient: top.value,
      recipeCount: top.count,
      recipeTitle: target.recipe!.title,
      recipeEmoji: target.recipe!.emoji ?? null,
    }),
  ];
}

function genCreatorAffinity(ctx: NotificationContext): Candidate[] {
  const recipes = savedRecipes(ctx).filter((j) => j.recipe!.sourceHandle);
  const top = topFrequency(
    recipes.map((j) => [j.recipe!.sourceHandle!.toLowerCase()]),
    2,
  );
  if (!top) return [];
  const fromCreator = recipes.filter(
    (j) => j.recipe!.sourceHandle!.toLowerCase() === top.value,
  );
  const target = fromCreator.find((j) => j.isFavorite) ?? fromCreator[0];
  if (!target) return [];
  return [
    candidate('creator_affinity', 46, target.recipeId, {
      handle: target.recipe!.sourceHandle,
      recipeCount: top.count,
      recipeTitle: target.recipe!.title,
      recipeEmoji: target.recipe!.emoji ?? null,
    }),
  ];
}

const REMIX_IDEAS = ['gesünder', 'vegetarisch', 'für 2 Personen', 'proteinreicher', 'schneller'];

function genRemixNudge(ctx: NotificationContext): Candidate[] {
  const candidates = savedRecipes(ctx).filter((j) => ageDays(j, ctx.now) >= 7);
  const pick = pickOne(candidates, ctx.now.getUTCDate());
  if (!pick) return [];
  const idea = REMIX_IDEAS[(ctx.now.getUTCDate() + ctx.localWeekday) % REMIX_IDEAS.length];
  return [
    candidate('remix_nudge', 44, pick.recipeId, {
      recipeTitle: pick.recipe!.title,
      recipeEmoji: pick.recipe!.emoji ?? null,
      remixIdea: idea,
    }),
  ];
}

function genMilestone(ctx: NotificationContext): Candidate[] {
  const recipes = savedRecipes(ctx);
  const total = recipes.length;
  const pickRecipeId = recipes[0]?.recipeId ?? null;
  const milestones = [10, 25, 50, 100, 200];
  if (milestones.includes(total)) {
    return [candidate('milestone', 60, pickRecipeId, { kind: 'total', total })];
  }
  const savedThisWeek = recipes.filter((j) => ageDays(j, ctx.now) <= 7);
  if (savedThisWeek.length >= 3) {
    const pickWeeklyId = savedThisWeek[0]?.recipeId ?? pickRecipeId;
    return [candidate('milestone', 56, pickWeeklyId, { kind: 'weekly', weeklyCount: savedThisWeek.length })];
  }
  return [];
}

function genReactivation(ctx: NotificationContext): Candidate[] {
  const recipes = savedRecipes(ctx);
  if (recipes.length === 0) {
    return [candidate('reactivation', 40, null, { kind: 'empty' })];
  }
  if (ctx.daysSinceLastSave >= 21) {
    return [
      candidate('reactivation', 42, null, {
        kind: 'inactive',
        daysInactive: ctx.daysSinceLastSave,
      }),
    ];
  }
  return [];
}

const GENERATORS: Array<(ctx: NotificationContext) => Candidate[]> = [
  genSeasonal,
  genHolidayEvent,
  genSavedReminder,
  genDormantRediscovery,
  genCollectionNudge,
  genAnniversary,
  genWeekdaySuggestion,
  genQuickWin,
  genOccasionServings,
  genTasteAffinity,
  genNutritionGoal,
  genIngredientSpotlight,
  genCreatorAffinity,
  genRemixNudge,
  genMilestone,
  genReactivation,
];

/**
 * Run every generator, filter to opted-in groups, drop anything that repeats a
 * recently-sent type or recipe, apply a small freshness malus, and return the
 * survivors sorted best-first.
 */
export function buildCandidates(ctx: NotificationContext): Candidate[] {
  const raw = GENERATORS.flatMap((gen) => {
    try {
      return gen(ctx);
    } catch (err: any) {
      console.warn(`[notifications] generator failed: ${err?.message ?? err}`);
      return [];
    }
  });

  return raw
    .filter((c) => ctx.categories.has(c.category))
    .filter((c) => !ctx.recentTypes.has(c.type))
    .filter((c) => !(c.recipeId && ctx.recentRecipeIds.has(c.recipeId)))
    .map((c) => ({
      ...c,
      // Nudge variety: a group used recently is slightly penalised.
      score: c.score - (ctx.recentTypes.size > 0 && ctx.recentTypes.has(c.type) ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score);
}

/** The single best candidate for a user, or null when nothing qualifies. */
export function pickBestCandidate(ctx: NotificationContext): Candidate | null {
  return buildCandidates(ctx)[0] ?? null;
}
