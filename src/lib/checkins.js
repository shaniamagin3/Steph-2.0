/**
 * Daily and weekly check-in logic: habit definitions, streaks, adherence, and
 * the weight-trend maths that stops a single bad morning reading from ruining
 * your week.
 */

import { addDays, daysBetween, todayIso, weekStart } from './cycle.js';

/**
 * The daily habits. These are the ones that get tracked every day, because
 * tracking everything is the same as tracking nothing.
 */
export const HABITS = [
  {
    key: 'sleep',
    label: 'Slept 7-8 hours',
    type: 'number',
    unit: 'hours',
    targetMin: 7,
    targetMax: 8,
    icon: '😴',
    why: 'Short sleep reliably increases appetite and makes adherence harder the next day. It is the habit with the largest knock-on effect on every other one.',
  },
  {
    key: 'affirmations',
    label: 'Affirmations',
    type: 'boolean',
    icon: '💬',
    why: 'The point is the two minutes of deliberate attention, not the words.',
  },
  {
    key: 'mealPlan',
    label: 'Stuck to the meal plan',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Yes', score: 1 },
      { value: 'mostly', label: 'Mostly', score: 0.6 },
      { value: 'no', label: 'No', score: 0 },
    ],
    icon: '🍽️',
    why: 'Logged honestly, "mostly" is far more useful data than a dishonest "yes". The pattern in these answers is what tells you which meals are not working.',
  },
  {
    key: 'water',
    label: 'Drank 2L of water',
    type: 'number',
    unit: 'L',
    targetMin: 2,
    targetMax: 3,
    step: 0.25,
    /** Water is the one habit you log in pieces through the day. */
    quickAdd: [0.25, 0.5],
    icon: '💧',
    why: 'Thirst gets misread as hunger often enough to matter during a deficit. It also makes the difference between a high-fibre plan feeling good and feeling like a brick.',
  },
  {
    key: 'steps',
    label: 'Steps (5-8k)',
    type: 'number',
    unit: 'steps',
    targetMin: 5000,
    targetMax: 8000,
    icon: '👟',
    why: 'Daily movement outside training is a large and very controllable slice of total energy expenditure. It also tends to fall quietly during a deficit, which is one of the main reasons progress stalls.',
  },
  {
    key: 'trained',
    label: 'Trained today',
    /**
     * A WEEKLY target, logged daily.
     *
     * Scoring this as a daily habit would mark every rest day a failure, which
     * is both wrong and demoralising - rest days are part of training, not a
     * lapse. So it is counted across the week and scored against 3-4 sessions,
     * and it is excluded from the daily percentage entirely.
     */
    type: 'weekly-count',
    weeklyTargetMin: 3,
    weeklyTargetMax: 4,
    icon: '🏋️',
    why: 'Resistance training is what decides whether the weight you lose comes off fat or off muscle. Three to four sessions is the target; a rest day is not a missed day.',
  },
  {
    key: 'journaled',
    label: 'Journaled',
    type: 'boolean',
    icon: '📓',
    why: 'Catches the emotional-eating patterns that a food log alone will not show you.',
  },
  {
    key: 'neckExercises',
    label: 'Neck exercises',
    type: 'boolean',
    icon: '🧘',
    why: 'Your physio-assigned work. It only helps if it happens on the days nothing hurts.',
  },
];

export const HABIT_KEYS = HABITS.map((h) => h.key);

/** Blank daily entry. */
export function emptyDaily(date = todayIso()) {
  return {
    date,
    weightKg: null,
    sleep: null,
    affirmations: false,
    water: null,
    mealPlan: null,
    steps: null,
    journaled: false,
    neckExercises: false,
    mood: null,
    energy: null,
    notes: '',
  };
}

/** Did a single habit hit its mark on this entry? Returns 0..1, or null if unlogged. */
export function habitResult(habit, entry) {
  if (!entry) return null;
  const v = entry[habit.key];

  switch (habit.type) {
    case 'weekly-count':
      // Deliberately unscored at the day level: see the habit definition.
      return null;
    case 'boolean':
      return v === true ? 1 : 0;
    case 'number': {
      if (v == null || v === '') return null;
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      if (n >= habit.targetMin) return 1;
      // Partial credit below target - 4k steps is not the same as zero.
      return Math.max(0, Math.min(0.99, n / habit.targetMin));
    }
    case 'choice': {
      if (v == null) return null;
      return habit.options.find((o) => o.value === v)?.score ?? 0;
    }
    default:
      return null;
  }
}

