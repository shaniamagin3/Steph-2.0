/**
 * Energy and macronutrient maths.
 *
 * Every number produced here is an ESTIMATE from a population-level equation.
 * Individual metabolic rate varies meaningfully around these predictions, which
 * is exactly why the app tracks real weight trend and adjusts from observed data
 * (see `adjustTargetFromTrend`) rather than trusting the formula forever.
 *
 * See docs/NUTRITION.md for sourcing and confidence levels.
 */

export const ACTIVITY_LEVELS = {
  sedentary:   { key: 'sedentary',   label: 'Sedentary',        multiplier: 1.20, hint: 'Desk job, little deliberate movement, under ~4k steps' },
  light:       { key: 'light',       label: 'Lightly active',   multiplier: 1.375, hint: 'Light training 1-3x/week, ~5-8k steps' },
  moderate:    { key: 'moderate',    label: 'Moderately active', multiplier: 1.55, hint: 'Training 3-5x/week, ~8-12k steps' },
  very:        { key: 'very',        label: 'Very active',      multiplier: 1.725, hint: 'Hard training 6-7x/week, or physical job' },
  extra:       { key: 'extra',       label: 'Extremely active', multiplier: 1.90, hint: 'Two-a-day training, or heavy manual labour' },
};

/** Hard floors. Going below these is not a faster result, it is a worse one. */
export const SAFETY = {
  /** Absolute kcal floor for adult women in self-directed dieting. */
  minDailyKcal: 1200,
  /** Never program below estimated BMR for a sustained block. */
  neverBelowBmr: true,
  /** Deficit percentage bounds. */
  minDeficitPct: 0.05,
  maxDeficitPct: 0.25,
  /** Fat floor in g/kg of the protein basis weight - relevant to hormone health. */
  minFatGPerKg: 0.8,
  /** Fibre target range in grams. */
  fibreMin: 25,
  fibreMax: 38,
};

