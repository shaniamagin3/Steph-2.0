/**
 * Weekly meal plan generation.
 *
 * Two modes, because people eat in two different ways:
 *
 *   'repeating' (default) - ONE menu, eaten every day of the week. This is how
 *       a lot of people who actually stay on plan eat: decide once, shop once,
 *       cook in batches, and remove the daily decision entirely. It also makes
 *       the plan far more accurate, because the same menu weighed the same way
 *       every day has none of the drift that comes from seven different days.
 *
 *   'varied' - a different menu each day, for anyone who would rather have the
 *       variety and is willing to do the extra cooking.
 *
 * In repeating mode the stakes per choice are much higher: a meal you are
 * lukewarm about gets eaten seven times, not once. So that mode searches far
 * harder, rewards meals that batch-cook and reheat well, and actively penalises
 * a menu that leans on the same ingredient in three different slots.
 *
 * The approach either way: propose candidate day compositions, scale portions to
 * fit the calorie budget, score against the targets, keep the best. A small
 * stochastic search rather than an exact solver, because the constraint that
 * matters most - "would you actually eat this?" - is not something an exact
 * solver can optimise for anyway.
 *
 * Generation is seeded, so the same seed always reproduces the same plan and
 * "give me a different menu" is just a new seed.
 */

import { SLOT_META } from '../data/meals.js';
import { getIngredient, proteinFamily, REPETITION_EXEMPT } from '../data/ingredients.js';
import { allMeals, getMeal } from './registry.js';
import { mealSatisfiesAll, mealContainsAny, RESTRICTIONS } from './diet.js';
import { mealMacrosRaw, lineMacros, dayTotals, scoreDay } from './nutrition.js';
import { addDays, weekStart } from './cycle.js';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Serving multipliers we will actually ask someone to measure out. */
const SERVING_STEPS_MAIN = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SERVING_STEPS_SMALL = [0.5, 0.75, 1, 1.25, 1.5];

/** Deterministic PRNG (mulberry32) so a seed reproduces a plan exactly. */
export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
const nearestStep = (v, steps) => steps.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), steps[0]);

/**
 * @typedef {object} Preferences
 * @property {string[]} favourites      meal ids to serve more often
 * @property {string[]} excluded        meal ids never to serve
 * @property {string[]} requireTags     every meal must carry all of these (e.g. ['vegetarian'])
 * @property {string[]} avoidTags       meals carrying any of these are dropped
 * @property {number}   snacksPerDay    1 or 2
 * @property {boolean}  dessertDaily    include a dessert every day
 * @property {number}   maxPrepMin      cap on prep time for weekday dinners, 0 = no cap
 * @property {Record<string,string[]>} pinned  { 'Monday': ['din-garlic-chicken-veg'] } from the weekly check-in
 * @property {'repeating'|'varied'} planMode  one menu all week, or a new one daily
 */

export const PLAN_MODES = {
  repeating: {
    key: 'repeating',
    label: 'Same meals every day',
    hint: 'One menu, repeated Monday to Sunday. Shop once, cook in batches, stop deciding.',
  },
  varied: {
    key: 'varied',
    label: 'Different meals each day',
    hint: 'A new menu every day. More variety, more cooking, more shopping.',
  },
};

export const DEFAULT_PREFERENCES = {
  planMode: 'repeating',
  favourites: [],
  excluded: [],
  /** Hard dietary rules, checked against ingredients. Never relaxed. */
  restrictions: [],
  /** Whether very-low-lactose hard cheeses are acceptable. Tolerance varies. */
  allowLowLactose: false,
  /** Ingredient ids to keep out of every meal, e.g. because you dislike them. */
  excludedIngredients: [],
  /** Protein families to favour, e.g. ['chicken','lamb','beef','pork']. A nudge, not a filter. */
  preferredProteins: [],
  /** Soft preferences: nice to have, relaxed if they leave nothing to plan. */
  requireTags: [],
  avoidTags: [],
  snacksPerDay: 2,
  dessertDaily: true,
  maxPrepMin: 0,
  pinned: {},
  /** One unplanned meal a week. { enabled, day, slot } */
  freeMeal: { enabled: false, day: 'Saturday', slot: 'dinner' },
};

