/**
 * The programme: a maintenance block, then a deficit block.
 *
 * Default shape is 2 weeks maintenance followed by 8-12 weeks in a deficit.
 * The maintenance block up front is not filler - it establishes a real
 * maintenance calorie number from observed weight data, so the deficit that
 * follows is subtracted from something measured rather than something predicted.
 */

import { addDays, daysBetween, todayIso, weekStart, weekKey } from './cycle.js';

export { weekStart, weekKey };

export const PHASE_META = {
  maintenance: {
    key: 'maintenance',
    label: 'Maintenance',
    purpose: 'Establish your true maintenance intake and get the habits running before anything gets harder.',
    scaleExpectation: 'Weight should be roughly flat. A 1-2 kg swing across the fortnight is water and gut content, not fat.',
  },
  deficit: {
    key: 'deficit',
    label: 'Deficit',
    purpose: 'Run a moderate, sustainable energy deficit while protein and training protect lean mass.',
    scaleExpectation: 'Expect the weekly average to fall gradually. Individual days will go up. That is normal.',
  },
};

export const DEFAULTS = {
  maintenanceWeeks: 2,
  deficitWeeks: 10,   // user-selectable 8-12
  deficitPct: 0.18,
};

export function buildProgram({
  startDate = todayIso(),
  maintenanceWeeks = DEFAULTS.maintenanceWeeks,
  deficitWeeks = DEFAULTS.deficitWeeks,
  deficitPct = DEFAULTS.deficitPct,
} = {}) {
  const mw = Math.max(1, Math.min(6, Math.round(maintenanceWeeks)));
  const dw = Math.max(4, Math.min(16, Math.round(deficitWeeks)));

  const blocks = [
    {
      phase: 'maintenance',
      weeks: mw,
      startDate,
      endDate: addDays(startDate, mw * 7 - 1),
      deficitPct: 0,
    },
    {
      phase: 'deficit',
      weeks: dw,
      startDate: addDays(startDate, mw * 7),
      endDate: addDays(startDate, (mw + dw) * 7 - 1),
      deficitPct,
    },
  ];

  return {
    startDate,
    endDate: blocks[blocks.length - 1].endDate,
    totalWeeks: mw + dw,
    deficitPct,
    blocks,
  };
}

/**
 * Where are we today?
 * @returns {{phase:string, block:object|null, weekInBlock:number, weekOverall:number,
 *            dayOverall:number, weeksRemainingInBlock:number, status:string, meta:object}}
 */
export function programStatus(program, onIso = todayIso()) {
  if (!program) return { phase: 'maintenance', block: null, weekInBlock: 1, weekOverall: 1, dayOverall: 1, weeksRemainingInBlock: 0, status: 'not-started', meta: PHASE_META.maintenance };

  const dayOffset = daysBetween(program.startDate, onIso);

  if (dayOffset < 0) {
    return { phase: program.blocks[0].phase, block: program.blocks[0], weekInBlock: 0, weekOverall: 0, dayOverall: dayOffset + 1, weeksRemainingInBlock: program.blocks[0].weeks, status: 'not-started', meta: PHASE_META[program.blocks[0].phase] };
  }

  let cursor = 0;
  for (const block of program.blocks) {
    const blockDays = block.weeks * 7;
    if (dayOffset < cursor + blockDays) {
      const dayInBlock = dayOffset - cursor;
      const weekInBlock = Math.floor(dayInBlock / 7) + 1;
      return {
        phase: block.phase,
        block,
        weekInBlock,
        weekOverall: Math.floor(dayOffset / 7) + 1,
        dayOverall: dayOffset + 1,
        weeksRemainingInBlock: block.weeks - weekInBlock,
        status: 'active',
        meta: PHASE_META[block.phase],
      };
    }
    cursor += blockDays;
  }

  const last = program.blocks[program.blocks.length - 1];
  return {
    phase: last.phase,
    block: last,
    weekInBlock: last.weeks,
    weekOverall: program.totalWeeks,
    dayOverall: dayOffset + 1,
    weeksRemainingInBlock: 0,
    status: 'complete',
    meta: PHASE_META[last.phase],
  };
}

/** Is this week a scheduled photo check-in week? Every 4 weeks from the start. */
export function isPhotoWeek(program, onIso = todayIso()) {
  const st = programStatus(program, onIso);
  if (st.status === 'not-started') return false;
  return st.weekOverall % 4 === 0;
}

/**
 * Post-deficit guidance. A deficit block that just stops is how people bounce.
 */
export function nextStepAdvice(program, onIso = todayIso()) {
  const st = programStatus(program, onIso);
  if (st.status === 'complete') {
    return {
      headline: 'Deficit block complete.',
      body: 'Do not jump straight back to your old intake. Reverse in steps of roughly 100-150 kcal per week back to your new maintenance, and hold there for at least 4 weeks before considering another deficit block. Your maintenance is lower now simply because you are lighter - recalculate it on the Profile tab with your current weight.',
    };
  }
  if (st.phase === 'deficit' && st.weeksRemainingInBlock <= 1) {
    return {
      headline: 'Final week of the deficit block.',
      body: 'Plan the exit now. Next up should be a maintenance phase, not a free-for-all. Recalculate maintenance at your current weight before you start it.',
    };
  }
  if (st.phase === 'maintenance' && st.weeksRemainingInBlock <= 0) {
    return {
      headline: 'Maintenance block wrapping up.',
      body: 'Check your two-week average weight. If it barely moved, your maintenance estimate is good and the deficit will be accurate. If it moved more than about 1 kg either way, adjust maintenance before the deficit starts.',
    };
  }
  return null;
}
