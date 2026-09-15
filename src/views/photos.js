/**
 * Photo check-in, every 4 weeks.
 *
 * Photos are stored in this browser's IndexedDB and are never uploaded
 * anywhere. They are also the single most honest progress metric you have -
 * the scale lies for weeks at a time, and photos do not.
 */

import { html, raw, esc, fmt, toast, confirmDialog, modal, numVal } from '../lib/ui.js';
import * as store from '../lib/store.js';
import { todayIso } from '../lib/cycle.js';

export const title = 'Photos';

const ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];

let compareA = null;
let compareB = null;

export function render(ctx) {
  const { state, photoStatus } = ctx;
  const dates = Object.keys(state.photos).sort().reverse();
  const today = todayIso();

  return html`
    ${raw(photoStatus?.due
      ? `<div class="note note--action"><b>Photo check-in is due.</b> Take them in the same spot, same light and roughly the same time of day as last time. Morning, before food, is the easiest condition to repeat.</div>`
      : photoStatus?.nextDue
        ? `<div class="note note--info">Next photo check-in: <b>${esc(fmt.date(photoStatus.nextDue))}</b>.</div>`
        : '')}

    <div class="card">
      <div class="card__head">
        <div><h2>New photo check-in</h2>
        <p class="card__sub">Front, side and back. Stored on this device only &mdash; nothing is uploaded.</p></div>
        <span class="badge">${esc(fmt.date(today))}</span>
      </div>

      <div class="photo-grid">
        ${raw(ANGLES.map((a) => `
          <label class="photo-slot" for="photo-${a.key}">
            <span style="font-size:1.4rem">📷</span>
            <span>${a.label}</span>
            <input id="photo-${a.key}" type="file" accept="image/*" capture="environment"
              data-angle="${a.key}" class="sr-only">
          </label>`).join(''))}
      </div>

      <div class="field-row" style="margin-top:14px">
        <div class="field">
          <label for="photo-weight">Weight that morning (optional)</label>
          <input id="photo-weight" type="number" step="0.1" inputmode="decimal" placeholder="0.0"
            value="${state.daily[today]?.weightKg ?? ''}">
        </div>
        <div class="field">
          <label for="photo-note">Note</label>
          <input id="photo-note" type="text" placeholder="How you feel in your clothes, energy, anything you notice.">
        </div>
      </div>

      <div class="note small">
        <b>Make them comparable.</b> Same outfit, same room, same light, phone at the same height,
        feet in the same spot, arms relaxed at your sides. Photos taken under different conditions
        are worse than no photos &mdash; they will tell you a story that is not true, in either direction.
      </div>
    </div>

    ${raw(dates.length >= 2 ? compareCard(dates, state) : '')}

    <div class="card">
      <div class="card__head"><h2>History</h2>
      ${raw(dates.length ? `<span class="badge">${dates.length} check-in${dates.length === 1 ? '' : 's'}</span>` : '')}</div>
      ${raw(dates.length
        ? dates.map((d) => historyRow(d, state.photos[d])).join('')
        : '<div class="empty"><p class="small">No photo check-ins yet. The first set is the baseline everything else gets compared against &mdash; take them even if you do not want to.</p></div>')}
    </div>
  `;
}

function historyRow(date, set) {
  return `
    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:10px">
      <div class="between" style="margin-bottom:10px">
        <div>
          <b>${esc(fmt.dateLong(date))}</b>
          ${set.weightKg ? `<span class="muted small"> &middot; ${Number(set.weightKg).toFixed(1)} kg</span>` : ''}
        </div>
        <button class="btn btn--sm btn--danger" data-delete-set="${esc(date)}">Delete</button>
      </div>
      <div class="photo-grid">
        ${ANGLES.map((a) => set[a.key]
          ? `<div class="photo-slot" data-view="${esc(set[a.key])}" style="cursor:zoom-in">
               <img data-photo="${esc(set[a.key])}" alt="${a.label} photo from ${esc(fmt.date(date))}">
               <span class="photo-slot__tag">${a.label}</span>
             </div>`
          : `<div class="photo-slot"><span class="tiny muted">No ${a.label.toLowerCase()} photo</span></div>`).join('')}
      </div>
      ${set.note ? `<p class="small muted" style="margin:10px 0 0">${esc(set.note)}</p>` : ''}
    </div>`;
}

