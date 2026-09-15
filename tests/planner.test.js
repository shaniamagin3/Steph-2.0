import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek, generateDay, swapMeal, regenerateDay, planQuality, candidatePool, strictPool, allowedPool, mealHasTag, slotBudgets, batchPlan, planMode, anchorProteins, proteinFamilyCounts, weeklyIngredientLoad, freeMealImpact, rng, DEFAULT_PREFERENCES } from '../src/lib/planner.js';
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

describe('generateWeek (varied mode)', () => {
  const varied = (opts) => generateWeek({ mode: 'varied', ...opts });

  test('produces seven days with the right eating occasions', () => {
    const plan = varied({ targets: DEFICIT, seed: 1, startDate: '2026-09-15' });
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
    const plan = varied({ targets: DEFICIT, seed: 1, startDate: '2026-09-17' });
    assert.equal(plan.startDate, '2026-09-14');
    assert.equal(plan.days[0].dayName, 'Monday');
  });

  test('every day lands within 5% of the calorie target', () => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const plan = varied({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      for (const day of plan.days) {
        const drift = Math.abs(day.totals.kcal - DEFICIT.kcal) / DEFICIT.kcal;
        assert.ok(drift <= 0.05, `seed ${seed} ${day.dayName}: ${day.totals.kcal} vs ${DEFICIT.kcal} (${(drift * 100).toFixed(1)}%)`);
      }
    }
  });

  test('meets or exceeds the protein target on every day', () => {
    for (const seed of [3, 11, 777]) {
      const plan = varied({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      for (const day of plan.days) {
        assert.ok(day.totals.protein >= DEFICIT.protein * 0.92,
          `seed ${seed} ${day.dayName}: ${day.totals.protein}g vs ${DEFICIT.protein}g target`);
      }
    }
  });

  test('works at maintenance calories too', () => {
    const plan = varied({ targets: MAINT, seed: 5, startDate: '2026-09-14' });
    const q = planQuality(plan);
    assert.ok(Math.abs(q.kcalDrift) < MAINT.kcal * 0.03, `drift ${q.kcalDrift}`);
    assert.ok(q.daysOnTarget >= 6, `${q.daysOnTarget}/7 on target`);
  });

  test('is reproducible from its seed', () => {
    const a = varied({ targets: DEFICIT, seed: 20260915, startDate: '2026-09-14' });
    const b = varied({ targets: DEFICIT, seed: 20260915, startDate: '2026-09-14' });
    assert.deepEqual(a.days.map((d) => d.entries.map((e) => `${e.mealId}@${e.servings}`)),
                     b.days.map((d) => d.entries.map((e) => `${e.mealId}@${e.servings}`)));
  });

  test('gives real variety across a week', () => {
    const plan = varied({ targets: DEFICIT, seed: 8, startDate: '2026-09-14' });
    assert.ok(planQuality(plan).distinctMeals >= 22, `only ${planQuality(plan).distinctMeals} distinct meals`);
  });

  test('never repeats a meal twice within one day', () => {
    const plan = varied({ targets: DEFICIT, seed: 31, startDate: '2026-09-14' });
    for (const day of plan.days) {
      const ids = day.entries.map((e) => e.mealId);
      assert.equal(new Set(ids).size, ids.length, `${day.dayName} repeats a meal`);
    }
  });

  test('portion sizes stay in a range a person will actually measure', () => {
    const plan = varied({ targets: DEFICIT, seed: 44, startDate: '2026-09-14' });
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
    const plan = generateWeek({ mode: 'varied', targets: DEFICIT, seed: 15, startDate: '2026-09-14' });
    const dinnerIdx = plan.days[0].entries.findIndex((e) => e.slot === 'dinner');
    const next = swapMeal(plan, 0, dinnerIdx, 'din-lentil-dahl');
    assert.equal(next.days[0].entries[dinnerIdx].mealId, 'din-lentil-dahl');
    const drift = Math.abs(next.days[0].totals.kcal - DEFICIT.kcal) / DEFICIT.kcal;
    assert.ok(drift <= 0.08, `after swap: ${next.days[0].totals.kcal} vs ${DEFICIT.kcal}`);
  });

  test('swapping does not mutate the original plan', () => {
    const plan = generateWeek({ mode: 'varied', targets: DEFICIT, seed: 16, startDate: '2026-09-14' });
    const before = JSON.stringify(plan);
    swapMeal(plan, 0, 0, 'brk-yoghurt-bowl');
    assert.equal(JSON.stringify(plan), before);
  });

  test('rerolling one day of a varied plan leaves the others untouched', () => {
    const plan = generateWeek({ mode: 'varied', targets: DEFICIT, seed: 17, startDate: '2026-09-14' });
    const next = regenerateDay(plan, 2, { ...DEFAULT_PREFERENCES, planMode: 'varied' }, 555);
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


describe('generateWeek (repeating mode, the default)', () => {
  test('repeating is the default when nothing is specified', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 1, startDate: '2026-09-14' });
    assert.equal(plan.mode, 'repeating');
    assert.equal(planMode(plan), 'repeating');
  });

  test('all seven days carry exactly the same menu', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 3, startDate: '2026-09-14' });
    const signature = (d) => d.entries.map((e) => `${e.slot}:${e.mealId}@${e.servings}`).join('|');
    const first = signature(plan.days[0]);
    for (const day of plan.days) assert.equal(signature(day), first, `${day.dayName} differs from Monday`);
  });

  test('the dates still advance even though the menu does not', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 3, startDate: '2026-09-14' });
    assert.deepEqual(plan.days.map((d) => d.date),
      ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20']);
  });

  test('the single menu hits the calorie target', () => {
    for (const seed of [1, 42, 500, 7777]) {
      const plan = generateWeek({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      const drift = Math.abs(plan.days[0].totals.kcal - DEFICIT.kcal) / DEFICIT.kcal;
      assert.ok(drift <= 0.04, `seed ${seed}: ${plan.days[0].totals.kcal} vs ${DEFICIT.kcal}`);
    }
  });

  test('the single menu clears the protein target', () => {
    for (const seed of [2, 88, 4321]) {
      const plan = generateWeek({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      assert.ok(plan.days[0].totals.protein >= DEFICIT.protein * 0.95,
        `seed ${seed}: ${plan.days[0].totals.protein}g vs ${DEFICIT.protein}g`);
    }
  });

  test('works at maintenance calories too', () => {
    const plan = generateWeek({ targets: MAINT, seed: 9, startDate: '2026-09-14' });
    const drift = Math.abs(plan.days[0].totals.kcal - MAINT.kcal) / MAINT.kcal;
    assert.ok(drift <= 0.04, `${plan.days[0].totals.kcal} vs ${MAINT.kcal}`);
  });

  test('does not lean on the same ingredient across three or more slots', () => {
    // The main failure mode of a repeating menu: yoghurt three times a day,
    // every day, until you quit.
    for (const seed of [11, 202, 3030]) {
      const plan = generateWeek({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      const counts = new Map();
      for (const e of plan.days[0].entries) {
        const meal = MEALS.find((m) => m.id === e.mealId);
        if (!meal) continue;
        for (const id of new Set(meal.items.map(([i]) => i))) {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
      const overused = [...counts.entries()].filter(([id, n]) => n >= 4 && !['olive_oil', 'garlic', 'lemon', 'spice_mix', 'herbs_fresh', 'cinnamon', 'vanilla', 'sweetener'].includes(id));
      assert.deepEqual(overused.map(([id, n]) => `${id} x${n}`), [], `seed ${seed} over-uses an ingredient`);
    }
  });

  test('gives a different menu for a different seed', () => {
    const a = generateWeek({ targets: DEFICIT, seed: 1, startDate: '2026-09-14' });
    const b = generateWeek({ targets: DEFICIT, seed: 2, startDate: '2026-09-14' });
    assert.notDeepEqual(a.days[0].entries.map((e) => e.mealId), b.days[0].entries.map((e) => e.mealId));
  });

  test('is reproducible from its seed', () => {
    const a = generateWeek({ targets: DEFICIT, seed: 606, startDate: '2026-09-14' });
    const b = generateWeek({ targets: DEFICIT, seed: 606, startDate: '2026-09-14' });
    assert.deepEqual(a.days[0].entries, b.days[0].entries);
  });

  test('a pinned meal is honoured whichever day it was requested on', () => {
    const plan = generateWeek({
      targets: MAINT, seed: 14, startDate: '2026-09-14',
      prefs: { pinned: { Sunday: ['din-chicken-souvlaki'] } },
    });
    assert.ok(plan.days[0].entries.some((e) => e.mealId === 'din-chicken-souvlaki'),
      'a pinned meal should appear in the repeating menu regardless of the day named');
  });

  test('swapping changes the meal on every day, not just one', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 19, startDate: '2026-09-14' });
    const dinnerIdx = plan.days[0].entries.findIndex((e) => e.slot === 'dinner');
    const next = swapMeal(plan, 0, dinnerIdx, 'din-lentil-dahl');
    for (const day of next.days) {
      assert.equal(day.entries[dinnerIdx].mealId, 'din-lentil-dahl', `${day.dayName} was not updated`);
    }
    assert.equal(next.menu.entries[dinnerIdx].mealId, 'din-lentil-dahl');
  });

  test('the menu still hits its target after a swap', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 23, startDate: '2026-09-14' });
    const idx = plan.days[0].entries.findIndex((e) => e.slot === 'lunch');
    const next = swapMeal(plan, 0, idx, 'lun-tuna-bean-salad');
    const drift = Math.abs(next.days[0].totals.kcal - DEFICIT.kcal) / DEFICIT.kcal;
    assert.ok(drift <= 0.08, `${next.days[0].totals.kcal} vs ${DEFICIT.kcal}`);
  });

  test('rerolling replaces the whole menu and keeps every day identical', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 27, startDate: '2026-09-14' });
    const next = regenerateDay(plan, 0, DEFAULT_PREFERENCES, 888);
    assert.equal(next.mode, 'repeating');
    const sig = (d) => d.entries.map((e) => e.mealId).join('|');
    for (const day of next.days) assert.equal(sig(day), sig(next.days[0]));
  });
});

