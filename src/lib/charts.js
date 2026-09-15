/**
 * Inline SVG charts. No library.
 *
 * Conventions follow a validated data-visualisation method:
 *   - One y-axis, never two.
 *   - A single data series carries no legend; the title names it.
 *   - Series colours come from a validated categorical palette via CSS custom
 *     properties, so light and dark are each stepped for their own surface.
 *   - The adherence heatmap is an ordinal encoding, so it uses one hue stepped
 *     light to dark, never a rainbow.
 *   - Line charts get a crosshair and tooltip, because an HTML chart that
 *     cannot be interrogated is a picture.
 */

import { esc, fmt } from './ui.js';

/**
 * Chart viewBox width. A 720-wide box squashed into a 340px phone column makes
 * the axis labels unreadable, so narrow viewports get a narrower box and
 * therefore a taller, more legible chart.
 */
function chartWidth() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 900;
  return vw < 600 ? 380 : 720;
}

/**
 * Weight chart: daily readings as faint dots, the rolling average as the line
 * that actually matters.
 *
 * @param {{date:string, weight:number|null, average:number|null}[]} series
 */
export function weightChart(series, { height = 220, goalKg = null, label = 'Weight' } = {}) {
  const W = chartWidth();
  const pts = series.filter((s) => s.weight != null || s.average != null);
  if (pts.length < 2) {
    return `<div class="empty"><p class="small">Log a few more weigh-ins and the trend line will appear here.<br>It needs at least three readings before an average means anything.</p></div>`;
  }

  const narrow = W < 600;
  const pad = { t: 14, r: narrow ? 12 : 16, b: 26, l: narrow ? 34 : 40 };
  const innerW = W - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const values = pts.flatMap((p) => [p.weight, p.average]).filter((v) => v != null);
  if (goalKg != null) values.push(goalKg);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const span = Math.max(1.2, hi - lo);
  lo -= span * 0.14; hi += span * 0.14;

  const x = (i) => pad.l + (i / (pts.length - 1)) * innerW;
  const y = (v) => pad.t + innerH - ((v - lo) / (hi - lo)) * innerH;

  // Y gridlines at readable intervals.
  const ticks = niceTicks(lo, hi, narrow ? 3 : 4);
  const grid = ticks.map((t) => `
    <line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="axis-label" x="${pad.l - 7}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${t.toFixed(1)}</text>`).join('');

  // Average line, drawn only across contiguous runs so a logging gap shows as a gap.
  const avgSegments = [];
  let run = [];
  pts.forEach((p, i) => {
    if (p.average != null) run.push([x(i), y(p.average)]);
    else if (run.length) { avgSegments.push(run); run = []; }
  });
  if (run.length) avgSegments.push(run);

  const avgPath = avgSegments
    .filter((seg) => seg.length > 1)
    .map((seg) => `<path d="M${seg.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join('L')}" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');

  const dots = pts.map((p, i) => (p.weight == null ? '' :
    `<circle cx="${x(i).toFixed(1)}" cy="${y(p.weight).toFixed(1)}" r="${narrow ? 2 : 2.6}" fill="var(--ink-3)" opacity=".42"/>`)).join('');

  const last = [...pts].reverse().find((p) => p.average != null);
  const lastIdx = last ? pts.indexOf(last) : -1;
  const endMarker = last
    ? `<circle cx="${x(lastIdx).toFixed(1)}" cy="${y(last.average).toFixed(1)}" r="4.5" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2"/>`
    : '';

  const goalLine = goalKg != null
    ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(goalKg).toFixed(1)}" y2="${y(goalKg).toFixed(1)}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4" opacity=".75"/>
       <text class="axis-label" x="${W - pad.r}" y="${(y(goalKg) - 6).toFixed(1)}" text-anchor="end" fill="var(--accent)">goal</text>`
    : '';

  // X labels: first, middle, last.
  const xLabels = [0, Math.floor((pts.length - 1) / 2), pts.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((i) => `<text class="axis-label" x="${x(i).toFixed(1)}" y="${height - 7}" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${esc(fmt.dateShort(pts[i].date))}</text>`)
    .join('');

  const hitAreas = pts.map((p, i) => `<rect x="${(x(i) - innerW / pts.length / 2).toFixed(1)}" y="${pad.t}" width="${(innerW / pts.length).toFixed(1)}" height="${innerH}" fill="transparent" data-i="${i}"/>`).join('');

  const data = pts.map((p) => ({ d: p.date, w: p.weight, a: p.average }));

  return `
  <div class="chart" data-chart="weight" data-points='${esc(JSON.stringify(data))}'>
    <svg viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(label)} over time. Faint dots are daily readings; the line is the 7-day rolling average.">
      ${grid}
      ${goalLine}
      ${dots}
      ${avgPath}
      ${endMarker}
      ${xLabels}
      <g class="chart__crosshair" opacity="0"><line y1="${pad.t}" y2="${pad.t + innerH}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/></g>
      <g data-hit>${hitAreas}</g>
    </svg>
    <div class="chart__tip" hidden></div>
  </div>`;
}

/** Wire up crosshair + tooltip on any rendered weight chart inside `root`. */
export function attachChartInteractions(root) {
  root.querySelectorAll('[data-chart="weight"]').forEach((chart) => {
    const svg = chart.querySelector('svg');
    const tip = chart.querySelector('.chart__tip');
    const cross = chart.querySelector('.chart__crosshair line');
    const crossG = chart.querySelector('.chart__crosshair');
    let points;
    try { points = JSON.parse(chart.dataset.points); } catch { return; }

    const show = (i, rect) => {
      const p = points[i];
      if (!p) return;
      const hit = svg.querySelector(`[data-i="${i}"]`);
      if (!hit) return;
      const cx = Number(hit.getAttribute('x')) + Number(hit.getAttribute('width')) / 2;
      const scale = rect.width / svg.viewBox.baseVal.width;

      crossG.setAttribute('opacity', '1');
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);

      tip.hidden = false;
      tip.innerHTML = `<b>${esc(fmt.date(p.d))}</b>
        ${p.a != null ? `7-day avg <strong>${p.a.toFixed(2)} kg</strong>` : '<span class="muted">no average yet</span>'}
        ${p.w != null ? `<br><span class="muted">logged ${p.w.toFixed(1)} kg</span>` : ''}`;
      tip.style.left = `${cx * scale}px`;
      tip.style.top = `${rect.height * 0.42}px`;
    };

    const hide = () => { tip.hidden = true; crossG.setAttribute('opacity', '0'); };

    svg.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect();
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-i]');
      if (hit) show(Number(hit.dataset.i), rect);
    });
    svg.addEventListener('pointerleave', hide);
  });
}

/**
 * Habit adherence heatmap: one column per week, one row per weekday.
 *
 * Laid out week-per-column rather than week-per-row so it stays a compact
 * calendar strip at any width instead of inflating into giant squares on a
 * wide screen. Ordinal encoding on a single hue - never a rainbow - with an
 * explicitly different colour for "never logged" so a zero-score day and an
 * unlogged day cannot be confused.
 */
export function adherenceHeatmap(days, { weeks = 8 } = {}) {
  const cells = days.slice(-weeks * 7);
  if (!cells.length) return '<p class="small muted">No days logged yet.</p>';

  const step = (v) => {
    if (v == null) return 'var(--surface-sunk)';
    if (v >= 0.99) return 'var(--seq-600)';
    if (v >= 0.8) return 'var(--seq-500)';
    if (v >= 0.6) return 'var(--seq-400)';
    if (v >= 0.35) return 'var(--seq-250)';
    return 'var(--seq-100)';
  };

  // Pad the front so row 0 is always Monday and each column is a real week.
  const firstDow = (new Date(`${cells[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const padded = [...Array.from({ length: firstDow }, () => null), ...cells];

  const grid = padded.map((c) => {
    if (!c) return '<div class="heatmap__cell heatmap__cell--empty"></div>';
    const pct = c.score == null ? 'not logged' : `${Math.round(c.score * 100)}% of habits hit`;
    return `<div class="heatmap__cell" style="background:${step(c.score)}" title="${esc(fmt.date(c.date))} - ${pct}"></div>`;
  }).join('');

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    .map((d) => `<div class="heatmap__daylabel">${d}</div>`).join('');

  return `
    <div class="heatmap-wrap">
      <div class="heatmap__days">${dayLabels}</div>
      <div class="heatmap">${grid}</div>
    </div>
    <div class="heatmap__legend">
      <span class="heatmap__swatch" style="background:var(--surface-sunk)"></span>
      <span>Not logged</span>
      <span style="margin-left:10px">Fewer</span>
      <span class="heatmap__swatch" style="background:var(--seq-100)"></span>
      <span class="heatmap__swatch" style="background:var(--seq-250)"></span>
      <span class="heatmap__swatch" style="background:var(--seq-400)"></span>
      <span class="heatmap__swatch" style="background:var(--seq-500)"></span>
      <span class="heatmap__swatch" style="background:var(--seq-600)"></span>
      <span>All habits</span>
    </div>`;
}

/** Horizontal progress bar for one macro against its target. */
export function macroBar(label, value, target, unit = 'g') {
  const pct = target > 0 ? Math.min(140, (value / target) * 100) : 0;
  const cls = pct >= 92 && pct <= 112 ? 'progress-fill--good'
            : pct > 112 ? 'progress-fill--warn'
            : pct < 75 ? 'progress-fill--bad' : '';
  return `
    <div class="macro-bar">
      <div class="macro-bar__head">
        <span>${esc(label)}</span>
        <span><b>${Math.round(value)}</b><span class="muted"> / ${Math.round(target)}${esc(unit)}</span></span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${cls}" style="width:${Math.min(100, pct).toFixed(1)}%"></div>
      </div>
    </div>`;
}

/** Simple measurement trend: three small sparklines, one per site. */
export function measurementSparklines(entries) {
  const sites = [
    { key: 'chestCm', label: 'Chest', colour: 'var(--series-1)' },
    { key: 'waistCm', label: 'Waist', colour: 'var(--series-2)' },
    { key: 'hipsCm', label: 'Hips', colour: 'var(--series-3)' },
  ];

  return sites.map(({ key, label, colour }) => {
    const vals = entries.map((e) => e[key]).filter((v) => v != null).map(Number);
    if (vals.length < 2) {
      return `<div class="stat"><div class="stat__label">${label}</div><div class="stat__value">${vals[0] != null ? vals[0].toFixed(1) : '-'}<small>cm</small></div><div class="stat__note">Need two check-ins to show a trend.</div></div>`;
    }
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const range = Math.max(0.8, hi - lo);
    const w = 120, h = 30;
    const d = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - ((v - lo) / range) * h).toFixed(1)}`).join('L');
    const change = vals[vals.length - 1] - vals[0];

    return `
      <div class="stat">
        <div class="stat__label">${label}</div>
        <div class="stat__value">${vals[vals.length - 1].toFixed(1)}<small>cm</small></div>
        <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:30px;margin-top:4px" role="img" aria-label="${label} trend: ${fmt.signed(change, 1, ' cm')} across ${vals.length} check-ins">
          <path d="M${d}" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="stat__note">${fmt.signed(change, 1, ' cm')} across ${vals.length} check-ins</div>
      </div>`;
  }).join('');
}

function niceTicks(lo, hi, count) {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const stepMul = norm >= 5 ? 5 : norm >= 2 ? 2 : norm >= 1 ? 1 : 0.5;
  const step = stepMul * mag;
  const start = Math.ceil(lo / step) * step;
  const out = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
