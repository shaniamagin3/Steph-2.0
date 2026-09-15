/**
 * Data integrity: the food tables are hand-entered, so these tests exist to
 * catch typos (a decimal in the wrong place, a duplicate id, an ingredient
 * referenced but never defined) before they quietly distort someone's plan.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS, BY_ID, AISLE_ORDER, ATWATER_EXEMPT } from '../src/data/ingredients.js';
import { MEALS, SLOTS, SLOT_META, PROTEIN_FLOOR_EXEMPT } from '../src/data/meals.js';
import { mealMacros, lineMacros } from '../src/lib/nutrition.js';

describe('ingredient table', () => {
  test('ids are unique', () => {
    const ids = INGREDIENTS.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate ingredient id');
  });

  test('every aisle is one we know how to sort', () => {
    for (const i of INGREDIENTS) {
      assert.ok(AISLE_ORDER.includes(i.aisle), `${i.id} has unknown aisle "${i.aisle}"`);
    }
  });

  test('no negative or absurd macro values', () => {
    for (const i of INGREDIENTS) {
      for (const k of ['kcal', 'protein', 'carbs', 'fat', 'fibre']) {
        assert.ok(i[k] >= 0, `${i.id}.${k} is negative`);
      }
      if (i.per === 100) {
        assert.ok(i.kcal <= 900, `${i.id} exceeds the theoretical max energy density for 100g`);
        assert.ok(i.protein <= 100 && i.carbs <= 100 && i.fat <= 100, `${i.id} has a macro over 100g per 100g`);
      }
    }
  });

  test('fibre never exceeds total carbohydrate', () => {
    for (const i of INGREDIENTS) {
      assert.ok(i.fibre <= i.carbs + 0.01, `${i.id}: fibre ${i.fibre} > carbs ${i.carbs}`);
    }
  });

  test('stated energy is consistent with stated macros', () => {
    // Atwater arithmetic with a 2 kcal/g allowance for fibre. Published food
    // tables use food-specific factors, so exact agreement is not expected -
    // this is a typo detector (a misplaced decimal, a transposed column), not
    // a nutrition audit.
    //
    // An entry fails only when it is BOTH proportionally and absolutely out,
    // because on a 17 kcal lettuce a 32% drift is 5 kcal and means nothing.
    // Foods where the model structurally does not apply are exempted by name
    // in ATWATER_EXEMPT, with the reason documented alongside the data.
    const offenders = [];
    for (const i of INGREDIENTS) {
      if (ATWATER_EXEMPT.has(i.id)) continue;
      if (i.kcal < 15) continue; // rounding dominates at trivial energy levels
      const available = Math.max(0, i.carbs - i.fibre);
      const implied = i.protein * 4 + available * 4 + i.fat * 9 + i.fibre * 2;
      const absErr = Math.abs(implied - i.kcal);
      const drift = absErr / i.kcal;
      if (drift > 0.20 && absErr > 30) {
        offenders.push(`${i.id}: stated ${i.kcal}, implied ${implied.toFixed(0)} (${(drift * 100).toFixed(0)}% off, ${absErr.toFixed(0)} kcal)`);
      }
    }
    assert.deepEqual(offenders, [], `energy/macro mismatch:\n  ${offenders.join('\n  ')}`);
  });

  test('every Atwater exemption names a real ingredient', () => {
    for (const id of ATWATER_EXEMPT) {
      assert.ok(BY_ID[id], `ATWATER_EXEMPT names "${id}", which is not in the table`);
    }
  });
});

describe('meal library', () => {
  test('ids are unique', () => {
    const ids = MEALS.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate meal id');
  });

  test('every meal has a slot we render', () => {
    for (const m of MEALS) {
      assert.ok(SLOTS.includes(m.slot), `${m.id} has unknown slot "${m.slot}"`);
      assert.ok(SLOT_META[m.slot], `no slot metadata for ${m.slot}`);
    }
  });

  test('every ingredient referenced actually exists', () => {
    for (const m of MEALS) {
      for (const [id] of m.items) {
        assert.ok(BY_ID[id], `${m.id} references unknown ingredient "${id}"`);
      }
    }
  });

  test('every quantity is positive', () => {
    for (const m of MEALS) {
      for (const [id, qty] of m.items) {
        assert.ok(qty > 0, `${m.id} has non-positive quantity for ${id}`);
      }
    }
  });

  test('every meal has a method and a note', () => {
    for (const m of MEALS) {
      assert.ok(m.method?.length > 10, `${m.id} has no usable method`);
      assert.ok(m.note?.length > 5, `${m.id} has no note`);
      assert.ok(m.name?.length > 2, `${m.id} has no name`);
    }
  });

  test('each slot has enough options to avoid constant repetition', () => {
    for (const slot of SLOTS) {
      const n = MEALS.filter((m) => m.slot === slot).length;
      assert.ok(n >= 10, `only ${n} ${slot} options; a week of plans will repeat`);
    }
  });

  test('calorie loads are plausible for their slot', () => {
    const bounds = {
      breakfast: [250, 700], lunch: [350, 800], dinner: [400, 950],
      snack: [100, 350], dessert: [80, 420],
    };
    for (const m of MEALS) {
      const { kcal } = mealMacros(m, 1);
      const [lo, hi] = bounds[m.slot];
      assert.ok(kcal >= lo && kcal <= hi, `${m.id} is ${kcal} kcal, outside ${lo}-${hi} for a ${m.slot}`);
    }
  });

  test('this is genuinely a high-protein library', () => {
    // Every meal should draw a meaningful share of its energy from protein.
    const weak = [];
    for (const m of MEALS) {
      if (PROTEIN_FLOOR_EXEMPT.has(m.id)) continue;
      const mm = mealMacros(m, 1);
      const pct = (mm.protein * 4) / mm.kcal;
      // Snacks and desserts get a lower bar; they are smaller and sweeter.
      const floor = m.slot === 'dessert' ? 0.16 : m.slot === 'snack' ? 0.12 : 0.18;
      if (pct < floor) weak.push(`${m.id}: ${(pct * 100).toFixed(0)}% of calories from protein`);
    }
    assert.deepEqual(weak, [], `meals too low in protein:\n  ${weak.join('\n  ')}`);
  });

  test('main meals carry real fibre', () => {
    const low = [];
    for (const m of MEALS.filter((x) => ['lunch', 'dinner'].includes(x.slot))) {
      const { fibre } = mealMacros(m, 1);
      if (fibre < 5) low.push(`${m.id}: ${fibre}g fibre`);
    }
    assert.deepEqual(low, [], `main meals below 5g fibre:\n  ${low.join('\n  ')}`);
  });

  test('macros scale linearly with servings', () => {
    const m = MEALS[0];
    const one = mealMacros(m, 1);
    const two = mealMacros(m, 2);
    assert.ok(Math.abs(two.kcal - one.kcal * 2) <= 1, 'doubling servings should double calories');
    assert.ok(Math.abs(two.protein - one.protein * 2) <= 0.2);
  });
});

describe('lineMacros', () => {
  test('scales per-100g ingredients by weight', () => {
    const half = lineMacros('chicken_breast', 50);
    assert.ok(Math.abs(half.protein - 11.5) < 0.01);
  });
  test('scales per-unit ingredients by count', () => {
    const two = lineMacros('egg', 2);
    assert.ok(Math.abs(two.kcal - 144) < 0.01);
  });
  test('throws on an unknown ingredient rather than silently contributing zero', () => {
    assert.throws(() => lineMacros('unicorn_steak', 100), RangeError);
  });
});


describe('protein floor exemptions', () => {
  test('every exemption names a real meal', () => {
    for (const id of PROTEIN_FLOOR_EXEMPT) {
      assert.ok(MEALS.some((m) => m.id === id), `PROTEIN_FLOOR_EXEMPT names "${id}", which is not in the library`);
    }
  });

  test('exemptions stay rare, or the floor means nothing', () => {
    assert.ok(PROTEIN_FLOOR_EXEMPT.size <= 3, `${PROTEIN_FLOOR_EXEMPT.size} exemptions is too many for a floor to be meaningful`);
  });
});
