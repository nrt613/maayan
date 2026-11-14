// בדיקת קצה-לקצה של אפליקציית האנדרואיד על אמולטור: התראות, מיקום, שמירה
const { _android: android } = require("playwright-core");
const fs = require("fs");
const PKG = "io.github.nrt613.maayan";
const results = [];
const log = (...a) => { const line = a.join(" "); console.log(line); fs.appendFileSync("shots/log.txt", line + "\n"); };
const check = (name, ok, detail = "") => { results.push({ name, ok }); log(`E2E ${ok ? "OK  " : "FAIL"} ${name} ${detail}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync("shots", { recursive: true });
  const [device] = await android.devices();
  log("device", device.model(), "android", (await device.shell("getprop ro.build.version.release")).toString().trim());
  const shot = async name => { try { await device.screenshot({ path: `shots/${name}.png` }); } catch (e) { log("screenshot failed", name, e.message); } };
  await device.shell(`am force-stop ${PKG}`);
  await device.shell(`am start -n ${PKG}/.MainActivity`);
  const webview = await device.webView({ pkg: PKG }, { timeout: 90000 });
  const page = await webview.page();
  page.on("pageerror", e => log("PAGE ERROR", e.message));
  page.on("console", m => { if (m.type() === "error" || m.type() === "warning") log("console", m.type(), m.text().slice(0, 300)); });
  await page.waitForSelector("#app .tabs", { state: "attached", timeout: 60000 });
  await sleep(1500);

  const info = await page.evaluate(() => ({ native: !!(window.Capacitor && Capacitor.isNativePlatform()), platform: window.Capacitor && Capacitor.getPlatform(), plugins: ["LocalNotifications", "Geolocation", "Filesystem", "Share", "App"].filter(p => Capacitor.isPluginAvailable(p)), url: location.href, lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, fonts: [...document.fonts].map(f => f.family + ":" + f.status).join(",") }));
  log("info", JSON.stringify(info));
  check("runs as native app", info.native && info.platform === "android");
  check("all plugins available", info.plugins.length === 5, info.plugins.join(","));
  const net = await page.evaluate(() => performance.getEntriesByType("resource").map(r => r.name).filter(u => !u.startsWith("https://localhost")));
  check("no network requests", net.length === 0, JSON.stringify(net));

  await page.waitForSelector(".welcome", { timeout: 15000 });
  await page.click('.welcome [data-lang="he"]');
  await sleep(500); await shot("1-welcome");
  await page.click('.sheet [data-act="terms"]'); await sleep(400); await shot("2-terms");
  check("terms screen", (await page.$$(".terms h4")).length === 7);
  await page.click('[data-act="terms-back"]');
  await page.click('[data-act="start-personal"]');

  // הזנת מחזור מלפני שלושה ימים: אמורה להיווצר תזכורת להפסק ועונות פרישה
  const flow = await page.evaluate(() => { const d = new Date(Date.now() - 3 * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  await page.click('.tabs [data-go="journal"]');
  await page.click('main [data-act="cycle"]');
  await page.fill("#c-flow", flow);
  await page.click('#cycle-form button[type=submit]');
  await sleep(800);
  await page.click('#cycle-form [data-act="close-modal"]');
  await sleep(2500);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("maayan.v1.diary") || "{}").events?.length || 0);
  check("entry saved on device", stored === 1, `events=${stored}`);
  const pending = await page.evaluate(async () => { const r = await Capacitor.Plugins.LocalNotifications.getPending(); return r.notifications.map(n => ({ id: n.id, title: n.title, at: n.schedule && n.schedule.at })); });
  log("pending", JSON.stringify(pending).slice(0, 600));
  check("notifications scheduled", pending.length >= 3, `count=${pending.length}`);
  check("notification text is discreet", pending.every(n => n.title === "תזכורת אישית"), pending[0] && pending[0].title);
  const perm = await page.evaluate(async () => ({ p: await Capacitor.Plugins.LocalNotifications.checkPermissions(), e: await Capacitor.Plugins.LocalNotifications.checkExactNotificationSetting().catch(x => String(x)) }));
  log("permissions", JSON.stringify(perm));
  await page.click('.tabs [data-go="dates"]'); await sleep(800); await shot("3-dates");
  const card = await page.evaluate(() => [...document.querySelectorAll("main .card")].map(c => c.textContent.replace(/\s+/g, " ")).filter(t => t.includes("מתוזמנות")).join(" | "));
  check("dates screen shows scheduled count", /מתוזמנות כרגע: \d+/.test(card), card.slice(0, 160));
  const alarms = (await device.shell(`dumpsys alarm | grep -c ${PKG}`)).toString().trim();
  check("system alarms registered", Number(alarms) > 0, `lines=${alarms}`);

  // התראה אמיתית: מתזמנים ל-7 שניות קדימה ובודקים שהיא מופיעה כשהאפליקציה ברקע
  await page.evaluate(async () => { await Capacitor.Plugins.LocalNotifications.schedule({ notifications: [{ id: 424242, channelId: "maayan", title: "תזכורת אישית", body: "פרטים ביומן האישי", schedule: { at: new Date(Date.now() + 7000), allowWhileIdle: true } }] }); });
  await device.shell("input keyevent KEYCODE_HOME");
  await sleep(16000);
  const shown = (await device.shell("dumpsys notification --noredact")).toString();
  const mine = shown.split("NotificationRecord").filter(x => x.includes(PKG));
  check("notification delivered while app in background", mine.length > 0, `records=${mine.length}`);
  await device.shell("cmd statusbar expand-notifications"); await sleep(1500); await shot("4-notification");
  await device.shell("cmd statusbar collapse"); await sleep(500);
  await device.shell(`am start -n ${PKG}/.MainActivity`); await sleep(2000);

  // זיהוי מיקום (האמולטור מוגדר לנתניה)
  await page.click('.tabs [data-go="prefs"]');
  await page.click('[data-act="locate"]');
  let place = null;
  try {
    await page.waitForSelector("#place-form", { timeout: 45000 });
    await sleep(300); await shot("5-location");
    place = await page.evaluate(() => document.querySelector('#place-form [dir="ltr"]').textContent);
    await page.click('#place-form button[type=submit]'); await sleep(800);
  } catch (e) { log("location failed:", e.message.split("\n")[0], "| toast:", await page.evaluate(() => document.querySelector(".toast")?.textContent || "")); await shot("5-location-failed"); }
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("maayan.v1.diary")));
  const pl = (st.places || [])[0];
  check("location detected", !!pl && Math.abs(pl.lat - 32.3215) < 0.05 && Math.abs(pl.lon - 34.8532) < 0.05, place || "");
  check("detected place is the default", !!pl && st.settings.cityId === pl.id);
  await page.click('.tabs [data-go="today"]'); await sleep(800); await shot("6-today");
  await page.click('.tabs [data-go="calendar"]'); await sleep(600); await shot("7-calendar");

  // שמירה אחרי סגירה מלאה של האפליקציה
  await device.shell(`am force-stop ${PKG}`); await sleep(1000);
  await device.shell(`am start -n ${PKG}/.MainActivity`);
  const page2 = await (await device.webView({ pkg: PKG }, { timeout: 60000 })).page();
  await page2.waitForSelector("#app .tabs", { state: "attached", timeout: 60000 }); await sleep(1500);
  const again = await page2.evaluate(async () => ({ events: JSON.parse(localStorage.getItem("maayan.v1.diary")).events.length, welcome: !!document.querySelector(".welcome"), pending: (await Capacitor.Plugins.LocalNotifications.getPending()).notifications.length, lang: document.documentElement.lang }));
  check("diary survives app restart", again.events === 1 && !again.welcome && again.lang === "he", JSON.stringify(again));
  check("notifications still scheduled after restart", again.pending >= 3, `count=${again.pending}`);
  await shot("8-after-restart");

  const failed = results.filter(r => !r.ok);
  log(`E2E SUMMARY ${results.length - failed.length}/${results.length} passed`);
  await device.close();
  process.exit(failed.length ? 1 : 0);
})().catch(e => { log("E2E CRASH", e.stack || e.message); process.exit(2); });
