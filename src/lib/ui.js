/**
 * Tiny rendering helpers. No framework - the app is small enough that a
 * template literal and event delegation do the job without 40kB of runtime.
 */

/** Escape a value for interpolation into HTML. */
export function esc(v) {
  if (v == null) return '';
  return String(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/**
 * Tagged template that escapes interpolations by default.
 * Use `raw(str)` to opt a value out of escaping (for nested markup).
 */
const RAW = Symbol('raw');
export const raw = (s) => ({ [RAW]: String(s) });
const isRaw = (v) => v && typeof v === 'object' && RAW in v;

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    out += (Array.isArray(v) ? v.map((x) => (isRaw(x) ? x[RAW] : esc(x))).join('')
           : isRaw(v) ? v[RAW] : esc(v));
    out += strings[i + 1];
  }
  return raw(out);
}

/** Render a `html` result (or string) into a container. */
export function mount(el, content) {
  el.innerHTML = isRaw(content) ? content[RAW] : String(content);
  return el;
}

export function toHtml(content) {
  return isRaw(content) ? content[RAW] : String(content ?? '');
}

/** Format helpers used all over the views. */
export const fmt = {
  kcal: (n) => (n == null ? '-' : `${Math.round(n)}`),
  g: (n, dp = 0) => (n == null ? '-' : `${n.toFixed(dp)}g`),
  kg: (n, dp = 1) => (n == null ? '-' : `${Number(n).toFixed(dp)} kg`),
  cm: (n) => (n == null ? '-' : `${Number(n).toFixed(1)} cm`),
  pct: (n) => (n == null ? '-' : `${Math.round(n)}%`),
  signed: (n, dp = 1, unit = '') => {
    if (n == null) return '-';
    const v = Number(n);
    return `${v > 0 ? '+' : ''}${v.toFixed(dp)}${unit}`;
  },
  date: (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => {
    if (!iso) return '-';
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, opts);
  },
  dateLong: (iso) => fmt.date(iso, { weekday: 'long', day: 'numeric', month: 'long' }),
  dateShort: (iso) => fmt.date(iso, { day: 'numeric', month: 'short' }),
};

/** Transient confirmation message. */
let toastTimer = null;
export function toast(message, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}

/**
 * Modal dialog. Returns a close function.
 * Content is a `html` result; `onMount` receives the modal element.
 */
export function modal({ title, body, onMount }) {
  document.querySelector('.modal-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal__head">
        <h2>${esc(title)}</h2>
        <button class="btn btn--ghost btn--sm" data-close aria-label="Close">Close</button>
      </div>
      <div class="modal__body">${toHtml(body)}</div>
    </div>`;

  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  onMount?.(backdrop.querySelector('.modal'), close);
  return close;
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const close = modal({
      title,
      body: html`
        <p>${message}</p>
        <div class="btn-row" style="justify-content:flex-end;margin-top:16px">
          <button class="btn" data-cancel>Cancel</button>
          <button class="btn ${raw(danger ? 'btn--danger' : 'btn--primary')}" data-confirm>${confirmLabel}</button>
        </div>`,
      onMount(el) {
        el.querySelector('[data-confirm]').addEventListener('click', () => { settled = true; close(); resolve(true); });
        el.querySelector('[data-cancel]').addEventListener('click', () => { settled = true; close(); resolve(false); });
      },
    });
    // Backdrop / Escape dismissal counts as "no".
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.modal-backdrop') && !settled) { settled = true; observer.disconnect(); resolve(false); }
    });
    observer.observe(document.body, { childList: true });
  });
}

/** Read a number from an input, returning null for blank rather than NaN. */
export function numVal(el) {
  const v = el.value.trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Debounce, for text inputs that save as you type. */
export function debounce(fn, ms = 450) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
