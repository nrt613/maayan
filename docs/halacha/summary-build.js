#!/usr/bin/env node
/* מעיין — סיכום לרב.
 * מסמך קצר: איך מחושבת כל וסת, השיטות במבט אחד, כל שיטה במצבים רגילים (לוחות עבריים קטנים), ושאלות לכל שיטה.
 * ארבע שיטות: הרב עובדיה יוסף, בן איש חי, אשכנזי – עיקר הדין, אשכנזי – כרתי ופלתי. דיני הוסתות בלבד (בלי זמני היום).
 * כל לוח וכל תאריך מחושבים במנוע (src/core.js); הלוחות והסימנים מ-questions-build.js. תאריכים עבריים בלבד.
 *
 * הרצה:  node docs/halacha/summary-build.js            (HTML ו-PDF)
 *        node docs/halacha/summary-build.js --no-pdf   (HTML בלבד)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const M = require(path.join(ROOT, "src", "core.js"));
const Q = require("./questions-build.js");
const OUT_HTML = path.join(__dirname, "summary.html");
const OUT_PDF = path.join(__dirname, "summary.pdf");
const warnings = [];
const expect = (cond, msg) => { if (!cond) warnings.push(msg); };
M.setLang("he");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const Y = 5787, NISAN = 1, IYYAR = 2, SIVAN = 3, CHESHVAN = 8, KISLEV = 9, TEVET = 10;
const N = (d, m, y = Y) => M.toISO(new M.HDate(d, m, y).greg());
const A = (d, m, y = Y) => new M.HDate(d, m, y).abs();
const hs = Q.hs;
const hd = abs => M.gematriya(new M.HDate(abs).getDate());
let idCounter = 0;
const ev = (type, date, time, extra = {}) => ({ id: `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`, type, date, time, cityId: "jerusalem", result: "clear", note: "", authorityNote: "", createdAt: "2026-01-01T00:00:00Z", ...extra });

/* ---------- השיטות ---------- */
const METHODS = ["sefard", "sefard-bic", "ashkenaz", "ashkenaz-kreiti"];
const NAME = { sefard: "הרב עובדיה יוסף", "sefard-bic": "בן איש חי", ashkenaz: "אשכנזי – עיקר הדין", "ashkenaz-kreiti": "אשכנזי – כרתי ופלתי" };
const FAM = { sefard: "ספרדי", "sefard-bic": "ספרדי", ashkenaz: "אשכנזי", "ashkenaz-kreiti": "אשכנזי" };
/** מריץ את כל השיטות על אותו תרחיש, עם אותם מזהים */
function runAll(evsFn, nowDate, idBase) {
  const out = {};
  for (const pk of METHODS) { idCounter = idBase; out[pk] = Q.run(pk, evsFn(), nowDate); }
  return out;
}

/* ---------- מקורות: רק מקום בטקסט הראשוני; משני מסומן ---------- */
const SHORT_SRC = t => {
  if (/^סיכום הלכות נידה/.test(t)) { const m = /— ([^:]+):/.exec(t); return `${m ? m[1] : "סיכום"} (משני)`; }
  if (/מקור ראשוני לא אותר/.test(t)) return "מקור לא אותר";
  return t.split(" — ")[0]
    .replace("שולחן ערוך הרב יורה דעה", "שו״ע הרב").replace("שולחן ערוך יורה דעה", "שו״ע יו״ד").replace("יורה דעה ", "")
    .replace("בן איש חי, שנה שנייה, פרשת צו, אות", "בא״ח צו").replace(", מקום מדויק לא אומת", "").replace(" (חלק לא צוין)", "")
    .replace(/ \(הרב עובדיה יוסף\).*$/, "").replace(", ארבעה ימים מתחילת הראייה", "");
};
const srcs = (ids, n = 2) => [...new Set((ids || []).map(id => M.cite(id)).filter(Boolean).map(c => SHORT_SRC(c.t)))].slice(0, n).join("; ");