function compareCard(dates, state) {
  const a = compareA ?? dates[dates.length - 1];
  const b = compareB ?? dates[0];
  const opts = (sel) => dates.map((d) => `<option value="${esc(d)}" ${d === sel ? 'selected' : ''}>${esc(fmt.date(d))}</option>`).join('');

  const setA = state.photos[a] ?? {};
  const setB = state.photos[b] ?? {};
  const wDelta = setA.weightKg && setB.weightKg ? Number(setB.weightKg) - Number(setA.weightKg) : null;

  return `
  <div class="card">
    <div class="card__head">
      <div><h2>Compare</h2>
      <p class="card__sub">Side by side is the only way photos are useful. A single photo tells you nothing.</p></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="cmp-a">Earlier</label><select id="cmp-a" data-cmp="a">${opts(a)}</select></div>
      <div class="field"><label for="cmp-b">Later</label><select id="cmp-b" data-cmp="b">${opts(b)}</select></div>
    </div>
    ${wDelta != null ? `<div class="note ${wDelta < 0 ? 'note--good' : ''}">${fmt.signed(wDelta, 1, ' kg')} between these two check-ins.</div>` : ''}
    ${ANGLES.map((ang) => (setA[ang.key] || setB[ang.key]) ? `
      <div style="margin-bottom:12px">
        <h3 style="font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3)">${ang.label}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="photo-slot">${setA[ang.key] ? `<img data-photo="${esc(setA[ang.key])}" alt="${ang.label}, ${esc(fmt.date(a))}"><span class="photo-slot__tag">${esc(fmt.dateShort(a))}</span>` : '<span class="tiny muted">none</span>'}</div>
          <div class="photo-slot">${setB[ang.key] ? `<img data-photo="${esc(setB[ang.key])}" alt="${ang.label}, ${esc(fmt.date(b))}"><span class="photo-slot__tag">${esc(fmt.dateShort(b))}</span>` : '<span class="tiny muted">none</span>'}</div>
        </div>
      </div>` : '').join('')}
  </div>`;
}

/** Load blobs into <img> elements after render. Object URLs are revoked on next render. */
let objectUrls = [];
async function hydratePhotos(root) {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];

  const imgs = [...root.querySelectorAll('img[data-photo]')];
  await Promise.all(imgs.map(async (img) => {
    try {
      const blob = await store.loadPhoto(img.dataset.photo);
      if (!blob) { img.remove(); return; }
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      img.src = url;
    } catch {
      img.remove();
    }
  }));
}

export function afterRender(root, ctx) {
  hydratePhotos(root);

  root.querySelectorAll('input[type="file"][data-angle]').forEach((input) =>
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const date = todayIso();
      try {
        const blob = await store.downscaleImage(file);
        const id = `${date}-${input.dataset.angle}-${Date.now().toString(36)}`;
        await store.savePhoto(id, blob);

        const weight = numVal(root.querySelector('#photo-weight'));
        const note = root.querySelector('#photo-note')?.value ?? '';

        store.update((s) => {
          s.photos[date] = { ...(s.photos[date] ?? {}), [input.dataset.angle]: id, weightKg: weight, note };
        });
        toast(`${input.dataset.angle} photo saved`);
        ctx.rerender();
      } catch (err) {
        toast(err.message ?? 'Could not save that photo');
      }
    }));

  root.querySelectorAll('[data-cmp]').forEach((sel) =>
    sel.addEventListener('change', () => {
      if (sel.dataset.cmp === 'a') compareA = sel.value; else compareB = sel.value;
      ctx.rerender();
    }));

  root.querySelectorAll('[data-delete-set]').forEach((b) =>
    b.addEventListener('click', async () => {
      const date = b.dataset.deleteSet;
      const ok = await confirmDialog({
        title: 'Delete this photo check-in?',
        message: `All photos from ${fmt.dateLong(date)} will be permanently removed from this device. This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;

      const set = ctx.state.photos[date] ?? {};
      for (const a of ANGLES) if (set[a.key]) await store.deletePhoto(set[a.key]);
      store.update((s) => { delete s.photos[date]; });
      toast('Check-in deleted');
      ctx.rerender();
    }));

  root.querySelectorAll('[data-view]').forEach((el) =>
    el.addEventListener('click', async () => {
      const blob = await store.loadPhoto(el.dataset.view);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      modal({
        title: 'Photo',
        body: html`<img src="${url}" alt="Progress photo" style="width:100%;border-radius:var(--radius-sm)">`,
        onMount: () => {},
      });
    }));
}
