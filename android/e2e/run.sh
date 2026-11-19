#!/usr/bin/env bash
# רץ בתוך האמולטור: מתקין את גרסת הבדיקה, נותן הרשאות, מגדיר מיקום ומריץ את הבדיקות
set -u
# כל פקודת adb מוגבלת בזמן, כדי שאמולטור שנתקע לא יתקע את כל הריצה
adb() { timeout 120 "$(command -v adb)" "$@"; }
PKG=io.github.nrt613.maayan
ROOT=$(pwd)
mkdir -p android/e2e/shots; : > android/e2e/shots/log.txt
# בלי adb root: הפעלה מחדש של adbd מנתקת את המכשיר באמצע הבדיקה
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
sleep 20
adb shell cmd alarm set-timezone Asia/Jerusalem || adb shell service call alarm 3 s16 Asia/Jerusalem || true
adb shell settings put secure location_mode 3 || true
adb install -r out/maayan-debug.apk
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS
adb shell pm grant $PKG android.permission.ACCESS_FINE_LOCATION
adb shell pm grant $PKG android.permission.ACCESS_COARSE_LOCATION
adb shell appops set $PKG SCHEDULE_EXACT_ALARM allow || true
timeout 20 adb emu geo fix 34.8532 32.3215 || true
cd android/e2e && npm install --no-audit --no-fund playwright-core@1.48.2 >/dev/null 2>&1
timeout 480 node test.js; code=$?
# וידג'ט מסך הבית (על היומן ש-test.js יצר)
timeout 240 node widget.js || code=1
cd "$ROOT"
adb logcat -d -t 400 | grep -iE "capacitor|maayan|chromium" | tail -80 >> android/e2e/shots/log.txt || true
# בדיקת עשן לגרסה החתומה: מתקינה, נפתחת ונשארת פתוחה
if [ -f out/maayan.apk ]; then
  adb uninstall $PKG >/dev/null 2>&1
  if adb install out/maayan.apk; then
    adb shell am start -n $PKG/.MainActivity; sleep 12
    if adb shell pidof $PKG >/dev/null; then echo "E2E OK   signed release launches" | tee -a android/e2e/shots/log.txt; else echo "E2E FAIL signed release launches" | tee -a android/e2e/shots/log.txt; code=1; fi
    adb exec-out screencap -p > android/e2e/shots/9-release.png || true
  else echo "E2E FAIL signed release installs" | tee -a android/e2e/shots/log.txt; code=1; fi
fi
exit $code