/* ---------- 1. שער ---------- */
function cover(commit, today) {
  return `<header class="cover">
  <div class="brand"><span class="logo">מ</span><div><h1>מעיין — סיכום לרב</h1><div class="meta">גרסת מנוע <b dir="ltr">${esc(M.ENGINE_VERSION)}</b> · git <b dir="ltr">${esc(commit)}</b> · <b>${esc(today)}</b></div></div></div>
  <p class="lead">מעיין היא אפליקציה פרטית ליומן טהרת המשפחה. המשתמשת רושמת ראיות, הפסק, בדיקות וטבילה, והאפליקציה מחשבת את עונות הפרישה, ימי ההמתנה ושבעה נקיים לפי השיטה שבחרה. השיטה נבחרת בשני שלבים: <b>מה המנהג</b> (ספרדי או אשכנזי), ו<b>לפי מי</b> — ${METHODS.map(pk => `«${NAME[pk]}»`).join(", ")}. כל הגדרה אפשר לשנות לפי הוראת הרב.</p>
  <p class="lead"><b>המבוקש מהרב:</b> לעבור על אופן החישוב (עמוד 2) ועל טבלת השיטות (עמוד 3), לבדוק בלוחות שהתוצאה בכל שיטה נכונה, ולסמן תשובה לשאלות שבסוף. ⚠ מסמן ערך שהאפליקציה עצמה מסמנת ״לברר עם רב״. כל לוח חושב במנוע עצמו. המקורות הם מקום בטקסט הראשוני; מקור משני מסומן «(משני)».</p>
  ${Q.legend()}
  </header>`;
}

