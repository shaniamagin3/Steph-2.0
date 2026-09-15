import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  HABITS, habitResult, dailyScore, habitStreak, loggingStreak,
  weeklyAdherence, weightSeries, weightTrend, measurementDelta,
  photoCheckinStatus, weeklyInsights, emptyDaily, weeklyCount,
} from '../src/lib/checkins.js';
import { estimateCycle, averageCycleLength, daysBetween, addDays, weekStart, PHASES } from '../src/lib/cycle.js';
import { buildProgram, programStatus, isPhotoWeek, nextStepAdvice } from '../src/lib/program.js';

const habit = (key) => HABITS.find((h) => h.key === key);

/** Build a daily map ending on `end`, oldest first. */
function makeDays(end, n, fn) {
  const map = {};
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    map[date] = { date, ...fn(n - 1 - i, date) };
  }
  return map;
}

describe('date helpers', () => {
  test('daysBetween counts whole days', () => {
    assert.equal(daysBetween('2026-09-01', '2026-09-15'), 14);
    assert.equal(daysBetween('2026-09-15', '2026-09-01'), -14);
  });
  test('addDays crosses month and year boundaries', () => {
    assert.equal(addDays('2026-09-30', 1), '2026-10-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });
  test('weekStart snaps to Monday and is idempotent', () => {
    assert.equal(weekStart('2026-09-17'), '2026-09-14'); // Thursday -> Monday
    assert.equal(weekStart('2026-09-14'), '2026-09-14');
    assert.equal(weekStart('2026-09-20'), '2026-09-14'); // Sunday -> same Monday
  });
});

describe('habitResult', () => {
  test('boolean habits are hit or not', () => {
    assert.equal(habitResult(habit('journaled'), { journaled: true }), 1);
    assert.equal(habitResult(habit('journaled'), { journaled: false }), 0);
  });

  test('numeric habits give partial credit below target', () => {
    assert.equal(habitResult(habit('steps'), { steps: 8000 }), 1);
    assert.equal(habitResult(habit('steps'), { steps: 5000 }), 1);
    const partial = habitResult(habit('steps'), { steps: 2500 });
    assert.ok(partial > 0 && partial < 1, `expected partial credit, got ${partial}`);
  });

  test('unlogged numeric habits return null, not zero', () => {
    assert.equal(habitResult(habit('steps'), { steps: null }), null);
    assert.equal(habitResult(habit('sleep'), {}), null);
  });

  test('meal-plan adherence is scored on three levels', () => {
    assert.equal(habitResult(habit('mealPlan'), { mealPlan: 'yes' }), 1);
    assert.equal(habitResult(habit('mealPlan'), { mealPlan: 'mostly' }), 0.6);
    assert.equal(habitResult(habit('mealPlan'), { mealPlan: 'no' }), 0);
  });
});

describe('dailyScore', () => {
  const DAILY_HABITS = HABITS.filter((h) => h.type !== 'weekly-count');

  test('a blank day scores zero without crashing', () => {
    const s = dailyScore(emptyDaily('2026-09-15'));
    assert.equal(s.hit, 0);
    assert.equal(s.of, DAILY_HABITS.length);
  });

  test('a perfect day scores 100%', () => {
    const s = dailyScore({ sleep: 7.5, affirmations: true, mealPlan: 'yes', water: 2, steps: 7000, journaled: true, neckExercises: true });
    assert.equal(s.score, 1);
    assert.equal(s.hit, DAILY_HABITS.length);
    assert.equal(s.complete, true);
  });

  test('a rest day still scores 100%', () => {
    // Training is a weekly target. Marking a rest day as a failed habit would
    // be both wrong and demoralising.
    const rest = { sleep: 7.5, affirmations: true, mealPlan: 'yes', water: 2, steps: 7000, journaled: true, neckExercises: true, trained: false };
    assert.equal(dailyScore(rest).score, 1);
  });
});

describe('streaks', () => {
  const end = '2026-09-15';

  test('counts consecutive hits', () => {
    const days = makeDays(end, 10, () => ({ journaled: true }));
    assert.equal(habitStreak(days, 'journaled', end), 10);
  });

  test('a logged miss breaks the streak', () => {
    const days = makeDays(end, 10, (i) => ({ journaled: i !== 6 }));
    assert.equal(habitStreak(days, 'journaled', end), 3); // days 7,8,9
  });

  test('today being unlogged does not break a streak', () => {
    const days = makeDays(end, 10, () => ({ journaled: true }));
    delete days[end];
    assert.equal(habitStreak(days, 'journaled', end), 9);
  });

  test('logging streak counts days with any entry', () => {
    const days = makeDays(end, 5, () => ({ weightKg: 80 }));
    assert.equal(loggingStreak(days, end), 5);
  });
});

describe('weeklyAdherence', () => {
  test('reports per-habit percentages', () => {
    const days = makeDays('2026-09-20', 7, (i) => ({
      sleep: i < 5 ? 7.5 : 6, affirmations: true, mealPlan: 'yes', water: 2.25,
      steps: 6000, journaled: i % 2 === 0, neckExercises: true,
    }));
    const a = weeklyAdherence(days, '2026-09-14');
    assert.equal(a.daysLogged, 7);
    assert.equal(a.perHabit.find((h) => h.key === 'affirmations').pct, 100);
    assert.equal(a.perHabit.find((h) => h.key === 'sleep').daysHit, 5);
    assert.ok(a.overallPct > 0 && a.overallPct <= 100);
  });

  test('an empty week reports null rather than a fake zero', () => {
    const a = weeklyAdherence({}, '2026-09-14');
    assert.equal(a.daysLogged, 0);
    assert.equal(a.overallPct, null);
  });
});

describe('weight trend', () => {
  const end = '2026-09-30';

  test('no average until there are at least three readings', () => {
    const days = { '2026-09-29': { weightKg: 80 }, '2026-09-30': { weightKg: 80.4 } };
    const series = weightSeries(days, { endDate: end, days: 5 });
    assert.ok(series.every((s) => s.average == null), 'two readings must not produce an average');
  });

  test('recovers a real downward trend from noisy daily weights', () => {
    // True rate: -0.5 kg/week, with +-0.6 kg of daily noise on top.
    const days = makeDays(end, 42, (i) => ({ weightKg: Math.round((85 - i * (0.5 / 7) + Math.sin(i * 2.3) * 0.6) * 10) / 10 }));
    const t = weightTrend(days, { endDate: end, weeks: 4 });
    assert.ok(Math.abs(t.kgPerWeek - (-0.5)) < 0.15, `recovered ${t.kgPerWeek}, expected about -0.5`);
    assert.equal(t.confidence, 'good');
  });

  test('reports flat when weight is flat, despite noise', () => {
    const days = makeDays(end, 35, (i) => ({ weightKg: Math.round((80 + Math.sin(i * 1.7) * 0.8) * 10) / 10 }));
    const t = weightTrend(days, { endDate: end, weeks: 4 });
    assert.ok(Math.abs(t.kgPerWeek) < 0.2, `flat data gave ${t.kgPerWeek} kg/week`);
  });

  test('says so when there is not enough data', () => {
    const t = weightTrend(makeDays(end, 4, () => ({ weightKg: 80 })), { endDate: end });
    assert.equal(t.kgPerWeek, null);
    assert.equal(t.confidence, 'insufficient');
  });

  test('gaps in logging break the average rather than interpolating', () => {
    const days = makeDays(end, 20, (i) => (i < 5 || i > 14 ? { weightKg: 80 } : { weightKg: null }));
    const series = weightSeries(days, { endDate: end, days: 20 });
    assert.ok(series.some((s) => s.average == null), 'a gap should leave the average undefined somewhere');
  });
});

describe('measurementDelta', () => {
  test('computes per-site and combined change', () => {
    const d = measurementDelta({ chestCm: 102, waistCm: 88, hipsCm: 110 }, { chestCm: 104, waistCm: 92, hipsCm: 112 });
    assert.equal(d.waist, -4);
    assert.equal(d.total, -8);
  });
  test('handles a missing site without poisoning the total', () => {
    const d = measurementDelta({ chestCm: 102, waistCm: null, hipsCm: 110 }, { chestCm: 104, waistCm: 92, hipsCm: 112 });
    assert.equal(d.waist, null);
    assert.equal(d.total, -4);
  });
  test('returns null when there is nothing to compare against', () => {
    assert.equal(measurementDelta({ chestCm: 100 }, null), null);
  });
});

describe('cycle estimation', () => {
  test('identifies each phase across a 28-day cycle', () => {
    const start = '2026-09-01';
    const on = (day) => estimateCycle({ lastPeriodStart: start, cycleLength: 28, periodLength: 5, onIso: addDays(start, day - 1) });
    assert.equal(on(1).phase.key, 'menstrual');
    assert.equal(on(5).phase.key, 'menstrual');
    assert.equal(on(9).phase.key, 'follicular');
    assert.equal(on(14).phase.key, 'ovulatory');
    assert.equal(on(22).phase.key, 'luteal');
  });

  test('cycle day wraps correctly past the cycle length', () => {
    const r = estimateCycle({ lastPeriodStart: '2026-09-01', cycleLength: 28, onIso: '2026-09-30' });
    assert.equal(r.day, 2); // 29 days elapsed -> day 2 of the next cycle
  });

  test('flags low confidence when a cycle has been missed', () => {
    const r = estimateCycle({ lastPeriodStart: '2026-07-01', cycleLength: 28, onIso: '2026-09-15' });
    assert.equal(r.confidence, 'low');
    assert.ok(r.caveats.length > 0);
  });

  test('flagging irregular cycles lowers confidence', () => {
    const r = estimateCycle({ lastPeriodStart: '2026-09-10', cycleLength: 28, onIso: '2026-09-15', irregular: true });
    assert.equal(r.confidence, 'low');
    assert.ok(r.caveats.some((c) => /irregular/i.test(c)));
  });

  test('returns unknown rather than guessing with no data', () => {
    const r = estimateCycle({ lastPeriodStart: null });
    assert.equal(r.phase.key, 'unknown');
    assert.equal(r.day, null);
  });

  test('handles a future start date without producing a negative day', () => {
    const r = estimateCycle({ lastPeriodStart: '2026-10-01', onIso: '2026-09-15' });
    assert.equal(r.phase.key, 'unknown');
  });
});

describe('averageCycleLength', () => {
  test('needs two starts before reporting anything', () => {
    assert.equal(averageCycleLength(['2026-09-01']), null);
  });
  test('computes the mean and spread', () => {
    const r = averageCycleLength(['2026-01-01', '2026-01-29', '2026-02-26']);
    assert.equal(r.mean, 28);
    assert.equal(r.samples, 2);
    assert.equal(r.likelyIrregular, false);
  });
  test('flags wide variation as likely irregular', () => {
    const r = averageCycleLength(['2026-01-01', '2026-01-25', '2026-03-10']);
    assert.equal(r.likelyIrregular, true);
  });
});

describe('programme', () => {
  const program = buildProgram({ startDate: '2026-09-14', maintenanceWeeks: 2, deficitWeeks: 10, deficitPct: 0.18 });

  test('builds maintenance then deficit, back to back with no gap', () => {
    assert.equal(program.blocks.length, 2);
    assert.equal(program.blocks[0].phase, 'maintenance');
    assert.equal(program.blocks[1].phase, 'deficit');
    assert.equal(program.blocks[1].startDate, addDays(program.blocks[0].endDate, 1));
    assert.equal(program.totalWeeks, 12);
  });

  test('reports the right phase on each side of the boundary', () => {
    assert.equal(programStatus(program, '2026-09-14').phase, 'maintenance');
    assert.equal(programStatus(program, '2026-09-27').phase, 'maintenance'); // last maintenance day
    assert.equal(programStatus(program, '2026-09-28').phase, 'deficit');     // first deficit day
  });

  test('week numbering is continuous across blocks', () => {
    assert.equal(programStatus(program, '2026-09-14').weekOverall, 1);
    assert.equal(programStatus(program, '2026-09-28').weekOverall, 3);
    assert.equal(programStatus(program, '2026-09-28').weekInBlock, 1);
  });

  test('marks the programme complete after the final day', () => {
    assert.equal(programStatus(program, '2026-12-07').status, 'complete');
    assert.equal(programStatus(program, '2026-09-01').status, 'not-started');
  });

  test('photo weeks land every fourth week', () => {
    assert.equal(isPhotoWeek(program, '2026-10-08'), true);  // week 4
    assert.equal(isPhotoWeek(program, '2026-10-01'), false); // week 3
    assert.equal(isPhotoWeek(program, '2026-11-05'), true);  // week 8
  });

  test('clamps absurd block lengths instead of accepting them', () => {
    const p = buildProgram({ startDate: '2026-09-14', maintenanceWeeks: 0, deficitWeeks: 99 });
    assert.ok(p.blocks[0].weeks >= 1);
    assert.ok(p.blocks[1].weeks <= 16);
  });

  test('gives exit advice rather than just stopping', () => {
    const advice = nextStepAdvice(program, '2026-12-10');
    assert.ok(advice, 'a completed programme should say what to do next');
    assert.match(advice.body, /reverse|maintenance/i);
  });
});

describe('photo check-in schedule', () => {
  const program = buildProgram({ startDate: '2026-09-14', maintenanceWeeks: 2, deficitWeeks: 10 });

  test('not due in week one', () => {
    assert.equal(photoCheckinStatus(program, {}, '2026-09-20').due, false);
  });

  test('due at the end of week four', () => {
    assert.equal(photoCheckinStatus(program, {}, '2026-10-11').due, true);
  });

  test('not due again once that milestone is photographed', () => {
    const s = photoCheckinStatus(program, { '2026-10-10': { front: 'x' } }, '2026-10-12');
    assert.equal(s.due, false);
    assert.ok(s.nextDue);
  });

  test('due again four weeks later', () => {
    assert.equal(photoCheckinStatus(program, { '2026-10-10': { front: 'x' } }, '2026-11-08').due, true);
  });
});

describe('weeklyInsights', () => {
  test('flags a week with too little logged data', () => {
    const notes = weeklyInsights({ adherence: { daysLogged: 2, perHabit: [] }, trend: { kgPerWeek: null }, phase: 'deficit' });
    assert.ok(notes.some((n) => /2 of 7 days/.test(n.text)));
  });

  test('warns when loss is running too fast', () => {
    const notes = weeklyInsights({
      adherence: { daysLogged: 7, perHabit: [] },
      trend: { kgPerWeek: -1.4, confidence: 'good' },
      phase: 'deficit', targetWeeklyChangeKg: -0.5,
    });
    assert.ok(notes.some((n) => n.tone === 'warning' && /lean mass|cycle/i.test(n.text)));
  });

  test('says to change nothing when the trend is on target', () => {
    const notes = weeklyInsights({
      adherence: { daysLogged: 7, perHabit: [] },
      trend: { kgPerWeek: -0.52, confidence: 'good' },
      phase: 'deficit', targetWeeklyChangeKg: -0.5,
    });
    assert.ok(notes.some((n) => n.tone === 'good'));
  });

  test('mentions luteal-phase water retention when relevant', () => {
    const notes = weeklyInsights({
      adherence: { daysLogged: 7, perHabit: [] }, trend: { kgPerWeek: null },
      phase: 'deficit', cycle: { phase: PHASES.luteal },
    });
    assert.ok(notes.some((n) => /luteal/i.test(n.text)));
  });
});


describe('water habit', () => {
  const water = HABITS.find((h) => h.key === 'water');

  test('is part of the daily habit set', () => {
    assert.ok(water, 'water habit is missing');
    assert.equal(water.targetMin, 2);
    assert.equal(water.unit, 'L');
  });

  test('2L or more counts as hit', () => {
    assert.equal(habitResult(water, { water: 2 }), 1);
    assert.equal(habitResult(water, { water: 3.5 }), 1);
  });

  test('gives partial credit below target', () => {
    assert.equal(habitResult(water, { water: 1 }), 0.5);
    const low = habitResult(water, { water: 0.5 });
    assert.ok(low > 0 && low < 0.5);
  });

  test('unlogged is null, not zero', () => {
    assert.equal(habitResult(water, { water: null }), null);
    assert.equal(habitResult(water, {}), null);
  });

  test('offers quick-add amounts, since water is logged in pieces', () => {
    assert.ok(Array.isArray(water.quickAdd) && water.quickAdd.length > 0);
  });

  test('a blank daily entry includes the water field', () => {
    assert.ok('water' in emptyDaily('2026-09-15'));
  });

  test('weekly insights flag persistently low water', () => {
    const notes = weeklyInsights({
      adherence: { daysLogged: 7, perHabit: [{ key: 'water', pct: 40, daysHit: 2, daysLogged: 7 }] },
      trend: { kgPerWeek: null }, phase: 'deficit',
    });
    assert.ok(notes.some((n) => /[Ww]ater/.test(n.text)));
  });

  test('does not nag when water is fine', () => {
    const notes = weeklyInsights({
      adherence: { daysLogged: 7, perHabit: [{ key: 'water', pct: 95, daysHit: 7, daysLogged: 7 }] },
      trend: { kgPerWeek: null }, phase: 'deficit',
    });
    assert.ok(!notes.some((n) => /[Ww]ater/.test(n.text)));
  });
});

describe('training as a weekly target', () => {
  const trained = HABITS.find((h) => h.key === 'trained');

  test('is defined as a weekly count, not a daily habit', () => {
    assert.ok(trained);
    assert.equal(trained.type, 'weekly-count');
    assert.equal(trained.weeklyTargetMin, 3);
    assert.equal(trained.weeklyTargetMax, 4);
  });

  test('is never scored at the day level', () => {
    assert.equal(habitResult(trained, { trained: true }), null);
    assert.equal(habitResult(trained, { trained: false }), null);
  });

  test('has no daily streak, because rest days are not lapses', () => {
    const days = makeDays('2026-09-20', 7, () => ({ trained: true }));
    assert.equal(habitStreak(days, 'trained', '2026-09-20'), 0);
  });

  test('counts sessions across the week', () => {
    const days = makeDays('2026-09-20', 7, (i) => ({ trained: [0, 2, 4, 6].includes(i) }));
    assert.equal(weeklyCount(days, 'trained', '2026-09-14'), 4);
  });

  test('three sessions scores full marks', () => {
    const days = makeDays('2026-09-20', 7, (i) => ({ trained: [0, 2, 4].includes(i), sleep: 7.5 }));
    const h = weeklyAdherence(days, '2026-09-14').perHabit.find((x) => x.key === 'trained');
    assert.equal(h.sessions, 3);
    assert.equal(h.pct, 100);
  });

  test('one session scores proportionally', () => {
    const days = makeDays('2026-09-20', 7, (i) => ({ trained: i === 0, sleep: 7.5 }));
    const h = weeklyAdherence(days, '2026-09-14').perHabit.find((x) => x.key === 'trained');
    assert.equal(h.sessions, 1);
    assert.equal(h.pct, 33);
  });

  test('an unlogged week reports unknown rather than zero sessions', () => {
    const h = weeklyAdherence({}, '2026-09-14').perHabit.find((x) => x.key === 'trained');
    assert.equal(h.pct, null, 'a week you did not fill in is not a week you did not train');
  });

  test('weekly insights praise hitting the target', () => {
    const days = makeDays('2026-09-20', 7, (i) => ({ trained: [0, 2, 4].includes(i), sleep: 7.5 }));
    const notes = weeklyInsights({ adherence: weeklyAdherence(days, '2026-09-14'), trend: { kgPerWeek: null }, phase: 'deficit' });
    assert.ok(notes.some((n) => n.tone === 'good' && /training sessions/.test(n.text)));
  });

  test('weekly insights flag a week with no training at all', () => {
    const days = makeDays('2026-09-20', 7, () => ({ trained: false, sleep: 7.5 }));
    const notes = weeklyInsights({ adherence: weeklyAdherence(days, '2026-09-14'), trend: { kgPerWeek: null }, phase: 'deficit' });
    assert.ok(notes.some((n) => /No training logged/.test(n.text)));
  });
});
