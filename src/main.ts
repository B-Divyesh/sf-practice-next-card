import './style.css';
import { EMPTY_DATA, elapsedSeconds, formatTime, hasCardDetails, isHttpUrl, makeId, todayQueue, validateImport, type AppData, type Outcome, type PracticeCard } from './core';
import { loadData, saveData } from './db';

const app = document.querySelector<HTMLDivElement>('#app')!;
const LICENSE_KEY = 'sb_license:practice-next-card';
const VERDICT_KEY = 'sb_license_verdict:practice-next-card';
const BUY_URL = 'https://api.sociobot.in/api/v1/products/practice-next-card/checkout';
let data: AppData = structuredClone(EMPTY_DATA);
let activeId = '';
let toastTimer = 0;
let hasLicense = false;

const escapeHtml = (value: string | undefined = '') => value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
const path = () => location.pathname.replace(/\/$/, '') || '/';

function shell(content: string, active = ''): string {
  return `
    <header class="site-header">
      <a class="wordmark" href="/" data-route aria-label="Practice Next Card home"><span class="brand-mark" aria-hidden="true">▶</span><span>Practice<br>Next Card</span></a>
      <nav aria-label="Primary">
        <a href="/" data-route ${active === 'today' ? 'aria-current="page"' : ''}>Today</a>
        <a href="/archive" data-route ${active === 'archive' ? 'aria-current="page"' : ''}>Archive</a>
        <a href="/settings" data-route ${active === 'settings' ? 'aria-current="page"' : ''}>Settings</a>
      </nav>
      <span class="net-state" id="net-state"><span aria-hidden="true">●</span> ${navigator.onLine ? 'On device' : 'Offline · saved locally'}</span>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <footer>
      <p>Private by default. Built for the next honest five minutes.</p>
      <nav aria-label="Legal"><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a></nav>
      <p class="provenance">Original generated collage; no scores or artist data included.</p>
    </footer>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function home(): string {
  const queue = todayQueue(data.cards);
  const active = queue.find(card => card.id === activeId) ?? queue[0];
  activeId = active?.id ?? '';
  const slots = [0, 1, 2].map((_, index) => {
    const card = queue[index];
    if (!card) return `<li class="queue-slot empty-slot"><span class="slot-number">0${index + 1}</span><span>Open slot</span></li>`;
    return `<li><button class="queue-card ${card.id === activeId ? 'is-active' : ''}" data-open-card="${card.id}">
      <span class="slot-number">0${index + 1}</span><span class="queue-copy"><strong>${escapeHtml(card.piece)}</strong><small>m. ${escapeHtml(card.measure)} · ${escapeHtml(card.action)}</small></span><span aria-hidden="true">→</span>
    </button></li>`;
  }).join('');

  const activePanel = active ? `
    <section class="active-card" aria-labelledby="active-heading">
      <p class="eyebrow">On the stand</p>
      <h2 id="active-heading">${escapeHtml(active.piece)}</h2>
      <p class="measure-tag">Measure ${escapeHtml(active.measure)}</p>
      <p class="next-action">${escapeHtml(active.action)}</p>
      ${active.scorePhoto ? `<img class="score-photo" src="${escapeHtml(active.scorePhoto)}" alt="Your reference photo for ${escapeHtml(active.piece)}, measure ${escapeHtml(active.measure)}">` : ''}
      ${active.scoreLink ? `<a class="score-link" href="${escapeHtml(active.scoreLink)}" target="_blank" rel="noreferrer">Open my score reference <span aria-hidden="true">↗</span></a>` : ''}
      <div class="transport" aria-label="Practice timer">
        <span class="counter" id="timer-counter">${formatTime(elapsedSeconds(active))}</span>
        <button class="transport-button" id="timer-toggle" data-id="${active.id}">${active.timerStartedAt ? '<span aria-hidden="true">Ⅱ</span> Pause' : '<span aria-hidden="true">▶</span> Start timer'}</button>
      </div>
      <div class="card-actions">
        <button class="button primary" id="finish-card" data-id="${active.id}">Log this attempt</button>
        <button class="button text-button" id="edit-card" data-id="${active.id}">Edit card</button>
      </div>
      ${active.attempts.length ? `<p class="attempt-count">${active.attempts.length} attempt${active.attempts.length === 1 ? '' : 's'} on this card</p>` : ''}
    </section>` : `
    <section class="welcome" aria-labelledby="empty-heading">
      <div class="welcome-copy"><p class="eyebrow">The paper scrap, upgraded</p><h2 id="empty-heading">Leave yourself a precise place to begin.</h2><p>Write one action at one troublesome measure. Next time, no warm-up decisions—just press play.</p><button class="button primary" id="empty-add">Make the first card</button></div>
      <img src="/assets/hero-cassette.webp" width="768" height="512" fetchpriority="high" decoding="async" alt="A cassette, pencil, stopwatch and three blank practice slips arranged like a handmade music zine">
    </section>`;

  return shell(`
    <div class="home-heading"><div><p class="kicker">Side A · today's take</p><h1>What happens next?</h1><p>Three focused moves. No streaks, scores, or judgment.</p></div><button class="button stamp" id="add-card" ${queue.length >= 3 ? 'disabled aria-describedby="queue-limit"' : ''}>+ Add card</button></div>
    <div class="practice-layout">
      <section class="queue" aria-labelledby="queue-heading"><div class="section-heading"><h2 id="queue-heading">Today’s three</h2><span>${queue.length}/3 loaded</span></div><ol>${slots}</ol><p id="queue-limit" class="queue-note">${queue.length >= 3 ? 'Finish or archive one card before adding another.' : 'Keep it playable: one measure, one action.'}</p></section>
      ${activePanel}
    </div>
    <section class="how-strip" aria-label="Practice card rhythm"><span><b>1</b> Name the spot</span><span><b>2</b> Try one move</span><span><b>3</b> Leave the handoff</span></section>
  `, 'today');
}

function archive(): string {
  const all = data.cards.filter(card => card.status === 'completed').sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const visible = hasLicense ? all : all.slice(0, 30);
  return shell(`
    <div class="page-heading"><p class="kicker">The tape box</p><h1>Attempt archive</h1><p>Reopen the moves worth another pass. Your data stays on this device.</p></div>
    ${hasLicense && all.length ? `<label class="search-label" for="archive-search">Search piece, measure, or move<input id="archive-search" type="search" autocomplete="off"></label>` : ''}
    <section aria-labelledby="archive-list-heading"><h2 class="visually-hidden" id="archive-list-heading">Completed practice cards</h2>
    ${visible.length ? `<ul class="archive-list">${visible.map(card => archiveItem(card)).join('')}</ul>` : `<div class="plain-empty"><span aria-hidden="true">□</span><h2>No finished cards yet.</h2><p>Log an attempt from Today and its card will land here.</p><a class="button primary" href="/" data-route>Go to today</a></div>`}
    </section>
    ${!hasLicense && all.length > 30 ? `<aside class="unlock-note"><strong>${all.length - 30} older cards are safely stored.</strong><p>Supporter edition makes the full archive visible and searchable. Export always includes everything.</p><a class="button secondary" href="${BUY_URL}">Unlock for $9 once</a></aside>` : ''}
  `, 'archive');
}

function archiveItem(card: PracticeCard): string {
  const attempt = card.attempts.at(-1);
  return `<li class="archive-item" data-search="${escapeHtml(`${card.piece} ${card.measure} ${card.action}`.toLowerCase())}">
    <div><span class="outcome-chip">${escapeHtml(attempt?.outcome ?? 'Attempt logged')}</span><h3>${escapeHtml(card.piece)} · m. ${escapeHtml(card.measure)}</h3><p>${escapeHtml(card.action)}</p>${attempt?.evidence ? `<blockquote>“${escapeHtml(attempt.evidence)}”</blockquote>` : ''}</div>
    <div class="archive-meta"><time datetime="${card.updatedAt}">${new Date(card.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time><span>${formatTime(attempt?.seconds ?? 0)}</span><button class="button small-button" data-reopen="${card.id}">Reopen</button></div>
  </li>`;
}

function settings(): string {
  return shell(`
    <div class="page-heading"><p class="kicker">Your tape case</p><h1>Settings & data</h1><p>Everything is stored locally in this browser. Take a backup whenever you like.</p></div>
    <div class="settings-grid">
      <section><h2>Own your cards</h2><p>Export every card, attempt, timer, and reference as a JSON backup. Import replaces data on this device after confirmation.</p><div class="button-row"><button class="button secondary" id="export-data">Export backup</button><label class="button text-button file-button">Import backup<input id="import-data" type="file" accept="application/json"></label></div></section>
      <section><p class="edition-label">${hasLicense ? 'Supporter edition active' : 'Optional supporter edition'}</p><h2>${hasLicense ? 'Thanks for keeping the tape rolling.' : 'Keep the whole tape box.'}</h2><p>${hasLicense ? 'Full archive visibility and search are unlocked on this device.' : 'A $9 one-time purchase unlocks full archive visibility and search. The three-card practice loop, photos, export, and your latest 30 archived cards stay free.'}</p>
        ${hasLicense ? '<p class="success-line">✓ License verified or cached for offline use.</p>' : `<a class="button primary" href="${BUY_URL}">Buy once · $9</a><details><summary>Already bought it?</summary><form id="license-form"><label for="license-token">Paste your license token</label><div class="inline-form"><input id="license-token" required autocomplete="off"><button class="button secondary">Restore</button></div></form></details>`}
        <p class="merchant-note">Checkout and refunds are handled by Sociobot / Dodo, the merchant of record.</p>
      </section>
      <section><h2>Storage check</h2><p id="storage-summary">${data.cards.length} card${data.cards.length === 1 ? '' : 's'} saved on this device.</p><button class="button danger-button" id="clear-data">Erase all local data</button></section>
    </div>
  `, 'settings');
}

function legal(kind: 'privacy' | 'terms'): string {
  const privacy = `<div class="legal-page"><p class="kicker">Plain-language policy</p><h1>Privacy</h1><p class="updated">Effective August 27, 2026</p><h2>Your notes stay with you</h2><p>Practice Next Card stores cards, attempts, optional score-reference photos, links, and license details in your browser. We do not receive your practice notes or photos.</p><h2>Network requests</h2><p>The app works offline. If you buy or verify Supporter edition, your browser contacts the Sociobot billing API with your license token. Checkout is handled by Sociobot / Dodo under their policies. We include no advertising, analytics, tracking pixels, remote fonts, or third-party scripts.</p><h2>Your control</h2><p>Export a complete JSON backup or erase local data from Settings. Removing browser storage or uninstalling the app also removes local cards unless you exported them first.</p><h2>Score content</h2><p>Only add photos or links you have the right to use. This app does not host or distribute scores.</p><p>Questions: <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a></p></div>`;
  const terms = `<div class="legal-page"><p class="kicker">Use agreement</p><h1>Terms</h1><p class="updated">Effective August 27, 2026</p><h2>A practice notebook, not instruction</h2><p>Practice Next Card helps you record your own next actions and attempts. It does not provide teaching, assessment, or guarantees of skill improvement.</p><h2>Your content</h2><p>You keep ownership of your notes and images. Add only score references you are entitled to use; do not use the app to distribute copyrighted sheet music.</p><h2>Purchase</h2><p>Supporter edition is a $9 one-time license for full archive visibility and search. Sociobot / Dodo is the merchant of record and handles payment and refunds. A refunded, revoked, expired, or wrong-product license may stop unlocking paid features. Core cards and export remain available.</p><h2>Availability</h2><p>The app is provided “as is.” Keep exports of anything important. We may update the app while preserving reasonable access to locally stored data.</p><p>Questions: <a href="mailto:support@sociobot.in">support@sociobot.in</a></p></div>`;
  return shell(kind === 'privacy' ? privacy : terms);
}

function render(): void {
  const current = path();
  app.innerHTML = current === '/archive' ? archive() : current === '/settings' ? settings() : current === '/privacy' ? legal('privacy') : current === '/terms' ? legal('terms') : home();
  bindGlobal();
  if (current === '/') bindHome();
  if (current === '/archive') bindArchive();
  if (current === '/settings') bindSettings();
}

function bindGlobal(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); history.pushState({}, '', link.pathname); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

function bindHome(): void {
  document.querySelector('#add-card')?.addEventListener('click', () => openCardDialog());
  document.querySelector('#empty-add')?.addEventListener('click', () => openCardDialog());
  document.querySelectorAll<HTMLButtonElement>('[data-open-card]').forEach(button => button.addEventListener('click', () => { activeId = button.dataset.openCard!; render(); }));
  document.querySelector('#timer-toggle')?.addEventListener('click', toggleTimer);
  document.querySelector('#finish-card')?.addEventListener('click', event => openFinishDialog((event.currentTarget as HTMLElement).dataset.id!));
  document.querySelector('#edit-card')?.addEventListener('click', event => openCardDialog((event.currentTarget as HTMLElement).dataset.id!));
}

function dialogFrame(title: string, body: string): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `<div class="dialog-top"><p class="eyebrow">Next card desk</p><button class="icon-button" value="cancel" aria-label="Close dialog">×</button></div><h2>${title}</h2>${body}`;
  document.body.append(dialog);
  dialog.querySelector('.icon-button')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.showModal();
  return dialog;
}

function openCardDialog(id?: string): void {
  const existing = data.cards.find(card => card.id === id);
  const dialog = dialogFrame(existing ? 'Tune this card' : 'Leave the next move', `<form id="card-form" class="stack-form">
    <label>Piece name <input name="piece" maxlength="80" required value="${escapeHtml(existing?.piece)}" autocomplete="off"></label>
    <label>Measure or range <input name="measure" maxlength="30" required value="${escapeHtml(existing?.measure)}" placeholder="37 or 37–40" autocomplete="off"></label>
    <label>One next action <textarea name="action" maxlength="180" required rows="3" placeholder="Play the left-hand leap slowly, five clean times">${escapeHtml(existing?.action)}</textarea><small>Use a verb you can act on.</small></label>
    <details class="optional-fields" ${existing?.scoreLink || existing?.scorePhoto ? 'open' : ''}><summary>Add your own score reference (optional)</summary>
      <label>Web link <input name="scoreLink" type="url" value="${escapeHtml(existing?.scoreLink)}" placeholder="https://…"></label>
      <label>Photo <input name="scorePhoto" type="file" accept="image/jpeg,image/png,image/webp"><small>${existing?.scorePhoto ? 'Choose a new image to replace the current one.' : 'Stored only on this device; compressed before saving.'}</small></label>
    </details>
    <p class="form-error" id="card-error" role="alert"></p>
    <div class="dialog-actions">${existing ? '<button type="button" class="button danger-button" id="delete-card">Delete card</button>' : ''}<button type="button" class="button text-button" id="cancel-card">Cancel</button><button class="button primary">${existing ? 'Save changes' : 'Add to today'}</button></div>
  </form>`);
  dialog.querySelector<HTMLInputElement>('[name="piece"]')?.focus();
  dialog.querySelector('#cancel-card')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('#delete-card')?.addEventListener('click', async () => {
    if (!existing || !confirm(`Delete the card for ${existing.piece}, measure ${existing.measure}?`)) return;
    data.cards = data.cards.filter(card => card.id !== existing.id); activeId = ''; await persist(); dialog.close(); render(); announce('Card deleted.');
  });
  dialog.querySelector<HTMLFormElement>('#card-form')!.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const values = new FormData(form);
    const piece = String(values.get('piece') ?? '').trim();
    const measure = String(values.get('measure') ?? '').trim();
    const action = String(values.get('action') ?? '').trim();
    const scoreLink = String(values.get('scoreLink') ?? '').trim();
    const error = dialog.querySelector<HTMLElement>('#card-error')!;
    if (!hasCardDetails(piece, measure, action)) {
      error.textContent = 'Give this card a piece, measure, and one next action.';
      const field = !piece ? 'piece' : !measure ? 'measure' : 'action';
      form.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
      return;
    }
    if (!isHttpUrl(scoreLink)) { error.textContent = 'Use a full http:// or https:// link.'; return; }
    try {
      const file = values.get('scorePhoto') as File;
      const photo = file?.size ? await imageToDataUrl(file) : existing?.scorePhoto;
      const now = new Date().toISOString();
      if (existing) Object.assign(existing, { piece, measure, action, scoreLink, scorePhoto: photo, updatedAt: now });
      else {
        const card: PracticeCard = { id: makeId(), piece, measure, action, scoreLink, scorePhoto: photo, createdAt: now, updatedAt: now, status: 'queued', accumulatedSeconds: 0, attempts: [] };
        data.cards.push(card); activeId = card.id;
      }
      await persist(); dialog.close(); render(); announce(existing ? 'Card updated.' : 'Card added to today.');
    } catch (caught) { error.textContent = caught instanceof Error ? caught.message : 'The card could not be saved.'; }
  });
}

async function imageToDataUrl(file: File): Promise<string> {
  if (file.size > 12_000_000) throw new Error('Choose an image smaller than 12 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL('image/webp', .78);
}

async function toggleTimer(event: Event): Promise<void> {
  const button = event.currentTarget as HTMLButtonElement;
  const card = data.cards.find(item => item.id === button.dataset.id)!;
  if (card.timerStartedAt) { card.accumulatedSeconds = elapsedSeconds(card); delete card.timerStartedAt; }
  else {
    for (const other of data.cards) {
      if (other.id !== card.id && other.timerStartedAt) { other.accumulatedSeconds = elapsedSeconds(other); delete other.timerStartedAt; }
    }
    card.timerStartedAt = new Date().toISOString();
  }
  card.updatedAt = new Date().toISOString(); await persist(); render(); announce(card.timerStartedAt ? 'Timer started.' : `Timer paused at ${formatTime(card.accumulatedSeconds)}.`);
}

function openFinishDialog(id: string): void {
  const card = data.cards.find(item => item.id === id)!;
  const seconds = elapsedSeconds(card);
  const dialog = dialogFrame('Log this attempt', `<p class="dialog-lede">${escapeHtml(card.piece)}, m. ${escapeHtml(card.measure)} · ${formatTime(seconds)}</p><form id="finish-form" class="stack-form">
    <fieldset><legend>How did that pass feel?</legend>${(['Still rough', 'More even', 'Ready to move on'] as Outcome[]).map((outcome, index) => `<label class="radio-card"><input type="radio" name="outcome" value="${outcome}" ${index === 1 ? 'checked' : ''}><span>${outcome}</span></label>`).join('')}</fieldset>
    <label>Evidence for future you (optional)<textarea name="evidence" maxlength="240" rows="2" placeholder="Clean at 72 bpm; tension returns in beat 3"></textarea></label>
    <label>Leave a follow-up action (optional)<textarea name="followup" maxlength="180" rows="2" placeholder="Tomorrow: add the right hand at the same tempo"></textarea><small>Leave blank to close this card. A follow-up replaces it in today’s three.</small></label>
    <div class="dialog-actions"><button type="button" class="button text-button" id="cancel-finish">Keep practicing</button><button class="button primary">Save the handoff</button></div>
  </form>`);
  dialog.querySelector('#cancel-finish')?.addEventListener('click', () => dialog.close());
  dialog.querySelector<HTMLFormElement>('#finish-form')!.addEventListener('submit', async event => {
    event.preventDefault(); const values = new FormData(event.currentTarget as HTMLFormElement); const now = new Date().toISOString();
    card.attempts.push({ id: makeId(), at: now, seconds, outcome: values.get('outcome') as Outcome, evidence: String(values.get('evidence') ?? '').trim() });
    card.accumulatedSeconds = seconds; delete card.timerStartedAt; card.status = 'completed'; card.updatedAt = now;
    const followup = String(values.get('followup') ?? '').trim();
    if (followup) {
      const next: PracticeCard = { ...card, id: makeId(), action: followup, createdAt: now, updatedAt: now, status: 'queued', accumulatedSeconds: 0, timerStartedAt: undefined, attempts: [], scorePhoto: card.scorePhoto, scoreLink: card.scoreLink };
      data.cards.push(next); activeId = next.id;
    } else activeId = '';
    await persist(); dialog.close(); render(); announce(followup ? 'Attempt saved. Your follow-up card is ready.' : 'Attempt saved to the archive.');
  });
}

function bindArchive(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-reopen]').forEach(button => button.addEventListener('click', async () => {
    if (todayQueue(data.cards).length >= 3) { announce('Today is full. Finish a card before reopening another.'); return; }
    const source = data.cards.find(card => card.id === button.dataset.reopen)!; const now = new Date().toISOString();
    const reopened: PracticeCard = { ...source, id: makeId(), createdAt: now, updatedAt: now, status: 'queued', accumulatedSeconds: 0, timerStartedAt: undefined, attempts: [] };
    data.cards.push(reopened); activeId = reopened.id; await persist(); history.pushState({}, '', '/'); render(); announce('Card reopened in today’s three.');
  }));
  document.querySelector<HTMLInputElement>('#archive-search')?.addEventListener('input', event => {
    const term = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>('.archive-item').forEach(item => item.hidden = !item.dataset.search!.includes(term));
  });
}

function bindSettings(): void {
  document.querySelector('#export-data')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `practice-next-card-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); announce('Backup exported.');
  });
  document.querySelector<HTMLInputElement>('#import-data')?.addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    try {
      const imported = validateImport(JSON.parse(await file.text()));
      if (!confirm(`Replace this device’s ${data.cards.length} cards with ${imported.cards.length} cards from the backup?`)) return;
      data = imported; await persist(); render(); announce('Backup imported.');
    } catch (caught) { announce(caught instanceof Error ? caught.message : 'That backup could not be read.'); input.value = ''; }
  });
  document.querySelector('#clear-data')?.addEventListener('click', async () => {
    if (!confirm(`Erase all ${data.cards.length} locally saved cards? Export first if you may want them later.`)) return;
    data = structuredClone(EMPTY_DATA); await persist(); render(); announce('All local practice data erased.');
  });
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const token = (document.querySelector<HTMLInputElement>('#license-token')!.value).trim();
    if (!token) return; localStorage.setItem(LICENSE_KEY, token); localStorage.removeItem(VERDICT_KEY); announce('Checking that license…'); await verifyLicense(true); render(); announce(hasLicense ? 'Supporter edition restored.' : 'That license is not active for this product.');
  });
}

