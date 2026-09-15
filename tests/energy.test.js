import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  bmrMifflinStJeor, tdee, calorieTarget, macroTargets, proteinBasisKg,
  computeTargets, adjustTargetFromTrend, projectedWeeklyChangeKg, SAFETY,
} from '../src/lib/energy.js';

describe('Mifflin-St Jeor', () => {
  test('matches the published equation for a worked female example', () => {
    // 10(60) + 6.25(165) - 5(30) - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    assert.equal(bmrMifflinStJeor({ sex: 'female', weightKg: 60, heightCm: 165, age: 30 }), 1320);
  });

  test('male variant is exactly 166 kcal higher at the same inputs', () => {
    const p = { weightKg: 60, heightCm: 165, age: 30 };
    const f = bmrMifflinStJeor({ ...p, sex: 'female' });
    const m = bmrMifflinStJeor({ ...p, sex: 'male' });
    assert.equal(m - f, 166);
  });

  test('rejects nonsense inputs rather than returning a plausible-looking number', () => {
    assert.throws(() => bmrMifflinStJeor({ sex: 'female', weightKg: 0, heightCm: 165, age: 30 }), RangeError);
    assert.throws(() => bmrMifflinStJeor({ sex: 'female', weightKg: 60, heightCm: 165, age: -1 }), RangeError);
  });
});

describe('TDEE', () => {
  test('applies the activity multiplier', () => {
    assert.equal(tdee(1500, 'light'), Math.round(1500 * 1.375));
  });
  test('rejects an unknown activity level', () => {
    assert.throws(() => tdee(1500, 'superhuman'), RangeError);
  });
});

describe('calorieTarget', () => {
  test('maintenance returns maintenance untouched', () => {
    const r = calorieTarget({ tdee: 2000, bmr: 1400, phase: 'maintenance' });
    assert.equal(r.kcal, 2000);
    assert.equal(r.effectiveDeficitPct, 0);
  });

  test('deficit subtracts the requested percentage', () => {
    const r = calorieTarget({ tdee: 2000, bmr: 1400, phase: 'deficit', deficitPct: 0.20 });
    assert.equal(r.kcal, 1600);
    assert.equal(r.floored, false);
  });

  test('never programmes below BMR', () => {
    // A 25% deficit from 1700 is 1275, which is under this BMR.
    const r = calorieTarget({ tdee: 1700, bmr: 1400, phase: 'deficit', deficitPct: 0.25 });
    assert.equal(r.kcal, 1400);
    assert.equal(r.floored, true);
    assert.match(r.floorReason, /BMR/);
  });

  test('never programmes below the absolute kcal floor', () => {
    const r = calorieTarget({ tdee: 1400, bmr: 1000, phase: 'deficit', deficitPct: 0.25 });
    assert.equal(r.kcal, SAFETY.minDailyKcal);
    assert.equal(r.floored, true);
  });

  test('clamps an absurd deficit request into the safe band', () => {
    const r = calorieTarget({ tdee: 3000, bmr: 1500, phase: 'deficit', deficitPct: 0.80 });
    assert.equal(r.effectiveDeficitPct, SAFETY.maxDeficitPct);
    assert.equal(r.kcal, 3000 * (1 - SAFETY.maxDeficitPct));
  });
});

describe('proteinBasisKg', () => {
  test('uses actual bodyweight at or below BMI 27', () => {
    assert.equal(proteinBasisKg(65, 170), 65);
  });
  test('caps the basis at BMI 25 weight above BMI 27', () => {
    const basis = proteinBasisKg(110, 170);
    assert.ok(basis < 110, 'basis should be below bodyweight');
    assert.equal(basis, Math.round(25 * 1.7 * 1.7 * 10) / 10); // 72.3
  });
});

