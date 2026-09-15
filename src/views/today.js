/**
 * Today: the screen you open every morning.
 *
 * Order is deliberate - weigh-in first (do it before you have eaten and before
 * you have thought about it), then what you are eating, then the habits.
 */

import { html, raw, esc, fmt, numVal, debounce, toast } from '../lib/ui.js';
import { HABITS, habitResult, dailyScore, habitStreak, loggingStreak, weightSeries, weightTrend } from '../lib/checkins.js';
import { getMeal } from '../lib/registry.js';
import { mealMacros } from '../lib/nutrition.js';
import { SLOT_META } from '../data/meals.js';
import { macroBar } from '../lib/charts.js';
import * as store from '../lib/store.js';
import { todayIso, weekStart } from '../lib/cycle.js';

export const title = 'Today';

export function render(ctx) {
  const { state, targets, status, cycle, photoStatus } = ctx;
  const date = todayIso();
  const entry = state.daily[date] ?? {};
  const score = dailyScore(entry);

  const plan = state.plans[weekStart(date)];
  const planDay = plan?.days.find((d) => d.date === date);

  const series = weightSeries(state.daily, { endDate: date, days: 30 });
  const latestAvg = [...series].reverse().find((s) => s.average != null);
  const trend = weightTrend(state.daily, { endDate: date });

  return html`
    ${raw(nudges(ctx, date))}

    <div class="grid grid--2">
      ${raw(weighInCard(entry, latestAvg, trend, status))}
      ${raw(cycleCard(cycle, state))}
    </div>

    ${raw(planDay ? todaysMealsCard(planDay, targets) : noPlanCard())}

    <div class="card">
      <div class="card__head">
        <div>
          <h2>Daily check-in</h2>
          <p class="card__sub">${score.hit} of ${score.of} hit${score.complete ? '' : ` &middot; ${raw(String(score.of - score.loggedCount))} still to log`}</p>
        </div>
        <div class="badge-row">
          <span class="badge ${raw(score.score >= 0.8 ? 'badge--good' : score.score >= 0.5 ? 'badge--warn' : '')}">${Math.round(score.score * 100)}%</span>
          ${raw(loggingStreak(state.daily, date) > 1 ? `<span class="badge badge--accent">${loggingStreak(state.daily, date)}-day logging streak</span>` : '')}
        </div>
      </div>
      <div data-habits>
        ${raw(HABITS.map((h) => habitRow(h, entry, state.daily, date)).join(''))}
      </div>

      <div class="field mt16">
        <label for="daily-notes">Anything worth remembering about today?</label>
        <textarea id="daily-notes" data-field="notes" placeholder="Energy, cravings, training, mood, what got in the way."
          style="min-height:70px">${entry.notes ?? ''}</textarea>
        <p class="hint">Saved automatically. This is what you will read back at your weekly check-in.</p>
      </div>
    </div>
  `;
}

function nudges(ctx, date) {
  const { state, status, photoStatus, advice } = ctx;
  const out = [];

  if (status.status === 'complete') {
    out.push(`<div class="note note--action"><b>${esc(advice?.headline ?? 'Programme complete.')}</b><br>${esc(advice?.body ?? '')}</div>`);
  } else if (advice) {
    out.push(`<div class="note note--info"><b>${esc(advice.headline)}</b><br>${esc(advice.body)}</div>`);
  }

  const ws = weekStart(date);
  const weeklyDone = state.weekly[ws]?.submittedAt;
  const dow = new Date(`${date}T00:00:00`).getDay(); // 0 = Sunday
  if (!weeklyDone && (dow === 0 || dow === 6)) {
    out.push(`<div class="note note--action"><b>Weekly check-in is open.</b> Fifteen minutes now sets up next week's meal plan and gives the trend maths something to work with. <button class="btn btn--sm btn--primary" data-go="weekly" style="margin-left:6px">Do it now</button></div>`);
  }

  if (photoStatus?.due) {
    out.push(`<div class="note note--action"><b>Photo check-in due.</b> Four weeks since the last one. Same light, same spot, same time of day. <button class="btn btn--sm" data-go="photos" style="margin-left:6px">Take them</button></div>`);
  }

  return out.join('');
}

