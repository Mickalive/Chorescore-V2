# Next cycle

Active criterion: **V2-02 — Réalisations, chrono et historique** (REPAIR).

One mustFix finding from audit cycle 33336089448:
1. Local persistence not real — all repositories (entries, persistentTasks, chronoTimer) are InMemory*Repository with no disk persistence. Data lost on app restart. Must introduce AsyncStorage-backed persistent repositories.
2. Chrono resume test tautological — reads same in-memory map twice, never simulates restart. Must replace with non-tautological test that recreates instances and verifies data survives.

No new feature scope. Fix persistence, add proper test, confirm all 183 existing tests pass.
