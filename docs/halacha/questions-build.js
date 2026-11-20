#!/usr/bin/env node
/* מעיין — תמצית השאלות לרב.
 * מסמך קצר שמרכז את השאלות ההלכתיות הפתוחות, ולצד כל שאלה: מה מעיין עושה, מקורות, ולוח עברי קטן.
 * כל לוח מחושב במנוע עצמו (src/core.js): לכל שאלה מורץ calculate() על תרחיש קטן, כמו ב-build.js,
 * והסימונים בלוח נלקחים מתוצאות המנוע. רק סימוני "?" (המחלוקת) נקבעים כאן ביד.
 * תאריכים עבריים בלבד.
 *
 * הרצה:  node docs/halacha/questions-build.js            (HTML ו-PDF)
 *        node docs/halacha/questions-build.js --no-pdf   (HTML בלבד)
 *        node docs/halacha/questions-build.js --shots DIR (גם צילומי עמודים, deviceScaleFactor 2)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const M = require(path.join(ROOT, "src", "core.js"));
const OUT_HTML = path.join(__dirname, "questions.html");
const OUT_PDF = path.join(__dirname, "questions.pdf");
const warnings = [];
const expect = (cond, msg) => { if (!cond) warnings.push(msg); };
M.setLang("he");

/* ---------- עזרים ---------- */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const Y = 5787;
const NISAN = 1, IYYAR = 2, SIVAN = 3, TAMUZ = 4, AV = 5, CHESHVAN = 8, KISLEV = 9, SHVAT = 11, ADAR_I = 12;
const N = (d, m, y = Y) => M.toISO(new M.HDate(d, m, y).greg());
const A = (d, m, y = Y) => new M.HDate(d, m, y).abs();
/** יום עברי קצר: "כ״ט אייר" */
const hs = abs => { const h = new M.HDate(abs); return `${M.gematriya(h.getDate())} ${h.monthName()}`; };
const onahHe = o => o === "day" ? "יום" : "לילה";
const CITY = "jerusalem", TZ = M.city(CITY).tz;
const hm = inst => M.timeInZone(inst, TZ);

let idCounter = 0;
const ev = (type, date, time, extra = {}) => ({ id: `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`, type, date, time, cityId: CITY, result: "clear", note: "", authorityNote: "", createdAt: "2026-01-01T00:00:00Z", ...extra });

const PRESETS = { ashkenaz: "אשכנז", sefard: "הרב עובדיה יוסף (ספרדי)" };
const SHORT = { ashkenaz: "אשכנז", sefard: "ספרדי" };
const settingsFor = (pk, extra = {}) => ({ ...M.applyPreset({ ...M.SETTING_DEFAULTS, checklist: [], cityId: CITY }, pk), ...extra });

/** מריץ את המנוע על תרחיש ומחזיר את התוצאה ואת הסימונים ללוח */
function run(pk, events, nowDate, extra = {}) {
  const st = M.emptyState();
  st.settings = settingsFor(pk, extra);
  st.events = events;
  const parsed = M.parseState(st);
  const r = M.calculate(parsed, M.localInstant(nowDate, "12:00", TZ));
  const KIND = { average: "avg", monthly: "mon", interval: "int", "or-zarua": "oz", mikvah: "mik" };
  const marks = [];
  for (const p of r.plans) {
    const k = KIND[p.kind]; if (!k) continue;
    const abs = M.isoAbs(p.date) + (p.onah === "day" ? 0 : 1);
    marks.push({ kind: k, abs, onah: p.onah === "day" ? "day" : "night", title: p.title });
  }
  const nf = parsed.settings.nightfall, bhs = parsed.settings.beinHashmashot !== "flag";
  const flows = [];
  for (const e of events.filter(e => e.type === "flow")) {
    const s = M.stamp(e, nf);
    flows.push(s);
    marks.push({ kind: "see", abs: s.abs, onah: s.onah, title: "ראייה" });
    if (s.alt && bhs) marks.push({ kind: "see", abs: s.alt.abs, onah: s.alt.onah, alt: true, title: "ראייה · העונה הסמוכה" });
  }
  const hef = r.earliestHefsek ? M.isoAbs(r.earliestHefsek) : null;
  if (hef) marks.push({ kind: "hef", abs: hef, onah: "day", title: "הפסק מוקדם" });
  return { r, marks, flows, hef, settings: parsed.settings, has: (kind, abs, onah) => marks.some(m => m.kind === kind && m.abs === abs && (!onah || m.onah === onah)) };
}

/* ---------- סימנים (SVG) ---------- */
const COL = { see: "#e5484d", avg: "#b8336a", mon: "#c06a00", int: "#4f3fd0", oz: "#5f5666", hef: "#1f8a5b", mik: "#0c6b68", q: "#c42b45" };
const NAME = { see: "ראייה", avg: "עונה בינונית", mon: "עונת החודש", int: "הפלגה", oz: "אור זרוע", hef: "הפסק טהרה מוקדם", mik: "ליל טבילה" };
function shape(kind, { ghost = false, size = 14 } = {}) {
  const c = COL[kind], d = ghost ? ` stroke-dasharray="1.6 1.1"` : "";
  const w = (s) => `<svg class="mk${ghost ? " ghost" : ""}" width="${size}" height="${size}" viewBox="0 0 10 10" aria-hidden="true">${s}</svg>`;
  switch (kind) {
    case "see": return w(ghost ? `<path d="M5 .9C5 .9 1.7 4.9 1.7 6.6a3.3 3.3 0 0 0 6.6 0C8.3 4.9 5 .9 5 .9Z" fill="#fff" stroke="${c}" stroke-width="1.2"${d}/>` : `<path d="M5 .9C5 .9 1.7 4.9 1.7 6.6a3.3 3.3 0 0 0 6.6 0C8.3 4.9 5 .9 5 .9Z" fill="${c}"/>`);
    case "avg": return w(`<circle cx="5" cy="5" r="3.7" fill="#fff" stroke="${c}" stroke-width="1.5"${d}/>`);
    case "mon": return w(`<polygon points="5,.9 9.3,8.8 .7,8.8" fill="#fff" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"${d}/>`);
    case "int": return w(`<rect x="1.3" y="1.3" width="7.4" height="7.4" fill="#fff" stroke="${c}" stroke-width="1.5"${d}/>`);
    case "oz": return w(`<polygon points="5,1.4 8.6,5 5,8.6 1.4,5" fill="#fff" stroke="${c}" stroke-width="1.2"${d}/>`);
    case "hef": return w(`<path d="M1.3 5.4 4 8 8.8 2" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"${d}/>`);
    case "mik": return w(`<path d="M.8 3.6q1.05-1.4 2.1 0t2.1 0 2.1 0 2.1 0M.8 7q1.05-1.4 2.1 0t2.1 0 2.1 0 2.1 0" fill="none" stroke="${c}" stroke-width="1.3"${d}/>`);
    default: return "";
  }
}
const SUN = `<svg class="og" width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="2.1" fill="#3b3438"/><g stroke="#3b3438" stroke-width="1.1" stroke-linecap="round"><path d="M5 .5v1.4M5 8.1v1.4M.5 5h1.4M8.1 5h1.4M1.8 1.8l1 1M7.2 7.2l1 1M1.8 8.2l1-1M7.2 2.8l1-1"/></g></svg>`;
const MOON = `<svg class="og" width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M6.6 .9A4.3 4.3 0 1 0 9.2 7 3.5 3.5 0 0 1 6.6 .9Z" fill="#3b3438"/></svg>`;
const glyph = o => o === "day" ? SUN : MOON;

