/**
 * Dietary restriction tests.
 *
 * These matter more than the rest of the suite. Everything else here is about
 * a plan being good; this is about a plan being safe for someone who reacts to
 * what is in it. The central property under test is that a restriction is never
 * relaxed - not by an empty pool, not by a fallback, not by a hand-written tag.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mealSatisfies, mealSatisfiesAll, offendingIngredients, ingredientSatisfies,
  labelChecks, mealContainsAny, dietSummary, RESTRICTIONS,
} from '../src/lib/diet.js';
import { generateWeek, allowedPool, strictPool, candidatePool, poolWarnings } from '../src/lib/planner.js';
import { computeTargets } from '../src/lib/energy.js';
import { setCustomMeals, getMeal } from '../src/lib/registry.js';
import { INGREDIENTS, BY_ID, getIngredient } from '../src/data/ingredients.js';
import { MEALS } from '../src/data/meals.js';

const PROFILE = { sex: 'female', weightKg: 82, heightCm: 166, age: 34, activityKey: 'light', proteinGPerKg: 2.0, fatPctOfKcal: 0.30 };
const DEFICIT = computeTargets(PROFILE, 'deficit', 0.18);
const LF_GF = ['lactose-free', 'gluten-free'];

beforeEach(() => setCustomMeals([]));

describe('ingredient classification', () => {
  test('milk is higher lactose than yoghurt, which is higher than hard cheese', () => {
    // Well established: fermentation removes some lactose, and ageing removes
    // most of the rest.
    assert.ok(BY_ID.milk_skim.lactose > BY_ID.greek_yoghurt.lactose);
    assert.ok(BY_ID.greek_yoghurt.lactose > BY_ID.parmesan.lactose);
  });

  test('lactose-free dairy is classified as containing none', () => {
    assert.equal(BY_ID.lf_greek_yoghurt.lactose, 0);
    assert.equal(BY_ID.lf_milk.lactose, 0);
  });

  test('lactose-free dairy is still dairy', () => {
    assert.ok(!ingredientSatisfies(BY_ID.lf_greek_yoghurt, 'dairy-free'),
      'lactose free is not the same claim as dairy free');
    assert.ok(ingredientSatisfies(BY_ID.lf_greek_yoghurt, 'lactose-free'));
  });

  test('wheat products are classified as containing gluten', () => {
    for (const id of ['wholemeal_bread', 'sourdough', 'wholemeal_wrap', 'pasta_wholemeal', 'soy_sauce']) {
      assert.equal(BY_ID[id].gluten, 2, `${id} should be flagged as containing gluten`);
    }
  });

  test('oats are trace rather than contains, and are flagged on the label instead', () => {
    assert.equal(BY_ID.oats.gluten, 1);
    assert.ok(ingredientSatisfies(BY_ID.oats, 'gluten-free'));
  });

  test('hard cheese only passes lactose-free when low lactose is allowed', () => {
    assert.ok(!ingredientSatisfies(BY_ID.parmesan, 'lactose-free'));
    assert.ok(ingredientSatisfies(BY_ID.parmesan, 'lactose-free', { allowLowLactose: true }));
  });

  test('every ingredient carries a classification', () => {
    for (const i of INGREDIENTS) {
      assert.ok(typeof i.lactose === 'number', `${i.id} has no lactose classification`);
      assert.ok(typeof i.gluten === 'number', `${i.id} has no gluten classification`);
      assert.ok(i.lactose >= 0 && i.lactose <= 3, `${i.id} lactose out of range`);
      assert.ok(i.gluten >= 0 && i.gluten <= 2, `${i.id} gluten out of range`);
    }
  });
});

describe('meal-level suitability', () => {
  test('is derived from ingredients, not from tags', () => {
    // A meal tagged gluten-free but containing bread must still fail.
    const fake = {
      id: 'fake', name: 'Mislabelled', slot: 'lunch', prepMin: 5,
      tags: ['gluten-free', 'lactose-free'],
      items: [['wholemeal_bread', 2], ['chicken_breast', 100]],
      method: 'x', note: 'x',
    };
    assert.equal(mealSatisfies(fake, 'gluten-free'), false, 'a tag must not override the ingredients');
    assert.deepEqual(offendingIngredients(fake, 'gluten-free'), ['wholemeal_bread']);
  });

  test('names every offending ingredient, not just the first', () => {
    const offenders = offendingIngredients('lun-chicken-caesar', 'lactose-free');
    assert.ok(offenders.includes('greek_yoghurt'));
    assert.ok(offenders.includes('parmesan'));
  });

  test('the new lactose-free gluten-free meals genuinely are', () => {
    const ids = ['brk-baked-oats', 'brk-turkey-egg-muffins', 'din-lamb-curry', 'din-chicken-tikka-curry',
                 'din-beef-ragu-gf', 'lun-thai-beef-salad', 'snk-protein-shake', 'des-lf-choc-mousse'];
    for (const id of ids) {
      const meal = MEALS.find((m) => m.id === id);
      assert.ok(meal, `${id} missing from the library`);
      assert.ok(mealSatisfiesAll(meal, LF_GF), `${id}: ${offendingIngredients(meal, 'lactose-free').concat(offendingIngredients(meal, 'gluten-free')).join(', ')}`);
    }
  });

  test('a macro-only custom meal is trusted but marked unverifiable', () => {
    const custom = { id: 'c1', name: 'Mum’s curry', slot: 'dinner', items: [], macros: { kcal: 600, protein: 40, carbs: 50, fat: 22 } };
    assert.equal(mealSatisfies(custom, 'gluten-free'), true);
    assert.equal(dietSummary(custom).verifiable, false);
  });

  test('every slot has at least three lactose-free gluten-free options', () => {
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']) {
      const n = MEALS.filter((m) => m.slot === slot && mealSatisfiesAll(m, LF_GF)).length;
      assert.ok(n >= 3, `only ${n} lactose-free gluten-free ${slot} options`);
    }
  });
});

describe('restrictions are never relaxed', () => {
  test('a generated plan contains nothing that breaks a restriction', () => {
    for (const seed of [1, 7, 42, 900, 12345]) {
      const plan = generateWeek({
        targets: DEFICIT, seed, startDate: '2026-09-14',
        prefs: { restrictions: LF_GF },
      });
      for (const day of plan.days) {
        for (const e of day.entries) {
          if (e.freeMeal) continue;
          const meal = getMeal(e.mealId);
          assert.ok(mealSatisfiesAll(meal, LF_GF),
            `seed ${seed}: ${e.mealId} breaks a restriction (${offendingIngredients(meal, 'lactose-free').concat(offendingIngredients(meal, 'gluten-free')).join(', ')})`);
        }
      }
    }
  });

  test('impossible soft tags relax, but restrictions still hold', () => {
    const prefs = { restrictions: LF_GF, requireTags: ['freezer', 'no-cook', 'family'] };
    const plan = generateWeek({ targets: DEFICIT, seed: 3, startDate: '2026-09-14', prefs });
    for (const day of plan.days) {
      for (const e of day.entries) {
        if (e.freeMeal) continue;
        assert.ok(mealSatisfiesAll(getMeal(e.mealId), LF_GF), `${e.mealId} slipped through when tags were relaxed`);
      }
    }
  });

  test('a slot with no compliant option is left empty rather than filled unsafely', () => {
    // Exclude every compliant dessert and check nothing non-compliant appears.
    const compliantDesserts = MEALS.filter((m) => m.slot === 'dessert' && mealSatisfiesAll(m, LF_GF)).map((m) => m.id);
    const prefs = { restrictions: LF_GF, excluded: compliantDesserts };

    assert.equal(allowedPool('dessert', prefs).length, 0, 'test setup should leave no compliant dessert');
    assert.equal(candidatePool('dessert', prefs).length, 0, 'candidatePool must not fall back to unsafe meals');

    const plan = generateWeek({ targets: DEFICIT, seed: 5, startDate: '2026-09-14', prefs });
    for (const day of plan.days) {
      assert.ok(!day.entries.some((e) => e.slot === 'dessert'), 'an unfillable slot must be omitted, not filled unsafely');
      for (const e of day.entries) {
        if (!e.freeMeal) assert.ok(mealSatisfiesAll(getMeal(e.mealId), LF_GF));
      }
    }
    assert.ok(plan.warnings.some((w) => /dessert/.test(w)), 'the user must be told why a slot is missing');
  });

  test('warnings explain an unfillable slot in terms of the restriction', () => {
    const all = MEALS.filter((m) => m.slot === 'snack' && mealSatisfiesAll(m, LF_GF)).map((m) => m.id);
    const warnings = poolWarnings({ restrictions: LF_GF, excluded: all });
    assert.ok(warnings.some((w) => /snack/.test(w) && /never relaxed/i.test(w)));
  });

  test('excluded ingredients are honoured everywhere', () => {
    for (const seed of [2, 22, 222]) {
      const plan = generateWeek({
        targets: DEFICIT, seed, startDate: '2026-09-14',
        prefs: { restrictions: LF_GF, excludedIngredients: ['tuna_canned', 'salmon_fillet'] },
      });
      for (const day of plan.days) {
        for (const e of day.entries) {
          if (e.freeMeal) continue;
          assert.ok(!mealContainsAny(getMeal(e.mealId), ['tuna_canned', 'salmon_fillet']),
            `seed ${seed}: ${e.mealId} contains an excluded ingredient`);
        }
      }
    }
  });

  test('an excluded ingredient is filtered out of custom meals too', () => {
    setCustomMeals([{
      id: 'custom-tuna', name: 'My tuna thing', slot: 'lunch', prepMin: 5, tags: [],
      items: [['tuna_canned', 120], ['salad_leaves', 80]], method: 'x', note: '',
    }]);
    const pool = allowedPool('lunch', { excludedIngredients: ['tuna_canned'] });
    assert.ok(!pool.some((m) => m.id === 'custom-tuna'));
  });
});

describe('label checks', () => {
  test('flags oats under a gluten-free rule', () => {
    const checks = labelChecks('brk-baked-oats', ['gluten-free']);
    assert.ok(checks.some((c) => /Oats/.test(c) && /cross-contaminat/i.test(c)));
  });

  test('flags spice blends in a curry', () => {
    assert.ok(labelChecks('din-lamb-curry', ['gluten-free']).some((c) => /[Ss]pice/.test(c)));
  });

  test('flags dark chocolate under a lactose rule, because milk solids are common', () => {
    assert.ok(labelChecks('snk-dark-choc-almonds', ['lactose-free']).some((c) => /chocolate/i.test(c)));
  });

  test('says nothing when no restriction applies', () => {
    assert.deepEqual(labelChecks('din-lamb-curry', []), []);
  });
});

describe('allowing low-lactose hard cheese', () => {
  test('widens the library without letting yoghurt or milk through', () => {
    const strictCount = MEALS.filter((m) => mealSatisfiesAll(m, ['lactose-free'])).length;
    const lenientCount = MEALS.filter((m) => mealSatisfiesAll(m, ['lactose-free'], { allowLowLactose: true })).length;
    assert.ok(lenientCount > strictCount, 'allowing hard cheese should add options');

    for (const m of MEALS) {
      if (!mealSatisfiesAll(m, ['lactose-free'], { allowLowLactose: true })) continue;
      for (const [id] of m.items ?? []) {
        assert.ok(getIngredient(id).lactose <= 1, `${m.id} contains ${id}, which is not low lactose`);
      }
    }
  });
});