/* ---------- 2. איך מחושבת כל וסת ---------- */
/** פס ימים עבריים בשורה אחת: קטעים של ימים, עם "…" ביניהם, והסימנים שהמנוע הפיק */
function strip(segments, anchor, marks, kinds) {
  const cells = [];
  segments.forEach(([from, to], i) => {
    if (i) cells.push(`<td class="gap">…</td>`);
    for (let a = from; a <= to; a++) {
      const h = new M.HDate(a), d = h.getDate(), first = a === from || d === 1;
      const half = onah => { const ms = [...new Set(marks.filter(m => m.abs === a && m.onah === onah && kinds.includes(m.kind)).map(m => m.kind))]; return `<span class="h">${ms.length ? Q.glyph(onah) + ms.map(k => Q.shape(k, { size: 12 })).join("") : ""}</span>`; };
      cells.push(`<td><div class="t"><b>${hd(a)}</b>${first ? ` <i>${esc(h.monthName())}</i>` : ""}${a >= anchor ? `<span class="c">${a - anchor + 1}</span>` : ""}</div><div class="mk2">${half("night")}${half("day")}</div></td>`);
    }
  });
  return `<table class="strip"><tr>${cells.join("")}</tr></table>`;
}
function howTo() {
  const P = M.METHOD_PRESETS;
  // עונה בינונית: ראייה בא׳ ניסן ביום
  idCounter = 10; const avg = Q.run("ashkenaz", [ev("flow", N(1, NISAN), "10:00")], N(3, NISAN)), s1 = A(1, NISAN);
  const d30 = s1 + 29, d31 = s1 + 30;
  expect(avg.has("avg", d30, "day") && avg.has("avg", d31, "day"), "סיכום: עונה בינונית אינה בימים 30 ו-31");
  // עונת החודש: ה׳ ניסן → ה׳ אייר
  idCounter = 20; const mon = Q.run("sefard", [ev("flow", N(5, NISAN), "10:00")], N(7, NISAN)), s5 = A(5, NISAN), m5 = A(5, IYYAR);
  expect(mon.has("mon", m5, "day"), "סיכום: עונת החודש אינה בה׳ אייר");
  // ל׳ בחודש לפני חודש חסר
  idCounter = 30; const m30 = Q.run("sefard", [ev("flow", N(30, NISAN), "10:00")], N(3, IYYAR)), s30 = A(30, NISAN);
  const mon30 = m30.marks.find(m => m.kind === "mon");
  expect(mon30 && mon30.abs === A(1, SIVAN), "סיכום: ל׳ ניסן אינו מוביל לא׳ סיון");
  // הפלגה: א׳ ניסן, כ״ו ניסן → 26 ימים
  idCounter = 40; const hf = Q.run("sefard", [ev("flow", N(1, NISAN), "10:00"), ev("flow", N(26, NISAN), "10:00")], N(28, NISAN)), s26 = A(26, NISAN);
  const int = hf.marks.find(m => m.kind === "int");
  expect(int && int.abs === s26 + 25, "סיכום: ההפלגה אינה 26 יום");
  // אור זרוע: בן איש חי, ה׳ ניסן ביום
  idCounter = 50; const oz = Q.run("sefard-bic", [ev("flow", N(5, NISAN), "10:00")], N(7, NISAN));
  expect(oz.has("oz", m5, "night"), "סיכום: אור זרוע אינו בליל ה׳ אייר");
  // מעת לעת: כרתי ופלתי
  idCounter = 60; const kr = Q.run("ashkenaz-kreiti", [ev("flow", N(1, NISAN), "10:00")], N(3, NISAN));
  expect(kr.has("avg", d30, "night") && kr.has("avg", d30, "day") && kr.has("avg", d31, "night") && kr.has("avg", d31, "day"), "סיכום: כרתי ופלתי אינו יממה שלמה");
  // המתנה: ראייה ביום ראשון
  const wait = {}; for (const pk of ["sefard", "ashkenaz"]) { idCounter = 70; wait[pk] = Q.run(pk, [ev("flow", N(12, KISLEV), "10:00")], N(13, KISLEV)).hef; }
  const k12 = A(12, KISLEV);
  expect(wait.ashkenaz === k12 + 4 && wait.sefard === k12 + 3, "סיכום: ימי ההמתנה אינם 5/4");
  const item = (t, txt, src, fig = "") => `<div class="how"><h4>${t}</h4><p>${txt}</p>${src ? `<p class="hsrc">${esc(src)}</p>` : ""}${fig}</div>`;
  return `<section class="page" id="how"><h2>איך מחושבת כל וסת</h2>
  <div class="hows">
  ${item("עונת הראייה", `כל ראייה שייכת לעונה: <b>עונת יום</b> מהזריחה עד השקיעה, <b>עונת לילה</b> מהשקיעה עד הזריחה. כל החששות נקבעים באותה עונה. מצאה דם בקימה — לפי השעה שנרשמה (לפני הזריחה: עונת לילה). יום הראייה הוא יום 1 בכל הספירות.`, "שו״ע יו״ד קפד, ב; קפד, ד")}
  ${item("עונה בינונית — יום 30 (ויום 31)", `היום ה-30 לראייה, בספירה כוללנית. <b>עונה אחת</b> (עונת הראייה) בשיטות הספרדיות ובעיקר הדין; <b>יממה שלמה</b>, מהשקיעה ועד השקיעה, בכרתי ופלתי. יום 31 נוסף בשתי השיטות האשכנזיות.`, `שו״ע יו״ד קפט, א; שו״ע הרב קפט, ס״ק א (״מתחלת הלילה... עד סוף היום״, בשם כרתי ופלתי); חוות דעת קפט`,
    strip([[s1, s1 + 1], [d30 - 1, d31]], s1, avg.marks, ["see", "avg"]) + `<div class="cap">עיקר הדין: ראייה בא׳ ניסן ביום ← ${hs(d30)} ו${hs(d31)}, ביום בלבד. בכרתי ופלתי — גם הלילות.</div>`)}
  ${item("עונת החודש (ול׳ בחודש)", `אותו יום בחודש העברי הבא, באותה עונה. ראתה בל׳ והחודש הבא חסר — חוששת לא׳ בחודש שאחריו. עונת חודש של ראייה קודמת שעוד לא הגיעה נשמרת.`, "שו״ע יו״ד קפט, ב; קפט, יג (רמ״א)",
    strip([[s5, s5], [m5 - 1, m5 + 1]], s5, mon.marks, ["see", "mon"]) + `<div class="cap">ה׳ ניסן ← ה׳ אייר. ל׳ ניסן (אייר חסר) ← ${hs(mon30.abs)}.</div>`)}
  ${item("הפלגה", `המרווח בין שתי הראיות האחרונות (ספירה כוללנית), נספר שוב מהראייה האחרונה, באותה עונה. הפלגה ארוכה שקדמה לה ראייה: <b>נעקרת מיד</b> בשיטות הספרדיות ובעיקר הדין (ב״ח, ש״ך); <b>נשמרת</b> בכרתי ופלתי (רמ״א, ט״ז).`, "שו״ע יו״ד קפט, ב; קפט, יג (רמ״א); ש״ך קפט, ס״ק לא",
    strip([[A(1, NISAN), A(1, NISAN)], [s26, s26], [int.abs - 1, int.abs + 1]], s26, hf.marks, ["see", "int"]) + `<div class="cap">א׳ ניסן, כ״ו ניסן — הפלגה 26; נספרת שוב מכ״ו ניסן (יום 1) ← ${hs(int.abs)} (יום 26).</div>`)}
  ${item("אור זרוע", `העונה שלפני עונת החשש (לפני עונת יום — הלילה שלפניה), לפני יום 30, עונת החודש וההפלגה; לא לפני יום 31. בבן איש חי ובשתי השיטות האשכנזיות; לא בשיטת הרב עובדיה.`, "ש״ך קפד, ס״ק ז; ט״ז קפד, ס״ק ב (חולק); בא״ח שנה ב, צו, א",
    strip([[m5 - 2, m5 + 1]], s5, oz.marks, ["avg", "mon", "oz"]) + `<div class="cap">בן איש חי, ראייה בה׳ ניסן ביום: עונה בינונית ב${hs(s5 + 29)} ← אור זרוע בליל ${hs(s5 + 29)}; עונת החודש בה׳ אייר ← אור זרוע בליל ה׳ אייר.</div>`)}
  ${item("וסת קבוע", `אינו נקבע אוטומטית. שלוש ראיות באותו יום בחודש, או שלוש הפלגות שוות, מסומנות ״לברר״, והחששות הרגילים נשארים.`, "שו״ע יו״ד קפט, ב; קפט, ו; קפט, יג")}
  ${item("ימי ההמתנה לפני ההפסק", `<b>חמישה ימים</b> באשכנזי (יום הראייה הוא יום 1, ההפסק ביום החמישי); <b>ארבעה ימים מהראייה</b> בשיטות הספרדיות. ראייה ביום ${hs(k12)}: הפסק מוקדם — אשכנזי ${hs(wait.ashkenaz)}, ספרדי ${hs(wait.sefard)}. אחרי ההפסק שבעה נקיים, בדיקה בבוקר ובערב.`, "רמ״א יו״ד קצו, יא; שו״ע יו״ד קצו, יא; קצו, ד")}
  </div></section>`;
}