describe('batchPlan', () => {
  test('reports weekly recipe multipliers for a repeating menu', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 31, startDate: '2026-09-14' });
    const batch = batchPlan(plan);
    assert.equal(batch.length, plan.days[0].entries.length);
    for (const b of batch) {
      assert.ok(Math.abs(b.servingsPerWeek - b.servingsPerDay * 7) < 0.01, `${b.name}: weekly total does not match`);
      assert.ok(b.name.length > 0);
    }
  });

  test('returns null for a varied plan, which has no single menu to batch', () => {
    const plan = generateWeek({ mode: 'varied', targets: DEFICIT, seed: 32, startDate: '2026-09-14' });
    assert.equal(batchPlan(plan), null);
  });
});

describe('shopping list in repeating mode', () => {
  test('quantities are exactly seven times the daily menu', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 35, startDate: '2026-09-14' });
    const week = shoppingList(plan);
    const oneDay = shoppingList({ days: [plan.days[0]] });

    for (const [aisle, items] of Object.entries(oneDay.aisles)) {
      for (const item of items) {
        const weekItem = week.aisles[aisle].find((i) => i.id === item.id);
        assert.ok(weekItem, `${item.id} missing from the weekly list`);
        // exactQty is rounded to one decimal place, so comparing a rounded
        // daily figure multiplied by seven carries up to 0.35 of rounding.
        assert.ok(Math.abs(weekItem.exactQty - item.exactQty * 7) <= 0.4,
          `${item.id}: week ${weekItem.exactQty} is not 7x the daily ${item.exactQty}`);
      }
    }
  });
});


