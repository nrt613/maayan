# רשימת משימות להעלאת מעיין לחנויות (ידני, לבעל האפליקציה)

כל מה שאפשר לעשות אוטומטית כבר נעשה: הבנייה ב-GitHub Actions מפיקה קובץ AAB חתום ל-Google Play, APK להורדה ישירה, ואפליקציית iOS שנבנית ב-Xcode 26 ונבדקת בסימולטור. נשארו הצעדים שדורשים את החשבונות, הכסף והחתימה שלך.

קבצים שימושיים: `store/listing.md` (טקסטים), `store/declarations.md` (תשובות לטפסים), `store/review-notes.md` (הערות לבודקי Apple), `store/screenshots/` (צילומי מסך), `privacy.html` (מדיניות פרטיות).

---

## 0. לפני הכול (בקוד)

- [ ] **"גרסת בדיקה" / "לבודקים".** Apple דוחה גרסאות בטא בחנות (סעיף 2.2). לפני הגשה ל-App Store: להחליט שהגרסה "רשמית" ולהסיר את "גרסת בדיקה" מהממשק ומהתנאים (או להשאיר את מסך הבודקים רק בגרסת דפדפן/TestFlight). עד אז אפשר להפיץ דרך TestFlight ודרך מסלול בדיקה סגור ב-Google Play.
- [ ] **כתובת לפניות.** להחליף את `[כתובת אימייל לפניות]` ב-`privacy.html` (פעמיים: עברית ואנגלית) ובטפסים.
- [ ] **מדיניות הפרטיות באוויר.** לוודא שהעמוד נפתח: https://nrt613.github.io/maayan/privacy.html (אחרי מיזוג ל-main, GitHub Pages מפרסם אותו).
- [ ] **צילומי מסך עדכניים.** העיצוב משתנה, ולכן להריץ שוב אחרי שהוא מתייצב:
  ```
  python3 build.py          # אם src/ השתנה
  node store/screenshots.js # he,en כברירת מחדל; אפשר: node store/screenshots.js he
  ```
  התוצאה ב-`store/screenshots/<שפה>/<מכשיר>/`. (דורש Playwright: `npm i -D playwright && npx playwright install chromium`.)

---

## 1. Google Play

### 1.1 חשבון מפתח
- [ ] להירשם ב-https://play.google.com/console — **תשלום חד-פעמי של 25$**.
- [ ] אימות זהות (תעודה מזהה; לחשבון ארגוני גם מספר D-U-N-S).
- [ ] **חשבון אישי חדש:** לפני פרסום לכולם, Google דורשת **בדיקה סגורה עם לפחות 12 בודקים שמשתתפים 14 ימים רצופים**, ואז בקשת גישה ל-Production. כדאי להתחיל את הבדיקה הסגורה מוקדם (מסלול Closed testing, רשימת אימיילים של בודקות).
- [ ] **אימות מפתחים באנדרואיד (Android developer verification):** Google מחייבת בהדרגה (החל מ-2026 במדינות ראשונות, ובהמשך בכל העולם) שכל אפליקציה שמותקנת במכשירים מאושרים — גם APK שמורידים מ-GitHub — תהיה רשומה על שם מפתח מאומת. לרשום את שם החבילה `io.github.nrt613.maayan` ואת מפתח החתימה בקונסולה כשהאפשרות מופיעה.

### 1.2 יצירת האפליקציה
- [ ] Create app → שם: `מעיין · יומן טהרת המשפחה`, שפת ברירת מחדל: **עברית (he-IL)**, App, Free.
- [ ] להוסיף תרגום **English (en-US)** ולהדביק את הטקסטים מ-`store/listing.md`.
- [ ] גרפיקה: סמל 512×512 (`store/screenshots/play/icon-512.png`), גרפיקה ראשית 1024×500 (`store/screenshots/play/feature-graphic-1024x500.png`), 2–8 צילומי טלפון (`store/screenshots/he/play-phone/*.png`, 1080×1920). טאבלט — לא חובה.
- [ ] קטגוריה: Health & Fitness. פרטי קשר: אימייל (חובה), אתר.

