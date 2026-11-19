"""מכין את פרויקט ה-iOS, באותה שיטה כמו באנדרואיד: הפרויקט של Xcode לא נשמר במאגר אלא נוצר מחדש בכל בנייה.

שימוש (גם במק מקומי):
    cd ios
    python3 prepare.py www            # הדף של האפליקציה (אותו עיבוד כמו באנדרואיד) אל ios/www
    npm install && npx cap add ios    # יוצר את ios/ios/App (Swift Package Manager, בלי CocoaPods)
    python3 prepare.py native         # מזהה, שם, עברית, סמל, מסך פתיחה, הרשאות, PrivacyInfo, גרסה
    npx cap sync ios
    open ios/App/App.xcodeproj

גרסה: major.minor מ-package.json, והמספר השלישי הוא מספר הבנייה (GITHUB_RUN_NUMBER), שמשמש גם כ-CFBundleVersion.
"""
import json, os, pathlib, plistlib, re, shutil, subprocess, sys
from PIL import Image

here = pathlib.Path(__file__).parent.resolve()
root = here.parent
run = int(os.environ.get("GITHUB_RUN_NUMBER", "1"))
major_minor = ".".join(json.loads((here / "package.json").read_text(encoding="utf-8"))["version"].split(".")[:2])
version_name = f"{major_minor}.{run}"
BUNDLE_ID = "io.github.nrt613.maayan"
stage = sys.argv[1]

if stage == "www":
    # אותו עיבוד בדיוק כמו באנדרואיד (בלי פניות לרשת, הגופנים מתוך האפליקציה)
    a = root / "android"
    (a / "www").mkdir(exist_ok=True)
    for f in ("bellefair.ttf", "heebo.ttf"):
        shutil.copy(root / "fonts" / f, a / "www" / f)
    subprocess.run([sys.executable, str(a / "prepare.py"), "www"], check=True)
    if (here / "www").exists():
        shutil.rmtree(here / "www")
    shutil.copytree(a / "www", here / "www")
    print("ios www ready")

