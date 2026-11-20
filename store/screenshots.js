// מצלם את מעיין (index.html) עם היומן לדוגמה, בגדלים שהחנויות דורשות, אל store/screenshots/
// הרצה מתיקיית המאגר: node store/screenshots.js   (דורש playwright: npm i -D playwright && npx playwright install chromium)
// אפשר להריץ שוב בכל פעם שהעיצוב משתנה.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "screenshots");
const URL = "file://" + path.join(ROOT, "index.html");

// גודל בפיקסלים של המסך האמיתי = viewport × scale
const DEVICES = [
  { dir: "apple-6.9", w: 440, h: 956, scale: 3 },   // 1320×2868 — iPhone 6.9" (חובה)
  { dir: "apple-6.5", w: 414, h: 896, scale: 3 },   // 1242×2688 — iPhone 6.5" (נדרש רק אם אין 6.9")
  { dir: "play-phone", w: 360, h: 640, scale: 3 },  // 1080×1920 — Google Play טלפון (יחס עד 2:1)
];
// המסכים לצילום: לשונית + שם קובץ. אם לשונית לא קיימת אחרי עיצוב מחדש — מדלגים.
const SHOTS = [
  { go: "today", name: "1-today" },
  { go: "calendar", name: "2-calendar" },
  { go: "dates", name: "3-dates" },
  { go: "journal", name: "4-journal" },
  { go: "prefs", name: "5-settings" },
];
const LANGS = (process.argv[2] || "he,en").split(",");
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  for (const lang of LANGS) {
    for (const d of DEVICES) {
      const dir = path.join(OUT, lang, d.dir);
      fs.mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.scale, isMobile: true, hasTouch: true,
        locale: lang === "he" ? "he-IL" : "en-US", timezoneId: "Asia/Jerusalem", colorScheme: "light",
      });
      const page = await ctx.newPage();
      page.on("pageerror", e => console.warn("page error:", e.message));
      await page.goto(URL);
      await page.waitForSelector(".welcome", { timeout: 15000 });
      await page.click(`.welcome [data-lang="${lang}"]`).catch(() => {});
      await sleep(300);
      await page.click('[data-act="start-demo"]');
      // בצילומי החנות לא מציגים את פס "יומן לדוגמה" ולא הודעות קופצות
      await page.addStyleTag({ content: ".banner,.toast{display:none!important} *{caret-color:transparent!important}" });
      await sleep(800);
      for (const s of SHOTS) {
        const tab = await page.$(`.tabs [data-go="${s.go}"]`);
        if (!tab) { console.warn(`skip ${s.name}: no tab "${s.go}"`); continue; }
        await tab.click();
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(700);
        await page.screenshot({ path: path.join(dir, `${s.name}.png`) });
      }
      await ctx.close();
      console.log("ok", lang, d.dir, `${d.w * d.scale}x${d.h * d.scale}`);
    }
  }
  // Google Play: סמל 512×512 וגרפיקה ראשית 1024×500
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  const icon = "data:image/png;base64," + fs.readFileSync(path.join(ROOT, "ios", "assets", "AppIcon-1024.png")).toString("base64");
  const font = f => "data:font/woff2;base64," + fs.readFileSync(path.join(ROOT, "fonts", f)).toString("base64");
  await page.setContent(`<html dir="rtl"><style>
    @font-face{font-family:Rubik;src:url("${font("rubik-hebrew.woff2")}") format("woff2");font-weight:300 900;unicode-range:U+0590-05FF,U+200C-2010,U+FB1D-FB4F}
    @font-face{font-family:Rubik;src:url("${font("rubik-latin.woff2")}") format("woff2");font-weight:300 900;unicode-range:U+0000-00FF,U+2000-206F}
    body{margin:0;width:1024px;height:500px;display:flex;align-items:center;justify-content:center;gap:56px;font-family:Rubik,sans-serif;
      background:radial-gradient(60% 90% at 85% 10%,#fbe9f0,transparent 70%),radial-gradient(60% 90% at 10% 100%,#f1ecff,transparent 70%),#fbf8f9}
    img{width:240px;height:240px;border-radius:56px;box-shadow:0 18px 50px rgb(184 51 106 / .28)}
    h1{font-weight:700;font-size:104px;margin:0;color:#1f1a1e;line-height:1;letter-spacing:-.02em}
    p{margin:16px 0 0;font-size:30px;color:#6b6270;font-weight:400}</style>
    <body><img src="${icon}"><div><h1>מעיין</h1><p>יומן טהרת המשפחה. פרטי, במכשיר שלך.</p></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  fs.mkdirSync(path.join(OUT, "play"), { recursive: true });
  await page.screenshot({ path: path.join(OUT, "play", "feature-graphic-1024x500.png") });
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(`<body style="margin:0"><img src="${icon}" style="width:512px;height:512px;display:block"></body>`);
  await page.screenshot({ path: path.join(OUT, "play", "icon-512.png") });
  await browser.close();
  console.log("done →", OUT);
})().catch(e => { console.error(e); process.exit(1); });
