/**
 * Computing nutrition from meal definitions.
 *
 * Meals store ingredients and quantities; everything numeric is derived here.
 * That means a scaled portion is always arithmetically correct and can never
 * drift from the shopping list.
 */

import { getIngredient } from '../data/ingredients.js';
import { getMeal } from './registry.js';

const r1 = (n) => Math.round(n * 10) / 10;
const r0 = (n) => Math.round(n);

const EMPTY = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

/**
 * Nutrition contributed by one ingredient line.
 * @param {string} id ingredient id
 * @param {number} qty grams/ml, or a count of units for `per: 'unit'` items
 */
export function lineMacros(id, qty) {
  const ing = getIngredient(id);
  const factor = ing.per === 'unit' ? qty : qty / ing.per;
  return {
    kcal: ing.kcal * factor,
    protein: ing.protein * factor,
    carbs: ing.carbs * factor,
    fat: ing.fat * factor,
    fibre: ing.fibre * factor,
  };
}

const addInto = (acc, m) => {
  acc.kcal += m.kcal; acc.protein += m.protein; acc.carbs += m.carbs;
  acc.fat += m.fat; acc.fibre += m.fibre;
  return acc;
};

export function roundMacros(m) {
  return { kcal: r0(m.kcal), protein: r1(m.protein), carbs: r1(m.carbs), fat: r1(m.fat), fibre: r1(m.fibre) };
}

/**
 * Macros for a meal at a given serving multiplier.
 * @param {object|string} meal meal object or id
 * @param {number} [servings=1]
 */
export function mealMacros(meal, servings = 1) {
  return roundMacros(mealMacrosRaw(meal, servings));
}

/** Unrounded version, for use inside the optimiser where rounding error accumulates. */
export function mealMacrosRaw(meal, servings = 1) {
  const m = typeof meal === 'string' ? getMeal(meal) : meal;
  if (!m) throw new RangeError(`mealMacros: unknown meal "${meal}"`);

  // A custom meal entered as straight macros scales linearly and has no
  // ingredient breakdown to compute from.
  if (!m.items?.length && m.macros) {
    const s = servings;
    return {
      kcal: (m.macros.kcal || 0) * s,
      protein: (m.macros.protein || 0) * s,
      carbs: (m.macros.carbs || 0) * s,
      fat: (m.macros.fat || 0) * s,
      fibre: (m.macros.fibre || 0) * s,
    };
  }

  const acc = { ...EMPTY };
  for (const [id, qty] of m.items) addInto(acc, lineMacros(id, qty * servings));
  return acc;
}

/**
 * The ingredient lines of a meal at a given serving multiplier, with display
 * quantities and the macro contribution of each line.
 */
export function mealIngredients(meal, servings = 1) {
  const m = typeof meal === 'string' ? getMeal(meal) : meal;
  if (!m?.items?.length) return [];
  return m.items.map(([id, qty]) => {
    const ing = getIngredient(id);
    const scaled = qty * servings;
    return {
      id,
      name: ing.name,
      aisle: ing.aisle,
      qty: ing.per === 'unit' ? r1(scaled) : r0(scaled),
      unit: ing.per === 'unit' ? ing.unit : ing.unit,
      display: formatQty(ing, scaled),
      negligible: !!ing.negligible,
      macros: roundMacros(lineMacros(id, scaled)),
    };
  });
}

