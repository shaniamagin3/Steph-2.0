/**
 * Meal plan: generate a week, swap what you will not eat, print the shopping list.
 */

import { html, raw, esc, fmt, toast, modal, confirmDialog } from '../lib/ui.js';
import { generateWeek, regenerateDay, swapMeal, planQuality, randomSeed, DAY_NAMES } from '../lib/planner.js';
import { mealMacros, mealIngredients, shoppingList } from '../lib/nutrition.js';
import { getMeal, mealsForSlot } from '../lib/registry.js';
import { SLOT_META } from '../data/meals.js';
import { AISLE_ORDER } from '../data/ingredients.js';
import { macroBar } from '../lib/charts.js';
import * as store from '../lib/store.js';
import { todayIso, weekStart, addDays } from '../lib/cycle.js';

export const title = 'Meal plan';

/** Which week is being viewed. Kept in module state so tab switches remember it. */
let viewWeek = null;
let showShopping = false;

export function render(ctx) {
  const { state, targets, status } = ctx;
  const ws = viewWeek ?? weekStart(todayIso());
  const plan = state.plans[ws];
  const isCurrent = ws === weekStart(todayIso());

  const weekLabel = `${fmt.dateShort(ws)} &ndash; ${fmt.dateShort(addDays(ws, 6))}`;

  if (!plan) {
    return html`
      ${raw(weekNav(ws, weekLabel))}
      <div class="card">
        <div class="empty">
          <h3>No plan for this week</h3>
          <p class="small">Built around <b>${targets.kcal} kcal</b> and <b>${Math.round(targets.protein)}g protein</b> a day
          &mdash; your ${status.meta.label.toLowerCase()} targets.</p>
          <div class="btn-row" style="justify-content:center;margin-top:14px">
            <button class="btn btn--primary" data-action="generate">Generate this week</button>
          </div>
          <p class="hint" style="margin-top:12px">Meals come from your library, weighted toward anything you have favourited.
          Nothing is locked &mdash; swap any meal you do not fancy and the portions re-fit around it.</p>
        </div>
      </div>`;
  }

  const q = planQuality(plan);
  const warn = plan.warnings?.length
    ? plan.warnings.map((w) => `<div class="note note--warn small">${esc(w)}</div>`).join('') : '';

  const fibreNote = q.avgFibre > (targets.fibre + 12)
    ? `<div class="note note--info small">This week averages about ${q.avgFibre}g of fibre a day, which is well above the ${targets.fibre}g target. That is good for satiety and blood sugar, but if it is a big jump from what you normally eat, ramp up over a week or two and drink more water &mdash; otherwise you will just feel bloated and blame the plan.</div>`
    : '';

  return html`
    ${raw(weekNav(ws, weekLabel))}

    <div class="card">
      <div class="card__head">
        <div>
          <h2>${raw(weekLabel)}</h2>
          <p class="card__sub">${status.meta.label} phase &middot; ${plan.targets.kcal} kcal &middot; ${Math.round(plan.targets.protein)}g protein target</p>
        </div>
        <div class="btn-row">
          <button class="btn btn--sm" data-action="shopping">${showShopping ? 'Hide' : 'Shopping'} list</button>
          <button class="btn btn--sm" data-action="regenerate">New week</button>
          <button class="btn btn--sm btn--ghost" data-action="print">Print</button>
        </div>
      </div>

      <div class="grid grid--4">
        <div class="stat"><div class="stat__label">Days on target</div><div class="stat__value">${q.daysOnTarget}<small>/7</small></div></div>
        <div class="stat"><div class="stat__label">Avg calories</div><div class="stat__value">${q.avgKcal}</div><div class="stat__note">${fmt.signed(q.kcalDrift, 0, ' kcal')} vs target</div></div>
        <div class="stat"><div class="stat__label">Avg protein</div><div class="stat__value">${q.avgProtein}<small>g</small></div><div class="stat__note">${fmt.signed(q.proteinDrift, 0, 'g')} vs target</div></div>
        <div class="stat"><div class="stat__label">Distinct meals</div><div class="stat__value">${q.distinctMeals}</div><div class="stat__note">across 7 days</div></div>
      </div>

      ${raw(warn)}
      ${raw(fibreNote)}
    </div>

    ${raw(showShopping ? shoppingCard(plan) : '')}

    ${raw(plan.days.map((day, i) => dayCard(day, i, plan)).join(''))}
  `;
}

