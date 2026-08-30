#!/usr/bin/env bash
set -euo pipefail
cand="${1:?candidate dir}"; cycle="${CYCLE_KEY:?}"; out="${RUNNER_TEMP:?}/audit-builder"; mkdir -p "$out" reports/audits
meta="$cand/metadata.json"; test -s "$meta"; criterion=$(jq -r .criterionId "$meta"); objective=$(jq -r .objective "$meta"); has=$(jq -r .hasDelta "$meta")
accepted="${RUNNER_TEMP:?}/accepted-pristine"; rm -rf "$accepted"; git worktree add --detach "$accepted" "$ACCEPTED_SHA"
if [[ "$has" == true ]]; then git apply --check "$cand/candidate.patch"; git apply --index "$cand/candidate.patch"; fi
if [[ -f package.json ]]; then npm ci --ignore-scripts --no-audit --no-fund; npm run check; jq -e '.dependencies.expo or .devDependencies.expo' package.json >/dev/null && npx --no-install expo export --platform android --output-dir "$RUNNER_TEMP/v2-audit-export"; fi
json="reports/audits/RUN_${cycle}.json"; md="reports/audits/RUN_${cycle}.md"
OPENCODE_RETRY_LABEL=auditor bash .github/scripts/run-ox.sh opencode run --model "${OX_MODEL:?}" --agent cycle-auditor "Audit ChoreScore V2 cycle $cycle independently. Active criterion $criterion. Objective: $objective. Candidate checkout is current; pristine accepted tree is $accepted. Write exactly $json and $md. JSON: schemaVersion=1, cycle='$cycle', role='builder', decision accept/repair/reject, nonempty summary, checks string array, findings array. Each finding: path, problem, evidence, mustFix boolean, requiredFix, verification. Accept iff no mustFix finding."
bash .github/scripts/validate-audit-json.sh "$json" "$cycle"; cp "$json" "$md" "$out/"
git worktree remove --force "$accepted"; git worktree prune