export function formatQty(ing, qty) {
  if (ing.per === 'unit') {
    const n = r1(qty);
    const noun = ing.unit;
    if (n === 1) return `1 ${noun}`;
    // "0.5 egg" reads badly; "1/2 egg" reads fine.
    const fractions = { 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' };
    const whole = Math.floor(n);
    const frac = r1(n - whole);
    if (fractions[frac]) return `${whole ? `${whole} ` : ''}${fractions[frac]} ${noun}${whole > 1 ? 's' : ''}`.trim();
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
  }
  return `${r0(qty)}${ing.unit}`;
}

/** Sum an array of {macros} entries. */
export function sumMacros(entries) {
  const acc = { ...EMPTY };
  for (const e of entries) addInto(acc, e.macros ?? e);
  return roundMacros(acc);
}

/**
 * Totals for one planned day.
 * @param {{entries:{mealId:string,servings:number}[]}} day
 */
export function dayTotals(day) {
  const acc = { ...EMPTY };
  // A free meal contributes nothing the app can know. Pretending to estimate it
  // would be inventing a number, so it is simply left out of the totals.
  for (const e of day.entries) {
    if (e.freeMeal || !e.mealId) continue;
    addInto(acc, mealMacrosRaw(e.mealId, e.servings));
  }
  return roundMacros(acc);
}

/** Totals across a whole week's plan. */
export function weekTotals(plan) {
  const acc = { ...EMPTY };
  for (const day of plan.days) {
    for (const e of day.entries) {
      if (e.freeMeal || !e.mealId) continue;
      addInto(acc, mealMacrosRaw(e.mealId, e.servings));
    }
  }
  const total = roundMacros(acc);
  const n = plan.days.length || 1;
  return {
    total,
    dailyAverage: roundMacros({
      kcal: acc.kcal / n, protein: acc.protein / n, carbs: acc.carbs / n,
      fat: acc.fat / n, fibre: acc.fibre / n,
    }),
  };
}

/**
 * Aggregate a week's plan into a shopping list, grouped by supermarket aisle.
 * Quantities are summed per ingredient and rounded up to something you can
 * actually buy.
 */
export function shoppingList(plan) {
  /** @type {Record<string,{id:string,name:string,aisle:string,qty:number,unit:string,per:number|'unit',negligible:boolean,usedIn:Set<string>}>} */
  const totals = {};

  for (const day of plan.days) {
    for (const entry of day.entries) {
      if (entry.freeMeal || !entry.mealId) continue;
      const meal = getMeal(entry.mealId);
      if (!meal?.items?.length) continue;
      for (const [id, qty] of meal.items) {
        const ing = getIngredient(id);
        if (!totals[id]) {
          totals[id] = { id, name: ing.name, aisle: ing.aisle, qty: 0, unit: ing.unit, per: ing.per, negligible: !!ing.negligible, usedIn: new Set() };
        }
        totals[id].qty += qty * entry.servings;
        totals[id].usedIn.add(meal.name);
      }
    }
  }

  const items = Object.values(totals).map((t) => {
    const ing = getIngredient(t.id);
    // Round to a buyable quantity: units up to a whole, weights up to 10g.
    const buyQty = t.per === 'unit' ? Math.ceil(t.qty) : Math.ceil(t.qty / 10) * 10;
    return {
      ...t,
      exactQty: Math.round(t.qty * 10) / 10,
      buyQty,
      display: t.per === 'unit'
        ? `${buyQty} ${ing.unit}${buyQty === 1 ? '' : 's'}`
        : `${buyQty >= 1000 ? `${(buyQty / 1000).toFixed(buyQty % 1000 === 0 ? 0 : 2)}kg` : `${buyQty}${ing.unit}`}`,
      usedIn: [...t.usedIn].sort(),
    };
  });

  const aisles = {};
  for (const item of items) (aisles[item.aisle] ||= []).push(item);
  for (const list of Object.values(aisles)) list.sort((a, b) => a.name.localeCompare(b.name));

  return { aisles, itemCount: items.length };
}

/**
 * How well does a day hit its targets?
 * Returns a per-macro percentage and a plain-language verdict.
 */
export function scoreDay(totals, targets) {
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const kcalPct = pct(totals.kcal, targets.kcal);
  const proteinPct = pct(totals.protein, targets.protein);

  let verdict = 'on target';
  if (kcalPct > 108) verdict = 'over on calories';
  else if (kcalPct < 92) verdict = 'under on calories';
  else if (proteinPct < 90) verdict = 'light on protein';

  return {
    kcalPct, proteinPct,
    carbsPct: pct(totals.carbs, targets.carbs),
    fatPct: pct(totals.fat, targets.fat),
    fibrePct: pct(totals.fibre, targets.fibre),
    verdict,
    onTarget: kcalPct >= 92 && kcalPct <= 108 && proteinPct >= 90,
  };
}
