# רשימת משימות להעלאת מעיין לחנויות (ידני, לבעל האפליקציה)

כל מה שאפשר לעשות אוטומטית כבר נעשה: הבנייה ב-GitHub Actions מפיקה קובץ AAB חתום ל-Google Play, APK להורדה ישירה, ואפליקציית iOS שנבנית ב-Xcode 26 ונבדקת בסימולטור. נשארו הצעדים שדורשים את החשבונות, הכסף והחתימה שלך.

קבצים שימושיים: `store/listing.md` (טקסטים), `store/declarations.md` (תשובות לטפסים), `store/review-notes.md` (הערות לבודקי Apple), `store/screenshots/` (צילומי מסך), `privacy.html` (מדיניות פרטיות).

---

## 0. לפני הכול (בקוד)

- [ ] **"גרסת בדיקה" / "לבודקים".** Apple דוחה גרסאות בטא בחנות (סעיף 2.2). לפני הגשה ל-App Store: להחליט שהגרסה "רשמית" ולהסיר את "גרסת בדיקה" מהממשק ומהתנאים (או להשאיר את מסך הבודקים רק בגרסת דפדפן/TestFlight). עד אז אפשר להפיץ דרך TestFlight ודרך מסלול בדיקה סגור ב-Google Play.
- [x] **כתובת לפניות.** להחליף את `[כתובת אימייל לפניות]` ב-`privacy.html` (פעמיים: עברית ואנגלית) ובטפסים.
- [ ] **מדיניות הפרטיות באוויר.** לוודא שהעמוד נפתח: https://nrt613.github.io/maayan/privacy.html (אחרי מיזוג ל-main, GitHub Pages מפרסם אותו).
- [x] **צילומי מסך עדכניים** (נוצרו מחדש אחרי תיקוני העיצוב). אחרי כל שינוי עיצוב מריצים שוב:
  ```
  python3 build.py          # אם src/ השתנה
  node store/screenshots.js # he,en כברירת מחדל; אפשר: node store/screenshots.js he
  ```
  התוצאה ב-`store/screenshots/<שפה>/<מכשיר>/`. (דורש Playwright: `npm i -D playwright && npx playwright install chromium`.)

---

## 1. Google Play — העלאה לבדיקה פנימית (Internal testing), צעד אחר צעד

קישורים להעתקה:
| מה | קישור |
|---|---|
| Play Console | https://play.google.com/console |
| מדיניות הפרטיות | https://nrt613.github.io/maayan/privacy.html |
| אתר האפליקציה | https://nrt613.github.io/maayan/ |
| הבנייה (android-app) ב-main | https://github.com/nrt613/maayan/actions/workflows/android.yml?query=branch%3Amain |
| אימייל לפניות | natan.taieb@gmail.com |

> הקישורים לאתר ולמדיניות עובדים רק אחרי שהענף מוזג ל-`main` (GitHub Pages מפרסם משם). לפני ההעלאה לפתוח את שניהם בטלפון ולוודא שהם נטענים.

### 1.1 חשבון מפתח (פעם אחת)
- [ ] להיכנס ל-https://play.google.com/console ולהירשם כמפתח. **תשלום חד-פעמי של 25$.**
- [ ] לבחור סוג חשבון **אישי** (Personal), ולאמת זהות (תעודה מזהה) וטלפון. האימות לוקח לרוב כמה ימים.
- [ ] **אימות מפתחים באנדרואיד (Android developer verification):** כשהאפשרות מופיעה בקונסולה, לרשום את שם החבילה `io.github.nrt613.maayan` ואת מפתח החתימה. Google מחייבת זאת בהדרגה (החל מ-2026), גם ל-APK שמורידים מ-GitHub.

### 1.2 יצירת האפליקציה
- [ ] Home → **Create app**.
  - App name: `מעיין · יומן טהרת המשפחה`
  - Default language: **Hebrew – he-IL** (עברית)
  - App or game: **App** · Free or paid: **Free**
  - לסמן את שתי ההצהרות (Developer Program Policies, US export laws) → **Create app**.

