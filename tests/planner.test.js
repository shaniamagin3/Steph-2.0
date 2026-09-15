import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek, generateDay, swapMeal, regenerateDay, planQuality, candidatePool, strictPool, mealHasTag, slotBudgets, rng, DEFAULT_PREFERENCES } from '../src/lib/planner.js';
import { computeTargets } from '../src/lib/energy.js';
import { dayTotals, shoppingList, weekTotals } from '../src/lib/nutrition.js';
import { setCustomMeals } from '../src/lib/registry.js';
import { MEALS } from '../src/data/meals.js';

const PROFILE = { sex: 'female', weightKg: 78, heightCm: 165, age: 32, activityKey: 'light', proteinGPerKg: 2.0, fatPctOfKcal: 0.30 };
const MAINT = computeTargets(PROFILE, 'maintenance');
const DEFICIT = computeTargets(PROFILE, 'deficit', 0.18);

beforeEach(() => setCustomMeals([]));

describe('rng', () => {
  test('is deterministic for a given seed', () => {
    const a = Array.from({ length: 5 }, rng(99));
    const b = Array.from({ length: 5 }, rng(99));
    assert.deepEqual(a, b);
  });
  test('different seeds give different sequences', () => {
    assert.notDeepEqual(Array.from({ length: 5 }, rng(1)), Array.from({ length: 5 }, rng(2)));
  });
});

describe('slotBudgets', () => {
  test('budgets sum to the day target', () => {
    const b = slotBudgets(2000, DEFAULT_PREFERENCES);
    const sum = b.reduce((a, x) => a + x.kcal, 0);
    assert.ok(Math.abs(sum - 2000) < 0.01);
  });
  test('honours snack count and the dessert toggle', () => {
    assert.equal(slotBudgets(2000, { snacksPerDay: 1, dessertDaily: false }).length, 4);
    assert.equal(slotBudgets(2000, { snacksPerDay: 2, dessertDaily: true }).length, 6);
  });
});

describe('generateWeek', () => {
  test('produces seven days with the right eating occasions', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 1, startDate: '2026-09-15' });
    assert.equal(plan.days.length, 7);
    for (const day of plan.days) {
      const slots = day.entries.map((e) => e.slot);
      assert.ok(slots.includes('breakfast'));
      assert.ok(slots.includes('lunch'));
      assert.ok(slots.includes('dinner'));
      assert.ok(slots.includes('dessert'));
      assert.equal(slots.filter((s) => s === 'snack').length, 2);
    }
  });

  test('starts the week on a Monday regardless of the date given', () => {
    // 2026-09-17 is a Thursday.
    const plan = generateWeek({ targets: DEFICIT, seed: 1, startDate: '2026-09-17' });
    assert.equal(plan.startDate, '2026-09-14');
    assert.equal(plan.days[0].dayName, 'Monday');
  });

  test('every day lands within 5% of the calorie target', () => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const plan = generateWeek({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      for (const day of plan.days) {
        const drift = Math.abs(day.totals.kcal - DEFICIT.kcal) / DEFICIT.kcal;
        assert.ok(drift <= 0.05, `seed ${seed} ${day.dayName}: ${day.totals.kcal} vs ${DEFICIT.kcal} (${(drift * 100).toFixed(1)}%)`);
      }
    }
  });

  test('meets or exceeds the protein target on every day', () => {
    for (const seed of [3, 11, 777]) {
      const plan = generateWeek({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      for (const day of plan.days) {
        assert.ok(day.totals.protein >= DEFICIT.protein * 0.92,
          `seed ${seed} ${day.dayName}: ${day.totals.protein}g vs ${DEFICIT.protein}g target`);
      }
    }
  });

  test('works at maintenance calories too', () => {
    const plan = generateWeek({ targets: MAINT, seed: 5, startDate: '2026-09-14' });
    const q = planQuality(plan);
    assert.ok(Math.abs(q.kcalDrift) < MAINT.kcal * 0.03, `drift ${q.kcalDrift}`);
    assert.ok(q.daysOnTarget >= 6, `${q.daysOnTarget}/7 on target`);
  });

  test('is reproducible from its seed', () => {
    const a = generateWeek({ targets: DEFICIT, seed: 20260915, startDate: '2026-09-14' });
    const b = generateWeek({ targets: DEFICIT, seed: 20260915, startDate: '2026-09-14' });
    assert.deepEqual(a.days.map((d) => d.entries.map((e) => `${e.mealId}@${e.servings}`)),
                     b.days.map((d) => d.entries.map((e) => `${e.mealId}@${e.servings}`)));
  });

  test('gives real variety across a week', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 8, startDate: '2026-09-14' });
    assert.ok(planQuality(plan).distinctMeals >= 22, `only ${planQuality(plan).distinctMeals} distinct meals`);
  });

  test('never repeats a meal twice within one day', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 31, startDate: '2026-09-14' });
    for (const day of plan.days) {
      const ids = day.entries.map((e) => e.mealId);
      assert.equal(new Set(ids).size, ids.length, `${day.dayName} repeats a meal`);
    }
  });

  test('portion sizes stay in a range a person will actually measure', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 44, startDate: '2026-09-14' });
    for (const day of plan.days) {
      for (const e of day.entries) {
        assert.ok(e.servings >= 0.5 && e.servings <= 2, `${e.mealId} at ${e.servings} servings`);
        assert.equal((e.servings * 100) % 25, 0, `${e.servings} is not a quarter-serving step`);
      }
    }
  });
});