/* ---------- לוח חודש קטן ----------
 * opts: { label, from, to, anchor, marks, ghosts: [{abs,kind,onah}], q: [abs], tint: {abs: "nid"|"cln"}, kinds } */
const WDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
function grid(o) {
  const kinds = o.kinds || ["see", "avg", "mon", "int", "oz", "hef", "mik"];
  const marks = (o.marks || []).filter(m => kinds.includes(m.kind));
  const ghosts = o.ghosts || [], qs = new Set(o.q || []), tint = o.tint || {};
  const start = o.from - (o.from % 7), end = o.to + (6 - (o.to % 7));
  const ORDER = ["see", "hef", "avg", "mon", "int", "oz", "mik"];
  const half = (abs, onah) => {
    const list = [...marks.filter(m => m.abs === abs && m.onah === onah).map(m => ({ ...m, ghost: !!m.alt })), ...ghosts.filter(g => g.abs === abs && g.onah === onah).map(g => ({ ...g, ghost: true }))];
    const seen = new Set(), uniq = list.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).filter(m => { const k = m.kind + m.ghost; if (seen.has(k)) return false; seen.add(k); return true; });
    return uniq.length ? `<span class="h ${onah}">${glyph(onah)}${uniq.map(m => shape(m.kind, { ghost: m.ghost })).join("")}</span>` : `<span class="h ${onah}"></span>`;
  };
  let rows = "";
  for (let w = start; w <= end; w += 7) {
    let tds = "";
    for (let abs = w; abs < w + 7; abs++) {
      const inR = abs >= o.from && abs <= o.to, h = new M.HDate(abs), d = h.getDate();
      const mlabel = inR && (d === 1 || abs === o.from) ? `<span class="mn">${esc(h.monthName())}</span>` : "";
      const cnt = inR && abs >= o.anchor ? `<span class="ct">${abs - o.anchor + 1}</span>` : "";
      const cls = [inR ? "" : "out", tint[abs] ? "t-" + tint[abs] : "", qs.has(abs) ? "q" : "", d === 1 && inR ? "m1" : ""].filter(Boolean).join(" ");
      tds += `<td class="${cls}"><div class="top"><span class="dn">${M.gematriya(d)}</span>${mlabel}${cnt}</div>${inR ? `<div class="mks">${half(abs, "night")}${half(abs, "day")}</div>` : ""}${qs.has(abs) ? `<span class="qm">?</span>` : ""}</td>`;
    }
    rows += `<tr>${tds}</tr>`;
  }
  return `<figure class="cal">${o.label ? `<figcaption>${esc(o.label)}</figcaption>` : ""}<table><thead><tr>${WDAYS.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></figure>`;
}
/** שורת מקרא מתחת ללוח: הסימנים שהמנוע הפיק, בתאריך עברי */
function markLine(marks, kinds, from = -Infinity, to = Infinity) {
  const by = new Map();
  for (const m of marks.filter(m => kinds.includes(m.kind) && m.kind !== "see" && m.abs >= from && m.abs <= to)) {
    const key = m.kind === "int" ? m.title.replace(/^אור זרוע · /, "") : m.kind === "avg" ? m.title : NAME[m.kind];
    const t = `${m.onah === "day" ? "" : "ליל "}${hs(m.abs)}`;
    if (!by.has(key)) by.set(key, { kind: m.kind, list: [] });
    if (!by.get(key).list.includes(t)) by.get(key).list.push(t);
  }
  return [...by.entries()].map(([k, v]) => `<span class="ml">${shape(v.kind)} ${esc(k.replace("עונה בינונית · ", "בינונית "))}: ${esc(v.list.join(", "))}</span>`).join("");
}
/** שבעה נקיים: צבע רקע לימי הנידה עד ההפסק, ולשבעת הימים שאחריו */
function tints(fromAbs, hefAbs, clean = true) {
  const t = {};
  for (let a = fromAbs; a <= hefAbs; a++) t[a] = "nid";
  if (clean) for (let a = hefAbs + 1; a <= hefAbs + 7; a++) t[a] = "cln";
  return t;
}

/* ---------- סרגל זמנים ---------- */
function timebar({ points, ranges = [], from, to, width = 560 }) {
  const x = t => 20 + (width - 40) * (1 - (t - from) / (to - from)); // ימין = מוקדם (RTL)
  // תוויות הנקודות מעל הציר, במדרגות כשהן קרובות זו לזו
  const pts = points.map(p => ({ ...p, xx: x(p.t) })).sort((a, b) => b.xx - a.xx), lastAt = [];
  for (const p of pts) { let lv = 0; while (lastAt[lv] !== undefined && Math.abs(lastAt[lv] - p.xx) < 78) lv++; lastAt[lv] = p.xx; p.lv = lv; }
  const levels = Math.max(1, ...pts.map(p => p.lv + 1)), y = 12 + levels * 24, H = y + 16 + ranges.length * 22;
  let s = `<line x1="8" y1="${y}" x2="${width - 8}" y2="${y}" stroke="#bdb2b8" stroke-width="1.3"/>`;
  ranges.forEach((r, i) => {
    const yy = y + 12 + i * 22, x1 = x(r.to), x2 = x(r.from);
    s += `<line x1="${x1}" y1="${yy}" x2="${x2}" y2="${yy}" stroke="${r.color}" stroke-width="4" ${r.dash ? `stroke-dasharray="5 3"` : ""} stroke-linecap="round"/><text x="${(x1 + x2) / 2}" y="${yy + 13}" font-size="9.5" fill="${r.color}" text-anchor="middle">${esc(r.label)}</text>`;
  });
  for (const p of pts) {
    const c = p.color || "#3b3438", ty = y - 8 - p.lv * 24;
    s += `<line x1="${p.xx}" y1="${ty + 3}" x2="${p.xx}" y2="${y + 5}" stroke="${c}" stroke-width="${p.bold ? 2.4 : 1.3}"/>`;
    s += `<text x="${p.xx}" y="${ty - 10}" font-size="9.5" text-anchor="middle" fill="${c}">${esc(p.label)}</text><text x="${p.xx}" y="${ty}" font-size="9.5" text-anchor="middle" font-weight="700" fill="${c}">${esc(hm(p.t))}</text>`;
  }
  return `<svg class="tb" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">${s}</svg>`;
}

/* ---------- מקורות ---------- */
const SEC = "סיכום הלכות נידה לרבנות (משני)";
const src = list => list.map(s => `«${esc(s)}»`).join("; ");

/* ---------- השאלות ---------- */
const QS = [];
const Qn = (o) => QS.push(o);
const both = (a, s) => `<b>אשכנז:</b> ${a} <span class="sep">|</span> <b>ספרדי:</b> ${s}`;
const pair = (gA, gS) => `<div class="cals">${gA}${gS}</div>`;

