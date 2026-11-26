# תשובות לטפסים של החנויות — מעיין

העובדות שעליהן מבוססות כל התשובות:
- אין חשבון, אין שרת, אין אנליטיקס, אין פרסומות ואין SDK של צד שלישי שאוסף מידע.
- האפליקציה המותקנת לא מתחברת לאינטרנט (באנדרואיד אין בכלל הרשאת INTERNET).
- היומן נשמר במכשיר בלבד (localStorage של ה-WebView). לא מגובה לענן (Android: `allowBackup=false`; iOS: התיקייה מסומנת `isExcludedFromBackup`).
- מיקום: רק בלחיצה, רק בקדמת המסך, לחישוב זמני השמש במכשיר. נשמר ביומן המקומי בלבד.
- התראות: מקומיות בלבד. אין push.
- ייצוא/גיבוי: קובץ שהמשתמשת בוחרת לשתף בעצמה דרך גיליון השיתוף של המערכת.

לפי ההגדרות של Google ושל Apple, מידע שמעובד רק במכשיר ולא נשלח ממנו אינו נחשב "נאסף" (collected).

---

## Google Play Console → App content (תוכן האפליקציה)

### Privacy policy
`https://nrt613.github.io/maayan/privacy.html`

### Ads
**האם האפליקציה מכילה פרסומות?** לא.

### App access
**כל הפונקציות זמינות בלי הגבלות מיוחדות** (אין התחברות).

### Content rating (שאלון IARC)
- קטגוריה: **All Other App Types** (לא משחק, לא רשת חברתית).
- אלימות, פחד, הימורים, סמים, אלכוהול, טבק, שפה גסה: **לא**.
- תוכן מיני / עירום: **לא**. (יש התייחסות טקסטואלית, לא גרפית, לימים המותרים והאסורים בחיי אישות במסגרת דינים דתיים. זה אינו "תוכן מיני" בשאלון. אם השאלון שואל על "התייחסות לנושאים מיניים / חינוך מיני" — לענות כן, ברמה מינימלית.)
- תוכן שנוצר על ידי משתמשים ומשותף עם אחרים / תקשורת בין משתמשים: **לא**.
- שיתוף מיקום עם משתמשים אחרים: **לא**.
- רכישות דיגיטליות: **לא**.
- דירוג צפוי: Everyone / PEGI 3 (או 12, אם עונים כן על ההתייחסות לנושאים מיניים).

### Target audience and content (קהל יעד)
- גילאים: **18 ומעלה** בלבד.
- האם האפליקציה עלולה למשוך ילדים? **לא**.

### Data safety (בטיחות נתונים)
| שאלה | תשובה |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| (נשאל רק אם עונים Yes) Is all of the user data encrypted in transit? | לא רלוונטי |
| (נשאל רק אם עונים Yes) Do you provide a way for users to request that their data is deleted? | לא רלוונטי. בכל זאת: יש מחיקה מלאה בתוך האפליקציה (הגדרות → מחיקת כל הנתונים שלי) |

הסבר למקרה שיישאל: מיקום ונתוני היומן (כולל נתוני מחזור) מעובדים ונשמרים במכשיר בלבד ואינם יוצאים ממנו, ולכן אינם "collected" לפי ההגדרה של Google. האפליקציה גם אינה מחזיקה הרשאת אינטרנט.
ב-Play Console אפשר להוסיף את התג **"No data collected"** (אין צורך לסמן "Independent security review").

### Health apps (הצהרת אפליקציות בריאות)
חובה לכל אפליקציה ב-Play (גם אם אין לה פונקציות בריאות). למעיין:
- **Health features:** לסמן את הפונקציה של מעקב מחזור / בריאות האישה (בטופס: *Period tracking* / *Menstrual / reproductive health*, תחת בריאות האישה או בריאות רבייה — לפי הניסוח שמופיע בטופס בזמן ההגשה).
- **האם האפליקציה מכשיר רפואי / מספקת אבחון או טיפול?** לא. היא כלי רישום ותכנון לפי דינים דתיים.
- **Health Connect:** לא בשימוש.
- **נתוני בריאות נאספים/משותפים?** לא (נשארים במכשיר).
- **Privacy policy:** חובה, והקישור למעלה מכסה את נתוני המחזור במפורש.
- בתיאור יש הבהרה: "אינה ייעוץ רפואי".