### 1.3 App content (תוכן האפליקציה) — לפני ההעלאה הראשונה
בתפריט: **Policy and programs → App content** (או ״Set up your app״ בלוח הבקרה). התשובות המלאות ב-`store/declarations.md`. Google לא מאפשרת להפיץ גם לבדיקה פנימית עד שהסעיפים האלה מולאו:
- [ ] **Privacy policy:** `https://nrt613.github.io/maayan/privacy.html`
- [ ] **App access:** All functionality is available without special access.
- [ ] **Ads:** No.
- [ ] **Content rating:** שאלון IARC, קטגוריה All Other App Types, לפי הטבלה.
- [ ] **Target audience:** 18 ומעלה בלבד; לא מושך ילדים.
- [ ] **Data safety:** No — לא נאסף ולא משותף מידע.
- [ ] **Health apps:** לסמן מעקב מחזור / בריאות האישה; לא מכשיר רפואי.
- [ ] **Advertising ID:** No. · **Government apps / Financial features / News:** No.

### 1.4 דף החנות (Main store listing)
**Grow users → Store presence → Main store listing** (הטקסטים ב-`store/listing.md`):
- [ ] שם, תיאור קצר ותיאור מלא בעברית. **Manage translations → Add translations → English (en-US)** והטקסטים באנגלית.
- [ ] App icon: `store/screenshots/play/icon-512.png` (512×512).
- [ ] Feature graphic: `store/screenshots/play/feature-graphic-1024x500.png`.
- [ ] Phone screenshots (2–8): `store/screenshots/he/play-phone/*.png` (ובתרגום האנגלי: `store/screenshots/en/play-phone/`).
- [ ] **Store settings:** קטגוריה Health & Fitness; אימייל `natan.taieb@gmail.com`; אתר `https://nrt613.github.io/maayan/`.

### 1.5 להוריד את maayan.aab
- [ ] לפתוח https://github.com/nrt613/maayan/actions/workflows/android.yml?query=branch%3Amain ולבחור את **הריצה הירוקה האחרונה ב-main**.
- [ ] למטה, תחת **Artifacts**: להוריד את `maayan-android-<מספר הריצה>` (קובץ zip), ולחלץ ממנו את **`maayan.aab`**.
  - ה-AAB כבר חתום במפתח ההעלאה של המאגר (`android/signing/maayan.p12`, alias `maayan`).
  - התוצרים נשמרים 30 יום. אם פג תוקפם: באותו עמוד **Run workflow** על `main`, ולהוריד מהריצה החדשה.
- [ ] מספרי הגרסה נקבעים לבד: `versionCode` = מספר הריצה (תמיד עולה), `versionName` = `1.2.<מספר הריצה>` (מוצג גם ב״על מעיין״ באפליקציה).

### 1.6 בדיקה פנימית: גרסה ובודקים
- [ ] **Test and release → Testing → Internal testing → Testers**: **Create email list** (למשל ״בודקים״), להוסיף את כתובות ה-Gmail של הבודקים (עד 100), לסמן את הרשימה ו-**Save**.
- [ ] באותו מסך, **Copy link** תחת ״How testers join your test״ (קישור מהצורה `https://play.google.com/apps/internaltest/...`). את הקישור שולחים לבודקים: כל בודק פותח אותו בטלפון, לוחץ ״להצטרף״/Accept, ואז מתקין מ-Play.
- [ ] **Releases → Create new release**.
- [ ] **Play App Signing** — בהעלאה הראשונה Google שואלת איך לחתום את האפליקציה. לבחור את ברירת המחדל: **Use Google-generated key** (״Let Google manage and protect your app signing key״). Google מחזיקה את מפתח ההפצה, והמפתח של המאגר נרשם כמפתח ההעלאה.
  - **ההשלכה:** האפליקציה מ-Play והאפליקציה מ-GitHub (`maayan.apk` ב-Releases) חתומות במפתחות שונים ולא יתעדכנו זו על גבי זו. מי שהתקינה מ-GitHub ורוצה לעבור ל-Play: **הגדרות → גיבוי מוצפן** (לשמור את הקובץ ואת הסיסמה מחוץ לטלפון) ← **להסיר** את מעיין ← **להתקין מ-Play** ← **הגדרות → שחזור מגיבוי**.
  - חלופה (בלתי הפיכה): ״Use a different key / Export and upload a key from Java keystore״ ולהעלות את המפתח הקיים כמפתח ההפצה בכלי PEPK שהקונסולה מציעה (`java -jar pepk.jar --keystore=android/signing/maayan.p12 --alias=maayan --output=out.zip --include-cert --rsa-aes-encryption --encryption-key-path=<הקובץ מהקונסולה>`). אז העדכונים עוברים בין שני המקורות, אבל אובדן המפתח הוא סופי.
