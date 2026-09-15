/**
 * Progress: the long view. Weight trend, measurements, habit consistency,
 * and where you are in the programme.
 */

import { html, raw, esc, fmt } from '../lib/ui.js';
import { weightSeries, weightTrend, dailyScore, weeklyAdherence, HABITS } from '../lib/checkins.js';
import { weightChart, adherenceHeatmap, measurementSparklines, attachChartInteractions } from '../lib/charts.js';
import { projectedWeeklyChangeKg } from '../lib/energy.js';
import { addDays, todayIso, weekStart } from '../lib/cycle.js';

export const title = 'Progress';

let rangeDays = 90;

export function render(ctx) {
  const { state, status, targets, targetsFull, program } = ctx;
  const today = todayIso();

  const series = weightSeries(state.daily, { endDate: today, days: rangeDays });
  const trend = weightTrend(state.daily, { endDate: today });
  const logged = series.filter((s) => s.weight != null);

  const heatDays = Array.from({ length: 56 }, (_, i) => {
    const date = addDays(today, -(55 - i));
    const entry = state.daily[date];
    const s = entry ? dailyScore(entry) : null;
    return { date, score: s?.loggedCount ? s.score : null };
  });

  const weeklyEntries = Object.keys(state.weekly).sort().map((k) => state.weekly[k]);
  const targetWeekly = status.phase === 'deficit' ? projectedWeeklyChangeKg(targetsFull.maintenance, targets.kcal) : 0;

  // Measure "since start" from the earliest rolling average we have, not from
  // the weight typed into the profile - that one is a self-report from setup
  // day and is often the least accurate number in the whole dataset.
  const fullSeries = weightSeries(state.daily, { endDate: today, days: 400 });
  const firstAvg = fullSeries.find((s) => s.average != null);
  const startAvg = firstAvg?.average ?? state.profile.weightKg ?? null;
  const totalChange = trend.last?.average != null && startAvg != null ? trend.last.average - startAvg : null;

  return html`
    <div class="card">
      <div class="card__head">
        <div>
          <h2>Weight trend</h2>
          <p class="card__sub">Dots are daily weigh-ins. The line is the 7-day rolling average &mdash; that is the one to read.</p>
        </div>
        <div class="seg" role="group" aria-label="Time range">
          ${raw([30, 90, 180].map((d) => `<button data-range="${d}" aria-pressed="${rangeDays === d}">${d}d</button>`).join(''))}
        </div>
      </div>

      <div class="grid grid--4" style="margin-bottom:16px">
        <div class="stat stat--accent">
          <div class="stat__label">Current average</div>
          <div class="stat__value">${trend.last?.average != null ? trend.last.average.toFixed(2) : '-'}<small>kg</small></div>
        </div>
        <div class="stat">
          <div class="stat__label">Trend</div>
          <div class="stat__value" style="font-size:1.3rem">${raw(trend.kgPerWeek == null ? '-' : fmt.signed(trend.kgPerWeek, 2))}<small>kg/wk</small></div>
          <div class="stat__note">${status.phase === 'deficit' ? `target ${targetWeekly.toFixed(2)}` : 'target: flat'}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Since tracking began</div>
          <div class="stat__value" style="font-size:1.3rem">${raw(totalChange == null ? '-' : fmt.signed(totalChange, 1))}<small>kg</small></div>
          ${raw(firstAvg ? `<div class="stat__note">from ${esc(fmt.dateShort(firstAvg.date))}</div>` : '')}
        </div>
        <div class="stat">
          <div class="stat__label">Weigh-ins</div>
          <div class="stat__value">${logged.length}</div>
          <div class="stat__note">last ${rangeDays} days</div>
        </div>
      </div>

      ${raw(weightChart(series, { height: 240 }))}

      ${raw(trendNote(trend, status, targetWeekly))}
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Measurements</h2>
        <p class="card__sub">From your weekly check-ins. These often move when the scale will not.</p></div>
      </div>
      ${raw(weeklyEntries.length ? `<div class="grid grid--3">${measurementSparklines(weeklyEntries)}</div>`
        : '<div class="empty"><p class="small">No measurements yet. Add chest, waist and hips at your next weekly check-in.</p></div>')}
    </div>

    <div class="card">
      <div class="card__head">
        <div><h2>Habit consistency</h2>
        <p class="card__sub">Last 8 weeks. Darker means more habits hit that day; grey means the day was never logged.</p></div>
      </div>
      ${raw(adherenceHeatmap(heatDays))}

      <div class="table-wrap" style="margin-top:18px">
        <table>
          <thead><tr><th>Habit</th><th class="num">This week</th><th class="num">Last week</th><th class="num">4-week avg</th></tr></thead>
          <tbody>${raw(habitTable(state.daily, today))}</tbody>
        </table>
      </div>
    </div>

    ${raw(programCard(program, status, ctx))}
  `;
}

