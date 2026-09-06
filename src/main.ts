import './style.css';
import {
  EMPTY_DATA, createDemoData, elapsedSeconds, formatTime, hasCardDetails, isHttpUrl,
  makeId, todayQueue, validateImport, type AppData, type Outcome, type PracticeCard
} from './core';
import { deleteData, loadData, saveData, type StorageMode } from './db';

const app = document.querySelector<HTMLDivElement>('#app')!;
const PRODUCT_ORIGIN = 'https://practice-next-card.sociobot.in';
const BUY_URL = 'https://api.sociobot.in/api/v1/products/practice-next-card/checkout';
const LICENSE_KEY = 'sb_license:practice-next-card';
const VERDICT_KEY = 'sb_license_verdict:practice-next-card';
// The billing registration operator has not registered this public checkout yet.
const CHECKOUT_AVAILABLE = false;
const demoMode = location.pathname === '/demo' || location.pathname.startsWith('/demo/');
const storageMode: StorageMode = demoMode ? 'demo' : 'real';

let data: AppData = structuredClone(EMPTY_DATA);
let activeId = '';
let toastTimer = 0;
let hasLicense = false;

const escapeHtml = (value: string | undefined = '') => value.replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]!);
const rawPath = () => location.pathname.replace(/\/$/, '') || '/';
const routePath = () => {
  const current = rawPath();
  if (!demoMode) return current;
  const nested = current.slice('/demo'.length);
  return nested || '/';
};
const appUrl = (route: string) => demoMode && ['/', '/archive', '/settings'].includes(route)
  ? `/demo${route === '/' ? '' : route}`
  : route;
const localLicenseKey = (key: string) => demoMode ? `demo:${key}` : key;

const routeDetails: Record<string, { title: string; description: string }> = {
  '/': {
    title: demoMode ? 'Demo — Practice Next Card' : 'Practice Next Card — Leave your next practice action',
    description: demoMode
      ? 'Try three realistic measure-specific practice cards without changing your own data.'
      : 'Leave one precise action at a troublesome measure, ready for your next practice session.'
  },
  '/archive': { title: 'Archive — Practice Next Card', description: 'Review completed practice cards and reopen the next action you want to repeat.' },
  '/settings': { title: 'Settings — Practice Next Card', description: 'Export, import, erase, and manage your local Practice Next Card data.' },
  '/privacy': { title: 'Privacy — Practice Next Card', description: 'How Practice Next Card stores notes locally and when billing requests leave your browser.' },
  '/terms': { title: 'Terms — Practice Next Card', description: 'Terms for using Practice Next Card and its optional one-time Supporter license.' },
  '/404': { title: 'Page not found — Practice Next Card', description: 'This Practice Next Card page could not be found.' }
};

function updateMetadata(route: string): void {
  const details = routeDetails[route] ?? routeDetails['/404'];
  const canonicalPath = route === '/404' ? '/404' : rawPath();
  const canonical = `${PRODUCT_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`;
  document.title = details.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = details.description;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = canonical;
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
    document.querySelector<HTMLMetaElement>(selector)!.content = details.title;
  }
  for (const selector of ['meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    document.querySelector<HTMLMetaElement>(selector)!.content = details.description;
  }
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')!.content = canonical;
}

