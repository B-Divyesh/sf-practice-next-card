# Practice Next Card — build handoff

Work order: `practice-next-card-build-1`

Completed: 2026-08-27

## What shipped

- A production Vite + TypeScript PWA at `dist/`, built around a strict three-card queue.
- Full card lifecycle: piece, measure/range, one next action, edit/delete, optional local score-reference photo or HTTP(S) link, persistent timer, perceived outcome, evidence note, follow-up handoff, archive, and reopen.
- IndexedDB persistence with complete JSON export/import and confirmed local erase. Photos are resized to at most 1200 px and encoded as WebP before storage.
- Offline app shell with versioned service-worker cache, cache-first local assets, navigation fallback, install manifest, 192/512/maskable icons, and accessible update notice.
- Responsive cassette-era zine UI for desktop and 390 px mobile, explicit light/dark treatments, designed focus states, native keyboard-safe dialogs, and reduced-motion fallback.
- Original generated hero collage at 79 KB WebP; source, exact prompt, model, and provenance are in `assets/src/` and `.factory/design.md`.
- `/privacy` and `/terms` routes plus direct static entry points, robots.txt, sitemap, README, and MIT license.
- Optional $9 one-time Supporter edition using only the Sociobot checkout/verify contract. It unlocks full archive visibility and search; the three-card loop, photos, recent 30-item archive, and complete export remain free. Returned licenses are stored under `sb_license:practice-next-card`, removed from the URL, cached for at most one day, and reconciled without blocking offline use.

## Verification

Run from a clean checkout with Node.js 20+:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Results on 2026-08-27:

- `npm test`: 4/4 unit tests passed.
- `npm run build`: passed; emitted `dist/index.html`. Initial app JS is 24.97 KB raw / 9.03 KB gzip; CSS is 13.31 KB raw / 3.92 KB gzip; hero is 79.2 KB. All are under budget.
- `npm run test:e2e`: 10/10 passed across Desktop Chrome and a 390 × 844 mobile viewport. Covered create → timer → attempt → archive → reopen, direct legal routes, license-token capture/URL cleanup, offline reload, console errors, axe, dark color scheme, and reduced motion.
- Axe: no serious or critical violations in the tested light and dark routes; color-contrast checks were enabled.
- Lighthouse 13 mobile against the production build: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.9 s, CLS 0, TBT 0 ms.
- Manual visual review completed at 1440 × 1000 and 390 × 844. The first generated candidate was rejected for an accidental notation fragment; the shipped second candidate has no text, notation, branding, people, or misleading UI.
- `git diff --check`: clean.

## Known gaps / factory follow-up

- The factory still needs to register the `practice-next-card` product and its $9 price/return URL in the Sociobot billing engine. The UI intentionally uses the slug endpoint and contains no provider product ID or secret. A real paid token could not be exercised before registration; token capture, storage, cleanup, and invalid-token behavior are browser-tested.
- Data is intentionally device-local with manual export/import; cross-device sync and score hosting are non-goals.
- Lighthouse was measured locally against `vite preview`; production CDN/network conditions may vary.
