/**
 * Meal library: browse what is built in, mark favourites, exclude what you
 * will not eat, and add your own meals.
 *
 * "Add your own" matters more than it looks. A plan built only from a stranger's
 * recipe list is a plan you follow for two weeks. A plan that includes the
 * dinners you already cook is one you keep.
 */

import { html, raw, esc, fmt, toast, modal, numVal, confirmDialog } from '../lib/ui.js';
import { allMeals, getCustomMeals, validateCustomMeal, newCustomMealId, isCustom } from '../lib/registry.js';
import { mealMacros } from '../lib/nutrition.js';
import { SLOTS, SLOT_META, allTags } from '../data/meals.js';
import { INGREDIENTS, AISLE_ORDER, getIngredient } from '../data/ingredients.js';
import { showRecipe } from './plan.js';
import * as store from '../lib/store.js';

export const title = 'Meals';

let filterSlot = 'all';
let filterText = '';
let filterTag = 'all';

export function render(ctx) {
  const { state } = ctx;
  const prefs = state.preferences;

  let meals = allMeals();
  if (filterSlot !== 'all') meals = meals.filter((m) => m.slot === filterSlot);
  if (filterTag !== 'all') meals = meals.filter((m) => (m.tags ?? []).includes(filterTag));
  if (filterText) {
    const q = filterText.toLowerCase();
    meals = meals.filter((m) => m.name.toLowerCase().includes(q) || (m.tags ?? []).some((t) => t.includes(q)));
  }

  const byProtein = [...meals].sort((a, b) => mealMacros(b, 1).protein - mealMacros(a, 1).protein);

  return html`
    <div class="card">
      <div class="card__head">
        <div><h2>Your meal library</h2>
        <p class="card__sub">${allMeals().length} meals &middot; ${getCustomMeals().length} of them yours &middot;
        ${prefs.favourites.length} favourited &middot; ${prefs.excluded.length} excluded</p></div>
        <div class="btn-row">
          <button class="btn btn--primary btn--sm" data-action="add-meal">Add your own meal</button>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="f-search">Search</label>
          <input id="f-search" type="search" value="${filterText}" placeholder="Name or tag&hellip;" autocomplete="off">
        </div>
        <div class="field">
          <label for="f-slot">Meal</label>
          <select id="f-slot">
            <option value="all">All</option>
            ${raw(SLOTS.map((s) => `<option value="${s}" ${filterSlot === s ? 'selected' : ''}>${SLOT_META[s].label}</option>`).join(''))}
          </select>
        </div>
        <div class="field">
          <label for="f-tag">Tag</label>
          <select id="f-tag">
            <option value="all">All</option>
            ${raw(allTags().map((t) => `<option value="${esc(t)}" ${filterTag === t ? 'selected' : ''}>${esc(t)}</option>`).join(''))}
          </select>
        </div>
      </div>

      <p class="hint">Favourited meals show up more often in generated plans. Excluded meals never appear at all.
      Sorted by protein per serving.</p>
    </div>

    ${raw(byProtein.length
      ? byProtein.map((m) => mealRow(m, prefs)).join('')
      : '<div class="card"><div class="empty"><p>Nothing matches those filters.</p></div></div>')}
  `;
}

