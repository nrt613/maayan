#!/usr/bin/env node
/* מעיין — מצגת בעברית לרבנים (16:9, מימין לשמאל).
 * בונה את present/he/slides.html ואת maayan-presentation.pdf.
 * הלוחות העבריים בשקופיות החישוב מחושבים במנוע עצמו (src/core.js) דרך docs/halacha/questions-build.js.
 *
 * הרצה:  node present/he/build.js
 * פרטי קשר אישיים לא נשמרים במאגר (המאגר ציבורי). לגרסה אישית:
 *   MAAYAN_CONTACT=/path/contact.json MAAYAN_OUT=/path/outside/repo node present/he/build.js
 *   contact.json: { "name": "...", "phone": "...", "email": "..." }
 * צילומי המסך: present/he/screens/ (Playwright, 390x844, deviceScaleFactor 2, בעברית, מהיומן לדוגמה).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const ROOT = path.resolve(HERE, "..", "..");
const M = require(path.join(ROOT, "src", "core.js"));
const Q = require(path.join(ROOT, "docs", "halacha", "questions-build.js"));

const contactFile = process.env.MAAYAN_CONTACT;
const contact = contactFile ? JSON.parse(fs.readFileSync(contactFile, "utf8")) : null;
const OUT = process.env.MAAYAN_OUT ? path.resolve(process.env.MAAYAN_OUT) : HERE;
if (contact && path.resolve(OUT).startsWith(ROOT + path.sep)) { console.error("פרטי קשר אישיים: יש לכתוב אל MAAYAN_OUT מחוץ למאגר"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ltr = s => `<bdi dir="ltr">${esc(s)}</bdi>`;
// מספר ההשוואות בשקופית נלקח מהרצה של verify.js, כדי שלא יתיישן
const VERIFY = (() => {
  const out = require("child_process").execFileSync(process.execPath, [path.join(ROOT, "verify.js")], { cwd: ROOT, encoding: "utf8" });
  const m = out.match(/checks: (\d+), failures: (\d+)/);
  if (!m || m[2] !== "0") throw new Error("verify.js: " + out.trim().split("\n").pop());
  return Number(m[1]);
})();

const LINKS = {
  web: "https://nrt613.github.io/maayan/",
  apk: "https://github.com/nrt613/maayan/releases/latest/download/maayan.apk",
  privacy: "https://nrt613.github.io/maayan/privacy.html",
};

/* ---------- דוגמאות מחושבות במנוע ---------- */
const Y = 5787, TISHREI = 7, CHESHVAN = 8, KISLEV = 9, TEVET = 10, SHVAT = 11;
const N = (d, m) => M.toISO(new M.HDate(d, m, Y).greg());
const A = (d, m) => new M.HDate(d, m, Y).abs();
let n = 0;
const ev = (type, date, time) => ({ id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, type, date, time, cityId: "jerusalem", result: "clear", note: "", authorityNote: "", createdAt: "2026-01-01T00:00:00Z" });
const hs = abs => Q.hs(abs);
const fail = msg => { throw new Error("דוגמה: " + msg + " — המנוע השתנה, יש לעדכן את השקופית"); };
const only = (r, kind, onah) => { const m = r.marks.filter(x => x.kind === kind && (!onah || x.onah === onah)); if (m.length !== 1) fail(`${kind} ${onah || ""} × ${m.length}`); return m[0]; };
const when = m => m.onah === "night" ? `ליל ${hs(m.abs)}` : hs(m.abs);
const rowsHtml = rows => `<ul class="exl">${rows.map(([k, t, d]) => `<li>${Q.shape(k, { size: 22 })}<span><b>${t}</b><span class="d">${esc(d)}</span></span></li>`).join("")}</ul>`;

// א. ראייה ביום — בן איש חי: שתי ראיות, הפסק, ליל טבילה, וכל העונות
n = 0;
const ex1 = Q.run("sefard-bic", [ev("flow", N(5, TISHREI), "10:00"), ev("flow", N(10, CHESHVAN), "10:00"), ev("hefsek", N(13, CHESHVAN), "16:00")], N(14, CHESHVAN));
const s1 = A(10, CHESHVAN), h1 = A(13, CHESHVAN);
if (ex1.hef !== h1) fail("הפסק א");
const e1 = { avg: only(ex1, "avg"), mon: only(ex1, "mon"), int: only(ex1, "int"), mik: only(ex1, "mik") }, oz1 = ex1.marks.filter(m => m.kind === "oz");
if (oz1.length !== 3 || !oz1.every(o => o.onah === "night")) fail("אור זרוע א");
const cal1 = Q.grid({ from: s1, to: e1.int.abs, anchor: s1, marks: ex1.marks, tint: Q.tints(s1, h1) });
const list1 = rowsHtml([
  ["see", "שתי ראיות, ביום", `${hs(A(5, TISHREI))} · ${hs(s1)}`],
  ["hef", "הפסק טהרה מוקדם (4 ימים)", hs(h1)],
  ["mik", "ליל טבילה, אחרי שבעה נקיים", when(e1.mik)],
  ["avg", "עונה בינונית (יום 30)", when(e1.avg)],
  ["mon", "עונת החודש", when(e1.mon)],
  ["int", `הפלגה (${e1.int.abs - s1 + 1} ימים)`, when(e1.int)],
  ["oz", "אור זרוע: הלילה שלפני כל אחת", oz1.map(when).join(" · ")],
]);

// ב. ראייה בלילה — אשכנזי רגיל
n = 0;
const ex2 = Q.run("ashkenaz", [ev("flow", N(5, TISHREI), "21:00"), ev("flow", N(10, CHESHVAN), "21:00"), ev("hefsek", N(15, CHESHVAN), "16:00")], N(16, CHESHVAN));
const s2 = A(11, CHESHVAN), h2 = A(15, CHESHVAN);
if (ex2.hef !== h2 || ex2.marks.filter(m => m.kind === "see" && m.onah === "night").length !== 2) fail("ראייה ב");
const avg2 = ex2.marks.filter(m => m.kind === "avg"), oz2 = ex2.marks.filter(m => m.kind === "oz");
if (avg2.length !== 2 || !avg2.every(m => m.onah === "night") || !oz2.every(m => m.onah === "day")) fail("עונות ב");
const e2 = { mon: only(ex2, "mon"), int: only(ex2, "int"), mik: only(ex2, "mik") };
const cal2 = Q.grid({ from: s2, to: e2.int.abs, anchor: s2, marks: ex2.marks, tint: Q.tints(s2, h2) });
const list2 = rowsHtml([
  ["see", "שתי ראיות, בלילה (אחרי השקיעה)", `ליל ${hs(A(6, TISHREI))} · ליל ${hs(s2)}`],
  ["hef", "הפסק טהרה מוקדם (5 ימים)", hs(h2)],
  ["avg", "עונה בינונית: ימים 30 ו־31, בלילה", avg2.map(when).join(" · ")],
  ["mon", "עונת החודש, בלילה", when(e2.mon)],
  ["int", `הפלגה (${e2.int.abs - s2 + 1} ימים), בלילה`, when(e2.int)],
  ["oz", "אור זרוע: היום שלפני (לא לפני יום 31)", oz2.map(when).join(" · ")],
]);

