# Next cycle

Active criterion: **V2-03 — Score, équilibres et fenêtre gratuite**.

Implement the Score screen that transforms CompletedEntry records into understandable time balances.

## Scope

Score screen with:
1. Period selectors: Semaine / Mois / Année / Depuis le début
2. Filters: Toutes / each PersistentTask / Autres
3. Balance algorithm: +D to performedBy, -D/N to each beneficiary, sum of all balances = 0
4. Peer-to-peer compensation proposals (who should catch up how much time to whom)
5. Real time performed per member displayed
6. Named bar charts with names + values directly readable
7. Weighted secondary section displayed only when Premium entitlement active
8. Contextual filtered history matching period + filter
9. Free tier: Score limited to current civil month; Année/Depuis le début/archive show contextual upsell
10. Monthly reset without data destruction; upgrade restores archive immediately

## Acceptance criteria

- All reference scenario values verified (two-member-core, three-member-beneficiaries, free-month-rollover)
- Visual audit against DESIGN_BRIEF.md: neutral balance presentation, no winning/losing ranking, simple bar charts
- All existing 195 tests pass with no regressions
- npm run check green
