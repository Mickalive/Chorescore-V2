#!/usr/bin/env bash
set -euo pipefail
cycle="${CYCLE_KEY:?}"; base="${ACCEPTED_SHA:?}"; branch=lab/chorescore-v2; cand=/tmp/factory/candidate-builder; audit=/tmp/factory/audit-builder
meta="$cand/metadata.json"; report=$(find "$audit" -maxdepth 1 -name '*.json' | head -1); test -s "$meta"; test -s "$report"; bash .github/scripts/validate-audit-json.sh "$report" "$cycle"
decision=$(jq -r .decision "$report"); has=$(jq -r .hasDelta "$meta")
mkdir -p reports/audits reports/director; cp "$audit"/*.json "$audit"/*.md reports/audits/
if [[ "$decision" == accept && "$has" == true ]]; then git apply --check "$cand/candidate.patch"; git apply --index "$cand/candidate.patch"; fi
if [[ "$decision" == accept && -f package.json ]]; then npm ci --ignore-scripts --no-audit --no-fund; npm run check; jq -e '.dependencies.expo or .devDependencies.expo' package.json >/dev/null && npx --no-install expo export --platform android --output-dir "$RUNNER_TEMP/v2-integrated-export"; fi
git config user.name chorescore-v2-factory; git config user.email chorescore-v2-factory@users.noreply.github.com; auth=$(printf 'x-access-token:%s' "${GH_TOKEN:?}" | base64 -w0)
git -c "http.extraheader=AUTHORIZATION: basic $auth" fetch origin "+refs/heads/$branch:refs/remotes/origin/$branch"; [[ "$(git rev-parse refs/remotes/origin/$branch)" == "$base" ]] || { echo "::error::Accepted V2 advanced; stale integration"; exit 75; }
if [[ "$decision" == accept ]]; then git add -A; if ! git diff --cached --quiet; then git commit -m "factory $cycle: audited V2 product tranche"; git -c "http.extraheader=AUTHORIZATION: basic $auth" push origin "HEAD:refs/heads/$branch"; fi; fi
product_sha=$(git rev-parse HEAD); before="$RUNNER_TEMP/release-before.json"; cp docs/RELEASE_STATUS.json "$before"
manifest=$(jq -n --arg decision "$decision" --arg criterion "$(jq -r .criterionId "$meta")" --argjson hasDelta "$has" '{auditDecision:$decision,criterionId:$criterion,hasDelta:$hasDelta}')
OPENCODE_RETRY_LABEL=director bash .github/scripts/run-ox.sh opencode run --model "${OX_MODEL:?}" --agent cycle-director "Direct ChoreScore V2 cycle $cycle. Trusted manifest: $manifest. Read current audit reports. If audit accepted and active criterion is actually satisfied, complete it with current evidence and assign the next incomplete criterion. If repair/reject, keep criterion active and make required fixes the next task. Write reports/director/RUN_${cycle}.json and .md. JSON: schemaVersion=1, cycle='$cycle', decision continue/stop, nonempty reason, progressEvidence array. Stop only by handing V2-07 to trusted release shell per DIRECTOR contract."
git add -A
mapfile -d '' changed < <(git diff --cached --name-only -z HEAD); for p in "${changed[@]}"; do case "$p" in docs/RELEASE_STATUS.json|docs/NEXT_CYCLE.md|directives/TASKS.json|reports/director/*|reports/audits/*) ;; *) echo "::error::Director changed forbidden $p"; exit 20;; esac; done
r="reports/director/RUN_${cycle}.json"; jq -e --arg cycle "$cycle" '.schemaVersion==1 and (.cycle|tostring)==$cycle and (.decision=="continue" or .decision=="stop") and (.reason|type=="string" and length>0) and (.progressEvidence|type=="array")' "$r" >/dev/null
jq -e -n --slurpfile b "$before" --slurpfile a docs/RELEASE_STATUS.json '[$b[0].criteria[]|select(.status=="complete")] as $done | all($done[]; . as $old | any($a[0].criteria[]; .id==$old.id and .status=="complete" and ((.evidence//[])|length)>=(($old.evidence//[])|length)))' >/dev/null
pending=$(jq -r '.pendingArtifact=="V2-07"' docs/RELEASE_STATUS.json)
if [[ "$pending" == true ]]; then jq -e 'all(.criteria[]; if .id=="V2-07" then .status=="in_progress" else .status=="complete" end) and (.activeCriteria|length)==0' docs/RELEASE_STATUS.json >/dev/null; jq -e '.builder.enabled==false' directives/TASKS.json >/dev/null; jq -e '.decision=="stop"' "$r" >/dev/null; else jq -e '(.activeCriteria|length)>=1' docs/RELEASE_STATUS.json >/dev/null; jq -e '.builder.enabled==true' directives/TASKS.json >/dev/null; fi
git -c "http.extraheader=AUTHORIZATION: basic $auth" fetch origin "+refs/heads/$branch:refs/remotes/origin/$branch"; [[ "$(git rev-parse refs/remotes/origin/$branch)" == "$product_sha" ]] || { echo "::error::Accepted V2 advanced during Director"; exit 75; }
git add -A; if ! git diff --cached --quiet; then git commit -m "factory $cycle: V2 director state"; git -c "http.extraheader=AUTHORIZATION: basic $auth" push origin "HEAD:refs/heads/$branch"; fi
echo "accepted_sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"; echo "pending_artifact=$pending" >> "$GITHUB_OUTPUT"
