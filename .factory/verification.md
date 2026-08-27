# Independent verification — FAIL

Verified 2026-08-27 against candidate commit `158e9b2c2d4831c8fc863e74fa3383a79c85e8a0` and the deployed URL `https://practice-next-card.sociobot.in/`.

## Verdict

**FAIL.** The product's dark-theme empty/welcome screen has axe `serious` WCAG 2 AA color-contrast violations. This fails the accessibility gate in the product contract even though the supplied automated suite passes. Do not release this candidate as verified.

## Reproducible evidence

Clean checkout at the candidate (working tree initially clean):

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e -- --workers=1
```

Results:

- `npm ci`: completed; npm audit reported 0 vulnerabilities.
- `npm test`: **4/4 passed**.
- `npm run build`: **passed** (`tsc --noEmit`, Vite production build, postbuild). `dist/` was produced.
- `npm run test:e2e -- --workers=1`: **10/10 passed** on Desktop Chrome and 390 x 844 mobile. An initial parallel invocation was invalidated by its preview server being torn down during the command yield; the serial rerun above is the result used for this verdict.
- Production build budgets: initial JS `24,973 B` raw / `9,030 B` gzip; CSS `13,311 B` raw / `3,920 B` gzip; empty-state hero `79,218 B`. All are within the stated static-PWA budgets.
- Live mobile Lighthouse: Performance **99**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP `0.9 s`, LCP `1.5 s`, TBT `120 ms`, CLS `0`. This light-theme audit does not cover the dark-theme defect below.

Independent browser checks used Chromium/Playwright against both local production preview and the live URL:

- Normal/recovery flow: created a Bach Invention card with measure `37–40`, a precise action, optional HTTPS score link; started/reloaded the persisted timer; logged outcome/evidence; created a follow-up; confirmed archive evidence and persisted IndexedDB data.
- Boundary: created three queued cards; UI displayed `3/3 loaded`, three queue buttons, and disabled `#add-card`.
- Malformed/recovery inputs: `javascript:alert(1)` score links were rejected with “Use a full http:// or https:// link.”; a version-2 JSON backup was rejected with “This backup version is not supported.”
- PWA: live service-worker-controlled app reloaded offline with its shell and heading. A separate production-build update simulation changed only the served worker version; `registration.update()` produced “A fresh version is ready. Reload now”, and reload retained the app shell.
- Keyboard: Tab reached the skip link, with a visible 3 px focus outline; Enter opened the card dialog; Escape returned focus to the invoking “Make the first card” button. Reduced-motion computed transition duration was `0.00001s`; mobile had no horizontal overflow.
- Privacy/network: a fresh live session requested only `https://practice-next-card.sociobot.in`. Source and compiled-bundle inspection found no analytics, fonts, trackers, or third-party scripts. The only possible off-origin request is the documented Sociobot billing verification endpoint after a license token exists. Practice data is kept in IndexedDB; license data is localStorage.
- Deployment identity: SHA-256 matched for every file in local `dist/` and its live counterpart (`index.html`, JS/CSS/map, hero, icons, manifest, service worker, offline/legal pages, robots, sitemap). The deployed root and all checked routes returned HTTP 200.

## Defects

### High — dark-mode welcome content fails WCAG 2 AA contrast

On `/` with `prefers-color-scheme: dark`, axe 4.13 reports `color-contrast` at `serious` impact on the empty/welcome screen in both desktop and 390 px mobile:

| Element | Foreground | Background | Measured | Required |
| --- | --- | --- | --- | --- |
| “The paper scrap, upgraded” eyebrow | `#ff8a7a` | `#f4e9d2` | **1.90:1** | 4.5:1 |
| Welcome explanatory paragraph | `#d9d1c2` | `#f4e9d2` | **1.25:1** | 4.5:1 |

The dark-mode CSS changes `--ink` to the light `#f4e9d2`, which becomes the welcome background, while the welcome-specific text colors remain too light. The repository’s dark axe test visits only `/settings`, so it misses this screen.

### Medium — required card fields accept whitespace-only values

The browser’s `required` constraint considers spaces valid and the submit handler trims only when saving. A card with blank piece, measure, and next action can therefore be saved. This allows an unusable non-specific next card, contrary to the brief’s precise-action job.

### Low — mobile tap-target contract is not met for several links

At 390 px, measured targets include the wordmark (`350 x 36`), skip link (`235 x 42`), footer Privacy (`52 x 14`), and footer Terms (`37 x 14`). The product contract calls for targets of at least 44 x 44 CSS px.

### Low — deployment hardening/caching gaps

The live response has HSTS, `nosniff`, and a referrer policy, but no Content-Security-Policy, `frame-ancestors`/`X-Frame-Options`, or Permissions-Policy. Static JS/CSS are un-hashed and served with only `cache-control: public, must-revalidate, max-age=30`, rather than immutable long-lived caching. `manifest.webmanifest` is served as `application/octet-stream` rather than a manifest JSON type. These did not prevent the tested PWA flow, but fall short of the stated security/caching policy.

## Notes

- No product source was modified during verification.
- The candidate does satisfy the core local-first card, timer, attempt, archive/reopen, export/import, legal-route, offline-shell, and update-toast flows tested above. The failed verdict is solely because required quality gates are not all met.