function shell(content: string, active = ''): string {
  const todayUrl = appUrl('/');
  const archiveUrl = appUrl('/archive');
  const settingsUrl = appUrl('/settings');
  const demoBanner = demoMode ? `
    <aside class="demo-banner" aria-label="Demo controls">
      <strong>Demo — sample data, nothing is saved</strong>
      <div><button class="banner-button" id="reset-demo">Reset demo</button><button class="banner-button" id="start-real">Start for real</button></div>
    </aside>` : '';
  return `
    <header class="site-header">
      <a class="wordmark" href="${todayUrl}" data-route aria-label="Practice Next Card home" ${active === 'today' && !demoMode ? 'aria-current="page"' : ''}><span class="brand-mark" aria-hidden="true">▶</span><span>Practice<br>Next Card</span></a>
      <nav aria-label="Primary">
        <a href="${todayUrl}" data-route ${active === 'today' ? 'aria-current="page"' : ''}>Today</a>
        ${demoMode ? '' : '<a href="/demo">Demo</a>'}
        <a href="${archiveUrl}" data-route ${active === 'archive' ? 'aria-current="page"' : ''}>Archive</a>
        <a href="${settingsUrl}" data-route ${active === 'settings' ? 'aria-current="page"' : ''}>Settings</a>
      </nav>
      <span class="net-state" id="net-state"><span aria-hidden="true">●</span> ${navigator.onLine ? 'On device' : 'Offline · saved locally'}</span>
    </header>
    ${demoBanner}
    <main id="main" tabindex="-1">${content}</main>
    <footer>
      <p>Leave a precise action for your next practice session.</p>
      <nav aria-label="Legal"><a href="/privacy" ${demoMode ? 'data-exit-demo' : 'data-route'}>Privacy</a><a href="/terms" ${demoMode ? 'data-exit-demo' : 'data-route'}>Terms</a></nav>
      <p class="provenance">Built by Param Factory · v1.1 · build repair-2<br>Original generated collage; no score content included.</p>
    </footer>
    <div class="visually-hidden" id="route-announcer" role="status" aria-live="polite"></div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function practiceArea(): string {
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
      <p class="eyebrow">Current practice card</p>
      <h2 id="active-heading">${escapeHtml(active.piece)}</h2>
      <p class="measure-tag">Measure ${escapeHtml(active.measure)}</p>
      <p class="next-action">${escapeHtml(active.action)}</p>
      ${active.scorePhoto ? `<img class="score-photo" src="${escapeHtml(active.scorePhoto)}" alt="Your reference for ${escapeHtml(active.piece)}, measure ${escapeHtml(active.measure)}">` : ''}
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
      <div class="welcome-copy"><p class="eyebrow">No practice cards yet</p><h2 id="empty-heading">Add a measure to revisit.</h2><p>Write one action for your next practice session.</p><button class="button primary" id="empty-add">Add a practice card</button></div>
      <img src="/assets/hero-cassette.webp" width="768" height="512" fetchpriority="high" decoding="async" alt="A cassette, pencil, stopwatch, and three blank practice slips on a rehearsal table">
    </section>`;

  return `
    <div class="practice-layout">
      <section class="queue" aria-labelledby="queue-heading">
        <div class="section-heading"><div><h2 id="queue-heading">Today’s practice cards</h2><span>${queue.length}/3 loaded</span></div><button class="button stamp" id="add-card" ${queue.length >= 3 ? 'disabled aria-describedby="queue-limit"' : ''}>Add card</button></div>
        <ol>${slots}</ol>
        <p id="queue-limit" class="queue-note">${queue.length >= 3 ? 'Finish or archive one card before adding another.' : 'Add up to three cards for today’s practice.'}</p>
      </section>
      ${activePanel}
    </div>`;
}

function home(): string {
  const intro = demoMode ? `
    <section class="demo-heading" aria-labelledby="page-heading">
      <p class="kicker">Safe sample workspace</p>
      <h1 id="page-heading">Try sample practice cards</h1>
      <p>Change, time, and finish these examples without touching your own cards.</p>
    </section>` : `
    <section class="landing" aria-labelledby="page-heading">
      <div>
        <p class="kicker">For practice between lessons</p>
        <h1 id="page-heading">Leave your next practice action</h1>
        <p class="landing-lede">For self-directed musicians returning to a troublesome measure without guessing what to do.</p>
        <div class="landing-actions"><a class="button primary" href="/demo">Try it with sample data</a><button class="button text-button" id="hero-add">Add your first card</button></div>
        <p class="action-note">The demo opens three cards you can change safely.</p>
      </div>
      <ul class="plain-facts" aria-label="Product facts"><li>Works offline after your first visit</li><li>Practice notes stay in this browser</li><li>Free core · optional $9 one-time Supporter edition</li></ul>
    </section>`;
  const explanation = demoMode ? '' : `
    <section class="info-section" aria-labelledby="how-heading">
      <h2 id="how-heading">How it works</h2>
      <ol class="how-list"><li><b>Write the measure.</b><span>Add the piece, measure, and one action you can perform.</span></li><li><b>Run one attempt.</b><span>Use the timer, then record how the attempt felt.</span></li><li><b>Save the next action.</b><span>Keep evidence or a follow-up action for your next session.</span></li></ol>
    </section>
    <section class="limits-section" aria-labelledby="limits-heading">
      <h2 id="limits-heading">What it does not do</h2>
      <p>Practice Next Card does not host scores, grade playing, generate advice, or count streaks.</p>
      <p>Photos and links point only to score references you choose.</p>
    </section>
    <section class="price-section" aria-labelledby="price-heading">
      <div><p class="kicker">Optional one-time purchase</p><h2 id="price-heading">View and search your full archive</h2></div>
      <div><p>The free core includes three practice cards, score references, export, and the latest 30 archive records.</p><p>Supporter edition costs $9 once for full archive visibility and search.</p>${checkoutControl()}<p class="merchant-note">Checkout registration is pending. Sociobot / Dodo will handle checkout and refunds.</p></div>
    </section>`;
  return shell(`${intro}${practiceArea()}${explanation}`, 'today');
}

