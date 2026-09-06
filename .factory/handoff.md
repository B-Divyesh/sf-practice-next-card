# Practice Next Card — verification 3 handoff

## Current verdict: FAIL

Independent verification on 2026-09-06 reviewed live candidate `639cd778902e721da98ccd25ecf616c8a12e0e92` at <https://practice-next-card.sociobot.in>. The implementation candidate matches the fresh local `dist/` artifact. This documentation handoff follows the candidate; the previous review/documentation SHA was `39dace7` and the initial QA documentation commit is `6bc765f`.

There is **1 low-severity finding** and **0 untested public claims**: at a 390 px phone viewport, the Settings **Have a license?** disclosure is only 38 px high. This contradicts the public 44 px control claim. Its claim test runs only the desktop project and does not visit Settings, so it passes without proving the claim. See [`.factory/verification-3.md`](verification-3.md).

No product source was changed in this verification work order.

## Verification run

```sh
npm ci
npm test
npm run build
npm run test:e2e -- --workers=1
npm run test:claims
```

Results: `npm test` 8/8 passed; build passed and created `dist/`; end-to-end tests 60 passed; all 17 declared claim commands were also run separately and passed at process level. The live demo, normal timer/attempt flow, invalid link/import recovery, reset/isolation, offline reload, keyboard path, legal routes, 404, links, metadata/security headers, and light/dark axe checks were exercised.

## Required next work

Make the Settings disclosure target at least 44 px high on a real 390 px phone layout. Update the responsive claim test to use the phone project and cover the Settings route. Deploy that repair and request another independent verification.