function weighInCard(entry, latestAvg, trend, status) {
  const trendText = trend.kgPerWeek == null
    ? 'Not enough data yet for a trend.'
    : `${fmt.signed(trend.kgPerWeek, 2, ' kg')}/week over ${trend.weeksOfData} weeks (${trend.confidence} confidence)`;

  return `
  <div class="card">
    <div class="card__head">
      <div><h2>Morning weigh-in</h2>
      <p class="card__sub">After the bathroom, before food, same conditions daily.</p></div>
    </div>

    <div class="flex" style="align-items:flex-end;gap:14px">
      <div style="flex:1;min-width:120px">
        <label for="weight-input">Today</label>
        <input id="weight-input" type="number" inputmode="decimal" step="0.1" min="20" max="400"
          data-field="weightKg" value="${entry.weightKg ?? ''}" placeholder="0.0" style="font-size:1.3rem;font-weight:650">
      </div>
      <div class="stat stat--accent" style="flex:1;min-width:130px">
        <div class="stat__label">7-day average</div>
        <div class="stat__value">${latestAvg?.average != null ? latestAvg.average.toFixed(2) : '-'}<small>kg</small></div>
        <div class="stat__note">${esc(trendText)}</div>
      </div>
    </div>

    <div class="note" style="margin-top:14px;margin-bottom:0">
      Read the <b>average</b>, not today's number. Daily weight swings 1&ndash;2 kg on water, salt and gut content alone.
      ${status.phase === 'maintenance' ? ' During maintenance a flat average is a <b>win</b>, not a stall.' : ''}
    </div>
  </div>`;
}

function cycleCard(cycle, state) {
  const p = cycle.phase;
  const caveats = cycle.caveats?.length
    ? `<div class="note note--warn small" style="margin:10px 0 0">${cycle.caveats.map(esc).join('<br>')}</div>` : '';

  return `
  <div class="card">
    <div class="card__head">
      <div><h2>Cycle</h2>
      <p class="card__sub">Calendar estimate &mdash; not a measurement.</p></div>
      ${cycle.day ? `<span class="badge badge--accent">Day ${cycle.day}</span>` : ''}
    </div>

    <div class="stat" style="margin-bottom:10px">
      <div class="stat__label">Estimated phase</div>
      <div class="stat__value" style="font-size:1.25rem">${esc(p.label)}</div>
      <div class="stat__note">${esc(p.blurb)}</div>
    </div>

    <p class="small" style="margin-bottom:8px">${esc(p.coaching)}</p>
    ${cycle.nextPeriodDue ? `<p class="tiny muted">Next period predicted ${esc(fmt.date(cycle.nextPeriodDue))}.</p>` : ''}
    ${caveats}

    <div class="btn-row" style="margin-top:12px">
      <button class="btn btn--sm" data-action="log-period">Period started today</button>
      <button class="btn btn--sm btn--ghost" data-go="setup">Cycle settings</button>
    </div>
  </div>`;
}

function todaysMealsCard(planDay, targets) {
  const rows = planDay.entries.map((e) => {
    const meal = getMeal(e.mealId);
    if (!meal) return '';
    const m = mealMacros(meal, e.servings);
    return `
      <div class="meal-row">
        <div class="meal-row__slot">${esc(SLOT_META[e.slot]?.label ?? e.slot)}</div>
        <div class="meal-row__body">
          <div class="meal-row__name">${esc(meal.name)}${e.servings !== 1 ? ` <span class="muted tiny">&times;${e.servings}</span>` : ''}</div>
          <div class="meal-row__meta">${m.kcal} kcal &middot; ${m.protein.toFixed(0)}g protein &middot; ${m.carbs.toFixed(0)}g carbs &middot; ${m.fat.toFixed(0)}g fat</div>
        </div>
        <div class="meal-row__actions">
          <button class="btn btn--sm btn--ghost" data-recipe="${esc(e.mealId)}" data-servings="${e.servings}">Recipe</button>
        </div>
      </div>`;
  }).join('');

  const t = planDay.totals;
  return `
  <div class="card card--flush">
    <div class="day-card__head">
      <div class="day-card__title">Today's plan
        <span class="day-card__date">${esc(planDay.dayName)}</span>
      </div>
      <div class="day-card__macros">
        <span><b>${t.kcal}</b> kcal</span>
        <span><b>${t.protein.toFixed(0)}</b>g protein</span>
        <span><b>${t.fibre.toFixed(0)}</b>g fibre</span>
      </div>
    </div>
    ${rows}
    <div style="padding:15px;border-top:1px solid var(--border)">
      ${macroBar('Calories', t.kcal, targets.kcal, ' kcal')}
      ${macroBar('Protein', t.protein, targets.protein)}
      ${macroBar('Carbohydrate', t.carbs, targets.carbs)}
      ${macroBar('Fat', t.fat, targets.fat)}
      ${macroBar('Fibre', t.fibre, targets.fibre)}
    </div>
  </div>`;
}