async function persist(): Promise<void> {
  try { await saveData(data); } catch { announce('Could not save locally. Export your data, then check browser storage permissions.'); throw new Error('Could not save this change.'); }
}

function announce(message: string): void {
  const toast = document.querySelector<HTMLElement>('#toast'); if (!toast) return;
  toast.textContent = message; toast.classList.add('show'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('show'), 4200);
}

async function verifyLicense(force = false): Promise<void> {
  const query = new URLSearchParams(location.search); const returned = query.get('license');
  if (returned) { localStorage.setItem(LICENSE_KEY, returned); localStorage.removeItem(VERDICT_KEY); query.delete('license'); history.replaceState({}, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`); force = true; }
  const token = localStorage.getItem(LICENSE_KEY); if (!token) return;
  const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? 'null') as { valid: boolean; checkedAt: number } | null;
  hasLicense = cached?.valid === true;
  if (!navigator.onLine || (!force && cached && Date.now() - cached.checkedAt < 86_400_000)) return;
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/practice-next-card/verify?license=${encodeURIComponent(token)}`);
    const result = await response.json() as { valid: boolean };
    hasLicense = response.ok && result.valid === true; localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: hasLicense, checkedAt: Date.now() }));
  } catch { /* Cached verdict keeps paid features available offline. */ }
}

window.addEventListener('popstate', render);
window.addEventListener('online', () => { render(); void verifyLicense(); });
window.addEventListener('offline', render);
window.setInterval(() => { const active = data.cards.find(card => card.id === activeId); const counter = document.querySelector('#timer-counter'); if (active?.timerStartedAt && counter) counter.textContent = formatTime(elapsedSeconds(active)); }, 1000);

async function start(): Promise<void> {
  try { data = await loadData(); await verifyLicense(); render(); registerServiceWorker(); }
  catch { app.innerHTML = shell('<div class="plain-empty"><h1>Your card box could not open.</h1><p>Browser storage may be blocked. Allow site storage, then reload.</p><button class="button primary" onclick="location.reload()">Try again</button></div>'); }
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(registration => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing; worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          const toast = document.querySelector<HTMLElement>('#toast');
          if (toast) {
            toast.innerHTML = 'A fresh version is ready. <button class="toast-action">Reload now</button>';
            toast.classList.add('show');
            toast.querySelector('button')?.addEventListener('click', () => { navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); worker.postMessage({ type: 'SKIP_WAITING' }); });
          }
        }
      });
    });
  }).catch(() => { /* App remains functional without install support. */ });
}

void start();
