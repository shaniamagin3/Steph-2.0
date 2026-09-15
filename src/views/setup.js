/**
 * Setup: who you are, what the programme is, and what you will actually eat.
 *
 * Every number the app produces downstream comes from this screen, so it shows
 * its working rather than just printing a calorie target.
 */

import { html, raw, esc, fmt, numVal, toast, confirmDialog, debounce } from '../lib/ui.js';
import { ACTIVITY_LEVELS, computeTargets, projectedWeeklyChangeKg } from '../lib/energy.js';
import { buildProgram, programStatus } from '../lib/program.js';
import { averageCycleLength } from '../lib/cycle.js';
import { allTags } from '../data/meals.js';
import { PLAN_MODES } from '../lib/planner.js';
import * as store from '../lib/store.js';
import { todayIso } from '../lib/cycle.js';

export const title = 'Setup';

export function render(ctx) {
  const { state, targetsFull, status } = ctx;
  const p = state.profile;
  const ps = state.programSettings;
  const complete = store.isProfileComplete(state);

  const cycleStats = averageCycleLength(state.cycle.periodStarts);

  return html`
    ${raw(complete ? '' : '<div class="note note--action"><b>Start here.</b> Fill in your details below and every target in the app becomes real. Until then it is running on placeholders.</div>')}

    <div class="card">
      <div class="card__head">
        <div><h2>About you</h2>
        <p class="card__sub">Used to estimate your energy needs. Nothing leaves this device.</p></div>
      </div>

      <div class="field">
        <label for="p-name">Name (optional)</label>
        <input id="p-name" type="text" data-p="name" value="${p.name ?? ''}" placeholder="What should the app call you?">
      </div>

      <div class="field-row">
        <div class="field">
          <label for="p-age">Age</label>
          <input id="p-age" type="number" data-p-num="age" min="14" max="99" value="${p.age ?? ''}" placeholder="years">
        </div>
        <div class="field">
          <label for="p-height">Height</label>
          <input id="p-height" type="number" data-p-num="heightCm" min="120" max="220" step="0.5" value="${p.heightCm ?? ''}" placeholder="cm">
        </div>
        <div class="field">
          <label for="p-weight">Current weight</label>
          <input id="p-weight" type="number" data-p-num="weightKg" min="30" max="300" step="0.1" value="${p.weightKg ?? ''}" placeholder="kg">
        </div>
        <div class="field">
          <label for="p-sex">Sex</label>
          <select id="p-sex" data-p="sex">
            <option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option>
            <option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option>
          </select>
          <p class="hint">The BMR equation uses different constants. It is a maths input, nothing more.</p>
        </div>
      </div>

      <div class="field">
        <label for="p-activity">Activity level</label>
        <select id="p-activity" data-p="activityKey">
          ${raw(Object.values(ACTIVITY_LEVELS).map((a) =>
            `<option value="${a.key}" ${p.activityKey === a.key ? 'selected' : ''}>${esc(a.label)} &mdash; ${esc(a.hint)}</option>`).join(''))}
        </select>
        <p class="hint">Most people overestimate this. If you are aiming at 5&ndash;8k steps and training a few times a week,
        <b>lightly active</b> is usually the honest answer.</p>
      </div>
    </div>

    ${raw(complete ? targetsCard(targetsFull, status, p) : '')}

    <div class="card">
      <div class="card__head">
        <div><h2>Programme</h2>
        <p class="card__sub">A maintenance block first, then the deficit. The order matters.</p></div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="pr-start">Start date</label>
          <input id="pr-start" type="date" data-pr="startDate" value="${state.program?.startDate ?? state.programSettings.startDate ?? todayIso()}">
        </div>
        <div class="field">
          <label for="pr-maint">Maintenance weeks</label>
          <input id="pr-maint" type="number" data-pr-num="maintenanceWeeks" min="1" max="6" value="${ps.maintenanceWeeks}">
        </div>
        <div class="field">
          <label for="pr-def">Deficit weeks</label>
          <input id="pr-def" type="number" data-pr-num="deficitWeeks" min="4" max="16" value="${ps.deficitWeeks}">
          <p class="hint">8&ndash;12 is the usual range.</p>
        </div>
        <div class="field">
          <label for="pr-pct">Deficit size</label>
          <select id="pr-pct" data-pr-num="deficitPct">
            ${raw([0.10, 0.15, 0.18, 0.20, 0.25].map((v) =>
              `<option value="${v}" ${Math.abs(ps.deficitPct - v) < 0.001 ? 'selected' : ''}>${Math.round(v * 100)}% below maintenance</option>`).join(''))}
          </select>
        </div>
      </div>

      <div class="note note--info">
        <b>Why maintenance first?</b> Two weeks of eating at your estimated maintenance tells you whether that estimate is
        right. If your weight is flat, the deficit is being subtracted from a real number. If it drifted, you correct it
        before the deficit starts instead of chasing a moving target for ten weeks.
      </div>

      <div class="note">
        <b>On deficit size.</b> Anything past about 25% below maintenance buys speed at the cost of lean mass, training
        quality and, commonly, cycle regularity. 15&ndash;20% is the range most people can hold for ten weeks without
        their life falling apart, which is the only reason it works.
      </div>

      <div class="btn-row">
        <button class="btn btn--primary" data-action="save-program">${state.program ? 'Update programme' : 'Start programme'}</button>
        ${raw(state.program ? '<button class="btn btn--danger" data-action="reset-program">Reset programme</button>' : '')}
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Cycle settings</h2>
        <p class="card__sub">Drives the phase estimate. Calendar arithmetic only &mdash; see the caveat below.</p></div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="c-length">Average cycle length (days)</label>
          <input id="c-length" type="number" data-c-num="cycleLength" min="15" max="90" value="${state.cycle.cycleLength}">
          ${raw(cycleStats ? `<p class="hint">Your logged average is ${cycleStats.mean} days (range ${cycleStats.min}&ndash;${cycleStats.max}, ${cycleStats.samples} cycles).
            <button class="btn btn--sm btn--ghost" data-action="use-measured">Use ${cycleStats.mean}</button></p>` : '')}
        </div>
        <div class="field">
          <label for="c-period">Period length (days)</label>
          <input id="c-period" type="number" data-c-num="periodLength" min="1" max="10" value="${state.cycle.periodLength}">
        </div>
        <div class="field">
          <label for="c-last">Last period start</label>
          <input id="c-last" type="date" data-action="add-period" value="${state.cycle.periodStarts.at(-1) ?? ''}" max="${todayIso()}">
        </div>
      </div>

      <div class="field">
        <label>
          <input type="checkbox" data-c-bool="irregular" ${state.cycle.irregular ? 'checked' : ''} style="width:auto;margin-right:7px">
          My cycles are irregular
        </label>
        <p class="hint">Ticking this lowers the confidence shown on every phase estimate, rather than pretending the number is solid.</p>
      </div>

      ${raw(cycleStats?.likelyIrregular && !state.cycle.irregular
        ? `<div class="note note--warn">Your logged cycles range from ${cycleStats.min} to ${cycleStats.max} days. That variation is usually called irregular &mdash; worth ticking the box above, and worth a conversation with your doctor if it is new.</div>` : '')}

      <div class="note note--warn">
        <b>Read this once.</b> The phase estimate is a calendar calculation that assumes a regular cycle with ovulation
        about 14 days before the next bleed. It is not a hormone measurement. Irregular and anovulatory cycles are common
        in PCOS, and those are exactly the cases where this calculation is least reliable. Use it as a prompt to notice
        patterns in how you feel, never as a fact about what your hormones are doing.
      </div>

      ${raw(state.cycle.periodStarts.length
        ? `<div class="field"><label>Logged period starts</label><div class="badge-row">
            ${state.cycle.periodStarts.slice(-12).map((d) => `<span class="badge">${esc(fmt.dateShort(d))}
              <button data-rm-period="${esc(d)}" style="background:none;border:0;cursor:pointer;color:inherit;font-weight:700;padding:0 0 0 5px" aria-label="Remove">&times;</button></span>`).join('')}
          </div></div>` : '')}
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Meal plan preferences</h2>
        <p class="card__sub">Shapes every plan the generator builds.</p></div>
      </div>

      <div class="field">
        <label>How do you want the week structured?</label>
        <div class="seg" role="group" aria-label="Plan structure">
          ${raw(Object.values(PLAN_MODES).map((m) =>
            `<button data-plan-mode="${m.key}" aria-pressed="${(state.preferences.planMode ?? 'repeating') === m.key}">${esc(m.label)}</button>`).join(''))}
        </div>
        <p class="hint">${esc(PLAN_MODES[state.preferences.planMode ?? 'repeating'].hint)}</p>
      </div>

      ${raw((state.preferences.planMode ?? 'repeating') === 'repeating' ? `
      <div class="note note--info small">
        <b>Eating the same thing every day is a legitimate strategy, not a compromise.</b>
        It removes a few hundred food decisions a week, makes the shopping list trivial, and makes your
        intake far more accurate &mdash; the same menu weighed the same way every day has none of the drift
        that creeps in across seven different ones.
        <br><br>
        The two things to watch: pick meals you are genuinely happy to repeat, because a meal you are
        lukewarm about gets eaten seven times; and change the menu week to week so the variety happens
        across weeks instead of within them. The generator already avoids leaning on the same ingredient
        in three different slots for exactly this reason.
      </div>` : '')}

      <div class="field-row">
        <div class="field">
          <label for="pf-snacks">Snacks per day</label>
          <select id="pf-snacks" data-pf-num="snacksPerDay">
            <option value="1" ${state.preferences.snacksPerDay === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${state.preferences.snacksPerDay === 2 ? 'selected' : ''}>2</option>
          </select>
        </div>
        <div class="field">
          <label for="pf-protein">Protein target (g per kg)</label>
          <input id="pf-protein" type="number" data-p-num="proteinGPerKg" min="1.2" max="3" step="0.1" value="${p.proteinGPerKg}">
          <p class="hint">1.6&ndash;2.2 is the usual evidence-based range.</p>
        </div>
        <div class="field">
          <label for="pf-fat">Fat (% of calories)</label>
          <input id="pf-fat" type="number" data-p-pct="fatPctOfKcal" min="15" max="45" step="1" value="${Math.round(p.fatPctOfKcal * 100)}">
          <p class="hint">Floored at 0.8g/kg regardless.</p>
        </div>
      </div>

      <div class="field">
        <label>
          <input type="checkbox" data-pf-bool="dessertDaily" ${state.preferences.dessertDaily ? 'checked' : ''} style="width:auto;margin-right:7px">
          Include a dessert every day
        </label>
        <p class="hint">Recommended on. A planned, protein-containing dessert is the difference between a plan you follow and a plan you abandon.</p>
      </div>

      <div class="field">
        <label>Only include meals tagged&hellip;</label>
        <div class="badge-row">
          ${raw(['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'quick', 'make-ahead', 'meal-prep', 'no-cook'].map((t) =>
            `<button class="badge ${state.preferences.requireTags.includes(t) ? 'badge--accent' : ''}" data-require="${esc(t)}" style="cursor:pointer">${esc(t)}</button>`).join(''))}
        </div>
        <p class="hint">Leave all off unless you need them &mdash; each one narrows the library and increases repetition.</p>
      </div>
    </div>
  `;
}