/**
 * Tags that logically entail other tags.
 *
 * Without this, filtering for "vegetarian" would exclude every vegan meal in
 * the library, which is both wrong and the opposite of what anyone means by it.
 * Kept deliberately small: only implications that are true by definition go
 * here. Gluten-free, for instance, is NOT inferred from anything, because
 * guessing wrong about an allergen is not a risk worth taking for convenience.
 */
export const TAG_IMPLICATIONS = {
  vegan: ['vegetarian', 'dairy-free'],
};

/** Does this meal satisfy `tag`, directly or by implication? */
export function mealHasTag(meal, tag) {
  const tags = meal.tags ?? [];
  if (tags.includes(tag)) return true;
  return tags.some((t) => TAG_IMPLICATIONS[t]?.includes(tag));
}

/**
 * Meals allowed by the HARD rules: dietary restrictions, excluded ingredients,
 * and meals you have struck off by name.
 *
 * These are never relaxed, by anything, for any reason. If someone is
 * intolerant, an empty plan is a correct answer and a plate of gluten is not.
 */
export function allowedPool(slot, prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const opts = { allowLowLactose: p.allowLowLactose };

  return allMeals().filter((m) =>
    m.slot === slot
    && !p.excluded.includes(m.id)
    && mealSatisfiesAll(m, p.restrictions ?? [], opts)
    && !mealContainsAny(m, p.excludedIngredients ?? []));
}

/**
 * Meals that satisfy the hard rules AND the soft tag preferences.
 * May legitimately be empty - see `candidatePool`.
 */
export function strictPool(slot, prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  return allowedPool(slot, p).filter((m) =>
    p.requireTags.every((t) => mealHasTag(m, t))
    && !p.avoidTags.some((t) => mealHasTag(m, t)));
}

/**
 * Candidate meals for a slot.
 *
 * Soft tag preferences are relaxed if they leave nothing to plan with, and
 * `poolWarnings` reports it so the relaxation is visible. Hard rules are never
 * relaxed: if `allowedPool` is empty the result is empty, and the caller has to
 * deal with that rather than being handed something unsafe.
 */
export function candidatePool(slot, prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const strict = strictPool(slot, p);
  if (strict.length) return strict;
  return allowedPool(slot, p);
}

/** Diagnose preference settings that leave too little to work with. */
export function poolWarnings(prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const warnings = [];

  for (const slot of ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']) {
    const allowed = allowedPool(slot, p);
    const strict = strictPool(slot, p);

    if (!allowed.length) {
      const names = (p.restrictions ?? []).map((r) => RESTRICTIONS[r]?.label ?? r).join(' + ');
      warnings.push(`There is no ${slot} in your library that is ${names || 'allowed by your rules'}. Your dietary rules are never relaxed, so this slot cannot be filled - add a ${slot} of your own on the Meals tab.`);
    } else if (allowed.length < 3) {
      warnings.push(`Only ${allowed.length} ${slot} option${allowed.length === 1 ? '' : 's'} fit your dietary rules, so plans will repeat. Worth adding a couple of your own on the Meals tab.`);
    } else if (!strict.length) {
      warnings.push(`No ${slot} matches your preference tags, so those tags were ignored for ${slot}. Your dietary rules were still applied.`);
    } else if (strict.length < 3) {
      warnings.push(`Only ${strict.length} ${slot} option${strict.length === 1 ? '' : 's'} pass your preference tags, so you will see a lot of repetition.`);
    }
  }
  return warnings;
}

/** Split a day's calorie target across the slots in use. */
export function slotBudgets(kcalTarget, prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const slots = ['breakfast', 'lunch', 'dinner'];
  for (let i = 0; i < p.snacksPerDay; i++) slots.push('snack');
  if (p.dessertDaily) slots.push('dessert');

  const shares = slots.map((s) => SLOT_META[s].defaultShare);
  const total = shares.reduce((a, b) => a + b, 0);
  return slots.map((slot, i) => ({ slot, kcal: (kcalTarget * shares[i]) / total }));
}

