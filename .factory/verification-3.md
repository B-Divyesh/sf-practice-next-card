# Practice Next Card verification 3 — FAIL

Verified on 2026-09-06 against the live product at <https://practice-next-card.sociobot.in>.

Implementation candidate SHA: `639cd778902e721da98ccd25ecf616c8a12e0e92` (`fix: add isolated demo and verifiable product claims`). The preceding documentation/review SHA is `39dace7`; the initial QA documentation commit is `6bc765f`. This verification is a later documentation-only handoff.

## Verdict: FAIL

**FAIL — 1 low-severity finding; 0 untested public claims.** The live app has a 38 px-high mobile disclosure control even though its public responsive claim says controls are at least 44 px. A passing claim command is not enough when the live result contradicts the claim.

## Job, audience, and first action

The job is to leave one precise next action at a troublesome measure for the next practice session. It is for self-directed musicians practising between lessons. Before scrolling, both fresh desktop and fresh 390 × 844 phone sessions showed the h1 “Leave your next practice action,” named self-directed musicians, and offered **Try it with sample data**. The same first screen showed the three facts: offline after the first visit, notes stay in the browser, and the optional $9 one-time Supporter edition.

Clicking the sample action opened `/demo` with three realistic queued cards, including Bach Invention No. 8; the persistent “Demo — sample data, nothing is saved” banner; Reset demo; and Start for real. Desktop and phone screenshots are retained at `/work/.evidence/pnc-v3-live-desktop-{landing,demo}.png` and `/work/.evidence/pnc-v3-live-phone-{landing,demo}.png`.

## Finding

### Low — a phone control is below the 44 px target

On a fresh 390 × 844 mobile browser at `/demo/settings`, the interactive native `<summary>` labelled **Have a license?** measured **306 × 38 CSS px**. It opens the license-restore form, so it is an operable control and is below the 44 px minimum in the product contract and the public `responsive-390` claim.

The declared command for that claim passed, but its test runs only the `desktop` Playwright project, sets a 390 px viewport, and checks `/demo` rather than the Settings route. It therefore did not exercise this real phone control. This is both a live accessibility defect and an incomplete claim test. The visually hidden file input was excluded from target measurement.

Required repair: make the summary’s touch target at least 44 px high at the phone breakpoint and expand the responsive claim test to use the phone project and visit the Settings disclosure.

## Declared claims

After `npm ci`, every exact command in `.factory/claims.json` was run separately. Each command completed with one passing Playwright test. The aggregate `npm run test:claims` also passed **17/17**. The table records the independent disposition, not merely process exit status.

| Claim | Command result | Independent disposition |
| --- | --- | --- |
| `demo-isolation` | Pass | Pass — live real sentinel remained intact; leaving demo removed `demo:practice-next-card`. |
| `three-card-limit` | Pass | Pass — three sample cards, `3/3 loaded`, disabled Add card, and boundary guidance. |
| `edit-persistence` | Pass | Pass — edited sample action survived live reload. |
| `timer-persistence` | Pass | Pass — live timer remained running after reload. |
| `attempt-handoff` | Pass | Pass — live outcome/evidence and follow-up appeared in Today/Archive. |
| `score-reference` | Pass | Pass — covered by the declared isolated browser test. |
| `archive-limit` | Pass | Pass — live free demo showed 30 records while retaining older records. |
| `supporter-license` | Pass | Pass — recorded valid Sociobot verification fixture exercised full archive and search; checkout is truthfully unavailable pending registration. |
| `json-export` | Pass | Pass — declared test parsed all 35 demo records. |
| `json-import` | Pass | Pass — declared test confirmed replacement after confirmation. |
| `erase-data` | Pass | Pass — declared test erased then restored the sample. |
| `offline-reload` | Pass | Pass — a separate live service-worker-controlled context reloaded `/demo` offline with sample data and the offline state. |
| `local-privacy` | Pass | Pass — fresh normal live sessions made same-origin requests only; no analytics, remote font, or third-party script request appeared. |
| `responsive-390` | Pass | **Fail** — live phone Settings disclosure is 38 px high; its test coverage is incomplete. |
| `license-request-consent` | Pass | Pass — fixture test observed no billing request before explicit submission and one afterwards. |
| `keyboard` | Pass | Pass — declared test covered skip link, Enter, Escape, focus return, and Space timer use. |
| `themes-motion` | Pass | Pass — live dark reduced-motion axe check had no serious/critical issues and transitions computed to `1e-05s`. |

