// בדיקת קצה-לקצה לווידג'ט מסך הבית (רץ אחרי test.js, על היומן שהוא יצר): הספק רשום במערכת,
// כבוי כברירת מחדל, ההפעלה בהגדרות כותבת סיכום דיסקרטי ל-SharedPreferences, והנוסח המלא מתחלף.
const { _android: android } = require("playwright-core");
const fs = require("fs");
const PKG = "io.github.nrt613.maayan";
const results = [];
const log = (...a) => { const line = a.join(" "); console.log(line); fs.appendFileSync("shots/log.txt", line + "\n"); };
const check = (name, ok, detail = "") => { results.push({ name, ok }); log(`E2E ${ok ? "OK  " : "FAIL"} widget: ${name} ${detail}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HALACHIC = /נקיים|טבילה|הפסק|עונה|עונת|וסת|בדיק|פריש|נידה|זרוע|הפלגה/;

(async () => {
  const [device] = await android.devices();
  const providers = (await device.shell("dumpsys appwidget")).toString();
  check("provider registered", providers.includes(`${PKG}/.MaayanWidgetProvider`) || providers.includes(`${PKG}/${PKG}.MaayanWidgetProvider`));
  await device.shell(`am start -n ${PKG}/.MainActivity`);
  const page = await (await device.webView({ pkg: PKG }, { timeout: 60000 })).page();
  await page.waitForSelector("#app .tabs", { state: "attached", timeout: 60000 }); await sleep(1500);
  const data = () => page.evaluate(async () => { const r = await Capacitor.Plugins.MaayanWidget.getData(); return r.json ? JSON.parse(r.json) : null; });
  check("plugin available", await page.evaluate(() => Capacitor.isPluginAvailable("MaayanWidget")));
  // עדכון נכתב גם בלי שינוי (בדיקה כל דקה / ביציאה); מוודאים שיש מצב התחלתי
  await page.evaluate(() => window.MaayanWidget && MaayanWidget.update());
  await sleep(1000);
  const off = await data();
  check("off by default", !off || off.enabled === false, JSON.stringify(off).slice(0, 200));
  await page.click('.tabs [data-go="prefs"]'); await sleep(800);
  const box = await page.$("#s-widgetEnabled");
  check("setting shown on Android", !!box);
  if (box) {
    await page.evaluate(() => document.querySelector("#s-widgetEnabled").closest("section").scrollIntoView());
    await page.click('label[for="s-widgetEnabled"]'); await sleep(2000);
    try { await device.screenshot({ path: "shots/10-widget-setting.png" }); } catch { /* */ }
    const on = await data();
    log("widget discreet", JSON.stringify(on && on.entries.slice(0, 3)));
    check("enabled writes a discreet summary", !!on && on.enabled && on.style === "discreet" && on.entries.length > 0 && on.dir === "rtl", on ? `entries=${on.entries.length}` : "");
    check("discreet text has no halachic words", !!on && on.entries.every(e => !HALACHIC.test(e.head + e.now + e.next)));
    await page.selectOption("#s-widgetStyle", "full"); await sleep(2000);
    const full = await data();
    log("widget full", JSON.stringify(full && full.entries.slice(0, 3)));
    check("full style written", !!full && full.style === "full" && full.entries.length > 0);
    const now = Date.now(), cur = full && full.entries.find(e => e.from <= now + 5000 && now < e.until);
    check("a line is valid now", !!cur, cur ? `${cur.head} | ${cur.now} | ${cur.next}` : "");
    const prefs = (await device.shell(`run-as ${PKG} cat shared_prefs/maayan_widget.xml`)).toString();
    check("stored in SharedPreferences", prefs.includes("summary"), `bytes=${prefs.length}`);
  }
  await device.shell("input keyevent KEYCODE_HOME"); await sleep(1500);
  const crash = (await device.shell("logcat -d -b crash")).toString();
  check("no crash", !crash.includes(PKG), crash.slice(0, 300));
  const failed = results.filter(r => !r.ok);
  log(`E2E WIDGET SUMMARY ${results.length - failed.length}/${results.length} passed`);
  await device.close();
  process.exit(failed.length ? 1 : 0);
})().catch(e => { log("E2E WIDGET CRASH", e.stack || e.message); process.exit(2); });