describe('protein-source diversity in a repeating menu', () => {
  test('identifies the main protein source of a meal', () => {
    const chicken = MEALS.find((m) => m.id === 'din-garlic-chicken-veg');
    assert.ok(anchorProteins(chicken).has('chicken_breast'));
    // Broccoli contributes protein but nowhere near a quarter of the meal's.
    assert.ok(!anchorProteins(chicken).has('broccoli'));
  });

  test('a menu never builds two slots on the same protein family', () => {
    // Eating tuna at lunch and tuna again at snack is fourteen tins a week, not
    // two. Families rather than exact ingredients, so chicken breast at lunch
    // and chicken thigh at dinner counts as the repeat it is.
    const offenders = [];
    for (let seed = 1; seed <= 40; seed++) {
      const plan = generateWeek({ targets: DEFICIT, seed, startDate: '2026-09-14' });
      for (const [fam, n] of proteinFamilyCounts(plan.days[0].entries)) {
        if (n >= 2) offenders.push(`seed ${seed}: ${fam} anchors ${n} slots`);
      }
    }
    assert.deepEqual(offenders, [], offenders.join('\n'));
  });

  test('protein powder is exempt, because repeating it is the point', () => {
    // A shake as a snack AND protein in your smoothie is a deliberate way to
    // hit a high target, not monotony to design out.
    const shake = MEALS.find((m) => m.id === 'snk-protein-shake');
    const smoothie = MEALS.find((m) => m.id === 'brk-berry-smoothie');
    const counts = proteinFamilyCounts([
      { mealId: shake.id, servings: 1, slot: 'snack' },
      { mealId: smoothie.id, servings: 1, slot: 'breakfast' },
    ]);
    assert.ok(!counts.has('protein_isolate'), 'protein powder should not count toward repetition');
  });
});