/**
 * Scale a proposed day's servings so total calories land on target.
 * Runs a coarse per-slot fit, then a correction pass for the residual.
 */
function fitServings(entries, targets) {
  const fitted = entries.map((e) => {
    const base = mealMacrosRaw(e.mealId, 1);
    const steps = e.slot === 'snack' || e.slot === 'dessert' ? SERVING_STEPS_SMALL : SERVING_STEPS_MAIN;
    const ideal = base.kcal > 0 ? e.budgetKcal / base.kcal : 1;
    return { ...e, servings: nearestStep(ideal, steps), steps, baseKcal: base.kcal, baseProtein: base.protein };
  });

  // Correction: nudge servings one step at a time toward the calorie target,
  // preferring to add calories to high-protein meals and remove them from low.
  for (let iter = 0; iter < 24; iter++) {
    const total = fitted.reduce((a, e) => a + e.baseKcal * e.servings, 0);
    const gap = targets.kcal - total;
    if (Math.abs(gap) < targets.kcal * 0.03) break;

    const wantMore = gap > 0;
    const proteinNow = fitted.reduce((a, e) => a + e.baseProtein * e.servings, 0);
    const proteinShort = proteinNow < targets.protein;

    const movable = fitted
      .map((e, i) => {
        const idx = e.steps.indexOf(e.servings);
        const nextIdx = wantMore ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= e.steps.length) return null;
        const deltaKcal = e.baseKcal * (e.steps[nextIdx] - e.servings);
        if (Math.abs(deltaKcal) > Math.abs(gap) * 1.9) return null; // too big a jump
        const density = e.baseProtein / Math.max(1, e.baseKcal);
        // When protein is short, grow protein-dense meals and shrink protein-poor ones.
        const preference = proteinShort ? (wantMore ? density : -density) : 0;
        return { i, nextIdx, deltaKcal, preference };
      })
      .filter(Boolean);

    if (!movable.length) break;
    movable.sort((a, b) => b.preference - a.preference || Math.abs(gap - a.deltaKcal) - Math.abs(gap - b.deltaKcal));
    const chosen = movable[0];
    fitted[chosen.i] = { ...fitted[chosen.i], servings: fitted[chosen.i].steps[chosen.nextIdx] };
  }

  return fitted.map(({ steps, baseKcal, baseProtein, budgetKcal, ...keep }) => keep);
}

/**
 * How much does this menu lean on the same few ingredients?
 *
 * Only matters for a repeating menu. Three meals a day built on Greek yoghurt
 * is fine for one day and unbearable by Thursday, and it is the single most
 * common way a "same thing every day" plan gets abandoned. Flavourings are
 * ignored - garlic in everything is not the problem.
 */
function ingredientRepetition(entries) {
  const counts = new Map();
  const familyCounts = new Map();

  for (const e of entries) {
    const meal = getMeal(e.mealId);
    if (!meal?.items?.length) continue;

    const anchors = anchorProteins(meal);
    const seen = new Set();
    const familiesThisMeal = new Set();

    for (const [id] of meal.items) {
      if (seen.has(id)) continue;
      let ing;
      try { ing = getIngredient(id); } catch { continue; }
      if (ing.negligible || REPETITION_EXEMPT.has(id)) continue;
      seen.add(id);
      counts.set(id, (counts.get(id) ?? 0) + 1);

      // Count the protein FAMILY, not the exact cut: chicken breast at lunch
      // and chicken thigh at dinner is still chicken fourteen times a week.
      if (anchors.has(id)) {
        const fam = proteinFamily(id) ?? id;
        familiesThisMeal.add(fam);
      }
    }
    for (const fam of familiesThisMeal) familyCounts.set(fam, (familyCounts.get(fam) ?? 0) + 1);
  }

  let penalty = 0;
  for (const n of counts.values()) {
    if (n >= 3) penalty += (n - 2) * 1.2;  // in three or more slots of the same day
  }
  for (const n of familyCounts.values()) {
    if (n >= 2) penalty += (n - 1) * 2.5;
  }
  return penalty;
}

