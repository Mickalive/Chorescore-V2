#!/usr/bin/env bash
set -euo pipefail

APK="${1:?apk}"
PACKAGE="${2:?package}"
RUNNER_TMP="${3:?runner temp}"
WORKSPACE="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE}"

SMOKE_OUT="$RUNNER_TMP/v2-smoke"
E2E_OUT="$RUNNER_TMP/v2-e2e"
ATTEMPT1_OUT="$RUNNER_TMP/v2-e2e-attempt1"

adb shell settings put global hide_error_dialogs 1 || true
adb shell settings put global anr_show_background 0 || true

bash "$WORKSPACE/.github/scripts/smoke-android-apk.sh" "$APK" "$PACKAGE" "$SMOKE_OUT"

adb shell pm clear "$PACKAGE" || true
adb shell svc wifi enable || true
adb shell svc data enable || true
adb shell settings put global hide_error_dialogs 1 || true
mkdir -p "$E2E_OUT"

set +e
CHORESCORE_APK_PATH="$APK" \
CHORESCORE_E2E_PACKAGE="$PACKAGE" \
CHORESCORE_E2E_OUTPUT="$E2E_OUT" \
npm run e2e:android
rc=$?
set -e

if [[ $rc -ne 0 ]]; then
  echo "First E2E attempt failed; retrying once on a clean app state without rebuilding."
  mkdir -p "$ATTEMPT1_OUT"
  cp -r "$E2E_OUT/." "$ATTEMPT1_OUT/" 2>/dev/null || true
  adb shell am force-stop "$PACKAGE" || true
  adb shell pm clear "$PACKAGE" || true
  adb shell settings put global hide_error_dialogs 1 || true
  rm -rf "$E2E_OUT"
  mkdir -p "$E2E_OUT"
  CHORESCORE_APK_PATH="$APK" \
  CHORESCORE_E2E_PACKAGE="$PACKAGE" \
  CHORESCORE_E2E_OUTPUT="$E2E_OUT" \
  npm run e2e:android
fi

jq -e '.status=="pass"' "$E2E_OUT/result.json" >/dev/null