function targetsCard(t, status, profile) {
  const weekly = projectedWeeklyChangeKg(t.maintenance, t.kcal);

  return `
  <div class="card">
    <div class="card__head">
      <div><h2>Your targets</h2>
      <p class="card__sub">Currently in the <b>${esc(status.meta.label.toLowerCase())}</b> phase.</p></div>
      <span class="phase-pill">${esc(status.meta.label)}</span>
    </div>

    <div class="grid grid--4" style="margin-bottom:16px">
      <div class="stat stat--accent"><div class="stat__label">Daily calories</div><div class="stat__value">${t.kcal}</div></div>
      <div class="stat"><div class="stat__label">Protein</div><div class="stat__value">${t.protein}<small>g</small></div></div>
      <div class="stat"><div class="stat__label">Carbs</div><div class="stat__value">${t.carbs}<small>g</small></div></div>
      <div class="stat"><div class="stat__label">Fat</div><div class="stat__value">${t.fat}<small>g</small></div></div>
    </div>

    <div class="table-wrap">
      <table>
        <tbody>
          <tr><td>Basal metabolic rate (Mifflin-St Jeor)</td><td class="num">${t.bmr} kcal</td></tr>
          <tr><td>&times; activity multiplier (${esc(ACTIVITY_LEVELS[profile.activityKey]?.label ?? '')})</td><td class="num">&times;${ACTIVITY_LEVELS[profile.activityKey]?.multiplier ?? '-'}</td></tr>
          <tr><td><b>Estimated maintenance</b></td><td class="num"><b>${t.maintenance} kcal</b></td></tr>
          ${status.phase === 'deficit' ? `<tr><td>Deficit applied</td><td class="num">&minus;${Math.round(t.effectiveDeficitPct * 100)}%</td></tr>` : ''}
          <tr><td><b>Your daily target</b></td><td class="num"><b>${t.kcal} kcal</b></td></tr>
          <tr><td>Protein basis weight</td><td class="num">${t.proteinBasisKg} kg</td></tr>
          <tr><td>Fibre target</td><td class="num">${t.fibre} g</td></tr>
          <tr><td>BMI</td><td class="num">${t.bmi}</td></tr>
          ${status.phase === 'deficit' ? `<tr><td>Projected rate of loss</td><td class="num">${weekly.toFixed(2)} kg/week</td></tr>` : ''}
        </tbody>
      </table>
    </div>

    ${t.warnings.length ? t.warnings.map((w) => `<div class="note note--warn small">${esc(w)}</div>`).join('') : ''}

    <div class="note note--info small">
      These come from a population equation, so treat them as a <b>starting point</b>, not a measurement.
      Individual metabolic rate varies meaningfully around any prediction. That is exactly why the app tracks
      your actual weight trend and suggests corrections at your weekly check-in &mdash; observed data beats the formula
      the moment you have two weeks of it.
    </div>

    ${t.proteinBasisKg < profile.weightKg ? `<div class="note small">
      Protein is calculated on ${t.proteinBasisKg} kg rather than your full body weight. Above a BMI of about 27,
      scaling protein off total weight overshoots, because fat mass has little protein requirement. This is a
      practical convention rather than a validated equation &mdash; the number it produces is still comfortably inside
      the evidence-based range.</div>` : ''}
  </div>`;
}