function mealRow(meal, prefs) {
  const m = mealMacros(meal, 1);
  const fav = prefs.favourites.includes(meal.id);
  const exc = prefs.excluded.includes(meal.id);
  const proteinPct = m.kcal > 0 ? Math.round(((m.protein * 4) / m.kcal) * 100) : 0;

  return `
  <div class="habit" style="${exc ? 'opacity:.55' : ''}">
    <div class="habit__body">
      <div class="habit__label">
        ${esc(meal.name)}
        ${isCustom(meal.id) ? '<span class="badge badge--accent">yours</span>' : ''}
        ${exc ? '<span class="badge badge--bad">excluded</span>' : ''}
      </div>
      <div class="habit__why">
        <b>${m.kcal}</b> kcal &middot; <b>${m.protein.toFixed(0)}g</b> protein (${proteinPct}% of calories)
        &middot; ${m.carbs.toFixed(0)}C / ${m.fat.toFixed(0)}F &middot; ${m.fibre.toFixed(0)}g fibre
        ${meal.prepMin ? ` &middot; ${meal.prepMin} min` : ''}
      </div>
      <div class="badge-row" style="margin-top:5px">
        <span class="badge">${esc(SLOT_META[meal.slot]?.label ?? meal.slot)}</span>
        ${(meal.tags ?? []).slice(0, 4).map((t) => `<span class="badge">${esc(t)}</span>`).join('')}
      </div>
    </div>
    <div class="habit__control" style="flex-direction:column;align-items:flex-end;gap:5px">
      <div class="btn-row">
        <button class="btn btn--sm btn--ghost" data-recipe="${esc(meal.id)}">Recipe</button>
        <button class="btn btn--sm ${fav ? 'btn--primary' : ''}" data-fav="${esc(meal.id)}" aria-pressed="${fav}">${fav ? '★ Favourite' : '☆ Favourite'}</button>
      </div>
      <div class="btn-row">
        <button class="btn btn--sm btn--ghost" data-exclude="${esc(meal.id)}">${exc ? 'Put back' : 'Exclude'}</button>
        ${isCustom(meal.id) ? `<button class="btn btn--sm btn--danger" data-delete-meal="${esc(meal.id)}">Delete</button>` : ''}
      </div>
    </div>
  </div>`;
}

export function afterRender(root, ctx) {
  const search = root.querySelector('#f-search');
  if (search) {
    search.addEventListener('input', () => {
      filterText = search.value;
      ctx.rerender();
      // Keep focus and caret where they were across the re-render.
      const next = document.querySelector('#f-search');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
    });
  }
  root.querySelector('#f-slot')?.addEventListener('change', (e) => { filterSlot = e.target.value; ctx.rerender(); });
  root.querySelector('#f-tag')?.addEventListener('change', (e) => { filterTag = e.target.value; ctx.rerender(); });

  root.querySelectorAll('[data-recipe]').forEach((b) =>
    b.addEventListener('click', () => showRecipe(b.dataset.recipe, 1)));

  root.querySelectorAll('[data-fav]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.fav;
      store.update((s) => {
        const f = s.preferences.favourites;
        s.preferences.favourites = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      });
      ctx.rerender();
    }));

  root.querySelectorAll('[data-exclude]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.exclude;
      store.update((s) => {
        const e = s.preferences.excluded;
        s.preferences.excluded = e.includes(id) ? e.filter((x) => x !== id) : [...e, id];
      });
      ctx.rerender();
    }));

  root.querySelectorAll('[data-delete-meal]').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = b.dataset.deleteMeal;
      const ok = await confirmDialog({
        title: 'Delete this meal?',
        message: 'It will be removed from your library. Plans already generated keep it, but it will not be scheduled again.',
        confirmLabel: 'Delete', danger: true,
      });
      if (!ok) return;
      store.update((s) => { s.customMeals = s.customMeals.filter((m) => m.id !== id); });
      toast('Meal deleted');
      ctx.rerender();
    }));

  root.querySelector('[data-action="add-meal"]')?.addEventListener('click', () => openMealBuilder(ctx));
}

/**
 * The custom-meal builder.
 *
 * Two modes, because there are two genuinely different situations: a meal you
 * can break into ingredients (and therefore scale and shop for), and a meal you
 * only know the totals for.
 */