function checkoutControl(): string {
  return CHECKOUT_AVAILABLE
    ? `<a class="button primary" href="${BUY_URL}">Buy Supporter once · $9</a>`
    : '<span class="button unavailable" aria-disabled="true">Supporter checkout is not available yet</span>';
}

function archive(): string {
  const all = data.cards.filter(card => card.status === 'completed').sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const visible = hasLicense ? all : all.slice(0, 30);
  return shell(`
    <div class="page-heading"><p class="kicker">Completed practice cards</p><h1>Review past attempts</h1><p>Reopen any action you want to try again.</p></div>
    ${hasLicense && all.length ? '<label class="search-label" for="archive-search">Search piece, measure, or action<input id="archive-search" type="search" autocomplete="off"></label>' : ''}
    <section aria-labelledby="archive-list-heading"><h2 class="visually-hidden" id="archive-list-heading">Completed practice cards</h2>
      ${visible.length ? `<ul class="archive-list">${visible.map(card => archiveItem(card)).join('')}</ul>` : `<div class="plain-empty"><span aria-hidden="true">□</span><h2>No finished cards yet</h2><p>Log an attempt from Today to add its card here.</p><a class="button primary" href="${appUrl('/')}" data-route>Go to today</a></div>`}
    </section>
    ${!hasLicense && all.length > 30 ? `<aside class="supporter-note"><strong>${all.length - 30} older card${all.length - 30 === 1 ? ' is' : 's are'} still stored.</strong><p>Supporter edition shows the full archive and adds search. Exports always include every card.</p>${checkoutControl()}</aside>` : ''}
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
    <div class="page-heading"><p class="kicker">Data and license</p><h1>Manage your saved cards</h1><p>Export, replace, or erase the cards in ${demoMode ? 'this demo' : 'this browser'}.</p></div>
    <div class="settings-grid">
      <section><h2>Export or import cards</h2><p>Export every card, attempt, timer, and reference as JSON. Import replaces this workspace after confirmation.</p><div class="button-row"><button class="button secondary" id="export-data">Export backup</button><label class="button text-button file-button">Import backup<input id="import-data" type="file" accept="application/json"></label></div></section>
      <section><p class="edition-label">${hasLicense ? 'Supporter edition active' : 'Optional supporter edition'}</p><h2>${hasLicense ? 'Full archive and search are active' : 'View and search your full archive'}</h2><p>${hasLicense ? 'This workspace shows every archived card and includes archive search.' : 'Supporter edition costs $9 once. The free core keeps three cards, score references, export, and the latest 30 archive records.'}</p>
        ${hasLicense ? '<p class="success-line">✓ License accepted for this browser.</p>' : `${checkoutControl()}<details><summary>Have a license?</summary><form id="license-form"><label for="license-token">Paste your license token</label><div class="inline-form"><input id="license-token" required autocomplete="off"><button class="button secondary">Verify license</button></div></form></details>`}
        <p class="merchant-note">Checkout registration is pending. Sociobot / Dodo will handle checkout and refunds.</p>
      </section>
      <section><h2>Erase this workspace</h2><p id="storage-summary">${data.cards.length} card${data.cards.length === 1 ? '' : 's'} stored in ${demoMode ? 'the demo' : 'this browser'}.</p><button class="button danger-button" id="clear-data">Erase all ${demoMode ? 'demo' : 'local'} data</button></section>
    </div>
  `, 'settings');
}