export function afterRender(root, ctx) {
  const rerender = () => ctx.rerender();

  /**
   * Save on `input` as well as `change`, so the targets card updates while you
   * are still typing rather than only once you tab away. Re-rendering steals
   * focus, so the debounced input path restores the caret afterwards.
   */
  function liveField(el, apply) {
    const commit = (restoreFocus) => {
      const id = el.id;
      const pos = el.selectionStart;
      apply();
      rerender();
      if (!restoreFocus || !id) return;
      const next = document.getElementById(id);
      if (!next) return;
      next.focus();
      if (next.type !== 'number' && pos != null) {
        try { next.setSelectionRange(pos, pos); } catch { /* unsupported input type */ }
      }
    };
    const debounced = debounce(() => commit(true), 500);
    el.addEventListener('input', debounced);
    el.addEventListener('change', () => commit(false));
  }

  root.querySelectorAll('[data-p]').forEach((el) =>
    liveField(el, () => store.update((s) => { s.profile[el.dataset.p] = el.value; })));

  root.querySelectorAll('[data-p-num]').forEach((el) =>
    liveField(el, () => store.update((s) => { s.profile[el.dataset.pNum] = numVal(el); })));

  root.querySelectorAll('[data-p-pct]').forEach((el) =>
    liveField(el, () => {
      const v = numVal(el);
      store.update((s) => { s.profile[el.dataset.pPct] = v == null ? 0.30 : v / 100; });
    }));

  root.querySelectorAll('[data-pr-num]').forEach((el) =>
    el.addEventListener('change', () => { store.update((s) => { s.programSettings[el.dataset.prNum] = Number(el.value); }); }));

  root.querySelectorAll('[data-c-num]').forEach((el) =>
    liveField(el, () => store.update((s) => { s.cycle[el.dataset.cNum] = numVal(el); })));

  root.querySelectorAll('[data-c-bool]').forEach((el) =>
    el.addEventListener('change', () => { store.update((s) => { s.cycle[el.dataset.cBool] = el.checked; }); rerender(); }));

  root.querySelectorAll('[data-pf-num]').forEach((el) =>
    el.addEventListener('change', () => { store.update((s) => { s.preferences[el.dataset.pfNum] = Number(el.value); }); }));

  root.querySelectorAll('[data-pf-bool]').forEach((el) =>
    el.addEventListener('change', () => { store.update((s) => { s.preferences[el.dataset.pfBool] = el.checked; }); }));

  root.querySelectorAll('[data-plan-mode]').forEach((el) =>
    el.addEventListener('click', () => {
      store.update((st) => { st.preferences.planMode = el.dataset.planMode; });
      toast(el.dataset.planMode === 'repeating' ? 'One menu a week' : 'A new menu each day');
      rerender();
    }));

  root.querySelectorAll('[data-require]').forEach((el) =>
    el.addEventListener('click', () => {
      const t = el.dataset.require;
      store.update((s) => {
        const r = s.preferences.requireTags;
        s.preferences.requireTags = r.includes(t) ? r.filter((x) => x !== t) : [...r, t];
      });
      rerender();
    }));

  root.querySelector('[data-action="save-program"]')?.addEventListener('click', () => {
    const startDate = root.querySelector('[data-pr="startDate"]').value || todayIso();
    store.update((s) => {
      s.programSettings.startDate = startDate;
      s.program = buildProgram({
        startDate,
        maintenanceWeeks: s.programSettings.maintenanceWeeks,
        deficitWeeks: s.programSettings.deficitWeeks,
        deficitPct: s.programSettings.deficitPct,
      });
    });
    toast('Programme set');
    rerender();
  });

  root.querySelector('[data-action="reset-program"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset the programme?',
      message: 'This clears your phase timeline. Your weigh-ins, check-ins, measurements and photos are all kept.',
      confirmLabel: 'Reset', danger: true,
    });
    if (!ok) return;
    store.update((s) => { s.program = null; });
    toast('Programme reset');
    rerender();
  });

  root.querySelector('[data-action="add-period"]')?.addEventListener('change', (e) => {
    if (e.target.value) { store.addPeriodStart(e.target.value); toast('Period start logged'); rerender(); }
  });

  root.querySelector('[data-action="use-measured"]')?.addEventListener('click', () => {
    const stats = averageCycleLength(ctx.state.cycle.periodStarts);
    if (stats) { store.update((s) => { s.cycle.cycleLength = stats.mean; }); toast(`Cycle length set to ${stats.mean} days`); rerender(); }
  });

  root.querySelectorAll('[data-rm-period]').forEach((b) =>
    b.addEventListener('click', () => {
      store.update((s) => { s.cycle.periodStarts = s.cycle.periodStarts.filter((d) => d !== b.dataset.rmPeriod); });
      rerender();
    }));
}
