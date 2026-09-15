/**
 * Menstrual cycle phase estimation.
 *
 * IMPORTANT HONESTY NOTE, and the app surfaces this too:
 * this is calendar arithmetic, not physiology. It assumes a regular cycle with
 * ovulation roughly 14 days before the next bleed. In PCOS, irregular and
 * anovulatory cycles are common, which is precisely the case where this
 * estimate is least reliable. Treat the output as a prompt for reflection
 * ("does this match how I actually feel?"), never as a fact about your hormones.
 */

export const PHASES = {
  menstrual: {
    key: 'menstrual',
    label: 'Menstrual',
    blurb: 'Bleed days. Energy and training tolerance are often lower.',
    coaching: 'Keep protein up and do not panic about the scale - iron losses and bloating both distort it. Gentle movement counts.',
  },
  follicular: {
    key: 'follicular',
    label: 'Follicular',
    blurb: 'After the bleed, before ovulation. Often the best-feeling stretch.',
    coaching: 'Usually the easiest window for adherence and for pushing training. Good week to bank habit streaks.',
  },
  ovulatory: {
    key: 'ovulatory',
    label: 'Ovulatory',
    blurb: 'Around the mid-cycle window.',
    coaching: 'Appetite and energy are often high. Strength usually feels good here.',
  },
  luteal: {
    key: 'luteal',
    label: 'Luteal',
    blurb: 'After ovulation, before the next bleed.',
    coaching: 'Cravings, water retention and a flatter mood are commonly reported. Expect the scale to drift up without fat gain, and let the weekly average carry the read.',
  },
  unknown: {
    key: 'unknown',
    label: 'Not enough data',
    blurb: 'Log a period start date to estimate your phase.',
    coaching: 'No estimate available yet.',
  },
};

const DAY_MS = 86400000;

/** Whole days between two ISO date strings (b - a). */
export function daysBetween(aIso, bIso) {
  const a = Date.parse(`${aIso}T00:00:00Z`);
  const b = Date.parse(`${bIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) throw new RangeError('daysBetween: invalid ISO date');
  return Math.round((b - a) / DAY_MS);
}

export function addDays(iso, n) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) throw new RangeError('addDays: invalid ISO date');
  return new Date(t + n * DAY_MS).toISOString().slice(0, 10);
}

export function todayIso(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Estimate cycle day and phase.
 *
 * @param {object} p
 * @param {string} p.lastPeriodStart  ISO date
 * @param {number} [p.cycleLength]    default 28
 * @param {number} [p.periodLength]   default 5
 * @param {string} [p.onIso]          date to evaluate, default today
 * @param {boolean} [p.irregular]     user has flagged irregular cycles
 */
export function estimateCycle({ lastPeriodStart, cycleLength = 28, periodLength = 5, onIso = todayIso(), irregular = false }) {
  if (!lastPeriodStart) {
    return { day: null, phase: PHASES.unknown, confidence: 'none', nextPeriodDue: null, caveats: ['No period start logged yet.'] };
  }

  const len = Math.max(15, Math.min(90, Math.round(cycleLength)));
  const bleed = Math.max(1, Math.min(10, Math.round(periodLength)));

  const elapsed = daysBetween(lastPeriodStart, onIso);
  if (elapsed < 0) {
    return { day: null, phase: PHASES.unknown, confidence: 'none', nextPeriodDue: null, caveats: ['Period start date is in the future.'] };
  }

  const cyclesElapsed = Math.floor(elapsed / len);
  const day = (elapsed % len) + 1;

  // Ovulation is modelled as a fixed ~14 days before the next bleed, which is
  // the more stable half of the cycle in regular cyclers.
  const ovulationDay = Math.max(bleed + 2, len - 14);

  let phase;
  if (day <= bleed) phase = PHASES.menstrual;
  else if (day < ovulationDay - 1) phase = PHASES.follicular;
  else if (day <= ovulationDay + 1) phase = PHASES.ovulatory;
  else phase = PHASES.luteal;

  const caveats = [];
  let confidence = 'moderate';

  if (irregular) {
    confidence = 'low';
    caveats.push('You have flagged irregular cycles. Calendar-based phase estimates assume regularity, so treat this as a rough prompt only.');
  }
  if (cyclesElapsed >= 1) {
    confidence = 'low';
    caveats.push(`Your last logged period start was ${elapsed} days ago, which spans more than one predicted cycle. Log the most recent start to refresh this.`);
  }
  if (elapsed > len + 10) {
    caveats.push('Your period is more than 10 days later than predicted. Worth noting in your weekly check-in - and worth raising with your doctor if it repeats.');
  }

  return {
    day,
    phase,
    confidence,
    ovulationDay,
    cycleLength: len,
    nextPeriodDue: addDays(lastPeriodStart, (cyclesElapsed + 1) * len),
    caveats,
  };
}

/**
 * Average cycle length from a history of logged period start dates.
 * Returns null until there are at least two starts to measure between.
 */
export function averageCycleLength(periodStarts) {
  const sorted = [...new Set(periodStarts)].sort();
  if (sorted.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1], sorted[i]));
  const usable = gaps.filter((g) => g >= 15 && g <= 90);
  if (!usable.length) return null;
  const mean = usable.reduce((a, b) => a + b, 0) / usable.length;
  const variance = usable.reduce((a, b) => a + (b - mean) ** 2, 0) / usable.length;
  return {
    mean: Math.round(mean),
    min: Math.min(...usable),
    max: Math.max(...usable),
    stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
    samples: usable.length,
    /** A common clinical rule of thumb for "irregular" is variation beyond ~7-9 days. */
    likelyIrregular: Math.max(...usable) - Math.min(...usable) > 8,
  };
}

/** ISO date of the Monday starting the week containing `iso`. */
export function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -dow);
}

/** A stable identifier for a week, e.g. "2026-09-14". */
export function weekKey(iso) {
  return weekStart(iso);
}
