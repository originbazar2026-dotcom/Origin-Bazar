#!/usr/bin/env bash
# Installs the APK on the running emulator, opens it, and records whether it stays open.
# Output goes to ci-logs/<api>/ (logcat, crash buffer, screenshot, result.txt).
set -u
API="$1"
APK="$2"
OUT="ci-logs/api-$API"
PKG=store.originbazar.app
mkdir -p "$OUT"

adb wait-for-device
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global transition_animation_scale 0 || true
adb shell settings put global animator_duration_scale 0 || true

adb install -r -g "$APK" > "$OUT/install.txt" 2>&1
echo "install exit: $?" >> "$OUT/install.txt"

adb logcat -c || true
adb shell am start -W -n "$PKG/.MainActivity" > "$OUT/start.txt" 2>&1
sleep 30

PID=$(adb shell pidof "$PKG" | tr -d '\r')
if [ -n "$PID" ]; then RESULT="RUNNING pid=$PID"; else RESULT="CRASHED"; fi

# second launch (cold start again) to catch intermittent startup crashes
adb shell am force-stop "$PKG"
adb shell am start -W -n "$PKG/.MainActivity" >> "$OUT/start.txt" 2>&1
sleep 20
PID2=$(adb shell pidof "$PKG" | tr -d '\r')
if [ -n "$PID2" ]; then RESULT="$RESULT | relaunch RUNNING"; else RESULT="$RESULT | relaunch CRASHED"; fi

echo "$RESULT" > "$OUT/result.txt"
adb exec-out screencap -p > "$OUT/screen.png" || true
adb logcat -d -b crash > "$OUT/crash.txt" 2>&1 || true
adb logcat -d > "$OUT/logcat-full.txt" 2>&1 || true
grep -E "AndroidRuntime|FATAL|ReactNative|ReactNativeJS|chromium|Expo|$PKG|libc|DEBUG|SoLoader|Hermes" \
  "$OUT/logcat-full.txt" | tail -n 600 > "$OUT/logcat-app.txt" || true
adb shell dumpsys package "$PKG" | grep -E "versionName|targetSdk|minSdk" > "$OUT/package.txt" || true
echo "API $API: $RESULT"