/** The protein families a menu leans on, and how many slots each covers. */
export function proteinFamilyCounts(entries) {
  const out = new Map();
  for (const e of entries) {
    const meal = getMeal(e.mealId);
    if (!meal?.items?.length) continue;
    const fams = new Set();
    for (const id of anchorProteins(meal)) {
      if (REPETITION_EXEMPT.has(id)) continue;
      const fam = proteinFamily(id);
      if (fam) fams.add(fam);
    }
    for (const f of fams) out.set(f, (out.get(f) ?? 0) + 1);
  }
  return out;
}

/** Ingredients supplying at least a quarter of a meal's protein. */
export function anchorProteins(meal) {
  const anchors = new Set();
  if (!meal?.items?.length) return anchors;

  const lines = meal.items.map(([id, qty]) => {
    try { return { id, protein: lineMacros(id, qty).protein }; } catch { return { id, protein: 0 }; }
  });
  const total = lines.reduce((a, l) => a + l.protein, 0);
  if (total <= 0) return anchors;

  for (const l of lines) if (l.protein / total >= 0.25) anchors.add(l.id);
  return anchors;
}

/**
 * Ingredients this menu serves every single day, and how much of them the week
 * adds up to. Only meaningful for a repeating menu, where a portion that looks
 * unremarkable on one plate becomes seven of them.
 */
export function weeklyIngredientLoad(plan, { tag } = {}) {
  if (planMode(plan) !== 'repeating') return [];
  const entries = plan.menu?.entries ?? plan.days[0]?.entries ?? [];

  const totals = new Map();
  for (const e of entries) {
    const meal = getMeal(e.mealId);
    if (!meal?.items?.length) continue;
    for (const [id, qty] of meal.items) {
      let ing;
      try { ing = getIngredient(id); } catch { continue; }
      if (ing.negligible) continue;
      if (tag && !(ing.tags ?? []).includes(tag)) continue;
      const prev = totals.get(id) ?? { id, name: ing.name, unit: ing.unit, per: ing.per, slots: 0, perDay: 0 };
      prev.slots += 1;
      prev.perDay += qty * e.servings;
      totals.set(id, prev);
    }
  }

  return [...totals.values()].map((t) => ({
    ...t,
    perDay: Math.round(t.perDay * 10) / 10,
    perWeek: Math.round(t.perDay * 7 * 10) / 10,
  })).sort((a, b) => b.perWeek - a.perWeek);
}

/** Meals that survive being cooked ahead and reheated all week. */
const BATCH_TAGS = ['batch-cook', 'meal-prep', 'make-ahead', 'no-cook', 'quick', 'freezer'];

function batchFriendliness(entries) {
  let score = 0;
  for (const e of entries) {
    const tags = getMeal(e.mealId)?.tags ?? [];
    if (tags.some((t) => BATCH_TAGS.includes(t))) score += 1;
  }
  return score / Math.max(1, entries.length);
}

/**
 * Score a candidate day. Lower is better.
 * Calories and protein dominate; fibre, variety and favourites are tie-breakers.
 */
function scoreCandidate(entries, targets, recentIds, favourites, { repeating = false, preferredProteins = [] } = {}) {
  const totals = dayTotals({ entries });

  const kcalErr = Math.abs(totals.kcal - targets.kcal) / Math.max(1, targets.kcal);
  const proteinShort = Math.max(0, targets.protein - totals.protein) / Math.max(1, targets.protein);
  const proteinOver = Math.max(0, totals.protein - targets.protein * 1.35) / Math.max(1, targets.protein);
  const fibreShort = Math.max(0, targets.fibre - totals.fibre) / Math.max(1, targets.fibre);
  const fatShort = Math.max(0, targets.fat * 0.7 - totals.fat) / Math.max(1, targets.fat);

  const repeats = entries.filter((e) => recentIds.includes(e.mealId)).length;
  const favs = entries.filter((e) => favourites.includes(e.mealId)).length;

  let score = (
    kcalErr * 10 +
    proteinShort * 14 +
    proteinOver * 3 +
    fibreShort * 2.5 +
    fatShort * 2 +
    repeats * 0.9 -
    favs * 0.7
  );

  if (repeating) {
    // You will eat this menu seven times. Ingredient monotony and awkward
    // cooking matter far more here than they do for a one-off day.
    score += ingredientRepetition(entries);
    score -= batchFriendliness(entries) * 1.5;
  }

  if (preferredProteins.length) {
    // A soft steer toward the proteins you actually like, not a hard filter -
    // a hard filter here would make the library far smaller than it needs to be.
    const fams = proteinFamilyCounts(entries);
    let matched = 0;
    let unmatched = 0;
    for (const [fam, n] of fams) {
      if (preferredProteins.includes(fam)) matched += n; else unmatched += n;
    }
    score -= matched * 1.1;
    score += unmatched * 0.8;
  }

  return score;
}