if stage == "native":
    app = here / "ios" / "App"
    src = app / "App"
    A = here / "assets"

    # Info.plist: שם, עברית כשפת פיתוח, הסבר להרשאת מיקום, מצב בהיר בלבד, בלי הצפנה, אייפון בלבד
    ip = src / "Info.plist"
    p = plistlib.loads(ip.read_bytes())
    p["CFBundleDisplayName"] = "מעיין"
    p["CFBundleDevelopmentRegion"] = "he"
    p["CFBundleLocalizations"] = ["he", "en"]
    p["NSLocationWhenInUseUsageDescription"] = "מעיין משתמשת במיקום רק כדי לחשב במכשיר את זמני השקיעה וצאת הכוכבים במקומך. המיקום לא יוצא מהמכשיר ולא נשלח לשום מקום."
    p["UIUserInterfaceStyle"] = "Light"
    p["ITSAppUsesNonExemptEncryption"] = False
    p["UIRequiredDeviceCapabilities"] = ["arm64"]
    p["UISupportedInterfaceOrientations"] = ["UIInterfaceOrientationPortrait"]
    p.pop("UISupportedInterfaceOrientations~ipad", None)
    p["UIStatusBarStyle"] = "UIStatusBarStyleDarkContent"
    ip.write_bytes(plistlib.dumps(p))

    # סמל (1024, בלי שקיפות) ומסך פתיחה
    icon = Image.open(A / "AppIcon-1024.png").convert("RGB")
    assert icon.size == (1024, 1024)
    icon.save(src / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png")
    for f in (src / "Assets.xcassets" / "Splash.imageset").glob("*.png"):
        shutil.copy(A / "splash-2732.png", f)
    sb = src / "Base.lproj" / "LaunchScreen.storyboard"
    t = sb.read_text(encoding="utf-8")
    t = t.replace('<color key="backgroundColor" systemColor="systemBackgroundColor"/>', '<color key="backgroundColor" red="1" green="1" blue="1" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>')
    t = t.replace('contentMode="scaleAspectFill"', 'contentMode="scaleAspectFit"')
    sb.write_text(t, encoding="utf-8")

    # קבצים נוספים: מניפסט פרטיות ומחרוזות מתורגמות (עברית ואנגלית)
    shutil.copy(A / "PrivacyInfo.xcprivacy", src / "PrivacyInfo.xcprivacy")
    for lang in ("he", "en"):
        (src / f"{lang}.lproj").mkdir(exist_ok=True)
        shutil.copy(A / f"{lang}.lproj" / "InfoPlist.strings", src / f"{lang}.lproj" / "InfoPlist.strings")

    # היומן (localStorage של WKWebView, בתוך Library/WebKit) לא מגובה ל-iCloud: נשאר במכשיר בלבד, כמו באנדרואיד
    ad = src / "AppDelegate.swift"
    t = ad.read_text(encoding="utf-8")
    hook = "        // Override point for customization after application launch.\n"
    assert hook in t
    t = t.replace(hook, hook + "        excludeWebDataFromBackup()\n")
    t = t.replace("    func applicationWillResignActive", '''    /// היומן נשמר ב-localStorage של WKWebView (Library/WebKit). מסמנים את התיקייה כך שלא תגובה ל-iCloud או למחשב.
    private func excludeWebDataFromBackup() {
        guard var dir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first?.appendingPathComponent("WebKit", isDirectory: true) else { return }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? dir.setResourceValues(values)
    }

    func applicationWillResignActive''', 1)
    ad.write_text(t, encoding="utf-8")

    # הפרויקט של Xcode: מזהה, גרסה, אייפון בלבד, עברית כשפת הפיתוח, והוספת הקבצים לשלב המשאבים
    pb = app / "App.xcodeproj" / "project.pbxproj"
    x = pb.read_text(encoding="utf-8")
    def sub(pat, rep, count_expected=None):
        global x
        x, n = re.subn(pat, rep, x)
        assert n and (count_expected is None or n == count_expected), (pat, n)
    sub(r"PRODUCT_BUNDLE_IDENTIFIER = [^;]+;", f"PRODUCT_BUNDLE_IDENTIFIER = {BUNDLE_ID};", 2)
    sub(r"MARKETING_VERSION = [^;]+;", f"MARKETING_VERSION = {version_name};", 2)
    sub(r"CURRENT_PROJECT_VERSION = [^;]+;", f"CURRENT_PROJECT_VERSION = {run};", 2)
    sub(r'TARGETED_DEVICE_FAMILY = "1,2";', "TARGETED_DEVICE_FAMILY = 1;", 2)
    sub(r"developmentRegion = en;", "developmentRegion = he;", 1)
    sub(r"knownRegions = \(\n(\s*)en,", r"knownRegions = (\n\1he,\n\1en,", 1)
    ids = {k: f"AA0000000000000000000{i:03d}" for i, k in enumerate(["privRef", "privBuild", "stringsGroup", "stringsBuild", "heRef", "enRef"])}
    sub(r"(/\* Begin PBXBuildFile section \*/\n)", r"\1" +
        f'\t\t{ids["privBuild"]} /* PrivacyInfo.xcprivacy in Resources */ = {{isa = PBXBuildFile; fileRef = {ids["privRef"]} /* PrivacyInfo.xcprivacy */; }};\n'
        f'\t\t{ids["stringsBuild"]} /* InfoPlist.strings in Resources */ = {{isa = PBXBuildFile; fileRef = {ids["stringsGroup"]} /* InfoPlist.strings */; }};\n', 1)
    sub(r"(/\* Begin PBXFileReference section \*/\n)", r"\1" +
        f'\t\t{ids["privRef"]} /* PrivacyInfo.xcprivacy */ = {{isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; }};\n'
        f'\t\t{ids["heRef"]} /* he */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = he; path = he.lproj/InfoPlist.strings; sourceTree = "<group>"; }};\n'
        f'\t\t{ids["enRef"]} /* en */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = en; path = en.lproj/InfoPlist.strings; sourceTree = "<group>"; }};\n', 1)
    sub(r"(/\* Begin PBXVariantGroup section \*/\n)", r"\1" +
        f'\t\t{ids["stringsGroup"]} /* InfoPlist.strings */ = {{\n\t\t\tisa = PBXVariantGroup;\n\t\t\tchildren = (\n\t\t\t\t{ids["heRef"]} /* he */,\n\t\t\t\t{ids["enRef"]} /* en */,\n\t\t\t);\n\t\t\tname = InfoPlist.strings;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n', 1)
    # בקבוצה App, ליד Info.plist
    sub(r"(\n(\t+)[0-9A-F]{24} /\* Info\.plist \*/,\n)", r"\1" + rf"\2{ids['privRef']} /* PrivacyInfo.xcprivacy */,\n\2{ids['stringsGroup']} /* InfoPlist.strings */,\n", 1)
    # בשלב המשאבים, ליד LaunchScreen
    sub(r"(\n(\t+)[0-9A-F]{24} /\* LaunchScreen\.storyboard in Resources \*/,\n)", r"\1" + rf"\2{ids['privBuild']} /* PrivacyInfo.xcprivacy in Resources */,\n\2{ids['stringsBuild']} /* InfoPlist.strings in Resources */,\n", 1)
    pb.write_text(x, encoding="utf-8")

    (root / "out").mkdir(exist_ok=True)
    (root / "out" / "ios-version.txt").write_text(version_name, encoding="utf-8")
    print("ios native ready, version", version_name, "build", run)