function trendNote(trend, status, targetWeekly) {
  if (trend.kgPerWeek == null) {
    return `<div class="note">Weigh in daily for about two weeks and this becomes genuinely useful. Below that, the noise is bigger than the signal.</div>`;
  }
  if (status.phase === 'maintenance') {
    return Math.abs(trend.kgPerWeek) <= 0.2
      ? `<div class="note note--good">Holding steady at maintenance. That is exactly what this block is for &mdash; your maintenance estimate looks accurate.</div>`
      : `<div class="note note--info">You are meant to be at maintenance but the average is moving ${fmt.signed(trend.kgPerWeek, 2, ' kg')}/week. Your maintenance number is probably off by roughly ${Math.abs(Math.round((trend.kgPerWeek * 7700) / 7))} kcal/day &mdash; worth correcting before the deficit starts.</div>`;
  }
  const gap = trend.kgPerWeek - targetWeekly;
  if (Math.abs(gap) < 0.15) return `<div class="note note--good">Tracking to plan. Change nothing.</div>`;
  if (gap > 0) return `<div class="note note--info">Slower than the ${targetWeekly.toFixed(2)} kg/week target. Check adherence and step count before touching calories &mdash; those two explain most stalls.</div>`;
  return `<div class="note note--warn">Faster than the ${targetWeekly.toFixed(2)} kg/week target. Rapid loss costs lean mass and is one of the things most likely to disrupt cycles. Consider eating a little more, not less.</div>`;
}

function habitTable(dailyMap, today) {
  const thisWeek = weeklyAdherence(dailyMap, weekStart(today));
  const lastWeek = weeklyAdherence(dailyMap, addDays(weekStart(today), -7));
  const fourWeek = [0, 1, 2, 3].map((i) => weeklyAdherence(dailyMap, addDays(weekStart(today), -7 * i)));

  return HABITS.map((h) => {
    const t = thisWeek.perHabit.find((x) => x.key === h.key);
    const l = lastWeek.perHabit.find((x) => x.key === h.key);
    const vals = fourWeek.map((w) => w.perHabit.find((x) => x.key === h.key)?.pct).filter((v) => v != null);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    return `<tr>
      <td>${h.icon} ${esc(h.label)}</td>
      <td class="num">${t?.pct == null ? '-' : `${t.pct}%`}</td>
      <td class="num">${l?.pct == null ? '-' : `${l.pct}%`}</td>
      <td class="num">${avg == null ? '-' : `${avg}%`}</td>
    </tr>`;
  }).join('');
}

function programCard(program, status, ctx) {
  if (!program) {
    return `<div class="card"><div class="empty">
      <h3>No programme set up yet</h3>
      <p class="small">Set your start date and block lengths on the Setup tab.</p>
      <button class="btn btn--primary" data-go="setup">Set up programme</button>
    </div></div>`;
  }

  const blocks = program.blocks.map((b) => {
    const isCurrent = status.block?.phase === b.phase && status.status === 'active';
    const weeks = Array.from({ length: b.weeks }, (_, i) => {
      const weekNum = program.blocks.indexOf(b) === 0 ? i + 1 : program.blocks[0].weeks + i + 1;
      const done = status.weekOverall > weekNum;
      const current = status.weekOverall === weekNum && status.status === 'active';
      const photo = weekNum % 4 === 0;
      return `<div title="Week ${weekNum}${photo ? ' - photo check-in' : ''}" style="
        flex:1;min-width:16px;height:${photo ? 30 : 22}px;border-radius:4px;
        background:${current ? 'var(--accent)' : done ? 'var(--seq-400)' : 'var(--surface-sunk)'};
        border:1px solid ${current ? 'var(--accent)' : 'var(--border)'};
        display:flex;align-items:center;justify-content:center;font-size:9px;color:${current || done ? '#fff' : 'var(--ink-3)'};font-weight:700">
        ${photo ? '📷' : ''}</div>`;
    }).join('');

    return `
      <div style="margin-bottom:14px">
        <div class="between" style="margin-bottom:5px">
          <b class="small">${esc(b.phase === 'maintenance' ? 'Maintenance' : 'Deficit')} &middot; ${b.weeks} weeks</b>
          <span class="tiny muted">${esc(fmt.dateShort(b.startDate))} &ndash; ${esc(fmt.dateShort(b.endDate))}${isCurrent ? ' &middot; current' : ''}</span>
        </div>
        <div style="display:flex;gap:3px;align-items:flex-end">${weeks}</div>
      </div>`;
  }).join('');

  return `
  <div class="card">
    <div class="card__head">
      <div><h2>Programme</h2>
      <p class="card__sub">${status.status === 'complete' ? 'Complete' : `Week ${status.weekOverall} of ${program.totalWeeks}`} &middot; camera icons are photo check-in weeks.</p></div>
      <button class="btn btn--sm btn--ghost" data-go="setup">Edit</button>
    </div>
    ${blocks}
    <div class="note ${status.phase === 'deficit' ? 'note--action' : 'note--info'}">
      <b>${esc(status.meta.label)}:</b> ${esc(status.meta.purpose)}<br>
      <span class="small">${esc(status.meta.scaleExpectation)}</span>
    </div>
  </div>`;
}

export function afterRender(root, ctx) {
  root.querySelectorAll('[data-range]').forEach((b) =>
    b.addEventListener('click', () => { rangeDays = Number(b.dataset.range); ctx.rerender(); }));
  attachChartInteractions(root);
}