/* 1. ל׳ בחודש, החודש הבא חסר */
function q1() {
  idCounter = 100;
  const evs = [ev("flow", N(30, NISAN), "10:00")], see = A(30, NISAN);
  const ra = run("ashkenaz", evs, N(5, IYYAR)), rs = run("sefard", evs, N(5, IYYAR));
  const mon = ra.marks.find(m => m.kind === "mon" && !/נוספת/.test(m.title)), monS = rs.marks.find(m => m.kind === "mon");
  expect(mon && monS && mon.abs === A(1, SIVAN) && monS.abs === mon.abs, "שאלה 1: עונת החודש אינה בא׳ סיון");
  const avg = rs.marks.find(m => m.kind === "avg");
  const kinds = ["see", "avg", "mon"];
  Qn({
    title: "ראתה ביום ל׳, והחודש הבא חסר",
    ask: `ראתה ביום ל׳ בחודש (א׳ דראש חודש), והחודש שאחריו חסר ואין בו יום ל׳. האם חוששת לעונת החודש ביום א׳ של החודש שלאחריו, ״שמא תקבע וסת לראש חודש״? ואם כן, האם דווקא כשהראייה הראשונה נמשכה גם בל׳ וגם בא׳, כספק ההיכל שלמה?`,
    does: `בשתי השיטות: עונת החודש ב<b>${hs(mon.abs)}</b> (א׳ בחודש שלאחר החודש החסר), באותה עונה. העונה הבינונית (יום 30) חלה ממילא ב${hs(avg.abs)}.`,
    src: src(["ערוך השולחן קפט, יא–יב, כח", `${SEC}, בשם היכל שלמה בשם הב״ח`]),
    fig: grid({ label: "אשכנז וספרדי (זהה)", from: see, to: mon.abs, anchor: see, marks: rs.marks, kinds, q: [mon.abs] }),
    legend: markLine(rs.marks, kinds),
  });
}
/* 2. ל׳ בחודש, החודש הבא מלא */
function q2() {
  idCounter = 200;
  const evs = [ev("flow", N(30, SHVAT), "10:00")], see = A(30, SHVAT);
  const ra = run("ashkenaz", evs, N(5, ADAR_I)), rs = run("sefard", evs, N(5, ADAR_I));
  const mon = rs.marks.find(m => m.kind === "mon"), nextFirst = A(1, ADAR_I + 1);
  expect(mon && mon.abs === A(30, ADAR_I) && ra.has("mon", mon.abs, "day"), "שאלה 2: עונת החודש אינה בל׳ אדר א׳");
  const extra = [ra, rs].some(x => x.has("mon", nextFirst));
  expect(!extra, "שאלה 2: המנוע חושש גם לא׳ אדר ב׳");
  const kinds = ["see", "avg", "mon"];
  Qn({
    title: "ראתה ביום ל׳, והחודש הבא מלא (ראש חודש שני ימים)",
    ask: `ראתה ביום ל׳ (א׳ דר״ח), והחודש הבא מלא. חוששת לל׳ בחודש הבא. האם צריכה לחוש גם לא׳ בחודש שאחריו, שהוא היום השני דראש חודש (״בשני ימים דר״ח״)?`,
    does: `בשתי השיטות: עונת החודש <b>בל׳ בלבד</b> (${hs(mon.abs)}). אין חשש ב${hs(nextFirst)}${extra ? " — (שימו לב: המנוע כן חושש)" : ""}.`,
    src: src(["ערוך השולחן קפט, כח", "ט״ז קפט, ס״ק יד"]),
    fig: grid({ label: "אשכנז וספרדי (זהה)", from: see, to: nextFirst, anchor: see, marks: rs.marks, kinds, q: [nextFirst], ghosts: [{ abs: nextFirst, kind: "mon", onah: "day" }] }),
    legend: markLine(rs.marks, kinds),
  });
}
/* 3. עונה בינונית: יום 30 או 31 */
function q3() {
  idCounter = 300;
  const evs = [ev("flow", N(5, TAMUZ), "10:00")], see = A(5, TAMUZ), d30 = see + 29, d31 = see + 30;
  const ra = run("ashkenaz", evs, N(8, TAMUZ)), rs = run("sefard", evs, N(8, TAMUZ));
  expect(ra.has("avg", d30) && ra.has("avg", d31) && rs.has("avg", d30) && !rs.has("avg", d31), "שאלה 3: ימים 30/31 אינם כצפוי");
  const kinds = ["see", "avg", "mon"];
  Qn({
    title: "עונה בינונית: יום 30 או יום 31",
    ask: `עונה בינונית — ביום ל׳ לראייתה (ספירה כוללנית), או ביום ל״א, או שתחוש לשניהם?`,
    does: both(`יום 30 <b>וגם</b> יום 31 (${hs(d30)} ו${hs(d31)}).`, `יום 30 בלבד (${hs(d30)}).`),
    src: src(["שו״ע יו״ד קפט, א", "ב״י, ב״ח, ט״ז — יום ל׳", "חוות דעת קפט, ס״ק יב — יום ל״א", "ש״ך קפט, ס״ק ל — עונה בינונית היא עונת החודש (ל״א)", `${SEC} — שבט הלוי: לחומרא שניהם`]),
    fig: pair(grid({ label: PRESETS.ashkenaz, from: d30 - 13, to: d31 + 1, anchor: see, marks: ra.marks, kinds, q: [d31] }),
      grid({ label: PRESETS.sefard, from: d30 - 13, to: d31 + 1, anchor: see, marks: rs.marks, kinds, q: [d31], ghosts: [{ abs: d31, kind: "avg", onah: "day" }] })),
    legend: `ראייה: ${hs(see)}, ביום. ` + markLine(ra.marks, kinds),
  });
}
/* 4. עונה בינונית: עונה אחת או מעת לעת */
function q4() {
  idCounter = 400;
  const evs = [ev("flow", N(5, TAMUZ), "22:00")];
  const ra = run("ashkenaz", evs, N(9, TAMUZ)), rs = run("sefard", evs, N(9, TAMUZ));
  const see = ra.flows[0].abs, d30 = see + 29;
  expect(ra.flows[0].onah === "night", "שאלה 4: הראייה אינה בלילה");
  expect(rs.has("avg", d30, "night") && !rs.has("avg", d30, "day") && ra.has("avg", d30, "night") && !ra.has("avg", d30, "day"), "שאלה 4: העונה הבינונית אינה עונה אחת");
  const kinds = ["see", "avg", "oz"], gh = [{ abs: d30, kind: "avg", onah: "day" }];
  Qn({
    title: "עונה בינונית: עונה אחת או מעת לעת",
    ask: `בעונה בינונית, האם די לפרוש בעונה שבה ראתה (יום או לילה), או שצריך לפרוש מעת לעת שלם, לילה ויום, כדעת כרתי ופלתי?`,
    does: `בשתי השיטות: <b>העונה של הראייה בלבד</b>. בדוגמה ראתה בליל ${hs(see)}, ולכן פורשים בליל ${hs(d30)} ולא ביומו. (באשכנז אור זרוע מוסיף את היום שלפניו, ${hs(d30 - 1)}, ולא את היום שאחריו.)`,
    src: src(["שו״ע יו״ד קפט, א", "כרתי ופלתי — מעת לעת (בדי השלחן)", "ב״ח; סדרי טהרה — עונה אחת", `טהרת הבית — עונה אחת (${SEC})`]),
    fig: pair(grid({ label: PRESETS.ashkenaz, from: d30 - 6, to: d30 + 1, anchor: see, marks: ra.marks, kinds, q: [d30], ghosts: gh }),
      grid({ label: PRESETS.sefard, from: d30 - 6, to: d30 + 1, anchor: see, marks: rs.marks, kinds, q: [d30], ghosts: gh })),
    legend: `ראייה: ליל ${hs(see)}. ` + markLine(ra.marks, ["avg", "oz"]),
  });
}
/* 5. אור זרוע */
function q5() {
  idCounter = 500;
  const evs = [ev("flow", N(5, IYYAR), "10:00")], see = A(5, IYYAR), d30 = see + 29, d31 = see + 30;
  const ra = run("ashkenaz", evs, N(8, IYYAR)), rs = run("sefard", evs, N(8, IYYAR));
  expect(ra.has("oz", d30, "night") && !ra.has("oz", d31, "night") && !rs.marks.some(m => m.kind === "oz"), "שאלה 5: אור זרוע אינו כצפוי");
  const kinds = ["see", "avg", "mon", "oz"];
  Qn({
    title: "עונת אור זרוע",
    ask: `האם חוששת גם לעונה שלפני עונת הווסת (אור זרוע)? לספרדים — כטהרת הבית שאין חוששים, או כבן איש חי שחשש לה? ולמי ששומרת יום 31, האם צריך אור זרוע גם לפניו?`,
    does: both(`אור זרוע לפני יום 30, עונת החודש וההפלגה; <b>לא</b> לפני יום 31.`, `אין אור זרוע כלל.`),
    src: src(["ש״ך קפד, ס״ק ז", "ט״ז קפד, ס״ק ב (חולק)", "בן איש חי, שנה ב, צו, א (״אך צריך לחוש לדעה זו השניה״)", "טהרת הבית (המקום לא אומת)"]),
    fig: pair(grid({ label: PRESETS.ashkenaz, from: d30 - 6, to: d31 + 1, anchor: see, marks: ra.marks, kinds, q: [d31], ghosts: [{ abs: d31, kind: "oz", onah: "night" }] }),
      grid({ label: PRESETS.sefard, from: d30 - 6, to: d31 + 1, anchor: see, marks: rs.marks, kinds, q: [d30], ghosts: [{ abs: d30, kind: "oz", onah: "night" }] })),
    legend: `ראייה: ${hs(see)}, ביום. ` + markLine(ra.marks, ["avg", "mon", "oz"]),
  });
}
/* 6. שימור הפלגה ארוכה */
function q6() {
  idCounter = 600;
  const evs = [ev("flow", N(3, CHESHVAN), "10:00"), ev("flow", N(7, KISLEV), "10:00"), ev("flow", N(28, KISLEV), "10:00")];
  const now = N(3, 10);
  const ra = run("ashkenaz", evs, now), rs = run("sefard", evs, now), rx = run("ashkenaz", evs, now, { carryLongIntervals: false });
  const see = A(28, KISLEV), ints = m => m.marks.filter(x => x.kind === "int").map(x => x.title + x.abs).sort().join();
  const long = ra.marks.find(m => m.kind === "int" && /35/.test(m.title));
  expect(long && ints(ra) === ints(rs) && !rx.marks.some(m => m.kind === "int" && m.abs === long.abs), "שאלה 6: שימור ההפלגה אינו כצפוי");
  expect(rs.settings.carryLongIntervals === true, "שאלה 6: בשיטה הספרדית השימור כבוי");
  const kinds = ["see", "int"];
  Qn({
    title: "שימור הפלגה ארוכה שלא נעקרה",
    ask: `ראתה בהפלגה ארוכה, ואחר כך בהפלגה קצרה ממנה. האם חוששת עדיין להפלגה הארוכה (כדעת הט״ז), או שנעקרה מיד בראייה שקדמה לה (ב״ח, ש״ך, סדרי טהרה, חוות דעת, רעק״א)? ואם חוששת — עד מתי?`,
    does: `<b>שתי השיטות שומרות</b> את ההפלגה הארוכה (35) לצד הקצרה (22), כל עוד כל ההפלגות שאחריה קצרות ממנה. בלי השימור היה נשאר רק ${hs(see + 21)}.`,
    src: src(["שו״ע יו״ד קפט, ב (״נעקר בפעם אחת״)", "רמ״א קפט, יג", `${SEC}: ט״ז מול ב״ח, ש״ך, סדרי טהרה, חוות דעת, רעק״א`]),
    fig: grid({ label: "אשכנז וספרדי (זהה)", from: see, to: long.abs + 1, anchor: see, marks: ra.marks, kinds, q: [long.abs] }),
    legend: `ראיות: ${hs(A(3, CHESHVAN))}, ${hs(A(7, KISLEV))} (הפלגה 35), ${hs(see)} (הפלגה 22). ` + markLine(ra.marks, ["int"]),
  });
}
/* 7. מקרה הרמ״א */
function q7() {
  idCounter = 700;
  const evs = [ev("flow", N(1, NISAN), "10:00"), ev("flow", N(20, NISAN), "10:00"), ev("flow", N(1, IYYAR), "10:00")];
  const ra = run("ashkenaz", evs, N(3, IYYAR)), rs = run("sefard", evs, N(3, IYYAR));
  const anchor = A(20, NISAN), t9 = A(9, IYYAR), to = A(21, IYYAR);
  const any9 = [ra, rs].some(x => x.marks.some(m => m.abs === t9 && m.kind !== "see"));
  expect(!any9, "שאלה 7: המנוע חושש לט׳ אייר");
  const kinds = ["see", "int", "mon"];
  const intList = ra.marks.filter(m => m.kind === "int").map(m => `${m.title.replace("הפלגה · ", "").replace(" ימים", "")} → ${hs(m.abs)}`).join(", ");
  Qn({
    title: "מקרה הרמ״א: א׳ ניסן, כ׳ ניסן, א׳ אייר",
    ask: `ראתה בא׳ ניסן ובכ׳ ניסן, ואחר כך בא׳ אייר. האם חוששת לט׳ אייר, שהוא יום כ׳ מראיית כ׳ ניסן (ההפלגה של 20 יום, ממשיכה מהראייה האמצעית)?`,
    does: `בשתי השיטות: <b>אין חשש בט׳ אייר</b>. המנוע סופר הפלגות רק מהראייה האחרונה (${intList}), ושומר את עונת החודש של כ׳ ניסן (${hs(A(20, IYYAR))}).`,
    src: src(["שו״ע יו״ד קפט, יג (רמ״א)", `${SEC}: רמ״א, ט״ז, באר היטב — חוששת; ב״י, ב״ח, ש״ך — אינה חוששת; שבט הלוי — תלוי במקרה`]),
    fig: grid({ label: "אשכנז וספרדי (זהה)", from: anchor, to, anchor, marks: ra.marks, kinds, q: [t9], ghosts: [{ abs: t9, kind: "int", onah: "day" }] }),
    legend: `המספר הקטן: ימים מכ׳ ניסן. ` + markLine(ra.marks, ["int", "mon"], anchor, to),
  });
}
/* 8. נמצא דם בקימה */
function q8() {
  idCounter = 800;
  const date = N(12, KISLEV), s = M.sun(date, M.city(CITY), 8.5);
  const before = hm(new Date(s.sunrise.valueOf() - 20 * 60000)), after = hm(new Date(s.sunrise.valueOf() + 40 * 60000));
  const a1 = run("ashkenaz", [ev("flow", date, before)], N(14, KISLEV)), a2 = run("ashkenaz", [ev("flow", date, after)], N(14, KISLEV));
  expect(a1.flows[0].onah === "night" && a2.flows[0].onah === "day", "שאלה 8: שיוך הקימה אינו כצפוי");
  const tb = timebar({ from: s.dawn.valueOf() - 30 * 60000, to: s.sunrise.valueOf() + 75 * 60000, points: [
    { t: s.dawn, label: "עלות השחר", up: true },
    { t: new Date(s.sunrise.valueOf() - 20 * 60000), label: `מצאה ← ליל ${hs(a1.flows[0].abs)}`, color: COL.see, up: false },
    { t: s.sunrise, label: "זריחה", bold: true, up: true },
    { t: new Date(s.sunrise.valueOf() + 40 * 60000), label: `מצאה ← יום ${hs(a2.flows[0].abs)}`, color: COL.see, up: false }],
    ranges: [{ from: s.dawn.valueOf() - 30 * 60000, to: s.sunrise.valueOf(), color: "#5f5666", label: "עונת לילה" }] });
  Qn({
    title: "מצאה דם בקימה, ואין ידוע מתי התחיל",
    ask: `קמה בבוקר ומצאה דם, ואין ידוע אם התחיל בלילה או ביום. לאיזו עונה תחוש? (ספר האשכול ושבט הלוי: אם ברור שהתחיל בלילה — עונת לילה, ואם לאו — עונת יום.)`,
    does: `אין אפשרות ״זמן לא ידוע״: שעה היא שדה חובה, והעונה נקבעת לפי השעה שנרשמה. מצאה לפני הזריחה (${before}) — <b>עונת לילה</b>; אחריה (${after}) — עונת יום. ראייה ״מסופקת״ מבטלת את כל העונות, אבל אינה זמינה ברישום ראייה. <b>הצעה:</b> אפשרות ״נמצא בקימה״ שנותנת עונת יום.`,
    src: src(["שו״ע יו״ד קפד, ד (״לא קים לן... אינה אסורה אלא ביום״)", `${SEC}, בשם ספר האשכול ושבט הלוי`]),
    fig: `<div class="tbw">${tb}<div class="cap">שעות ${esc(hs(M.isoAbs(date)))}, ירושלים</div></div>`,
    wide: true,
  });
}
/* 9. בין השמשות */
function q9() {
  idCounter = 900;
  const date = N(12, KISLEV), s = M.sun(date, M.city(CITY), 8.5), t = hm(new Date(s.sunset.valueOf() + 8 * 60000));
  const evs = [ev("flow", date, t)];
  const ra = run("ashkenaz", evs, N(14, KISLEV)), rs = run("sefard", evs, N(14, KISLEV));
  const f = ra.flows[0], early = f.alt.abs, late = f.abs;
  expect(f.twilight && ra.hef === late + 4 && rs.hef === late + 3, "שאלה 9: ההמתנה בבין השמשות אינה מהיום המאוחר");
  const kinds = ["see", "hef"];
  Qn({
    title: "ראייה בבין השמשות",
    ask: `ראתה בין השקיעה לצאת הכוכבים. האם חוששת לשתי העונות (יום שלפני השקיעה ולילה שאחריה), ומאיזה יום מונים את ימי ההמתנה לפני ההפסק?`,
    does: `בשתי השיטות: <b>חוששת לשתי העונות</b> בכל חשש (בינונית, חודש, הפלגה), וההמתנה נספרת <b>מהיום המאוחר</b> (${hs(late)}): הפסק מוקדם — ${both(hs(ra.hef), hs(rs.hef))}.`,
    src: src(["ש״ך קפד, ס״ק יג–יד (בשם הב״ח)", "שו״ע יו״ד קצו, יא; רמ״א שם"]),
    fig: pair(grid({ label: PRESETS.ashkenaz, from: early, to: early + 6, anchor: early, marks: ra.marks, kinds, q: [ra.hef], tint: tints(early, ra.hef, false) }),
      grid({ label: PRESETS.sefard, from: early, to: early + 6, anchor: early, marks: rs.marks, kinds, q: [rs.hef], tint: tints(early, rs.hef, false) })),
    legend: `ראתה ${t}, 8 דקות אחרי השקיעה ב${hs(early)}: טיפה מלאה — העונה שנקבעה (ליל ${hs(late)}); טיפה חלולה — העונה הסמוכה (יום ${hs(early)}).`,
  });
}
/* 10. סוף עונת היום */
function q10() {
  const date = N(15, KISLEV), c = M.city(CITY), s = M.sun(date, c, 8.5), w = M.onahWindow(M.isoAbs(date), "day", c, "8.5");
  expect(w.start.valueOf() === s.sunrise.valueOf() && w.end.valueOf() === s.sunset.valueOf(), "שאלה 10: עונת היום אינה מהזריחה עד השקיעה");
  const tb = timebar({ from: s.dawn.valueOf() - 20 * 60000, to: s.nightfall.valueOf() + 20 * 60000, points: [
    { t: s.dawn, label: "עלות השחר", up: true }, { t: s.sunrise, label: "זריחה", up: false }, { t: s.sunset, label: "שקיעה", up: true, bold: true }, { t: s.nightfall, label: "צאת הכוכבים", up: false }],
    ranges: [{ from: w.start.valueOf(), to: w.end.valueOf(), color: COL.avg, label: "מעיין" }, { from: s.dawn.valueOf(), to: s.nightfall.valueOf(), color: "#5f5666", dash: true, label: "ערוה״ש" }] });
  Qn({
    title: "גבולות עונת היום",
    ask: `עונת יום — מהזריחה עד השקיעה, או שיש להחמיר משני הצדדים, מעלות השחר עד צאת הכוכבים?`,
    does: `בשתי השיטות: עונת יום <b>מהזריחה עד השקיעה</b> (${hm(w.start)}–${hm(w.end)} ב${hs(M.isoAbs(date))}). בין השמשות נכלל רק בעונת הלילה שאחריה.`,
    src: src(["שו״ע יו״ד קפד, ב", `${SEC}: חוות דעת, טהרת הבית, שבט הלוי — מהנץ עד השקיעה; ערוך השולחן — לחומרא משני הצדדים`]),
    fig: `<div class="tbw">${tb}<div class="cap">${esc(hs(M.isoAbs(date)))}, ירושלים</div></div>`,
    wide: true,
  });
}
/* 11. עונת חודש קודמת בתוך ימי הנידה */
function q11() {
  idCounter = 1100;
  const evs = [ev("flow", N(20, CHESHVAN), "10:00"), ev("hefsek", N(25, CHESHVAN), "14:00"), ev("mikvah", N(2, KISLEV), "19:00"), ev("flow", N(19, KISLEV), "10:00")];
  const ra = run("ashkenaz", evs, N(21, KISLEV)), rs = run("sefard", evs, N(21, KISLEV));
  const see = A(19, KISLEV), t = A(20, KISLEV);
  expect(ra.has("mon", t) && rs.has("mon", t), "שאלה 11: עונת החודש הנוספת לא נשמרה");
  const kinds = ["see", "mon", "hef"], mk = r => r.marks.filter(m => m.abs >= see);
  Qn({
    title: "עונת חודש קודמת שחלה בימי הנידה של ראייה חדשה",
    ask: `ראתה בכ׳ חשון, ושוב בי״ט כסלו, יום אחד לפני עונת החודש של כ׳. האם צריך לשמור את עונת כ׳ כסלו, שחלה בתוך ימי הנידה של הראייה החדשה? (נפקא מינה לחשש עקירה ולקביעות.)`,
    does: `בשתי השיטות: <b>נשמרת</b> ״עונת חודש נוספת״ ב${hs(t)} (יום 2 לראייה). שימור עונת חודש בתוך דימום (carryMonthly) כבוי בשתיהן.`,
    src: src(["שו״ע יו״ד קפט, ב", "רמ״א קפט, יג"]),
    fig: pair(grid({ label: PRESETS.ashkenaz, from: see, to: see + 6, anchor: see, marks: mk(ra), kinds, q: [t], tint: tints(see, ra.hef, false) }),
      grid({ label: PRESETS.sefard, from: see, to: see + 6, anchor: see, marks: mk(rs), kinds, q: [t], tint: tints(see, rs.hef, false) })),
    legend: `ראיות: ${hs(A(20, CHESHVAN))}, ${hs(see)}.`,
  });
}
/* 12. ההמתנה לפני ההפסק */
function q12() {
  const date = N(12, KISLEV), see = A(12, KISLEV), out = {};
  for (const pk of ["ashkenaz", "sefard"]) {
    idCounter = 1200;
    const f = ev("flow", date, "10:00"), r0 = run(pk, [f], N(14, KISLEV));
    idCounter = 1200;
    const f2 = ev("flow", date, "10:00"), h = ev("hefsek", M.fromAbs(r0.hef), "14:00");
    const r = run(pk, [f2, h], M.fromAbs(r0.hef + 2));
    expect(r.r.hefsek && r.r.immersionDate, `שאלה 12: ההפסק לא התקבל (${pk})`);
    if (!r.has("hef", r0.hef)) r.marks.push({ kind: "hef", abs: r0.hef, onah: "day", title: "הפסק" });
    out[pk] = { r, hef: r0.hef, imm: M.isoAbs(r.r.immersionDate) };
  }
  const A_ = out.ashkenaz, S_ = out.sefard, bic = see + 5;
  expect(A_.hef === see + 4 && S_.hef === see + 3, "שאלה 12: ההמתנה אינה 5/4 ימים");
  const kinds = ["see", "hef", "mik"], to = A_.imm + 1;
  Qn({
    title: "ההמתנה לפני ההפסק בשיטה הספרדית",
    ask: `בשיטת הרב עובדיה יוסף: ארבעה ימים מתחילת הראייה, או 72 שעות מהתשמיש (טהרת הבית)? והבן איש חי (צו, ז; י) — הפסק ביום השישי לראייתה. מה לקבוע כברירת מחדל לספרדים?`,
    does: both(`חמישה ימים: הפסק מוקדם ב${hs(A_.hef)} (יום 5), טבילה במוצאי ${hs(A_.imm)}.`, `ארבעה ימים <b>מהראייה</b>: הפסק ב${hs(S_.hef)} (יום 4), טבילה במוצאי ${hs(S_.imm)}. ״72 שעות מהתשמיש״ קיימת כהגדרה, אך סופרת ימים ולא שעות.`),
    src: src(["רמ״א יו״ד קצו, יא", "שו״ע יו״ד קצו, יא", "טהרת הבית (המקום לא אומת)", "בן איש חי, שנה ב, צו, ז; י"]),
    fig: pair(grid({ label: PRESETS.ashkenaz, from: see, to, anchor: see, marks: A_.r.marks, kinds, tint: tints(see, A_.hef) }),
      grid({ label: PRESETS.sefard, from: see, to, anchor: see, marks: S_.r.marks, kinds, q: [bic], ghosts: [{ abs: bic, kind: "hef", onah: "day" }], tint: tints(see, S_.hef) })),
    legend: `ראייה: ${hs(see)}, ביום. ההפסק נרשם ביום המוקדם ביותר שהמנוע מתיר. ״?״ בספרדי: יום 6, כבן איש חי.`,
  });
}
/* 13. הפסק אחרי השקיעה */
function q13() {
  const date = N(16, KISLEV), c = M.city(CITY), s = M.sun(date, c, 8.5), lim = M.sun(date, c, "13.5z").nightfall;
  const t = new Date(s.sunset.valueOf() + Math.round((lim - s.sunset) / 2 / 60000) * 60000), out = {};
  for (const pk of ["ashkenaz", "sefard"]) { idCounter = 1300; out[pk] = run(pk, [ev("flow", N(12, KISLEV), "10:00"), ev("hefsek", date, hm(t))], N(18, KISLEV)); }
  const okA = !!out.ashkenaz.r.hefsek, okS = !!out.sefard.r.hefsek;
  expect(!okA && okS, "שאלה 13: קבלת ההפסק אחרי השקיעה אינה כצפוי");
  const tb = timebar({ from: s.sunset.valueOf() - 12 * 60000, to: lim.valueOf() + 12 * 60000, width: 440, points: [
    { t: s.sunset, label: "שקיעה", bold: true, up: true }, { t, label: `הפסק: ${okS ? "ספרדי מקבל" : "ספרדי דוחה"}, ${okA ? "אשכנז מקבל" : "אשכנז דוחה"}`, color: COL.hef, up: false }, { t: lim, label: "13.5 דק׳ זמניות", up: true }],
    ranges: [{ from: s.sunset.valueOf(), to: lim.valueOf(), color: COL.hef, label: "ספרדי: בדיעבד" }] });
  Qn({
    title: "הפסק טהרה אחרי השקיעה",
    ask: `הפסק שנעשה אחרי השקיעה — האם תקף בדיעבד עד 13.5 דקות זמניות (טהרת הבית), ונספר ליום שעבר? והאם בארץ ישראל השיעור קצר יותר?`,
    does: both(`רק לפני השקיעה; הפסק ב-${hm(t)} נדחה ומסומן לבירור.`, `לכתחילה לפני השקיעה; בדיעבד עד 13.5 דקות זמניות (${hm(lim)}), ונספר ל${hs(M.isoAbs(date))}.`),
    src: src(["שו״ע יו״ד קצו, א", "טהרת הבית ח״ב, עמ׳ רעח", "אגרות משה יו״ד ח״ד, יז, כו"]),
    fig: `<div class="tbw">${tb}<div class="cap">${esc(hs(M.isoAbs(date)))}, ירושלים</div></div>`,
    wide: true,
  });
}
/* 14. צאת הכוכבים לליל טבילה בשיטה הספרדית */
function q14() {
  const date = N(22, KISLEV), c = M.city(CITY), v = k => M.sun(date, c, k).nightfall, s = M.sun(date, c, 8.5);
  expect(settingsFor("sefard").nightfall === "20m" && settingsFor("ashkenaz").nightfall === "8.5", "שאלה 14: צאת הכוכבים בשיטות השתנה");
  const tb = timebar({ from: s.sunset.valueOf() - 6 * 60000, to: v("8.5").valueOf() + 6 * 60000, width: 520, points: [
    { t: s.sunset, label: "שקיעה", up: true, bold: true }, { t: v("13.5z"), label: "13.5 זמניות", up: false }, { t: v("18m"), label: "18 דק׳", up: true },
    { t: v("20m"), label: "20 דק׳ ← ספרדי", up: false, color: COL.mik, bold: true }, { t: v("8.5"), label: "8.5° ← אשכנז", up: true, color: COL.avg, bold: true }] });
  Qn({
    title: "צאת הכוכבים לליל הטבילה בשיטה הספרדית",
    ask: `מאיזו שעה טובלת בשיטת הרב עובדיה יוסף: 13.5 דקות זמניות (שיטת הגאונים), 18 או 20 דקות, או לפי מעלות? וממתי ראייה אחרי השקיעה היא לילה ודאי?`,
    does: both(`8.5° (${hm(v("8.5"))}).`, `<b>20 דקות</b> אחרי השקיעה (${hm(v("20m"))}) — ערך זמני. ראייה בין 13.5 דקות זמניות ל-20 דקות נחשבת ספק (שתי העונות).`),
    src: src(["טהרת הבית — צאת הכוכבים לשיטת הגאונים (המקום לא אומת)"]),
    fig: `<div class="tbw">${tb}<div class="cap">מוצאי ${esc(hs(M.isoAbs(date)))}, ירושלים</div></div>`,
    wide: true,
  });
}
/* 15. שאלות קצרות */
const SHORT_QS = () => {
  const dflt = M.SETTING_DEFAULTS;
  expect(dflt.method === "custom" && dflt.day31 === false && dflt.orZarua === false && dflt.carryLongIntervals === false, "שאלה 15: ברירת המחדל השתנתה");
  return [
    ["בדיקת הבוקר", "בדיקה נספרת מעלות השחר (16.1°), ואם אין עלות השחר — מהזריחה; בוקר וערב מוכרעים לפי חצות היום. האם השיעור והחלוקה נכונים?"],
    ["ראייה בשבעה נקיים", "״ראייה״ מחייבת המתנה מלאה ויוצרת עונות (כולל הפלגה קצרה); ״חידוש ספירה לפי הוראה״ אינו מחייב המתנה ואינו יוצר עונות. מה הדין בהמתנה ובעונות?"],
    ["יום טוב שני", "ארץ ישראל או חו״ל נקבע לפי אזור הזמן (ירושלים). האם די בכך, גם לבן ארץ ישראל בחו״ל ולבן חו״ל בארץ?"],
    ["ברירת המחדל למשתמשת חדשה", `מי שלא בחרה שיטה מקבלת ״מותאם״: חמישה ימים, בלי יום 31, בלי אור זרוע, בלי שימור הפלגות — מקל מאשכנז. לחייב בחירת שיטה, או לקבוע אחת כברירת מחדל?`],
    ["הפסק בלילה", "הפסק שנעשה בלילה (גם אחרי חצות, לפני הזריחה) אינו מתקבל ומסומן לבירור. האם יש מקרה שבו מועיל ליום שאחריו?"],
  ];
};