function noPlanCard() {
  return `
  <div class="card">
    <div class="empty">
      <h3>No meal plan for this week yet</h3>
      <p class="small">Generate one and today's meals will show up here with the recipe and the macros.</p>
      <button class="btn btn--primary" data-go="plan">Build this week's plan</button>
    </div>
  </div>`;
}

function habitRow(habit, entry, dailyMap, date) {
  const res = habitResult(habit, entry);
  const hit = res === 1;
  const streak = habitStreak(dailyMap, habit.key, date);

  let control = '';
  if (habit.type === 'boolean') {
    control = `<button class="toggle" role="switch" aria-pressed="${entry[habit.key] === true}"
        aria-label="${esc(habit.label)}" data-habit="${habit.key}" data-type="boolean"></button>`;
  } else if (habit.type === 'number') {
    const step = habit.step ?? (habit.key === 'steps' ? 100 : 0.5);
    const quick = (habit.quickAdd ?? []).map((amount) =>
      `<button class="btn btn--sm" data-habit="${habit.key}" data-type="add" data-amount="${amount}"
         aria-label="Add ${amount}${esc(habit.unit ?? '')} to ${esc(habit.label)}">+${amount}${esc(habit.unit ?? '')}</button>`).join('');
    control = `${quick}<input type="number" inputmode="decimal" step="${step}" min="0"
        data-habit="${habit.key}" data-type="number" value="${entry[habit.key] ?? ''}"
        placeholder="${habit.targetMin}" aria-label="${esc(habit.label)}">`;
  } else if (habit.type === 'choice') {
    control = `<div class="seg" role="group" aria-label="${esc(habit.label)}">
      ${habit.options.map((o) => `<button data-habit="${habit.key}" data-type="choice" data-value="${o.value}" aria-pressed="${entry[habit.key] === o.value}">${esc(o.label)}</button>`).join('')}
    </div>`;
  }

  return `
    <div class="habit ${hit ? 'habit--hit' : ''}">
      <span class="habit__icon" aria-hidden="true">${habit.icon}</span>
      <div class="habit__body">
        <div class="habit__label">${esc(habit.label)}${streak >= 3 ? ` <span class="badge badge--accent">${streak}d</span>` : ''}</div>
        <details class="habit__why-wrap">
          <summary class="habit__why-toggle">Why this one</summary>
          <div class="habit__why">${esc(habit.why)}</div>
        </details>
      </div>
      <div class="habit__control">${control}</div>
    </div>`;
}

export function afterRender(root, ctx) {
  const date = todayIso();
  const patch = (obj) => { store.setDaily(date, obj); ctx.rerender(); };

  root.querySelector('[data-field="weightKg"]')?.addEventListener('change', (e) => {
    patch({ weightKg: numVal(e.target) });
    toast('Weight saved');
  });

  const saveNotes = debounce((v) => store.setDaily(date, { notes: v }), 600);
  root.querySelector('[data-field="notes"]')?.addEventListener('input', (e) => saveNotes(e.target.value));

  root.querySelectorAll('[data-habit]').forEach((el) => {
    const key = el.dataset.habit;
    if (el.dataset.type === 'boolean') {
      el.addEventListener('click', () => patch({ [key]: el.getAttribute('aria-pressed') !== 'true' }));
    } else if (el.dataset.type === 'number') {
      el.addEventListener('change', () => patch({ [key]: numVal(el) }));
    } else if (el.dataset.type === 'add') {
      el.addEventListener('click', () => {
        const current = Number(store.getDaily(date)?.[key] ?? 0);
        const next = Math.round((current + Number(el.dataset.amount)) * 100) / 100;
        patch({ [key]: next });
      });
    } else if (el.dataset.type === 'choice') {
      el.addEventListener('click', () => patch({ [key]: el.dataset.value }));
    }
  });

  root.querySelector('[data-action="log-period"]')?.addEventListener('click', () => {
    store.addPeriodStart(date);
    toast('Period start logged');
    ctx.rerender();
  });
}
