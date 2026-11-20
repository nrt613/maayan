# הערות לבודקי Apple (App Review Information → Notes)

להדביק את הטקסט באנגלית בשדה Notes. אין צורך בחשבון הדגמה (Sign-in required: **No**).

```
Maayan is a private diary for "taharat hamishpacha" (Jewish family-purity laws). It helps a married woman record her cycle (sightings, hefsek tahara, bedikot, mikveh) and calculates, according to the halachic method she selects, the seven clean days, the mikveh night and the days of separation (onot perisha). The interface is Hebrew (right-to-left) by default; English, French and Spanish can be chosen on the first screen.

Offline and private: the app has no account, no server, no analytics, no ads and no third-party SDKs. It makes no network requests at all; all data is stored only on the device and is excluded from iCloud backup. Privacy policy: https://nrt613.github.io/maayan/privacy.html

Native features used (Capacitor):
- Local notifications (UNUserNotificationCenter): reminders scheduled on the device for bedikot, hefsek and onot, delivered even when the app is closed. Text is deliberately discreet ("Personal reminder").
- Location (when in use only): "Detect my location" in Settings gets the position once to compute local sunset and nightfall on the device. It is optional; a city can be chosen from a list instead.
- Share sheet + Files: export of an encrypted backup / a report file, and restore from a file.
- Works fully offline, system light appearance, iPhone layout with safe-area support.

How to test:
1. Launch the app and choose a language (for English tap "English").
2. Tap "View a sample diary" to explore a ready-made diary without entering anything (changes there are not saved), or "Start my diary" to start an empty personal diary.
3. In the personal diary: Diary tab → "+ " → enter a period start date a few days ago → Save. The Today tab then shows the current stage, and the Dates tab shows upcoming dates.
4. Dates tab → enable notifications to allow reminders; the screen shows how many reminders are scheduled.
5. Settings → "Detect my location" to see location-based sun times (or pick a city).
6. Settings → "Delete all my data" erases everything from the device.

The app is a record-keeping and planning tool. It does not issue religious rulings and is not medical advice; this is stated in the app's terms and in the description.
```

## בעברית (לעיון בלבד — Apple קוראת באנגלית)
מעיין הוא יומן פרטי לטהרת המשפחה. אין חשבון, אין שרת ואין פניות לרשת. התכונות הנייטיביות: התראות מקומיות, מיקום בזמן שימוש בלבד לחישוב השקיעה, גיליון שיתוף וקבצים לגיבוי. לבדיקה: לבחור שפה → "צפייה ביומן לדוגמה", או להתחיל יומן ולהזין מחזור, להפעיל התראות במסך המועדים, וזיהוי מיקום בהגדרות.

> לפני ההגשה: לוודא שהשמות של הכפתורים בטקסט למעלה ("View a sample diary", "Start my diary", "Detect my location", "Delete all my data") תואמים לממשק אחרי העיצוב החדש, ולעדכן אם השתנו.

## למה זה לא "אתר עטוף" (סעיף 4.2)
- האפליקציה לא טוענת אתר: כל הקוד בתוך החבילה ועובד בלי אינטרנט.
- תזכורות שמתוזמנות במערכת ומגיעות כשהאפליקציה סגורה — הפונקציה המרכזית, שאתר לא יכול לספק באמינות ב-iOS.
- הרשאת מיקום נייטיבית, גיליון שיתוף, ייצוא/ייבוא קבצים.
- ממשק מותאם לטלפון (לשוניות תחתונות, safe areas, מצב בהיר).
אם בכל זאת תתקבל דחייה לפי 4.2: להשיב ב-Resolution Center עם הרשימה הזאת, ולשקול להוסיף רטט (Haptics) בשמירה, ווידג'ט "היום" או קיצורי Siri.