### Sensitive permissions (הרשאות)
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`: בקדמת המסך בלבד, אין `ACCESS_BACKGROUND_LOCATION` → אין טופס הצהרה על מיקום ברקע.
- `SCHEDULE_EXACT_ALARM`: הרשאה שהמשתמשת מאשרת בעצמה ("שעונים מעוררים ותזכורות"), כברירת מחדל כבויה. שימוש: תזכורות לפי שעת השקיעה ולפי מועדים שהמשתמשת רשמה. **לא** משתמשים ב-`USE_EXACT_ALARM` (שמיועדת רק לאפליקציות שעון מעורר/יומן, ודורשת הצהרה). אם Google תבקש בכל זאת להסיר: לבנות עם `EXACT_ALARM=0` (ראו android/prepare.py) — התזכורות יעבדו כהתראות לא-מדויקות.
- `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`: התראות מקומיות ושחזורן אחרי הפעלה מחדש.
- `USE_BIOMETRIC`: פתיחת הנעילה בטביעת אצבע, רק אם המשתמשת הפעילה אותה. הזיהוי נעשה במערכת ההפעלה; האפליקציה מקבלת רק הצליח/לא הצליח.
- `USE_FINGERPRINT`: הגרסה הישנה של אותה הרשאה, שהספרייה לטביעת אצבע מוסיפה לאנדרואיד ישן.
- `ACCESS_NETWORK_STATE`: מתווספת מספרייה (מיזוג מניפסטים). הרשאה רגילה שמאפשרת רק לדעת אם יש חיבור; בלי `INTERNET` האפליקציה לא יכולה לפנות לרשת, ובדיקת האמולטור מוודאת שאין שום פנייה.
- `<package>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`: הרשאה פנימית של AndroidX, בתוך האפליקציה בלבד.
- הווידג׳ט למסך הבית אינו דורש הרשאה.
- הרשימה בפועל (גרסה 1.2.55): ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, WAKE_LOCK, SCHEDULE_EXACT_ALARM, USE_BIOMETRIC, USE_FINGERPRINT, ACCESS_NETWORK_STATE.
- אין `INTERNET`, אין `AD_ID`, אין `USE_EXACT_ALARM`, אין `ACCESS_BACKGROUND_LOCATION`. ה-workflow (android-app) מדפיס את ההרשאות של הגרסה לחנות אחרי מיזוג המניפסטים, ונכשל אם אחת מאלה מופיעה.

### Advertising ID
**האם האפליקציה משתמשת במזהה פרסום?** לא (ההרשאה AD_ID חסומה במפורש במניפסט).

### Government apps / Financial features / News / COVID-19
לא / אין / לא / לא.

---

## Apple App Store Connect

### App Privacy (פרטיות האפליקציה)
- **Do you or your third-party partners collect data from this app?** → **No, we do not collect data from this app.**
- התוצאה בדף האפליקציה: **Data Not Collected**.
- Privacy Policy URL: `https://nrt613.github.io/maayan/privacy.html`
- מניפסט הפרטיות (`PrivacyInfo.xcprivacy`) בתוך האפליקציה: `NSPrivacyTracking=false`, אין דומיינים, אין סוגי מידע שנאספים, וממשקים עם סיבה נדרשת: FileTimestamp (`C617.1`) ו-UserDefaults (`CA92.1`).

### Age Rating (שאלון הגיל)
| נושא | תשובה |
|---|---|
| Parental controls / Age assurance | No |
| Unrestricted web access | No |
| User-generated content / Messaging and chat | No |
| Advertising | No |
| Cartoon or fantasy violence / Realistic violence / Prolonged graphic violence | None |
| Profanity or crude humor | None |
| Mature or suggestive themes | Infrequent/Mild (התייחסות טקסטואלית לדיני חיי אישות) |
| Sexual content or nudity / Graphic sexual content | None |
| Horror/fear themes | None |
| Alcohol, tobacco or drug use | None |
| Medical or treatment information | None (לא מידע רפואי) |
| Health or wellness topics | **Yes** (מעקב מחזור) |
| Gambling / Simulated gambling / Contests / Loot boxes | None / No |
| Guns or other weapons | None |
| דירוג צפוי | 13+ (לפי המערכת החדשה של Apple). אפשר לבחור ידנית דירוג גבוה יותר (למשל 18+), כי קהל היעד נשים נשואות. |

### Export compliance (הצפנה)
ב-Info.plist מוגדר `ITSAppUsesNonExemptEncryption = NO`: הגיבוי המוצפן משתמש רק בהצפנה של מערכת ההפעלה / WebKit (Web Crypto) להגנה על מידע המשתמשת — פטור. לא צריך מסמכים.

### Content Rights
לא מכילה תוכן של צד שלישי, מלבד הגופן Rubik (ברישיון SIL Open Font License, שמתיר הטמעה בתוך האפליקציה). אין תוכן מוגן בזכויות יוצרים של אחרים, ואין תוכן שנוצר על ידי משתמשים שמשותף עם אחרים.

### EU Digital Services Act (סטטוס סוחר)
אם מפיצים באיחוד האירופי, App Store Connect מבקש להצהיר אם בעל החשבון "סוחר" (trader). אפליקציה חינמית שאינה עסק — לרוב "לא סוחר"; אם כן — יוצגו כתובת, טלפון ואימייל בדף האפליקציה.
