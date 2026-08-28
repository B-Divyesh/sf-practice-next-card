# Practice Next Card — repair handoff

Work order: `practice-next-card-repair-1`
Repaired from independent-verifier report at `1969d8252b5e4ab98595749f96046e141765d406` for candidate `158e9b2c2d4831c8fc863e74fa3383a79c85e8a0`.

## Release-blocking fixes

- Corrected the dark welcome cassette-insert colors. Its explanatory copy is now `#1D1B18` and eyebrow `#A12626` on the light insert, both above WCAG AA normal-text contrast; the dark welcome is now included in axe coverage on desktop and 390 px mobile.
- Required card details are normalized and rejected when whitespace-only in both the dialog save path and imported backups. The dialog announces the error and focuses the first incomplete field.
- Made every visible mobile link/control on the home screen at least 44 × 44 CSS px, including the wordmark, skip link, and legal links. The mobile browser regression measures each `button`, `a`, and `summary` at 390 px.
- Added deploy-consumed `dist/_headers` and Azure Static Web Apps `staticwebapp.config.json` policy: strict same-origin CSP (with the documented Sociobot billing API exception), anti-framing, Permissions-Policy, nosniff, referrer policy, manifest MIME type, and immutable JS/CSS cache rules. Vite now fingerprints JS/CSS; postbuild writes those exact files to the service-worker precache and derives the cache version from the precached content.
- Pinned Playwright to `1.58.2`, matching the work-order browser requirement.

## Verification on 2026-08-28

Clean install and quality gates:

```sh
npm ci                 # 0 reported vulnerabilities
npm test               # 7/7 passed
npm run build          # passed; dist/index.html exists
npm run test:e2e -- --workers=1
```

Browser result: **17 passed, 1 intentionally skipped**. The serial suite exercised Desktop Chrome and the 390 × 844 mobile project: create → timer → attempt → archive → reopen; whitespace validation; local offline reload; update toast; legal routes; license URL cleanup; keyboard skip navigation, Enter, Escape, and focus restoration; dark welcome axe; and 390 px target measurements. Axe reported no serious or critical violations on the light and dark welcome routes.

Local production-preview Lighthouse (mobile/performance preset): Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP **1.5 s**, CLS **0**, TBT **0 ms**.

Build budgets: app JS `25,205 B` raw / `9,164 B` gzip; CSS `13,669 B` raw / `3,973 B` gzip; hero `79,218 B`. All are within the static-PWA budgets. The final worker precache contains the fingerprinted JS/CSS plus shell, icons, manifest, offline page, and hero.

Privacy/response policy review: source and build references are first-party except the documented Sociobot checkout/verify endpoint; there are no third-party fonts, scripts, analytics, or trackers. The static-host `_headers` and Azure deploy configuration are regression-tested for CSP, frame protection, permissions, manifest MIME, and immutable cache directives; Vite preview confirmed `application/manifest+json` for the manifest.

## Run and deploy

```sh
npm ci
npm test
npm run build
npm run test:e2e -- --workers=1
```

Deployment completed via `/opt/fleet/lib/deploy-static.sh practice-next-card dist` as Azure Static Web Apps deployment `aba5b589-0d94-4d65-ad24-abeed044140e`. Live verification at `https://practice-next-card.sociobot.in` passed: HTTP 200, no browser console errors, title/lang/one h1/main/alt/button-name checks passed, 2,184 ms smoke-test load, and the live `index.html`, manifest, service worker, hero, and fingerprinted app JS SHA-256 values exactly matched local `dist/`. Live headers include the CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Permissions-Policy`, nosniff, referrer policy, `application/manifest+json`, and `public, max-age=31536000, immutable` for the fingerprinted JS.

## Known gaps

- The factory must register the $9 Sociobot product before a real paid token can be verified; the local token capture/cleanup and invalid-token paths are browser-tested.
- Practice data remains deliberately local-first; export/import is the cross-device handoff.