/** Overall score for a day: 0..1 across all habits, plus how many were logged. */
export function dailyScore(entry) {
  const daily = HABITS.filter((h) => h.type !== 'weekly-count');
  const results = HABITS.map((h) => ({ habit: h, result: habitResult(h, entry) }));
  const scored = daily.map((h) => habitResult(h, entry)).filter((r) => r != null);
  const sum = scored.reduce((a, r) => a + r, 0);

  return {
    score: scored.length ? sum / scored.length : 0,
    hit: daily.filter((h) => habitResult(h, entry) === 1).length,
    of: daily.length,
    loggedCount: scored.length,
    results,
    complete: scored.length === daily.length,
    /** Weekly-target habits are reported separately; they are not daily wins. */
    weekly: HABITS.filter((h) => h.type === 'weekly-count').map((h) => ({ key: h.key, doneToday: entry?.[h.key] === true })),
  };
}

/** How many times a weekly-count habit was logged in the week starting `weekStartIso`. */
export function weeklyCount(dailyMap, habitKey, weekStartIso) {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    if (dailyMap[addDays(weekStartIso, i)]?.[habitKey] === true) n++;
  }
  return n;
}

/**
 * Current streak for one habit, counting back from `endDate`.
 * A day only breaks the streak if it was logged and missed. An unlogged day
 * ends the count without punishing you for it - there is a difference between
 * "I did not do it" and "I did not write it down", and conflating them makes
 * the number meaningless.
 */
export function habitStreak(dailyMap, habitKey, endDate = todayIso()) {
  const habit = HABITS.find((h) => h.key === habitKey);
  if (!habit || habit.type === 'weekly-count') return 0;

  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const date = addDays(endDate, -i);
    const entry = dailyMap[date];
    const res = habitResult(habit, entry);
    if (res == null) {
      // Today not logged yet is not a break; anything earlier ends the count.
      if (i === 0) continue;
      break;
    }
    if (res >= 1) streak++;
    else break;
  }
  return streak;
}

/** Longest run of fully-logged days ending on or before `endDate`. */
export function loggingStreak(dailyMap, endDate = todayIso()) {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const date = addDays(endDate, -i);
    const entry = dailyMap[date];
    const anyLogged = entry && (entry.weightKg != null || HABIT_KEYS.some((k) => entry[k] != null && entry[k] !== false));
    if (!anyLogged) {
      if (i === 0) continue;
      break;
    }
    streak++;
  }
  return streak;
}

/** Adherence across one week, per habit and overall. */
export function weeklyAdherence(dailyMap, weekStartIso) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartIso, i));
  const entries = days.map((d) => dailyMap[d]).filter(Boolean);

  const perHabit = HABITS.map((habit) => {
    if (habit.type === 'weekly-count') {
      const sessions = weeklyCount(dailyMap, habit.key, weekStartIso);
      // A week with nothing logged is unknown, not zero sessions. Reporting 0%
      // for a week you simply did not fill in is a lie in the discouraging
      // direction, and the other habits already return null for the same reason.
      const mean = entries.length ? Math.min(1, sessions / habit.weeklyTargetMin) : null;
      return {
        key: habit.key,
        label: habit.label,
        icon: habit.icon,
        weekly: true,
        sessions,
        targetMin: habit.weeklyTargetMin,
        targetMax: habit.weeklyTargetMax,
        daysLogged: entries.length,
        daysHit: sessions,
        mean,
        pct: mean == null ? null : Math.round(mean * 100),
      };
    }

    const results = entries.map((e) => habitResult(habit, e)).filter((r) => r != null);
    const mean = results.length ? results.reduce((a, b) => a + b, 0) / results.length : null;
    return {
      key: habit.key,
      label: habit.label,
      icon: habit.icon,
      weekly: false,
      daysLogged: results.length,
      daysHit: results.filter((r) => r >= 1).length,
      mean,
      pct: mean == null ? null : Math.round(mean * 100),
    };
  });

  const overall = perHabit.filter((h) => h.mean != null);
  return {
    weekStart: weekStartIso,
    daysLogged: entries.length,
    perHabit,
    overallPct: overall.length ? Math.round((overall.reduce((a, h) => a + h.mean, 0) / overall.length) * 100) : null,
  };
}

/**
 * Rolling average of daily weights.
 *
 * This is the single most useful transformation in the whole app. Daily weight
 * moves on water, salt, gut content and cycle phase - swings of 1-2 kg with no
 * change in body fat are completely normal. The rolling average is what you
 * should actually read; the daily number is just an input to it.
 *
 * @param {Record<string, {weightKg:number|null}>} dailyMap
 * @param {object} [opts]
 * @param {number} [opts.window=7]
 * @param {string} [opts.endDate]
 * @param {number} [opts.days=90] how far back to build the series
 * @returns {{date:string, weight:number|null, average:number|null}[]}
 */