// ג. הפלגה ארוכה ואחריה קצרה — אשכנזי רגיל מול יממה שלמה (כרתי ופלתי)
const evs3 = () => [ev("flow", N(3, CHESHVAN), "10:00"), ev("flow", N(7, KISLEV), "10:00"), ev("flow", N(28, KISLEV), "10:00")];
n = 100; const ikar = Q.run("ashkenaz", evs3(), N(1, TEVET));
n = 100; const kreti = Q.run("ashkenaz-kreiti", evs3(), N(1, TEVET));
const s3 = A(28, KISLEV);
const ikarInt = ikar.marks.filter(m => m.kind === "int"), kretiInt = kreti.marks.filter(m => m.kind === "int");
const extra = kretiInt.filter(k => !ikarInt.some(i => i.abs === k.abs)).sort((a, b) => a.abs - b.abs);
if (ikarInt.length !== 1 || extra.length !== 2) fail("הפלגות ג");
if (!ikar.r.reviews.some(r => r.id === "ask-uprooted-haflagah")) fail("שאלה ג");
const kAvg = kreti.marks.filter(m => m.kind === "avg");
if (kAvg.length !== 4) fail("בינונית מעת לעת ג");
const from3 = A(10, TEVET), to3 = extra[1].abs;
const cal3a = Q.grid({ label: "אשכנזי רגיל", from: from3, to: to3, anchor: s3, marks: ikar.marks, ghosts: extra.map(m => ({ abs: m.abs, kind: "int", onah: m.onah })), q: [extra[0].abs] });
const cal3b = Q.grid({ label: "יממה שלמה (כרתי ופלתי)", from: from3, to: to3, anchor: s3, marks: kreti.marks });

/* ---------- יצירת קשר ---------- */
const contactHtml = contact
  ? `<div class="ct-name">${esc(contact.name)}</div>
     ${contact.phone ? `<div class="ct-line"><a href="tel:${esc(contact.phone.replace(/[^\d+]/g, ""))}">${ltr(contact.phone)}</a></div>` : ""}
     ${contact.email ? `<div class="ct-line"><a href="mailto:${esc(contact.email)}">${ltr(contact.email)}</a></div>` : ""}`
  : `<div class="ct-name ph">[שם / טלפון]</div>`;

