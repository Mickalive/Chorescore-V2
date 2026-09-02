#!/usr/bin/env bash
set -euo pipefail
repo="${GITHUB_REPOSITORY:?}"; main_sha=$(git rev-parse HEAD); auth=$(printf 'x-access-token:%s' "${GH_TOKEN:?}" | base64 -w0)
branch=lab/chorescore-v2
if git ls-remote --exit-code --heads origin "refs/heads/$branch" >/dev/null 2>&1; then
  git -c "http.extraheader=AUTHORIZATION: basic $auth" fetch origin "+refs/heads/$branch:refs/remotes/origin/$branch"
  accepted_sha=$(git rev-parse "refs/remotes/origin/$branch")
else
  accepted_sha="$main_sha"
  git -c "http.extraheader=AUTHORIZATION: basic $auth" push origin "$main_sha:refs/heads/$branch"
fi
work="${RUNNER_TEMP:?}/v2-prepare"; rm -rf "$work"; git worktree add --detach "$work" "$accepted_sha"
human_paths=(
  MAIN_PROMPT.md
  AGENTS.md
  governance
  docs/ROADMAP.md
  docs/PRODUCT_BLUEPRINT.md
  docs/DESIGN_CONTRACT.md
  docs/DESIGN_BRIEF.md
  docs/MONETIZATION.md
  docs/SUBSCRIPTION_REFERENCE_V1.md
  docs/DATA_PRODUCT_PRIVACY.md
  docs/REFERENCE_SCENARIOS.json
  docs/QUALITY_GATES.md
  docs/architecture.md
  docs/agent-workflow.md
  directives/DIRECTOR.md
  .opencode
  opencode.json
)
# Do not synchronize .github wholesale anymore. V2-07 has a dedicated finalizer on the lab
# branch, and the general Factory must never overwrite or delete that trusted release harness.
for path in "${human_paths[@]}"; do
  rm -rf "$work/$path"
  if git cat-file -e "$main_sha:$path" 2>/dev/null; then mkdir -p "$work/$(dirname "$path")"; git archive "$main_sha" "$path" | tar -x -C "$work"; fi
done
git -C "$work" config user.name chorescore-v2-factory; git -C "$work" config user.email chorescore-v2-factory@users.noreply.github.com
git -C "$work" add -A
if ! git -C "$work" diff --cached --quiet; then
  git -C "$work" commit -m "factory: sync V2 human control plane"
  git -c "http.extraheader=AUTHORIZATION: basic $auth" -C "$work" push origin "HEAD:refs/heads/$branch"
fi
accepted_sha=$(git -C "$work" rev-parse HEAD)
status="$work/docs/RELEASE_STATUS.json"; tasks="$work/directives/TASKS.json"
jq -e '.milestone=="v2-rc" and ([.criteria[].id]|sort)==(["V2-00","V2-01","V2-02","V2-03","V2-04","V2-05","V2-06","V2-07"]|sort)' "$status" >/dev/null
pending=$(jq -r '.pendingArtifact=="V2-07"' "$status"); builder=$(jq -r '.builder.enabled' "$tasks")
final=$(jq -r 'all(.criteria[];.status=="complete") and .pendingArtifact==null and (.activeCriteria|length)==0' "$status")

# Once the dedicated V2-07 finalizer exists, the general Factory becomes passive. This is
# deliberately a scheduling sentinel, not a product-completion claim: only the finalizer may
# attest V2-07 after APK install/launch and the Android golden path.
if [[ -s "$work/.github/workflows/chorescore-v2-finalize.yml" ]] && jq -e 'all(.criteria[]; if .id=="V2-07" then .status=="in_progress" else .status=="complete" end)' "$status" >/dev/null; then
  echo "Dedicated V2-07 finalizer owns release; general Factory will not probe/build/audit/release."
  builder=false
  pending=false
  final=true
  git worktree remove --force "$work"; git worktree prune
  echo "accepted_sha=$accepted_sha" >> "$GITHUB_OUTPUT"
  echo "pending_artifact=$pending" >> "$GITHUB_OUTPUT"
  echo "builder_enabled=$builder" >> "$GITHUB_OUTPUT"
  echo "final=$final" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Legacy V2-07 handoff path retained only for repositories that do not have the dedicated finalizer.
if [[ "$pending" == true ]]; then
  jq -e 'all(.criteria[]; if .id=="V2-07" then .status=="in_progress" else .status=="complete" end) and (.activeCriteria|length)==0 and (.openFindings|length)==0' "$status" >/dev/null
  jq -e '.builder.enabled==false and .builder.criterionId==null' "$tasks" >/dev/null
  test -s "$work/package.json"
  jq -e '.scripts["privacy:check"] and .scripts["e2e:android"]' "$work/package.json" >/dev/null
  test -s "$work/scripts/privacy-check.js"
  test -s "$work/scripts/e2e-android.js"
  node --check "$work/scripts/privacy-check.js"
  node --check "$work/scripts/e2e-android.js"
  builder=false
elif [[ "$final" == true ]]; then
  jq -e '.builder.enabled==false' "$tasks" >/dev/null
else
  jq -e '(.activeCriteria|length)>=1' "$status" >/dev/null
  jq -e '.builder.enabled==true and (.builder.criterionId|type=="string")' "$tasks" >/dev/null
fi

git worktree remove --force "$work"; git worktree prune
echo "accepted_sha=$accepted_sha" >> "$GITHUB_OUTPUT"; echo "pending_artifact=$pending" >> "$GITHUB_OUTPUT"; echo "builder_enabled=$builder" >> "$GITHUB_OUTPUT"; echo "final=$final" >> "$GITHUB_OUTPUT"
