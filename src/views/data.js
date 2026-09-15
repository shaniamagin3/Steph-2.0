/**
 * Data: backup, restore, and the honest explanation of where everything lives.
 */

import { html, raw, esc, fmt, toast, confirmDialog } from '../lib/ui.js';
import * as store from '../lib/store.js';

export const title = 'Data';

export function render(ctx) {
  const { state } = ctx;
  const counts = {
    daily: Object.keys(state.daily).length,
    weekly: Object.keys(state.weekly).length,
    plans: Object.keys(state.plans).length,
    photos: Object.keys(state.photos).length,
    meals: state.customMeals.length,
  };

  const firstLog = Object.keys(state.daily).sort()[0];

  return html`
    <div class="card">
      <div class="card__head">
        <div><h2>Where your data lives</h2></div>
      </div>
      <p>Everything in this app is stored <b>in this browser, on this device</b>. There is no account, no server,
      and no network request anywhere in the code. Your weight, measurements, journal entries, cycle data and
      photos have never been sent anywhere and cannot be.</p>
      <p>That is a deliberate trade, and it cuts both ways:</p>
      <ul class="small">
        <li>Nobody can sell, leak, subpoena or breach data that was never uploaded.</li>
        <li>Clearing your browser data, using private browsing, or switching device <b>loses everything</b>.</li>
      </ul>
      <div class="note note--action"><b>So export regularly.</b> The export file is your only backup. Once a month,
      after your photo check-in, is a sensible rhythm.</div>
    </div>

    <div class="card">
      <div class="card__head"><div><h2>What you have logged</h2></div></div>
      <div class="grid grid--4">
        <div class="stat"><div class="stat__label">Daily check-ins</div><div class="stat__value">${counts.daily}</div>
          ${raw(firstLog ? `<div class="stat__note">since ${esc(fmt.dateShort(firstLog))}</div>` : '')}</div>
        <div class="stat"><div class="stat__label">Weekly check-ins</div><div class="stat__value">${counts.weekly}</div></div>
        <div class="stat"><div class="stat__label">Meal plans</div><div class="stat__value">${counts.plans}</div></div>
        <div class="stat"><div class="stat__label">Photo sets</div><div class="stat__value">${counts.photos}</div></div>
      </div>
      <p class="hint" style="margin-top:12px">Plus ${counts.meals} of your own meals in the library.</p>
      <div data-storage></div>
    </div>

    <div class="card">
      <div class="card__head"><div><h2>Backup</h2>
      <p class="card__sub">A JSON file with everything except photos. Photos are too large for it and stay on this device.</p></div></div>

      <div class="btn-row">
        <button class="btn btn--primary" data-action="export">Export my data</button>
        <label class="btn" for="import-file" style="margin:0">Import a backup</label>
        <input id="import-file" type="file" accept="application/json,.json" class="sr-only">
      </div>

      <div class="field" style="margin-top:14px">
        <label>
          <input type="checkbox" id="import-merge" style="width:auto;margin-right:7px" checked>
          Merge with what is already here, rather than replacing it
        </label>
        <p class="hint">Merging keeps both sets of check-ins. Replacing wipes what is on this device first &mdash;
        use it when you are restoring onto a fresh browser.</p>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><div><h2 style="color:var(--bad)">Danger zone</h2></div></div>
      <p class="small">Deletes every check-in, plan, measurement, custom meal and photo on this device. There is no undo
      and no copy anywhere else. Export first.</p>
      <button class="btn btn--danger" data-action="reset">Delete everything</button>
    </div>

    <div class="card">
      <div class="card__head"><div><h2>Appearance</h2></div></div>
      <div class="field">
        <label>Theme</label>
        <div class="seg" role="group" aria-label="Theme">
          ${raw(['system', 'light', 'dark'].map((t) =>
            `<button data-theme="${t}" aria-pressed="${state.settings.theme === t}">${t[0].toUpperCase()}${t.slice(1)}</button>`).join(''))}
        </div>
      </div>
    </div>
  `;
}

export function afterRender(root, ctx) {
  store.storageEstimate().then((est) => {
    const el = root.querySelector('[data-storage]');
    if (!el || !est) return;
    const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
    el.innerHTML = `<div class="note ${est.pct > 80 ? 'note--warn' : ''} small" style="margin-top:12px">
      Using about ${mb(est.usage)} of roughly ${mb(est.quota)} available in this browser${est.pct != null ? ` (${est.pct}%)` : ''}.
      ${est.pct > 80 ? ' Getting full &mdash; export, then delete some older photo sets.' : ''}</div>`;
  }).catch(() => {});

  root.querySelector('[data-action="export"]')?.addEventListener('click', () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steph-2-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup downloaded');
  });

  root.querySelector('#import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const merge = root.querySelector('#import-merge')?.checked ?? true;

    if (!merge) {
      const ok = await confirmDialog({
        title: 'Replace all data?',
        message: 'Everything currently on this device will be wiped and replaced with the contents of this file.',
        confirmLabel: 'Replace', danger: true,
      });
      if (!ok) { e.target.value = ''; return; }
    }

    const text = await file.text();
    const res = store.importJson(text, { merge });
    e.target.value = '';
    if (res.ok) { toast(merge ? 'Backup merged' : 'Backup restored'); ctx.rerender(); }
    else toast(res.error ?? 'Import failed');
  });

  root.querySelector('[data-action="reset"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete everything?',
      message: 'Every check-in, plan, measurement and custom meal on this device will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete everything', danger: true,
    });
    if (!ok) return;
    const reallyOk = await confirmDialog({
      title: 'Last check',
      message: 'Have you exported a backup? Once this is done there is no way to get any of it back.',
      confirmLabel: 'Yes, delete it all', danger: true,
    });
    if (!reallyOk) return;
    store.resetAll();
    toast('All data deleted');
    ctx.rerender();
  });

  root.querySelectorAll('[data-theme]').forEach((b) =>
    b.addEventListener('click', () => {
      store.update((s) => { s.settings.theme = b.dataset.theme; });
      applyTheme(b.dataset.theme);
      ctx.rerender();
    }));
}

export function applyTheme(theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}
