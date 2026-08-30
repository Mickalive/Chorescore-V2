#!/usr/bin/env bash
set -euo pipefail
cycle="${CYCLE_KEY:?}"; out="${RUNNER_TEMP:?}/candidate-builder"; mkdir -p "$out"
criterion=$(jq -r '.builder.criterionId' directives/TASKS.json); objective=$(jq -r '.builder.objective' directives/TASKS.json); acceptance=$(jq -c '.builder.acceptance' directives/TASKS.json)

# A repair cycle must repair the audited candidate, not rebuild it from an empty accepted branch.
# Historical fallback: before repair baselines were persisted, the audited candidate lived only as
# a workflow artifact. Recover that artifact deterministically when the branch has no product code.
if [[ "$criterion" == "V2-00" && "$objective" == REPAIR* && ! -f package.json ]]; then
  baseline_cycle=$(jq -r '.lastCycle // empty' docs/RELEASE_STATUS.json)
  if [[ -n "$baseline_cycle" && "$baseline_cycle" != "null" && -n "${GH_TOKEN:-}" ]]; then
    recovery="$RUNNER_TEMP/v2-repair-baseline-$baseline_cycle"
    rm -rf "$recovery"; mkdir -p "$recovery"
    echo "Recovering audited V2-00 candidate from factory cycle $baseline_cycle"
    gh run download "$baseline_cycle" --repo "$GITHUB_REPOSITORY" -n candidate-builder -D "$recovery"
    test -s "$recovery/candidate.patch"
    git apply --check --binary "$recovery/candidate.patch"
    git apply --binary "$recovery/candidate.patch"
  fi
fi

# V2-00 is a one-time greenfield bootstrap and legitimately needs more time than later tranches.
if [[ "$criterion" == "V2-00" ]]; then
  export OPENCODE_ATTEMPT_TIMEOUT_SECONDS="7200"
fi

native_hint=""
if [[ "$criterion" == "V2-00" ]]; then
  native_hint="Trusted native verification from the immediately preceding repair run found one additional concrete blocker after the original two findings were fixed: Expo SDK 57 / expo-modules-core 57.0.14 compiled against react-native-worklets 0.12.1 fails in WorkletJSCallInvoker.cpp because WorkletRuntime has no executeSync. expo-modules-core declares compatible worklets ranges only through 0.10.x and npm identified 0.10.4 as a compatible peer candidate. Resolve this dependency mismatch within the SDK 57 family, regenerate the lockfile, and prove the fix with the local Gradle assembleDebug. Do not upgrade to an unrelated RN/Expo family."
fi

set +e
OPENCODE_RETRY_LABEL=builder bash .github/scripts/run-ox.sh opencode run --model "${OX_MODEL:?}" --agent greenfield-builder "Build ChoreScore V2 factory cycle $cycle. Active criterion: $criterion. Objective: $objective. Acceptance: $acceptance. Read all canonical files first. Finish a coherent tested tranche. For V2-00 use Expo SDK 57 with React Native 0.86.3 and React 19.2.x, and use Expo's own install alignment instead of guessing package generations. Never rebuild an existing repair baseline from scratch. $native_hint"
agent_rc=$?
set -e

# Trusted verification is authoritative, but a failure must NOT destroy coherent Builder work.
# Capture the result, materialize the candidate patch, and let the independent Auditor turn a
# verification failure into a repair finding so the WIP baseline can be preserved.
verify_log="$out/trusted-verification.log"
set +e
(
  set -euo pipefail
  if [[ -f package.json ]]; then
    test -s package-lock.json
    npm ci --ignore-scripts --no-audit --no-fund
    npm run check
    if jq -e '.dependencies.expo or .devDependencies.expo' package.json >/dev/null; then
      npx --no-install expo install --check
      npx --no-install expo export --platform android --output-dir "$RUNNER_TEMP/v2-candidate-export"
      npx --no-install expo prebuild --platform android --no-install
      (cd android && ./gradlew :app:assembleDebug --no-daemon)
    fi
  fi
) > >(tee "$verify_log") 2>&1
verify_rc=$?
set -e

# Recompute after verification because Expo prebuild may legitimately materialize generated files.
git add -A
mapfile -d '' changed < <(git diff --cached --name-only -z HEAD); count=${#changed[@]}
(( count <= 140 )) || { echo "::error::Candidate changed $count files"; exit 4; }
for p in "${changed[@]}"; do
  case "$p" in
    MAIN_PROMPT.md|AGENTS.md|governance/*|directives/*|docs/*|.github/*|.opencode/*|opencode.json|reports/*)
      echo "::error::Builder changed protected path $p"; exit 5;;
  esac
done

if (( agent_rc != 0 )); then
  if (( count == 0 )); then
    echo "::error::Builder exited $agent_rc and produced no candidate delta"
    exit "$agent_rc"
  fi
  echo "::warning::Builder exited $agent_rc after producing $count changed files; preserving the delta for independent audit"
fi
if (( verify_rc != 0 )); then
  echo "::warning::Trusted candidate verification exited $verify_rc; preserving the candidate so Auditor can issue a repair instead of losing the work"
fi

has=false; verify_only=true; : > "$out/candidate.patch"
if (( count > 0 )); then has=true; verify_only=false; git diff --cached --binary HEAD > "$out/candidate.patch"; fi
if (( verify_rc == 0 )); then verify_passed=true; else verify_passed=false; fi
jq -n --arg cycle "$cycle" --arg baseSha "$(git rev-parse HEAD)" --arg criterion "$criterion" --arg objective "$objective" --argjson changedFiles "$count" --argjson hasDelta "$has" --argjson verificationOnly "$verify_only" --argjson agentExitCode "$agent_rc" --argjson trustedVerificationPassed "$verify_passed" --argjson trustedVerificationExitCode "$verify_rc" '{schemaVersion:1,cycle:$cycle,role:"builder",baseSha:$baseSha,criterionId:$criterion,objective:$objective,changedFiles:$changedFiles,hasDelta:$hasDelta,verificationOnly:$verificationOnly,agentExitCode:$agentExitCode,trustedVerificationPassed:$trustedVerificationPassed,trustedVerificationExitCode:$trustedVerificationExitCode}' > "$out/metadata.json"

# Exit successfully when a structurally safe candidate exists, even if trusted verification failed.
# The Auditor independently replays verification and is forbidden to accept a failing candidate.
exit 0