function legal(kind: 'privacy' | 'terms'): string {
  const privacy = `<div class="legal-page"><p class="kicker">Plain-language policy</p><h1>Privacy</h1><p class="updated">Effective September 6, 2026</p><h2>Your notes stay in your browser</h2><p>Practice Next Card stores cards, attempts, score-reference photos, links, and license details in your browser. We do not receive your practice notes or photos.</p><h2>Network requests</h2><p>The app works offline after your first visit. License verification contacts the Sociobot billing API only after you provide a license.</p><p>We include no advertising, analytics, tracking pixels, remote fonts, or third-party scripts.</p><h2>Your control</h2><p>Export a complete JSON backup or erase local data from Settings. Removing browser storage also removes cards unless you exported them first.</p><h2>Score content</h2><p>Add only photos or links you have the right to use. This app does not host or distribute scores.</p><p>Questions: <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a></p></div>`;
  const terms = `<div class="legal-page"><p class="kicker">Use agreement</p><h1>Terms</h1><p class="updated">Effective September 6, 2026</p><h2>A practice notebook, not instruction</h2><p>Practice Next Card records your next actions and attempts. It does not teach, assess, or promise skill improvement.</p><h2>Your content</h2><p>You keep ownership of your notes and images. Add only score references you may use.</p><p>Do not use this app to distribute copyrighted sheet music.</p><h2>Purchase</h2><p>Supporter edition costs $9 once for full archive visibility and search. Purchase requires the pending Sociobot billing registration.</p><p>Sociobot / Dodo is the merchant of record and handles payment and refunds. A revoked or wrong-product license stops paid features.</p><p>Core cards and export remain available without Supporter edition.</p><h2>Availability</h2><p>The app is provided “as is.” Keep exports of anything important.</p><p>Questions: <a href="mailto:support@sociobot.in">support@sociobot.in</a></p></div>`;
  return shell(kind === 'privacy' ? privacy : terms);
}

function notFound(): string {
  return shell(`<section class="not-found"><div class="missing-label" aria-hidden="true">404</div><div><p class="kicker">Page not found</p><h1>This page is not here</h1><p>The address may be old or incomplete.</p><a class="button primary" href="${appUrl('/')}" data-route>Return to today</a></div></section>`);
}

function render(focusHeading = false): void {
  const current = routePath();
  const supported = demoMode ? ['/', '/archive', '/settings'] : ['/', '/archive', '/settings', '/privacy', '/terms'];
  const route = supported.includes(current) ? current : '/404';
  updateMetadata(route);
  app.innerHTML = route === '/archive' ? archive()
    : route === '/settings' ? settings()
      : route === '/privacy' ? legal('privacy')
        : route === '/terms' ? legal('terms')
          : route === '/404' ? notFound()
            : home();
  bindGlobal();
  if (route === '/') bindHome();
  if (route === '/archive') bindArchive();
  if (route === '/settings') bindSettings();
  if (focusHeading) requestAnimationFrame(() => {
    const heading = document.querySelector<HTMLElement>('h1');
    if (!heading) return;
    heading.tabIndex = -1; heading.focus();
    const announcer = document.querySelector<HTMLElement>('#route-announcer');
    if (announcer) announcer.textContent = heading.textContent ?? '';
  });
}

