#!/usr/bin/env node
/* צילומי המסך של המצגות: present/<he|fr>/screens/*.png
 * Playwright, 390x844, deviceScaleFactor 2, מהיומן לדוגמה ב-22.11.2026 (ו״יש לשאול רב״ מיומן קטן ב-19.4.2026).
 * הרצה:  node present/screens.js he   (או fr)   ואחר כך  node present/<he|fr>/build.js
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..");
const M = require(path.join(ROOT, "src", "core.js"));
const LANG = process.argv[2] || "he";
const OUT = path.join(__dirname, LANG, "screens");
const URL = "file://" + path.join(ROOT, "index.html");
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const open = async (t, ls) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: LANG === "he" ? "he-IL" : "fr-FR", timezoneId: "Asia/Jerusalem" });
    const page = await ctx.newPage();
    page.on("pageerror", e => console.warn("page error:", e.message));
    await page.clock.setFixedTime(new Date(t));
    await page.addInitScript(ls => { if (!sessionStorage.getItem("i")) { sessionStorage.setItem("i", "1"); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); } }, ls);
    await page.goto(URL); await sleep(500);
    await page.addStyleTag({ content: "*{caret-color:transparent!important} .toast,.banner{display:none!important} :focus-visible{outline:none!important;box-shadow:none!important}" });
    return { ctx, page };
  };
  const shot = async (page, name) => { await sleep(500); await page.screenshot({ path: path.join(OUT, name + ".png") }); console.log("ok", LANG, name); };

  // היומן לדוגמה
  const { ctx, page } = await open("2026-11-22T12:57:00+02:00", { "maayan.v1.lang": LANG });
  await page.click('[data-act="start-demo"]'); await sleep(600);
  await page.click('.tabs [data-go="today"]');
  await shot(page, "today");
  await page.click(".fab"); await shot(page, "quick");
  if (LANG === "he") { // טופס הראייה ומסך המועדים מופיעים רק במצגת בעברית
    await page.click('#modal [data-qtype="flow"]'); await sleep(300);
    await page.evaluate(() => { const s = document.querySelector("#modal .sheet"); s.scrollTop = s.querySelector(".wake").offsetTop - 140; });
    await shot(page, "flow-form");
  }
  await page.click('#modal .sheet [data-act="close-modal"]'); await sleep(300);
  await page.click('.tabs [data-go="calendar"]'); await page.click('[data-calmode="hebrew"]'); await shot(page, LANG === "fr" ? "calendar-heb" : "calendar");
  if (LANG === "he") { await page.click('.tabs [data-go="dates"]'); await shot(page, "dates"); }
  await ctx.close();

  // ״המנהג שלי״ בכניסה הראשונה
  {
    const o = await open("2026-11-22T12:57:00+02:00", { "maayan.v1.lang": LANG, "maayan.v1.seen": "1" });
    await o.page.click('#modal [data-family="ashkenaz"]'); await o.page.click('#modal [data-method="ashkenaz"]');
    await shot(o.page, "method"); await o.ctx.close();
  }
  // ״יש לשאול רב״: ראייה בל׳ ניסן, ובאייר אין ל׳
  {
    const s = M.emptyState(); s.settings = M.applyPreset({ ...s.settings, cityId: "jerusalem" }, "ashkenaz");
    s.events = [{ id: M.uuid(), type: "flow", date: "2026-04-17", time: "10:00", cityId: "jerusalem", result: "clear", note: "", authorityNote: "", createdAt: "2026-04-17T08:00:00.000Z" }];
    const o = await open("2026-04-19T12:00:00+03:00", { "maayan.v1.lang": LANG, "maayan.v1.seen": "1", "maayan.v1.backup": JSON.stringify({ remind: "0" }), "maayan.v1.diary": JSON.stringify(s) });
    await o.page.click('.tabs [data-go="journal"]');
    await o.page.evaluate(() => document.querySelectorAll("details.ask").forEach(d => { d.open = true; }));
    await shot(o.page, "ask"); await o.ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