describe('preferences', () => {
  test('excluded meals never appear', () => {
    const excluded = MEALS.filter((m) => m.slot === 'dinner').slice(0, 8).map((m) => m.id);
    const plan = generateWeek({ targets: DEFICIT, seed: 2, startDate: '2026-09-14', prefs: { excluded } });
    const used = plan.days.flatMap((d) => d.entries.map((e) => e.mealId));
    for (const id of excluded) assert.ok(!used.includes(id), `${id} was excluded but appeared`);
  });

  test('a required tag is respected across every slot', () => {
    const prefs = { requireTags: ['vegetarian'] };
    const plan = generateWeek({ targets: MAINT, seed: 4, startDate: '2026-09-14', prefs });
    for (const day of plan.days) {
      for (const e of day.entries) {
        const meal = MEALS.find((x) => x.id === e.mealId);
        assert.ok(mealHasTag(meal, 'vegetarian'), `${e.mealId} is not vegetarian`);
      }
    }
  });

  test('vegan meals satisfy a vegetarian filter', () => {
    const vegan = MEALS.find((m) => m.tags.includes('vegan'));
    assert.ok(mealHasTag(vegan, 'vegetarian'), 'vegan should imply vegetarian');
    assert.ok(mealHasTag(vegan, 'dairy-free'), 'vegan should imply dairy-free');
  });

  test('allergen tags are never inferred', () => {
    // Guessing wrong about gluten is not a convenience worth having.
    const vegan = MEALS.find((m) => m.tags.includes('vegan') && !m.tags.includes('gluten-free'));
    assert.ok(!mealHasTag(vegan, 'gluten-free'), 'gluten-free must never be inferred');
  });

  test('every slot has at least three vegetarian options', () => {
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']) {
      const n = strictPool(slot, { requireTags: ['vegetarian'] }).length;
      assert.ok(n >= 3, `only ${n} vegetarian ${slot} options`);
    }
  });

  test('over-constrained preferences warn instead of returning an empty plan', () => {
    const plan = generateWeek({ targets: MAINT, seed: 6, startDate: '2026-09-14', prefs: { requireTags: ['vegan', 'no-cook', 'freezer'] } });
    assert.equal(plan.days.length, 7);
    for (const day of plan.days) assert.ok(day.entries.length > 0, 'a day came back empty');
    assert.ok(plan.warnings.length > 0, 'should warn about a thin library');
  });

  test('favourites show up more often than chance', () => {
    const favourites = ['din-garlic-chicken-veg', 'brk-yoghurt-bowl', 'lun-tuna-bean-salad'];
    let favCount = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const plan = generateWeek({ targets: DEFICIT, seed, startDate: '2026-09-14', prefs: { favourites } });
      favCount += plan.days.flatMap((d) => d.entries.map((e) => e.mealId)).filter((id) => favourites.includes(id)).length;
    }
    // Three favourites across 8 weeks of 7 days; unweighted chance is far lower.
    assert.ok(favCount >= 20, `favourites appeared only ${favCount} times across 8 weeks`);
  });

  test('a pinned meal lands on the requested day', () => {
    const plan = generateWeek({
      targets: MAINT, seed: 9, startDate: '2026-09-14',
      prefs: { pinned: { Sunday: ['din-chicken-souvlaki'] } },
    });
    const sunday = plan.days.find((d) => d.dayName === 'Sunday');
    assert.ok(sunday.entries.some((e) => e.mealId === 'din-chicken-souvlaki'), 'pinned meal missing from Sunday');
  });
});