describe('weeklyIngredientLoad', () => {
  test('multiplies the daily menu out across the week', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 50, startDate: '2026-09-14' });
    const load = weeklyIngredientLoad(plan);
    assert.ok(load.length > 5);
    for (const i of load) {
      // perWeek is derived from the unrounded daily figure, deliberately, so
      // the weekly number stays accurate. Comparing it against the rounded
      // perDay therefore carries up to 0.35 of rounding.
      assert.ok(Math.abs(i.perWeek - i.perDay * 7) <= 0.4, `${i.id}: ${i.perWeek} is not 7x ${i.perDay}`);
      assert.ok(i.slots >= 1);
    }
  });

  test('can be filtered to one ingredient tag', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 51, startDate: '2026-09-14' });
    const fish = weeklyIngredientLoad(plan, { tag: 'fish' });
    const all = weeklyIngredientLoad(plan);
    assert.ok(fish.length <= all.length);
    for (const f of fish) assert.ok(all.some((a) => a.id === f.id));
  });

  test('is empty for a varied plan, where there is no single daily menu', () => {
    const plan = generateWeek({ mode: 'varied', targets: DEFICIT, seed: 52, startDate: '2026-09-14' });
    assert.deepEqual(weeklyIngredientLoad(plan), []);
  });

  test('ignores flavourings, which are not what makes a menu repetitive', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 53, startDate: '2026-09-14' });
    const load = weeklyIngredientLoad(plan);
    assert.ok(!load.some((i) => ['garlic', 'spice_mix', 'cinnamon', 'lemon'].includes(i.id)));
  });
});

describe('free meal', () => {
  const prefs = { freeMeal: { enabled: true, day: 'Saturday', slot: 'dinner' } };

  test('leaves exactly one slot on one day unplanned', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 40, startDate: '2026-09-14', prefs });
    const free = plan.days.flatMap((d, i) => d.entries.map((e) => ({ ...e, dayIndex: i }))).filter((e) => e.freeMeal);
    assert.equal(free.length, 1);
    assert.equal(free[0].dayIndex, 5);       // Saturday
    assert.equal(free[0].slot, 'dinner');
  });

  test('contributes nothing to that day\'s totals', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 41, startDate: '2026-09-14', prefs });
    const saturday = plan.days[5];
    const other = plan.days[0];
    assert.ok(saturday.totals.kcal < other.totals.kcal, 'the free-meal day should count fewer planned calories');
    assert.ok(saturday.totals.kcal > 0);
  });

  test('never appears on the shopping list', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 42, startDate: '2026-09-14', prefs });
    const list = shoppingList(plan);
    assert.ok(list.itemCount > 10, 'the rest of the week should still be shopped for');
    for (const items of Object.values(list.aisles)) {
      for (const i of items) assert.ok(i.exactQty > 0);
    }
  });

  test('is off unless you turn it on', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 43, startDate: '2026-09-14', prefs: {} });
    assert.equal(plan.freeMeal, undefined);
    assert.ok(!plan.days.some((d) => d.entries.some((e) => e.freeMeal)));
  });

  test('quantifies its cost rather than hand-waving', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 44, startDate: '2026-09-14', prefs });
    const impact = freeMealImpact(plan, 900);
    assert.ok(impact.replacedKcal > 0, 'it should know what the slot it replaced was worth');
    assert.equal(impact.extraKcal, Math.max(0, 900 - impact.replacedKcal));
    assert.ok(impact.pctOfWeek > 0 && impact.pctOfWeek < 15, `one meal should be a small share of the week, got ${impact.pctOfWeek}%`);
  });

  test('a free meal smaller than the slot it replaces costs nothing', () => {
    const plan = generateWeek({ targets: DEFICIT, seed: 45, startDate: '2026-09-14', prefs });
    const impact = freeMealImpact(plan, 100);
    assert.equal(impact.extraKcal, 0, 'extra calories must not go negative');
  });

  test('an unknown day name is ignored rather than corrupting the plan', () => {
    const plan = generateWeek({
      targets: DEFICIT, seed: 46, startDate: '2026-09-14',
      prefs: { freeMeal: { enabled: true, day: 'Blursday', slot: 'dinner' } },
    });
    assert.equal(plan.days.length, 7);
    assert.ok(!plan.days.some((d) => d.entries.some((e) => e.freeMeal)));
  });
});

describe('preferred proteins', () => {
  test('steer the menu without excluding everything else', () => {
    const preferred = ['chicken', 'lamb', 'beef', 'pork'];
    let matched = 0;
    let total = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const plan = generateWeek({
        targets: DEFICIT, seed, startDate: '2026-09-14',
        prefs: { restrictions: ['lactose-free', 'gluten-free'], preferredProteins: preferred },
      });
      for (const [fam, n] of proteinFamilyCounts(plan.days[0].entries)) {
        total += n;
        if (preferred.includes(fam)) matched += n;
      }
    }
    assert.ok(total > 0);
    assert.ok(matched / total >= 0.6, `only ${Math.round((matched / total) * 100)}% of protein slots used a preferred family`);
  });

  test('remain a nudge: the wider library is still reachable', () => {
    const pool = allowedPool('dinner', { preferredProteins: ['chicken'] });
    assert.ok(pool.length > 5, 'preferring a protein must not shrink the candidate pool');
  });
});
