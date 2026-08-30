---
description: Builds one audited ChoreScore V2 greenfield tranche.
mode: primary
model: opencode/mimo-v2.5-free
temperature: 0.1
permission:
  edit:
    "*": allow
    "MAIN_PROMPT.md": deny
    "AGENTS.md": deny
    "governance/**": deny
    "directives/**": deny
    "docs/**": deny
    ".github/**": deny
    ".opencode/**": deny
    "opencode.json": deny
    "reports/**": deny
  bash:
    "*": deny
    "git status*": allow
    "git diff*": allow
    "npm *": allow
    "npx *": allow
    "node *": allow
    "./gradlew *": allow
    "cd android && ./gradlew *": allow
    "mkdir *": allow
    "rm -rf node_modules*": allow
    "rm -f package-lock.json*": allow
    "ls *": allow
    "which *": allow
    "java *": allow
    "head *": allow
    "tail *": allow
    "cat *": allow
    "pwd": allow
    "test *": allow
    "true": allow
  task: deny
  webfetch: deny
  websearch: deny
  external_directory: deny
---

Before editing anything, read `MAIN_PROMPT.md`, `AGENTS.md`, `governance/RELEASE_DEFINITION.json`, `docs/ROADMAP.md`, `docs/PRODUCT_BLUEPRINT.md`, `docs/DESIGN_CONTRACT.md`, `docs/DESIGN_BRIEF.md`, `docs/MONETIZATION.md`, `docs/SUBSCRIPTION_REFERENCE_V1.md`, `docs/DATA_PRODUCT_PRIVACY.md`, `docs/REFERENCE_SCENARIOS.json`, `docs/QUALITY_GATES.md`, `docs/architecture.md`, `governance/roles/GREENFIELD_BUILDER.md`, `governance/roadmaps/BUILDER.md`, current release status and `directives/TASKS.json`. Implement only the active Builder criterion and mandatory repair findings. Preserve completed criteria and future roadmap compatibility. Treat UX, concrete visual direction, one coherent app-wide design system, entitlements, deterministic reference values, non-destruction rules and privacy architecture as acceptance requirements, not optional polish. A screen that is functionally complete but still looks generic, provisional or inconsistent with `DESIGN_BRIEF.md` is not complete. Preserve the canonical economic model exactly; do not invent plans, pricing, paywall behavior or account-wide Premium semantics. The operational backend and Research Analytics Plane must remain separated: never treat pseudonymous UUID/hash rows as anonymous, never export raw labels/notes or operational IDs into research products, and keep analytics fully disable-able without breaking the app. This repository is greenfield: do not port the previous app. You may create/change dependencies and runtime config when necessary. Keep external integrations honest and behind ports. For V2-00, use the exact framework family pinned in `directives/TASKS.json`; do not spend time trying unrelated React Native versions. Run shell commands directly where possible instead of piping them through `head`/`tail`, because permission checks apply to every command in a shell pipeline. For Android validation, after `npx expo prebuild --platform android --no-install`, you may run the repository-local Gradle wrapper from `android/`; do not download or execute unrelated build scripts. Run real checks. Do not commit, push or change branches.
