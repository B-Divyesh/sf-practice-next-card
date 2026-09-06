# Practice Next Card demo

Demo URL: <https://practice-next-card.sociobot.in/demo>

The first visit seeds three queued cards for Bach, Debussy, and Miles Davis, plus 32 completed attempts for archive boundaries and Supporter search checks. The cards include realistic measures, actions, timings, outcomes, and evidence. No score image or copyrighted notation ships in the sample.

The demo uses IndexedDB database `demo:practice-next-card`. Real cards use `practice-next-card`; the demo never opens that database. Demo license state uses `demo:sb_license:practice-next-card` and `demo:sb_license_verdict:practice-next-card`, so it never reads real entitlement state.

Use **Reset demo** in the persistent banner to restore the shipped sample. Use **Start for real** to delete the demo database and demo license keys, then open the real empty or previously saved workspace. Demo Archive and Settings stay under `/demo/*` and keep using the sandbox namespace.

Every command in [claims.json](claims.json) starts from `/demo` in a fresh browser context. The offline claim creates and closes its own browser context before changing network state.