describe('macroTargets', () => {
  const base = { kcal: 1800, weightKg: 70, heightCm: 168 };

  test('macros account for the calorie budget within rounding', () => {
    const m = macroTargets(base);
    const implied = m.protein * 4 + m.fat * 9 + m.carbs * 4;
    assert.ok(Math.abs(implied - 1800) <= 25, `implied ${implied} should be near 1800`);
  });

  test('protein follows the g/kg setting', () => {
    const m = macroTargets({ ...base, proteinGPerKg: 1.8 });
    assert.equal(m.protein, Math.round(1.8 * 70));
  });

  test('fat never falls below the hormone-health floor', () => {
    const m = macroTargets({ ...base, fatPctOfKcal: 0.15, kcal: 1200 });
    assert.ok(m.fat >= SAFETY.minFatGPerKg * m.proteinBasisKg - 0.5, `fat ${m.fat} below floor`);
  });

  test('protein yields rather than producing negative carbohydrate', () => {
    // Very low calories with a very high protein request must still be edible.
    const m = macroTargets({ kcal: 1200, weightKg: 90, heightCm: 160, proteinGPerKg: 3.0 });
    assert.ok(m.carbs >= 0, 'carbs must not go negative');
    assert.ok(m.protein > 0);
  });

  test('warns when carbohydrate lands very low', () => {
    const m = macroTargets({ kcal: 1300, weightKg: 80, heightCm: 165, proteinGPerKg: 2.4, fatPctOfKcal: 0.35 });
    assert.ok(m.warnings.some((w) => /Carbohydrate/.test(w)));
  });
});

describe('computeTargets', () => {
  const profile = { sex: 'female', weightKg: 78, heightCm: 165, age: 32, activityKey: 'light', proteinGPerKg: 2.0, fatPctOfKcal: 0.30 };

  test('deficit target is below maintenance target', () => {
    const maint = computeTargets(profile, 'maintenance');
    const def = computeTargets(profile, 'deficit', 0.18);
    assert.ok(def.kcal < maint.kcal);
    assert.equal(def.kcal, Math.round(maint.maintenance * 0.82));
  });

  test('protein target is unchanged between phases', () => {
    const maint = computeTargets(profile, 'maintenance');
    const def = computeTargets(profile, 'deficit', 0.18);
    assert.equal(maint.protein, def.protein, 'protein should be held while calories drop');
  });

  test('protein lands inside the evidence-based g/kg band', () => {
    const t = computeTargets(profile, 'deficit', 0.18);
    const perKg = t.protein / profile.weightKg;
    assert.ok(perKg >= 1.4 && perKg <= 2.4, `${perKg.toFixed(2)} g/kg outside the sane band`);
  });
});

describe('adjustTargetFromTrend', () => {
  const base = { currentKcal: 1700, targetWeeklyChangeKg: -0.5, weeksOfData: 4 };

  test('refuses to adjust on fewer than two weeks of data', () => {
    const r = adjustTargetFromTrend({ ...base, weeklyChangeKg: 0, weeksOfData: 1 });
    assert.equal(r.action, 'hold');
    assert.equal(r.deltaKcal, 0);
  });

  test('holds when the trend is inside the noise band', () => {
    const r = adjustTargetFromTrend({ ...base, weeklyChangeKg: -0.45 });
    assert.equal(r.action, 'hold');
  });

  test('reduces calories when loss is too slow', () => {
    const r = adjustTargetFromTrend({ ...base, weeklyChangeKg: -0.1 });
    assert.equal(r.action, 'reduce');
    assert.ok(r.suggestedKcal < base.currentKcal);
  });

  test('increases calories when loss is too fast', () => {
    const r = adjustTargetFromTrend({ ...base, weeklyChangeKg: -1.2 });
    assert.equal(r.action, 'increase');
    assert.ok(r.suggestedKcal > base.currentKcal);
    assert.match(r.rationale, /lean mass|cycle/);
  });

  test('caps any single adjustment at 10% of current intake', () => {
    const r = adjustTargetFromTrend({ ...base, weeklyChangeKg: 2.5 });
    assert.ok(Math.abs(r.deltaKcal) <= Math.max(100, base.currentKcal * 0.1) + 5, `delta ${r.deltaKcal} too large`);
  });
});

test('projectedWeeklyChangeKg is negative for a deficit', () => {
  assert.ok(projectedWeeklyChangeKg(2000, 1600) < 0);
  assert.equal(projectedWeeklyChangeKg(2000, 2000), 0);
});
