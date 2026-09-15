/**
 * The live meal registry: the built-in library plus whatever meals you have
 * added yourself.
 *
 * Custom meals come in two shapes:
 *   1. `items` - built from the ingredient table, exactly like a built-in meal.
 *      Macros are computed, portions scale correctly, and it appears on the
 *      shopping list.
 *   2. `macros` - a meal you already know the numbers for (a family recipe,
 *      a regular takeaway, a packaged product). Macros are taken as given.
 *      It will not contribute to the shopping list, because there is nothing
 *      to shop for that we know about.
 *
 * Both are first-class: the planner will schedule either.
 */

import { MEALS, SLOTS } from '../data/meals.js';

let customMeals = [];

/** Replace the custom meal set (called whenever the store loads or changes). */
export function setCustomMeals(list) {
  customMeals = Array.isArray(list) ? list : [];
}

export function getCustomMeals() {
  return customMeals;
}

export function allMeals() {
  return [...MEALS, ...customMeals];
}

export function getMeal(id) {
  return allMeals().find((m) => m.id === id) ?? null;
}

export function mealsForSlot(slot) {
  return allMeals().filter((m) => m.slot === slot);
}

export function isCustom(id) {
  return customMeals.some((m) => m.id === id);
}

/** Validate a user-authored meal before it goes into the registry. */
export function validateCustomMeal(meal) {
  const errors = [];
  if (!meal.name?.trim()) errors.push('Give the meal a name.');
  if (!SLOTS.includes(meal.slot)) errors.push('Pick which meal of the day this is.');

  const hasItems = Array.isArray(meal.items) && meal.items.length > 0;
  const hasMacros = meal.macros && Number(meal.macros.kcal) > 0;

  if (!hasItems && !hasMacros) {
    errors.push('Add at least one ingredient, or enter the calories and macros directly.');
  }

  if (hasMacros && !hasItems) {
    const { protein = 0, carbs = 0, fat = 0, kcal = 0 } = meal.macros;
    const implied = protein * 4 + carbs * 4 + fat * 9;
    if (kcal > 0 && implied > 0 && Math.abs(implied - kcal) / kcal > 0.25) {
      errors.push(`Those macros work out to about ${Math.round(implied)} kcal, but you entered ${Math.round(kcal)}. Worth double-checking one of them.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function newCustomMealId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `custom-${slug || 'meal'}-${Date.now().toString(36)}`;
}
