#!/usr/bin/env bash
set -euo pipefail
cycle="${CYCLE_KEY:?}"; base="${ACCEPTED_SHA:?}"; branch=lab/chorescore-v2; cand=/tmp/factory/candidate-builder; audit=/tmp/factory/audit-builder
meta="$cand/metadata.json"; report=$(find "$audit" -maxdepth 1 -name '*.json' | head -1); test -s "$meta"; test -s "$report"; bash .github/scripts/validate-audit-json.sh "$report" "$cycle"
decision=$(jq -r .decision "$report"); has=$(jq -r .hasDelta "$meta")
mkdir -p reports/audits reports/director; cp "$audit"/*.json "$audit"/*.md reports/audits/

# Accepted candidates become accepted product code. Repair candidates are also persisted as a
# clearly in-progress WIP baseline so the next Builder repairs the audited code instead of
# recreating the whole tranche. Only a hard reject discards the candidate delta.
if [[ ( "$decision" == accept || "$decision" == repair ) && "$has" == true ]]; then
  git apply --check "$cand/candidate.patch"
  git apply --index "$cand/candidate.patch"
fi

# Acceptance still receives trusted integration verification. A repair baseline deliberately may
# fail one of the mustFix gates; its release criterion remains in_progress until a later audit accepts it.
if [[ "$decision" == accept && -f package.json ]]; then
  npm ci --ignore-scripts --no-audit --no-fund
  npm run check
  jq -e '.dependencies.expo or .devDependencies.expo' package.json >/dev/null && npx --no-install expo export --platform android --output-dir "$RUNNER_TEMP/v2-integrated-export"
fi

git config user.name chorescore-v2-factory; git config user.email chorescore-v2-factory@users.noreply.github.com; auth=$(printf 'x-access-token:%s' "${GH_TOKEN:?}" | base64 -w0)
git -c "http.extraheader=AUTHORIZATION: basic $auth" fetch origin "+refs/heads/$branch:refs/remotes/origin/$branch"; [[ "$(git rev-parse refs/remotes/origin/$branch)" == "$base" ]] || { echo "::error::Accepted V2 advanced; stale integration"; exit 75; }

if [[ "$decision" == accept || "$decision" == repair ]]; then
  git add -A
  if ! git diff --cached --quiet; then
    if [[ "$decision" == repair ]]; then msg="factory $cycle: persist audited V2 repair baseline"; else msg="factory $cycle: audited V2 product tranche"; fi
    git commit -m "$msg"
    git -c "http.extraheader=AUTHORIZATION: basic $auth" push origin "HEAD:refs/heads/$branch"
  fi
fi

product_sha=$(git rev-parse HEAD); before="$RUNNER_TEMP/release-before.json"; cp docs/RELEASE_STATUS.json "$before"
criterion=$(jq -r .criterionId "$meta")
manifest=$(jq -n --arg decision "$decision" --arg criterion "$criterion" --argjson hasDelta "$has" '{auditDecision:$decision,criterionId:$criterion,hasDelta:$hasDelta}')
OPENCODE_RETRY_LABEL=director bash .github/scripts/run-ox.sh opencode run --model "${OX_MODEL:?}" --agent cycle-director "Direct ChoreScore V2 cycle $cycle. Trusted manifest: $manifest. Read current audit reports. If audit accepted and active criterion is actually satisfied, complete it with current evidence and assign the next incomplete criterion. If repair, keep criterion active, preserve the WIP repair baseline already committed by the trusted shell, and assign only the required fixes. If reject, keep criterion active and replace/rebuild as required. Write reports/director/RUN_${cycle}.json and .md. JSON: schemaVersion=1, cycle='$cycle', decision continue/stop, nonempty reason, progressEvidence array. CRITICAL: if you complete V2-06 and hand V2-07 to the trusted release shell, set pendingArtifact='V2-07', clear activeCriteria, disable Builder, and JSON decision MUST be 'stop' (never 'continue'). The trusted release shell then owns V2-07."
git add -A
mapfile -d '' changed < <(git diff --cached --name-only -z HEAD); for p in "${changed[@]}"; do case "$p" in docs/RELEASE_STATUS.json|docs/NEXT_CYCLE.md|directives/TASKS.json|reports/director/*|reports/audits/*) ;; *) echo "::error::Director changed forbidden $p"; exit 20;; esac; done
r="reports/director/RUN_${cycle}.json"; jq -e --arg cycle "$cycle" '.schemaVersion==1 and (.cycle|tostring)==$cycle and (.decision=="continue" or .decision=="stop") and (.reason|type=="string" and length>0) and (.progressEvidence|type=="array")' "$r" >/dev/null
jq -e -n --slurpfile b "$before" --slurpfile a docs/RELEASE_STATUS.json '[$b[0].criteria[]|select(.status=="complete")] as $done | all($done[]; . as $old | any($a[0].criteria[]; .id==$old.id and .status=="complete" and ((.evidence//[])|length)>=(($old.evidence//[])|length)))' >/dev/null

pending=$(jq -r '.pendingArtifact=="V2-07"' docs/RELEASE_STATUS.json)

# Final V2-06 -> V2-07 handoff is trusted-shell policy, not model discretion. Once an independent
# audit accepts V2-06, normalize every control-plane field required by the release job. This avoids
# repeating an already-green product cycle because the Director used "pending" instead of
# "in_progress", forgot to clear findings, or mislabeled its own decision metadata.
if [[ "$decision" == accept && "$criterion" == "V2-06" ]]; then
  tmp=$(mktemp)
  jq --arg cycle "$cycle" '
    (.criteria[] | select(.id=="V2-06") | .status) = "complete" |
    (.criteria[] | select(.id=="V2-06") | .evidence) += ["audit-accepted-" + $cycle] |
    (.criteria[] | select(.id=="V2-07") | .status) = "in_progress" |
    .pendingArtifact = "V2-07" |
    .activeCriteria = [] |
    .openFindings = [] |
    .lastCycle = $cycle |
    .progressSummary = "V2-06 complete and independently accepted; V2-07 handed to trusted Android release shell."
  ' docs/RELEASE_STATUS.json > "$tmp"; mv "$tmp" docs/RELEASE_STATUS.json

  tmp=$(mktemp)
  jq '.builder.enabled=false | .builder.criterionId=null | .builder.objective="V2-07 is owned by the trusted release shell; no Builder product edits."' directives/TASKS.json > "$tmp"; mv "$tmp" directives/TASKS.json

  tmp=$(mktemp)
  jq '.decision="stop" | .reason = (.reason + " Trusted shell normalized the accepted V2-06 handoff to V2-07.")' "$r" > "$tmp"; mv "$tmp" "$r"
  pending=true
fi

if [[ "$pending" == true ]]; then
  # Also normalize legacy/model-created handoffs where V2-07 exists but one metadata field drifted.
  tmp=$(mktemp)
  jq '(.criteria[] | select(.id=="V2-07") | .status)="in_progress" | .activeCriteria=[]' docs/RELEASE_STATUS.json > "$tmp"; mv "$tmp" docs/RELEASE_STATUS.json
  tmp=$(mktemp)
  jq '.builder.enabled=false' directives/TASKS.json > "$tmp"; mv "$tmp" directives/TASKS.json
  tmp=$(mktemp)
  jq '.decision="stop"' "$r" > "$tmp"; mv "$tmp" "$r"

  jq -e 'all(.criteria[]; if .id=="V2-07" then .status=="in_progress" else .status=="complete" end) and (.activeCriteria|length)==0' docs/RELEASE_STATUS.json >/dev/null
  jq -e '.builder.enabled==false' directives/TASKS.json >/dev/null
  jq -e '.decision=="stop"' "$r" >/dev/null
else
  jq -e '(.activeCriteria|length)>=1' docs/RELEASE_STATUS.json >/dev/null
  jq -e '.builder.enabled==true' directives/TASKS.json >/dev/null
fi

git -c "http.extraheader=AUTHORIZATION: basic $auth" fetch origin "+refs/heads/$branch:refs/remotes/origin/$branch"; [[ "$(git rev-parse refs/remotes/origin/$branch)" == "$product_sha" ]] || { echo "::error::Accepted V2 advanced during Director"; exit 75; }
git add -A; if ! git diff --cached --quiet; then git commit -m "factory $cycle: V2 director state"; git -c "http.extraheader=AUTHORIZATION: basic $auth" push origin "HEAD:refs/heads/$branch"; fi
echo "accepted_sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"; echo "pending_artifact=$pending" >> "$GITHUB_OUTPUT"