/**
 * Generate one day.
 * @param {object} p
 * @param {object} p.targets  {kcal, protein, fat, carbs, fibre}
 * @param {Preferences} p.prefs
 * @param {string[]} p.recentIds meal ids used in the last couple of days
 * @param {string[]} p.pinnedIds meal ids that must appear (from a weekly request)
 * @param {function} p.rand
 * @param {number} [p.attempts=140]
 */
export function generateDay({ targets, prefs, recentIds = [], pinnedIds = [], rand, attempts = 140, repeating = false }) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const budgets = slotBudgets(targets.kcal, p);
  const pools = Object.fromEntries(['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].map((s) => [s, candidatePool(s, p)]));

  const pinnedBySlot = {};
  for (const id of pinnedIds) {
    const meal = getMeal(id);
    if (meal) (pinnedBySlot[meal.slot] ||= []).push(id);
  }

  let best = null;
  let bestScore = Infinity;

  // A slot with no compliant option is left out rather than filled with
  // something that breaks a dietary rule. The warning explains why.
  const fillable = budgets.filter(({ slot }) => pools[slot].length > 0 || pinnedBySlot[slot]?.length);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const usedThisDay = new Set();
    const proposal = fillable.map(({ slot, kcal }) => {
      const pinned = pinnedBySlot[slot]?.filter((id) => !usedThisDay.has(id));
      let mealId;
      if (pinned?.length) {
        mealId = pinned[0];
      } else {
        let pool = pools[slot].filter((m) => !usedThisDay.has(m.id));
        if (!pool.length) pool = pools[slot];
        // Weight favourites in without letting them crowd everything else out.
        const favInPool = pool.filter((m) => p.favourites.includes(m.id));
        const useFav = favInPool.length && rand() < 0.45;
        mealId = pick(useFav ? favInPool : pool, rand).id;
      }
      usedThisDay.add(mealId);
      return { slot, mealId, budgetKcal: kcal, servings: 1 };
    });

    const fitted = fitServings(proposal, targets);
    const score = scoreCandidate(fitted, targets, recentIds, p.favourites, { repeating, preferredProteins: p.preferredProteins ?? [] });
    if (score < bestScore) { bestScore = score; best = fitted; }
  }

  best ??= [];
  const totals = dayTotals({ entries: best });
  return { entries: best, totals, score: scoreDay(totals, targets) };
}

/**
 * Generate a full week.
 *
 * @param {object} p
 * @param {object} p.targets
 * @param {Preferences} p.prefs
 * @param {string} [p.startDate] ISO; snapped to the Monday of that week
 * @param {number} [p.seed]
 * @returns {{seed:number, startDate:string, days:object[], warnings:string[]}}
 */