export function weightSeries(dailyMap, { window = 7, endDate = todayIso(), days = 90 } = {}) {
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    const raw = dailyMap[date]?.weightKg;
    const weight = raw == null || raw === '' ? null : Number(raw);

    const windowVals = [];
    for (let j = 0; j < window; j++) {
      const w = dailyMap[addDays(date, -j)]?.weightKg;
      if (w != null && w !== '') windowVals.push(Number(w));
    }
    // Require at least 3 readings before showing an average; 1-2 readings is
    // not an average, it is the same noisy number wearing a hat.
    const average = windowVals.length >= 3
      ? Math.round((windowVals.reduce((a, b) => a + b, 0) / windowVals.length) * 100) / 100
      : null;

    series.push({ date, weight, average });
  }
  return series;
}

/** Trend in kg/week from the rolling average, measured over `weeks`. */
export function weightTrend(dailyMap, { endDate = todayIso(), weeks = 3, window = 7 } = {}) {
  const series = weightSeries(dailyMap, { window, endDate, days: weeks * 7 + window });
  const withAvg = series.filter((s) => s.average != null);
  if (withAvg.length < 8) {
    return { kgPerWeek: null, weeksOfData: Math.floor(withAvg.length / 7), confidence: 'insufficient', first: null, last: null };
  }

  const first = withAvg[0];
  const last = withAvg[withAvg.length - 1];
  const spanDays = Math.max(1, daysBetween(first.date, last.date));
  const kgPerWeek = Math.round(((last.average - first.average) / spanDays) * 7 * 100) / 100;

  return {
    kgPerWeek,
    weeksOfData: Math.round((spanDays / 7) * 10) / 10,
    confidence: spanDays >= 21 ? 'good' : spanDays >= 14 ? 'moderate' : 'low',
    first,
    last,
    totalChange: Math.round((last.average - first.average) * 100) / 100,
  };
}

/** Blank weekly check-in. */
export function emptyWeekly(weekStartIso = weekStart(todayIso())) {
  return {
    weekStart: weekStartIso,
    mental: '',
    emotional: '',
    physical: '',
    wins: '',
    struggles: '',
    mealRequests: '',
    requestedMealIds: [],
    excludeMealIds: [],
    chestCm: null,
    waistCm: null,
    hipsCm: null,
    periodStartedThisWeek: false,
    periodStartDate: null,
    cycleSymptoms: [],
    energyRating: null,
    submittedAt: null,
  };
}

export const CYCLE_SYMPTOMS = [
  'Cramps', 'Bloating', 'Fatigue', 'Cravings', 'Low mood', 'Anxiety',
  'Headaches', 'Breast tenderness', 'Acne breakout', 'Poor sleep', 'Feeling great',
];

/** Change in measurements between two weekly check-ins. */
export function measurementDelta(current, previous) {
  if (!current || !previous) return null;
  const d = (a, b) => (a == null || b == null ? null : Math.round((a - b) * 10) / 10);
  const chest = d(current.chestCm, previous.chestCm);
  const waist = d(current.waistCm, previous.waistCm);
  const hips = d(current.hipsCm, previous.hipsCm);
  const parts = [chest, waist, hips].filter((x) => x != null);
  return {
    chest, waist, hips,
    total: parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) * 10) / 10 : null,
  };
}

/**
 * Is a photo check-in due? Every 4 weeks from the programme start.
 */
export function photoCheckinStatus(program, photos, onIso = todayIso()) {
  if (!program) return { due: false, weekNumber: 0, lastDone: null, nextDue: null };

  const elapsed = daysBetween(program.startDate, onIso);
  if (elapsed < 0) return { due: false, weekNumber: 0, lastDone: null, nextDue: addDays(program.startDate, 27) };

  const weekNumber = Math.floor(elapsed / 7) + 1;
  const dates = Object.keys(photos ?? {}).sort();
  const lastDone = dates.length ? dates[dates.length - 1] : null;

  // Due dates land at the end of weeks 4, 8, 12...
  const milestones = [];
  for (let w = 4; w <= program.totalWeeks + 4; w += 4) milestones.push(addDays(program.startDate, w * 7 - 1));

  const passed = milestones.filter((m) => daysBetween(m, onIso) >= -3); // window opens 3 days early
  const currentMilestone = passed.length ? passed[passed.length - 1] : null;
  const nextDue = milestones.find((m) => daysBetween(m, onIso) < -3) ?? null;

  const doneForThisMilestone = currentMilestone
    ? dates.some((d) => Math.abs(daysBetween(currentMilestone, d)) <= 7)
    : false;

  return {
    due: !!currentMilestone && !doneForThisMilestone,
    weekNumber,
    milestone: currentMilestone,
    lastDone,
    nextDue: doneForThisMilestone ? nextDue : currentMilestone ?? nextDue,
  };
}

/**
 * Turn a week of logged data into the observations a coach would actually make.
 * Deliberately concrete: no "great job, keep going".
 */
