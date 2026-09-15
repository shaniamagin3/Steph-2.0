/**
 * Meal plan: generate a week, swap what you will not eat, print the shopping list.
 */

import { html, raw, esc, fmt, toast, modal, confirmDialog } from '../lib/ui.js';
import { generateWeek, regenerateDay, swapMeal, planQuality, randomSeed, batchPlan, planMode, weeklyIngredientLoad, PLAN_MODES, DAY_NAMES } from '../lib/planner.js';
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
  const mode = plan ? planMode(plan) : (state.preferences.planMode ?? 'repeating');

  const weekLabel = `${fmt.dateShort(ws)} &ndash; ${fmt.dateShort(addDays(ws, 6))}`;

  if (!plan) {
    return html`
      ${raw(weekNav(ws, weekLabel))}
      <div class="card">
        <div class="empty">
          <h3>No plan for this week</h3>
          <p class="small">Built around <b>${targets.kcal} kcal</b> and <b>${Math.round(targets.protein)}g protein</b> a day
          &mdash; your ${status.meta.label.toLowerCase()} targets.</p>
          <p class="small muted">${raw(mode === 'repeating'
            ? 'One menu, eaten every day this week.'
            : 'A different menu each day.')}
            <button class="btn btn--sm btn--ghost" data-go="setup">Change</button></p>
          <div class="btn-row" style="justify-content:center;margin-top:14px">
            <button class="btn btn--primary" data-action="generate">${raw(mode === 'repeating' ? 'Build this week&rsquo;s menu' : 'Generate this week')}</button>
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
    ? `<div class="note note--info small">This menu carries about ${q.avgFibre}g of fibre a day, well above the ${targets.fibre}g target. Good for satiety and blood sugar, but if it is a big jump from what you normally eat, ramp up over a week or two and drink more water &mdash; otherwise you will just feel bloated and blame the plan.</div>`
    : '';

  const repeating = mode === 'repeating';

  const stats = repeating
    ? `<div class="grid grid--4">
        <div class="stat stat--accent"><div class="stat__label">Calories a day</div><div class="stat__value">${q.avgKcal}</div><div class="stat__note">${fmt.signed(q.kcalDrift, 0, ' kcal')} vs target</div></div>
        <div class="stat"><div class="stat__label">Protein a day</div><div class="stat__value">${q.avgProtein}<small>g</small></div><div class="stat__note">${fmt.signed(q.proteinDrift, 0, 'g')} vs target</div></div>
        <div class="stat"><div class="stat__label">Fibre a day</div><div class="stat__value">${q.avgFibre}<small>g</small></div></div>
        <div class="stat"><div class="stat__label">On target</div><div class="stat__value" style="font-size:1.15rem">${plan.days[0].score.onTarget ? 'Yes' : 'Close'}</div><div class="stat__note">${esc(plan.days[0].score.verdict)}</div></div>
      </div>`
    : `<div class="grid grid--4">
        <div class="stat"><div class="stat__label">Days on target</div><div class="stat__value">${q.daysOnTarget}<small>/7</small></div></div>
        <div class="stat"><div class="stat__label">Avg calories</div><div class="stat__value">${q.avgKcal}</div><div class="stat__note">${fmt.signed(q.kcalDrift, 0, ' kcal')} vs target</div></div>
        <div class="stat"><div class="stat__label">Avg protein</div><div class="stat__value">${q.avgProtein}<small>g</small></div><div class="stat__note">${fmt.signed(q.proteinDrift, 0, 'g')} vs target</div></div>
        <div class="stat"><div class="stat__label">Distinct meals</div><div class="stat__value">${q.distinctMeals}</div><div class="stat__note">across 7 days</div></div>
      </div>`;

  return html`
    ${raw(weekNav(ws, weekLabel))}

    <div class="card">
      <div class="card__head">
        <div>
          <h2>${raw(weekLabel)}</h2>
          <p class="card__sub">${status.meta.label} phase &middot; ${plan.targets.kcal} kcal &middot; ${Math.round(plan.targets.protein)}g protein target
          ${raw(repeating ? '&middot; one menu, every day' : '&middot; a different menu each day')}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn--sm" data-action="shopping">${showShopping ? 'Hide' : 'Shopping'} list</button>
          <button class="btn btn--sm" data-action="regenerate">${raw(repeating ? 'New menu' : 'New week')}</button>
          <button class="btn btn--sm btn--ghost" data-action="print">Print</button>
        </div>
      </div>

      ${raw(stats)}
      ${raw(warn)}
      ${raw(fibreNote)}
    </div>

    ${raw(repeating ? menuCard(plan) : '')}
    ${raw(repeating ? batchCard(plan) : '')}
    ${raw(showShopping ? shoppingCard(plan) : '')}
    ${raw(repeating ? '' : plan.days.map((day, i) => dayCard(day, i, plan)).join(''))}
  `;
}

/** The single repeating menu, shown once rather than seven identical times. */
function menuCard(plan) {
  const day = plan.days[0];
  const t = day.totals;

  const rows = day.entries.map((e, slotIndex) => {
    const meal = getMeal(e.mealId);
    if (!meal) return '';
    const m = mealMacros(meal, e.servings);
    return `
      <div class="meal-row">
        <div class="meal-row__slot">${esc(SLOT_META[e.slot]?.label ?? e.slot)}</div>
        <div class="meal-row__body">
          <div class="meal-row__name">${esc(meal.name)}${e.servings !== 1 ? ` <span class="muted tiny">&times;${e.servings} portion</span>` : ''}</div>
          <div class="meal-row__meta">${m.kcal} kcal &middot; ${m.protein.toFixed(0)}P / ${m.carbs.toFixed(0)}C / ${m.fat.toFixed(0)}F &middot; ${m.fibre.toFixed(0)}g fibre${meal.prepMin ? ` &middot; ${meal.prepMin} min` : ''}</div>
        </div>
        <div class="meal-row__actions">
          <button class="btn btn--sm btn--ghost" data-recipe="${esc(e.mealId)}" data-servings="${e.servings}">Recipe</button>
          <button class="btn btn--sm btn--ghost" data-swap="0:${slotIndex}">Swap</button>
        </div>
      </div>`;
  }).join('');

  return `
  <div class="day-card" style="border-color:var(--accent)">
    <div class="day-card__head">
      <div class="day-card__title">Your menu
        <span class="day-card__date">every day, Monday to Sunday</span>
      </div>
      <div class="day-card__macros">
        <span><b>${t.kcal}</b> kcal</span>
        <span><b>${t.protein.toFixed(0)}</b>g P</span>
        <span><b>${t.carbs.toFixed(0)}</b>g C</span>
        <span><b>${t.fat.toFixed(0)}</b>g F</span>
        <span><b>${t.fibre.toFixed(0)}</b>g fibre</span>
      </div>
    </div>
    ${rows}
    <div style="padding:13px 15px;border-top:1px solid var(--border)">
      <p class="tiny muted mb0">Swapping a meal here changes it for the whole week &mdash; there is only one menu.</p>
    </div>
  </div>`;
}

/**
 * The batch-cooking card. Eating the same menu daily only works if you cook it
 * in bulk once, so this says exactly how much of each meal the week needs.
 */
function batchCard(plan) {
  const batch = batchPlan(plan);
  if (!batch) return '';

  const rows = batch.map((b) => `
    <tr>
      <td>${esc(SLOT_META[b.slot]?.label ?? b.slot)}</td>
      <td>${esc(b.name)}</td>
      <td class="num">${fmtPortions(b.servingsPerDay)}</td>
      <td class="num"><b>${fmtPortions(b.servingsPerWeek)}</b></td>
      <td>${b.cookAhead ? '<span class="badge badge--good">cook ahead</span>' : b.batchFriendly ? '<span class="badge">quick daily</span>' : '<span class="badge badge--warn">best fresh</span>'}</td>
    </tr>`).join('');

  const cookAhead = batch.filter((b) => b.cookAhead);
  const fresh = batch.filter((b) => !b.batchFriendly);

  return `
  <div class="card">
    <div class="card__head">
      <div><h2>Cooking for the week</h2>
      <p class="card__sub">One menu means one cook-up. Here is how much of each to make.</p></div>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Slot</th><th>Meal</th><th class="num">Per day</th><th class="num">For the week</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="note note--info small" style="margin-top:14px">
      <b>How to read the week column.</b> It is the recipe multiplier, not a number of meals.
      &ldquo;5&frac14; for the week&rdquo; means scale that recipe by 5.25 and divide it into 7 containers.
      The shopping list already has the exact ingredient quantities for the whole week, so you do not
      need to do that arithmetic yourself.
    </div>

    ${cookAhead.length ? `<div class="note note--good small"><b>Batch these on your prep day:</b> ${cookAhead.map((b) => esc(b.name)).join(', ')}.</div>` : ''}
    ${fresh.length ? `<div class="note note--warn small"><b>Better made fresh each day:</b> ${fresh.map((b) => esc(b.name)).join(', ')}. If that does not suit your week, swap them for something tagged <i>batch-cook</i> or <i>make-ahead</i>.</div>` : ''}
    ${dailyLoadNote(plan)}
  </div>`;
}

/**
 * What eating this menu daily actually adds up to.
 *
 * A 95g tin of tuna is unremarkable on one plate. Seven of them in a week is a
 * different question, and it is a question only a repeating menu raises.
 */
function dailyLoadNote(plan) {
  const out = [];

  const fish = weeklyIngredientLoad(plan, { tag: 'fish' });
  if (fish.length) {
    const summary = fish.map((f) => `${esc(f.name)} (about ${Math.round(f.perWeek)}${esc(f.unit)})`).join(' and ');
    out.push(`<div class="note note--info small">
      <b>Fish every day.</b> Across the week this menu works out to ${summary}.
      Fish is well worth eating, but guidance on how often depends heavily on the species, and it is
      stricter if you are pregnant or planning to be. Rather than take a number from an app, check the
      current advice from your own food safety authority &mdash; and if it turns out to be more than you
      want, swap one of those meals for a non-fish option.
    </div>`);
  }

  const heavy = weeklyIngredientLoad(plan).filter((i) => i.slots >= 2).slice(0, 4);
  if (heavy.length) {
    out.push(`<div class="note small">
      <b>Appears in more than one meal a day:</b>
      ${heavy.map((i) => `${esc(i.name)} &mdash; about ${Math.round(i.perWeek)}${i.per === 'unit' ? ` ${esc(i.unit)}${Math.round(i.perWeek) === 1 ? '' : 's'}` : esc(i.unit)} over the week`).join('; ')}.
      Nothing wrong with that, but it is the kind of thing that gets tedious by Thursday. Swap a meal if any of it puts you off.
    </div>`);
  }

  return out.join('');
}

/** 5.25 reads better as 5 1/4 when it is a recipe multiplier. */
function fmtPortions(n) {
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 100) / 100;
  const glyph = { 0.25: '&frac14;', 0.5: '&frac12;', 0.75: '&frac34;' }[frac];
  if (!glyph) return String(Math.round(n * 100) / 100);
  return whole ? `${whole}${glyph}` : glyph;
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

export function showRecipe(mealId, servings = 1, { weekly = false } = {}) {
  const meal = getMeal(mealId);
  if (!meal) return;
  const multiplier = weekly ? servings * 7 : servings;
  const m = mealMacros(meal, multiplier);
  const ings = mealIngredients(meal, multiplier);

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
        ${raw(multiplier !== 1 ? `<span class="badge badge--accent">${Math.round(multiplier * 100) / 100}&times; recipe</span>` : '')}
        ${raw((meal.tags ?? []).slice(0, 4).map((t) => `<span class="badge">${esc(t)}</span>`).join(''))}
      </div>

      <div class="seg" role="group" aria-label="Quantity" style="margin-bottom:14px">
        <button data-scope="one" aria-pressed="${!weekly}">One meal</button>
        <button data-scope="week" aria-pressed="${weekly}">Whole week (&times;7)</button>
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
      ${raw(m.fibre ? `<p class="tiny muted">${m.fibre.toFixed(0)}g fibre${weekly ? ' across the week' : ' in this portion'}.</p>` : '')}
      ${raw(weekly ? '<div class="note note--info small">These are the quantities for the whole week, ready to cook in one go and divide into seven. The macros shown are the weekly totals, not one meal.</div>' : '')}
    `,
    onMount(el) {
      el.querySelectorAll('[data-scope]').forEach((b) =>
        b.addEventListener('click', () => showRecipe(mealId, servings, { weekly: b.dataset.scope === 'week' })));
    },
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
