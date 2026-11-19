"""מכין את פרויקט האנדרואיד אחרי `npx cap add android`: דף האפליקציה, סמלים, הרשאות ומספר גרסה.

שלבים: `www` (לפני npm/cap) ו-`native` (אחרי `npx cap add android`).
גרסה: major.minor מ-package.json, והמספר השלישי הוא מספר הבנייה ב-GitHub Actions.
versionCode = מספר הבנייה + VERSION_CODE_OFFSET (ברירת מחדל 0), ולכן תמיד עולה. Google Play דורש
שכל העלאה תהיה עם versionCode גבוה מהקודם; אם ה-workflow יוחלף ומספרי הבנייה יתאפסו, מגדירים
VERSION_CODE_OFFSET כמשתנה (Variables) במאגר כדי להמשיך מעל הגרסה האחרונה שהועלתה.
EXACT_ALARM=0 מסיר את ההרשאה SCHEDULE_EXACT_ALARM (אם Google תבקש): התזכורות ימשיכו לפעול כהתראות
לא-מדויקות (setAndAllowWhileIdle) שעלולות להתעכב מעט כשהמכשיר במצב חיסכון.
"""
import json, pathlib, re, shutil, sys, os
from PIL import Image

here = pathlib.Path(__file__).parent
run = int(os.environ.get("GITHUB_RUN_NUMBER", "1"))
offset = int(os.environ.get("VERSION_CODE_OFFSET") or "0")
major_minor = ".".join(json.loads((here / "package.json").read_text(encoding="utf-8"))["version"].split(".")[:2])
version_name = f"{major_minor}.{run}"
version_code = run + offset
stage = sys.argv[1]

if stage == "www":
    html = (here.parent / "index.html").read_text(encoding="utf-8")
    # באפליקציה אין שום פנייה לרשת: מסירים את הגופן מ-Google ואת קובצי האתר
    html = re.sub(r'<link rel="preconnect"[^>]*>', "", html)
    html = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', "", html)
    html = re.sub(r'<link rel="manifest"[^>]*>', "", html)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>', "", html)
    faces = "".join('@font-face{font-family:"%s";src:url("%s");font-weight:100 900;font-display:swap}' % (n, f) for n, f in [("Bellefair", "bellefair.ttf"), ("Heebo", "heebo.ttf")] if (here / "www" / f).exists())
    html = html.replace("<style>", "<style>" + faces, 1)
    assert "fonts.googleapis" not in html
    (here / "www").mkdir(exist_ok=True)
    (here / "www" / "index.html").write_text(html, encoding="utf-8")
    print("www ready", len(html))

