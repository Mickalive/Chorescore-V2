#!/usr/bin/env bash
set -euo pipefail
apk="${1:?apk}"; package="${2:?package}"; out="${3:?out}"; mkdir -p "$out"
adb wait-for-device
adb install -r "$apk" | tee "$out/install.txt"
adb shell svc wifi disable || true; adb shell svc data disable || true
adb shell am force-stop "$package" || true
adb shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 | tee "$out/launch.txt"
sleep 8
pid=$(adb shell pidof "$package" | tr -d '\r' || true)
[[ -n "$pid" ]] || { adb logcat -d > "$out/logcat.txt"; echo "App did not remain running"; exit 1; }
adb shell dumpsys window windows > "$out/windows.txt" || true
jq -n --arg package "$package" --arg pid "$pid" '{schemaVersion:1,package:$package,pid:$pid,installed:true,launched:true,networkDisabled:true}' > "$out/result.json"