/* ---------- 3. השיטות במבט אחד ---------- */
const VAL = {
  wait: { five: "5 ימים", four: "4 ימים מהראייה", "four-from-relations": "4 ימים מהיחסים" },
  beinonit: { same: "עונה אחת", both: "יממה שלמה" },
  day31: { true: "כן", false: "לא" }, orZarua: { true: "כן", false: "לא" },
  carryLongIntervals: { true: "נשמרת", false: "נעקרת מיד" },
  missingMonthly: { "first-next-month": "א׳ בחודש שאחריו", skip: "דילוג" },
  haflagah: { days: "בימים, מראייה לראייה", "chabad-onot": "בעונות" },
};
const ROWS = [["wait", "ימי המתנה לפני ההפסק"], ["beinonit", "עונה בינונית ביום 30"], ["day31", "גם יום 31"], ["orZarua", "אור זרוע"], ["haflagah", "הפלגה"], ["carryLongIntervals", "הפלגה ארוכה שקדמה לה ראייה"], ["missingMonthly", "ראתה בל׳, החודש הבא חסר"]];
function methodsTable() {
  const P = M.METHOD_PRESETS;
  const head = `<tr><th></th>${METHODS.map(pk => `<th><small>${FAM[pk]}</small><br>${esc(NAME[pk].replace("אשכנזי – ", ""))}</th>`).join("")}</tr>`;
  const body = ROWS.map(([k, t]) => {
    const vals = METHODS.map(pk => P[pk].settings[k]), same = vals.every(v => v === vals[0]);
    return `<tr${same ? ' class="same"' : ""}><th>${esc(t)}</th>${METHODS.map(pk => {
      const v = P[pk].settings[k], n = P[pk].notes.find(x => x.k === k);
      return `<td><b>${esc(VAL[k][String(v)])}</b>${n && n.ask ? ` <span class="warn" title="לברר עם רב">⚠</span>` : ""}<small>${esc(srcs(n ? n.src : []))}</small></td>`;
    }).join("")}</tr>`;
  }).join("");
  // שורת הסבר לכל שיטה — דיני הוסתות בלבד
  const LINE = { sefard: "בלי אור זרוע ובלי יום 31; ארבעה ימים לפני ההפסק.", "sefard-bic": "כמו שיטת הרב עובדיה, ובנוסף אור זרוע לפני כל עונת חשש.", ashkenaz: P.ashkenaz.line, "ashkenaz-kreiti": P["ashkenaz-kreiti"].line };
  const lines = METHODS.map(pk => `<li><b>${esc(NAME[pk])}:</b> ${esc(LINE[pk])} <span class="hsrc">(${esc(P[pk].source)})</span></li>`).join("");
  return `<section class="page" id="table"><h2>השיטות במבט אחד</h2>
  <table class="mt"><thead>${head}</thead><tbody>${body}</tbody></table>
  <ul class="lines">${lines}</ul>
  <p class="fine">⚠ — ערך שהאפליקציה מסמנת ״לברר עם רב״. שורה אפורה — זהה בכל השיטות. בכל השיטות ההפלגה נספרת בימים ועונת החודש באותו יום בחודש.</p></section>`;
}