export function generateWeek({ targets, prefs = {}, startDate, seed = randomSeed(), phase = 'maintenance', mode }) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const planMode = mode ?? p.planMode ?? 'repeating';
  const rand = rng(seed);
  const start = weekStart(startDate ?? new Date().toISOString().slice(0, 10));

  const base = {
    seed,
    startDate: start,
    phase,
    targets,
    mode: planMode,
    generatedAt: new Date().toISOString(),
    warnings: poolWarnings(p),
  };

  if (planMode === 'repeating') {
    // One menu for the whole week. Because it is a single search rather than
    // seven, we can afford to look far harder for a good one - and we should,
    // since every choice gets eaten seven times.
    const pinnedIds = [...new Set(Object.values(p.pinned ?? {}).flat())];

    const menu = generateDay({
      targets,
      prefs: p,
      recentIds: [],
      pinnedIds,
      rand,
      attempts: 900,
      repeating: true,
    });

    const days = Array.from({ length: 7 }, (_, i) => ({
      date: addDays(start, i),
      dayName: DAY_NAMES[i],
      entries: menu.entries.map((e) => ({ ...e })),
      totals: menu.totals,
      score: menu.score,
    }));

    return applyFreeMeal({ ...base, menu: { entries: menu.entries, totals: menu.totals, score: menu.score }, days }, p);
  }

  const days = [];
  const recent = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const dayName = DAY_NAMES[i];
    const pinnedIds = p.pinned?.[dayName] ?? [];

    const day = generateDay({
      targets,
      prefs: p,
      recentIds: recent.slice(-12),
      pinnedIds,
      rand,
    });

    days.push({ date, dayName, ...day });
    recent.push(...day.entries.map((e) => e.mealId));
  }

  return applyFreeMeal({ ...base, days }, p);
}

/**
 * Swap one slot on one day for an unplanned meal of your choosing.
 *
 * The app does not estimate its calories, because it cannot know them and a
 * made-up number is worse than an honest blank. What it can do is the
 * arithmetic on whether it matters: see `freeMealImpact`.
 */
function applyFreeMeal(plan, prefs) {
  const fm = prefs.freeMeal;
  if (!fm?.enabled) return plan;

  const dayIndex = DAY_NAMES.indexOf(fm.day);
  if (dayIndex < 0) return plan;

  const day = plan.days[dayIndex];
  if (!day) return plan;

  const slotIndex = day.entries.findIndex((e) => e.slot === fm.slot);
  if (slotIndex < 0) return plan;

  const replaced = day.entries[slotIndex];
  const entries = day.entries.map((e, i) => (i === slotIndex
    ? { slot: e.slot, mealId: null, servings: 0, freeMeal: true, replacedMealId: replaced.mealId }
    : { ...e }));

  plan.days[dayIndex] = {
    ...day,
    entries,
    totals: dayTotals({ entries }),
    score: scoreDay(dayTotals({ entries }), plan.targets),
    hasFreeMeal: true,
  };
  plan.freeMeal = { day: fm.day, slot: fm.slot, dayIndex, slotIndex };
  return plan;
}

/**
 * How much does one free meal a week actually cost you?
 *
 * Worth computing rather than hand-waving. The planned slot it replaces already
 * had calories in it, so the cost is only the difference - and spread across a
 * week it is usually small enough that worrying about it does more damage than
 * the meal does.
 */
export function freeMealImpact(plan, assumedKcal = 900) {
  if (!plan?.freeMeal) return null;

  const day = plan.days[plan.freeMeal.dayIndex];
  const entry = day.entries[plan.freeMeal.slotIndex];
  const replacedKcal = entry?.replacedMealId
    ? mealMacrosRaw(entry.replacedMealId, plan.menu?.entries?.[plan.freeMeal.slotIndex]?.servings ?? 1).kcal
    : plan.targets.kcal * 0.3;

  const weeklyTarget = plan.targets.kcal * 7;
  const extra = Math.max(0, assumedKcal - replacedKcal);

  return {
    assumedKcal,
    replacedKcal: Math.round(replacedKcal),
    extraKcal: Math.round(extra),
    weeklyTarget: Math.round(weeklyTarget),
    pctOfWeek: Math.round((extra / weeklyTarget) * 1000) / 10,
    /** Roughly what that extra is worth in bodyweight, using the 7700 kcal/kg planning figure. */
    kgEquivalent: Math.round((extra / 7700) * 1000) / 1000,
  };
}

/** A plan with no `mode` predates the setting and was a varied week. */
export function planMode(plan) {
  return plan?.mode ?? 'varied';
}

/**
 * Swap one meal in a generated plan for another, re-fitting that day's portions
 * so the calorie target still holds.
 */
