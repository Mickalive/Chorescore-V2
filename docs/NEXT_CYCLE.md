# Next cycle

Active criterion: **V2-00 — Socle greenfield** (REPAIR).

Two mustFix findings from audit cycle 33292303527:
1. Expo package versions guessed with old scheme → native Android compilation fails → must use SDK 57 aligned versions via `npx expo install`
2. `createEntry` leaks `householdId` into analytics fact → must strip all operational IDs from emitted analytics data

No new feature scope. Fix findings, verify compilation, add analytics leak test, confirm all existing tests pass.