/* ---------- 4. כל שיטה בכל מצב ---------- */
const ABBR = { avg: "ע״ב", mon: "חודש", int: "הפלגה", oz: "או״ז", hef: "הפסק", mik: "טבילה" };
/** שורת תאריכים מתחת ללוח: «ע״ב: ל׳; חודש: א׳ סיון; או״ז: ליל ל׳» */
function caption(marks, kinds, from, to) {
  const by = {};
  for (const m of marks.filter(m => kinds.includes(m.kind) && m.kind !== "see" && m.abs >= from && m.abs <= to && !m.alt)) {
    const t = m.kind === "mik" ? `מוצאי ${hs(m.abs - 1)}` : `${m.onah === "night" ? "ליל " : ""}${hs(m.abs)}`;
    (by[m.kind] ||= []).includes(t) || by[m.kind].push(t);
  }
  return Object.entries(by).sort((a, b) => kinds.indexOf(a[0]) - kinds.indexOf(b[0])).map(([k, l]) => `<b>${ABBR[k]}:</b> ${esc(l.join(", "))}`).join("; ") || "אין";
}
function situation(title, desc, R, o, per = {}) {
  const grids = METHODS.map(pk => {
    const opt = { ...o, ...(per[pk] || {}) };
    return `<div class="sg">${Q.grid({ ...opt, label: NAME[pk].replace("אשכנזי – ", ""), marks: R[pk].marks })}<div class="cap2">${caption(R[pk].marks, opt.kinds, opt.from, opt.to)}</div></div>`;
  }).join("");
  return `<div class="sit"><h3>${title}</h3><p class="sd">${desc}</p><div class="sgs">${grids}</div></div>`;
}
function situations() {
  const out = [];
  const K = ["see", "avg", "mon", "int", "oz"];
  // א. ראייה ביום, בחודש מלא
  {
    const R = runAll(() => [ev("flow", N(5, NISAN), "10:00")], N(7, NISAN), 100), see = A(5, NISAN);
    out.push(situation("א. ראייה ביום, בחודש מלא", `ראייה ב${hs(see)} ביום (ניסן מלא). המספר הקטן: היום מהראייה.`, R, { from: see + 26, to: see + 31, anchor: see, kinds: K }));
  }
  // ב. ראייה בלילה
  {
    const R = runAll(() => [ev("flow", N(5, NISAN), "21:00")], N(7, NISAN), 200), see = R.sefard.flows[0].abs;
    expect(R.sefard.flows[0].onah === "night", "סיכום ב: הראייה אינה בלילה");
    out.push(situation("ב. ראייה בלילה", `ראייה בליל ${hs(see)}. כל החששות בעונת הלילה; אור זרוע — ביום שלפניו.`, R, { from: see + 26, to: see + 31, anchor: see, kinds: K }));
  }
  // ג. ל׳ בחודש לפני חודש חסר
  {
    const R = runAll(() => [ev("flow", N(30, NISAN), "10:00")], N(2, IYYAR), 300), see = A(30, NISAN);
    out.push(situation("ג. ראייה בל׳ ניסן, ואייר חסר", `אין ל׳ באייר: עונת החודש בא׳ סיון. העונה הבינונית חלה ממילא בכ״ט אייר.`, R, { from: see + 27, to: A(2, SIVAN), anchor: see, kinds: K }));
  }
  // ד. הפלגה ארוכה שקדמה לה ראייה
  {
    const R = runAll(() => [ev("flow", N(3, CHESHVAN), "10:00"), ev("flow", N(7, KISLEV), "10:00"), ev("flow", N(28, KISLEV), "10:00")], N(3, TEVET), 400), see = A(28, KISLEV);
    expect(R["ashkenaz-kreiti"].marks.some(m => m.kind === "int" && m.abs === see + 34) && !R.ashkenaz.marks.some(m => m.kind === "int" && m.abs === see + 34), "סיכום ד: שימור ההפלגה אינו כצפוי");
    out.push(situation("ד. הפלגה ארוכה (35) ואחריה קצרה (22)", `ראיות ב${hs(A(3, CHESHVAN))}, ${hs(A(7, KISLEV))} ו${hs(see)}. רק כרתי ופלתי שומרת גם את הפלגת 35.`, R, { from: see + 20, to: see + 35, anchor: see, kinds: ["see", "int"] }));
  }
  // ה. מחזור מלא: ראייה, הפסק מוקדם, שבעה נקיים וליל טבילה
  {
    const see = A(12, KISLEV), R = {};
    for (const pk of METHODS) {
      idCounter = 500; const r0 = Q.run(pk, [ev("flow", N(12, KISLEV), "10:00")], N(13, KISLEV));
      idCounter = 500; const r = Q.run(pk, [ev("flow", N(12, KISLEV), "10:00"), ev("hefsek", M.fromAbs(r0.hef), "14:00")], M.fromAbs(r0.hef + 1));
      if (!r.has("hef", r0.hef)) r.marks.push({ kind: "hef", abs: r0.hef, onah: "day", title: "הפסק" });
      R[pk] = r;
    }
    const to = Math.max(...METHODS.map(pk => R[pk].marks.find(m => m.kind === "mik")?.abs || see)) + 1;
    out.push(situation("ה. מחזור שלם: ראייה, הפסק, שבעה נקיים, ליל טבילה", `ראייה ב${hs(see)} ביום, והפסק ביום המוקדם ביותר. ורוד — ימי נידה עד ההפסק; סגול — שבעה נקיים.`, R,
      { from: see, to, anchor: see, kinds: ["see", "hef", "mik"] }, Object.fromEntries(METHODS.map(pk => [pk, { tint: Q.tints(see, R[pk].hef) }]))));
  }
  return `<section id="sits"><h2>כל שיטה בכל מצב</h2>${out.join("")}</section>`;
}

