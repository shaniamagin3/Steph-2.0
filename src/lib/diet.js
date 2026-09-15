/**
 * Dietary suitability, derived from ingredients rather than from labels.
 *
 * A meal tagged 'gluten-free' by hand is a claim. A meal whose every ingredient
 * is classified gluten-free is a fact about the data. When someone is
 * intolerant, that difference matters, so every restriction here is computed
 * from the ingredient list and a hand-written tag can never override it.
 *
 * The one thing this cannot check is your actual shopping: a curry powder, a
 * stock cube or a bar of dark chocolate can all hide gluten or milk solids
 * depending on brand. Ingredients whose risk lives on the label are flagged
 * rather than silently trusted - see `labelChecks`.
 */

import { getIngredient } from '../data/ingredients.js';
import { getMeal } from './registry.js';

export const RESTRICTIONS = {
  'lactose-free': {
    key: 'lactose-free',
    label: 'Lactose free',
    hint: 'Excludes milk, yoghurt and soft cheese. Lactose-free dairy is fine - it is ordinary dairy with the lactase already added.',
  },
  'gluten-free': {
    key: 'gluten-free',
    label: 'Gluten free',
    hint: 'Excludes wheat, barley and rye. Oats and spice blends are allowed but flagged, because they are gluten free only if the packet says so.',
  },
  'dairy-free': {
    key: 'dairy-free',
    label: 'Dairy free',
    hint: 'Stricter than lactose free: no dairy at all, including lactose-free products and hard cheese.',
  },
  vegetarian: { key: 'vegetarian', label: 'Vegetarian', hint: 'No meat, poultry or fish.' },
  vegan: { key: 'vegan', label: 'Vegan', hint: 'No animal products at all.' },
};

const DAIRY_AISLE_EXEMPT = new Set(['egg', 'egg_whites', 'almond_milk', 'soy_milk', 'coconut_yoghurt']);

/**
 * Does one ingredient satisfy a restriction?
 * @param {object} ing
 * @param {string} restriction
 * @param {{allowLowLactose?:boolean}} [opts]
 */
export function ingredientSatisfies(ing, restriction, { allowLowLactose = false } = {}) {
  switch (restriction) {
    case 'lactose-free':
      return ing.lactose === 0 || (allowLowLactose && ing.lactose <= 1);
    case 'gluten-free':
      // 'trace' (oats, spice blends) passes: it is gluten free in its
      // gluten-free-labelled form, and `labelChecks` tells you to buy that one.
      return ing.gluten < 2;
    case 'dairy-free':
      return ing.aisle !== 'Dairy & eggs' || DAIRY_AISLE_EXEMPT.has(ing.id);
    case 'vegetarian':
      return !(ing.tags ?? []).includes('animal');
    case 'vegan':
      return !(ing.tags ?? []).includes('animal')
        && (ing.aisle !== 'Dairy & eggs' || DAIRY_AISLE_EXEMPT.has(ing.id));
    default:
      return true;
  }
}

/** Ingredient ids in a meal that break a restriction. */
export function offendingIngredients(meal, restriction, opts) {
  const m = typeof meal === 'string' ? getMeal(meal) : meal;
  if (!m?.items?.length) return [];

  const out = [];
  for (const [id] of m.items) {
    let ing;
    try { ing = getIngredient(id); } catch { continue; }
    if (!ingredientSatisfies(ing, restriction, opts)) out.push(id);
  }
  return [...new Set(out)];
}

/**
 * Does a meal satisfy a restriction?
 *
 * A custom meal entered as straight macros has no ingredient list, so nothing
 * can be verified about it. Those are trusted, because they are your own meals
 * and you know what is in them - but `verifiable` says which is which.
 */
export function mealSatisfies(meal, restriction, opts) {
  const m = typeof meal === 'string' ? getMeal(meal) : meal;
  if (!m) return false;
  if (!m.items?.length) return true;
  return offendingIngredients(m, restriction, opts).length === 0;
}

export function mealSatisfiesAll(meal, restrictions = [], opts) {
  return restrictions.every((r) => mealSatisfies(meal, r, opts));
}

/** Does a meal contain any of these ingredient ids? Used for "no tuna". */
export function mealContainsAny(meal, ingredientIds = []) {
  const m = typeof meal === 'string' ? getMeal(meal) : meal;
  if (!m?.items?.length || !ingredientIds.length) return false;
  const set = new Set(ingredientIds);
  return m.items.some(([id]) => set.has(id));
}

/**
 * Ingredients in this meal that are only safe if the packet says so.
 *
 * This is the honest part. Oats are naturally gluten free but routinely
 * cross-contaminated. Curry powders, stock and soy sauce commonly contain
 * wheat. Dark chocolate commonly contains milk solids. The app cannot know what
 * is in your cupboard, so it tells you which items to read rather than pretending.
 */
export function labelChecks(meal, restrictions = []) {
  const m = typeof meal === 'string' ? getMeal(meal) : meal;
  if (!m?.items?.length) return [];

  const checks = [];
  const has = (id) => m.items.some(([x]) => x === id);

  if (restrictions.includes('gluten-free')) {
    if (has('oats')) checks.push('Oats: buy the gluten-free labelled ones. Oats are naturally gluten free but are routinely cross-contaminated in milling.');
    if (has('spice_mix')) checks.push('Spice blends and curry powders: check the packet. Wheat flour is a common bulking agent in blends.');
    if (has('stock')) checks.push('Stock: many cubes and powders contain wheat.');
    if (has('soy_sauce')) checks.push('Soy sauce: use tamari. Most soy sauce is brewed with wheat.');
  }

  if (restrictions.includes('lactose-free') || restrictions.includes('dairy-free')) {
    if (has('dark_chocolate')) checks.push('Dark chocolate: check the label. Many bars contain milk solids even at high cocoa percentages.');
    if (has('whey_protein')) checks.push('Protein powder: whey concentrate still carries some lactose. Whey isolate or a plant protein does not.');
  }

  return checks;
}

/** A plain-language summary of what a meal is and is not suitable for. */
export function dietSummary(meal) {
  const m = typeof meal === 'string' ? getMeal(meal) : meal;
  if (!m) return null;
  if (!m.items?.length) return { verifiable: false, suits: [], note: 'Entered as macros, so its ingredients cannot be checked.' };

  const suits = Object.keys(RESTRICTIONS).filter((r) => mealSatisfies(m, r));
  return { verifiable: true, suits, note: null };
}