function weekNav(ws, label) {
  const isCurrent = ws === weekStart(todayIso());
  return `
  <div class="between" style="margin-bottom:14px">
    <button class="btn btn--sm btn--ghost" data-week="${addDays(ws, -7)}">&larr; Previous</button>
    <span class="small muted">${isCurrent ? 'This week' : label}</span>
    <button class="btn btn--sm btn--ghost" data-week="${addDays(ws, 7)}">Next &rarr;</button>
  </div>`;
}

function dayCard(day, dayIndex, plan) {
  const isToday = day.date === todayIso();
  const t = day.totals;
  const badge = day.score.onTarget
    ? '<span class="badge badge--good">on target</span>'
    : `<span class="badge badge--warn">${esc(day.score.verdict)}</span>`;

  const rows = day.entries.map((e, slotIndex) => {
    const meal = getMeal(e.mealId);
    if (!meal) return '';
    const m = mealMacros(meal, e.servings);
    return `
      <div class="meal-row">
        <div class="meal-row__slot">${esc(SLOT_META[e.slot]?.label ?? e.slot)}</div>
        <div class="meal-row__body">
          <div class="meal-row__name">${esc(meal.name)}${e.servings !== 1 ? ` <span class="muted tiny">&times;${e.servings}</span>` : ''}</div>
          <div class="meal-row__meta">${m.kcal} kcal &middot; ${m.protein.toFixed(0)}P / ${m.carbs.toFixed(0)}C / ${m.fat.toFixed(0)}F &middot; ${meal.prepMin ?? '?'} min</div>
        </div>
        <div class="meal-row__actions">
          <button class="btn btn--sm btn--ghost" data-recipe="${esc(e.mealId)}" data-servings="${e.servings}" title="Recipe">Recipe</button>
          <button class="btn btn--sm btn--ghost" data-swap="${dayIndex}:${slotIndex}" title="Swap this meal">Swap</button>
        </div>
      </div>`;
  }).join('');

  return `
  <div class="day-card" ${isToday ? 'style="border-color:var(--accent)"' : ''}>
    <div class="day-card__head">
      <div class="day-card__title">${esc(day.dayName)}
        <span class="day-card__date">${esc(fmt.dateShort(day.date))}</span>
        ${isToday ? '<span class="badge badge--accent" style="margin-left:6px">today</span>' : ''}
      </div>
      <div class="day-card__macros">
        <span><b>${t.kcal}</b> kcal</span>
        <span><b>${t.protein.toFixed(0)}</b>g P</span>
        <span><b>${t.carbs.toFixed(0)}</b>g C</span>
        <span><b>${t.fat.toFixed(0)}</b>g F</span>
        <span><b>${t.fibre.toFixed(0)}</b>g fibre</span>
        ${badge}
        <button class="btn btn--sm btn--ghost" data-regen-day="${dayIndex}">Reroll</button>
      </div>
    </div>
    ${rows}
  </div>`;
}