### 1.3 Play App Signing — המפתח הקיים הופך ל"מפתח העלאה"
המפתח במאגר (`android/signing/maayan.p12`, alias `maayan`) כבר חותם את ה-APK שמופץ ב-GitHub. ב-Play משתמשים בו כ-**upload key**, ו-Google מחזיקה את מפתח ההפצה:
- [ ] בהעלאה הראשונה (Release → Create new release), לבחור **"Let Google manage and protect your app signing key"** (ברירת המחדל). Google יוצרת מפתח הפצה חדש, והמפתח שלנו נרשם כמפתח העלאה.
  - השלכה: ה-APK מ-GitHub (חתום במפתח שלנו) וה-APK מ-Play (חתום במפתח של Google) **לא יתעדכנו זה על גבי זה**. מי שהתקינה מ-GitHub ורוצה לעבור ל-Play צריכה לגבות (גיבוי מוצפן), להסיר, להתקין מ-Play ולשחזר.
  - חלופה, אם רוצים שהעדכונים יעבדו בין שני המקורות: לבחור "Use a different key / Export and upload a key from Java keystore" ולהעלות את **המפתח הקיים כמפתח ההפצה**, בעזרת הכלי PEPK שהקונסולה מציעה (`java -jar pepk.jar --keystore=android/signing/maayan.p12 --alias=maayan --output=out.zip --include-cert --rsa-aes-encryption --encryption-key-path=<הקובץ מהקונסולה>`). ואז כדאי ליצור מפתח העלאה נפרד. ההחלטה בלתי הפיכה.
- [ ] לשמור את הסיסמה (`SIGNING_PASSWORD`) גם מחוץ ל-GitHub. אם מפתח ההעלאה אובד — אפשר לבקש מ-Google לאפס אותו; מפתח הפצה שאובד (בחלופה) — אין דרך חזרה.

### 1.4 העלאת הגרסה
- [ ] להוריד את `maayan.aab` מהתוצרים של הריצה האחרונה: Actions → android-app → הריצה → Artifacts → `maayan-android-<מספר>`.
- [ ] Testing → Closed testing (או Internal testing לבדיקה מהירה) → Create release → להעלות את `maayan.aab`.
- [ ] `versionCode` = מספר הריצה ב-GitHub, ולכן תמיד עולה. אם פעם יוחלף ה-workflow ומספרי הריצות יתחילו מ-1: Settings → Secrets and variables → Actions → **Variables** → `VERSION_CODE_OFFSET` = מספר גבוה מהגרסה האחרונה ב-Play.
- [ ] שם הגרסה (versionName) = `1.2.<מספר ריצה>`. להעלאת המספר הראשי/המשני: לשנות `"version"` ב-`android/package.json` (ובאותו אופן ב-`ios/package.json`).

### 1.5 App content (תוכן האפליקציה) — התשובות ב-`store/declarations.md`
- [ ] Privacy policy · Ads (אין) · App access (הכול פתוח) · Content rating (IARC) · Target audience (18+) · **Data safety (No data collected)** · **Health apps declaration** (מעקב מחזור) · Advertising ID (לא) · Government/Financial/News (לא).
- [ ] הרשאות: אין מיקום ברקע; `SCHEDULE_EXACT_ALARM` (באישור המשתמשת) — אם Google תבקש הסבר: תזכורות לפי שעת השקיעה ומועדים שהמשתמשת רשמה. אם תדרוש להסיר — בבנייה להגדיר `EXACT_ALARM=0` (Variables/env ב-workflow) והתזכורות יעבדו כלא-מדויקות.
- [ ] יעד API: הבנייה מכוונת ל-**Android 16 (API 36)**, כפי שנדרש מאז 31.8.2026 לאפליקציות חדשות ולעדכונים. כל שנה Google מעלה את הדרישה (בדרך כלל באוגוסט) — לעדכן אז את Capacitor (`android/package.json`) לגרסה שמכוונת ל-API החדש.

---

## 2. Apple App Store

### 2.1 חשבון מפתח
- [ ] Apple Developer Program: https://developer.apple.com/programs/ — **99$ לשנה** (פטור אפשרי לעמותות). חשבון אישי: שם המפתח שיוצג הוא השם הפרטי שלך; ארגון: צריך D-U-N-S.
- [ ] לחתום על ההסכמים ב-App Store Connect → Business (גם לאפליקציה חינמית חובה לאשר את Free Apps Agreement).
- [ ] **מק אינו חובה**: הבנייה, החתימה וההעלאה רצות במק של GitHub. מק עוזר לבדיקות ידניות.

### 2.2 מזהה ואפליקציה
- [ ] developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → App ID: `io.github.nrt613.maayan`, תכונות: אין צורך לסמן שום Capability (התראות מקומיות לא דורשות Push).
- [ ] App Store Connect → Apps → + → New App: Platform iOS, שם `מעיין · יומן טהרת המשפחה`, שפה ראשית **Hebrew**, Bundle ID מהרשימה, SKU למשל `maayan`.
- [ ] להוסיף לוקליזציה English והטקסטים מ-`store/listing.md`.