export function swapMeal(plan, dayIndex, slotIndex, newMealId) {
  const next = structuredClone(plan);
  const day = next.days[dayIndex];
  const entry = day?.entries[slotIndex];
  if (!entry) throw new RangeError('swapMeal: no entry at that position');

  entry.mealId = newMealId;

  const budgets = slotBudgets(next.targets.kcal, {
    snacksPerDay: day.entries.filter((e) => e.slot === 'snack').length,
    dessertDaily: day.entries.some((e) => e.slot === 'dessert'),
  });
  const withBudgets = day.entries.map((e, i) => ({ ...e, budgetKcal: budgets[i]?.kcal ?? next.targets.kcal / day.entries.length }));

  day.entries = fitServings(withBudgets, next.targets);
  day.totals = dayTotals({ entries: day.entries });
  day.score = scoreDay(day.totals, next.targets);

  // With one repeating menu there is only ever one thing to change, so a swap
  // applies to the whole week rather than to a single day.
  if (planMode(next) === 'repeating') {
    next.menu = { entries: day.entries.map((e) => ({ ...e })), totals: day.totals, score: day.score };
    next.days = next.days.map((d) => ({
      ...d,
      entries: day.entries.map((e) => ({ ...e })),
      totals: day.totals,
      score: day.score,
    }));
  }

  return next;
}

/** Regenerate a single day, leaving the rest of the week alone. */
export function regenerateDay(plan, dayIndex, prefs, seed = randomSeed()) {
  // A repeating plan has one menu, so "reroll this day" means reroll the menu.
  if (planMode(plan) === 'repeating') {
    return generateWeek({
      targets: plan.targets,
      prefs,
      startDate: plan.startDate,
      seed,
      phase: plan.phase,
      mode: 'repeating',
    });
  }

  const next = structuredClone(plan);
  const rand = rng(seed);
  const recent = next.days.flatMap((d, i) => (i === dayIndex ? [] : d.entries.map((e) => e.mealId)));
  const dayName = next.days[dayIndex].dayName;

  const day = generateDay({
    targets: next.targets,
    prefs: { ...DEFAULT_PREFERENCES, ...prefs },
    recentIds: recent,
    pinnedIds: prefs?.pinned?.[dayName] ?? [],
    rand,
  });

  next.days[dayIndex] = { ...next.days[dayIndex], ...day };
  return next;
}

/** A quick read on how well the whole week fits. */
export function planQuality(plan) {
  const repeating = planMode(plan) === 'repeating';
  const onTarget = plan.days.filter((d) => d.score.onTarget).length;
  const avgKcal = Math.round(plan.days.reduce((a, d) => a + d.totals.kcal, 0) / plan.days.length);
  const avgProtein = Math.round(plan.days.reduce((a, d) => a + d.totals.protein, 0) / plan.days.length);
  const avgFibre = Math.round(plan.days.reduce((a, d) => a + d.totals.fibre, 0) / plan.days.length);
  const distinct = new Set(plan.days.flatMap((d) => d.entries.map((e) => e.mealId))).size;

  return {
    repeating,
    daysOnTarget: onTarget,
    avgKcal,
    avgProtein,
    avgFibre,
    distinctMeals: distinct,
    kcalDrift: avgKcal - plan.targets.kcal,
    proteinDrift: avgProtein - plan.targets.protein,
    /** In repeating mode, how many portions of each meal the week needs. */
    portionsPerMeal: repeating ? 7 : null,
  };
}

/**
 * For a repeating plan: what to cook, and how much of it, to cover the week.
 * This is the batch-cooking list - the thing that makes eating the same menu
 * every day actually workable.
 */
export function batchPlan(plan) {
  if (planMode(plan) !== 'repeating') return null;
  const entries = plan.menu?.entries ?? plan.days[0]?.entries ?? [];

  return entries.map((e) => {
    const meal = getMeal(e.mealId);
    return {
      slot: e.slot,
      mealId: e.mealId,
      name: meal?.name ?? e.mealId,
      servingsPerDay: e.servings,
      servingsPerWeek: Math.round(e.servings * 7 * 100) / 100,
      prepMin: meal?.prepMin ?? null,
      batchFriendly: (meal?.tags ?? []).some((t) => BATCH_TAGS.includes(t)),
      cookAhead: (meal?.tags ?? []).some((t) => ['batch-cook', 'meal-prep', 'make-ahead', 'freezer'].includes(t)),
    };
  });
}