function shoppingCard(plan) {
  const list = shoppingList(plan);
  const aisles = AISLE_ORDER.filter((a) => list.aisles[a]?.length);

  const sections = aisles.map((aisle) => {
    const items = list.aisles[aisle].map((item) => `
      <li style="display:flex;align-items:baseline;gap:9px;padding:5px 0;border-bottom:1px solid var(--border)">
        <input type="checkbox" style="width:auto;margin:0;flex:0 0 auto" aria-label="${esc(item.name)}">
        <span style="flex:1">${esc(item.name)}${item.negligible ? ' <span class="tiny muted">(to taste)</span>' : ''}</span>
        <b class="tabnum nowrap">${esc(item.display)}</b>
      </li>`).join('');

    return `
      <div style="margin-bottom:16px">
        <h3 style="font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);margin-bottom:6px">${esc(aisle)}</h3>
        <ul style="list-style:none;padding:0;margin:0">${items}</ul>
      </div>`;
  }).join('');

  return `
  <div class="card">
    <div class="card__head">
      <div><h2>Shopping list</h2>
      <p class="card__sub">${list.itemCount} items, summed across the week and rounded up to something you can actually buy.</p></div>
      <button class="btn btn--sm btn--ghost" data-action="print">Print</button>
    </div>
    <div class="grid grid--2">${sections}</div>
    <p class="hint">Quantities are raw/uncooked where that is how the ingredient is listed. Anything marked <i>to taste</i> is a flavouring &mdash; buy it once and it lasts months.</p>
  </div>`;
}

export function afterRender(root, ctx) {
  const ws = viewWeek ?? weekStart(todayIso());

  root.querySelectorAll('[data-week]').forEach((b) =>
    b.addEventListener('click', () => { viewWeek = b.dataset.week; ctx.rerender(); }));

  root.querySelector('[data-action="generate"]')?.addEventListener('click', () => {
    const plan = generateWeek({
      targets: ctx.targets,
      prefs: buildPrefs(ctx.state, ws),
      startDate: ws,
      seed: randomSeed(),
      phase: ctx.status.phase,
    });
    store.setPlan(ws, plan);
    toast('Week generated');
    ctx.rerender();
  });

  root.querySelector('[data-action="regenerate"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Generate a new week?',
      message: 'This replaces the current plan for this week. Any swaps you have made will be lost.',
      confirmLabel: 'Generate',
    });
    if (!ok) return;
    const plan = generateWeek({
      targets: ctx.targets,
      prefs: buildPrefs(ctx.state, ws),
      startDate: ws,
      seed: randomSeed(),
      phase: ctx.status.phase,
    });
    store.setPlan(ws, plan);
    toast('New week generated');
    ctx.rerender();
  });

  root.querySelector('[data-action="shopping"]')?.addEventListener('click', () => {
    showShopping = !showShopping;
    ctx.rerender();
  });

  root.querySelectorAll('[data-action="print"]').forEach((b) =>
    b.addEventListener('click', () => window.print()));

  root.querySelectorAll('[data-regen-day]').forEach((b) =>
    b.addEventListener('click', () => {
      const plan = store.getPlan(ws);
      const next = regenerateDay(plan, Number(b.dataset.regenDay), buildPrefs(ctx.state, ws));
      store.setPlan(ws, next);
      toast('Day rerolled');
      ctx.rerender();
    }));

  root.querySelectorAll('[data-recipe]').forEach((b) =>
    b.addEventListener('click', () => showRecipe(b.dataset.recipe, Number(b.dataset.servings || 1))));

  root.querySelectorAll('[data-swap]').forEach((b) =>
    b.addEventListener('click', () => {
      const [dayIndex, slotIndex] = b.dataset.swap.split(':').map(Number);
      showSwap(ws, dayIndex, slotIndex, ctx);
    }));
}

/** Preferences, merged with any meal requests from this week's check-in. */
export function buildPrefs(state, ws) {
  const prefs = { ...state.preferences };
  const weekly = state.weekly[addDays(ws, -7)] ?? state.weekly[ws];

  if (weekly?.requestedMealIds?.length) {
    prefs.favourites = [...new Set([...prefs.favourites, ...weekly.requestedMealIds])];
  }
  if (weekly?.excludeMealIds?.length) {
    prefs.excluded = [...new Set([...prefs.excluded, ...weekly.excludeMealIds])];
  }
  return prefs;
}