/* ---------- 5. שאלות לכל שיטה ---------- */
const QS = [
  ["שאלות כלליות (לכל השיטות)", [
    ["ראתה בל׳, והחודש הבא חסר: לחוש לא׳ בחודש שאחריו?", "חוששת לא׳ בחודש שאחריו, באותה עונה."],
    ["ראתה בל׳, והחודש הבא מלא: לחוש גם לא׳ (היום השני דראש חודש)?", "רק לל׳."],
    ["מקרה הרמ״א (א׳ ניסן, כ׳ ניסן, א׳ אייר): לחוש לט׳ אייר?", "אינה חוששת לט׳ אייר; הפלגות רק מהראייה האחרונה."],
    ["מצאה דם בקימה ואין ידוע מתי התחיל: לאיזו עונה?", "לפי השעה שנרשמה: לפני הזריחה — עונת לילה. אין אפשרות ״לא ידוע״."],
    ["עונת חודש של ראייה קודמת שחלה בימי הנידה של ראייה חדשה: לשמור?", "נשמרת (״עונת חודש נוספת״)."],
    ["ראייה בתוך שבעה נקיים: המתנה מלאה ועונות חדשות?", "״ראייה״ מחייבת המתנה מלאה ויוצרת עונות; ״חידוש ספירה לפי הוראה״ — לא."],
    ["אור זרוע לפני יום 31?", "אינו נוסף לפני יום 31 (מקור לא אותר)."],
    ["וסת קבוע: להשאיר לבירור אישי?", "אינו נקבע אוטומטית; דפוס של שלוש פעמים מסומן ״לברר״."],
    ["משתמשת שלא בחרה שיטה: לחייב בחירה?", "מקבלת ״התאמה אישית״: 5 ימים, בלי יום 31, בלי אור זרוע, בלי שימור הפלגות."],
  ]],
  ["הרב עובדיה יוסף", [
    ["ארבעה ימים מתחילת הראייה, או 72 שעות מהתשמיש (טהרת הבית)?", "ארבעה ימים מהראייה, בלי לשאול על יחסים. ״ממועד היחסים״ קיים כהגדרה."],
    ["בלי אור זרוע, בלי יום 31, הפלגה ארוכה נעקרת מיד — האם זו שיטת הרב עובדיה?", "כך בשיטה (טהרת הבית — לא נבדק מול לשון הספר)."],
  ]],
  ["בן איש חי", [
    ["הפסק ביום השישי לראייה (צו, ז; י) — להחיל בשיטה זו?", "לא הוחל: ארבעה ימים, כמו בשיטת הרב עובדיה. מסומן ⚠."],
    ["האם השיטה שונה מהרב עובדיה במשהו מלבד אור זרוע?", "ההבדל היחיד בהגדרות הוא אור זרוע (״אך צריך לחוש לדעה זו השניה״, צו, א)."],
  ]],
  ["אשכנזי – עיקר הדין", [
    ["לכלול את אור זרוע (ש״ך בשם הב״ח) או לא (ט״ז)?", "כלול, ומסומן ⚠."],
    ["יום 31 בעונת הראייה בלבד — כמנהג הרווח?", "ימים 30 ו-31, עונה אחת בכל אחד."],
    ["הפלגה ארוכה שקדמה לה ראייה נעקרת מיד (ב״ח, ש״ך) — ולא כרמ״א קפט, יג?", "נעקרת מיד."],
  ]],
  ["אשכנזי – כרתי ופלתי", [
    ["שימור הפלגה ארוכה (רמ״א, ט״ז): עד מתי?", "נשמרת כל עוד כל ההפלגות שאחריה קצרות ממנה, בלי הגבלת זמן."],
    ["אור זרוע לפני עונת הלילה של יום 30 — כלומר ביום 29 — גם כשהראייה הייתה ביום?", "מוסיף אור זרוע ביום 29 ביום. מסומן ⚠."],
    ["יממה שלמה מהשקיעה עד השקיעה (״מתחלת הלילה עד סוף היום״), ולא מעת לעת מרגע הראייה?", "מהשקיעה שלפני יום 30 עד השקיעה שלו, וכן ביום 31."],
  ]],
];
function questions() {
  let n = 0;
  const box = `<span class="ans">☐ כן ☐ לא ☐ אחר: <span class="ln"></span></span>`;
  return `<section id="qs"><h2>שאלות לכל שיטה</h2>${QS.map(([t, list]) => `<div class="qg"><h3>${esc(t)}</h3><ol start="${n + 1}">${list.map(([q, d]) => { n++; return `<li><b>${esc(q)}</b><div class="qd"><span class="lbl">מה מעיין עושה:</span> ${esc(d)}</div>${box}</li>`; }).join("")}</ol></div>`).join("")}</section>`;
}