export function weeklyInsights({ adherence, trend, phase, targetWeeklyChangeKg, cycle }) {
  const notes = [];

  if (adherence?.daysLogged != null && adherence.daysLogged < 5) {
    notes.push({
      tone: 'warning',
      text: `Only ${adherence.daysLogged} of 7 days logged. The trend maths needs data to work with - aim for 6 out of 7 before reading anything into the numbers.`,
    });
  }

  const sleep = adherence?.perHabit.find((h) => h.key === 'sleep');
  if (sleep?.pct != null && sleep.pct < 70) {
    notes.push({
      tone: 'warning',
      text: `Sleep hit target on ${sleep.daysHit} of ${sleep.daysLogged} logged days. Of everything on this list, sleep is the one to fix first - it makes hunger, cravings and training all harder when it slips.`,
    });
  }

  const steps = adherence?.perHabit.find((h) => h.key === 'steps');
  if (steps?.pct != null && steps.pct < 70) {
    notes.push({
      tone: 'info',
      text: `Steps came in under target most days. Daily movement tends to drop quietly during a deficit - it is a common reason the scale stalls while intake has not changed at all.`,
    });
  }

  const trained = adherence?.perHabit.find((h) => h.key === 'trained');
  if (trained?.sessions != null && trained.pct != null) {
    if (trained.sessions >= trained.targetMin) {
      notes.push({ tone: 'good', text: `${trained.sessions} training sessions this week, against a target of ${trained.targetMin}-${trained.targetMax}. That is the single biggest thing protecting your muscle while you are in a deficit.` });
    } else if (trained.sessions === 0 && adherence.daysLogged >= 4) {
      notes.push({ tone: 'action', text: 'No training logged this week. In a deficit, resistance training is most of what decides whether the weight comes off fat or off muscle. If something is in the way, a shorter session beats a skipped one.' });
    } else {
      notes.push({ tone: 'info', text: `${trained.sessions} training session${trained.sessions === 1 ? '' : 's'} this week against a target of ${trained.targetMin}-${trained.targetMax}. Worth protecting the third one before you worry about anything else on this list.` });
    }
  }

  const water = adherence?.perHabit.find((h) => h.key === 'water');
  if (water?.pct != null && water.pct < 65) {
    notes.push({
      tone: 'info',
      text: `Water hit target on ${water.daysHit} of ${water.daysLogged} logged days. Worth fixing before you read anything into the scale - being under-hydrated moves daily weight around on its own, and it makes a high-fibre plan uncomfortable.`,
    });
  }

  const meal = adherence?.perHabit.find((h) => h.key === 'mealPlan');
  if (meal?.pct != null && meal.pct < 60) {
    notes.push({
      tone: 'action',
      text: `Meal plan adherence was ${meal.pct}%. That is a plan problem more often than a discipline problem - use this week's requests box to swap out whatever you kept skipping.`,
    });
  }

  if (trend?.kgPerWeek != null && targetWeeklyChangeKg != null && phase === 'deficit') {
    const gap = trend.kgPerWeek - targetWeeklyChangeKg;
    if (Math.abs(gap) < 0.15) {
      notes.push({ tone: 'good', text: `Trend is ${trend.kgPerWeek} kg/week against a ${targetWeeklyChangeKg} target. That is exactly where it should be - change nothing.` });
    } else if (gap > 0.25 && trend.confidence !== 'low') {
      notes.push({ tone: 'action', text: `Trend is ${trend.kgPerWeek} kg/week, slower than the ${targetWeeklyChangeKg} target. Before touching calories, check adherence and steps.` });
    } else if (gap < -0.25) {
      notes.push({ tone: 'warning', text: `Trend is ${trend.kgPerWeek} kg/week, faster than the ${targetWeeklyChangeKg} target. Faster is not better - it costs lean mass, and rapid loss is one of the things most likely to disrupt cycles.` });
    }
  }

  if (phase === 'maintenance' && trend?.kgPerWeek != null && Math.abs(trend.kgPerWeek) > 0.3) {
    notes.push({
      tone: 'info',
      text: `You are meant to be at maintenance but the trend is ${trend.kgPerWeek} kg/week. Your maintenance estimate is probably off by roughly ${Math.abs(Math.round((trend.kgPerWeek * 7700) / 7))} kcal/day. Worth correcting before the deficit block starts.`,
    });
  }

  if (cycle?.phase?.key === 'luteal') {
    notes.push({
      tone: 'info',
      text: 'You are in the luteal phase by the calendar estimate. Water retention here can hide real fat loss on the scale for a week or more. Compare this week against the same phase last cycle, not against last week.',
    });
  }

  if (!notes.length) {
    notes.push({ tone: 'good', text: 'Nothing is flagging. Habits and trend are both behaving - keep the week boring.' });
  }

  return notes;
}