export function showRecipe(mealId, servings = 1) {
  const meal = getMeal(mealId);
  if (!meal) return;
  const m = mealMacros(meal, servings);
  const ings = mealIngredients(meal, servings);

  const ingList = ings.length
    ? `<ul style="list-style:none;padding:0;margin:0 0 14px">
        ${ings.map((i) => `
          <li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--border)">
            <span>${esc(i.name)}${i.negligible ? ' <span class="tiny muted">to taste</span>' : ''}</span>
            <b class="tabnum nowrap">${esc(i.display)}</b>
          </li>`).join('')}
      </ul>`
    : `<p class="small muted">This is one of your own meals, entered as macros rather than ingredients &mdash; so there is no ingredient breakdown to show.</p>`;

  modal({
    title: meal.name,
    body: html`
      <div class="badge-row" style="margin-bottom:12px">
        <span class="badge">${SLOT_META[meal.slot]?.label ?? meal.slot}</span>
        ${raw(meal.prepMin ? `<span class="badge">${meal.prepMin} min</span>` : '')}
        ${raw(servings !== 1 ? `<span class="badge badge--accent">${servings}&times; portion</span>` : '')}
        ${raw((meal.tags ?? []).slice(0, 4).map((t) => `<span class="badge">${esc(t)}</span>`).join(''))}
      </div>

      <div class="grid grid--4" style="margin-bottom:16px">
        <div class="stat"><div class="stat__label">Calories</div><div class="stat__value">${m.kcal}</div></div>
        <div class="stat"><div class="stat__label">Protein</div><div class="stat__value">${m.protein.toFixed(0)}<small>g</small></div></div>
        <div class="stat"><div class="stat__label">Carbs</div><div class="stat__value">${m.carbs.toFixed(0)}<small>g</small></div></div>
        <div class="stat"><div class="stat__label">Fat</div><div class="stat__value">${m.fat.toFixed(0)}<small>g</small></div></div>
      </div>

      <h3>Ingredients</h3>
      ${raw(ingList)}

      <h3>Method</h3>
      <p class="small">${meal.method}</p>

      ${raw(meal.note ? `<div class="note note--info small">${esc(meal.note)}</div>` : '')}
      ${raw(m.fibre ? `<p class="tiny muted">${m.fibre.toFixed(0)}g fibre in this portion.</p>` : '')}
    `,
  });
}

function showSwap(ws, dayIndex, slotIndex, ctx) {
  const plan = store.getPlan(ws);
  const entry = plan.days[dayIndex].entries[slotIndex];
  const slot = entry.slot;
  const current = getMeal(entry.mealId);
  const options = mealsForSlot(slot).filter((m) => !ctx.state.preferences.excluded.includes(m.id));

  const rows = options.map((m) => {
    const mm = mealMacros(m, 1);
    const isCurrent = m.id === entry.mealId;
    return `
      <button class="habit" style="width:100%;text-align:left;cursor:pointer;border-color:${isCurrent ? 'var(--accent)' : 'var(--border)'}"
        data-pick="${esc(m.id)}">
        <div class="habit__body">
          <div class="habit__label">${esc(m.name)} ${isCurrent ? '<span class="badge badge--accent">current</span>' : ''}</div>
          <div class="habit__why">${mm.kcal} kcal &middot; ${mm.protein.toFixed(0)}g protein &middot; ${m.prepMin ?? '?'} min &middot; ${esc((m.tags ?? []).slice(0, 3).join(', '))}</div>
        </div>
      </button>`;
  }).join('');

  modal({
    title: `Swap ${SLOT_META[slot]?.label.toLowerCase() ?? slot} on ${plan.days[dayIndex].dayName}`,
    body: html`
      <p class="small muted">Portions re-fit automatically after the swap, so the day still lands on ${plan.targets.kcal} kcal.</p>
      <div style="max-height:52vh;overflow-y:auto">${raw(rows)}</div>`,
    onMount(el, close) {
      el.querySelectorAll('[data-pick]').forEach((b) =>
        b.addEventListener('click', () => {
          const next = swapMeal(store.getPlan(ws), dayIndex, slotIndex, b.dataset.pick);
          store.setPlan(ws, next);
          close();
          toast('Swapped and re-fitted');
          ctx.rerender();
        }));
    },
  });
}

export function setViewWeek(ws) { viewWeek = ws; }
