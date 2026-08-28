# Practice Next Card

Practice Next Card is an offline-first handoff notebook for self-directed musicians. It keeps today to three precise cards—piece, measure, and one playable next action—then records a timed attempt, perceived outcome, and the move to pick up next session.

It deliberately does not host scores, generate advice, grade playing, count streaks, or make skill-improvement claims. Optional photos and links point only to the musician's own score reference.

Live product: <https://practice-next-card.sociobot.in>

## What ships

- Three-card daily queue with edit, timer, outcomes, evidence, and follow-up handoff
- Optional compressed score-reference photo or web link
- Reopenable archive; the latest 30 records are free
- Complete JSON export/import and local erase controls
- Installable PWA with an offline app shell and IndexedDB persistence
- Optional $9 one-time Supporter license for full archive visibility and search
- Responsive 390 px layout, keyboard operation, light/dark treatments, and reduced motion

All practice content stays in the browser. The only third-party request is an explicit checkout/license verification through the Sociobot billing API.

## Run and verify

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The exact production build command is `npm run build`; static output lands in `dist/` with `dist/index.html` at its root. Direct `/privacy` and `/terms` entry points are emitted during the build.

For the browser suite, install Chromium once and run:

```sh
npx playwright install chromium
npm run test:e2e
```

## Deployment

Deploy the contents of `dist/` to any static host with HTTPS. The service worker scope is `/`; the build fingerprints JS/CSS and injects their exact names into the precache. The shipped `_headers` file provides the CSP, anti-framing, Permissions-Policy, manifest MIME type, and immutable cache policy expected by the static deployment. The factory registers and switches the Sociobot product environment; no payment-provider credentials belong in this repository.

The researched scope is in [`.factory/brief.json`](.factory/brief.json), the visual and asset provenance in [`.factory/design.md`](.factory/design.md), and verification notes in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