function bindGlobal(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); history.pushState({}, '', link.pathname); render(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  document.querySelectorAll<HTMLAnchorElement>('[data-exit-demo]').forEach(link => link.addEventListener('click', async event => {
    event.preventDefault();
    try { await deleteData('demo'); } catch { /* A fresh sandbox will replace stale demo data. */ }
    location.assign(link.href);
  }));
  document.querySelector('#reset-demo')?.addEventListener('click', async () => {
    data = createDemoData(); activeId = ''; hasLicense = false;
    localStorage.removeItem(localLicenseKey(LICENSE_KEY)); localStorage.removeItem(localLicenseKey(VERDICT_KEY));
    await persist(); render(); announce('Demo reset to the sample cards.');
  });
  document.querySelector('#start-real')?.addEventListener('click', async () => {
    try { await deleteData('demo'); } catch { /* The real workspace is still isolated. */ }
    localStorage.removeItem(localLicenseKey(LICENSE_KEY)); localStorage.removeItem(localLicenseKey(VERDICT_KEY));
    location.assign('/');
  });
}

function bindHome(): void {
  document.querySelector('#hero-add')?.addEventListener('click', () => openCardDialog());
  document.querySelector('#add-card')?.addEventListener('click', () => openCardDialog());
  document.querySelector('#empty-add')?.addEventListener('click', () => openCardDialog());
  document.querySelectorAll<HTMLButtonElement>('[data-open-card]').forEach(button => button.addEventListener('click', () => { activeId = button.dataset.openCard!; render(); }));
  document.querySelector('#timer-toggle')?.addEventListener('click', toggleTimer);
  document.querySelector('#finish-card')?.addEventListener('click', event => openFinishDialog((event.currentTarget as HTMLElement).dataset.id!));
  document.querySelector('#edit-card')?.addEventListener('click', event => openCardDialog((event.currentTarget as HTMLElement).dataset.id!));
}

