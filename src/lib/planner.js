/**
 * Weekly meal plan generation.
 *
 * The problem: fill 7 days x 5 eating occasions so each day lands on a calorie
 * target while clearing a protein target, respecting what you will actually eat,
 * and without serving you the same three dinners forever.
 *
 * The approach: for each day, propose a number of candidate compositions, scale
 * portions to fit the calorie budget, score each against the targets, and keep
 * the best. This is a small stochastic search rather than an exact solver,
 * because the constraint that matters most - "would you actually eat this?" -
 * is not something an exact solver can optimise for anyway.
 *
 * Generation is seeded, so the same seed always reproduces the same plan and
 * "give me a different week" is just a new seed.
 */

import { SLOT_META } from '../data/meals.js';
import { allMeals, getMeal } from './registry.js';
import { mealMacrosRaw, dayTotals, scoreDay } from './nutrition.js';
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
 */

export const DEFAULT_PREFERENCES = {
  favourites: [],
  excluded: [],
  requireTags: [],
  avoidTags: [],
  snacksPerDay: 2,
  dessertDaily: true,
  maxPrepMin: 0,
  pinned: {},
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
 * Meals for a slot that satisfy every preference, with nothing relaxed.
 * May legitimately be empty - see `candidatePool`.
 */
export function strictPool(slot, prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  return allMeals().filter((m) =>
    m.slot === slot
    && !p.excluded.includes(m.id)
    && p.requireTags.every((t) => mealHasTag(m, t))
    && !p.avoidTags.some((t) => mealHasTag(m, t)));
}

/**
 * Candidate meals for a slot.
 *
 * If the filters leave nothing at all, tag rules are relaxed rather than
 * returning an empty day - but `poolWarnings` reports that this happened, so
 * the relaxation is visible rather than silent.
 */
export function candidatePool(slot, prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const strict = strictPool(slot, p);
  if (strict.length) return strict;

  const withoutTags = allMeals().filter((m) => m.slot === slot && !p.excluded.includes(m.id));
  if (withoutTags.length) return withoutTags;

  return allMeals().filter((m) => m.slot === slot);
}

/** Diagnose preference settings that leave too little to work with. */
export function poolWarnings(prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const warnings = [];

  for (const slot of ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']) {
    const strict = strictPool(slot, p);

    if (!strict.length) {
      warnings.push(`No ${slot} option matches your filters at all, so they were ignored for ${slot} and the full library was used instead. Drop a required tag, or add your own ${slot} on the Meals tab.`);
    } else if (strict.length < 3) {
      warnings.push(`Only ${strict.length} ${slot} option${strict.length === 1 ? '' : 's'} pass your filters, so you will see a lot of repetition. Loosen a tag or un-exclude something.`);
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
 * Score a candidate day. Lower is better.
 * Calories and protein dominate; fibre, variety and favourites are tie-breakers.
 */
function scoreCandidate(entries, targets, recentIds, favourites) {
  const totals = dayTotals({ entries });

  const kcalErr = Math.abs(totals.kcal - targets.kcal) / Math.max(1, targets.kcal);
  const proteinShort = Math.max(0, targets.protein - totals.protein) / Math.max(1, targets.protein);
  const proteinOver = Math.max(0, totals.protein - targets.protein * 1.35) / Math.max(1, targets.protein);
  const fibreShort = Math.max(0, targets.fibre - totals.fibre) / Math.max(1, targets.fibre);
  const fatShort = Math.max(0, targets.fat * 0.7 - totals.fat) / Math.max(1, targets.fat);

  const repeats = entries.filter((e) => recentIds.includes(e.mealId)).length;
  const favs = entries.filter((e) => favourites.includes(e.mealId)).length;

  return (
    kcalErr * 10 +
    proteinShort * 14 +
    proteinOver * 3 +
    fibreShort * 2.5 +
    fatShort * 2 +
    repeats * 0.9 -
    favs * 0.7
  );
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
export function generateDay({ targets, prefs, recentIds = [], pinnedIds = [], rand, attempts = 140 }) {
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

  for (let attempt = 0; attempt < attempts; attempt++) {
    const usedThisDay = new Set();
    const proposal = budgets.map(({ slot, kcal }) => {
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
    const score = scoreCandidate(fitted, targets, recentIds, p.favourites);
    if (score < bestScore) { bestScore = score; best = fitted; }
  }

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
export function generateWeek({ targets, prefs = {}, startDate, seed = randomSeed(), phase = 'maintenance' }) {
  const p = { ...DEFAULT_PREFERENCES, ...prefs };
  const rand = rng(seed);
  const start = weekStart(startDate ?? new Date().toISOString().slice(0, 10));

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

  return {
    seed,
    startDate: start,
    phase,
    targets,
    generatedAt: new Date().toISOString(),
    days,
    warnings: poolWarnings(p),
  };
}

/**
 * Swap one meal in a generated plan for another, re-fitting that day's portions
 * so the calorie target still holds.
 */
export function swapMeal(plan, dayIndex, slotIndex, newMealId) {
  const next = structuredClone(plan);
  const day = next.days[dayIndex];
  const entry = day.entries[slotIndex];
  if (!entry) throw new RangeError('swapMeal: no entry at that position');

  entry.mealId = newMealId;

  const budgets = slotBudgets(next.targets.kcal, { snacksPerDay: day.entries.filter((e) => e.slot === 'snack').length, dessertDaily: day.entries.some((e) => e.slot === 'dessert') });
  const withBudgets = day.entries.map((e, i) => ({ ...e, budgetKcal: budgets[i]?.kcal ?? next.targets.kcal / day.entries.length }));

  day.entries = fitServings(withBudgets, next.targets);
  day.totals = dayTotals({ entries: day.entries });
  day.score = scoreDay(day.totals, next.targets);
  return next;
}

/** Regenerate a single day, leaving the rest of the week alone. */
export function regenerateDay(plan, dayIndex, prefs, seed = randomSeed()) {
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
  const onTarget = plan.days.filter((d) => d.score.onTarget).length;
  const avgKcal = Math.round(plan.days.reduce((a, d) => a + d.totals.kcal, 0) / plan.days.length);
  const avgProtein = Math.round(plan.days.reduce((a, d) => a + d.totals.protein, 0) / plan.days.length);
  const avgFibre = Math.round(plan.days.reduce((a, d) => a + d.totals.fibre, 0) / plan.days.length);
  const distinct = new Set(plan.days.flatMap((d) => d.entries.map((e) => e.mealId))).size;

  return {
    daysOnTarget: onTarget,
    avgKcal,
    avgProtein,
    avgFibre,
    distinctMeals: distinct,
    kcalDrift: avgKcal - plan.targets.kcal,
    proteinDrift: avgProtein - plan.targets.protein,
  };
}
