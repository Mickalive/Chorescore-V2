#!/usr/bin/env bash
set -euo pipefail
cycle="${CYCLE_KEY:?}"; out="${RUNNER_TEMP:?}/candidate-builder"; mkdir -p "$out"
criterion=$(jq -r '.builder.criterionId' directives/TASKS.json); objective=$(jq -r '.builder.objective' directives/TASKS.json); acceptance=$(jq -c '.builder.acceptance' directives/TASKS.json)
OPENCODE_RETRY_LABEL=builder bash .github/scripts/run-ox.sh opencode run --model "${OX_MODEL:?}" --agent greenfield-builder "Build ChoreScore V2 factory cycle $cycle. Active criterion: $criterion. Objective: $objective. Acceptance: $acceptance. Read all canonical files first. Finish a coherent tested tranche."
git add -A
mapfile -d '' changed < <(git diff --cached --name-only -z HEAD); count=${#changed[@]}; (( count <= 140 )) || { echo "::error::Candidate changed $count files"; exit 4; }
for p in "${changed[@]}"; do case "$p" in MAIN_PROMPT.md|AGENTS.md|governance/*|directives/*|docs/*|.github/*|.opencode/*|opencode.json|reports/*) echo "::error::Builder changed protected path $p"; exit 5;; esac; done
if [[ -f package.json ]]; then
  test -s package-lock.json
  npm ci --ignore-scripts --no-audit --no-fund
  npm run check
  if jq -e '.dependencies.expo or .devDependencies.expo' package.json >/dev/null; then npx --no-install expo export --platform android --output-dir "$RUNNER_TEMP/v2-candidate-export"; fi
fi
has=false; verify=true; : > "$out/candidate.patch"
if (( count > 0 )); then has=true; verify=false; git diff --cached --binary HEAD > "$out/candidate.patch"; fi
jq -n --arg cycle "$cycle" --arg baseSha "$(git rev-parse HEAD)" --arg criterion "$criterion" --arg objective "$objective" --argjson changedFiles "$count" --argjson hasDelta "$has" --argjson verificationOnly "$verify" '{schemaVersion:1,cycle:$cycle,role:"builder",baseSha:$baseSha,criterionId:$criterion,objective:$objective,changedFiles:$changedFiles,hasDelta:$hasDelta,verificationOnly:$verificationOnly}' > "$out/metadata.json"