/* ---------- עיצוב ---------- */
const CSS = Q.CSS.replace(/@media screen\{[^}]*\}\}?/, "") + `
@page{size:A4;margin:12mm 12mm 14mm}
.cover{break-after:page}
.cover .legend{break-after:auto;margin-top:14px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.logo{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#e8668f 0%,#b8336a 52%,#8c5be0 120%);color:#fff;display:inline-grid;place-items:center;font-family:"Bellefair",serif;font-size:28pt;line-height:1}
.lead{font-size:10.4pt;line-height:1.55;margin:0 0 8px}
h2{font-size:15pt;font-weight:600;color:var(--accent-strong);margin:0 0 8px;padding-bottom:3px;border-bottom:1.5px solid var(--accent)}
h3{font-size:11pt;font-weight:600;color:var(--accent-strong);margin:0 0 2px}
.page{break-after:page}
.hows{display:grid;grid-template-columns:1fr 1fr;gap:7px 12px}
.how{background:#fbf8f9;border:1px solid var(--line);border-radius:10px;padding:6px 9px;break-inside:avoid}
.how h4{margin:0 0 2px;font-size:10.2pt;color:var(--accent-strong);font-weight:600}
.how p{margin:0 0 3px;font-size:8.9pt;line-height:1.45}
.hsrc{font-size:7.8pt;color:var(--muted)}
.strip{border-collapse:collapse;margin:3px 0 1px}
.strip td{border:1px solid #d8ccd3;min-width:11mm;padding:1px 2px;vertical-align:top;background:#fff}
.strip td.gap{border:0;background:none;color:var(--faint);min-width:5mm;text-align:center;vertical-align:middle}
.strip .t{font-size:8.4pt;display:flex;gap:2px;align-items:baseline;white-space:nowrap}
.strip .t i{font-style:normal;font-size:6.4pt;color:var(--accent-strong)}
.strip .t .c{margin-inline-start:auto;font-size:6.4pt;color:var(--muted)}
.strip .mk2{display:flex;height:15px}
.strip .h{flex:1;display:flex;align-items:center;justify-content:center;gap:1px}
.how .cap{text-align:start}
table.mt{border-collapse:separate;border-spacing:0;width:100%;font-size:9.4pt;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.mt th,.mt td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top}
.mt thead th{background:var(--accent-soft);color:var(--accent-strong);font-weight:600;font-size:10pt}
.mt thead th small{color:var(--muted);font-weight:400;font-size:7.6pt}
.mt tbody th{font-weight:600;width:27%;background:#fbf8f9}
.mt td small{display:block;font-size:7.2pt;color:var(--muted);margin-top:1px}
.mt tr.same td{color:#5d5560;background:#faf8f9}
.mt td:nth-child(4){border-inline-start:2px solid var(--accent-soft)}
.warn{color:#b26a00;font-weight:700}
.lines{margin:10px 0 6px;padding-inline-start:16px;font-size:9.2pt}
.lines li{margin-bottom:3px}
.fine{font-size:8pt;color:var(--muted)}
.sit{break-inside:avoid;margin:0 0 9px;padding-top:4px;border-top:1px solid var(--line)}
.sd{margin:0 0 3px;font-size:8.8pt;color:#3e353a}
.sgs{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.sg figure.cal{width:100%}
.sg .cal td{height:10.4mm}
.sg .cal .mks{height:5.4mm}
.sg .cal .dn{font-size:8.2pt}
.sg .cal svg.mk{width:10px;height:10px}
.sg .cal .og{width:6px;height:6px}
.sg .cal .ct{font-size:6pt}
.sg figure.cal figcaption{font-size:8.4pt}
.cap2{font-size:7.3pt;color:#3e353a;line-height:1.4;margin-top:2px}
.sg:nth-child(3){border-inline-start:1.5px solid var(--accent-soft);padding-inline-start:2mm}
#sits{break-after:page}
.qg{break-inside:avoid;margin-bottom:6px}
.qg ol{margin:2px 0 0;padding-inline-start:20px}
.qg li{margin-bottom:5px;font-size:9.3pt;break-inside:avoid}
.qd{font-size:8.4pt;color:#3e353a}
.qd .lbl{color:var(--accent-strong);font-weight:600}
.ans{display:inline-block;font-size:8.6pt;margin-top:1px}
.ans .ln{display:inline-block;border-bottom:1px solid var(--ink);width:45mm;height:10px}
@media screen{body{max-width:190mm;margin:0 auto;padding:10mm}}
`;