function openMealBuilder(ctx, existing = null) {
  let items = existing?.items ? [...existing.items] : [];
  let mode = existing && !existing.items?.length ? 'macros' : 'ingredients';

  const close = modal({
    title: existing ? 'Edit meal' : 'Add your own meal',
    body: html`
      <div class="field">
        <label for="cm-name">Meal name</label>
        <input id="cm-name" type="text" value="${existing?.name ?? ''}" placeholder="Nan's lasagne, my usual Friday curry&hellip;">
      </div>

      <div class="field-row">
        <div class="field">
          <label for="cm-slot">Which meal of the day?</label>
          <select id="cm-slot">
            ${raw(SLOTS.map((s) => `<option value="${s}" ${existing?.slot === s ? 'selected' : ''}>${SLOT_META[s].label}</option>`).join(''))}
          </select>
        </div>
        <div class="field">
          <label for="cm-prep">Prep time (minutes)</label>
          <input id="cm-prep" type="number" min="0" max="240" value="${existing?.prepMin ?? 15}">
        </div>
      </div>

      <div class="field">
        <label>How do you want to enter it?</label>
        <div class="seg" role="group">
          <button data-mode="ingredients" aria-pressed="${mode === 'ingredients'}">By ingredients</button>
          <button data-mode="macros" aria-pressed="${mode === 'macros'}">Straight macros</button>
        </div>
        <p class="hint" data-mode-hint></p>
      </div>

      <div data-panel="ingredients" ${mode === 'macros' ? 'hidden' : ''}>
        <div class="field">
          <label for="cm-ing">Add an ingredient</label>
          <div class="flex" style="align-items:flex-end">
            <select id="cm-ing" style="flex:2;min-width:150px">
              ${raw(AISLE_ORDER.map((aisle) => `
                <optgroup label="${esc(aisle)}">
                  ${INGREDIENTS.filter((i) => i.aisle === aisle).map((i) => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}
                </optgroup>`).join(''))}
            </select>
            <input id="cm-qty" type="number" min="0" step="1" value="100" style="flex:0 0 90px" aria-label="Quantity">
            <span id="cm-unit" class="small muted" style="flex:0 0 auto"></span>
            <button class="btn btn--sm" data-add-ing>Add</button>
          </div>
        </div>
        <div data-ing-list></div>
        <div data-ing-totals></div>
      </div>

      <div data-panel="macros" ${mode === 'ingredients' ? 'hidden' : ''}>
        <div class="field-row">
          <div class="field"><label for="cm-kcal">Calories</label><input id="cm-kcal" type="number" min="0" value="${existing?.macros?.kcal ?? ''}"></div>
          <div class="field"><label for="cm-p">Protein (g)</label><input id="cm-p" type="number" min="0" step="0.1" value="${existing?.macros?.protein ?? ''}"></div>
          <div class="field"><label for="cm-c">Carbs (g)</label><input id="cm-c" type="number" min="0" step="0.1" value="${existing?.macros?.carbs ?? ''}"></div>
          <div class="field"><label for="cm-f">Fat (g)</label><input id="cm-f" type="number" min="0" step="0.1" value="${existing?.macros?.fat ?? ''}"></div>
          <div class="field"><label for="cm-fib">Fibre (g)</label><input id="cm-fib" type="number" min="0" step="0.1" value="${existing?.macros?.fibre ?? ''}"></div>
        </div>
        <p class="hint">A meal entered this way will not appear on the shopping list, because there is nothing for the app to shop for.</p>
      </div>

      <div class="field">
        <label for="cm-method">Method or notes (optional)</label>
        <textarea id="cm-method" style="min-height:64px" placeholder="However you actually make it.">${existing?.method ?? ''}</textarea>
      </div>

      <div data-errors></div>

      <div class="btn-row" style="justify-content:flex-end;margin-top:14px">
        <button class="btn" data-close>Cancel</button>
        <button class="btn btn--primary" data-save>Save meal</button>
      </div>`,

    onMount(el, closeModal) {
      const ingSelect = el.querySelector('#cm-ing');
      const qtyInput = el.querySelector('#cm-qty');
      const unitLabel = el.querySelector('#cm-unit');
      const listEl = el.querySelector('[data-ing-list]');
      const totalsEl = el.querySelector('[data-ing-totals]');
      const hint = el.querySelector('[data-mode-hint]');

      const modeHints = {
        ingredients: 'Built from ingredients, so portions scale correctly and it lands on your shopping list. Use this where you can.',
        macros: 'For a meal you already know the numbers for — a packaged product, a regular takeaway, a recipe you have already worked out.',
      };

      const syncUnit = () => {
        const ing = getIngredient(ingSelect.value);
        unitLabel.textContent = ing.per === 'unit' ? ing.unit : ing.unit;
        if (ing.per === 'unit') { qtyInput.step = '0.5'; if (Number(qtyInput.value) > 10) qtyInput.value = '1'; }
        else { qtyInput.step = '5'; if (Number(qtyInput.value) <= 10) qtyInput.value = '100'; }
      };

      const renderItems = () => {
        if (!items.length) {
          listEl.innerHTML = '<p class="small muted">No ingredients yet.</p>';
          totalsEl.innerHTML = '';
          return;
        }
        listEl.innerHTML = items.map(([id, qty], i) => {
          const ing = getIngredient(id);
          return `<div class="between" style="padding:5px 0;border-bottom:1px solid var(--border)">
            <span class="small">${esc(ing.name)}</span>
            <span class="flex" style="gap:8px">
              <b class="tabnum small">${qty}${ing.per === 'unit' ? ` ${ing.unit}` : ing.unit}</b>
              <button class="btn btn--sm btn--ghost" data-rm="${i}" aria-label="Remove">&times;</button>
            </span>
          </div>`;
        }).join('');

        const m = mealMacros({ items, slot: 'lunch' }, 1);
        totalsEl.innerHTML = `<div class="note small" style="margin-top:10px">
          <b>${m.kcal} kcal</b> &middot; ${m.protein.toFixed(0)}g protein &middot; ${m.carbs.toFixed(0)}g carbs &middot; ${m.fat.toFixed(0)}g fat &middot; ${m.fibre.toFixed(0)}g fibre</div>`;

        listEl.querySelectorAll('[data-rm]').forEach((b) =>
          b.addEventListener('click', () => { items.splice(Number(b.dataset.rm), 1); renderItems(); }));
      };

      const setMode = (next) => {
        mode = next;
        el.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));
        el.querySelector('[data-panel="ingredients"]').hidden = next !== 'ingredients';
        el.querySelector('[data-panel="macros"]').hidden = next !== 'macros';
        hint.textContent = modeHints[next];
      };

      ingSelect.addEventListener('change', syncUnit);
      syncUnit();
      setMode(mode);
      renderItems();

      el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

      el.querySelector('[data-add-ing]').addEventListener('click', () => {
        const qty = numVal(qtyInput);
        if (!qty || qty <= 0) { toast('Enter a quantity'); return; }
        const existingIdx = items.findIndex(([id]) => id === ingSelect.value);
        if (existingIdx >= 0) items[existingIdx][1] += qty;
        else items.push([ingSelect.value, qty]);
        renderItems();
      });

      el.querySelector('[data-save]').addEventListener('click', () => {
        const name = el.querySelector('#cm-name').value.trim();
        const slot = el.querySelector('#cm-slot').value;
        const prepMin = numVal(el.querySelector('#cm-prep')) ?? 15;
        const method = el.querySelector('#cm-method').value.trim();

        const meal = {
          id: existing?.id ?? newCustomMealId(name),
          name, slot, prepMin,
          tags: ['yours'],
          method: method || 'Your own recipe.',
          note: '',
          items: mode === 'ingredients' ? items : [],
          macros: mode === 'macros' ? {
            kcal: numVal(el.querySelector('#cm-kcal')) ?? 0,
            protein: numVal(el.querySelector('#cm-p')) ?? 0,
            carbs: numVal(el.querySelector('#cm-c')) ?? 0,
            fat: numVal(el.querySelector('#cm-f')) ?? 0,
            fibre: numVal(el.querySelector('#cm-fib')) ?? 0,
          } : null,
        };

        const { ok, errors } = validateCustomMeal(meal);
        if (!ok) {
          el.querySelector('[data-errors]').innerHTML = errors.map((e) => `<div class="note note--bad small">${esc(e)}</div>`).join('');
          return;
        }

        store.update((s) => {
          const idx = s.customMeals.findIndex((m) => m.id === meal.id);
          if (idx >= 0) s.customMeals[idx] = meal;
          else s.customMeals.push(meal);
        });
        closeModal();
        toast(existing ? 'Meal updated' : 'Meal added to your library');
        ctx.rerender();
      });
    },
  });
}