if stage == "native":
    res = here / "android" / "app" / "src" / "main" / "res"
    for d in (here / "res").iterdir():
        (res / d.name).mkdir(exist_ok=True)
        for f in d.iterdir():
            shutil.copy(f, res / d.name / f.name)
    # מסך פתיחה: מחליפים כל splash.png בגודל המקורי שלו
    src = Image.open(here / "splash.png").convert("RGB")
    for f in res.glob("drawable*/splash.png"):
        w, h = Image.open(f).size
        side = max(w, h)
        img = src.resize((side, side), Image.LANCZOS).crop(((side - w) // 2, (side - h) // 2, (side - w) // 2 + w, (side - h) // 2 + h))
        img.save(f)
    # האפליקציה תמיד בהיר: ערכת נושא בהירה בלבד, וחוסמים "הכהיה כפויה" של אנדרואיד/היצרן
    for st in (here / "android" / "app" / "src" / "main" / "res").glob("values*/styles.xml"):
        t = st.read_text(encoding="utf-8")
        t = t.replace("Theme.AppCompat.DayNight.NoActionBar", "Theme.AppCompat.Light.NoActionBar")
        t = t.replace("Theme.AppCompat.DayNight", "Theme.AppCompat.Light")
        t = re.sub(r'(<style name="(?:AppTheme|AppTheme\.NoActionBar)"[^>]*>)', r'\1<item name="android:forceDarkAllowed">false</item><item name="android:windowLightStatusBar">true</item>', t)
        st.write_text(t, encoding="utf-8")
    nd = here / "android" / "app" / "src" / "main" / "res" / "values-night"
    if nd.exists():
        shutil.rmtree(nd)
    man = here / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    x = man.read_text(encoding="utf-8")
    exact = os.environ.get("EXACT_ALARM", "1") != "0"
    # רק ההרשאות שהאפליקציה צריכה. INTERNET מוסר: האפליקציה לא פונה לרשת בכלל (הדף נטען מתוך ה-APK).
    # USE_EXACT_ALARM ו-AD_ID חסומים במפורש, גם אם ספרייה כלשהי תוסיף אותם בעתיד.
    perms = """
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <uses-feature android:name="android.hardware.location" android:required="false" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
""" + ("""    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
""" if exact else """    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />
""") + """    <uses-permission android:name="android.permission.USE_EXACT_ALARM" tools:node="remove" />
    <uses-permission android:name="android.permission.INTERNET" tools:node="remove" />
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />
"""
    assert "</manifest>" in x
    x = re.sub(r'\s*<uses-permission android:name="android.permission.INTERNET"\s*/>', "", x)
    if "xmlns:tools" not in x:
        x = x.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android"', '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"', 1)
    assert "xmlns:tools" in x
    x = x.replace("</manifest>", perms + "</manifest>")
    # היומן לא מגובה לענן של Google: נשאר במכשיר בלבד
    x = x.replace('android:allowBackup="true"', 'android:allowBackup="false" android:fullBackupContent="false"')
    assert 'android:allowBackup="false"' in x
    man.write_text(x, encoding="utf-8")
    g = here / "android" / "app" / "build.gradle"
    y = g.read_text(encoding="utf-8")
    y, n1 = re.subn(r"versionCode \d+", f"versionCode {version_code}", y)
    y, n2 = re.subn(r'versionName "[^"]+"', f'versionName "{version_name}"', y)
    assert n1 == 1 and n2 == 1
    g.write_text(y, encoding="utf-8")
    # היעד של Google Play: API 36 לפחות (מאז 31.8.2026)
    v = (here / "android" / "variables.gradle").read_text(encoding="utf-8")
    target = int(re.search(r"targetSdkVersion = (\d+)", v).group(1))
    assert target >= 36, f"targetSdkVersion {target} < 36"

    # ---- וידג'ט למסך הבית (android/widget/): ספק הווידג'ט, תוסף מקומי שכותב את הסיכום, פריסות ומשאבים ----
    # כבוי כברירת מחדל: עד שמפעילים אותו בהגדרות הוא מציג רק "מעיין" ו"פתיחת היומן".
    wsrc = here / "widget"
    main = here / "android" / "app" / "src" / "main"
    pkg_dir = main / "java" / "io" / "github" / "nrt613" / "maayan"
    for f in (wsrc / "java").glob("*.java"):
        shutil.copy(f, pkg_dir / f.name)
    for d in (wsrc / "res").iterdir():
        (main / "res" / d.name).mkdir(exist_ok=True)
        for f in d.iterdir():
            shutil.copy(f, main / "res" / d.name / f.name)
    # גרסאות משמאל לימין של הפריסות, לאנגלית, צרפתית וספרדית
    for n in ("small", "medium"):
        lay = (wsrc / "res" / "layout" / f"maayan_widget_{n}.xml").read_text(encoding="utf-8")
        lay = lay.replace('android:layoutDirection="rtl"', 'android:layoutDirection="ltr"').replace('android:textDirection="rtl"', 'android:textDirection="ltr"')
        (main / "res" / "layout" / f"maayan_widget_{n}_ltr.xml").write_text(lay, encoding="utf-8")
    # רישום התוסף המקומי ב-MainActivity
    ma = pkg_dir / "MainActivity.java"
    w = ma.read_text(encoding="utf-8")
    assert re.search(r"public class MainActivity extends BridgeActivity \{\s*\}", w), w
    w = re.sub(r"public class MainActivity extends BridgeActivity \{\s*\}", """public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MaayanWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}""", w)
    ma.write_text(w, encoding="utf-8")
    w = man.read_text(encoding="utf-8")
    receiver = """
        <receiver android:name=".MaayanWidgetProvider" android:exported="false" android:label="@string/maayan_widget_label">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
                <action android:name="android.intent.action.DATE_CHANGED" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/maayan_widget_info" />
        </receiver>
    </application>"""
    assert w.count("</application>") == 1
    man.write_text(w.replace("</application>", receiver, 1), encoding="utf-8")
    print("widget ready")
    # ---- סוף הווידג'ט ----

    out = here.parent / "out"; out.mkdir(exist_ok=True)
    (out / "version.txt").write_text(version_name, encoding="utf-8")
    print("native ready, version", version_name, "code", version_code, "targetSdk", target, "exact alarms", exact)