function dialogFrame(title: string, body: string): HTMLDialogElement {
  const origin = document.activeElement as HTMLElement | null;
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `<div class="dialog-top"><p class="eyebrow">Practice card</p><button class="icon-button" value="cancel" aria-label="Close dialog">×</button></div><h2>${title}</h2>${body}`;
  document.body.append(dialog);
  dialog.querySelector('.icon-button')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { dialog.remove(); origin?.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.showModal();
  return dialog;
}

function openCardDialog(id?: string): void {
  const existing = data.cards.find(card => card.id === id);
  const dialog = dialogFrame(existing ? 'Edit this card' : 'Add a practice card', `<form id="card-form" class="stack-form">
    <label>Piece name <input name="piece" maxlength="80" required value="${escapeHtml(existing?.piece)}" autocomplete="off"></label>
    <label>Measure or range <input name="measure" maxlength="30" required value="${escapeHtml(existing?.measure)}" placeholder="37 or 37–40" autocomplete="off"></label>
    <label>One next action <textarea name="action" maxlength="180" required rows="3" placeholder="Play the left-hand leap slowly, five clean times">${escapeHtml(existing?.action)}</textarea><small>Start with a verb you can act on.</small></label>
    <details class="optional-fields" ${existing?.scoreLink || existing?.scorePhoto ? 'open' : ''}><summary>Add your own score reference (optional)</summary>
      <label>Web link <input name="scoreLink" type="url" value="${escapeHtml(existing?.scoreLink)}" placeholder="https://…"></label>
      <label>Photo <input name="scorePhoto" type="file" accept="image/jpeg,image/png,image/webp"><small>${existing?.scorePhoto ? 'Choose a new image to replace the current one.' : 'Stored in this browser workspace.'}</small></label>
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
    const form = event.currentTarget as HTMLFormElement; const values = new FormData(form);
    const piece = String(values.get('piece') ?? '').trim(); const measure = String(values.get('measure') ?? '').trim();
    const action = String(values.get('action') ?? '').trim(); const scoreLink = String(values.get('scoreLink') ?? '').trim();
    const error = dialog.querySelector<HTMLElement>('#card-error')!;
    if (!hasCardDetails(piece, measure, action)) {
      error.textContent = 'Give this card a piece, measure, and one next action.';
      form.querySelector<HTMLElement>(`[name="${!piece ? 'piece' : !measure ? 'measure' : 'action'}"]`)?.focus(); return;
    }
    if (!isHttpUrl(scoreLink)) { error.textContent = 'Use a full http:// or https:// link.'; return; }
    try {
      const file = values.get('scorePhoto') as File; const photo = file?.size ? await imageToDataUrl(file) : existing?.scorePhoto;
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
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL('image/webp', .78);
}

async function toggleTimer(event: Event): Promise<void> {
  const button = event.currentTarget as HTMLButtonElement; const card = data.cards.find(item => item.id === button.dataset.id)!;
  if (card.timerStartedAt) { card.accumulatedSeconds = elapsedSeconds(card); delete card.timerStartedAt; }
  else {
    for (const other of data.cards) if (other.id !== card.id && other.timerStartedAt) { other.accumulatedSeconds = elapsedSeconds(other); delete other.timerStartedAt; }
    card.timerStartedAt = new Date().toISOString();
  }
  card.updatedAt = new Date().toISOString(); await persist(); render();
  announce(card.timerStartedAt ? 'Timer started.' : `Timer paused at ${formatTime(card.accumulatedSeconds)}.`);
}

function openFinishDialog(id: string): void {
  const card = data.cards.find(item => item.id === id)!; const seconds = elapsedSeconds(card);
  const dialog = dialogFrame('Log this attempt', `<p class="dialog-lede">${escapeHtml(card.piece)}, m. ${escapeHtml(card.measure)} · ${formatTime(seconds)}</p><form id="finish-form" class="stack-form">
    <fieldset><legend>How did that pass feel?</legend>${(['Still rough', 'More even', 'Ready to move on'] as Outcome[]).map((outcome, index) => `<label class="radio-card"><input type="radio" name="outcome" value="${outcome}" ${index === 1 ? 'checked' : ''}><span>${outcome}</span></label>`).join('')}</fieldset>
    <label>Evidence for your next session (optional)<textarea name="evidence" maxlength="240" rows="2" placeholder="Clean at 72 bpm; tension returns in beat 3"></textarea></label>
    <label>Follow-up action (optional)<textarea name="followup" maxlength="180" rows="2" placeholder="Add the right hand at the same tempo"></textarea><small>Leave this blank to close the card. A follow-up replaces it in today’s three.</small></label>
    <div class="dialog-actions"><button type="button" class="button text-button" id="cancel-finish">Keep practicing</button><button class="button primary">Save attempt</button></div>
  </form>`);
  dialog.querySelector('#cancel-finish')?.addEventListener('click', () => dialog.close());
  dialog.querySelector<HTMLFormElement>('#finish-form')!.addEventListener('submit', async event => {
    event.preventDefault(); const values = new FormData(event.currentTarget as HTMLFormElement); const now = new Date().toISOString();
    card.attempts.push({ id: makeId(), at: now, seconds, outcome: values.get('outcome') as Outcome, evidence: String(values.get('evidence') ?? '').trim() });
    card.accumulatedSeconds = seconds; delete card.timerStartedAt; card.status = 'completed'; card.updatedAt = now;
    const followup = String(values.get('followup') ?? '').trim();
    if (followup) {
      const next: PracticeCard = { ...card, id: makeId(), action: followup, createdAt: now, updatedAt: now, status: 'queued', accumulatedSeconds: 0, timerStartedAt: undefined, attempts: [] };
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
    data.cards.push(reopened); activeId = reopened.id; await persist(); history.pushState({}, '', appUrl('/')); render(true); announce('Card reopened in today’s three.');
  }));
  document.querySelector<HTMLInputElement>('#archive-search')?.addEventListener('input', event => {
    const term = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>('.archive-item').forEach(item => { item.hidden = !item.dataset.search!.includes(term); });
  });
}

function bindSettings(): void {
  document.querySelector('#export-data')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `practice-next-card-${demoMode ? 'demo-' : ''}${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); URL.revokeObjectURL(link.href); announce('Backup exported.');
  });
  document.querySelector<HTMLInputElement>('#import-data')?.addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    try {
      const imported = validateImport(JSON.parse(await file.text()));
      if (!confirm(`Replace this workspace’s ${data.cards.length} cards with ${imported.cards.length} cards from the backup?`)) return;
      data = imported; await persist(); render(); announce('Backup imported.');
    } catch (caught) { announce(caught instanceof Error ? caught.message : 'That backup could not be read.'); input.value = ''; }
  });
  document.querySelector('#clear-data')?.addEventListener('click', async () => {
    if (!confirm(`Erase all ${data.cards.length} cards in this workspace? Export first if you may want them later.`)) return;
    data = structuredClone(EMPTY_DATA); await persist(); render(); announce('All cards in this workspace were erased.');
  });
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const token = document.querySelector<HTMLInputElement>('#license-token')!.value.trim(); if (!token) return;
    localStorage.setItem(localLicenseKey(LICENSE_KEY), token); localStorage.removeItem(localLicenseKey(VERDICT_KEY));
    announce('Checking that license…'); await verifyLicense(true); render(); announce(hasLicense ? 'Supporter edition restored.' : 'That license is not active for this product.');
  });
}

