# Practice Next Card

Practice Next Card helps self-directed musicians leave one precise action at a troublesome measure. The next session starts with the piece, measure, and action already chosen.

Try the isolated sample at <https://practice-next-card.sociobot.in/demo>. Reset restores the sample, and Start for real returns to your separate practice data.

## What it does

- Keeps at most three practice cards for today.
- Saves card edits and running timers across reloads.
- Records an attempt outcome, evidence, and an optional follow-up action.
- Stores an optional local photo or HTTP(S) link to your score reference.
- Shows the latest 30 archive records in the free core.
- Exports every card to JSON, imports a confirmed backup, and erases local data.
- Works offline after the first visit.

Practice content stays in the browser. The normal practice flow has no analytics, tracking, remote fonts, or third-party scripts. License verification contacts only the Sociobot billing API after a user provides a license.

The optional Supporter edition costs $9 once. A valid license shows the full archive and adds search. Public checkout registration is pending; the free core remains available.

The interface fits a 390 px phone, supports keyboard use, has light and dark themes, and respects reduced-motion settings. Each public promise and its outcome-based command is listed in [`.factory/claims.json`](.factory/claims.json).

## Run and verify

Use Node.js 20 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e -- --workers=1
```

Run every declared public claim with:

```sh
npm run test:claims
```

The production build command is `npm run build`. Static output lands in `dist/`, with `dist/index.html` at its root. Playwright 1.58.2 is pinned in `package.json`.

## Deployment

Deploy `dist/` to the product's HTTPS static host. The service worker scope is `/`. Product routes are emitted as direct entry points, and unknown URLs use the designed 404 response.

The opportunity is in [`.factory/brief.json`](.factory/brief.json). Visual decisions and asset provenance are in [`.factory/design.md`](.factory/design.md). The sample contract is in [`.factory/demo.md`](.factory/demo.md).

## License

MIT. See [LICENSE](LICENSE).
