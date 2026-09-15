/**
 * Weekly check-in: reflection, measurements, cycle, and requests for next
 * week's meal plan.
 *
 * The reflection prompts are split into mental / emotional / physical on
 * purpose. Asked as one question, "how was your week?" reliably produces
 * "fine" - and "fine" tells you nothing you can act on.
 */

import { html, raw, esc, fmt, numVal, toast, debounce } from '../lib/ui.js';
import {
  emptyWeekly, weeklyAdherence, weightTrend, measurementDelta,
  CYCLE_SYMPTOMS, weeklyInsights,
} from '../lib/checkins.js';
import { projectedWeeklyChangeKg, adjustTargetFromTrend } from '../lib/energy.js';
import { allMeals } from '../lib/registry.js';
import { SLOT_META } from '../data/meals.js';
import * as store from '../lib/store.js';
import { todayIso, weekStart, addDays } from '../lib/cycle.js';

export const title = 'Weekly check-in';

let viewWeek = null;

export function render(ctx) {
  const { state, targets, status, cycle } = ctx;
  const ws = viewWeek ?? weekStart(todayIso());
  const entry = { ...emptyWeekly(ws), ...(state.weekly[ws] ?? {}) };

  const adherence = weeklyAdherence(state.daily, ws);
  const trend = weightTrend(state.daily, { endDate: addDays(ws, 6) });
  const targetWeekly = status.phase === 'deficit'
    ? projectedWeeklyChangeKg(ctx.targetsFull.maintenance, targets.kcal)
    : 0;

  const prevWs = previousSubmittedWeek(state.weekly, ws);
  const delta = measurementDelta(entry, prevWs ? state.weekly[prevWs] : null);

  const insights = weeklyInsights({ adherence, trend, phase: status.phase, targetWeeklyChangeKg: targetWeekly, cycle });

  const adjustment = status.phase === 'deficit' && trend.kgPerWeek != null
    ? adjustTargetFromTrend({
        currentKcal: targets.kcal,
        weeklyChangeKg: trend.kgPerWeek,
        targetWeeklyChangeKg: targetWeekly,
        weeksOfData: trend.weeksOfData,
      })
    : null;

  return html`
    <div class="between" style="margin-bottom:14px">
      <button class="btn btn--sm btn--ghost" data-week="${addDays(ws, -7)}">&larr; Previous week</button>
      <span class="small muted">${raw(fmt.dateShort(ws))} &ndash; ${raw(fmt.dateShort(addDays(ws, 6)))}</span>
      <button class="btn btn--sm btn--ghost" data-week="${addDays(ws, 7)}">Next week &rarr;</button>
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Your week, in numbers</h2>
        <p class="card__sub">Computed from what you logged &mdash; read this before you write anything below.</p></div>
        ${raw(entry.submittedAt ? '<span class="badge badge--good">submitted</span>' : '<span class="badge badge--warn">not submitted</span>')}
      </div>

      <div class="grid grid--4" style="margin-bottom:14px">
        <div class="stat"><div class="stat__label">Days logged</div><div class="stat__value">${adherence.daysLogged}<small>/7</small></div></div>
        <div class="stat"><div class="stat__label">Habit adherence</div><div class="stat__value">${adherence.overallPct ?? '-'}<small>%</small></div></div>
        <div class="stat"><div class="stat__label">Weight trend</div><div class="stat__value" style="font-size:1.25rem">${raw(trend.kgPerWeek == null ? '-' : fmt.signed(trend.kgPerWeek, 2))}<small>kg/wk</small></div><div class="stat__note">${esc(trend.confidence)} confidence</div></div>
        <div class="stat"><div class="stat__label">Phase</div><div class="stat__value" style="font-size:1.1rem">${status.meta.label}</div><div class="stat__note">week ${status.weekInBlock} of ${status.block?.weeks ?? '?'}</div></div>
      </div>

      <div class="table-wrap" style="margin-bottom:14px">
        <table>
          <thead><tr><th>Habit</th><th class="num">Hit</th><th class="num">Logged</th><th class="num">Score</th></tr></thead>
          <tbody>
            ${raw(adherence.perHabit.map((h) => `
              <tr>
                <td>${h.icon} ${esc(h.label)}</td>
                <td class="num">${h.daysHit}</td>
                <td class="num">${h.daysLogged}</td>
                <td class="num">${h.pct == null ? '-' : `${h.pct}%`}</td>
              </tr>`).join(''))}
          </tbody>
        </table>
      </div>

      ${raw(insights.map((n) => `<div class="note note--${n.tone === 'good' ? 'good' : n.tone === 'warning' ? 'warn' : n.tone === 'action' ? 'action' : 'info'}">${esc(n.text)}</div>`).join(''))}

      ${raw(adjustment && adjustment.action !== 'hold' ? `
        <div class="note note--action">
          <b>Suggested calorie change: ${adjustment.deltaKcal > 0 ? '+' : ''}${adjustment.deltaKcal} kcal &rarr; ${adjustment.suggestedKcal} kcal/day.</b><br>
          ${esc(adjustment.rationale)}<br>
          <button class="btn btn--sm btn--primary" data-action="apply-adjustment" data-kcal="${adjustment.suggestedKcal}" style="margin-top:8px">Apply this change</button>
        </div>` : adjustment ? `<div class="note note--good">${esc(adjustment.rationale)}</div>` : '')}
    </div>

    <div class="card">
      <h2>How was your week?</h2>
      <p class="card__sub" style="margin-bottom:14px">Three separate questions, because the answers are usually different.</p>

      <div class="field">
        <label for="w-mental">Mentally</label>
        <textarea id="w-mental" data-w="mental" placeholder="Focus, motivation, decision fatigue, how loud the food noise was.">${entry.mental}</textarea>
      </div>
      <div class="field">
        <label for="w-emotional">Emotionally</label>
        <textarea id="w-emotional" data-w="emotional" placeholder="Mood, stress, what you were eating around rather than because of hunger.">${entry.emotional}</textarea>
      </div>
      <div class="field">
        <label for="w-physical">Physically</label>
        <textarea id="w-physical" data-w="physical" placeholder="Energy, training, digestion, aches, sleep quality, how clothes are fitting.">${entry.physical}</textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="w-wins">One thing that went well</label>
          <textarea id="w-wins" data-w="wins" style="min-height:64px">${entry.wins}</textarea>
        </div>
        <div class="field">
          <label for="w-struggles">One thing that got in the way</label>
          <textarea id="w-struggles" data-w="struggles" style="min-height:64px">${entry.struggles}</textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Measurements</h2>
        <p class="card__sub">Same time of day, relaxed, tape snug but not pulled tight.</p></div>
      </div>

      <div class="field-row">
        ${raw(['chest', 'waist', 'hips'].map((site) => {
          const key = `${site}Cm`;
          const d = delta?.[site];
          return `
          <div class="field">
            <label for="w-${site}">${site[0].toUpperCase()}${site.slice(1)} (cm)</label>
            <input id="w-${site}" type="number" inputmode="decimal" step="0.1" min="20" max="250"
              data-w-num="${key}" value="${entry[key] ?? ''}" placeholder="0.0">
            ${d != null ? `<p class="hint">${fmt.signed(d, 1, ' cm')} since ${esc(fmt.dateShort(prevWs))}</p>` : ''}
          </div>`;
        }).join(''))}
      </div>

      ${raw(delta?.total != null ? `<div class="note ${delta.total < 0 ? 'note--good' : ''}">
        Combined change across all three sites: <b>${fmt.signed(delta.total, 1, ' cm')}</b>.
        Measurements and scale weight often disagree for weeks at a time &mdash; when they do, the tape is usually telling the truer story.
      </div>` : '')}
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Cycle</h2>
        <p class="card__sub">Estimated phase this week: <b>${esc(cycle.phase.label)}</b>${cycle.day ? ` (day ${cycle.day})` : ''}</p></div>
      </div>

      <div class="field">
        <label>
          <input type="checkbox" data-w-bool="periodStartedThisWeek" ${entry.periodStartedThisWeek ? 'checked' : ''} style="width:auto;margin-right:7px">
          My period started this week
        </label>
      </div>

      <div class="field" ${entry.periodStartedThisWeek ? '' : 'hidden'} data-period-date>
        <label for="w-period-date">Which day did it start?</label>
        <input id="w-period-date" type="date" data-w-date="periodStartDate" value="${entry.periodStartDate ?? ''}" max="${todayIso()}">
      </div>

      <div class="field">
        <label>What did you notice?</label>
        <div class="badge-row">
          ${raw(CYCLE_SYMPTOMS.map((s) => `
            <button class="badge ${entry.cycleSymptoms.includes(s) ? 'badge--accent' : ''}"
              data-symptom="${esc(s)}" style="cursor:pointer;border-width:1px">${esc(s)}</button>`).join(''))}
        </div>
      </div>

      ${raw(cycle.caveats?.length ? `<div class="note note--warn small">${cycle.caveats.map(esc).join('<br>')}</div>` : '')}
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Next week's meal plan</h2>
        <p class="card__sub">This feeds straight into the generator. Requested meals get weighted in; removed ones are dropped.</p></div>
      </div>

      <div class="field">
        <label for="w-requests">Anything you want more or less of?</label>
        <textarea id="w-requests" data-w="mealRequests" placeholder="More one-pan dinners. Fewer eggs at breakfast. Something I can eat cold at my desk. Sunday roast with the family.">${entry.mealRequests}</textarea>
        <p class="hint">Free text for the things the checkboxes cannot capture. You will read this back when you build the plan.</p>
      </div>

      <div class="field">
        <label for="meal-search">Request specific meals for next week</label>
        <input id="meal-search" type="search" placeholder="Search the meal library&hellip;" autocomplete="off">
        <div data-search-results style="margin-top:8px"></div>
      </div>

      ${raw(selectedMealsBlock('Requested more often', entry.requestedMealIds, 'requested'))}
      ${raw(selectedMealsBlock('Taken off the menu', entry.excludeMealIds, 'excluded'))}
    </div>

    <div class="card">
      <div class="between">
        <div>
          <h3 style="margin:0">${entry.submittedAt ? 'Check-in submitted' : 'Finish your check-in'}</h3>
          <p class="card__sub" style="margin:2px 0 0">${entry.submittedAt ? `Submitted ${esc(fmt.date(entry.submittedAt.slice(0, 10)))}. Everything above is still editable.` : 'Everything saves as you type. Submitting just marks the week done and unlocks next week’s plan.'}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn--primary" data-action="submit">${entry.submittedAt ? 'Update' : 'Submit check-in'}</button>
          ${raw(entry.submittedAt ? '' : '')}
        </div>
      </div>
    </div>
  `;
}