async function persist(): Promise<void> {
  try { await saveData(data, storageMode); }
  catch { announce('The change was not saved. Export your data, then check browser storage permissions.'); throw new Error('Could not save this change.'); }
}

function announce(message: string): void {
  const toast = document.querySelector<HTMLElement>('#toast'); if (!toast) return;
  toast.textContent = message; toast.classList.add('show'); window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 4200);
}

function cachedVerdict(): { valid: boolean; checkedAt: number } | null {
  try { return JSON.parse(localStorage.getItem(localLicenseKey(VERDICT_KEY)) ?? 'null'); }
  catch { localStorage.removeItem(localLicenseKey(VERDICT_KEY)); return null; }
}

async function verifyLicense(force = false): Promise<void> {
  const query = new URLSearchParams(location.search); const returned = query.get('license');
  if (returned) {
    localStorage.setItem(localLicenseKey(LICENSE_KEY), returned); localStorage.removeItem(localLicenseKey(VERDICT_KEY)); query.delete('license');
    history.replaceState({}, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`); force = true;
  }
  const token = localStorage.getItem(localLicenseKey(LICENSE_KEY)); if (!token) return;
  const cached = cachedVerdict(); hasLicense = cached?.valid === true;
  if (!navigator.onLine || (!force && cached && Date.now() - cached.checkedAt < 86_400_000)) return;
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/practice-next-card/verify?license=${encodeURIComponent(token)}`);
    const result = await response.json() as { valid: boolean }; hasLicense = response.ok && result.valid === true;
    localStorage.setItem(localLicenseKey(VERDICT_KEY), JSON.stringify({ valid: hasLicense, checkedAt: Date.now() }));
  } catch { /* A cached valid verdict keeps paid features available offline. */ }
}

window.addEventListener('popstate', () => render(true));
window.addEventListener('online', () => { render(); void verifyLicense(); });
window.addEventListener('offline', () => render());
document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', event => {
  event.preventDefault(); document.querySelector<HTMLElement>('#main')?.focus();
});
window.setInterval(() => {
  const active = data.cards.find(card => card.id === activeId); const counter = document.querySelector('#timer-counter');
  if (active?.timerStartedAt && counter) counter.textContent = formatTime(elapsedSeconds(active));
}, 1000);

async function start(): Promise<void> {
  try {
    data = await loadData(storageMode);
    if (demoMode && data.cards.length === 0) { data = createDemoData(); await saveData(data, 'demo'); }
    await verifyLicense(); render(); registerServiceWorker();
  } catch {
    app.innerHTML = shell('<div class="plain-empty"><h1>Your cards could not open</h1><p>Browser storage may be blocked. Allow site storage, then reload.</p><button class="button primary" id="reload-app">Reload the app</button></div>');
    document.querySelector('#reload-app')?.addEventListener('click', () => location.reload());
  }
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(registration => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          const toast = document.querySelector<HTMLElement>('#toast'); if (!toast) return;
          toast.innerHTML = 'A new version is ready. <button class="toast-action">Reload now</button>'; toast.classList.add('show');
          toast.querySelector('button')?.addEventListener('click', () => {
            navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); worker.postMessage({ type: 'SKIP_WAITING' });
          });
        }
      });
    });
  }).catch(() => { /* The app still works without installation support. */ });
}

void start();