function build() {
  let commit = "לא ידוע";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { /* מחוץ ל-git */ }
  const today = M.currentContext(M.emptyState(), new Date()).hebrewDate;
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מעיין — סיכום לרב</title><style>${CSS}</style></head><body>
${cover(commit, today)}
${howTo()}
${methodsTable()}
${situations()}
${questions()}
</body></html>`;
  if (/דרכי טהרה|חב״ד/.test(html.replace(/<style>[\s\S]*?<\/style>/, ""))) warnings.push("המסמך מזכיר חב״ד או דרכי טהרה");
  fs.writeFileSync(OUT_HTML, html);
  return commit;
}
async function renderPdf() {
  const pw = require("playwright");
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto("file://" + OUT_HTML, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: OUT_PDF, format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: `<div dir="rtl" style="width:100%;font-size:7.5px;color:#8f8694;text-align:center;font-family:Arial,sans-serif">מעיין · סיכום לרב · מנוע ${M.ENGINE_VERSION} · עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span></div>` });
  } finally { await browser.close(); }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const commit = build();
  console.log(`נוצר ${path.relative(ROOT, OUT_HTML)} (commit ${commit}, מנוע ${M.ENGINE_VERSION})`);
  for (const w of warnings) console.warn("אזהרה: " + w);
  if (!args.includes("--no-pdf")) renderPdf().then(() => console.log(`נוצר ${path.relative(ROOT, OUT_PDF)}`)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { build };