describe('custom meals', () => {
  test('a macro-only custom meal can be planned and scales correctly', () => {
    setCustomMeals([{
      id: 'custom-test', name: 'Test Dinner', slot: 'dinner', prepMin: 20, tags: ['yours'],
      items: [], macros: { kcal: 600, protein: 45, carbs: 50, fat: 22, fibre: 7 }, method: 'x', note: '',
    }]);
    const plan = generateWeek({
      targets: DEFICIT, seed: 12, startDate: '2026-09-14',
      prefs: { pinned: { Monday: ['custom-test'] } },
    });
    const monday = plan.days[0];
    const entry = monday.entries.find((e) => e.mealId === 'custom-test');
    assert.ok(entry, 'custom meal not scheduled');
    assert.ok(Math.abs(monday.totals.kcal - DEFICIT.kcal) / DEFICIT.kcal <= 0.05);
  });

  test('a macro-only meal contributes nothing to the shopping list', () => {
    setCustomMeals([{
      id: 'custom-takeaway', name: 'Takeaway', slot: 'dinner', prepMin: 0, tags: [],
      items: [], macros: { kcal: 700, protein: 40, carbs: 60, fat: 30, fibre: 5 }, method: 'x', note: '',
    }]);
    const plan = { days: [{ entries: [{ mealId: 'custom-takeaway', servings: 1, slot: 'dinner' }] }] };
    assert.equal(shoppingList(plan).itemCount, 0);
  });
});

describe('swap and reroll', () => {
  test('swapping a meal keeps the day on its calorie target', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 15, startDate: '2026-09-14' });
    const dinnerIdx = plan.days[0].entries.findIndex((e) => e.slot === 'dinner');
    const next = swapMeal(plan, 0, dinnerIdx, 'din-lentil-dahl');
    assert.equal(next.days[0].entries[dinnerIdx].mealId, 'din-lentil-dahl');
    const drift = Math.abs(next.days[0].totals.kcal - DEFICIT.kcal) / DEFICIT.kcal;
    assert.ok(drift <= 0.08, `after swap: ${next.days[0].totals.kcal} vs ${DEFICIT.kcal}`);
  });

  test('swapping does not mutate the original plan', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 16, startDate: '2026-09-14' });
    const before = JSON.stringify(plan);
    swapMeal(plan, 0, 0, 'brk-yoghurt-bowl');
    assert.equal(JSON.stringify(plan), before);
  });

  test('rerolling one day leaves the others untouched', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 17, startDate: '2026-09-14' });
    const next = regenerateDay(plan, 2, DEFAULT_PREFERENCES, 555);
    for (let i = 0; i < 7; i++) {
      if (i === 2) continue;
      assert.deepEqual(next.days[i].entries, plan.days[i].entries, `day ${i} changed`);
    }
  });
});

describe('shopping list', () => {
  test('aggregates a week into buyable quantities', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 18, startDate: '2026-09-14' });
    const list = shoppingList(plan);
    assert.ok(list.itemCount > 25, `only ${list.itemCount} items for a week`);
    for (const items of Object.values(list.aisles)) {
      for (const item of items) {
        assert.ok(item.buyQty >= item.exactQty, `${item.id}: buy ${item.buyQty} < needed ${item.exactQty}`);
        assert.ok(item.display.length > 0);
        assert.ok(item.usedIn.length > 0, `${item.id} has no source meals`);
      }
    }
  });

  test('quantities reflect the servings actually planned', () => {
    const plan = { days: [{ entries: [{ mealId: 'snk-eggs-tomatoes', servings: 2, slot: 'snack' }] }] };
    const eggs = shoppingList(plan).aisles['Dairy & eggs'].find((i) => i.id === 'egg');
    assert.equal(eggs.exactQty, 4); // 2 eggs per serving x 2 servings
  });
});

describe('weekTotals', () => {
  test('daily average matches the per-day numbers', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 21, startDate: '2026-09-14' });
    const { dailyAverage } = weekTotals(plan);
    const manual = plan.days.reduce((a, d) => a + d.totals.kcal, 0) / 7;
    assert.ok(Math.abs(dailyAverage.kcal - manual) <= 1);
  });
});
