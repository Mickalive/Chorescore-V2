#!/usr/bin/env bash
set -euo pipefail

runner="${1:?runner required}"
apk="${2:?apk path required}"
package_name="${3:?package name required}"
out="${4:?output directory required}"

mkdir -p "$out"
test -s "$apk"
adb get-state >/dev/null

export CHORESCORE_APK_PATH="$apk"
export CHORESCORE_E2E_PACKAGE="$package_name"
export CHORESCORE_E2E_OUTPUT="$out"

case "$runner" in
  maestro)
    export PATH="$HOME/.maestro/bin:$PATH"
    adb install -r "$apk" >"$out/adb-install.log"
    adb shell pm clear "$package_name" >/dev/null || true
    maestro test .maestro/chorescore-core.yaml 2>&1 | tee "$out/maestro.log"
    ;;

  appium)
    # Appium installs the exact APK through UiAutomator2 when the session starts.
    appium --log "$out/appium-server.log" --log-no-colors >"$out/appium-stdout.log" 2>&1 &
    appium_pid=$!
    trap 'kill "$appium_pid" 2>/dev/null || true' EXIT

    ready=0
    for _ in $(seq 1 60); do
      if curl -fsS http://127.0.0.1:4723/status >"$out/appium-status.json" 2>/dev/null; then
        ready=1
        break
      fi
      sleep 1
    done
    if [[ "$ready" -ne 1 ]]; then
      echo "Appium server did not become ready" >&2
      exit 70
    fi

    node scripts/e2e-appium.js 2>&1 | tee "$out/appium-test.log"
    ;;

  legacy)
    adb install -r "$apk" >"$out/adb-install.log"
    adb shell pm clear "$package_name" >/dev/null || true
    node scripts/e2e-android.js 2>&1 | tee "$out/legacy.log"
    ;;

  *)
    echo "Unknown E2E runner: $runner" >&2
    exit 64
    ;;
esac