/* ---------- הרכבה ---------- */
const box = `<div class="ans"><span class="cb"></span> כן <span class="cb"></span> לא <span class="cb"></span> אחר: <span class="ln"></span></div>`;
function questionHtml(q, n) {
  const stacked = q.wide || q.fig.includes('class="cals"');
  const txt = `<p class="does"><b class="lbl">מה מעיין עושה:</b> ${q.does}</p>
    <p class="src"><b class="lbl">מקורות:</b> ${q.src}</p>`;
  const leg = q.legend ? `<p class="leg">${q.legend}</p>` : "";
  return `<section class="q"><h2><span class="n">${n}</span>${esc(q.title)}</h2>
  <p class="ask">${q.ask}</p>
  ${stacked ? `${txt}<div class="fig wide">${q.fig}</div><div class="foot">${leg}${box}</div>`
    : `<div class="body"><div class="txt">${txt}${leg}${box}</div><div class="fig">${q.fig}</div></div>`}</section>`;
}
const LEG = [
  ["see", "ראייה (טיפה חלולה: העונה הסמוכה, בבין השמשות)"], ["avg", "עונה בינונית"], ["mon", "עונת החודש"], ["int", "הפלגה"], ["oz", "אור זרוע (העונה שלפני)"],
  ["hef", "הפסק טהרה מוקדם ביותר"], ["mik", "ליל טבילה"],
];
function legend() {
  const sample = grid({ from: A(28, IYYAR), to: A(3, SIVAN), anchor: A(28, IYYAR), marks: [{ kind: "see", abs: A(28, IYYAR), onah: "day" }, { kind: "avg", abs: A(1, SIVAN), onah: "day" }, { kind: "oz", abs: A(1, SIVAN), onah: "night" }], q: [A(2, SIVAN)], ghosts: [{ abs: A(2, SIVAN), kind: "mon", onah: "day" }], tint: { [A(28, IYYAR)]: "nid", [A(29, IYYAR)]: "nid", [A(3, SIVAN)]: "cln" } });
  return `<section class="legend"><h3>מקרא הלוחות</h3><div class="lg">
  <ul>${LEG.map(([k, t]) => `<li>${shape(k, { size: 13 })} ${esc(t)}</li>`).join("")}
  <li>${MOON} ${SUN} עונת לילה / עונת יום. בכל משבצת: <b>חצי ימני — לילה</b> (קודם), <b>חצי שמאלי — יום</b>.</li>
  <li><span class="sw q">?</span> המועד שבמחלוקת. סימן מקווקו — מה שהדעה האחרת מוסיפה ומעיין אינו עושה.</li>
  <li><span class="sw nid"></span> ימי נידה עד ההפסק <span class="sw cln"></span> שבעה נקיים</li>
  <li><b>א׳</b> — היום בחודש העברי; <span class="ctx">30</span> — המספר הקטן בפינה: היום מהראייה (יום הראייה = 1). בראש חודש מופיע שם החודש.</li></ul>
  <div class="lgs">${sample}<div class="cap">דוגמה: ראייה בכ״ח אייר; ב־א׳ סיון עונה בינונית ביום ואור זרוע בלילה; ב־ב׳ סיון עונת חודש במחלוקת.</div></div></div></section>`;
}
const CSS = `
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-hebrew.woff2") format("woff2");font-weight:300 900;unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-latin.woff2") format("woff2");font-weight:300 900;unicode-range:U+0000-00FF,U+2000-206F,U+2212}
@font-face{font-family:"Bellefair";src:url("../../fonts/bellefair.ttf") format("truetype")}
@page{size:A4;margin:13mm 13mm 15mm}
:root{--accent:#b8336a;--accent-strong:#8e2452;--accent-soft:#fbe9f0;--ink:#1f1a1e;--muted:#6b6270;--faint:#8f8694;--line:#ece4e8;--niddah-bg:#fde8ea;--clean-bg:#eeebff;--q:#c42b45}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Rubik","Heebo",Arial,sans-serif;color:var(--ink);font-size:9.6pt;line-height:1.42;margin:0;background:#fff}
h1{font-family:"Bellefair",serif;font-weight:400;color:var(--accent);font-size:30pt;margin:0;line-height:1.1}
.meta{color:var(--muted);font-size:9.5pt;margin:4px 0 6px}
.meta b{color:var(--ink);font-weight:600}
.intro{background:var(--accent-soft);border-inline-start:4px solid var(--accent);border-radius:6px;padding:6px 10px;margin:6px 0 10px;font-size:9.5pt}
.legend{break-after:page}
.legend h3{font-size:12pt;color:var(--accent-strong);margin:0 0 4px;font-weight:600}
.lg{display:flex;gap:16px;align-items:flex-start}
.lg ul{list-style:none;margin:0;padding:0;flex:1;font-size:9.2pt}
.lg li{margin:0 0 4px}
.lg li svg{vertical-align:-2px}
.lgs{width:86mm;flex:none}
.sw{display:inline-block;width:14px;height:11px;border-radius:2px;vertical-align:middle}
.sw.nid{background:var(--niddah-bg);border:1px solid #f3b9c0}.sw.cln{background:var(--clean-bg);border:1px solid #c8c0ff}
.sw.q{border:1.3px dashed var(--q);color:var(--q);font-weight:700;font-size:8pt;text-align:center;line-height:9px;width:14px}
.ctx{font-size:7pt;color:var(--muted)}
.q{break-inside:avoid;border-top:1.5px solid var(--accent);padding:8px 0 12px;margin-top:8px}
.q h2{font-size:12.5pt;font-weight:600;color:var(--accent-strong);margin:0 0 2px;display:flex;align-items:center;gap:7px}
.q h2 .n{background:var(--accent);color:#fff;border-radius:50%;min-width:21px;height:21px;display:inline-flex;align-items:center;justify-content:center;font-size:10pt}
.ask{margin:0 0 4px;font-size:10pt;font-family:"Rubik",serif}
.body{display:flex;gap:10px;align-items:flex-start}
.txt{flex:1;min-width:0}
.fig{flex:none}
.fig.wide{display:flex;justify-content:center;margin:5px 0 3px}
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.foot .leg{flex:1}
.foot .ans{flex:none}
.lbl{color:var(--accent-strong);font-weight:600}
.does,.src{margin:0 0 3px}
.src{font-size:8.6pt;color:#3e353a}
.sep{color:var(--faint);margin:0 3px}
.leg{font-size:8pt;color:var(--muted);margin:0 0 3px;line-height:1.5}
.ml{display:inline-flex;align-items:center;gap:3px;margin-inline-end:9px;white-space:nowrap}
.ans{display:flex;align-items:center;gap:5px;font-size:9.5pt;margin-top:5px;border:1px solid var(--line);border-radius:5px;padding:3px 8px;width:max-content;min-width:72mm}
.cb{display:inline-block;width:10px;height:10px;border:1.2px solid var(--ink);border-radius:1.5px;margin-inline-start:6px}
.ln{display:inline-block;border-bottom:1px solid var(--ink);width:38mm;height:11px}
.cals{display:flex;gap:10mm}
figure.cal{margin:0;width:84mm}
figure.cal figcaption{font-size:8.6pt;font-weight:600;color:var(--accent-strong);text-align:center;margin-bottom:1px}
.cal table{border-collapse:collapse;width:100%;table-layout:fixed}
.cal th{font-size:7.4pt;font-weight:500;color:var(--muted);padding:0 0 1px}
.cal td{border:1px solid #d8ccd3;height:12.6mm;vertical-align:top;padding:0;position:relative;background:#fff}
.cal td.out{background:#f7f4f5}
.cal td.out .dn{color:#c9bfc4;font-weight:400}
.cal td.t-nid{background:var(--niddah-bg)}
.cal td.t-cln{background:var(--clean-bg)}
.cal td.m1{border-inline-start:2px solid var(--accent)}
.cal td.q{outline:1.6px dashed var(--q);outline-offset:-2.5px}
.cal .qm{position:absolute;top:-5px;left:-4px;width:12px;height:12px;border-radius:50%;background:#fff;border:1.3px solid var(--q);font-size:7.5pt;font-weight:800;color:var(--q);line-height:10px;text-align:center;z-index:2}
.cal .top{display:flex;align-items:baseline;gap:2px;padding:1px 2.5px 0;line-height:1.05;height:4mm}
.cal .dn{font-size:9.4pt;font-weight:700}
.cal .mn{position:absolute;bottom:0;right:2px;font-size:6.6pt;color:var(--accent-strong);font-weight:600;white-space:nowrap;line-height:1.1}
.cal .ct{margin-inline-start:auto;font-size:6.8pt;color:var(--muted)}
.cal .mks{display:flex;height:6.4mm;padding:0 1px}
.cal .h{flex:1;display:flex;flex-wrap:wrap;align-items:center;align-content:center;justify-content:center;gap:0 1px}
.cal .h.night{border-inline-end:1px dotted #e6dce1}
.cal .og{margin:0 .5px 0 0}
.mk{display:inline-block;vertical-align:middle;flex:none}
.cap{font-size:7.4pt;color:var(--muted);text-align:center;margin-top:1px}
.tbw{text-align:center}
svg.tb text{font-family:"Rubik",Arial,sans-serif}
.shortq ol{margin:4px 0 0;padding-inline-start:18px}
.shortq li{margin-bottom:5px;break-inside:avoid}
.shortq .ans{margin-top:2px;padding:1px 8px;font-size:8.6pt}
@media screen{body{max-width:190mm;margin:0 auto;padding:10mm}}
`;
function build() {
  let commit = "לא ידוע";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { /* מחוץ ל-git */ }
  [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14].forEach(f => f());
  const today = M.currentContext(M.emptyState(), new Date()).hebrewDate;
  const qhtml = QS.map((q, i) => questionHtml(q, i + 1)).join("\n");
  const sq = SHORT_QS();
  const shortHtml = `<section class="q shortq"><h2><span class="n">${QS.length + 1}</span>שאלות נוספות בקצרה</h2><ol>${sq.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)} ${box}</li>`).join("")}</ol></section>`;
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מעיין — שאלות לרב</title><style>${CSS}</style></head><body>
<header><h1>מעיין — שאלות לרב (תמצית)</h1>
<div class="meta">גרסת מנוע <b dir="ltr">${esc(M.ENGINE_VERSION)}</b> · git <b dir="ltr">${esc(commit)}</b> · <b>${esc(today)}</b> · שיטות: ${esc(PRESETS.ashkenaz)}; ${esc(PRESETS.sefard)}</div>
<div class="intro">כאן רק השאלות. הפירוט המלא (חישובים, הגדרות, ציטוטים ודוגמאות) נמצא במסמך הארוך, ״מעיין — מפרט הלכתי״. כל לוח חושב במנוע עצמו על תרחיש קטן בירושלים; «${SEC}» הוא מקור משני.</div></header>
${legend()}
${qhtml}
${shortHtml}
</body></html>`;
  fs.writeFileSync(OUT_HTML, html);
  return commit;
}