- [ ] **App bundles → Upload** → לבחור את `maayan.aab`. לחכות לסיום העיבוד.
- [ ] Release name מתמלא לבד (`<versionCode> (1.2.<ריצה>)`). Release notes בעברית, למשל: `<he-IL>גרסת בדיקה ראשונה.</he-IL>`.
- [ ] **Next** → לעבור על האזהרות (אזהרה על קוד מקורי/סמלים ניתן להתעלם) → **Save and publish** / **Start rollout to Internal testing**.
- [ ] אחרי כמה דקות: לפתוח את קישור ההצטרפות בטלפון של בודק, להתקין, ולבדוק פתיחה, התראות, נעילה ווידג׳ט.

### 1.7 אחרי הבדיקה הפנימית: בדיקה סגורה ובקשת Production
- [ ] **חשבון אישי חדש:** לפני פרסום לכולם Google דורשת **בדיקה סגורה (Closed testing) עם לפחות 12 בודקים שהצטרפו והשתתפו 14 ימים רצופים**. הבדיקה הפנימית לא נספרת.
  - Testing → Closed testing → Create track (או Alpha) → אותה רשימת אימיילים (או Google Group) → Create new release → אותו `maayan.aab` (או חדש יותר) → Send for review. בדיקה סגורה עוברת סקירה של Google (בדרך כלל ימים ספורים).
  - לשלוח לבודקים את קישור ההצטרפות של המסלול הסגור, ולוודא שלפחות 12 הצטרפו **והתקינו**. כדאי לצרף כמה יותר מ-12, למקרה שמישהו יוצא.
- [ ] אחרי 14 ימים: Dashboard → **Apply for production** (שאלון קצר על הבדיקה). אחרי האישור: Production → Create new release.

### 1.8 הרשאות ויעד API
- [ ] אם Google שואלת על `SCHEDULE_EXACT_ALARM`: תזכורות לפי שעת השקיעה ולפי מועדים שהמשתמשת רשמה; ההרשאה כבויה עד שהמשתמשת מאשרת. אם תדרוש להסיר — להגדיר ב-GitHub: Settings → Secrets and variables → Actions → Variables → `EXACT_ALARM` = `0`, להריץ שוב, ולהעלות. התזכורות ימשיכו לעבוד כלא-מדויקות.
- [ ] יעד API: הבנייה מכוונת ל-**Android 16 (API 36)**, כנדרש מאז 31.8.2026. Google מעלה את הדרישה בכל שנה (בדרך כלל באוגוסט) — אז לעדכן את Capacitor ב-`android/package.json`.
- [ ] `VERSION_CODE_OFFSET` (Variables): רק אם ה-workflow יוחלף ומספרי הריצות יתחילו מ-1 — מספר גבוה מה-versionCode האחרון ב-Play.
- [ ] לשמור את הסיסמה (`SIGNING_PASSWORD`) גם מחוץ ל-GitHub. מפתח העלאה שאבד — אפשר לבקש מ-Google לאפס.

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
