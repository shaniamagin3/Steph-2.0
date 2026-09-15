/**
 * App shell and router.
 *
 * Builds the shared context every view needs - profile targets, where you are
 * in the programme, the cycle estimate - then hands it to whichever view is
 * showing. Views render a string and wire their own events afterwards.
 */

import { mount, toHtml, esc } from './lib/ui.js';
import * as store from './lib/store.js';
import { computeTargets } from './lib/energy.js';
import { buildProgram, programStatus, nextStepAdvice } from './lib/program.js';
import { estimateCycle, todayIso, weekStart } from './lib/cycle.js';
import { photoCheckinStatus } from './lib/checkins.js';
import { showRecipe } from './views/plan.js';
import { applyTheme } from './views/data.js';

import * as today from './views/today.js';
import * as plan from './views/plan.js';
import * as weekly from './views/weekly.js';
import * as progress from './views/progress.js';
import * as photos from './views/photos.js';
import * as meals from './views/meals.js';
import * as setup from './views/setup.js';
import * as data from './views/data.js';

const VIEWS = { today, plan, weekly, progress, photos, meals, setup, data };
const ORDER = ['today', 'plan', 'weekly', 'progress', 'photos', 'meals', 'setup', 'data'];

/** Placeholder profile so the app is explorable before setup is done. */
const PLACEHOLDER = { sex: 'female', age: 32, heightCm: 165, weightKg: 75, activityKey: 'light', proteinGPerKg: 2.0, fatPctOfKcal: 0.30 };

let current = 'today';

function buildContext() {
  const state = store.getState();
  const complete = store.isProfileComplete(state);
  const profile = complete ? state.profile : { ...PLACEHOLDER, ...stripNulls(state.profile) };

  const program = state.program ?? buildProgram({
    startDate: state.programSettings.startDate ?? todayIso(),
    maintenanceWeeks: state.programSettings.maintenanceWeeks,
    deficitWeeks: state.programSettings.deficitWeeks,
    deficitPct: state.programSettings.deficitPct,
  });

  const status = programStatus(program, todayIso());
  const targetsFull = computeTargets(profile, status.phase, state.programSettings.deficitPct);

  // A manual override from a weekly check-in adjustment wins over the formula.
  const override = state.programSettings.manualKcalOverride;
  if (override && status.phase === 'deficit') {
    const adjusted = computeTargets(profile, 'maintenance', 0);
    targetsFull.kcal = override;
    Object.assign(targetsFull, {
      ...targetsFull,
      kcal: override,
      carbs: Math.max(0, Math.round((override - targetsFull.protein * 4 - targetsFull.fat * 9) / 4)),
    });
  }

  const cycle = estimateCycle({
    lastPeriodStart: state.cycle.periodStarts.at(-1) ?? null,
    cycleLength: state.cycle.cycleLength,
    periodLength: state.cycle.periodLength,
    irregular: state.cycle.irregular,
  });

  return {
    state,
    profile,
    profileComplete: complete,
    program,
    status,
    targets: { kcal: targetsFull.kcal, protein: targetsFull.protein, carbs: targetsFull.carbs, fat: targetsFull.fat, fibre: targetsFull.fibre },
    targetsFull,
    cycle,
    advice: nextStepAdvice(program, todayIso()),
    photoStatus: photoCheckinStatus(state.program, state.photos, todayIso()),
    rerender: render,
    navigate,
  };
}

function stripNulls(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== ''));
}

function navigate(view) {
  if (!VIEWS[view]) return;
  current = view;
  location.hash = view;
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderNav(ctx) {
  const state = ctx.state;
  const ws = weekStart(todayIso());
  const badges = {
    today: !state.daily[todayIso()],
    weekly: !state.weekly[ws]?.submittedAt,
    photos: ctx.photoStatus?.due,
    setup: !ctx.profileComplete,
  };

  return ORDER.map((key) => `
    <button data-nav="${key}" ${current === key ? 'aria-current="page"' : ''}>
      ${esc(VIEWS[key].title)}${badges[key] ? '<span class="dot" aria-label="needs attention"></span>' : ''}
    </button>`).join('');
}

function render() {
  const ctx = buildContext();
  const view = VIEWS[current];

  const nav = document.querySelector('.nav');
  nav.innerHTML = renderNav(ctx);
  nav.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.nav)));

  const pill = document.querySelector('[data-phase-pill]');
  if (pill) {
    pill.textContent = ctx.status.status === 'complete'
      ? 'Programme complete'
      : `${ctx.status.meta.label} · week ${ctx.status.weekOverall} of ${ctx.program.totalWeeks}`;
  }

  const main = document.querySelector('main');
  mount(main, view.render(ctx));
  view.afterRender?.(main, ctx);

  // Shared handlers any view can use.
  main.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.go)));
  main.querySelectorAll('[data-recipe]').forEach((b) => {
    if (b.dataset.wired) return;
    b.dataset.wired = '1';
    b.addEventListener('click', () => showRecipe(b.dataset.recipe, Number(b.dataset.servings || 1)));
  });
}

export function start() {
  const state = store.load();
  applyTheme(state.settings.theme);

  const hash = location.hash.slice(1);
  if (VIEWS[hash]) current = hash;
  else if (!store.isProfileComplete(state)) current = 'setup';

  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (VIEWS[h] && h !== current) { current = h; render(); }
  });

  render();
}