/* ---------- סמלים ---------- */
const ico = d => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  phone: ico('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4.5 21c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6"/><path d="M3 3l18 18"/>'),
  wifi: ico('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0"/><circle cx="12" cy="19.3" r="1"/><path d="M3 3l18 18"/>'),
  lock: ico('<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  key: ico('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16.5 6.5l2.5 2.5"/>'),
  trash: ico('<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14"/>'),
  bell: ico('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>'),
  sun: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  check: ico('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>'),
  ring: ico('<circle cx="12" cy="12" r="8.5" stroke-dasharray="3.5 2.2"/><path d="M12 7.5v5l3 2"/>'),
  moon: ico('<path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15.5 3.5z"/>'),
  widget: ico('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3.5" y="13" width="17" height="7.5" rx="2"/>'),
  scale: ico('<path d="M12 3.5v17M7 20.5h10M5 7.5h14M5 7.5l-2.5 6a3 3 0 0 0 5 0zM19 7.5l-2.5 6a3 3 0 0 0 5 0z"/>'),
  link: ico('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4L11.5 6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>'),
  android: ico('<rect x="5" y="9" width="14" height="10.5" rx="2"/><path d="M5 12h14M8 9a4 4 0 0 1 8 0M8.5 4.5l1.2 2M15.5 4.5l-1.2 2"/>'),
  shield: ico('<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>'),
  mail: ico('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>'),
  eye: ico('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  target: ico('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'),
  help: ico('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>'),
  gift: ico('<rect x="3.5" y="8.5" width="17" height="12" rx="2"/><path d="M12 8.5v12M3.5 13h17M12 8.5C9 8.5 7 4 9.5 4S12 8.5 12 8.5zM12 8.5c3 0 5-4.5 2.5-4.5S12 8.5 12 8.5z"/>'),
  doc: ico('<path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4M9 12h6M9 16h6"/>'),
};
const phone = (src, alt, cls = "", badges = []) => `<figure class="phone ${cls}"><img src="screens/${src}" alt="${esc(alt)}">${badges.map(([x, y, t]) => `<span class="badge" style="left:${x}%;top:${y}%">${t}</span>`).join("")}</figure>`;

/* ---------- שקופיות ---------- */
const S = [];
const slide = (cls, body) => S.push(`<section class="slide ${cls}">${body}<footer class="sf"><img src="../../icons/icon-192.png" alt=""><span>מעיין · יומן טהרת המשפחה</span><span class="pg">${S.length + 1}</span></footer></section>`);

// 1
slide("title", `
  <div class="t-wrap">
    <img class="t-icon" src="../../icons/icon-512.png" alt="הסמל של מעיין">
    <div>
      <h1>מעיין</h1>
      <p class="t-sub">יומן טהרת המשפחה.<br>פשוט, פרטי, מדויק.</p>
      <p class="t-meta">אפליקציה חינמית · הצגה לפני הרבנים · כסלו תשפ״ז</p>
    </div>
  </div>`);

// 2
slide("why vc", `
  <h2>למה מעיין?</h2>
  <div class="cols2">
    <div class="box good">
      <h3>מה הזוג צריך</h3>
      <ul>
        <li>לדעת בכל יום איפה הם עומדים</li>
        <li>מועדים נכונים, לפי <b>המנהג שלהם</b></li>
        <li>תזכורת <b>לפני</b> הזמן, לא אחריו</li>
        <li>לדעת מתי צריך לשאול רב</li>
      </ul>
    </div>
    <div class="box miss">
      <h3>מה חסר היום, פעמים רבות</h3>
      <ul>
        <li>חישוב ידני ולוחות נייר: טעויות בתאריכים</li>
        <li>כלים בלי שיטה מוצהרת ובלי הסבר למועד</li>
        <li>מעט ליווי מיום ליום</li>
        <li>תזכורות שמגיעות מאוחר מדי</li>
      </ul>
    </div>
  </div>`);

// 3
slide("principles vc", `
  <h2>העקרונות</h2>
  <div class="tiles five">
    <div class="tile">${IC.target}<b>מדויק</b><span>לוח עברי וזמני שמש לפי המקום, מחושבים במכשיר.</span></div>
    <div class="tile">${IC.eye}<b>שקוף</b><span>לכל מועד — הכלל שעליו הוא נשען.</span></div>
    <div class="tile">${IC.help}<b>אינו מכריע בספק</b><span>בשאלה פתוחה: ״יש לשאול רב״, ומה נעשה בינתיים.</span></div>
    <div class="tile">${IC.lock}<b>פרטי</b><span>הכול נשאר בטלפון. בלי חשבון ובלי שרת.</span></div>
    <div class="tile">${IC.gift}<b>חינמי</b><span>בלי פרסומות ובלי רכישות.</span></div>
  </div>`);

// 4
const STEPS = [
  ["nid", "ראייה", "רישום בשתי לחיצות. השעה קובעת את העונה; אחרי השקיעה — היום העברי הבא.", "—"],
  ["nid", "ימי המתנה", "״ממתינה להפסק״, והמועד המוקדם להפסק, לפי השיטה (4 או 5 ימים).", "—"],
  ["cln", "הפסק טהרה", "רק אם הדימום פסק. מעיין לעולם לא רושמת הפסק בעצמה.", "לפני השקיעה; אם לא נעשה — עוברת למחר"],
  ["cln", "שבעה נקיים", "״יום 5 מתוך 7״, ושתי בדיקות בכל יום.", "בדיקת בוקר ובדיקת ערב"],
  ["mik", "ליל טבילה", "המועד ורשימת הכנות.", "בצאת הכוכבים"],
  ["sep", "עונות פרישה", "למחזור הבא: עונה בינונית, עונת החודש, הפלגה ואור זרוע, לפי השיטה.", "עונת לילה — לפני השקיעה; עונת יום — בבוקר"],
];
slide("flow4 vc", `
  <h2>מסלול אחד, מההתחלה ועד הסוף</h2>
  <ol class="path">${STEPS.map(([c, t, d, r], i) => `<li class="st st-${c}"><span class="no">${i + 1}</span><b>${t}</b><p>${d}</p><div class="rem${r === "—" ? " none" : ""}">${IC.bell}<span>${r}</span></div></li>`).join("")}</ol>
  <p class="lead small center">כל שלב מוצג במסך ״היום״, וכל מועד מופיע בלוח וברשימת המועדים.</p>`);

// 5
slide("today", `
  <div class="split">
    ${phone("today.png", "מסך ״היום״", "", [[70, 18, 1], [18, 22, 2], [16, 46, 3], [20, 61, 4], [9, 87, 5]])}
    <div class="main">
      <h2>מסך ״היום״</h2>
      <p class="lead">במבט אחד: איפה היא עומדת, ומה הלאה.</p>
      <ol class="callouts">
        <li><b>המצב</b> — ממתינה להפסק, שבעה נקיים, ליל טבילה</li>
        <li><b>ההתקדמות</b> — ״יום 5 מתוך 7״, בטבעת ובשבעה עיגולים</li>
        <li><b>המועד הבא</b> — מה, מתי, ובאיזו שעה</li>
        <li><b>מועדים קרובים</b> — בדיקות, עונות, ליל טבילה</li>
        <li><b>״רישום״</b> — כפתור צף, תמיד בהישג יד</li>
      </ol>
      <p class="fine">כשיש — גם ״נקודות לבירור״, וזמני היום: זריחה, שקיעה, צאת הכוכבים.</p>
    </div>
  </div>`);

// 6
slide("record", `
  <div class="split">
    <div class="duo">${phone("flow-form.png", "טופס רישום ראייה", "back")}${phone("quick.png", "״מה לרשום?״", "front")}</div>
    <div class="main">
      <h2>רישום</h2>
      <ul class="feat">
        <li>${IC.check}<span><b>תפריט מהיר:</b> ראייה, הפסק, בדיקה, טבילה, אחר</span></li>
        <li>${IC.ring}<span><b>בלוח השנה:</b> לחיצה ארוכה על יום רושמת לאותו יום</span></li>
        <li>${IC.sun}<span><b>שעה ומקום</b> נשמרים בכל רישום; השעה קובעת את העונה</span></li>
        <li>${IC.help}<span><b>״לא ידוע מתי התחיל (מצאתי בקימה או בבדיקה)״:</b> חוששת לשתי העונות של היום, ומסמנת ״יש לשאול רב״</span></li>
        <li>${IC.doc}<span><b>מחזורים קודמים:</b> אפשר להזין, כדי שהחישוב יתחיל מלא</span></li>
      </ul>
    </div>
  </div>`);

// 7
slide("remind", `
  <div class="split">
    ${phone("dates.png", "רשימת המועדים")}
    <div class="main">
      <h2>תזכורות, בזמן הנכון</h2>
      <table class="rt">
        <tr><th>עונת פרישה בלילה</th><td>שעה לפני השקיעה (ניתן לשינוי)</td></tr>
        <tr><th>עונת פרישה ביום</th><td>בבוקר (08:00, ניתן לשינוי)</td></tr>
        <tr><th>הפסק טהרה</th><td>שעה לפני השקיעה, ביום המוקדם האפשרי</td></tr>
        <tr><th>בדיקות</th><td>בבוקר, ושעה לפני השקיעה</td></tr>
        <tr><th>ליל טבילה</th><td>בצאת הכוכבים</td></tr>
      </table>
      <ul class="feat sm">
        <li>${IC.bell}<span><b>נוסח דיסקרטי</b> כברירת מחדל: ״תזכורת אישית״, בלי פירוט</span></li>
        <li>${IC.widget}<span><b>וידג׳ט</b> למסך הבית באנדרואיד — כבוי כברירת מחדל, ודיסקרטי</span></li>
      </ul>
      <p class="fine">גם כשהאפליקציה סגורה — באפליקציה המותקנת. בדפדפן: כשהיומן פתוח, או בייצוא קובץ מועדים (ics) ליומן הטלפון.</p>
    </div>
  </div>`);

// 8
slide("calendar", `
  <div class="split">
    ${phone("calendar.png", "לוח השנה העברי")}
    <div class="main">
      <h2>לוח השנה</h2>
      <p class="lead">עברי או לועזי. כל המחזור בתמונה אחת.</p>
      <ul class="legend">
        <li><span class="sw nid"></span><span><b>ימי וסת</b> עד ההפסק</span></li>
        <li><span class="sw cln"></span><span><b>שבעה נקיים</b></span></li>
        <li><span class="dt sep"></span><span><b>עונת פרישה</b></span></li>
        <li><span class="dt mik"></span><span><b>טבילה</b></span></li>
        <li><span class="dt nid"></span><span><b>וסת שנרשמה</b></span></li>
        <li><span class="dt cln"></span><span><b>הפסק או בדיקה</b></span></li>
      </ul>
      <p class="note">${IC.ring}<span>לחיצה על יום — הפירוט שלו. לחיצה ארוכה — רישום לאותו יום.</span></p>
    </div>
  </div>`);

// 9
slide("method", `
  <div class="split">
    ${phone("method.png", "בחירת המנהג בכניסה הראשונה")}
    <div class="main">
      <h2>המנהג שלי, בשני שלבים</h2>
      <p class="lead small"><b>1.</b> מה המנהג שלך? &nbsp; <b>2.</b> לפי פסקי מי? &nbsp;·&nbsp; בוחרים בכניסה הראשונה, ועד אז אין חישוב.</p>
      <div class="meth">
        <div class="fam"><span class="tag">ספרדי</span>
          <div class="m"><b>הרב עובדיה יוסף</b><span>לפי פסקי טהרת הבית.</span></div>
          <div class="m"><b>בן איש חי</b><span>כמו הרב עובדיה, ובנוסף אור זרוע.</span></div></div>
        <div class="fam"><span class="tag">אשכנזי</span>
          <div class="m"><b>אשכנזי רגיל</b><span>יום 30 ו־31, ואור זרוע.</span></div>
          <div class="m"><b>יממה שלמה (כרתי ופלתי)</b><span>כמו הרגיל, והעונה הבינונית יממה שלמה.</span></div></div>
        <div class="fam"><span class="tag">חב״ד</span>
          <div class="m"><b>מנהג חב״ד</b><span>לפי שולחן ערוך הרב.</span></div></div>
      </div>
      <p class="note">${IC.scale}<span>כל הגדרה ניתנת לשינוי ב<b>״התאמה אישית לפי הוראת הרב״</b>. ובמצב מיוחד (היריון, אחרי לידה, הנקה, טיפול הורמונלי) — רושמים עונות לפי הוראה.</span></p>
    </div>
  </div>`);

// 10
const T = [
  ["ימי המתנה לפני ההפסק", "4", "4", "5", "5"],
  ["הפסק אחרי השקיעה", "בדיעבד, עד 13.5 דקות זמניות", "בדיעבד, עד 13.5 דקות זמניות", "רק לפני השקיעה", "רק לפני השקיעה"],
  ["עונה בינונית", "יום 30, עונה אחת", "יום 30, עונה אחת", "ימים 30 ו־31, עונה אחת", "ימים 30 ו־31, יממה שלמה"],
  ["אור זרוע", "לא", "כן", "כן", "כן"],
  ["הפלגה ארוכה שאחריה קצרה", "נעקרת", "נעקרת", "נעקרת", "נשמרת"],
  ["צאת הכוכבים", "20 דקות", "20 דקות", "8.5°", "8.5°"],
];
// בדיקת עקביות מול השיטות שבמנוע
{
  const P = M.METHOD_PRESETS, cols = ["sefard", "sefard-bic", "ashkenaz", "ashkenaz-kreiti"];
  const expect = { wait: ["four", "four", "five", "five"], hefsekTwilight: ["ovadia", "ovadia", "before-sunset", "before-sunset"], beinonit: ["same", "same", "same", "both"], day31: [false, false, true, true], orZarua: [false, true, true, true], carryLongIntervals: [false, false, false, true], nightfall: ["20m", "20m", "8.5", "8.5"] };
  for (const [k, v] of Object.entries(expect)) cols.forEach((c, i) => { if (P[c].settings[k] !== v[i]) fail(`טבלת השיטות: ${c}.${k}`); });
  const ch = P.chabad.settings;
  if (ch.wait !== "five" || ch.haflagah !== "chabad-onot" || ch.beinonit !== "both" || ch.day31 || ch.orZarua || !ch.carryLongIntervals || ch.hefsekTwilight !== "before-sunset") fail("חב״ד");
}
slide("table vc", `
  <h2>השיטות במבט אחד</h2>
  <table class="mt">
    <thead><tr class="famrow"><th></th><th colspan="2">ספרדי</th><th colspan="2">אשכנזי</th></tr>
    <tr><th></th><th>הרב עובדיה יוסף</th><th>בן איש חי</th><th>אשכנזי רגיל</th><th>יממה שלמה</th></tr></thead>
    <tbody>${T.map(([h, ...c]) => `<tr><th>${h}</th>${c.map(x => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  <p class="foot"><b>חב״ד:</b> 5 ימים · הפסק רק לפני השקיעה · הפלגה בעונות מההפסק · עונה בינונית מעת לעת ביום 30 · בלי אור זרוע · הפלגה ארוכה נשמרת.</p>
  <p class="fine center">בכל השיטות: עונת החודש באותו יום בחודש, הפלגה בימים מראייה לראייה (חוץ מחב״ד), ובדיקה בבוקר ובערב בכל אחד משבעת הימים.</p>`);

// 11–13
const calSlide = (title, sub, cal, list, foot) => slide("calcs", `
  <h2>${title}</h2>
  <p class="lead small">${sub}</p>
  <div class="calc">
    <div class="calbox">${cal}</div>
    <div class="side">${list}${foot ? `<p class="fine">${foot}</p>` : ""}</div>
  </div>`);
const LEGEND = "צבעים: ימי נידה עד ההפסק, ואחריהם שבעה נקיים. בכל משבצת: חצי ימני — לילה, חצי שמאלי — יום. המספר הקטן: היום מהראייה.";
calSlide("איך מחושבות העונות: ראייה ביום", "דוגמה אמיתית, מחושבת במנוע · בן איש חי", cal1, list1, LEGEND);
calSlide("ראייה בלילה", "אותם תאריכים, אחרי השקיעה · אשכנזי רגיל", cal2, list2, "כל העונות נקבעות בעונת הראייה — כאן בלילה. " + LEGEND.split(". ").slice(1).join(". "));
slide("calcs two", `
  <h2>הפלגה ארוכה, ואחריה קצרה</h2>
  <p class="lead small">ראיות: ${hs(A(3, CHESHVAN))}, ${hs(A(7, KISLEV))} (הפלגה 35), ${hs(s3)} (הפלגה 22) · מחושב במנוע</p>
  <div class="two-cals">${cal3a}${cal3b}</div>
  <div class="cmp">
    <p><b>אשכנזי רגיל:</b> ההפלגה הארוכה נעקרה; רק 22 (${hs(ikarInt[0].abs)}). מסומן ״יש לשאול רב״, עם התאריך שבמחלוקת (${hs(extra[0].abs)}, <span class="qmk">?</span>).</p>
    <p><b>יממה שלמה (כרתי ופלתי):</b> שומרת גם את 35 (${hs(extra[0].abs)}, ${hs(extra[1].abs)}), והעונה הבינונית יממה שלמה, לילה ויום.</p>
  </div>`);

// 14
slide("clean vc", `
  <h2>שבעה נקיים ובדיקות</h2>
  <div class="cols2">
    <div class="box good">
      <h3>מה מעיין עוקבת</h3>
      <ul>
        <li>הספירה מתחילה רק מהפסק שנרשם כנקי</li>
        <li>בדיקה נספרת מעלות השחר ועד השקיעה</li>
        <li>בוקר וערב — לפי חצות היום</li>
        <li>״יום N מתוך 7״, והכנות לליל הטבילה</li>
      </ul>
    </div>
    <div class="box miss">
      <h3>מה מסומן לבירור</h3>
      <ul>
        <li>יום שעבר בלי בדיקה רשומה</li>
        <li>הפסק אחרי השקיעה או בזמן מסופק: הספירה לא מתחילה</li>
        <li>הפסק לפני סוף ימי ההמתנה</li>
        <li>ליל טבילה בשבת, ביום טוב, ביום הכיפורים או בתשעה באב</li>
      </ul>
    </div>
  </div>
  <p class="fine center">בשיטת הרב עובדיה: הפסק עד 13.5 דקות זמניות אחרי השקיעה מתקבל בדיעבד, עם הערה לוודא עם הרב.</p>`);

// 15
const ASKS = [
  ["ראתה בל׳, והחודש הבא חסר", "חוששת לא׳ בחודש שאחריו"],
  ["הפלגה ארוכה שנעקרה בהפלגה קצרה ממנה", "אינה חוששת לארוכה, ומציגה את התאריך שבמחלוקת"],
  ["דם שנמצא בהתעוררות, ולא ידוע מתי התחיל", "חוששת ללילה וליום של אותו יום"],
];
slide("ask", `
  <div class="split">
    ${phone("ask.png", "״יש לשאול רב״ ביומן")}
    <div class="main">
      <h2>היכן מעיין אינה מכריעה</h2>
      <p class="lead small">מופיע ״יש לשאול רב״: משפט על המצב, ומשפט על מה שמעיין עושה בינתיים.</p>
      <table class="at">
        <thead><tr><th>המצב</th><th>בינתיים</th></tr></thead>
        <tbody>${ASKS.map(([a, b], i) => `<tr><th><span class="an">${i + 1}</span>${a}</th><td>${b}</td></tr>`).join("")}</tbody>
      </table>
      <p class="fine">הוכרע כמו כל הלוחות, בלי ״יש לשאול רב״: ראתה בל׳ והחודש הבא מלא — לל׳ בלבד; ואור זרוע לפני יממה שלמה — רק לפני עונת הראייה (בראייה ביום, אין אור זרוע ביום 29).</p>
    </div>
  </div>`);

// 16
slide("also vc", `
  <h2>עוד נקודות לבירור</h2>
  <div class="tiles">
    <div class="tile">${IC.check}<b>בדיקה שלא נרשמה</b><span>״אם הבדיקה נעשתה, אפשר לרשום אותה. אם לא, יש לשאול רב.״</span></div>
    <div class="tile">${IC.sun}<b>הפסק סמוך לשקיעה</b><span>אחרי השקיעה או בזמן מסופק — הספירה לא מתחילה אוטומטית.</span></div>
    <div class="tile">${IC.moon}<b>ליל טבילה בשבת או ביום טוב</b><span>מסומן, לא מוזז. ביום הכיפורים ובתשעה באב — הטבילה נדחית.</span></div>
    <div class="tile">${IC.ring}<b>וסת קבועה אפשרית</b><span>שלוש ראיות באותו יום בחודש, או שלוש הפלגות שוות. החישוב ממשיך כרגיל.</span></div>
    <div class="tile">${IC.help}<b>ראייה סמוך לשקיעה</b><span>או בין השמשות: חוששת לשתי העונות.</span></div>
    <div class="tile">${IC.doc}<b>דוח לבירור</b><span>טקסט גלוי למורה ההוראה: ההגדרות, הרישומים, המועדים והנקודות.</span></div>
  </div>`);

// 17
slide("privacy vc", `
  <h2>פרטיות ואבטחה</h2>
  <div class="tiles">
    <div class="tile">${IC.phone}<b>הכול נשאר בטלפון</b><span>היומן לא נשלח לשום מקום.</span></div>
    <div class="tile">${IC.user}<b>בלי חשבון ובלי שרת</b><span>אין איסוף נתונים.</span></div>
    <div class="tile">${IC.wifi}<b>אנדרואיד: בלי אינטרנט</b><span>לאפליקציה אין אפילו הרשאת רשת.</span></div>
    <div class="tile">${IC.lock}<b>נעילה</b><span>קוד של 4–6 ספרות, טביעת אצבע או Face ID.</span></div>
    <div class="tile">${IC.key}<b>גיבוי מוצפן</b><span>בסיסמה, להעברה למכשיר אחר.</span></div>
    <div class="tile">${IC.trash}<b>מחיקה מלאה</b><span>כל הנתונים, בלחיצה.</span></div>
  </div>
  <p class="center fine big">ועוד: כפתור ״הסתרת היומן״, והסתרת התוכן במסך האפליקציות האחרונות כשהנעילה פעילה.</p>`);

// 18
slide("rigour vc", `
  <h2>בדיקות ודיוק</h2>
  <div class="nums">
    <div class="num"><strong>${require(path.join(ROOT, "src", "tests.js"))(M).tests.length}</strong><span>בדיקות אוטומטיות למנוע החישוב</span></div>
    <div class="num"><strong>${ltr(VERIFY.toLocaleString("en-US"))}</strong><span>השוואות של הלוח העברי וזמני השמש מול מקורות חיצוניים — בלי כישלון</span></div>
    <div class="num"><strong>99</strong><span>עמודי מפרט הלכתי מלא, שהוכן לבדיקת רב</span></div>
  </div>
  <div class="docs">
    <p>${IC.doc}<span>לרב: <b>סיכום לרב</b> (7 עמודים) ו<b>שאלות לרב</b> (7 עמודים). המסמכים נוצרים מהמנוע עצמו — כל טבלה וכל לוח מחושבים, לא מועתקים.</span></p>
    <p>${IC.shield}<span>באנדרואיד נבדקים אוטומטית: התראות, נעילה, וידג׳ט, ושאין שום פנייה לרשת.</span></p>
  </div>`);

// 19
slide("adds-s vc", `
  <h2>מה מעיין מוסיפה</h2>
  <p class="lead small">בלי להשוות לכלי מסוים — אלה הדברים שבנינו כי חיפשנו אותם:</p>
  <div class="adds">
    <div>${IC.ring}<b>ליווי</b><span>יום אחר יום, עם הצעד הבא</span></div>
    <div>${IC.sun}<b>לפני השקיעה</b><span>תזכורת לעונת לילה בזמן</span></div>
    <div>${IC.eye}<b>שקיפות</b><span>לכל מועד — הכלל שלו</span></div>
    <div>${IC.scale}<b>המנהג שלי</b><span>ספרדי, אשכנזי, חב״ד, וכל הגדרה לפי הרב</span></div>
    <div>${IC.help}<b>לא מכריעה בשקט</b><span>״יש לשאול רב״, ומה נעשה בינתיים</span></div>
    <div>${IC.lock}<b>פרטיות מלאה</b><span>בלי חשבון, בלי שרת</span></div>
  </div>`);

// 20
slide("status-s vc", `
  <h2>איפה אנחנו עומדים</h2>
  <div class="status"><span class="pill">גרסה לבדיקה</span> החישובים טרם קיבלו אישור הלכתי. אנו מבקשים להביא אותם לפני רבנים מוכרים.</div>
  <h3 class="req">מה אנו מבקשים מכבוד הרב</h3>
  <ol class="steps">
    <li><b>לנסות</b> את האפליקציה, עם היומן לדוגמה</li>
    <li><b>לעבור</b> על הסיכום לרב</li>
    <li><b>להשיב</b> על השאלות הפתוחות</li>
    <li><b>להעיר</b> — כל הערה תיושם</li>
    <li>ואם הרב מוצא זאת נכון — <b>לתת את אישורו</b></li>
  </ol>`);

// 21
slide("links vc", `
  <h2>קישורים ויצירת קשר</h2>
  <div class="lk">
    <a class="l" href="${LINKS.web}">${IC.link}<span><b>אפליקציית רשת</b><small>בכל טלפון, כולל אייפון · אפשר להוסיף למסך הבית</small><em>${ltr(LINKS.web.replace("https://", ""))}</em></span></a>
    <a class="l" href="${LINKS.apk}">${IC.android}<span><b>אפליקציה לאנדרואיד</b><small>בקרוב ב־Google Play וב־App Store</small><em><bdi dir="ltr">github.com/nrt613/maayan/releases/<wbr>latest/download/maayan.apk</bdi></em></span></a>
    <a class="l" href="${LINKS.privacy}">${IC.shield}<span><b>מדיניות פרטיות</b><em>${ltr(LINKS.privacy.replace("https://", ""))}</em></span></a>
    <div class="l contact">${IC.mail}<span><b>יצירת קשר</b>${contactHtml}</span></div>
  </div>`);

// 22
slide("thanks", `
  <div class="t-wrap center">
    <img class="t-icon small" src="../../icons/icon-512.png" alt="">
    <h1>תודה רבה</h1>
    <p class="bless">ברכה והצלחה</p>
  </div>`);

/* ---------- עיצוב ---------- */
const CAL_CSS = Q.CSS.split("\n").filter(l => /^(\.cal|figure\.cal|\.mk)/.test(l)).join("\n");
const CSS = `
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-hebrew.woff2") format("woff2");font-weight:300 900;unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-latin.woff2") format("woff2");font-weight:300 900;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-latin-ext.woff2") format("woff2");font-weight:300 900;unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@page{size:1280px 720px;margin:0}
:root{
  --bg:#fbf8f9;--surface:#fff;--soft:#f5eff2;--line:#ece4e8;--ink:#1f1a1e;--muted:#6b6270;--faint:#8f8694;
  --accent:#b8336a;--accent-strong:#8e2452;--accent-soft:#fbe9f0;--lilac:#8c5be0;--lilac-soft:#f1ecff;
  --grad:linear-gradient(135deg,#e8668f 0%,#b8336a 52%,#8c5be0 120%);
  --niddah:#e5484d;--niddah-bg:#fde8ea;--niddah-ink:#b4232f;--clean:#7a6cf2;--clean-bg:#eeebff;--clean-ink:#4f3fd0;
  --mikvah:#14a39e;--mikvah-bg:#ddf3f1;--mikvah-ink:#0c6b68;--sep:#d9901f;--sep-bg:#fcf1dd;--sep-ink:#8a5500;
  --q:#c42b45;--good:#1f8a5b;--good-soft:#e3f5ec;
  --sh-1:0 1px 2px rgb(60 20 40 / .04),0 4px 14px rgb(60 20 40 / .05);--sh-2:0 2px 6px rgb(60 20 40 / .05),0 14px 36px rgb(60 20 40 / .09);
}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#d9d0d5;font-family:"Rubik",system-ui,sans-serif;color:var(--ink)}
.slide{width:1280px;height:720px;position:relative;overflow:hidden;padding:52px 72px 70px;
  background:radial-gradient(55% 70% at 0% 0%,#fbe9f0 0%,transparent 70%),radial-gradient(50% 60% at 100% 100%,#f1ecff 0%,transparent 70%),var(--bg);
  break-after:page;page-break-after:always;margin:0 auto 24px}
@media print{body{background:none}.slide{margin:0}}
.vc{display:flex;flex-direction:column;justify-content:center;padding-bottom:84px}
h1{font-size:84px;font-weight:700;margin:0;line-height:1.05}
h2{font-size:46px;font-weight:700;margin:0 0 20px;line-height:1.15}
h3{font-size:26px;font-weight:600;margin:0 0 12px}
b{font-weight:600}
.lead{font-size:25px;color:var(--muted);margin:-4px 0 22px;line-height:1.45}
.lead.small{font-size:21px;margin-bottom:16px}
.fine{font-size:16px;color:var(--faint);line-height:1.5;margin:12px 0 0}
.center{text-align:center}
.sf{position:absolute;left:72px;right:72px;bottom:24px;display:flex;align-items:center;gap:10px;font-size:15px;color:var(--faint)}
.sf img{width:22px;height:22px;border-radius:6px}
.sf .pg{margin-inline-start:auto}
.title .sf,.thanks .sf{display:none}
/* כותרת */
.title{display:flex;align-items:center;padding:0 120px}
.t-wrap{display:flex;align-items:center;gap:64px}
.t-wrap.center{flex-direction:column;gap:18px;width:100%;justify-content:center;height:100%}
.t-icon{width:230px;height:230px;border-radius:54px;box-shadow:0 22px 60px rgb(184 51 106 / .30)}
.t-icon.small{width:140px;height:140px;border-radius:34px}
.title h1{font-size:110px;color:var(--accent)}
.t-sub{font-size:40px;line-height:1.3;margin:14px 0 26px;font-weight:400}
.t-meta{font-size:20px;color:var(--muted);margin:0}
.thanks h1{font-size:96px}
.bless{font-size:50px;color:var(--accent);margin:0;font-weight:500}
/* שתי עמודות */
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.box{background:var(--surface);border-radius:28px;padding:30px 34px;box-shadow:var(--sh-2)}
.box.good h3{color:var(--good)}
.box.miss h3{color:var(--accent-strong)}
.box ul{list-style:none;margin:0;padding:0}
.box li{font-size:24px;line-height:1.35;padding:11px 32px 11px 0;position:relative;border-top:1px solid var(--line)}
.box li:first-child{border-top:0}
.box.good li::before{content:"";position:absolute;right:4px;top:21px;width:12px;height:12px;border-radius:50%;background:var(--good)}
.box.miss li::before{content:"";position:absolute;right:2px;top:25px;width:14px;height:3px;border-radius:2px;background:var(--accent)}
/* אריחים */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.tiles.five{grid-template-columns:repeat(5,1fr);gap:18px}
.tile{background:var(--surface);border-radius:24px;padding:24px 24px;box-shadow:var(--sh-2);display:flex;flex-direction:column;gap:8px}
.tile svg{color:var(--accent);width:46px;height:46px;background:var(--accent-soft);border-radius:14px;padding:8px}
.tile b{font-size:24px;margin-top:6px}
.tile span{font-size:19px;color:var(--muted);line-height:1.4}
.five .tile{padding:26px 22px;min-height:250px}
.five .tile b{font-size:27px}
.five .tile span{font-size:20px}
.fine.big{font-size:20px;color:var(--muted);margin-top:24px}
/* מסלול */
.path{list-style:none;margin:6px 0 22px;padding:0;display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.st{position:relative;background:var(--surface);border-radius:22px;padding:18px 16px 16px;box-shadow:var(--sh-2);display:flex;flex-direction:column;border-top:6px solid var(--c)}
.st::after{content:"";position:absolute;left:-13px;top:44px;border:7px solid transparent;border-right-color:var(--faint);opacity:.5;transform:translateX(-50%)}
.st:last-child::after{display:none}
.st-nid{--c:var(--niddah);--ci:var(--niddah-ink)}.st-cln{--c:var(--clean);--ci:var(--clean-ink)}.st-mik{--c:var(--mikvah);--ci:var(--mikvah-ink)}.st-sep{--c:var(--sep);--ci:var(--sep-ink)}
.st .no{font-size:15px;font-weight:700;color:var(--ci)}
.st b{font-size:25px;color:var(--ci);margin:2px 0 8px}
.st p{font-size:18px;line-height:1.42;margin:0 0 12px;flex:1}
.rem{display:flex;gap:6px;align-items:flex-start;font-size:16px;color:var(--accent-strong);background:var(--accent-soft);border-radius:12px;padding:8px 9px;line-height:1.35;min-height:62px}
.rem svg{flex:none;width:18px;height:18px;margin-top:1px}
.rem.none{visibility:hidden}
/* טלפון */
.split{display:flex;gap:60px;align-items:center;height:100%}
.split .main{flex:1;min-width:0}
.phone{position:relative;flex:none;margin:-14px 0 0;width:272px;padding:9px;border-radius:46px;background:#1f1a1e;box-shadow:0 30px 70px rgb(60 20 40 / .28),inset 0 0 0 2px #3b3438}
.phone img{display:block;width:100%;border-radius:38px}
.badge{position:absolute;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;background:var(--grad);color:#fff;font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #fff,0 6px 14px rgb(184 51 106 / .4)}
.duo{flex:none;position:relative;width:440px;height:560px;margin-top:0}
.duo .phone{position:absolute;margin:0;width:250px}
.duo .back{right:4px;top:0;transform:rotate(3deg)}
.duo .front{left:0;top:28px}
/* רשימות */
.callouts{list-style:none;margin:0;padding:0;counter-reset:c}
.callouts li{counter-increment:c;position:relative;padding:9px 52px 9px 0;font-size:23px;line-height:1.35}
.callouts li::before{content:counter(c);position:absolute;right:0;top:8px;width:36px;height:36px;border-radius:50%;background:var(--grad);color:#fff;font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center}
.feat{list-style:none;margin:0;padding:0}
.feat li{display:flex;gap:16px;align-items:center;font-size:22px;line-height:1.35;padding:8px 0}
.feat svg{flex:none;color:var(--accent);background:var(--accent-soft);border-radius:12px;padding:6px;width:42px;height:42px}
.feat.sm li{font-size:19px;padding:5px 0}
.feat.sm svg{width:36px;height:36px}
.rt{border-collapse:separate;border-spacing:0;width:100%;background:var(--surface);border-radius:20px;box-shadow:var(--sh-1);overflow:hidden;margin-bottom:12px}
.rt th,.rt td{text-align:right;padding:10px 18px;font-size:20px;border-top:1px solid var(--line)}
.rt tr:first-child th,.rt tr:first-child td{border-top:0}
.rt th{font-weight:600;color:var(--accent-strong);width:40%}
.remind .fine{font-size:15px}
.legend{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
.legend li{display:flex;gap:12px;align-items:center;font-size:22px}
.sw{flex:none;width:34px;height:26px;border-radius:8px}
.sw.nid{background:var(--niddah-bg);border:1.5px solid #f3b9c0}.sw.cln{background:var(--clean-bg);border:1.5px solid #c8c0ff}
.dt{flex:none;width:14px;height:14px;border-radius:50%;margin:0 10px}
.dt.sep{background:var(--sep)}.dt.mik{background:var(--mikvah)}.dt.nid{background:var(--niddah)}.dt.cln{background:var(--clean)}
.note{display:flex;gap:12px;align-items:center;font-size:20px;margin:22px 0 0;background:var(--lilac-soft);border-radius:16px;padding:12px 18px;color:#4b2f86;line-height:1.4}
.note svg{flex:none;color:var(--lilac)}
/* שיטות */
.meth{display:flex;flex-direction:column;gap:12px}
.fam{display:flex;gap:14px;align-items:stretch}
.fam .tag{flex:none;width:110px;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:600;color:var(--accent-strong);background:var(--accent-soft);border-radius:16px}
.fam .m{flex:1;background:var(--surface);border-radius:16px;padding:10px 16px;box-shadow:var(--sh-1)}
.fam .m b{font-size:22px}
.fam .m > span{display:block;color:var(--muted);font-size:18px;margin-top:3px}
.method .note{font-size:18px;margin-top:16px}
.mt{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border-radius:24px;box-shadow:var(--sh-2);overflow:hidden}
.mt th,.mt td{padding:12px 16px;text-align:center;font-size:20px;border-top:1px solid var(--line);line-height:1.3}
.mt thead th{font-size:21px;font-weight:700;color:var(--accent-strong);border-top:0;padding-top:4px;padding-bottom:12px}
.mt thead tr.famrow th{font-size:16px;font-weight:500;color:var(--faint);padding:14px 0 0;border-top:0}
.mt tbody th{text-align:right;font-weight:600;width:22%;color:var(--ink)}
.mt tbody tr:nth-child(odd){background:#fdfafb}
.foot{font-size:19px;margin:16px 0 0;background:var(--surface);border-radius:16px;padding:12px 18px;box-shadow:var(--sh-1);line-height:1.45}
/* לוחות */
.calc{display:flex;gap:40px;align-items:flex-start}
.calbox{flex:none;width:560px}
.side{flex:1;min-width:0}
.exl{list-style:none;margin:0;padding:0}
.exl li{display:flex;gap:14px;align-items:flex-start;font-size:19px;line-height:1.25;padding:4px 0;border-bottom:1px solid var(--line)}
.exl li svg{margin-top:2px;flex:none}
.exl .d{display:block;font-size:20px;font-weight:600;color:var(--accent-strong)}
.calc .fine{font-size:15px}
${CAL_CSS}
.cal th{font-size:15px;padding-bottom:4px}
figure.cal{width:560px}
.cal td{height:60px;border-color:#e2d6dc}
.cal .top{height:24px;padding:3px 5px 0}
.cal .dn{font-size:17px}
.cal .ct{font-size:12px}
.cal .mn{font-size:12px;bottom:2px;right:4px}
.cal .mks{height:32px}
.cal .mk{width:20px;height:20px}
.cal .og{width:11px;height:11px}
.cal td.m1{border-inline-start:3px solid var(--accent)}
.cal td.t-nid{background:var(--niddah-bg)}.cal td.t-cln{background:var(--clean-bg)}
.cal .qm{width:20px;height:20px;font-size:13px;line-height:17px;top:-7px;left:-6px}
.two-cals{display:flex;gap:36px;justify-content:center}
.two-cals figure.cal{width:540px}
.two-cals figure.cal figcaption{font-size:20px;margin-bottom:6px}
.two-cals .cal td{height:68px}
.two-cals .cal .mks{height:38px}
.two-cals .cal .mk{width:17px;height:17px}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:14px}
.cmp p{margin:0;font-size:18px;line-height:1.45;background:var(--surface);border-radius:16px;padding:10px 16px;box-shadow:var(--sh-1)}
.qmk{display:inline-flex;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--q);color:var(--q);font-weight:800;font-size:13px;align-items:center;justify-content:center}
/* שאלות */
.at{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border-radius:20px;box-shadow:var(--sh-2);overflow:hidden}
.at th,.at td{text-align:right;padding:10px 16px;font-size:19px;line-height:1.35;border-top:1px solid var(--line);vertical-align:top}
.at thead th{font-size:16px;color:var(--faint);font-weight:500;border-top:0;padding-bottom:4px}
.at tbody th{font-weight:600;width:52%}
.at td{color:var(--accent-strong)}
.an{display:inline-flex;width:26px;height:26px;border-radius:50%;background:var(--accent-soft);color:var(--accent-strong);font-size:15px;font-weight:700;align-items:center;justify-content:center;margin-inline-end:10px}
/* מספרים */
.nums{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:24px}
.num{background:var(--surface);border-radius:28px;padding:26px 30px;box-shadow:var(--sh-2)}
.num strong{display:block;font-size:64px;font-weight:700;color:var(--accent);line-height:1.05}
.num span{display:block;font-size:20px;color:var(--muted);margin-top:10px;line-height:1.4}
.docs{margin-top:26px}
.docs p{display:flex;gap:14px;align-items:center;font-size:21px;margin:0 0 12px;line-height:1.4}
.docs svg{flex:none;color:var(--lilac)}
/* מה מעיין מוסיפה */
.adds{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.adds > div{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:16px;background:var(--surface);border-radius:22px;padding:20px 22px;box-shadow:var(--sh-2)}
.adds svg{grid-row:span 2;color:var(--accent);width:48px;height:48px;background:var(--accent-soft);border-radius:14px;padding:9px}
.adds b{font-size:24px}
.adds span{font-size:18px;color:var(--muted);line-height:1.4}
/* בקשה */
.status{font-size:24px;line-height:1.5;background:var(--surface);border-radius:22px;padding:18px 26px;box-shadow:var(--sh-1);margin-bottom:26px}
.pill{display:inline-block;background:var(--sep-bg);color:var(--sep-ink);font-weight:600;border-radius:999px;padding:3px 14px;margin-inline-end:8px;font-size:20px}
.req{font-size:27px;color:var(--accent-strong)}
.steps{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;grid-template-columns:1fr 1fr;gap:12px 26px}
.steps li{counter-increment:s;font-size:22px;line-height:1.3;padding:13px 64px 13px 18px;position:relative;background:var(--surface);border-radius:18px;box-shadow:var(--sh-1)}
.steps li:last-child{grid-column:span 2}
.steps li::before{content:counter(s);position:absolute;right:16px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:var(--grad);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:18px}
/* קישורים */
.lk{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.l{display:flex;gap:18px;align-items:flex-start;background:var(--surface);border-radius:24px;padding:28px 28px;min-height:150px;box-shadow:var(--sh-2);text-decoration:none;color:var(--ink)}
.l svg{flex:none;color:var(--accent);width:46px;height:46px;background:var(--accent-soft);border-radius:14px;padding:8px}
.l > span{min-width:0}
.l b{display:block;font-size:26px}
.l small{display:block;font-size:18px;color:var(--muted);margin-top:4px}
.l em{display:block;font-style:normal;font-size:18px;color:var(--accent-strong);margin-top:8px;overflow-wrap:anywhere;text-decoration:underline;text-decoration-color:#e8b3c8;text-underline-offset:3px;text-align:left;direction:ltr}
.l.contact .ct-name{font-size:23px;margin-top:6px}
.l.contact .ct-name.ph{color:var(--faint)}
.l.contact .ct-line{font-size:20px;margin-top:4px}
.l.contact a{color:var(--accent-strong)}
`;

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1280">
<title>מעיין — מצגת</title>
<!-- נוצר ב-present/he/build.js: לא עורכים ידנית. -->
<style>${CSS}</style>
</head>
<body>
${S.join("\n")}
</body>
</html>
`;

(async () => {
  const outHtml = path.join(OUT, "slides.html"), outPdf = path.join(OUT, "maayan-presentation.pdf");
  const doc = OUT === HERE ? html : html.replace("<head>", `<head>\n<base href="file://${HERE}/">`);
  fs.writeFileSync(outHtml, doc);
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("file://" + outHtml);
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(() => [...document.querySelectorAll(".slide")].map((s, i) => {
    const r = s.getBoundingClientRect(), bad = [];
    for (const el of s.querySelectorAll("*")) { if (el.closest("footer")) continue; const b = el.getBoundingClientRect(); if (b.width && (b.bottom > r.bottom - 50 || b.right > r.right - 20 || b.left < r.left + 20)) bad.push(el.tagName + "." + el.className); }
    return bad.length ? `${i + 1}: ${bad.slice(0, 4).join(", ")}` : "";
  }).filter(Boolean));
  if (over.length) console.warn("גלישה אפשרית:\n  " + over.join("\n  "));
  await page.pdf({ path: outPdf, width: "1280px", height: "720px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  console.log(`${S.length} שקופיות → ${outHtml}\n→ ${outPdf}`);
})().catch(e => { console.error(e); process.exit(1); });