There are no missing claims and no claim command that could not be run. `untested_claim_count` is therefore **0**; the responsive claim is a false/incompletely tested claim and is the finding above.

## Product paths and live checks

- Normal path: in live demo, started the timer, reloaded while it ran, recorded “Ready to move on,” evidence “The turn stayed even three times,” and the follow-up “Add the right hand at the same tempo.” The follow-up appeared in Today and evidence in Archive.
- Isolation/reset: seeded a real IndexedDB sentinel (“My real piece”), changed a demo card, reset the demo, then chose Start for real. The real sentinel remained, and only `practice-next-card` remained in IndexedDB.
- Invalid and recovery paths: a `javascript:` score link was rejected with the full HTTP(S) message; an unsupported version-2 backup was rejected while the demo retained 35 cards; the three-card limit rendered its recovery guidance.
- Keyboard/focus: the declared keyboard claim test passed; the fresh live desktop and phone pages had visible focus and no console/page errors on normal routes.
- Accessibility: `/opt/fleet/lib/verify-url.sh` passed with title, `lang=en`, one h1, main landmark, image alt text, and no console errors. Live axe checks on desktop and phone demo pages in light and dark/reduced-motion states had no serious or critical violations. The target-size finding above remains.
- Privacy: normal demo requests were same-origin only. Practice data stayed in `demo:practice-next-card`; the normal workspace used `practice-next-card`. The billing endpoint was not contacted without a supplied license.
- Offline/update: a service-worker-controlled live demo reloaded offline and retained the sample label, Bach card, and “Offline · saved locally.” The existing update-toast regression suite passed locally.
- Links/routes/legal: all discovered internal links returned 200; `mailto:` links were explicit. `/privacy` and `/terms` have their own titles/h1s. `/not-a-real-route` intentionally returned HTTP 404 and rendered the designed “This page is not here” recovery view; that expected 404 is not a defect.
- Metadata/security: canonical, Open Graph/Twitter, Apple touch icon, manifest MIME, CSP, anti-framing, referrer, nosniff, and permissions headers were present. The live root, JS/CSS, worker, manifest, legal/404 pages, image, icons, robots, and sitemap SHA-256 values exactly matched the fresh local `dist/` build.
- This is a static local-first PWA. It has no backend, tenant, SQLite service, health endpoint, restart-persistence surface, or rate-limited API endpoint; tenant/429 checks do not apply.

## Local quality gates

From the clean checkout:

```sh
npm ci
npm test
npm run build
npm run test:e2e -- --workers=1
npm run test:claims
```

- `npm ci`: 0 vulnerabilities reported.
- `npm test`: **8/8** passed.
- `npm run build`: passed and produced `dist/` with `dist/index.html`.
- `npm run test:e2e -- --workers=1`: **60 passed**.
- `npm run test:claims`: **17 passed**; all 17 exact per-claim commands also passed separately.
- Current build budgets: app JS 33,460 B raw / 11,350 B gzip; CSS 17,560 B raw / 4,770 B gzip; hero 79,218 B. All are within the static-PWA limits.

## Earlier findings and disposition

| Earlier item | Current disposition |
| --- | --- |
| Dark welcome contrast (`verification.md`) | Fixed — live dark axe had no serious/critical violations. |
| Whitespace-only required card values | Fixed — declared/browser validation tests pass. |
| Earlier undersized mobile wordmark, skip, and footer controls | Fixed — no such targets were found; the new Settings summary defect remains. |
| Response policy, cache, and manifest MIME gaps | Fixed — live policy headers and manifest MIME are present; hashed assets use immutable caching. |
| Missing isolated demo, sample banner/reset, and demo documentation (`review-1.md`) | Fixed — live `/demo`, `.factory/demo.md`, and real-data sentinel check prove isolation. |
| Missing claims manifest and 18 untested claims | Fixed in structure — `claims.json` exists and all 17 commands run; one responsive claim remains false/incomplete as documented above. |
| Plain first screen, route titles, designed 404, sitemap, canonical/social/touch metadata | Fixed — live browser and direct-route checks passed. |
| Earlier valid-license coverage limitation (`verification-2.md`) | Addressed by the declared recorded valid-response fixture; no actual checkout is claimed while registration is pending. |

## Next step

Repair the 38 px Settings disclosure and its phone-route claim coverage, deploy, then request a fresh independent verification. Do not treat this report as a release PASS.