function selectedMealsBlock(label, ids, kind) {
  if (!ids?.length) return '';
  const meals = ids.map((id) => allMeals().find((m) => m.id === id)).filter(Boolean);
  return `
    <div class="field">
      <label>${esc(label)}</label>
      <div class="badge-row">
        ${meals.map((m) => `
          <span class="badge ${kind === 'requested' ? 'badge--good' : 'badge--bad'}">
            ${esc(m.name)}
            <button data-remove="${kind}:${esc(m.id)}" aria-label="Remove ${esc(m.name)}"
              style="background:none;border:0;cursor:pointer;color:inherit;font-weight:700;padding:0 0 0 5px">&times;</button>
          </span>`).join('')}
      </div>
    </div>`;
}

function previousSubmittedWeek(weekly, ws) {
  const keys = Object.keys(weekly).filter((k) => k < ws).sort();
  return keys.length ? keys[keys.length - 1] : null;
}

export function afterRender(root, ctx) {
  const ws = viewWeek ?? weekStart(todayIso());
  const patch = (obj, rerender = false) => {
    store.setWeekly(ws, obj);
    if (rerender) ctx.rerender();
  };

  root.querySelectorAll('[data-week]').forEach((b) =>
    b.addEventListener('click', () => { viewWeek = b.dataset.week; ctx.rerender(); }));

  const saveText = debounce((key, v) => store.setWeekly(ws, { [key]: v }), 550);
  root.querySelectorAll('[data-w]').forEach((el) =>
    el.addEventListener('input', () => saveText(el.dataset.w, el.value)));

  root.querySelectorAll('[data-w-num]').forEach((el) =>
    el.addEventListener('change', () => patch({ [el.dataset.wNum]: numVal(el) }, true)));

  root.querySelectorAll('[data-w-bool]').forEach((el) =>
    el.addEventListener('change', () => patch({ [el.dataset.wBool]: el.checked }, true)));

  root.querySelectorAll('[data-w-date]').forEach((el) =>
    el.addEventListener('change', () => {
      patch({ [el.dataset.wDate]: el.value || null });
      if (el.value) store.addPeriodStart(el.value);
      ctx.rerender();
    }));

  root.querySelectorAll('[data-symptom]').forEach((el) =>
    el.addEventListener('click', () => {
      const s = el.dataset.symptom;
      const current = store.getWeekly(ws)?.cycleSymptoms ?? [];
      const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
      patch({ cycleSymptoms: next }, true);
    }));

  root.querySelectorAll('[data-remove]').forEach((el) =>
    el.addEventListener('click', () => {
      const [kind, id] = el.dataset.remove.split(':');
      const key = kind === 'requested' ? 'requestedMealIds' : 'excludeMealIds';
      const current = store.getWeekly(ws)?.[key] ?? [];
      patch({ [key]: current.filter((x) => x !== id) }, true);
    }));

  // Meal search with add-as-request / add-as-excluded.
  const search = root.querySelector('#meal-search');
  const results = root.querySelector('[data-search-results]');
  if (search && results) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (q.length < 2) { results.innerHTML = ''; return; }
      const hits = allMeals()
        .filter((m) => m.name.toLowerCase().includes(q) || (m.tags ?? []).some((t) => t.includes(q)))
        .slice(0, 8);

      results.innerHTML = hits.length ? hits.map((m) => `
        <div class="habit" style="margin-bottom:6px">
          <div class="habit__body">
            <div class="habit__label">${esc(m.name)}</div>
            <div class="habit__why">${esc(SLOT_META[m.slot]?.label ?? m.slot)} &middot; ${esc((m.tags ?? []).slice(0, 3).join(', '))}</div>
          </div>
          <div class="habit__control">
            <button class="btn btn--sm" data-add="requested:${esc(m.id)}">More</button>
            <button class="btn btn--sm btn--danger" data-add="excluded:${esc(m.id)}">No</button>
          </div>
        </div>`).join('') : '<p class="small muted">Nothing matched. You can add your own meals on the Meals tab.</p>';

      results.querySelectorAll('[data-add]').forEach((b) =>
        b.addEventListener('click', () => {
          const [kind, id] = b.dataset.add.split(':');
          const key = kind === 'requested' ? 'requestedMealIds' : 'excludeMealIds';
          const current = store.getWeekly(ws)?.[key] ?? [];
          if (!current.includes(id)) patch({ [key]: [...current, id] }, true);
          else toast('Already on that list');
        }));
    });
  }

  root.querySelector('[data-action="submit"]')?.addEventListener('click', () => {
    patch({ submittedAt: new Date().toISOString() });
    toast('Check-in submitted');
    ctx.rerender();
  });

  root.querySelector('[data-action="apply-adjustment"]')?.addEventListener('click', (e) => {
    const kcal = Number(e.target.dataset.kcal);
    store.update((s) => { s.programSettings.manualKcalOverride = kcal; });
    toast(`Target set to ${kcal} kcal`);
    ctx.rerender();
  });
}

export function setViewWeek(ws) { viewWeek = ws; }
