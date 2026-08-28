# Independent verification 2 — PASS

Verified on 2026-08-28 from a clean working tree at candidate commit `d414a13fa6439ac83a4fb0ad3cb5e8e5f0215e58` against `https://practice-next-card.sociobot.in/`.

## Verdict

**PASS.** The deployed PWA matches the candidate production build and met the researched brief and factory quality gates exercised below. No release-blocking defects were found.

## Local, clean-install evidence

```sh
npm ci
npm test
npm run build
npm run test:e2e -- --workers=1
```

- `npm ci` completed with **0 vulnerabilities**.
- `npm test` passed **7/7** tests. There is no separate `lint` script; the exact `npm run build` command includes `tsc --noEmit` and passed.
- `npm run build` passed and produced `dist/` with its legal routes, generated service worker, manifest, static-host policy files, and fingerprints.
- `npm run test:e2e -- --workers=1` passed **17/17**, with **1 expected mobile-only skip** in the desktop project (18 tests total). It ran the Desktop Chromium and 390 x 844 projects, including the local update-toast mutation test.

Production artifact budget results:

| Artifact | Raw | Gzip | Budget | Result |
| --- | ---: | ---: | ---: | --- |
| Initial application JS | 25,205 B | 9,164 B | <= 200 KB JS | Pass |
| Initial CSS | 13,669 B | 3,973 B | <= 50 KB CSS | Pass |
| Empty-state hero | 79,218 B | n/a | <= 300 KB mobile hero | Pass |

Live mobile Lighthouse (Chrome/Chromium, 2026-08-28): Performance **93**, Accessibility **100**, Best Practices **100**, SEO **100**. FCP was **1.0 s**, LCP **1.4 s**, TBT **330 ms**, CLS **0**. This clears the factory's 90 performance / 95 accessibility thresholds and the LCP/CLS targets.

## Independent product and browser checks

All checks below used a fresh Chromium browser context against the live URL unless noted otherwise.

- Normal job flow: created a **Bach Invention No. 8**, measure **37–40**, with a concrete next action; started its timer; logged a perceived outcome and evidence; left a follow-up; and confirmed the completed attempt in the archive. No console or page errors occurred.
- Boundary: created three queued cards; the queue displayed three cards and `+ Add card` was disabled.
- Invalid/recovery paths: `javascript:alert(1)` in the optional score-link field was rejected with “Use a full http:// or https:// link.” A version-2 JSON backup was rejected with “This backup version is not supported.” Required whitespace-only card fields, dialog focus return, and legal direct routes are covered by the passing browser suite.
- Local-first storage: the implementation stores card state in IndexedDB (`practice-next-card` / `app`), with complete JSON export/import and an explicit local erase control. The normal workflow survived its persisted state transitions.
- PWA: the live page was service-worker controlled at scope `/`, using cache `pnc-abf08162aafc`; after `context.setOffline(true)`, reload rendered “What happens next?” and “Offline · saved locally.” The local production browser suite separately changed the worker cache version, called `registration.update()`, observed “A fresh version is ready,” and verified its reload path.
- Accessibility: live axe found **no serious or critical violations** on the empty state in both light and dark schemes. The document has `lang=en`, the expected descriptive title, exactly one `h1`, one `main`, and meaningful hero alt text. Keyboard Tab visibly revealed the 44 px skip link with its cyan focus treatment; Enter reached `main`; Escape returned dialog focus to its invoking control. Reduced motion computed to `0.00001s` transitions and `scroll-behavior: auto`.
- Mobile: at 390 px, `scrollWidth` equaled `innerWidth` (390), and every measured `button`, `a`, and `summary` was at least 44 x 44 CSS px.
- Privacy and outbound requests: a normal fresh session requested only `https://practice-next-card.sociobot.in`. Source/build inspection found no analytics, trackers, third-party fonts, or remote scripts. Card data stays local; the documented Sociobot verify request occurred only after an explicit synthetic license return. That token was saved locally, stripped from the URL, the invalid-license state left the $9 buy action available, and no browser error occurred. A valid paid license was not available to this verifier, so real paid entitlement activation is an external-registration coverage limitation, not a tested claim.

## Deployment identity and response policy

SHA-256 was identical between local `dist/` and the live deployment for all checked shipped files: `index.html`, manifest, service worker, offline page, JS, CSS, hero, 192/512 icons, privacy and terms entry points, robots, and sitemap.

Live HTTP checks returned `200` for the application and direct legal routes. Root responses included HSTS, CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. The manifest was `application/manifest+json`; hashed JS and CSS were `public, max-age=31536000, immutable`; HTML/manifest used `public, max-age=0, must-revalidate`.

## Defects by severity

None found in the tested candidate.

### Coverage limitation (not a product defect)

- **Info:** A real registered Supporter license was not supplied, so successful entitlement activation could not be independently completed. The returned-token capture, URL cleanup, invalid-token verification request, and non-blocking free experience were tested.

## Notes

- This verification did not modify product source. The only repository changes are this report and the superseding verifier handoff.
- This report supersedes the earlier failed verification for commit `158e9b2`; the previously reported contrast, whitespace-validation, tap-target, response-policy, and cache issues are absent at this candidate.
