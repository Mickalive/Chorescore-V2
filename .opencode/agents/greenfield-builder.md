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
    "npx expo *": allow
    "npx create-expo-app *": allow
    "node *": allow
  task: deny
  webfetch: deny
  websearch: deny
  external_directory: deny
---

Read `MAIN_PROMPT.md`, `AGENTS.md`, your role, release definition, current release status and `directives/TASKS.json`. Implement only the active Builder criterion. This repository is greenfield: do not port the previous app. You may create/change dependencies and runtime config when necessary. Keep external integrations honest and behind ports. Run real checks. Do not commit, push or change branches.
