"""מכין את פרויקט האנדרואיד אחרי `npx cap add android`: דף האפליקציה, סמלים, הרשאות ומספר גרסה."""
import pathlib, re, shutil, sys, os
from PIL import Image

here = pathlib.Path(__file__).parent
run = int(os.environ.get("GITHUB_RUN_NUMBER", "1"))
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
    man = here / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    x = man.read_text(encoding="utf-8")
    perms = """
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
"""
    assert "</manifest>" in x
    x = x.replace("</manifest>", perms + "</manifest>")
    # היומן לא מגובה לענן של Google: נשאר במכשיר בלבד
    x = x.replace('android:allowBackup="true"', 'android:allowBackup="false" android:fullBackupContent="false"')
    assert 'android:allowBackup="false"' in x
    man.write_text(x, encoding="utf-8")
    g = here / "android" / "app" / "build.gradle"
    y = g.read_text(encoding="utf-8")
    y, n1 = re.subn(r"versionCode \d+", f"versionCode {run}", y)
    y, n2 = re.subn(r'versionName "[^"]+"', f'versionName "1.1.{run}"', y)
    assert n1 == 1 and n2 == 1
    g.write_text(y, encoding="utf-8")
    print("native ready, version", run)
