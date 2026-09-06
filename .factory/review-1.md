# Leave a precise next action — review 1

Reviewed 2026-09-06 against the live product at <https://practice-next-card.sociobot.in>.

Implementation candidate: `b4a6cbd6029f466a44e1c57995684359f6066bb1` (`fix: configure Azure static response policy`). The only commits after it are documentation: review-base/documentation SHA `4fd8882a0dcbe53da0651369aea6dce0c9281f37`.

## Verdict: FAIL

There are **5 findings** (4 high, 1 medium) and **18 untested public claims**. This is not a PASS.

Before scrolling, the job is clear from the brief: leave a precise next action at a troublesome measure and pick it up next session. The audience is a self-directed musician who needs continuity between practice sessions. The required first action should be **“Try it with sample data”**. On both a fresh desktop and a fresh 390 × 844 phone browser, the observed first action was “+ Add card” / “Make the first card”; no sample action or explanation was present.

## Findings

### High — no one-click isolated sample demo

The first screen contains no “Try it with sample data” action. `/demo` returns HTTP 200 but renders the ordinary empty home screen: its h1 is “What happens next?”, it has no populated sample cards, no persistent “Demo — sample data, nothing is saved” label, and no “Reset demo” or “Start for real” control. `.factory/demo.md` is also absent.

This is not only a missing display. In one fresh browser context I created a real card, navigated to `/demo`, and that same card remained visible there. The route therefore uses the normal IndexedDB namespace instead of a demo namespace, so actions taken there can change real local data. This fails the demo-sandbox contract and removes the required safe way to evaluate the product.

### High — claims contract is absent

`.factory/claims.json` does not exist. There are no `@claim:` tests, so there are no declared claim commands to run from the required demo entry point.

I counted 18 distinct visitor-facing promises in the README and live/legal copy that have no required claim mapping: the three-card limit; editing; timer; outcomes/evidence/follow-up; score references; archive/latest-30 limit; JSON export/import/erase; installability; offline shell; persistence; $9 one-time purchase; full archive/search; 390 px responsiveness; keyboard use; light/dark themes; reduced motion; local-only practice content; and no tracking/only explicit billing requests. Existing unit and browser tests cover parts of several of these behaviours, but cannot substitute for the required manifest, one tagged observable test per claim, and demo-only sandbox evidence.

### High — the landing screen does not state the job, audience, and first action in plain words

The live first screen says “SIDE A · TODAY’S TAKE”, “What happens next?”, and “Three focused moves. No streaks, scores, or judgment.” It does not name self-directed musicians, a troublesome measure, or the concrete next-action handoff. It also has neither the required sample action nor three short privacy/offline/price facts.

The same problem recurs in headings and labels such as “The paper scrap, upgraded”, “On the stand”, “The tape box”, “Your tape case”, and “Keep the whole tape box.” These are metaphor/mood copy rather than section names that work out of context. This fails the plain-words and landing-page structure contracts.

### High — route titles and the 404 route are missing

All tested routes — `/`, `/demo`, `/archive`, `/settings`, `/privacy`, `/terms`, `/404`, and an arbitrary nonexistent path — use the single root title `Practice Next Card — Pick up at the right measure`. Route navigation does not set `document.title`.

`/404` and `/not-a-real-route` both return HTTP 200 and render the ordinary home page, not a designed 404 page with a recovery path. `public/staticwebapp.config.json` has only the SPA navigation fallback and no 404 response override. The sitemap also omits the real `/archive` and `/settings` routes (and there is no real `/demo` route to list). This fails the site-structure routing/title/404 requirements.

### Medium — required social and canonical metadata is missing

`index.html` includes a description and SVG favicon, but no canonical URL, Open Graph metadata, Twitter card metadata, or 180 px Apple touch icon. These are required site-structure metadata, and route-specific metadata cannot be correct while every route has the same document title.

## Checks that passed

The normal product loop works in a fresh desktop browser: I made a realistic Bach Invention No. 8 card for measures 37–40, started the timer, reloaded while it was running, recorded an outcome/evidence, viewed the archive, and reopened the card. No console or page errors occurred. A fresh phone browser had no horizontal overflow.

Invalid/recovery behaviour worked: whitespace-only required values were rejected with a focused Piece field; a `javascript:` score link was rejected with the full-HTTP(S) error; and the three-card boundary rendered `3/3 loaded` and disabled Add card. A separate live context loaded the service-worker-controlled app, was put offline, and reloaded successfully with “Offline · saved locally.” Reduced-motion transition duration was `0.00001s`.

Live axe checks on fresh desktop and phone home screens found no serious or critical violations. The phone initial controls were all at least 44 × 44 CSS px; the skip link had a visible 3 px focus outline and moved focus to `main`. A normal fresh visit made first-party requests only. The live root, hashed JS/CSS, manifest and the checked security/cache headers match the local production build.

## Earlier findings and current disposition

The prior failed verification at `158e9b2` reported four defects. They are fixed in the current implementation:

| Earlier finding | Current evidence | Disposition |
| --- | --- | --- |
| Dark welcome contrast | Live axe found no serious/critical issue in fresh desktop or phone checks. | Fixed |
| Whitespace-only required details | Live form rejects them, announces the error, and focuses Piece. | Fixed |
| 390 px undersized controls | Measured initial `button`, `a`, and `summary` controls had no dimension below 44 px. | Fixed |
| Response policy, cache, and manifest MIME | Live root has CSP, anti-framing, Permissions-Policy, nosniff and referrer policy; hashed JS has immutable caching and the manifest is `application/manifest+json`. | Fixed |

The later `verification-2.md` reported a valid paid-license activation as a coverage limitation. No valid registered license was available in this review; the missing claims manifest means it cannot be treated as a mapped or completed public-claim test.

## Reproducible verification

The checkout was clean before reporting. Documented prerequisites and all applicable declared quality commands were run:

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:e2e -- --workers=1
```

Results: `npm ci` reported 0 vulnerabilities; `npm test` passed 7/7; `npm run build` passed and produced `dist/`; the browser suite passed 17 tests with 1 intentional desktop-project skip. There were no claim commands to run because `claims.json` is missing. The live app was tested in fresh Chromium desktop and phone contexts, including axe via the Playwright integration. Screenshots are retained at `/work/.evidence/pnc-live-desktop.png` and `/work/.evidence/pnc-live-phone.png`.

The SHA-256 values of the local candidate build and live deployment matched for `index.html`, manifest, service worker, offline page, legal pages, robots, sitemap, hero image, and fingerprinted JS/CSS. This is a static PWA; there is no backend, tenant, SQLite, health, restart, or 429/Retry-After surface to test.

## Required next work

Implement a genuine `/demo` (or `?demo=1`) with realistic three-card sample data, clearly persistent demo controls, a separate storage namespace, direct URL support, and demo documentation. Add a complete `claims.json` and demo-only tagged tests for every public promise. Rewrite the first screen and section labels in plain words. Add route-specific titles, focus/announcement handling, a real designed 404 response, complete sitemap entries, and the missing canonical/social/touch metadata. Re-run the review from a clean checkout after deployment.