### 2.3 מפתח API להעלאה מ-GitHub (TestFlight)
- [ ] App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → + → תפקיד **Admin** (נדרש כדי ש-Xcode ייצור תעודת הפצה ופרופיל בעצמו). להוריד את `AuthKey_XXXX.p8` (אפשר רק פעם אחת).
- [ ] ב-GitHub: Settings → Secrets and variables → Actions → New repository secret:
  | שם | ערך |
  |---|---|
  | `APPLE_TEAM_ID` | מזהה הצוות (10 תווים, ב-developer.apple.com → Membership) |
  | `ASC_KEY_ID` | Key ID של המפתח |
  | `ASC_ISSUER_ID` | Issuer ID (מופיע מעל רשימת המפתחות) |
  | `ASC_KEY_P8_BASE64` | `base64 -i AuthKey_XXXX.p8` (במק) או `base64 -w0 AuthKey_XXXX.p8` (בלינוקס) |
- [ ] להריץ: Actions → **ios-app** → Run workflow → לסמן **testflight** → Run. אחרי 10–30 דקות הבנייה מופיעה ב-App Store Connect → TestFlight.
- [ ] לבדוק ב-TestFlight על אייפון אמיתי: התראות, מיקום, גיבוי/שחזור (שיתוף הקובץ ו״שמירה בקבצים״, ובחירתו בשחזור), נעילה בקוד ו-Face ID, RTL, אזורי המסך (notch / Dynamic Island).

### 2.4 דף האפליקציה וטפסים — התשובות ב-`store/declarations.md`
- [ ] צילומי מסך: **iPhone 6.9"** (1320×2868) — `store/screenshots/he/apple-6.9/`. מספיק סט אחד של 6.9"; Apple מקטינה אוטומטית לגדלים הקטנים. 6.5" (1242×2688, `apple-6.5/`) נדרש רק אם אין 6.9". האפליקציה מוגדרת לאייפון בלבד, ולכן **אין צורך בצילומי iPad**.
- [ ] App Privacy → **Data Not Collected**. Privacy Policy URL.
- [ ] Age Rating (השאלון החדש) — לפי הטבלה. Content Rights: אין תוכן צד שלישי.
- [ ] Category: Health & Fitness (משנית: Lifestyle).
- [ ] App Review Information: איש קשר + טלפון, **Sign-in required: No**, ובשדה Notes — הטקסט מ-`store/review-notes.md`.
- [ ] Export Compliance — כבר מוגדר באפליקציה (`ITSAppUsesNonExemptEncryption = NO`), לא יישאל.
- [ ] EU DSA trader status (אם מפיצים באירופה).
- [ ] Submit for Review. זמן בדיקה טיפוסי: 1–3 ימים.

### 2.5 דרישות Apple שכבר מטופלות
- נבנה ב-**Xcode 26 / iOS 26 SDK** (חובה לכל העלאה מאז 28.4.2026). ה-workflow נכשל אם Xcode ישן יותר.
- `PrivacyInfo.xcprivacy` באפליקציה (ו-Capacitor מביא מניפסט משלו).
- הסבר לבקשת מיקום בעברית ובאנגלית; עברית כשפת הפיתוח; מצב בהיר בלבד; היומן לא מגובה ל-iCloud.
- מחיקת חשבון (5.1.1(v)) — לא רלוונטי, אין חשבון. מחיקת נתונים — קיימת בהגדרות.

---

## 3. בכל עדכון
1. לדחוף ל-main → android-app בונה, בודק באמולטור, ומפרסם APK ב-Releases; ios-app בונה ובודק בסימולטור.
2. Play: להוריד את `maayan.aab` מה-Artifacts → להעלות כ-release חדש.
3. Apple: Run workflow עם testflight → TestFlight → להוסיף ל-App Store version חדשה → Submit.
4. אם העיצוב השתנה — להריץ `node store/screenshots.js` ולהעלות צילומים חדשים.

## 4. סודות ומשתנים ב-GitHub (סיכום)
| שם | סוג | למה |
|---|---|---|
| `SIGNING_PASSWORD` | Secret (קיים) | חתימת ה-APK וה-AAB |
| `VERSION_CODE_OFFSET` | Variable (רשות) | אם מספרי הריצות מתאפסים |
| `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` | Secrets | העלאה ל-TestFlight |