async function renderPdf(shotsDir) {
  const pw = require("playwright");
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto("file://" + OUT_HTML, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: OUT_PDF, format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: `<div dir="rtl" style="width:100%;font-size:7.5px;color:#8f8694;text-align:center;font-family:Arial,sans-serif">מעיין · שאלות לרב (תמצית) · מנוע ${M.ENGINE_VERSION} · עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span></div>` });
    if (shotsDir) await shots(browser, shotsDir);
  } finally { await browser.close(); }
}
/** צילומי עמודים מה-PDF עצמו (pdf.js אינו זמין, ולכן מצלמים את ה-HTML בגובה עמוד A4 במצב הדפסה) */
async function shots(browser, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const p = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p.goto("file://" + OUT_HTML, { waitUntil: "load" });
  await p.emulateMedia({ media: "print" });
  await p.addStyleTag({ content: "body{padding:13mm!important;max-width:none!important}" });
  await p.evaluate(() => document.fonts.ready);
  const ys = await p.evaluate(() => [0, document.querySelectorAll("section.q")[3].getBoundingClientRect().top + scrollY - 10]);
  for (let i = 0; i < ys.length; i++) { await p.evaluate(v => scrollTo(0, v), ys[i]); await p.screenshot({ path: path.join(dir, `q-page${i + 1}.png`) }); }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const commit = build();
  console.log(`נוצר ${path.relative(ROOT, OUT_HTML)} (commit ${commit}, מנוע ${M.ENGINE_VERSION}, ${QS.length} שאלות + שאלות קצרות)`);
  for (const w of warnings) console.warn("אזהרה: " + w);
  if (!args.includes("--no-pdf")) {
    const si = args.indexOf("--shots");
    renderPdf(si >= 0 ? args[si + 1] : null).then(() => console.log(`נוצר ${path.relative(ROOT, OUT_PDF)}`)).catch(e => { console.error(e); process.exit(1); });
  }
}
module.exports = { build };