const round = (n, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Mifflin-St Jeor basal metabolic rate.
 * Mifflin MD, St Jeor ST, et al., "A new predictive equation for resting energy
 * expenditure in healthy individuals", Am J Clin Nutr 1990;51(2):241-7.
 *
 * @param {{sex:'female'|'male', weightKg:number, heightCm:number, age:number}} p
 * @returns {number} kcal/day
 */
export function bmrMifflinStJeor({ sex, weightKg, heightCm, age }) {
  if (!(weightKg > 0) || !(heightCm > 0) || !(age > 0)) {
    throw new RangeError('bmr: weightKg, heightCm and age must all be positive');
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * Total daily energy expenditure = BMR x activity multiplier.
 * @param {number} bmr
 * @param {keyof ACTIVITY_LEVELS} activityKey
 */
export function tdee(bmr, activityKey) {
  const level = ACTIVITY_LEVELS[activityKey];
  if (!level) throw new RangeError(`tdee: unknown activity level "${activityKey}"`);
  return round(bmr * level.multiplier);
}

export function bmi(weightKg, heightCm) {
  const m = heightCm / 100;
  return round(weightKg / (m * m), 1);
}

/**
 * The bodyweight used as the basis for protein and fat targets.
 *
 * Protein guidelines in g/kg were largely derived in lean-to-overweight
 * populations. Scaling them off total bodyweight at a high BMI overshoots,
 * because fat mass has little protein requirement. Above BMI 27 we therefore
 * use the weight that would put this person at BMI 25 instead. This is a
 * practical convention, not a validated equation - see docs/NUTRITION.md.
 */
export function proteinBasisKg(weightKg, heightCm) {
  const m = heightCm / 100;
  const currentBmi = weightKg / (m * m);
  if (currentBmi <= 27) return round(weightKg, 1);
  return round(25 * m * m, 1);
}

/**
 * Daily calorie target for a programme phase.
 *
 * @param {object} p
 * @param {number} p.tdee            maintenance estimate
 * @param {number} p.bmr             basal rate, used as a floor
 * @param {'maintenance'|'deficit'} p.phase
 * @param {number} [p.deficitPct]    fraction below maintenance, e.g. 0.18
 * @returns {{kcal:number, requested:number, floored:boolean, floorReason:string|null, effectiveDeficitPct:number}}
 */
export function calorieTarget({ tdee: maintenance, bmr, phase, deficitPct = 0.18, minKcal = null }) {
  if (phase === 'maintenance') {
    return {
      kcal: round(maintenance),
      requested: round(maintenance),
      floored: false,
      floorReason: null,
      belowBmr: false,
      effectiveDeficitPct: 0,
    };
  }

  const pct = clamp(deficitPct, SAFETY.minDeficitPct, SAFETY.maxDeficitPct);
  const requested = round(maintenance * (1 - pct));

  // A floor you have set yourself, from your own history, beats the equation's
  // guess at your BMR. You know what you have actually eaten; Mifflin-St Jeor
  // does not. The absolute floor still applies, and going under your estimated
  // BMR is still flagged - it is just flagged rather than silently overridden.
  const userFloor = minKcal != null && minKcal >= SAFETY.minDailyKcal ? round(minKcal) : null;
  const hardFloor = SAFETY.minDailyKcal;
  const bmrFloor = SAFETY.neverBelowBmr && userFloor == null ? bmr : 0;
  const floor = Math.max(hardFloor, bmrFloor, userFloor ?? 0);

  const kcal = requested < floor ? round(floor) : requested;
  const floored = requested < floor;

  let floorReason = null;
  if (floored) {
    if (userFloor != null && floor === userFloor) {
      floorReason = `A ${Math.round(pct * 100)}% deficit works out at ${requested} kcal, below the ${userFloor} kcal floor you set. Raised to your floor.`;
    } else if (floor === bmr) {
      floorReason = `A ${Math.round(pct * 100)}% deficit would land below your estimated BMR (${bmr} kcal). Raised to BMR.`;
    } else {
      floorReason = `A ${Math.round(pct * 100)}% deficit would land below ${SAFETY.minDailyKcal} kcal. Raised to the floor.`;
    }
  }

  return {
    kcal,
    requested,
    floored,
    floorReason,
    belowBmr: kcal < bmr,
    userFloor,
    effectiveDeficitPct: round(1 - kcal / maintenance, 3),
  };
}

/**
 * Split a calorie target into protein / fat / carbohydrate.
 *
 * Protein is set first (it is the target that matters most for retaining lean
 * mass in a deficit and for satiety), fat second against a hormone-health floor,
 * and carbohydrate takes whatever remains.
 *
 * @param {object} p
 * @param {number} p.kcal
 * @param {number} p.weightKg
 * @param {number} p.heightCm
 * @param {number} [p.proteinGPerKg]  default 2.0, sane range 1.6-2.4
 * @param {number} [p.fatPctOfKcal]   default 0.30
 * @returns {{kcal:number, protein:number, fat:number, carbs:number, fibre:number,
 *            proteinBasisKg:number, warnings:string[]}}
 */
export function macroTargets({ kcal, weightKg, heightCm, proteinGPerKg = 2.0, fatPctOfKcal = 0.30 }) {
  const warnings = [];
  const basis = proteinBasisKg(weightKg, heightCm);

  let protein = round(clamp(proteinGPerKg, 1.2, 3.0) * basis);
  let fat = round((clamp(fatPctOfKcal, 0.15, 0.45) * kcal) / 9);

  const fatFloor = round(SAFETY.minFatGPerKg * basis);
  if (fat < fatFloor) {
    fat = fatFloor;
    warnings.push(`Fat raised to ${fatFloor}g (${SAFETY.minFatGPerKg}g/kg floor). Very low fat intakes are a poor idea when hormone health is the point.`);
  }

  // If protein + fat already exceed the budget, protein yields first: a target
  // you cannot eat is not a target.
  let carbKcal = kcal - protein * 4 - fat * 9;
  if (carbKcal < 0) {
    const overflow = -carbKcal;
    const proteinCut = Math.min(protein - 1.4 * basis, overflow / 4);
    if (proteinCut > 0) {
      protein = round(protein - proteinCut);
      carbKcal = kcal - protein * 4 - fat * 9;
    }
  }

  let carbs = round(Math.max(0, carbKcal) / 4);

  if (carbs < 80) {
    warnings.push(`Carbohydrate lands at ${carbs}g. That is low - if energy, sleep or training quality drops, take protein down toward 1.6g/kg to buy carbs back.`);
  }
  if (kcal - (protein * 4 + fat * 9 + carbs * 4) < -25) {
    warnings.push('Macro split slightly exceeds the calorie target; treat calories as the binding constraint.');
  }

  const fibre = clamp(round(kcal / 1000 * 14), SAFETY.fibreMin, SAFETY.fibreMax);

  return { kcal: round(kcal), protein, fat, carbs, fibre, proteinBasisKg: basis, warnings };
}

/** kcal implied by a macro triple. Useful for validating meal data. */
export function kcalFromMacros({ protein = 0, carbs = 0, fat = 0 }) {
  return protein * 4 + carbs * 4 + fat * 9;
}

/**
 * Build the full target set for a profile in a given phase, in one call.
 */
export function computeTargets(profile, phase, deficitPct) {
  const bmr = bmrMifflinStJeor(profile);
  const predicted = tdee(bmr, profile.activityKey);

  // If you already know your maintenance from experience, that beats the
  // equation. The equation is a population prediction; your own history of
  // eating a known intake and watching the scale is a measurement.
  const known = Number(profile.knownMaintenanceKcal) || null;
  const maintenance = known ?? predicted;

  const cal = calorieTarget({
    tdee: maintenance, bmr, phase, deficitPct,
    minKcal: Number(profile.minKcal) || null,
  });
  const macros = macroTargets({
    kcal: cal.kcal,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    proteinGPerKg: profile.proteinGPerKg,
    fatPctOfKcal: profile.fatPctOfKcal,
  });
  const warnings = [...macros.warnings];
  if (cal.floorReason) warnings.push(cal.floorReason);
  if (cal.belowBmr) {
    warnings.push(`This target (${cal.kcal} kcal) is below your estimated BMR of ${bmr} kcal. That estimate comes from a population equation and can be out by a few hundred calories either way, so it is not automatically wrong - but it is worth knowing. If energy, sleep, training or your cycle start suffering, eat more rather than pushing through.`);
  }
  if (known && Math.abs(known - predicted) > predicted * 0.12) {
    warnings.push(`Your stated maintenance (${known} kcal) differs from the equation's prediction (${predicted} kcal) by more than 12%. Yours is being used, which is right if it came from actually tracking. If it was a guess, the maintenance block will settle it.`);
  }

  return {
    bmr,
    maintenance,
    predictedMaintenance: predicted,
    usingKnownMaintenance: !!known,
    phase,
    bmi: bmi(profile.weightKg, profile.heightCm),
    ...cal,
    ...macros,
    warnings,
  };
}

/**
 * Compare the observed weight trend against what the prescribed deficit
 * predicted, and suggest a calorie correction.
 *
 * The 7700 kcal per kg figure is the conventional planning approximation for
 * body-mass energy density. It is a rule of thumb, not a law: early water-weight
 * shifts and adaptive changes both break it. That is why this returns a bounded
 * nudge and requires at least two weeks of data, rather than solving for an
 * exact number.
 *
 * @param {object} p
 * @param {number} p.currentKcal
 * @param {number} p.weeklyChangeKg  negative = losing
 * @param {number} p.targetWeeklyChangeKg
 * @param {number} p.weeksOfData
 * @returns {{action:'hold'|'reduce'|'increase', suggestedKcal:number, deltaKcal:number, rationale:string}}
 */
export function adjustTargetFromTrend({ currentKcal, weeklyChangeKg, targetWeeklyChangeKg, weeksOfData }) {
  const KCAL_PER_KG = 7700;

  if (weeksOfData < 2) {
    return {
      action: 'hold',
      suggestedKcal: currentKcal,
      deltaKcal: 0,
      rationale: 'Fewer than two weeks of weigh-ins. Day-to-day water shifts are larger than the signal you are looking for - keep going and reassess.',
    };
  }

  const gapKg = weeklyChangeKg - targetWeeklyChangeKg; // positive = losing too slowly
  const rawDelta = -(gapKg * KCAL_PER_KG) / 7;
  // Cap any single adjustment; large jumps overshoot and destroy adherence.
  const cap = Math.max(100, Math.round(currentKcal * 0.10));
  const deltaKcal = round(clamp(rawDelta, -cap, cap) / 10) * 10;

  if (Math.abs(gapKg) < 0.15) {
    return {
      action: 'hold',
      suggestedKcal: currentKcal,
      deltaKcal: 0,
      rationale: `Trend is ${weeklyChangeKg.toFixed(2)} kg/week against a target of ${targetWeeklyChangeKg.toFixed(2)}. That is within normal noise - hold and keep collecting data.`,
    };
  }

  return {
    action: deltaKcal < 0 ? 'reduce' : 'increase',
    suggestedKcal: round(currentKcal + deltaKcal),
    deltaKcal,
    rationale: gapKg > 0
      ? `Losing ${Math.abs(weeklyChangeKg).toFixed(2)} kg/week versus a ${Math.abs(targetWeeklyChangeKg).toFixed(2)} target over ${weeksOfData} weeks. Before cutting calories, check adherence and step count - an intake or activity drift is the more common cause than metabolism.`
      : `Losing ${Math.abs(weeklyChangeKg).toFixed(2)} kg/week, faster than the ${Math.abs(targetWeeklyChangeKg).toFixed(2)} target over ${weeksOfData} weeks. Faster is not better here - it costs lean mass and, in PCOS, tends to cost cycle regularity too.`,
  };
}

/** Target weekly weight change implied by a calorie deficit. */
export function projectedWeeklyChangeKg(maintenanceKcal, targetKcal) {
  return round(((targetKcal - maintenanceKcal) * 7) / 7700, 2);
}
