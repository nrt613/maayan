#!/usr/bin/env node
/* מעיין — מחולל המפרט ההלכתי.
 * טוען את מנוע החישוב (src/core.js) ומייצר את docs/halacha/halacha.html ואת halacha.pdf.
 * טבלאות השיטות, אפשרויות ההגדרות, רשימת נקודות הבירור והדוגמאות המחושבות נלקחים מהמנוע עצמו,
 * ולכן הרצה מחדש אחרי שינוי במנוע מעדכנת את המסמך.
 *
 * הרצה:  node docs/halacha/build.js            (HTML ו-PDF)
 *        node docs/halacha/build.js --no-pdf   (HTML בלבד)
 *        node docs/halacha/build.js --shots DIR (גם צילומי מסך של עמודים לבדיקה חזותית)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const M = require(path.join(ROOT, "src", "core.js"));
const CORE_SRC = fs.readFileSync(path.join(ROOT, "src", "core.js"), "utf8");
const APP_SRC = (() => { try { return fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8"); } catch { return ""; } })();
const OUT_HTML = path.join(__dirname, "halacha.html");
const OUT_PDF = path.join(__dirname, "halacha.pdf");
const warnings = [];

/* ---------- עזרים כלליים ---------- */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const WD = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const wd = d => { const i = new Date(d + "T12:00:00Z").getUTCDay(); return i === 6 ? "שבת" : "יום " + WD[i]; };
const civ = d => M.civilLabel(d);
const heb = d => M.hebrew(d);
const hshort = d => { const h = new M.HDate(M.isoAbs(d)); return `${M.gematriya(h.getDate())} ${h.monthName()}`; };
const habs = abs => new M.HDate(abs).renderGematriya();
const hm = (inst, tz) => M.timeInZone(inst, tz);
const hms = (inst, tz) => !inst ? "—" : new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(inst);
const dayFull = d => `${heb(d)} · ${civ(d)} (${wd(d)})`;
const dur = ms => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
const link = u => u ? `<a href="${esc(u)}">${esc(decodeURI(u).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 60))}</a>` : "";
const offsetTime = (inst, minutes, tz) => hm(new Date(inst.valueOf() + minutes * 60000), tz);

/* מזהים קבועים, כדי שההרצה תהיה זהה בכל פעם */
let idCounter = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`;
const ev = (type, date, time, cityId, extra = {}) => ({ id: nextId(), type, date, time, cityId, result: "clear", note: "", authorityNote: "", createdAt: "2026-01-01T00:00:00Z", ...extra });
const N = (d, m, y) => M.toISO(new M.HDate(d, m, y).greg());

/* ---------- שיטות ---------- */
const PRESETS = [
  ["ashkenaz", "אשכנז"],
  ["sefard", "הרב עובדיה / ספרד"],
  ["chabad", "חב״ד"],
  ["custom", "מותאם (ברירת המחדל)"],
];
const presetSettings = (key, cityId, extra = {}) => {
  const base = { ...M.SETTING_DEFAULTS, checklist: [], cityId };
  const s = key === "custom" ? { ...base, method: "custom" } : M.applyPreset(base, key);
  return { ...s, ...extra };
};
/* ערכי ההגדרות המותרים — נקראים מהגדרת SETTING_ENUMS במנוע עצמו */
const SETTING_ENUMS = (() => {
  const m = /const SETTING_ENUMS = (\{[\s\S]*?\});/.exec(CORE_SRC);
  if (!m) { warnings.push("לא נמצא SETTING_ENUMS במנוע"); return {}; }
  return Function(`"use strict"; return (${m[1]});`)();
})();
const BOOL_KEYS = ["day31", "orZarua", "carryLongIntervals", "carryMonthly"];
const SETTING_NAMES = {
  wait: "המתנה לפני ההפסק", haflagah: "שיטת ההפלגה", beinonit: "עונה בינונית", day31: "יום 31", orZarua: "אור זרוע",
  carryLongIntervals: "שימור הפלגות ארוכות", carryMonthly: "שימור עונת חודש בזמן דימום", missingMonthly: "יום ל׳ כשבחודש הבא אין ל׳",
  bedikot: "תזכורות לבדיקות", nightfall: "צאת הכוכבים", beinHashmashot: "ראייה בבין השמשות", hefsekTwilight: "הפסק אחרי השקיעה", special: "מצב מיוחד",
};
const optLabel = (k, v) => k === "nightfall" ? M.nightfallLabel(v) : BOOL_KEYS.includes(k) ? (v ? "כן" : "לא") : (M.SETTING_LABELS[k] && M.SETTING_LABELS[k][v]) || String(v);
const optionsOf = k => BOOL_KEYS.includes(k) ? [true, false] : (SETTING_ENUMS[k] || []);
const presetValue = (pk, k) => pk === "custom" ? M.SETTING_DEFAULTS[k] : M.METHOD_PRESETS[pk].settings[k];
const presetNote = (pk, k) => pk === "custom" ? null : M.METHOD_PRESETS[pk].notes.find(n => n.k === k) || null;

/* ---------- הרצת המנוע ---------- */
function runCase(def, pk, extraSettings = {}) {
  idCounter = def.idBase || 0;
  const st = M.emptyState();
  st.settings = presetSettings(pk, def.city, { ...(def.settings || {}), ...extraSettings });
  st.events = def.events(def.city);
  st.trips = def.trips ? def.trips() : [];
  const parsed = M.parseState(st);
  const tz = M.city(def.city).tz;
  const now = M.localInstant(def.now, def.nowTime || "12:00", tz);
  return { r: M.calculate(parsed, now), state: parsed, now };
}
const KIND = { average: "עונה בינונית", monthly: "עונת החודש", interval: "הפלגה", "or-zarua": "אור זרוע", manual: "עונה לפי הוראה", hefsek: "הפסק", bedikah: "בדיקה", mikvah: "טבילה" };
const SEP = ["average", "monthly", "interval", "or-zarua", "manual"];
function planText(p, withTimes = true) {
  const c = M.city(p.cityId), tz = c.tz;
  const hdate = p.onah === "day" ? heb(p.date) : heb(M.addDays(p.date, 1));
  const head = p.onah === "day" ? `עונת יום ${hdate}` : p.onah === "night" ? `ליל ${hdate}` : `מוצאי ${heb(p.date)}`;
  const civil = p.onah === "day" ? civ(p.date) : `ערב ${civ(p.date)}`;
  const t = withTimes ? ` · <span dir="ltr" class="tm">${hm(new Date(p.start), tz)}${p.end ? "–" + hm(new Date(p.end), tz) : ""}</span>${tz !== "Asia/Jerusalem" || c.id !== "jerusalem" ? " (" + c.name + ")" : ""}` : "";
  return `${head} <span class="civ">(${civil})</span>${t}`;
}
function sepList(r) {
  const on = r.plans.filter(p => SEP.includes(p.kind));
  if (!on.length) return `<span class="muted">אין</span>`;
  return `<ul class="onot">${on.map(p => `<li><b>${esc(p.title)}</b>: ${planText(p)}</li>`).join("")}</ul>`;
}
const reviewList = (r, skip = /^$/) => {
  const t = [...new Set(r.reviews.filter(x => !skip.test(x.id)).map(x => x.title))];
  return t.length ? `<ul class="rv">${t.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<span class="muted">אין</span>`;
};
function cell(col, r, c) {
  const tz = M.city(c).tz;
  switch (col) {
    case "wait": return r.earliestHefsek ? `${heb(r.earliestHefsek)}<br><span class="civ">${civ(r.earliestHefsek)}, ${wd(r.earliestHefsek)}</span>` : `<span class="muted">לא חושב</span>`;
    case "hefsek": return r.hefsek ? `התקבל (${esc(r.hefsek.date)} ${esc(r.hefsek.time)})<br>יום א׳ לספירה: ${heb(M.addDays(r.immersionDate, -6))}` : `<span class="bad">לא התקבל</span>`;
    case "clean": return r.immersionDate ? `${hshort(M.addDays(r.immersionDate, -6))} – ${heb(r.immersionDate)}<br><span class="civ">${civ(M.addDays(r.immersionDate, -6))} – ${civ(r.immersionDate)}</span>` : "—";
    case "mikvah": { const mk = r.plans.find(p => p.kind === "mikvah"); return mk ? `מוצאי ${heb(mk.date)}<br><span class="civ">${civ(mk.date)}, ${wd(mk.date)}</span><br>מ-<b>${hm(new Date(mk.start), M.city(mk.cityId).tz)}</b>` : `<span class="muted">לא תוכנן</span>`; }
    case "onot": return sepList(r);
    case "reviews": return reviewList(r);
    case "reviewsLess": return reviewList(r, /^missing-day|^no-mikvah|^immersion-no|^mikvah-(night|day)-/);
    case "phase": return { empty: "ריק", waiting: "המתנה", clean: "שבעה נקיים", planned: "אחרי היום השביעי", immersed: "אחרי טבילה" }[r.phase] || r.phase;
    default: return "";
  }
}
const COL_NAMES = { wait: "הפסק מוקדם ביותר", hefsek: "ההפסק", clean: "שבעה נקיים", mikvah: "ליל טבילה", onot: "עונות פרישה", reviews: "נקודות לבירור", reviewsLess: "נקודות לבירור", phase: "שלב" };
function eventsTable(def) {
  idCounter = def.idBase || 0;
  const evs = def.events(def.city);
  const nfs = [...new Set(PRESETS.map(([k]) => presetSettings(k, def.city, def.settings || {}).nightfall))];
  const NAMES = { ...M.EVENT_NAMES, flow: "ראייה (תחילת וסת)" };
  const rows = evs.map(e => {
    const c = M.city(e.cityId);
    const st = nfs.map(nf => { try { const s = M.stamp(e, nf); return { nf, t: `${s.hebrewDate}, ${s.onah === "day" ? "עונת יום" : "עונת לילה"}${s.twilight ? " · בין השמשות" : s.uncertain ? " · סמוך לגבול" : ""}` }; } catch (err) { return { nf, t: "לא ניתן לשייך: " + err.message }; } });
    const same = st.every(x => x.t === st[0].t);
    const assign = e.type === "manual" ? `עונה לפי הוראה: ${e.onah === "day" ? `עונת יום ${heb(e.date)}` : `ליל ${heb(e.date)} (מערב ${civ(M.addDays(e.date, -1))})`}` : same ? st[0].t : st.map(x => `לפי ${M.nightfallLabel(x.nf)}: ${x.t}`).join("<br>");
    const extra = [e.result !== "clear" ? M.RESULT_NAMES[e.result] : "", e.authorityNote ? "עם הוראה מתועדת" : "", e.onah ? (e.onah === "day" ? "עונת יום" : "עונת לילה") : ""].filter(Boolean).join(", ");
    return `<tr><td>${esc(NAMES[e.type])}${extra ? `<br><span class="civ">${esc(extra)}</span>` : ""}</td><td>${esc(civ(e.date))}<br><span class="civ">${wd(e.date)}</span></td><td class="num">${esc(e.time)}</td><td>${esc(c.name)}</td><td>${assign}</td></tr>`;
  }).join("");
  const trips = def.trips ? def.trips() : [];
  return `<table class="ev"><thead><tr><th>רישום</th><th>תאריך</th><th>שעה מקומית</th><th>מקום</th><th>שיוך במנוע</th></tr></thead><tbody>${rows}</tbody></table>
  ${trips.map(t => `<p class="fine">נסיעה: ${esc(M.city(t.cityId).name)} מ-${civ(t.from)} עד ${civ(t.to)}.</p>`).join("")}
  <p class="fine">זמן החישוב המדומה: ${civ(def.now)} בשעה ${def.nowTime || "12:00"} (${esc(M.city(def.city).name)}).</p>`;
}
function presetTable(def, cols, variants) {
  const rows = (variants || PRESETS.map(([k, l]) => ({ pk: k, label: l }))).map(v => {
    const { r } = runCase(v.def || def, v.pk, v.settings || {});
    return `<tr><th>${esc(v.label)}</th>${cols.map(c => `<td>${cell(c, r, def.city)}</td>`).join("")}</tr>`;
  }).join("");
  return `<table class="res"><thead><tr><th>שיטה</th>${cols.map(c => `<th>${COL_NAMES[c]}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}
const example = (title, def, cols, variants, after = "") => `<div class="example"><h5>${title}</h5>${def.desc ? `<p>${def.desc}</p>` : ""}${eventsTable(def)}${presetTable(def, cols, variants)}${after}</div>`;

/* ---------- בלוקים של המסמך ---------- */
const noteBox = (html) => `<div class="note"><b>הערה:</b> ${html}</div>`;
const qRef = n => `<span class="qref">שאלה ${n}</span>`;
function settingsBlock(keys) {
  if (!keys.length) return `<p>אין הגדרה למשתמשת בנושא זה; ההתנהגות זהה בכל השיטות.</p>`;
  return keys.map(k => {
    const opts = optionsOf(k);
    const head = `<tr><th>אפשרות</th>${PRESETS.map(([, l]) => `<th>${esc(l)}</th>`).join("")}</tr>`;
    const body = opts.map(v => `<tr><td>${esc(optLabel(k, v))} <span class="code">${esc(String(v))}</span></td>${PRESETS.map(([pk]) => `<td class="mark">${presetValue(pk, k) === v ? "●" : ""}</td>`).join("")}</tr>`).join("");
    const notes = PRESETS.filter(([pk]) => presetNote(pk, k)).map(([pk, l]) => { const n = presetNote(pk, k); return `<li><b>${esc(l)}:</b> ${n.ask ? `<span class="ask">לברר עם רב</span> ` : ""}${esc(n.t)}${n.src ? ` — ${link(n.src)}` : ""}</li>`; }).join("");
    const vals = PRESETS.filter(([pk]) => pk !== "custom").map(([pk]) => presetValue(pk, k));
    const fine = vals.every(v => v === undefined) ? "השיטות המוכנות אינן קובעות הגדרה זו: בבחירת שיטה הערך נשאר כפי שהיה. מסומנת רק ברירת המחדל." : `לשיטות המוכנות אין הערה בהגדרה זו.${vals.every(v => v === vals[0]) ? " שלוש השיטות קובעות אותו ערך." : ""}`;
    return `<div class="setting"><h6>${esc(SETTING_NAMES[k] || k)} <span class="code">${k}</span></h6><table class="opts"><thead>${head}</thead><tbody>${body}</tbody></table>${notes ? `<ul class="pnotes">${notes}</ul>` : `<p class="fine">${fine}</p>`}</div>`;
  }).join("");
}
const ravBox = (num) => `<div class="rav"><div class="rav-h">לבדיקת הרב · סעיף ${num}</div><div class="checks"><span>☐ מאושר</span><span>☐ לא מאושר</span><span>☐ לתקן</span></div><div class="lines"><div></div><div></div><div></div></div></div>`;
let chapterNo = 0;
const TOC = [];
function chapter({ title, a, src, b, keys = [], c = "", d, notes = [] }) {
  const n = ++chapterNo;
  TOC.push({ n, title });
  return `<section class="chapter" id="ch${n}"><h2><span class="cn">פרק ${n}</span>${title}</h2>
  <div class="part pa"><h3>(א) ההלכה בקצרה</h3>${a}${src ? `<div class="src"><b>מקורות:</b> ${src}</div>` : ""}</div>
  <div class="part pb"><h3>(ב) מה האפליקציה מחשבת בדיוק</h3>${b}${notes.map(noteBox).join("")}</div>
  <div class="part pc"><h3>(ג) ההגדרות ומה בוחרת כל שיטה</h3>${settingsBlock(keys)}${c}</div>
  <div class="part pd"><h3>(ד) דוגמה מחושבת במנוע</h3>${d}</div>
  ${ravBox(n)}</section>`;
}
const S = M.SOURCES;
const PS_SRC = k => { const n = M.METHOD_PRESETS.ashkenaz.notes.find(x => x.k === k) || M.METHOD_PRESETS.sefard.notes.find(x => x.k === k); return n ? n.src : ""; };
const NV = `<span class="nv">[לא אומת מול לשון המקור]</span>`;

/* ---------- פרק 1: יום ולילה ---------- */
function ch1() {
  const c = M.city("jerusalem"), tz = c.tz, opts = SETTING_ENUMS.nightfall;
  const dates = ["2026-03-20", "2026-06-21", "2026-09-22", "2026-12-21"];
  const sunRows = dates.map(d => {
    const base = M.sun(d, c, 8.5);
    return `<tr><td>${civ(d)}<br><span class="civ">${hshort(d)}</span></td><td class="num">${hm(base.dawn, tz)}</td><td class="num">${hms(base.sunrise, tz)}</td><td class="num">${hm(base.sunset, tz)}</td>${opts.map(o => `<td class="num">${hm(M.sun(d, c, o).nightfall, tz)}</td>`).join("")}<td class="num">${dur(base.sunset - base.sunrise)}</td></tr>`;
  }).join("");
  const sunTable = `<table class="res"><thead><tr><th>תאריך</th><th>עלות השחר 16.1°</th><th>זריחה (עם שניות)</th><th>שקיעה</th>${opts.map(o => `<th>צאה״כ ${esc(M.nightfallLabel(o))}</th>`).join("")}<th>אורך היום</th></tr></thead><tbody>${sunRows}</tbody></table>`;
  // שיוך רגעים סביב השקיעה לפי כל הגדרת צאת הכוכבים
  const d = "2026-06-15", s = M.sun(d, c, 8.5), offs = [-5, -3, -2, 0, 2, 5, 10, 14, 17, 19, 25, 33, 40];
  const short = st => `${M.gematriya(new M.HDate(st.abs).getDate())} ${new M.HDate(st.abs).monthName()}, ${st.onah === "day" ? "יום" : "לילה"}${st.twilight ? " · <b>בין השמשות</b>" : st.uncertain ? " · <b>סמוך לגבול</b>" : ""}${st.alt ? `<br><span class="civ">חלופה: ${M.gematriya(new M.HDate(st.alt.abs).getDate())} ${new M.HDate(st.alt.abs).monthName()}, ${st.alt.onah === "day" ? "יום" : "לילה"}</span>` : ""}`;
  const stRows = offs.map(o => {
    const t = offsetTime(s.sunset, o, tz);
    return `<tr><td class="num">${t}</td><td class="num">${o > 0 ? "+" : ""}${o}</td>${opts.map(nf => { const st = M.stamp({ id: nextId(), type: "flow", date: d, time: t, cityId: c.id, createdAt: "2026-01-01T00:00:00Z" }, nf); return `<td>${short(st)}</td>`; }).join("")}</tr>`;
  }).join("");
  const stTable = `<table class="res small"><thead><tr><th>שעה</th><th>דקות מהשקיעה</th>${opts.map(o => `<th>${esc(M.nightfallLabel(o))}</th>`).join("")}</tr></thead><tbody>${stRows}</tbody></table>`;
  return chapter({
    title: "הגדרת היום והלילה וזמני השמש",
    a: `<p>היום ההלכתי מתחיל בלילה: מהשקיעה מתחיל היום העברי הבא. לעניין עונות הווסת, עונת היום היא מהזריחה עד השקיעה ועונת הלילה מהשקיעה עד הזריחה (כך כתוב בדף ״קביעת עונת היום והלילה״ שהקוד מצטט). הזמן שבין השקיעה לצאת הכוכבים (בין השמשות) הוא ספק יום ספק לילה, ודינו בפרק 2.</p>
      <p>בשיעור צאת הכוכבים יש שיטות שונות. הקוד מציע: 8.5° מתחת לאופק (מתואר בהערת שיטת אשכנז כ״לחומרא״), 7.083° מתחת לאופק, 13.5 דקות זמניות אחרי השקיעה (לשיטת הגאונים, שלפי הערת שיטת ספרד בקוד הרב עובדיה יוסף נוקט בה), ו-18 או 20 דקות קבועות אחרי השקיעה. המסמך אינו מכריע ביניהן.</p>
      <p class="fine">יש פוסקים שעונת היום מתחילה כבר בעלות השחר ולא בזריחה. האפליקציה אינה תומכת בזה. ${NV}</p>`,
    src: `${link(S.calendar)}; ${link(PS_SRC("beinHashmashot"))}; ${link(M.METHOD_PRESETS.sefard.notes.find(n => n.k === "nightfall").src)}`,
    b: `<ul>
      <li><b>אלגוריתם:</b> זמני השמש מחושבים במכשיר באלגוריתם NOAA, בגובה פני הים, בלי תיקון לגובה המקום, להרים או לבניינים (״שקיעה במישור״). בדיקה במאגר (<span class="code">src/tests.js</span>) משווה ללוח ״עיתים לבינה״ (גבעת שמואל, כסלו תשפ״ז), והתוצאה תואמת בטווח של שניות לפני עיגול.</li>
      <li><b>זריחה ושקיעה:</b> מרכז השמש 0.833° מתחת לאופק, כדי לכלול שבירת אור ואת חצי קוטר השמש. <b>עלות השחר</b> (רק לחלון הבדיקות): מרכז השמש 16.1° מתחת לאופק. <b>צאת הכוכבים במעלות</b> (8.5° או 7.083°): מרכז השמש באותה זווית מתחת לאופק, בלי תיקון שבירה.</li>
      <li><b>דקות קבועות</b> (18 או 20): השקיעה, לפני העיגול, ועוד מספר הדקות. <b>דקות זמניות</b> (13.5): השקיעה לפני העיגול ועוד 13.5 × (שקיעה − זריחה) / 720. כלומר שעה זמנית היא 1/12 מהזריחה עד השקיעה (לא מעלות השחר עד צאת הכוכבים).</li>
      <li><b>עיגול:</b> השקיעה מעוגלת לדקה שלמה כלפי מטה (מוקדם), וצאת הכוכבים כלפי מעלה (מאוחר). <b>הזריחה ועלות השחר אינן מעוגלות</b>: החישוב משתמש ברגע המדויק עם השניות, והתצוגה קוטעת את השניות.</li>
      <li><b>החלפת היום:</b> רגע שבשקיעה המעוגלת או אחריה שייך ליום העברי הבא (עונת לילה). רגע בין הזריחה לשקיעה הוא עונת יום. רגע לפני הזריחה הוא עונת הלילה של היום העברי שחל באותו תאריך אזרחי. גם ״היום״ שבמסך הבית מתחלף בשקיעה, לא בצאת הכוכבים ולא בחצות.</li>
      <li><b>הלוח העברי</b> מחושב באלגוריתם הקביעות (כמו בספריית Hebcal). הבדיקות במאגר: ראש השנה תשפ״ז ב-12 בספטמבר 2026, ט״ו בניסן תשפ״ו ב-2 באפריל 2026, והתאמה ללוח העברי של הדפדפן לאורך 3,000 ימים.</li>
      <li><b>שעון מקומי:</b> כל רישום נשמר עם תאריך אזרחי, שעה מקומית ומקום, והמנוע ממיר אותם לרגע מוחלט לפי אזור הזמן של המקום. שעה שמופיעה פעמיים או אינה קיימת במעבר שעון אינה נבחרת בשקט: הרישום מסומן ״נדרש בירור של הזמן והמיקום״.</li>
    </ul>`,
    notes: [
      "הזריחה אינה מעוגלת, והתצוגה קוטעת את השניות. בסוף עונת הלילה (בזריחה) השעה המוצגת מוקדמת לכל היותר ב-59 שניות מהרגע שהמנוע משתמש בו, כלומר התצוגה מקלה. ההשוואות במנוע עצמו נעשות ברגע המדויק. בטבלה למטה מוצגת הזריחה עם שניות.",
      "השעה הזמנית מחושבת מהזריחה עד השקיעה. יש שמחשבים אותה מעלות השחר עד צאת הכוכבים, ואז יוצא שיעור אחר.",
    ],
    keys: ["nightfall"],
    c: `<p class="fine">ההגדרה קובעת גם את סוף בין השמשות לסיווג רישומים (פרק 2) וגם את שעת ליל הטבילה (פרק 12). אין הגדרה נפרדת לכל אחד מהם.</p>`,
    d: `<div class="example"><h5>זמני השמש בירושלים לפי המנוע</h5>${sunTable}</div>
      <div class="example"><h5>שיוך ראייה סביב השקיעה בירושלים, ${civ(d)} (שקיעה ${hm(s.sunset, tz)})</h5><p>כל שורה היא ראייה שנרשמה בשעה הזאת. בכל עמודה מוצג השיוך לפי הגדרת צאת הכוכבים: היום העברי, העונה, ואם יש, השיוך החלופי שחוששים לו (פרק 2).</p>${stTable}</div>`,
  });
}

/* ---------- פרק 2: בין השמשות ---------- */
function ch2() {
  const T = (d, cid, mins) => offsetTime(M.sun(d, M.city(cid)).sunset, mins, M.city(cid).tz);
  const variants = [...PRESETS.map(([k, l]) => ({ pk: k, label: l })), { pk: "custom", label: "מותאם + ״השעיית החישוב״", settings: { beinHashmashot: "flag" } }];
  const ex1 = { city: "netanya", now: "2026-04-22", events: c => [ev("flow", "2026-04-20", T("2026-04-20", c, 10), c)] };
  const ex2 = { city: "haifa", now: "2026-05-14", events: c => [ev("flow", "2026-05-12", T("2026-05-12", c, -2), c)] };
  const ex3 = { city: "tel-aviv", now: "2026-06-17", events: c => [ev("flow", "2026-06-15", T("2026-06-15", c, 17), c)] };
  return chapter({
    title: "ראייה בבין השמשות או סמוך לשקיעה",
    a: `<p>ראייה שבין השקיעה לצאת הכוכבים היא בספק יום ספק לילה. לפי הערת שיטת אשכנז בקוד: ״מעיקר הדין כלילה, ונוהגים להחמיר ולחשוש לשתי העונות (ש״ך קפד בשם הב״ח)״. לפי הערת שיטת חב״ד: ״מעיקר הדין חוששת לעונת הלילה בלבד, ויש להחמיר ולחשוש גם לעונת היום״. לפי הערת שיטת ספרד: ״חוששים לשתי העונות; אחרי 13.5 דקות זמניות הזמן נחשב לילה ודאי״.</p>
      <p>השאלה מאיזה יום נספרת ההמתנה לפני ההפסק (פרק 9) כשהראייה בבין השמשות אינה מוכרעת במקורות שבקוד.</p>`,
    src: `ש״ך יו״ד קפד בשם הב״ח, כפי שמצוטט בהערת השיטה ${NV}; ${link(PS_SRC("beinHashmashot"))}; ${link(M.METHOD_PRESETS.chabad.notes.find(n => n.k === "beinHashmashot").src)}`,
    b: `<ul>
      <li><b>שני סוגי ספק.</b> (1) <i>בין השמשות</i>: מהשקיעה המעוגלת ועד צאת הכוכבים לפי ההגדרה שנבחרה. (2) <i>סמוך לגבול</i>: עד 3 דקות לפני או אחרי השקיעה או הזריחה. שלוש הדקות הן מרווח ביטחון לחישוב (שקיעה במישור לעומת שקיעה נראית), לא שיעור הלכתי.</li>
      <li><b>השיוך החלופי.</b> רישום בבין השמשות, או עד 3 דקות אחרי השקיעה, שייך לעונת הלילה של היום העברי הבא, וחלופה: עונת היום של היום שהסתיים. רישום עד 3 דקות <i>לפני</i> השקיעה שייך לעונת היום, וחלופה: עונת הלילה של היום הבא. סמוך לזריחה (3 דקות לכל כיוון), החלופה היא העונה האחרת של אותו יום עברי.</li>
      <li><b>הגדרה ״לחומרא שתי העונות״ (ברירת המחדל ובכל השיטות):</b> הראייה נחשבת בשני השיוכים. עונה בינונית ועונת החודש מחושבות לכל אחד מהם. בהפלגה נשמרים כל המרווחים האפשריים בין שתי הראיות האחרונות, וכל מרווח מחושב מכל שיוך של הראייה האחרונה (פרק 5). ההמתנה נספרת מהיום העברי <b>המאוחר</b> מבין השיוכים (פרק 9). הרישום מסומן לבירור (״רישום סמוך לגבול היום או העונה״).</li>
      <li><b>הגדרה ״השעיית החישוב ובירור״:</b> ראייה כזו אינה משמשת לחישוב כלל. אין המתנה מחושבת, ואם זו הראייה האחרונה לא מוצגת שום עונת פרישה, גם לא ממחזורים קודמים. אם זו אחת משתי הראיות האחרונות, לא מחושבת הפלגה. מופיעה נקודה לבירור.</li>
      <li>הפסק טהרה ובדיקות בזמן כזה: פרקים 10 ו-11.</li>
    </ul>`,
    notes: [
      `ראייה עד 3 דקות לפני השקיעה המחושבת היא לפי החישוב יום ודאי, ובכל זאת בהגדרה ״שתי העונות״ ההמתנה נספרת מהיום הבא. זו חומרא של האפליקציה שאין לה מקור בקוד (ראו דוגמה 2). ${qRef(8)}`,
      `בשיטת ספרד ההערה אומרת ש״אחרי 13.5 דקות זמניות הזמן נחשב לילה ודאי״, אבל צאת הכוכבים בשיטה הזאת מוגדר 20 דקות. בפועל המנוע מתייחס לכל 20 הדקות שאחרי השקיעה כבין השמשות, כלומר מחמיר יותר ממה שכתוב בהערה (ראו דוגמה 3: ראייה 17 דקות אחרי השקיעה). ${qRef(2)}`,
    ],
    keys: ["beinHashmashot"],
    d: example("1. ראייה 10 דקות אחרי השקיעה, נתניה", ex1, ["wait", "onot", "reviews"], variants)
      + example("2. ראייה 2 דקות לפני השקיעה, חיפה", ex2, ["wait", "onot"], variants)
      + example("3. ראייה 17 דקות אחרי השקיעה, תל אביב", ex3, ["wait", "onot"], variants),
  });
}

/* ---------- פרק 3: שיוך ראייה לעונה ---------- */
function ch3() {
  const c = M.city("jerusalem"), tz = c.tz, d = "2026-03-10", s = M.sun(d, c), next = M.addDays(d, 1);
  const times = [[d, "04:30"], [d, offsetTime(s.sunrise, -2, tz)], [d, offsetTime(s.sunrise, 4, tz)], [d, "10:00"], [d, offsetTime(s.sunset, -4, tz)], [d, offsetTime(s.sunset, 1, tz)], [d, "21:30"], [d, "23:59"], [next, "00:30"], [next, "04:00"]];
  const rows = times.map(([dd, t]) => {
    const st = M.stamp({ id: nextId(), type: "flow", date: dd, time: t, cityId: c.id, createdAt: "2026-01-01T00:00:00Z" }, "8.5");
    return `<tr><td>${civ(dd)}</td><td class="num">${t}</td><td>${st.hebrewDate}</td><td>${st.onah === "day" ? "עונת יום" : "עונת לילה"}</td><td>${st.twilight ? "בין השמשות" : st.uncertain ? "סמוך לגבול" : "—"}${st.alt ? ` · חלופה: ${habs(st.alt.abs)}, ${st.alt.onah === "day" ? "יום" : "לילה"}` : ""}</td></tr>`;
  }).join("");
  return chapter({
    title: "שיוך הראייה ליום העברי ולעונה",
    a: `<p>כל חשש וסת נקבע לפי היום העברי ולפי העונה שבה התחילה הראייה. ראייה בלילה שייכת ליום העברי הבא, וחששותיה בעונת לילה.</p>`,
    src: link(S.calendar),
    b: `<ul>
      <li>המנוע (<span class="code">stamp</span>) ממיר את התאריך, השעה והמקום של הרישום לרגע מוחלט, ומשווה לזריחה ולשקיעה של אותו תאריך אזרחי באותו מקום (פרק 1).</li>
      <li>אחרי השקיעה: היום העברי הוא התאריך האזרחי ועוד יום, עונת לילה. בין הזריחה לשקיעה: היום העברי הוא התאריך האזרחי, עונת יום. אחרי חצות ולפני הזריחה: היום העברי הוא התאריך האזרחי, עונת לילה.</li>
      <li>לכל רישום נשמר המקום שבו נרשם. שינוי העיר בהגדרות או נסיעה אינם משנים את שיוך הרישומים הקודמים.</li>
      <li>ראייה שהמנוע אינו יכול לשייך (שעה כפולה במעבר שעון, מקום בלי זריחה ושקיעה) מסומנת לבירור. אם זו ראייה או חידוש ספירה, ואין אחריה ראייה, חידוש או טבילה בתאריך מאוחר יותר, היא חוסמת: אין המתנה ואין ספירה עד שיתברר, ובראייה גם אין עונות פרישה.</li>
      <li>רישום שזמנו בעתיד (חוץ מעונה ידנית והערה) אינו נכנס לחישוב ומסומן ״רישום עתידי״.</li>
    </ul>`,
    notes: [],
    keys: ["nightfall", "beinHashmashot"],
    c: `<p class="fine">ההגדרות האלה משפיעות רק על רישומים שבין השקיעה לצאת הכוכבים (פרק 2). בשאר השעות השיוך זהה בכל השיטות.</p>`,
    d: `<div class="example"><h5>ראייה בשעות שונות, ירושלים (זריחה ${hm(s.sunrise, tz)}, שקיעה ${hm(s.sunset, tz)} ב-${civ(d)}), לפי 8.5°</h5><table class="res"><thead><tr><th>תאריך אזרחי</th><th>שעה</th><th>יום עברי</th><th>עונה</th><th>ספק</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  });
}

/* ---------- פרק 4: עונת החודש ---------- */
function ch4() {
  const Y = 5786;
  const cases = [
    { t: "ראייה ביום, ט״ז טבת תשפ״ו", def: { city: "jerusalem", now: "2026-01-07", events: c => [ev("flow", "2026-01-05", "10:00", c)] } },
    { t: "ראייה בלילה (21:30), ליל י״א אדר תשפ״ו", def: { city: "jerusalem", now: "2026-03-01", events: c => [ev("flow", "2026-02-27", "21:30", c)] } },
    { t: "ל׳ ניסן, ואייר חסר (״א׳ בחודש שאחריו״)", def: { city: "jerusalem", now: M.addDays(N(30, 1, Y), 2), events: c => [ev("flow", N(30, 1, Y), "10:00", c)] } },
    { t: "ל׳ ניסן, ואייר חסר, בהגדרה ״דילוג״", def: { city: "jerusalem", now: M.addDays(N(30, 1, Y), 2), events: c => [ev("flow", N(30, 1, Y), "10:00", c)], settings: { missingMonthly: "skip" } }, rv: true },
    { t: "ל׳ כסלו תשפ״ז (טבת תמיד חסר)", def: { city: "jerusalem", now: M.addDays(N(30, 9, 5787), 2), events: c => [ev("flow", N(30, 9, 5787), "10:00", c)] } },
    { t: "שנה מעוברת: י״ב אדר א׳ תשפ״ז", def: { city: "beersheba", now: M.addDays(N(12, 12, 5787), 2), events: c => [ev("flow", N(12, 12, 5787), "09:00", c)] } },
    { t: "שנה מעוברת: ל׳ אדר א׳ תשפ״ז (אדר ב׳ חסר)", def: { city: "beersheba", now: M.addDays(N(30, 12, 5787), 2), events: c => [ev("flow", N(30, 12, 5787), "09:00", c)] } },
    { t: "ל׳ שבט תשפ״ז, ואחריו אדר א׳ מלא", def: { city: "beersheba", now: M.addDays(N(30, 11, 5787), 2), events: c => [ev("flow", N(30, 11, 5787), "09:00", c)] } },
    { t: "ראתה פעמיים בחודש: ה׳ ניסן וכ״ה ניסן", def: { city: "bnei-brak", now: M.addDays(N(25, 1, Y), 1), events: c => [ev("flow", N(5, 1, Y), "10:00", c), ev("hefsek", N(9, 1, Y), "16:00", c), ev("flow", N(25, 1, Y), "10:00", c)] } },
    { t: "שתי ראיות ביום אחד הפרש: ט״ז טבת וט״ו שבט (תרחיש השוואה 1)", def: { city: "bnei-brak", now: "2026-02-07", events: c => [ev("flow", "2026-01-05", "10:00", c), ev("hefsek", "2026-01-09", "15:30", c), ev("mikvah", "2026-01-16", "19:30", c), ev("flow", "2026-02-02", "11:00", c)] } },
  ];
  const rows = cases.map(cs => {
    const per = PRESETS.map(([pk]) => { const { r } = runCase(cs.def, pk); return r.plans.filter(p => p.kind === "monthly").map(p => `<li><b>${esc(p.title)}</b>: ${planText(p)}</li>`).join("") + (cs.rv ? r.reviews.filter(x => x.id === "missing-month-day").map(x => `<li class="bad">${esc(x.title)}</li>`).join("") : ""); });
    idCounter = 0;
    const evs = cs.def.events(cs.def.city).filter(e => e.type === "flow").map(e => { const s = M.stamp(e); return `${s.hebrewDate}, ${s.onah === "day" ? "יום" : "לילה"}`; }).join("<br>");
    const same = per.every(x => x === per[0]);
    return `<tr><td>${esc(cs.t)}<br><span class="civ">${evs}</span></td>${same ? `<td colspan="4"><ul class="onot">${per[0] || "<li>אין</li>"}</ul><span class="fine">זהה בכל השיטות</span></td>` : per.map(x => `<td><ul class="onot">${x || "<li>אין</li>"}</ul></td>`).join("")}</tr>`;
  }).join("");
  return chapter({
    title: "עונת החודש (וסת החודש)",
    a: `<p>אשה שראתה ביום מסוים בחודש העברי חוששת לאותו יום בחודש הבא, באותה עונה. ראתה בל׳ בחודש, ובחודש הבא יש רק כ״ט ימים: לפי מכון נשמת, כפי שמצוטט בקוד, חוששים לא׳ בחודש שאחריו, ״יוצאים בזה ידי כל השיטות״, כי העונה הבינונית חלה ממילא בכ״ט. בשנה מעוברת חודש אדר א׳ ממשיך לאדר ב׳.</p>
      <p>ראתה פעמיים באותו חודש: לפי הקוד (בשם מכון נשמת ולוח חב״ד) כל החששות מחושבים מהראייה האחרונה, ובנוסף נשמרת עונת החודש של הראייה הקודמת אם עוד לא הגיעה.</p>`,
    src: `שו״ע יו״ד סי׳ קפט ${NV}; ${link(S.monthly)}; ${link(S.chabad)}`,
    b: `<ul>
      <li><b>היעד:</b> אותו מספר יום בחודש העברי הבא, מהראייה האחרונה שאינה מסופקת. העונה זהה לעונת הראייה: ראייה ביום ← עונת יום; ראייה בלילה ← ליל אותו תאריך (הערב שלפני התאריך האזרחי שלו).</li>
      <li><b>החודש הבא</b> הוא החודש העברי העוקב: אלול ← תשרי, אדר (שנה פשוטה) ← ניסן, אדר א׳ (מעוברת) ← אדר ב׳, אדר ב׳ ← ניסן.</li>
      <li><b>היום אינו קיים בחודש הבא</b> (ל׳ כשהחודש הבא בן 29): בהגדרה ״א׳ בחודש שאחריו״ היעד הוא א׳ בחודש שאחרי החודש החסר, כלומר היום שאחרי כ״ט שלו. בהגדרה ״דילוג״ אין עונת חודש, ומופיעה נקודת בירור ״בחודש הבא אין יום מקביל״.</li>
      <li><b>ראייה בבין השמשות</b> (בהגדרה ״שתי העונות״): נוספת עונת חודש גם לשיוך החלופי.</li>
      <li><b>ראייה קודמת</b> שעונת החודש שלה מאוחרת מהראייה האחרונה נשמרת כ״עונת חודש נוספת״, בלי קשר למרחק בין הראיות.</li>
      <li><b>שימור עונת חודש בזמן דימום</b> (כבוי בכל השיטות): עונת חודש של ראייה קודמת שחלה בתוך תקופת דימום מתועדת (בין ראייה להפסק שלה) עוברת לאותו יום בחודש שאחריו. המעבר נמשך כל עוד היא חלה בתוך תקופת דימום, עד 18 חודשים.</li>
      <li>כל העונות מתבטלות כשהראייה האחרונה מסופקת או בזמן לא ידוע, במצב מיוחד (פרק 17) ובמעבר קו התאריך (פרק 15).</li>
    </ul>`,
    notes: [
      `״עונת חודש נוספת״ נשמרת גם כשהראייה החדשה באה יום אחד לפני מועדה, ולכן העונה חלה בימי הנידה עצמם (ראו בטבלה, השורה האחרונה: ראייה בט״ו שבט, ועונת חודש נוספת בט״ז שבט מהראייה של ט״ז טבת; ובשיטת אשכנז נוספת לה גם עונת אור זרוע). אין במנוע בדיקה אם העונה חלה בזמן שהיא ממילא אסורה. ${qRef(18)}`,
      "המנוע אינו בודק עקירה של עונת החודש: עונת חודש של ראייה קודמת שמועדה עבר נעלמת, גם אם מועדה חל בימי דימום (אלא אם הופעל השימור).",
    ],
    keys: ["missingMonthly", "carryMonthly"],
    d: `<div class="example"><h5>עונת החודש במקרים שונים (רק עונות החודש מוצגות)</h5><table class="res"><thead><tr><th>מקרה וראיות</th>${PRESETS.map(([, l]) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`,
  });
}

/* ---------- פרק 5: הפלגה ---------- */
function ch5() {
  const Y = 5786;
  const ex1 = { city: "haifa", now: "2026-03-10", desc: "שלוש ראיות במרווחים של 35 ואחר כך 26 ימים, כל מחזור עם הפסק וטבילה (תרחיש השוואה 11).", events: c => { const a = "2026-01-04", b = M.addDays(a, 34), d = M.addDays(b, 25); return [ev("flow", a, "10:00", c), ev("hefsek", M.addDays(a, 4), "15:30", c), ev("mikvah", M.addDays(a, 11), "20:30", c), ev("flow", b, "10:00", c), ev("hefsek", M.addDays(b, 4), "15:30", c), ev("mikvah", M.addDays(b, 11), "20:30", c), ev("flow", d, "10:00", c), ev("hefsek", M.addDays(d, 4), "15:30", c)]; } };
  const ex2 = { city: "netanya", now: N(6, 2, Y), desc: "שיטת חב״ד (תרחיש הבודקים ״52 עונות״): ראייה בא׳ ניסן, הפסק בה׳ ניסן, ראייה בא׳ אייר ביום, הפסק בה׳ אייר.", events: c => [ev("flow", N(1, 1, Y), "10:00", c), ev("hefsek", N(5, 1, Y), "16:00", c), ev("flow", N(1, 2, Y), "10:00", c), ev("hefsek", N(5, 2, Y), "16:00", c)] };
  const ex3 = { city: "netanya", now: N(1, 2, Y), desc: "ראייה מסופקת באמצע: ב׳ ניסן, ט״ו ניסן (מסופקת), ל׳ ניסן.", events: c => [ev("flow", N(2, 1, Y), "10:00", c), ev("flow", N(15, 1, Y), "10:00", c, { result: "uncertain", note: "מראה לא ברור" }), ev("flow", N(30, 1, Y), "10:00", c)] };
  const only = cols => cols;
  return chapter({
    title: "הפלגה",
    a: `<p>הפלגה היא המרווח בין ראייה לראייה. בשיטת הימים (הנהוגה לפי הקוד באשכנז ובספרד) סופרים מתחילת וסת לתחילת וסת, בספירה כוללנית, וחוששים לאותו מרווח מהראייה האחרונה ובאותה עונה. הפלגה שעברה בלי ראייה נעקרת. לפי הערת שיטת אשכנז בקוד, ״הפלגה ארוכה שלא נעקרה (כי הראייה הבאה באה לפניה) נשמרת״; כל השיטות בקוד מסמנות זאת ״לברר עם רב״, חוץ מחב״ד.</p>
      <p>בשיטת חב״ד (לוח חב״ד שבקוד) סופרים <b>עונות</b> מההפסק שלפני הראייה ועד הראייה הבאה, ואת המועד החדש סופרים מההפסק שאחרי הראייה האחרונה. הפלגה ארוכה נשמרת כשמגיעה קצרה ממנה.</p>`,
    src: `שו״ע יו״ד סי׳ קפט ${NV}; ${link(S.interval)}; ${link(S.chabad)}`,
    b: `<ul>
      <li><b>שיטת הימים:</b> לכל שתי ראיות עוקבות (ראיות שאינן מסופקות, לפי סדר הזמן) המרווח הוא הפרש הימים העבריים ועוד 1. היעד: היום העברי של הראייה האחרונה ועוד (מרווח − 1), באותה עונה של הראייה האחרונה.</li>
      <li><b>אילו מרווחים נשמרים:</b> בלי ״שימור הפלגות ארוכות״ נשמר רק המרווח האחרון. עם השימור (אשכנז, ספרד, וחב״ד תמיד): עוברים על המרווחים לפי הסדר, וכל מרווח חדש מוחק את המרווחים הקודמים <b>הקצרים ממנו או השווים לו</b>. נשארים המרווח האחרון וכל מרווח קודם הארוך ממנו שלא בא אחריו מרווח ארוך או שווה לו. אין הגבלת זמן: הפלגה ארוכה נשמרת כל עוד כל המרווחים שאחריה קצרים ממנה.</li>
      <li><b>ראייה בבין השמשות</b> באחת משתי הראיות האחרונות: נשמרים גם כל המרווחים האפשריים מצירופי השיוכים, וכל מרווח מחושב גם מהשיוך החלופי של הראייה האחרונה (בעונה שלו).</li>
      <li><b>שיטת חב״ד:</b> לכל זוג ראיות מחפשים את ההפסק הנקי האחרון ביניהן שנעשה לפני השקיעה ולא בזמן מסופק, ושחל לפחות 4 ימים אחרי יום הראייה הראשונה (או שיש לו הוראה מתועדת). המרווח הוא מספר העונות: (2 × יום ההפסק + 1) עד העונה של הראייה הבאה. כל יום הוא שתי עונות (לילה ואחריו יום), ולכן ההפסק נחשב בעונת היום של יומו. היעד: אותו מספר עונות מההפסק שאחרי הראייה האחרונה (ההפסק התקף הנוכחי, או אחרי טבילה ההפסק שקדם לה). מספר זוגי נופל בעונת יום, אי-זוגי בעונת לילה.</li>
      <li>ראייה שנרשמה כמסופקת אינה משמשת להפלגה, ואינה ״נמחקת״ כדי לחשב מרווח ארוך יותר מהראייה שלפניה. כשאחת משתי הראיות האחרונות מסופקת לא מחושבת הפלגה כלל, ומופיעה נקודה לבירור.</li>
      <li>גם ״ראייה״ שנרשמה בתוך שבעה נקיים (ולא ״חידוש ספירה״) יוצרת מרווח (פרק 13).</li>
    </ul>`,
    notes: [
      "בשיטת חב״ד ההפסק שמשמש בסיס להפלגה חייב להיות לפחות 4 ימים אחרי יום הראייה, בלי קשר להגדרת ההמתנה, ואינו כולל את ההקלה של הפסק אחרי השקיעה. הפסק שנספר לשבעה נקיים (למשל בהמתנה של ארבעה ימים, או בהקלת הרב עובדיה) עלול לא לשמש בסיס להפלגה, ואז מופיעה נקודת בירור ״חסר הפסק לחישוב הפלגה בחב״ד״.",
      `ברירת המחדל למשתמשת חדשה (״מותאם״) אינה שומרת הפלגות ארוכות, בניגוד לכל השיטות המוכנות. ${qRef(7)}`,
      `הפלגה ארוכה שנשמרת אינה פוקעת לעולם: היא נשארת כל עוד כל המרווחים שאחריה קצרים ממנה, גם אחרי מחזורים רבים. ${qRef(5)}`,
    ],
    keys: ["haflagah", "carryLongIntervals"],
    d: example("1. הפלגה ארוכה ואחריה קצרה, חיפה", ex1, only(["onot"])) + example("2. שיטת חב״ד: 52 עונות, נתניה", ex2, ["onot", "reviewsLess"]) + example("3. ראייה מסופקת באמצע", ex3, ["onot", "reviewsLess"]),
  });
}

/* ---------- פרק 6: עונה בינונית ---------- */
function ch6() {
  const exD = { city: "jerusalem", now: "2026-03-12", events: c => [ev("flow", "2026-03-10", "10:00", c)] };
  const exN = { city: "jerusalem", now: "2026-03-12", events: c => [ev("flow", "2026-03-10", "21:30", c)] };
  const variants = [...PRESETS.map(([k, l]) => ({ pk: k, label: l })), { pk: "custom", label: "מותאם + שתי העונות + יום 31", settings: { beinonit: "both", day31: true } }];
  return chapter({
    title: "עונה בינונית (יום 30, יום 31)",
    a: `<p>מי שאין לה וסת קבוע חוששת לעונה הבינונית: היום ה-30 מהראייה, כשיום הראייה הוא יום 1, באותה עונה (לפי הקוד: שו״ע יו״ד קפט, א). יש שנוהגים לחשוש לכל המעת לעת (לפי הערת אשכנז בקוד: כרתי ופלתי; לפי הערת חב״ד: שו״ע הרב, ״מהשקיעה ועד השקיעה״). רבים מהאשכנזים מחמירים גם ביום 31 (חוות דעת, לפי הקוד), ״אינו חובה מן הדין״. לפי הערת ספרד: ״יום 31 אינו נדרש לפי השו״ע״.</p>`,
    src: `שו״ע יו״ד קפט, א; חוות דעת; כרתי ופלתי; שו״ע הרב — כולם כפי שמצוטטים בהערות השיטות ${NV}; ${link(S.average)}; ${link(PS_SRC("day31"))}; ${link(M.METHOD_PRESETS.chabad.notes.find(n => n.k === "beinonit").src)}`,
    b: `<ul>
      <li><b>יום 30:</b> היום העברי של הראייה האחרונה ועוד 29 (ספירה כוללנית). <b>יום 31</b> (אם הופעל): ועוד 30.</li>
      <li><b>״אותה עונה״:</b> רק העונה שבה התחילה הראייה (יום או לילה). <b>״שתי העונות״:</b> עונת הלילה ועונת היום של אותו יום עברי, כלומר מהשקיעה שלפניו ועד השקיעה שלו. זו <i>אינה</i> מעת לעת מרגע הראייה (שיטת כרתי ופלתי כפי שמתוארת בהערה), ואין הגדרה כזאת במנוע.</li>
      <li>מחושבת רק מהראייה האחרונה שאינה מסופקת. בראייה בבין השמשות (״שתי העונות״) נוספים יום 30 (ויום 31) גם לשיוך החלופי, בלי כפילויות.</li>
      <li><b>אור זרוע</b> נוסף ליום 30 בלבד, לא ליום 31 (פרק 7).</li>
      <li>בבחירת חב״ד (הפלגה בעונות) יחד עם ״אותה עונה״ מופיעה נקודת בירור, כי לפי לוח חב״ד העונה הבינונית היא יממה שלמה.</li>
    </ul>`,
    notes: [`בשיטת חב״ד יום 31 כבוי, ובהערה כתוב ״יום 31 אינו כלול בלוח חב״ד שבמקורות. לברר״. ${qRef(4)}`],
    keys: ["beinonit", "day31"],
    d: example("1. ראייה ביום (10:00), ירושלים", exD, ["onot"], variants) + example("2. ראייה בלילה (21:30), ירושלים", exN, ["onot"], variants),
  });
}

/* ---------- פרק 7: אור זרוע ---------- */
function ch7() {
  const ex = { city: "jerusalem", now: "2026-01-07", events: c => [ev("flow", "2025-12-08", "10:00", c), ev("hefsek", "2025-12-12", "15:30", c), ev("mikvah", "2025-12-19", "18:30", c), ev("flow", "2026-01-05", "10:00", c)] };
  const variants = [...PRESETS.map(([k, l]) => ({ pk: k, label: l })), { pk: "custom", label: "מותאם + אור זרוע + שתי העונות", settings: { orZarua: true, beinonit: "both" } }];
  return chapter({
    title: "עונת אור זרוע",
    a: `<p>עונת אור זרוע היא העונה שלפני עונת הווסת הצפויה. לפי הערות הקוד: ״נתקבלה ברוב קהילות אשכנז; מי ששומרת ימים 30 ו-31 שומרת אותה ליום 30 בלבד״ (יועצות הלכה). ״לפי טהרת הבית ספרדים אינם חוששים לעונת אור זרוע. הבן איש חי חשש לה.״ בחב״ד: ״אור זרוע אינו מופעל כאן. לברר עם רב חב״די.״</p>`,
    src: `${link(PS_SRC("orZarua"))}; ${link(M.METHOD_PRESETS.sefard.notes.find(n => n.k === "orZarua").src)}; טהרת הבית; בן איש חי ${NV}`,
    b: `<ul>
      <li>כשההגדרה פעילה, לכל עונת חודש, הפלגה ועונה בינונית ליום 30 (כולל עונות של השיוך החלופי וכולל עונת חודש נוספת) נוספת העונה שלפניה: לעונת יום, הלילה שלפניה (אותו יום עברי); לעונת לילה, עונת היום של היום העברי הקודם.</li>
      <li>לא נוספת ליום 31 ולא לעונה ידנית.</li>
      <li>אם עונת אור זרוע זהה בדיוק (אותם שעות התחלה וסוף) לעונה אחרת שכבר מוצגת, למשל בעונה בינונית של יממה שלמה, היא אינה מוצגת פעמיים.</li>
      <li>חלון עונת אור זרוע מחושב לפי הזריחה והשקיעה בלבד, כמו כל עונה (פרק 8).</li>
    </ul>`,
    notes: [
      `אור זרוע אינו נוסף ליום 31, בהתאם להערה בשם יועצות הלכה. מי ששומרת רק יום 31 (בלי יום 30) אינה אפשרות במנוע: יום 30 תמיד נשמר. ${qRef(6)}`,
      "בעונה בינונית של שתי העונות, אור זרוע של עונת הלילה הוא עונת היום של יום 29.",
    ],
    keys: ["orZarua"],
    d: example("ראייה ביום, וראייה קודמת 28 ימים לפניה, ירושלים", ex, ["onot"], variants),
  });
}

/* ---------- פרק 8: משך הפרישה ---------- */
function ch8() {
  const ex = { city: "jerusalem", now: "2026-06-12", events: c => [ev("flow", "2026-06-10", "10:00", c)] };
  const rows = [["ashkenaz", "אשכנז"], ["chabad", "חב״ד"]].map(([pk, l]) => {
    const { r } = runCase(ex, pk);
    return r.plans.filter(p => SEP.includes(p.kind)).map(p => `<tr><td>${esc(l)}</td><td>${esc(p.title)}</td><td>${planText(p, false)}</td><td class="num">${hm(new Date(p.start), "Asia/Jerusalem")}</td><td class="num">${hm(new Date(p.end), "Asia/Jerusalem")}</td><td class="num">${dur(new Date(p.end) - new Date(p.start))}</td></tr>`).join("");
  }).join("");
  return chapter({
    title: "זמני הפרישה בעונה ומשכה",
    a: `<p>בעונת הווסת הצפויה פורשים עונה אחת: יום או לילה, לפי העונה שבה החשש. כשנוהגים לפי המעת לעת (עונה בינונית בחב״ד ולמחמירים), פורשים יממה. עונת אור זרוע מוסיפה את העונה שלפני.</p>
      <p class="fine">שאלה שלא נבדקה: האם עונת יום נמשכת רק עד השקיעה או עד צאת הכוכבים. ${NV}</p>`,
    src: `שו״ע יו״ד סי׳ קפד ${NV}; ${link(S.calendar)}`,
    b: `<ul>
      <li><b>עונת יום:</b> מהזריחה (המדויקת) ועד השקיעה (המעוגלת כלפי מטה) של אותו תאריך אזרחי.</li>
      <li><b>עונת לילה:</b> מהשקיעה של התאריך האזרחי הקודם ועד הזריחה. בין השמשות שבסוף עונת יום אינו נכלל בה. הוא חלק מעונת הלילה שאחריה.</li>
      <li>המקום: לפי המקום שבו היא נמצאת בתאריך האזרחי של העונה (לעונת לילה, התאריך של הערב), כלומר העיר שבהגדרות או עיר הנסיעה (פרק 15).</li>
      <li>אין תוספת זמן לפני העונה או אחריה. האפליקציה מציגה את החלון ושולחת תזכורת (פרק 18); היא אינה מפרטת מה אסור בעונה.</li>
    </ul>`,
    notes: [`עונת יום מסתיימת בשקיעה, ולא בצאת הכוכבים. אם יש להחמיר בבין השמשות שבסוף עונת יום, המנוע אינו עושה זאת. ${qRef(14)}`],
    keys: ["beinonit"],
    d: `<div class="example"><h5>חלונות הפרישה לראייה ב-${civ("2026-06-10")} בשעה 10:00, ירושלים</h5><table class="res"><thead><tr><th>שיטה</th><th>מועד</th><th>עונה</th><th>מ-</th><th>עד</th><th>משך (שעות)</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  });
}

/* ---------- פרק 9: המתנה ---------- */
function ch9() {
  const c0 = "netanya", T = (d, cid, m) => offsetTime(M.sun(d, M.city(cid)).sunset, m, M.city(cid).tz);
  const cases = [
    ["ראייה ביום ראשון 10:00", { city: c0, now: "2026-11-02", events: c => [ev("flow", "2026-11-01", "10:00", c)] }],
    ["ראייה ביום ראשון 21:00 (ליל שני)", { city: c0, now: "2026-11-02", events: c => [ev("flow", "2026-11-01", "21:00", c)] }],
    ["ראייה 10 דקות אחרי השקיעה ביום ראשון", { city: c0, now: "2026-11-02", events: c => [ev("flow", "2026-11-01", T("2026-11-01", c0, 10), c)] }],
    ["ראייה 2 דקות לפני השקיעה ביום ראשון", { city: c0, now: "2026-11-02", events: c => [ev("flow", "2026-11-01", T("2026-11-01", c0, -2), c)] }],
  ];
  const rows = cases.map(([t, def]) => `<tr><td>${esc(t)}<br><span class="civ">${(() => { idCounter = 0; const e = def.events(def.city)[0]; const s = M.stamp(e); return `${e.time} · ${s.hebrewDate}, ${s.onah === "day" ? "יום" : "לילה"}${s.uncertain ? ", ספק" : ""}`; })()}</span></td>${PRESETS.map(([pk]) => { const { r } = runCase(def, pk); return `<td>${cell("wait", r, def.city)}</td>`; }).join("")}</tr>`).join("");
  const relSunset = M.sun("2026-07-06", M.city("jerusalem")).sunset, relTime = offsetTime(relSunset, -8, "Asia/Jerusalem");
  const exRel = { city: "jerusalem", now: "2026-07-10", events: c => [ev("intimacy", "2026-07-06", relTime, c), ev("flow", "2026-07-07", "10:00", c), ev("hefsek", "2026-07-09", "08:00", c)] };
  const relInst = M.localInstant("2026-07-06", relTime, "Asia/Jerusalem"), hefInst = M.localInstant("2026-07-09", "08:00", "Asia/Jerusalem");
  REL_HOURS = dur(hefInst - relInst);
  const exNoRel = { city: "jerusalem", now: "2026-07-10", events: c => [ev("flow", "2026-07-07", "10:00", c)] };
  const relVariants = [{ pk: "custom", label: "מותאם + ״ארבעה ימים ממועד היחסים״", settings: { wait: "four-from-relations" } }, { pk: "sefard", label: "הרב עובדיה / ספרד (ארבעה ימים מהראייה)" }];
  return chapter({
    title: "ההמתנה לפני הפסק הטהרה",
    a: `<p>לפי הקוד: ״חמישה ימים מתחילת הווסת: יום הראייה הוא יום 1, וההפסק ביום החמישי לפני השקיעה (רמ״א יו״ד קצו, יא; כך נוהגים כל קהילות אשכנז)״. לפי הערת ספרד: ״ארבעה ימים: יום הראייה הוא יום 1 וההפסק ביום הרביעי (ראתה בליל שני — הפסק ביום חמישי). לפי הרב עובדיה יסוד הדין הוא 72 שעות מהתשמיש; אם לא היו יחסים בארבעת הימים שלפני הראייה, יש שמתירים הפסק מיד כשפסק הדם. רבים מפוסקי ספרד ממתינים חמישה ימים.״</p>
      <p>לפי הקוד, חידוש ספירה בתוך תקופת הנידה (ראתה שוב בשבעה נקיים) אינו מחייב חמישה ימים חדשים. ${NV}</p>`,
    src: `רמ״א יו״ד קצו, יא, כפי שמצוטט ${NV}; ${link(S.wait)}; ${link(M.METHOD_PRESETS.sefard.notes.find(n => n.k === "wait").src)}; ${link("https://shoam.org.il/18862/")}`,
    b: `<ul>
      <li><b>״חמישה ימים״:</b> ההפסק המוקדם הוא ביום העברי של הראייה ועוד 4.</li>
      <li><b>״ארבעה ימים מתחילת הנידה״:</b> ביום העברי של הראייה ועוד 3. אין בדיקה של מועד היחסים.</li>
      <li><b>״ארבעה ימים ממועד היחסים״:</b> הבסיס הוא רישום ״בסיס להמתנת ארבעה ימים״ האחרון שקדם לראייה. ההפסק המוקדם: יום היחסים העברי ועוד 3, אבל לא לפני יום הראייה. הספירה בימים עבריים, לא בשעות. בלי רישום בסיס, או כשהבסיס בזמן מסופק, אין חישוב ומופיעה נקודת בירור ״חסר מועד בסיס להמתנה״.</li>
      <li><b>ראייה בבין השמשות</b> (״שתי העונות״): בשתי האפשרויות הראשונות סופרים מהיום העברי המאוחר מבין השיוכים. באפשרות היחסים משתמשים בשיוך העיקרי של הראייה.</li>
      <li><b>חידוש ספירה</b> (פרק 13): הבסיס הוא הראייה האחרונה שלפניו (אחרי הטבילה האחרונה), וההפסק לא לפני יום החידוש.</li>
      <li><b>ראייה מסופקת</b>, או ראייה סמוך לגבול בהגדרת ״השעיה״: אין הפסק מוקדם מחושב, וכל הפסק דורש הוראה מתועדת.</li>
      <li><b>תזכורת:</b> ביום ההפסק המוקדם (ואם עבר, ביום העברי הנוכחי), מ-״דקות לפני השקיעה״ (ברירת מחדל 30) ועד השקיעה. התזכורת אומרת שעושים הפסק רק אם הדימום פסק. המנוע לעולם אינו רושם הפסק בעצמו.</li>
    </ul>`,
    notes: [
      `באפשרות ״ארבעה ימים ממועד היחסים״ הספירה בימים, לא ב-72 שעות, והפסק מתקבל בכל שעה ביום הרביעי לפני השקיעה. בדוגמה 2 נרשמו יחסים ב-${relTime}, 8 דקות לפני השקיעה, וההפסק ביום הרביעי בשעה 08:00 התקבל בלי סימון, <b>${dur(hefInst - relInst)} שעות</b> אחרי היחסים, פחות מ-72. ${qRef(1)}`,
      "באפשרות היחסים, בראייה בבין השמשות, משתמשים ביום העיקרי ולא ביום המאוחר, בשונה משתי האפשרויות האחרות.",
      `בשיטת ספרד (״ארבעה ימים מתחילת הנידה״) המנוע אינו שואל אם היו יחסים בימים שלפני הראייה. ${qRef(1)}`,
    ],
    keys: ["wait"],
    d: `<div class="example"><h5>1. ההפסק המוקדם ביותר לפי שעת הראייה, נתניה, ${civ("2026-11-01")}</h5><table class="res"><thead><tr><th>ראייה</th>${PRESETS.map(([, l]) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`
      + example("2. ארבעה ימים ממועד היחסים: יחסים ביום שני לפני השקיעה, ראייה ביום שלישי, הפסק ביום חמישי בבוקר", exRel, ["wait", "hefsek", "reviewsLess"], relVariants)
      + example("3. ״ארבעה ימים ממועד היחסים״ בלי רישום בסיס", exNoRel, ["wait", "reviews"], [{ pk: "custom", label: "מותאם + ״ארבעה ימים ממועד היחסים״", settings: { wait: "four-from-relations" } }]),
  });
}

/* ---------- פרק 10: הפסק טהרה ---------- */
function ch10() {
  const cid = "jerusalem", tz = "Asia/Jerusalem", d5 = "2026-07-10", s5 = M.sun(d5, M.city(cid));
  const times = [["16:00", "לפני השקיעה"], [offsetTime(s5.sunset, -2, tz), "2 דקות לפני השקיעה"], [offsetTime(s5.sunset, 8, tz), "8 דקות אחרי השקיעה"], [offsetTime(s5.sunset, 18, tz), "18 דקות אחרי השקיעה"], ["21:00", "בלילה, לפני חצות"]];
  const mk = (date, time, extra) => ({ city: cid, now: "2026-07-12", events: c => [ev("flow", "2026-07-06", "10:00", c), ev("hefsek", date, time, c, extra)] });
  const z = M.sun(d5, M.city(cid), "13.5z").nightfall;
  const cases = [...times.map(([t, l]) => [`יום ה׳ לספירה (${civ(d5)}), ${l} (${t})`, mk(d5, t)]),
    [`אחרי חצות, ליל ${hshort("2026-07-11")} (${civ("2026-07-11")}, 01:00)`, mk("2026-07-11", "01:00")],
    [`יום ג׳ (${civ("2026-07-08")}, 16:00), לפני סוף ההמתנה`, mk("2026-07-08", "16:00")],
    [`יום ג׳ (${civ("2026-07-08")}, 16:00), עם הוראה מתועדת`, mk("2026-07-08", "16:00", { authorityNote: "הוראת מורה הוראה לדוגמה" })]];
  const rows = cases.map(([t, def]) => `<tr><td>${esc(t)}</td>${PRESETS.map(([pk]) => { const { r } = runCase(def, pk); const rv = r.reviews.filter(x => /^hefsek|^boundary/.test(x.id)).map(x => x.title); return `<td>${r.hefsek ? `<span class="good">התקבל</span>; יום א׳: ${hshort(M.addDays(r.immersionDate, -6))}` : `<span class="bad">לא התקבל</span>`}${rv.length ? `<ul class="rv">${[...new Set(rv)].map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</td>`; }).join("")}</tr>`).join("");
  return chapter({
    title: "הפסק טהרה",
    a: `<p>ההפסק נעשה ביום, לפני השקיעה, אחרי סוף ההמתנה (פרק 9). לפי הערת אשכנז: ״לרוב פוסקי אשכנז הפסק אחרי השקיעה אינו תקף אף בדיעבד״. לפי הערת ספרד: ״הפסק לכתחילה לפני השקיעה. בדיעבד, לפי טהרת הבית, הפסק עד 13.5 דקות זמניות אחרי השקיעה תקף ונספר ליום שהסתיים (יש שכתבו שבארץ ישראל השיעור קצר יותר)״.</p>`,
    src: `שו״ע יו״ד סי׳ קצו ${NV}; טהרת הבית ${NV}; ${link(S.hefsek)}; ${link(PS_SRC("hefsekTwilight"))}; ${link(M.METHOD_PRESETS.sefard.notes.find(n => n.k === "hefsekTwilight").src)}`,
    b: `<ul>
      <li><b>מה נחשב הפסק:</b> רישום מסוג ״הפסק טהרה״ שתוצאתו ״נקייה״, אחרי הראייה (או חידוש הספירה) האחרון ואחרי הטבילה האחרונה. כשיש כמה, נספר האחרון שעומד בכל התנאים.</li>
      <li><b>לפני השקיעה:</b> הרגע לפני השקיעה של היום העברי שלו, ולא בזמן מסופק. הפסק עד 3 דקות לפני השקיעה, או עד 3 דקות מהזריחה, אינו מתקבל (״זמן ההפסק דורש בירור״).</li>
      <li><b>״בדיעבד עד 13.5 דקות זמניות״ (ספרד):</b> הפסק בזמן מסופק (עד 3 דקות לפני השקיעה, או אחריה עד צאת הכוכבים לפי ההגדרה) שנעשה לפני 13.5 דקות זמניות אחרי שקיעת אותו יום, נספר ליום שהסתיים ומסומן ״תקף בדיעבד״. השיעור מחושב תמיד כ-13.5 דקות זמניות, בלי קשר להגדרת צאת הכוכבים. בירושלים ב-${civ(d5)}: עד ${hm(z, tz)}.</li>
      <li><b>לא לפני סוף ההמתנה:</b> הפסק ביום מוקדם מההפסק המוקדם המחושב, או כשלא חושב הפסק מוקדם, מתקבל רק כשנרשמה בו ״הוראה מתועדת״ (טקסט חופשי). אחרת: ״הפסק לפני מועד ההמתנה המחושב״.</li>
      <li><b>בלי ראייה רשומה:</b> הפסק מתקבל רק עם הוראה מתועדת.</li>
      <li><b>הפסק אחרי חצות ולפני הזריחה:</b> מתקבל, נספר ליום העברי של אותו לילה (יום א׳ הוא היום שאחריו), ומסומן ״הפסק שנרשם בלילה״.</li>
      <li>הפסק שתוצאתו ״ממתינה לבירור״ או ״לא נקייה״ אינו נספר; ״ממתינה לבירור״ מופיע בנקודות לבירור.</li>
    </ul>`,
    notes: [
      `<b>חוסר עקביות בהפסק בלילה:</b> הפסק בשעה 21:00 (אחרי השקיעה) נדחה, אבל הפסק באותו לילה עברי בשעה 01:00 (אחרי חצות) מתקבל ונספר לאותו יום. הסיבה: המנוע משווה לשקיעה של התאריך האזרחי שבו נרשם ההפסק, ואחרי חצות זו השקיעה שעוד לא הגיעה. ראו בטבלה. ${qRef(13)}`,
      `בהגדרת הרב עובדיה, הפסק עד 3 דקות אחרי הזריחה (שמסומן כסמוך לגבול) מתקבל ומסומן ״הפסק סמוך לשקיעה או אחריה — תקף בדיעבד״, אף שאינו קשור לשקיעה. בלי ההגדרה הוא נדחה כ״זמן ההפסק דורש בירור״. שני המצבים חריגים, ובשניהם הנוסח אינו מתאים למקרה. ${qRef(19)}`,
    ],
    keys: ["hefsekTwilight", "wait"],
    d: `<div class="example"><h5>ראייה ב-${civ("2026-07-06")} 10:00 בירושלים, והפסק בזמנים שונים (שקיעה ב-${civ(d5)}: ${hm(s5.sunset, tz)})</h5><table class="res small"><thead><tr><th>ההפסק</th>${PRESETS.map(([, l]) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`,
  });
}

/* ---------- פרק 11: שבעה נקיים ובדיקות ---------- */
function ch11() {
  const cid = "jerusalem", tz = "Asia/Jerusalem";
  const sr = M.sun("2026-07-10", M.city(cid)).sunrise;
  const def = { city: cid, now: "2026-07-18", nowTime: "12:00", events: c => [ev("flow", "2026-07-05", "10:00", c), ev("hefsek", "2026-07-09", "16:00", c),
    ev("bedikah", "2026-07-10", "04:00", c), ev("bedikah", "2026-07-10", "05:00", c), ev("bedikah", "2026-07-10", offsetTime(sr, 1, tz), c),
    ev("bedikah", "2026-07-11", "21:00", c), ev("bedikah", "2026-07-12", "08:00", c), ev("bedikah", "2026-07-12", "18:30", c), ev("bedikah", "2026-07-13", "11:50", c), ev("bedikah", "2026-07-13", "12:10", c),
    ev("bedikah", "2026-07-14", "09:00", c, { result: "bleeding" })] };
  const { r } = runCase(def, "ashkenaz");
  const h = M.isoAbs("2026-07-09");
  const rows = [1, 2, 3, 4, 5, 6, 7].map(n => {
    const d = M.fromAbs(h + n), s = M.sun(d, M.city(cid), "8.5");
    const am = r.plans.find(p => p.kind === "bedikah" && p.day === n && /-am$/.test(p.id)), pm = r.plans.find(p => p.kind === "bedikah" && p.day === n && /-pm$/.test(p.id));
    return `<tr><td>${n}</td><td>${heb(d)}<br><span class="civ">${civ(d)}, ${wd(d)}</span></td><td class="num">${hm(s.dawn, tz)}</td><td class="num">${hm(s.sunrise, tz)}</td><td class="num">${hm(s.sunset, tz)}</td><td class="num">${am ? hm(new Date(am.start), tz) : "—"}${am && am.done ? " ✓" : ""}</td><td class="num">${pm ? hm(new Date(pm.start), tz) : "—"}${pm && pm.done ? " ✓" : ""}</td><td>${(r.checks[n] || []).map(e => e.time).join(", ") || "—"}</td></tr>`;
  }).join("");
  const firstLast = runCase(def, "custom", { bedikot: "first-last" }).r;
  return chapter({
    title: "שבעה נקיים ובדיקות",
    a: `<p>אחרי ההפסק סופרים שבעה ימים נקיים, שהיום הראשון שלהם הוא היום שאחרי ההפסק. לפי הקוד: ״בדיקה בבוקר ולפני השקיעה בכל אחד משבעת הימים לכתחילה (שו״ע יו״ד קצו, ד)״. יש שהורו לבדוק ביום הראשון והשביעי בלבד (אפשרות ״לפי הוראה״).</p>`,
    src: `שו״ע יו״ד קצו, ד, כפי שמצוטט ${NV}; ${link(S.clean)}`,
    b: `<ul>
      <li><b>הימים:</b> יום n (1 עד 7) הוא היום העברי של ההפסק ועוד n. ליל הטבילה במוצאי יום 7 (פרק 12).</li>
      <li><b>בדיקה נספרת ליום n</b> אם: תוצאתה ״נקייה״; היום העברי שלה הוא יום n; היא בין עלות השחר (16.1°) לשקיעה של אותו יום, ואם אין עלות השחר מחושב (קיץ בקווי רוחב גבוהים), בין הזריחה לשקיעה; והיא אינה בזמן מסופק (3 דקות מהזריחה או מהשקיעה, או בין השמשות).</li>
      <li><b>בוקר וערב</b> מוכרעים לפי שעון הקיר: לפני 12:00 ״בוקר״, מ-12:00 ״ערב״. לא לפי חצות היום ההלכתי.</li>
      <li><b>תזכורות</b> (״בוקר וערב״): בדיקת בוקר מ״שעת בדיקת בוקר״ (ברירת מחדל 08:00), אך לא לפני הזריחה, ועד השקיעה. בדיקת ערב מ״דקות לפני השקיעה״ (ברירת מחדל 30) ועד השקיעה. ב״ראשון ושביעי״ יש תזכורת אחת בלבד, בימים 1 ו-7. תזכורת שנרשמה לה בדיקה מסומנת כבוצעה ואינה נשלחת.</li>
      <li><b>סימונים:</b> אם ביום 1 או ביום 7 אין בדיקה שנספרה, מופיע ״לא נרשמה בדיקה ביום הראשון/השביעי״, אבל רק מהיום האזרחי שאחריו. בדיקה נקייה בימי הספירה שנרשמה בלילה או לפני עלות השחר מסומנת ״בדיקה שנרשמה מחוץ לשעות היום״. בדיקה ״לא נקייה״ מסומנת לבירור, והספירה <b>אינה</b> מתאפסת אוטומטית.</li>
      <li>המנוע אינו פוסל ואינו מאשר ספירה. ליל הטבילה מוצג כ״מתוכנן״ גם כשחסרות בדיקות.</li>
    </ul>`,
    notes: [
      `בדיקה עד 3 דקות אחרי הזריחה (שהיא ודאי אחרי עלות השחר) אינה נספרת, כי הרגע מסומן כסמוך לגבול העונה. היא מופיעה כ״רישום סמוך לגבול״ ולא כבדיקה. בטבלה: הבדיקה ביום 1 דקה אחרי הזריחה לא נספרה. נראה שזו טעות, כי לבדיקה אין חשיבות לגבול שבין עונת לילה לעונת יום. ${qRef(17)}`,
      "חוסר בדיקה בימים 2 עד 6 אינו מסומן כלל. חוסר בדיקה ביום 7 מסומן רק ביום האזרחי שאחריו, כלומר לא בליל הטבילה עצמו (ליל הטבילה עדיין באותו תאריך אזרחי).",
      `ההבחנה בין בוקר לערב לפי השעה 12:00 בשעון, לא לפי חצות היום. בשעון קיץ חצות היום בישראל קרובה ל-12:45. בטבלה: הבדיקה ביום 4 בשעה 11:50 נחשבה בוקר, ו-12:10 ערב. ${qRef(9)}`,
    ],
    keys: ["bedikot"],
    c: `<p class="fine">״שעת בדיקת בוקר״ ו״דקות לפני השקיעה״ הן הגדרות תזכורת, ואינן חלק מהשיטות המוכנות.</p>`,
    d: `<div class="example"><h5>הפסק ב-${civ("2026-07-09")} 16:00 בירושלים; בדיקות שנרשמו (שיטת אשכנז; ״✓״ = נרשמה בדיקה)</h5>${eventsTable(def)}
      <table class="res small"><thead><tr><th>יום</th><th>תאריך</th><th>עלות השחר</th><th>זריחה</th><th>שקיעה</th><th>תזכורת בוקר</th><th>תזכורת ערב</th><th>בדיקות שנספרו</th></tr></thead><tbody>${rows}</tbody></table>
      <p><b>נקודות לבירור (אשכנז):</b></p>${reviewList(r)}
      <p><b>אותו מקרה, ״ראשון ושביעי״:</b> ${firstLast.plans.filter(p => p.kind === "bedikah").map(p => `${esc(p.title)} (${hm(new Date(p.start), tz)})`).join("; ")}.</p></div>`,
  });
}

/* ---------- פרק 12: ליל הטבילה ---------- */
function ch12() {
  const ex = { city: "jerusalem", now: "2026-07-12", events: c => [ev("flow", "2026-07-05", "10:00", c), ev("hefsek", "2026-07-09", "16:00", c)] };
  const P = N(15, 1, 5787);
  const cal = [
    ["ליל שבת (תרחיש השוואה 12)", { city: "tel-aviv", now: "2026-10-25", events: c => [ev("flow", "2026-10-18", "10:00", c), ev("hefsek", "2026-10-23", "15:00", c)] }],
    ["יום שביעי בשבת", { city: "tel-aviv", now: "2026-10-27", events: c => [ev("flow", "2026-10-19", "10:00", c), ev("hefsek", "2026-10-24", "11:00", c)] }],
    ["ליל יום הכיפורים (תרחיש השוואה 13)", { city: "jerusalem", now: "2026-09-15", events: c => [ev("flow", "2026-09-08", "10:00", c), ev("hefsek", "2026-09-13", "16:00", c)] }],
    ["ליל ט״ו ניסן תשפ״ז, ירושלים", { city: "jerusalem", now: M.addDays(P, -5), events: c => [ev("flow", M.addDays(P, -14), "10:00", c), ev("hefsek", M.addDays(P, -8), "15:00", c)] }],
    ["ליל ט״ז ניסן תשפ״ז, ירושלים (יום טוב שני — לא בארץ)", { city: "jerusalem", now: M.addDays(P, -4), events: c => [ev("flow", M.addDays(P, -13), "10:00", c), ev("hefsek", M.addDays(P, -7), "15:00", c)] }],
    ["ליל ט״ז ניסן תשפ״ז, ניו יורק (יום טוב שני של גלויות)", { city: "new-york", now: M.addDays(P, -4), events: c => [ev("flow", M.addDays(P, -13), "10:00", c), ev("hefsek", M.addDays(P, -7), "15:00", c)] }],
    ["ליל תשעה באב נדחה (י׳ אב תשפ״ו)", { city: "jerusalem", now: M.addDays(N(10, 5, 5786), -4), events: c => [ev("flow", M.addDays(N(10, 5, 5786), -13), "10:00", c), ev("hefsek", M.addDays(N(10, 5, 5786), -8), "15:00", c)] }],
  ];
  const calRows = cal.map(([t, def]) => { const { r } = runCase(def, "ashkenaz"); const mkp = r.plans.find(p => p.kind === "mikvah"); return `<tr><td>${esc(t)}</td><td>${mkp ? `מוצאי ${heb(mkp.date)}<br><span class="civ">${civ(mkp.date)}, ${wd(mkp.date)}, ${hm(new Date(mkp.start), M.city(mkp.cityId).tz)}</span>` : "—"}</td><td>${reviewList({ reviews: r.reviews.filter(x => /^mikvah/.test(x.id)) })}</td></tr>`; }).join("");
  const s7 = M.sun("2026-07-16", M.city("jerusalem")).sunset;
  const exEarly = { city: "jerusalem", now: "2026-07-17", events: c => [ev("flow", "2026-07-05", "10:00", c), ev("hefsek", "2026-07-09", "16:00", c), ev("mikvah", "2026-07-16", offsetTime(s7, 25, "Asia/Jerusalem"), c)] };
  return chapter({
    title: "ליל הטבילה",
    a: `<p>הטבילה בלילה שאחרי היום השביעי, אחרי צאת הכוכבים. בליל שבת ויום טוב יש הלכות מיוחדות להכנות, ובליל יום הכיפורים ותשעה באב אין טובלים (לפי נוסח נקודות הבירור בקוד). טבילה ביום השביעי עצמו אינה מותרת לכתחילה. ${NV}</p>`,
    src: `שו״ע יו״ד סי׳ קצז ${NV}; ${link(S.clean)}`,
    b: `<ul>
      <li><b>התאריך:</b> התאריך האזרחי של יום 7 (יום ההפסק העברי ועוד 7), בערב.</li>
      <li><b>השעה:</b> צאת הכוכבים לפי ההגדרה שנבחרה (8.5° באשכנז ובחב״ד, 20 דקות בספרד), במקום שבו היא נמצאת ביום 7 (כולל נסיעות), מעוגל כלפי מעלה.</li>
      <li><b>לוח השנה</b> (סימון בלבד, המועד אינו מוזז): ליל טבילה בליל שבת; ביום טוב (בארץ: ט״ו וכ״א ניסן, ו׳ סיון, א׳–ב׳ תשרי, ט״ו וכ״ב תשרי; בחו״ל נוספים ט״ז וכ״ב ניסן, ז׳ סיון, ט״ז וכ״ג תשרי); ביום הכיפורים; בתשעה באב (או בי׳ אב כשט׳ באב בשבת). וגם יום 7 שחל בשבת, ביום טוב או בצום. ״בארץ״ = אזור הזמן של המקום הוא Asia/Jerusalem.</li>
      <li><b>טבילה מוקדמת:</b> טבילה שנרשמה לפני צאת הכוכבים של יום 7 להפסק שקדם לה מסומנת ״הטבילה נרשמה לפני ליל הטבילה המחושב״. היא אינה נפסלת ואינה מאושרת. אין במנוע אפשרות לתכנן טבילה ביום השמיני או טבילה ביום.</li>
      <li>אחרי יום 7, בלי רישום טבילה, השלב הוא ״אחרי היום השביעי״. הטבילה לעולם אינה נרשמת אוטומטית.</li>
    </ul>`,
    notes: [
      `צאת הכוכבים של 20 דקות בשיטת ספרד מסומן בקוד ״לברר עם רב מתי לטבול״. זה ערך זמני. ${qRef(3)}`,
      `ההבחנה בין ארץ ישראל לחו״ל ליום טוב שני נעשית לפי אזור הזמן של המקום. מקום שאזור הזמן שלו אחר (למשל מקום שהמשתמשת הוסיפה ושהמכשיר דיווח בו אזור זמן אחר) ייחשב חו״ל. ${qRef(12)}`,
      "בליל יום הכיפורים ובתשעה באב ליל הטבילה ממשיך להופיע בצאת הכוכבים של אותו לילה, עם סימון. המנוע אינו מציע מועד חלופי.",
      "אין סימון לליל טבילה בערב שבת או ערב יום טוב, כשהמקווה עשוי לפעול בשעות אחרות. אין סימון לחול המועד או לפורים.",
    ],
    keys: ["nightfall"],
    d: example("1. שעת ליל הטבילה לפי כל שיטה, ירושלים", ex, ["clean", "mikvah"])
      + `<div class="example"><h5>2. לוח השנה (שיטת אשכנז)</h5><table class="res small"><thead><tr><th>מקרה</th><th>ליל הטבילה</th><th>סימונים</th></tr></thead><tbody>${calRows}</tbody></table></div>`
      + example("3. טבילה שנרשמה 25 דקות אחרי שקיעת היום השביעי", exEarly, ["phase", "reviewsLess"]),
  });
}

/* ---------- פרק 13: ראייה בשבעה נקיים / חידוש ספירה ---------- */
function ch13() {
  const base = c => [ev("flow", "2026-07-05", "10:00", c), ev("hefsek", "2026-07-09", "16:00", c), ev("bedikah", "2026-07-10", "08:00", c)];
  const exFlow = { city: "jerusalem", now: "2026-07-12", desc: "ראייה ב-5 ביולי, הפסק ב-9 ביולי, ובשבעה נקיים ב-11 ביולי נרשמה ״ראייה״ (תחילת וסת).", events: c => [...base(c), ev("flow", "2026-07-11", "10:00", c)] };
  const exRestart = { city: "jerusalem", now: "2026-07-12", desc: "אותו מקרה, אבל ב-11 ביולי נרשם ״חידוש ספירה לפי הוראה״.", events: c => [...base(c), ev("restart", "2026-07-11", "10:00", c)] };
  return chapter({
    title: "ראייה בתוך שבעה נקיים וחידוש ספירה",
    a: `<p>ראתה בתוך שבעה נקיים: הספירה נפסקת, וצריך הפסק טהרה חדש ושבעה נקיים חדשים. לפי הקוד אינה צריכה להמתין שוב חמישה (או ארבעה) ימים. ${NV} אם ראייה כזו נחשבת לעניין הפלגה ועונה בינונית לא נבדק במקורות. ${NV}</p>`,
    src: `${link(S.wait)}; ${link(S.clean)}`,
    b: `<ul>
      <li>יש שני סוגי רישום: <b>״ראייה (תחילת וסת)״</b> ו<b>״חידוש ספירה לפי הוראה״</b>. ההתנהגות שונה מאוד.</li>
      <li><b>חידוש ספירה:</b> ההמתנה נספרת מהראייה האחרונה שלפניו (אחרי הטבילה האחרונה), וההפסק לא לפני יום החידוש. החידוש <b>אינו</b> יוצר עונות פרישה (לא עונת חודש, לא הפלגה, לא עונה בינונית), ואינו משנה את העונות של הראייה הקודמת. בלי ראייה קודמת: ״חסר בסיס לחידוש הספירה״, וההמתנה נספרת מהחידוש עצמו.</li>
      <li><b>ראייה:</b> נחשבת ראייה חדשה לכל דבר: המתנה מלאה מחדש (5 או 4 ימים מהיום שלה), עונת חודש, עונה בינונית, הפלגה (גם הפלגה קצרה מהראייה הקודמת), ושמירת עונת החודש של הראייה הקודמת.</li>
      <li>בדיקה שנרשמה ״לא נקייה״ אינה מפעילה אף אחד מהם. היא רק מסומנת לבירור.</li>
    </ul>`,
    notes: [
      `רישום ״ראייה״ בתוך שבעה נקיים מחייב המתנה מלאה מחדש. לפי הקוד עצמו (כלל ״חידוש ספירה״) אין צורך בכך. התוצאה תלויה באיזה כפתור המשתמשת בחרה. ${qRef(10)}`,
      `״חידוש ספירה״ אינו יוצר עונות פרישה, ו״ראייה״ כן, כולל הפלגה קצרה (בדוגמה: הפלגה של 7 ימים). ${qRef(10)}`,
    ],
    keys: ["wait"],
    d: example("1. נרשמה ״ראייה״ בשבעה נקיים", exFlow, ["wait", "onot"]) + example("2. נרשם ״חידוש ספירה״", exRestart, ["wait", "onot", "reviewsLess"]),
  });
}

/* ---------- פרק 14: וסת קבוע ---------- */
function ch14() {
  const Y = 5786;
  const ex1 = { city: "netanya", now: N(12, 3, Y), events: c => [ev("flow", N(10, 1, Y), "10:00", c), ev("flow", N(10, 2, Y), "10:00", c), ev("flow", N(10, 3, Y), "10:00", c)] };
  const ex2 = { city: "netanya", now: "2026-04-10", events: c => [ev("flow", "2026-01-01", "10:00", c), ev("flow", "2026-01-27", "10:00", c), ev("flow", "2026-02-22", "10:00", c), ev("flow", "2026-03-20", "10:00", c)] };
  return chapter({
    title: "וסת קבוע",
    a: `<p>וסת קבוע נקבע בשלוש ראיות בדפוס קבוע (אותו יום בחודש, או אותה הפלגה), ויש לו דינים אחרים של קביעה ועקירה. האפליקציה אינה מחשבת וסת קבוע.</p>`,
    src: `${link(S.fixed)}`,
    b: `<ul>
      <li><b>״דפוס חודשי אפשרי״:</b> שלוש הראיות האחרונות (שאינן מסופקות) באותה עונה, באותו יום בחודש העברי, בשלושה חודשים רצופים.</li>
      <li><b>״שלוש הפלגות שוות בארבע ראיות״:</b> ארבע הראיות האחרונות, עם שלושה מרווחים שווים (מחושבים כאן כהפרש ימים, בלי תוספת 1), ושלוש האחרונות באותה עונה.</li>
      <li>בשני המקרים מופיעה נקודת בירור בלבד. העונות ממשיכות להיות מחושבות כווסת שאינו קבוע: אין ביטול של עונה בינונית, אין קביעה ואין עקירה.</li>
      <li>אין זיהוי של וסת הדילוג, וסת הסירוג, וסת שבוע, וסת הגוף או הפלגה בעונות (חב״ד).</li>
    </ul>`,
    notes: ["זיהוי שלוש ההפלגות אינו בודק את עונת הראייה הראשונה, אלא רק של שלוש האחרונות."],
    keys: [],
    d: example("1. שלוש ראיות בי׳ ניסן, י׳ אייר, י׳ סיון", ex1, ["reviewsLess"]) + example("2. ארבע ראיות במרווח 26 ימים", ex2, ["onot", "reviewsLess"]),
  });
}

/* ---------- פרק 15: נסיעות ואזורי זמן ---------- */
function ch15() {
  const Y = 5786;
  const exTrip = { city: "netanya", now: N(10, 1, Y), events: c => [ev("flow", N(2, 1, Y), "10:00", c)], trips: () => [{ id: nextId(), from: N(28, 1, Y), to: N(4, 2, Y), cityId: "paris" }] };
  const exNo = { city: "netanya", now: N(10, 1, Y), events: c => [ev("flow", N(2, 1, Y), "10:00", c)] };
  const exDst = { city: "jerusalem", now: "2026-10-27", events: c => [ev("flow", "2026-10-25", "01:30", c)] };
  const exDl = { city: "sydney", now: "2026-05-20", events: () => [ev("flow", "2026-04-01", "10:00", "los-angeles"), ev("hefsek", "2026-04-05", "15:00", "los-angeles"), ev("flow", "2026-05-01", "10:00", "sydney")] };
  return chapter({
    title: "נסיעות ואזורי זמן",
    a: `<p>עונות הווסת נקבעות לפי היום העברי של הראייה, ושעות העונה לפי הזריחה והשקיעה במקום שבו היא נמצאת בזמן העונה. בנסיעה ארוכה ובמעבר קו התאריך יש שאלות שהאפליקציה אינה מכריעה.</p>`,
    src: link(S.calendar),
    b: `<ul>
      <li>כל רישום מחושב לפי המקום שנרשם בו. נסיעה (טווח תאריכים ועיר) משנה רק את מקום המועדים העתידיים: חלון העונה, ימי הבדיקות וליל הטבילה נקבעים לפי השקיעה והזריחה בעיר הנסיעה, לפי התאריך האזרחי (לעונת לילה, תאריך הערב).</li>
      <li>היום העברי של העונה אינו משתנה בנסיעה. רק השעות משתנות.</li>
      <li>שעה כפולה או חסרה במעבר שעון אינה נבחרת בשקט: ״נדרש בירור של הזמן והמיקום״, והראייה חוסמת את החישוב עד שתתוקן.</li>
      <li><b>קו התאריך:</b> אם בין שני רישומים עוקבים הפרש קווי האורך של המקומות גדול מ-180°, כל עונות הפרישה האוטומטיות מושעות ומופיעה נקודת בירור. ההמתנה, ההפסק והספירה ממשיכים להיות מחושבים.</li>
      <li>במקומות שאזור הזמן שלהם רחוק מקו האורך (סמואה, טונגה, קיריבטי) המנוע מתקן כדי שזמני השמש יתאימו לתאריך המקומי.</li>
    </ul>`,
    notes: [
      "זיהוי מעבר קו התאריך תלוי רק בקווי האורך של רישומים עוקבים, ולא בנסיעות שהוגדרו. נסיעה מעבר לקו התאריך בלי רישום שם לא תזוהה.",
      `אין כלל אוטומטי לנסיעה ארוכה או למעבר קו התאריך; נדרשת הוראה אישית, שנרשמת כעונות ידניות. ${qRef(15)}`,
    ],
    keys: [],
    d: example("1. ראייה בנתניה, ונסיעה לפריז בזמן העונה הבינונית (תרחיש הבודקים ״travel״)", exTrip, ["onot"], [{ pk: "ashkenaz", label: "אשכנז, עם נסיעה" }, { pk: "ashkenaz", label: "אשכנז, בלי נסיעה" }].map((v, i) => i ? { ...v, def: exNo } : v))
      + example("2. ראייה בשעה 01:30 ביום מעבר השעון בישראל (שעה כפולה)", exDst, ["wait", "onot", "reviews"], [{ pk: "ashkenaz", label: "אשכנז" }])
      + example("3. ראיות בלוס אנג׳לס ובסידני (מעבר קו התאריך)", exDl, ["onot", "reviewsLess"], [{ pk: "ashkenaz", label: "אשכנז" }]),
  });
}

/* ---------- פרק 16: קווי רוחב גבוהים ---------- */
function ch16() {
  const c = M.city("tromso"), lon = M.city("london");
  const dts = [["tromso", "2026-06-20"], ["tromso", "2026-08-10"], ["tromso", "2026-08-25"], ["tromso", "2026-12-20"], ["london", "2026-06-21"], ["paris", "2026-06-21"]];
  const rows = dts.map(([cid, d]) => { const cc = M.city(cid), s = M.sun(d, cc, "8.5"); return `<tr><td>${esc(cc.name)} (${cc.lat.toFixed(1)}°)</td><td>${civ(d)}</td>${["dawn", "sunrise", "sunset", "nightfall"].map(k => `<td class="num">${s[k] ? hm(s[k], cc.tz) : "אין"}</td>`).join("")}</tr>`; }).join("");
  const exPolar = { city: "tromso", now: "2026-06-22", events: c2 => [ev("flow", "2026-06-20", "10:00", c2)] };
  const exLon = { city: "london", now: "2026-06-25", nowTime: "20:00", events: c2 => [ev("flow", "2026-06-12", "10:00", c2), ev("hefsek", "2026-06-17", "15:00", c2), ev("bedikah", "2026-06-18", "04:50", c2)] };
  const exTrip = { city: "netanya", now: "2026-12-07", events: c2 => [ev("flow", "2026-12-01", "10:00", c2), ev("hefsek", "2026-12-05", "15:00", c2)], trips: () => [{ id: nextId(), from: "2026-12-10", to: "2026-12-14", cityId: "tromso" }] };
  return chapter({
    title: "קווי רוחב גבוהים",
    a: `<p>במקומות שבהם השמש אינה שוקעת או אינה זורחת, או שאין בהם צאת הכוכבים או עלות השחר בחלק מהשנה, הגדרת היום והעונה צריכה הוראה אישית.</p>`,
    src: "",
    b: `<ul>
      <li>רישום בתאריך ובמקום שאין בהם זריחה או שקיעה: ״אין זריחה או שקיעה בתאריך ובמיקום הזה; נדרשת הוראה אישית״. ראייה כזו חוסמת את החישוב.</li>
      <li>שקיעה אחרי חצות: רגע שלפני השקיעה המאוחרת עדיין שייך ליום העברי הקודם. אחרי שקיעה כזו ובלי צאת הכוכבים, הרישום מסומן כמסופק.</li>
      <li>אין עלות השחר (בקיץ, בערך מעל קו רוחב 50°): חלון הבדיקה מתחיל בזריחה.</li>
      <li>אין צאת הכוכבים לפי המעלות שנבחרו: ״אין צאת כוכבים מחושב בליל הטבילה״, ולא נקבעת שעה.</li>
      <li>אין זריחה או שקיעה ביום מימי הספירה: ״חסרים זמני יום״. בעונת פרישה: ״לא ניתן לחשב עונה במיקום הזה״.</li>
    </ul>`,
    notes: [`<b>ליל טבילה בלילה הקוטבי:</b> בטרומסה בדצמבר אין זריחה ואין שקיעה, אבל השמש יורדת ל-8.5° מתחת לאופק, ולכן המנוע מחשב ״צאת הכוכבים״ ומתכנן ליל טבילה בשעה כמו 14:45 בצהריים, בלי סימון מיוחד לליל הטבילה (מופיעים רק הסימונים ״חסרים זמני יום״ לימי הבדיקות). ראו דוגמה 3. נראה שזו טעות: צריך סימון ״אין צאת כוכבים״ גם כשאין שקיעה. ${qRef(16)}`],
    keys: [],
    d: `<div class="example"><h5>זמני השמש לפי המנוע</h5><table class="res"><thead><tr><th>מקום</th><th>תאריך</th><th>עלות השחר</th><th>זריחה</th><th>שקיעה</th><th>צאה״כ 8.5°</th></tr></thead><tbody>${rows}</tbody></table></div>`
      + example("1. ראייה בטרומסה בשמש של חצות", exPolar, ["wait", "onot", "reviews"], [{ pk: "ashkenaz", label: "אשכנז" }])
      + example("2. לונדון בקיץ: בדיקה ב-04:50, אחרי הזריחה (אין עלות השחר)", exLon, ["clean", "mikvah", "reviewsLess"], [{ pk: "ashkenaz", label: "אשכנז" }], `<p class="fine">ימי בדיקה שנספרו (אשכנז): ${(() => { const { r } = runCase(exLon, "ashkenaz"); return Object.entries(r.checks).filter(([, v]) => v.length).map(([k, v]) => `יום ${k}: ${v.map(e => e.time).join(", ")}`).join("; ") || "אין"; })()}</p>`)
      + example("3. הפסק בנתניה ונסיעה לטרומסה בדצמבר בימי הספירה", exTrip, ["clean", "mikvah", "reviewsLess"], [{ pk: "ashkenaz", label: "אשכנז" }]),
  });
}

/* ---------- פרק 17: מצבים מיוחדים, עונה ידנית ושאלות ---------- */
function ch17() {
  const exSpecial = { city: "jerusalem", now: "2026-07-12", events: c => [ev("flow", "2026-07-05", "10:00", c), ev("hefsek", "2026-07-09", "16:00", c)], settings: { special: "nursing" } };
  const exManual = { city: "jerusalem", now: "2026-07-12", events: c => [ev("manual", "2026-07-20", "12:00", c, { onah: "night", authorityNote: "הוראה לדוגמה" }), ev("manual", "2026-07-21", "12:00", c, { onah: "day" })] };
  return chapter({
    title: "מצבים מיוחדים, עונה ידנית ורישומים לבירור",
    a: `<p>היריון, אחרי לידה, הנקה וטיפול הורמונלי משנים את דיני הווסתות. כתמים ומראות דורשים שאלת רב. האפליקציה אינה מכריעה בהם.</p>`,
    src: "",
    b: `<ul>
      <li><b>מצב מיוחד</b> (היריון, אחרי לידה, הנקה, טיפול הורמונלי): כל עונות הפרישה האוטומטיות מושעות, ומופיעה נקודת בירור. ההמתנה, ההפסק, הספירה וליל הטבילה ממשיכים להיות מחושבים כרגיל.</li>
      <li><b>עונה ידנית</b> (״עונת פרישה לפי הוראה״): תאריך ועונה. עונת יום: מהזריחה עד השקיעה של התאריך. <b>עונת לילה: מהשקיעה של התאריך הקודם</b> ועד הזריחה של התאריך שנבחר (כך כתוב גם בטופס: ״לילה · מהשקיעה הקודמת עד הזריחה״). אין לה אור זרוע. היא מופיעה גם כשהיא בעתיד וגם במצב מיוחד.</li>
      <li><b>שאלה לבירור</b>, וכל רישום שתוצאתו ״ממתינה לבירור״: מופיעים בנקודות לבירור. ראייה מסופקת אינה משמשת לחישוב, וכשהיא האחרונה כל העונות מתבטלות.</li>
      <li><b>הערה אישית</b>: אינה משפיעה על החישוב.</li>
      <li>יותר מ-14 ימים מהראייה האחרונה בלי הפסק תקף ובלי טבילה: ״לא נרשמו הפסק וטבילה אחרי הראייה האחרונה״.</li>
    </ul>`,
    notes: [`עונה ידנית בלילה נשמרת לפי התאריך האזרחי של <i>הבוקר</i>, כלומר הלילה שלפני התאריך שנבחר. מי שמקבלת הוראה ״לפרוש בליל 20 ביולי״ (הערב של ה-20) עלולה לרשום את התאריך הלא נכון. ${qRef(11)}`],
    keys: ["special"],
    d: example("1. מצב ״הנקה״", exSpecial, ["clean", "mikvah", "onot", "reviewsLess"], [{ pk: "ashkenaz", label: "אשכנז" }])
      + example("2. שתי עונות ידניות: לילה ב-20 ביולי ויום ב-21 ביולי", exManual, ["onot"], [{ pk: "ashkenaz", label: "אשכנז" }]),
  });
}

/* ---------- פרק 18: תזכורות ---------- */
function loadAlerts() {
  if (!APP_SRC) return null;
  const start = APP_SRC.indexOf("function alertsFor(");
  const marker = "return out.sort((a, b) => a.at - b.at);";
  const end = APP_SRC.indexOf(marker, start);
  const sep = /const SEP_KINDS = (\[[^\]]*\]);/.exec(APP_SRC);
  if (start < 0 || end < 0 || !sep) { warnings.push("לא נמצאה הפונקציה alertsFor ב-src/app.js; טבלת התזכורות לא נוצרה"); return null; }
  const close = APP_SRC.indexOf("}", end + marker.length);
  const src = APP_SRC.slice(start, close + 1);
  try {
    const f = new Function("M", "city", "timeInZone", "L", "planHebrew", "onahLabel", "planTitle", "SEP_KINDS", `${src}; return alertsFor;`);
    return { fn: f(M, M.city, M.timeInZone, { t: x => x }, p => p.onah === "day" ? heb(p.date) : heb(M.addDays(p.date, 1)), o => o, p => p.title, JSON.parse(sep[1])), sep: JSON.parse(sep[1]) };
  } catch (e) { warnings.push("alertsFor לא נטענה: " + e.message); return null; }
}
function ch18() {
  const A = loadAlerts();
  const ex = { city: "jerusalem", now: "2026-07-09", nowTime: "12:00", events: c => [ev("flow", "2026-06-10", "10:00", c), ev("flow", "2026-07-05", "21:30", c)] };
  const ex2 = { city: "jerusalem", now: "2026-07-10", nowTime: "06:00", events: c => [ev("flow", "2026-07-05", "10:00", c), ev("hefsek", "2026-07-09", "16:00", c)] };
  const table = def => {
    if (!A) return `<p class="bad">לא ניתן היה לטעון את חישוב התזכורות מ-src/app.js.</p>`;
    const { r, state, now } = runCase(def, "ashkenaz");
    const al = A.fn(state, r, now), byKey = new Map(al.map(a => [a.key, a]));
    const rows = r.plans.filter(p => !p.done && byKey.has(p.id)).slice(0, 16).map(p => { const a = byKey.get(p.id), tz = M.city(p.cityId).tz; return `<tr><td>${esc(p.title)}</td><td>${planText(p)}</td><td>${civ(M.dateInZone(a.at, tz))} <b>${hm(a.at, tz)}</b></td></tr>`; }).join("");
    return `${eventsTable(def)}<table class="res small"><thead><tr><th>מועד</th><th>החלון</th><th>מועד ההתראה</th></tr></thead><tbody>${rows}</tbody></table>`;
  };
  return chapter({
    title: "התזכורות ומתי הן נשלחות",
    a: `<p>התזכורות הן עזר בלבד. ההתראות תלויות במכשיר ועלולות להתעכב או לא להגיע (לפי תנאי השימוש באפליקציה).</p>`,
    src: "",
    b: `<ul>
      <li>החישוב (הפונקציה <span class="code">alertsFor</span> ב-<span class="code">src/app.js</span>; הטבלאות כאן מריצות את הקוד שלה): לכל מועד שלא סומן כבוצע.
        <ul>
          <li><b>עונת פרישה בלילה</b> (${A ? A.sep.map(k => KIND[k] || k).join(", ") : "עונות פרישה"}): ״דקות לפני השקיעה״ (ברירת מחדל 30) לפני תחילת העונה בשקיעה.</li>
          <li><b>עונת פרישה ביום:</b> ב״שעת בדיקת בוקר״ (ברירת מחדל 08:00) אם היא בתוך העונה, אחרת בזריחה.</li>
          <li><b>הפסק:</b> ״דקות לפני השקיעה״ לפני השקיעה של יום ההפסק המוקדם. <b>בדיקת בוקר:</b> שעת בדיקת הבוקר, לא לפני הזריחה. <b>בדיקת ערב:</b> ״דקות לפני השקיעה״. <b>ליל טבילה:</b> בצאת הכוכבים.</li>
        </ul></li>
      <li>באפליקציה (אנדרואיד ו-iPhone) נקבעות מראש עד 60 התראות, ומתעדכנות בכל שינוי ביומן. בדפדפן ההתראה מוצגת רק כשהיומן פתוח (בדיקה כל 30 שניות).</li>
      <li>״נוסח דיסקרטי״ (ברירת מחדל): ״תזכורת אישית״, בלי פירוט.</li>
      <li>ייצוא ליומן (ICS): עד 250 מועדים עתידיים, עם התראה בתחילת כל מועד.</li>
    </ul>`,
    notes: ["התזכורת לבדיקת בוקר מתחילה לא לפני הזריחה, אבל בדיקה מעלות השחר נספרת (פרק 11)."],
    keys: [],
    c: `<p class="fine">ההגדרות ״התראות״, ״נוסח דיסקרטי״, ״דקות לפני השקיעה״ (5 עד 120) ו״שעת בדיקת בוקר״ אינן חלק מהשיטות.</p>`,
    d: `<div class="example"><h5>1. עונות פרישה (אשכנז), ירושלים</h5>${table(ex)}</div><div class="example"><h5>2. שבעה נקיים (אשכנז), ירושלים</h5>${table(ex2)}</div>`,
  });
}

/* ---------- פרק 19: רשימת נקודות הבירור ---------- */
function readStr(src, j) {
  const q = src[j];
  if (q !== '"' && q !== "'" && q !== "`") return null;
  let out = "", i = j + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") { out += src[i + 1]; i += 2; continue; }
    if (ch === q) return { text: out, end: i + 1 };
    if (q === "`" && ch === "$" && src[i + 1] === "{") {
      let depth = 1; i += 2;
      while (i < src.length && depth) { const c2 = src[i]; if (c2 === '"' || c2 === "'" || c2 === "`") { const s2 = readStr(src, i); i = s2 ? s2.end : i + 1; continue; } if (c2 === "{") depth++; if (c2 === "}") depth--; i++; }
      out += "…"; continue;
    }
    out += ch; i++;
  }
  return null;
}
function extractReviews() {
  const out = []; let i = 0;
  while ((i = CORE_SRC.indexOf("review(", i)) >= 0) {
    let j = i + 7; while (/\s/.test(CORE_SRC[j])) j++;
    const a = readStr(CORE_SRC, j); i = j;
    if (!a) continue;
    let k = a.end, id = a.text;
    while (/\s/.test(CORE_SRC[k])) k++;
    if (CORE_SRC[k] === "+") id += "…";
    k = CORE_SRC.indexOf(",", k) + 1; while (/\s/.test(CORE_SRC[k])) k++;
    const b = readStr(CORE_SRC, k);
    if (!out.some(x => x.id === id)) out.push({ id, title: b ? b.text : "?" });
  }
  return out;
}
const WHEN = {
  "mikvah-night-fast": "ליל הטבילה המחושב (הערב שאחרי יום 7) הוא ליל י׳ תשרי, או ליל תשעה באב (ט׳ אב, או י׳ אב כשט׳ חל בשבת). המועד אינו מוזז.",
  "mikvah-night-shabbat": "ליל הטבילה הוא ליל שבת (יום 7 ביום שישי).",
  "mikvah-night-yomtov": "ליל הטבילה הוא ליל יום טוב (רשימת הימים בפרק 12). ״כולל יום טוב שני של גלויות״ נוסף בנוסח כשהמקום אינו באזור הזמן Asia/Jerusalem.",
  "mikvah-day-shabbat": "יום 7 חל בשבת.",
  "mikvah-day-yomtov": "יום 7 חל ביום טוב, ביום הכיפורים או בתשעה באב.",
  "future-…": "הזמן של רישום (חוץ מעונה ידנית והערה) מאוחר מהרגע הנוכחי. הרישום אינו נכנס לחישוב.",
  "boundary-…": "ראייה, הפסק, חידוש ספירה או בדיקה עד 3 דקות מהזריחה או מהשקיעה, או בין השקיעה לצאת הכוכבים לפי ההגדרה. לראייה בהגדרת ״שתי העונות״ הנוסח אומר שחושבו שתי העונות.",
  "question-…": "רישום מסוג ״שאלה לבירור״, או כל רישום שתוצאתו ״ממתינה לבירור״.",
  "time-…": "לא ניתן להמיר את הרישום לרגע ודאי: שעה כפולה או חסרה במעבר שעון, או אין זריחה ושקיעה בתאריך ובמקום. ראייה או חידוש ספירה כאלה חוסמים את החישוב.",
  "dateline": "בין שני רישומים עוקבים הפרש קווי האורך של המקומות גדול מ-180°. כל העונות האוטומטיות מושעות.",
  "chabad-beinonit": "הפלגה ״עונות מהפסק טהרה (חב״ד)״ יחד עם עונה בינונית ״אותה עונה״.",
  "special": "נבחר מצב מיוחד (היריון, אחרי לידה, הנקה, טיפול הורמונלי). העונות האוטומטיות מושעות.",
  "restart-without-history": "הרישום האחרון מסוג ראייה/חידוש הוא חידוש ספירה, ואין לפניו ראייה אחרי הטבילה האחרונה.",
  "wait-base": "נבחר ״ארבעה ימים ממועד היחסים״ ואין רישום בסיס לפני הראייה, או שהבסיס בזמן מסופק.",
  "hefsek-late-…": "הפסק נקי אחרי הראייה האחרונה ואחרי הטבילה האחרונה, שאינו לפני השקיעה או שנעשה בזמן מסופק, ולא התקבל בהקלת הרב עובדיה. ההפסק אינו נספר.",
  "hefsek-no-flow-…": "הפסק בלי ראייה או חידוש ספירה רשומים. נספר רק עם הוראה מתועדת.",
  "hefsek-early-…": "הפסק ביום מוקדם מההפסק המוקדם המחושב, או כשלא חושב הפסק מוקדם, בלי הוראה מתועדת. ההפסק אינו נספר.",
  "hefsek-bedieved-…": "בהגדרת הרב עובדיה: הפסק בזמן מסופק שלפני 13.5 דקות זמניות אחרי שקיעת אותו יום. נספר ליום שהסתיים.",
  "hefsek-night-…": "הפסק שהתקבל ועונתו לילה (בפועל: נרשם אחרי חצות ולפני הזריחה). הספירה מהיום שאחריו.",
  "bedikah-outside-…": "בדיקה נקייה באחד מימי הספירה (אחרי ההפסק, עד יום 7) שאינה בזמן מסופק, אך נרשמה בלילה או לפני עלות השחר. אינה נספרת.",
  "missing-day-…": "אין בדיקה שנספרה ביום 1 או ביום 7, והתאריך האזרחי של אותו יום כבר עבר.",
  "morning-clock-…": "שעת בדיקת הבוקר אינה קיימת או כפולה ביום מעבר שעון באחד מימי הספירה. התזכורת עוברת לזריחה.",
  "morning-outside-day": "שעת בדיקת הבוקר מאוחרת מהשקיעה באחד מימי הספירה. התזכורת עוברת לזריחה.",
  "sun-…": "באחד מימי הספירה אין זריחה או שקיעה במקום שבו היא נמצאת. לא נוצרו תזכורות לאותו יום.",
  "mikvah-no-nightfall": "אין צאת כוכבים מחושב ביום 7 במקום שבו היא נמצאת. לא נקבעה שעת טבילה (אבל ראו פרק 16 על לילה קוטבי).",
  "hefsek-no-sunset": "אין שקיעה ביום ההפסק המוקדם. לא נוצרה תזכורת להפסק.",
  "onah-sun-…": "אין זריחה או שקיעה לחלון של עונת פרישה. העונה אינה מוצגת.",
  "missing-month-day": "נבחר ״דילוג״, והיום של הראייה אינו קיים בחודש הבא.",
  "uncertain-interval": "יש לפחות שתי ראיות, ואחת משתי האחרונות מסופקת (״ממתינה לבירור״, סמוך לגבול בהגדרת ״השעיה״, או בזמן לא ידוע). לא מחושבת הפלגה.",
  "chabad-hefsek-…": "בשיטת חב״ד: אין בין שתי ראיות עוקבות הפסק שמתאים לבסיס (פרק 5). המרווח הזה אינו מחושב.",
  "chabad-no-current-hefsek": "בשיטת חב״ד: יש מרווח, אבל עוד אין הפסק אחרי הראייה האחרונה. המועד יופיע אחרי שיירשם הפסק.",
  "possible-fixed-month": "שלוש הראיות האחרונות באותו יום בחודש ובאותה עונה, בשלושה חודשים רצופים.",
  "possible-fixed-interval": "ארבע הראיות האחרונות בשלושה מרווחים שווים, ושלוש האחרונות באותה עונה.",
  "bleeding-check-…": "בדיקה שתוצאתה ״לא נקייה״. הספירה אינה מתאפסת אוטומטית.",
  "no-mikvah-after-flow": "עברו יותר מ-14 ימים מהראייה (או החידוש) האחרונה, בלי הפסק תקף ובלי טבילה אחריה.",
  "mikvah-early": "הטבילה האחרונה נרשמה לפני צאת הכוכבים של יום 7 להפסק שקדם לה (או שאין צאת כוכבים מחושב).",
  "immersion-no-history": "הטבילה האחרונה היא אחרי הראייה האחרונה, ואין שום הפסק רשום לפניה.",
};
function ch19() {
  const list = extractReviews();
  for (const x of list) if (!WHEN[x.id]) warnings.push(`לנקודת הבירור ${x.id} אין תיאור במחולל`);
  for (const k of Object.keys(WHEN)) if (!list.some(x => x.id === k)) warnings.push(`התיאור ${k} אינו קיים עוד במנוע`);
  const rows = list.map((x, i) => `<tr><td class="num">${i + 1}</td><td><span class="code">${esc(x.id)}</span></td><td>${esc(x.title)}</td><td>${esc(WHEN[x.id] || "(טרם תואר במסמך)")}</td></tr>`).join("");
  return chapter({
    title: "כל נקודות הבירור (״לברר״)",
    a: `<p>האפליקציה אינה מכריעה במצב מסופק. היא מציגה ״נקודה לבירור״ ומשאירה את ההכרעה לרב.</p>`,
    src: "",
    b: `<p>הרשימה נוצרה אוטומטית מקוד המנוע (כל קריאה ל-<span class="code">review</span> ב-<span class="code">src/core.js</span>): ${list.length} סוגים. ״…״ במזהה מציין חלק משתנה (מזהה רישום, תאריך או מספר יום). התיאור ״מתי מופיע״ נכתב לפי קריאת הקוד.</p>
      <table class="res small flags"><thead><tr><th>#</th><th>מזהה</th><th>הכותרת שמוצגת</th><th>מתי מופיע</th></tr></thead><tbody>${rows}</tbody></table>`,
    notes: ["נקודה לבירור היא הודעה בלבד. חלק מהן גם משנות את החישוב (למשל הפסק שאינו נספר, או עונות שמושעות), כמתואר בפרקים."],
    keys: [],
    d: `<p>הדוגמאות בפרקים הקודמים מציגות את רוב הנקודות האלה. נספח א מציג אותן ב-13 תרחישים מלאים.</p>`,
  });
}

/* ---------- טבלת הסיכום ---------- */
function summaryTable() {
  const keys = ["wait", "haflagah", "beinonit", "day31", "orZarua", "carryLongIntervals", "carryMonthly", "missingMonthly", "bedikot", "nightfall", "beinHashmashot", "hefsekTwilight"];
  const rows = keys.map(k => `<tr><th>${esc(SETTING_NAMES[k])}<br><span class="code">${k}</span></th>${PRESETS.map(([pk]) => { const v = presetValue(pk, k), n = presetNote(pk, k); return `<td><b>${esc(optLabel(k, v))}</b>${n && n.ask ? `<br><span class="ask">לברר עם רב</span>` : ""}${n && n.src ? `<br><span class="fine">${link(n.src)}</span>` : pk === "custom" ? `<br><span class="fine">ברירת מחדל בקוד</span>` : ""}</td>`; }).join("")}</tr>`).join("");
  return `<section class="chapter" id="summary"><h2><span class="cn">סיכום</span>כל ההגדרות בכל השיטות</h2>
    <p>הטבלה נוצרה מ-<span class="code">METHOD_PRESETS</span> ומ-<span class="code">SETTING_DEFAULTS</span> במנוע. ״מותאם (ברירת המחדל)״ הוא מה שמקבלת משתמשת חדשה שלא בחרה שיטה. מתחת לכל ערך: המקור שבקוד, וסימון ״לברר עם רב״ כשהקוד מסמן כך. בחירת שיטה קובעת את כל הערכים בבת אחת, ואפשר לשנות כל ערך אחר כך (המסך מציין כמה הגדרות שונו מהשיטה).</p>
    <table class="res summary"><thead><tr><th>הגדרה</th>${PRESETS.map(([, l]) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
    ${noteBox(`ברירת המחדל למשתמשת חדשה אינה זהה לאף שיטה: חמישה ימים, בלי יום 31, בלי אור זרוע ובלי שימור הפלגות ארוכות, צאת הכוכבים 8.5°. ${qRef(7)}`)}
    ${ravBox("סיכום")}</section>`;
}

/* ---------- שאלות פתוחות ---------- */
let REL_HOURS = "?";
const QUESTIONS = () => [
  ["ארבעה ימים: מהראייה או 72 שעות מהיחסים", `בשיטת ספרד ההמתנה היא ארבעה ימים מתחילת הראייה, בלי לשאול על יחסים. האפשרות ״ארבעה ימים ממועד היחסים״ סופרת ימים עבריים ולא 72 שעות, ומקבלת הפסק בכל שעה ביום הרביעי. בדוגמה בפרק 9 ההפסק התקבל ${REL_HOURS} שעות אחרי היחסים. מה הכלל הנכון, ובאיזו שיטה להשתמש כברירת מחדל לספרדים?`],
  ["סוף בין השמשות בשיטת ספרד", "ההערה בקוד אומרת שאחרי 13.5 דקות זמניות זה לילה ודאי, אבל הגדרת צאת הכוכבים בשיטה היא 20 דקות, ולכן ראייה בין 13.5 דקות זמניות ל-20 דקות מטופלת כספק (שתי העונות). האם לשנות?"],
  ["ליל טבילה לספרדים", "בשיטת ספרד ליל הטבילה נקבע 20 דקות אחרי השקיעה. זה ערך זמני (״לברר עם רב מתי לטבול״). מה השיעור הנכון: 13.5 דקות זמניות, 18 או 20 דקות, או מעלות?"],
  ["חב״ד: יום 31 ואור זרוע", "בשיטת חב״ד יום 31 ואור זרוע כבויים, ושניהם מסומנים לברר. האם כך?"],
  ["שימור הפלגה ארוכה", "בכל השיטות המוכנות הפלגה ארוכה שלא הגיעה נשמרת בלי הגבלת זמן, כל עוד כל המרווחים שאחריה קצרים ממנה. האם לשמור? ועד מתי?"],
  ["אור זרוע ליום 31", "אור זרוע אינו נוסף ליום 31 (לפי יועצות הלכה). האם כך גם לפי שיטת הרב?"],
  ["ברירת המחדל למשתמשת חדשה", "משתמשת שלא בחרה שיטה מקבלת ״מותאם״: חמישה ימים, בלי יום 31, בלי אור זרוע, בלי שימור הפלגות, 8.5°. זה אינו זהה לאף שיטה, ומקל יותר מאשכנז. האם לחייב בחירת שיטה, או לקבוע אחת כברירת מחדל?"],
  ["בין השמשות: ההמתנה מהיום המאוחר", "בראייה בבין השמשות, או עד 3 דקות לפני השקיעה, ההמתנה נספרת מהיום העברי המאוחר. האם זו החומרא הנכונה? ובראייה בדקות שלפני השקיעה, האם יש מקום לחומרא?"],
  ["בדיקת בוקר וערב", "בדיקה נספרת מעלות השחר (16.1°), ואם אין עלות השחר, מהזריחה. בוקר וערב מוכרעים לפי השעה 12:00 בשעון ולא לפי חצות היום. האם 16.1° הוא השיעור הנכון? והאם צריך להבחין לפי חצות?"],
  ["ראייה בשבעה נקיים: ״ראייה״ או ״חידוש ספירה״", "חידוש ספירה אינו יוצר עונות פרישה ואינו מחייב המתנה חדשה; רישום ״ראייה״ מחייב המתנה מלאה ויוצר עונות (כולל הפלגה קצרה). מה הדין לגבי המתנה ולגבי עונות כשראתה בשבעה נקיים?"],
  ["משמעות עונה ידנית בלילה", "עונה ידנית בלילה בתאריך X היא הלילה שלפני X (מהשקיעה של X−1). האם זה ברור מספיק, או שעדיף שתאריך הלילה יהיה הערב?"],
  ["יום טוב שני לפי אזור זמן", "ההבחנה בין ארץ ישראל לחו״ל נעשית לפי אזור הזמן Asia/Jerusalem. האם זה מספיק (למשל לבן ארץ ישראל בחו״ל או לבן חו״ל בארץ)?"],
  ["הפסק לפני הזריחה", "הפסק אחרי חצות ולפני הזריחה מתקבל ונספר ליום העברי של אותו לילה (עם סימון), בעוד שהפסק בשעה 21:00 באותו לילה נדחה. מה הדין בהפסק בלילה, ומה צריך האפליקציה לעשות?"],
  ["סוף עונת יום", "עונת יום מסתיימת בשקיעה, ובין השמשות נכלל רק בעונת הלילה שאחריה. האם יש להחמיר ולהאריך את עונת היום עד צאת הכוכבים? ועונת היום, מהזריחה או מעלות השחר?"],
  ["קו התאריך ונסיעות", "מעבר קו התאריך מזוהה רק לפי מקומות של רישומים עוקבים, ואז כל העונות מושעות. האם יש כלל שהאפליקציה יכולה ליישם, או שתמיד נדרשת הוראה אישית?"],
  ["לילה קוטבי", "במקום שאין בו שקיעה אבל השמש יורדת 8.5° מתחת לאופק (טרומסה בדצמבר), המנוע מתכנן ליל טבילה בשעות הצהריים. נראה שזו טעות שצריך לתקן, ולסמן לבירור."],
  ["בדיקה סמוך לזריחה", "בדיקה עד 3 דקות אחרי הזריחה אינה נספרת, כי היא סמוכה לגבול העונה. נראה שזו טעות: האם לספור אותה?"],
  ["עונת חודש נוספת בימי הנידה", "עונת החודש של ראייה קודמת נשמרת גם כשהיא חלה יום אחרי הראייה החדשה, בימי הנידה. האם יש בה צורך? ומה דין עונת חודש שחלה בימי דימום (אפשרות ״שימור״ כבויה בכל השיטות)?"],
  ["שיעור 13.5 דקות זמניות בהפסק אחרי השקיעה", "השיעור 13.5 דקות זמניות מחושב מהזריחה עד השקיעה, ותמיד, גם כשבחרו צאת כוכבים אחר. האם כך? ויש שכתבו שבארץ ישראל השיעור קצר יותר."],
];
function questionsSection() {
  return `<section class="chapter" id="questions"><h2><span class="cn">שאלות</span>שאלות פתוחות לרב</h2>
    <p>השאלות נאספו מהקוד (ערכים שהקוד מסמן ״לברר עם רב״), מבדיקות קודמות של המנוע, ומבדיקת המסמך הזה. ליד כל שאלה מקום לתשובה.</p>
    <ol class="qs">${QUESTIONS().map(([t, d], i) => `<li id="q${i + 1}"><b>${esc(t)}.</b> ${esc(d)}<div class="lines"><div></div><div></div></div></li>`).join("")}</ol></section>`;
}

/* ---------- נספחים ---------- */
function mdToHtml(md) {
  const lines = md.split("\n"), out = [];
  let inList = 0;
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const closeLists = (to = 0) => { while (inList > to) { out.push("</ul>"); inList--; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    let m;
    if ((m = /^## (.*)$/.exec(line))) { closeLists(); out.push(`</div><div class="scen"><h4>${inline(m[1])}</h4>`); continue; }
    if ((m = /^### (.*)$/.exec(line))) { closeLists(); out.push(`<h6>${inline(m[1])}</h6>`); continue; }
    if ((m = /^( *)- (.*)$/.exec(line))) {
      const depth = m[1].length / 2 + 1;
      while (inList < depth) { out.push(`<ul>`); inList++; }
      closeLists(depth);
      out.push(`<li>${inline(m[2])}</li>`); continue;
    }
    closeLists();
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  closeLists();
  return `<div>${out.join("\n")}</div>`;
}
function appendixA() {
  let body = "", same = null;
  try {
    const gen = require(path.join(ROOT, "store", "compare", "scenarios-body.js"));
    const md = typeof gen === "function" ? gen() : String(gen);
    body = mdToHtml(md);
    try {
      const stored = fs.readFileSync(path.join(ROOT, "store", "compare", "scenarios.md"), "utf8").split("## התרחישים")[1] || "";
      const norm = x => x.split("\n").map(l => l.replace(/\s+$/, "")).join("\n").trim();
      same = norm(stored) === norm(md);
    } catch { same = null; }
  } catch (e) { warnings.push("לא ניתן להריץ את store/compare/scenarios-body.js: " + e.message); body = `<p class="bad">לא ניתן היה להריץ את מחולל התרחישים.</p>`; }
  return `<section class="chapter appendix" id="appA"><h2><span class="cn">נספח א</span>13 תרחישי ההשוואה</h2>
    <p>התרחישים נוצרו כאן בהרצה ישירה של <span class="code">store/compare/scenarios-body.js</span> על המנוע הנוכחי (${same === true ? "הפלט זהה לזה שב-" : same === false ? "<b>הפלט שונה מזה שב-</b>" : "להשוואה עם "}<span class="code">store/compare/scenarios.md</span>${same === false ? ", כי המנוע השתנה מאז שנוצר הקובץ" : ""}). הם נועדו להשוואה ידנית מול אפליקציה או לוח אחרים. בכל תרחיש: הרישומים בשעון מקומי, זמן החישוב המדומה, והתוצאה בכל אחת משלוש השיטות. בנקודות לבירור הושמטו כאן סימוני ״לא נרשמה בדיקה״, ״לא נרשמו הפסק וטבילה״ ו״טבילה ללא תיעוד״.</p>
    <p class="fine">עונות מוצגות כ״עונת יום״ (מהזריחה עד השקיעה) או ״ליל״ (מהשקיעה בערב התאריך האזרחי שלפני ועד הזריחה).</p>
    <div class="scenarios">${body}</div></section>`;
}
function appendixB() {
  let items = "";
  try {
    const list = require(path.join(ROOT, "src", "scenarios.js"))(M);
    items = list.map(s => {
      const { state, now } = s.build(), r = M.calculate(M.parseState(state), now);
      return `<div class="scen"><h4>${esc(s.title)} <span class="tag">${esc(s.tag)}</span></h4><p><b>מה לבדוק (מתוך הקוד):</b> ${esc(s.check)}</p>
        <p class="fine">הגדרות: ${Object.keys(s.settings).length ? Object.entries(s.settings).map(([k, v]) => `${esc(SETTING_NAMES[k] || k)} = ${esc(optLabel(k, v))}`).join("; ") : "ברירת המחדל (מותאם)"}. רישומים: ${state.events.map(e => `${esc(M.EVENT_NAMES[e.type])} ${esc(e.date)} ${esc(e.time)}${e.result !== "clear" ? " (" + esc(M.RESULT_NAMES[e.result]) + ")" : ""}`).join("; ")}. זמן: ${esc(M.timeInZone(now, "Asia/Jerusalem"))} ${esc(M.dateInZone(now, "Asia/Jerusalem"))}.</p>
        <p><b>תוצאת המנוע:</b> ${r.earliestHefsek && r.phase === "waiting" ? `הפסק מוקדם ${heb(r.earliestHefsek)}. ` : ""}${r.immersionDate ? `ליל טבילה מוצאי ${heb(r.immersionDate)}. ` : ""}</p>${sepList(r)}${r.reviews.length ? `<p class="fine">לבירור: ${[...new Set(r.reviews.map(x => x.title))].map(esc).join("; ")}</p>` : ""}</div>`;
    }).join("");
  } catch (e) { warnings.push("src/scenarios.js: " + e.message); items = `<p class="bad">לא ניתן היה להריץ את תרחישי הבודקים.</p>`; }
  return `<section class="chapter appendix" id="appB"><h2><span class="cn">נספח ב</span>תרחישי הבודקים שבאפליקציה</h2>
    <p>אלה התרחישים שבמסך ״כללים ומקורות״ באפליקציה (<span class="code">src/scenarios.js</span>), עם ההגדרות שלהם ותוצאת המנוע. התאריכים בנתניה.</p>${items}</section>`;
}
function appendixC(tests, commit) {
  return `<section class="chapter appendix" id="appC"><h2><span class="cn">נספח ג</span>איך לשחזר את המסמך ואת התוצאות</h2>
    <ol>
      <li>להוריד את קוד המקור של האפליקציה בגרסה ${esc(commit)} (מנוע ${esc(M.ENGINE_VERSION)}).</li>
      <li>להריץ <span class="code" dir="ltr">node docs/halacha/build.js</span>. הסקריפט טוען את <span class="code">src/core.js</span>, מריץ את כל הדוגמאות ויוצר מחדש את <span class="code">docs/halacha/halacha.html</span> ואת <span class="code">halacha.pdf</span>.</li>
      <li>13 תרחישי ההשוואה בלבד: <span class="code" dir="ltr">node store/compare/scenarios-body.js</span>.</li>
      <li>בדיקות המנוע: <span class="code" dir="ltr">node -e 'const M=require("./src/core.js");console.log(require("./src/tests.js")(M).run().filter(t=>!t.ok))'</span>. בזמן יצירת המסמך עברו <b>${tests.ok} מתוך ${tests.total}</b> בדיקות${tests.failed.length ? ` (נכשלו: ${tests.failed.map(esc).join("; ")})` : ""}.</li>
      <li>באפליקציה עצמה: הגדרות ← ״כללים ומקורות״ ← תרחישים מוכנים.</li>
    </ol>
    <p>כל הדוגמאות במסמך משתמשות במזהי רישום קבועים ובזמן חישוב מדומה, ולכן הרצה חוזרת על אותו קוד נותנת אותן תוצאות. זמני השמש מחושבים בגובה פני הים.</p></section>`;
}

/* ---------- עמוד שער והקדמה ---------- */
function cover(commit, commitDate) {
  const todayIso = M.toISO(new Date());
  return `<section class="cover">
    <div class="brand">מעיין</div>
    <div class="subtitle">מפרט הלכתי לבדיקת רב</div>
    <div class="desc">יומן טהרת המשפחה: מה בדיוק מחשבת האפליקציה, לפי הקוד</div>
    <table class="meta"><tr><th>גרסת מנוע החישוב</th><td dir="ltr">${esc(M.ENGINE_VERSION)}</td></tr><tr><th>גרסת הקוד (commit)</th><td><span dir="ltr" class="code">${esc(commit.split(" ")[0])}</span>${commitDate ? ` · ${esc(commitDate)}` : ""}${commit.includes(" ") ? `<br><span class="fine">${esc(commit.split(" ").slice(1).join(" "))}</span>` : ""}</td></tr><tr><th>תאריך המסמך</th><td>${heb(todayIso)} · ${civ(todayIso)}</td></tr></table>
    <div class="statement"><p><b>האפליקציה אינה פוסקת הלכה.</b> היא יומן שמחשב תאריכים לפי כללים שנכתבו בקוד. התוצאות אינן מחייבות ואינן תחליף להוראת רב. עד לאישור רב, כל חישוב בה הוא הצעה בלבד.</p>
      <p>המסמך מתאר את מה שהקוד מחשב בפועל, גם במקומות שבהם הוא שונה ממה שכתוב במקורות או נראה כטעות. מקומות כאלה מסומנים ״הערה״. כל הדוגמאות חושבו בזמן יצירת המסמך במנוע עצמו.</p></div>
    <div class="ask-rav"><b>מה מתבקש מהרב:</b><ol>
      <li>לעבור על כל פרק ולסמן בתיבה שבסופו: מאושר, לא מאושר או לתקן, ולרשום הערות.</li>
      <li>לבדוק את טבלת השיטות (״סיכום״) ולציין אילו ערכים אינם נכונים לכל מנהג.</li>
      <li>להשיב על השאלות הפתוחות (${QUESTIONS().length} שאלות, לפני הנספחים).</li>
      <li>לציין לאיזו שיטה או קהילה ניתן האישור, ולחתום.</li>
    </ol></div>
    <div class="sign"><div>שם הרב: ____________________</div><div>תאריך: ____________</div><div>חתימה: ____________</div></div>
  </section>`;
}
function intro() {
  return `<section class="chapter" id="intro"><h2><span class="cn">הקדמה</span>איך האפליקציה עובדת</h2>
    <ul>
      <li><b>הכל במכשיר.</b> אין חשבון, אין שרת ואין שליחת נתונים. היומן, ההגדרות והחישובים נשמרים ומחושבים בטלפון בלבד.</li>
      <li><b>המשתמשת רושמת אירועים</b>, כל אחד עם תאריך, שעה מקומית ומקום: ראייה (תחילת וסת), הפסק טהרה (נקי, לא נקי או ממתין לבירור), בדיקה, טבילה, שאלה לבירור, חידוש ספירה לפי הוראה, בסיס להמתנת ארבעה ימים (יחסים), עונת פרישה לפי הוראה, והערה אישית. אפשר גם לרשום נסיעות (עיר וטווח תאריכים).</li>
      <li><b>האפליקציה מחשבת</b> מכל הרישומים, מחדש בכל שינוי: ההפסק המוקדם ביותר, שבעת הימים הנקיים ותזכורות הבדיקה, ליל הטבילה המתוכנן, ועונות הפרישה (עונת החודש, הפלגה, עונה בינונית, אור זרוע). כל מועד מציין את הרישומים ואת הכלל שעליהם הוא נשען.</li>
      <li><b>המקרים המסופקים מסומנים ״לברר״</b> ולא מוכרעים בשקט: ראייה סמוך לשקיעה, הפסק אחרי השקיעה, בדיקה חסרה, ליל טבילה בשבת, מצב מיוחד ועוד (רשימה מלאה בפרק 19). רישום ״נקי״ אינו אישור שהספירה או הטבילה כשרות, והאפליקציה לעולם אינה רושמת הפסק או טבילה בעצמה.</li>
      <li><b>שיטות מוכנות:</b> ״מנהג אשכנז הרווח״, ״שיטת הרב עובדיה יוסף / מנהג ספרד״, ״מנהג חב״ד״, או ״התאמה אישית״. שיטה קובעת את כל ההגדרות, ואפשר לשנות כל הגדרה.</li>
    </ul>
    <h3>מבנה כל פרק</h3>
    <p>(א) ההלכה בקצרה, עם המקורות כפי שהם מצוטטים בקוד. (ב) מה האפליקציה מחשבת בדיוק, לפי קריאת הקוד. (ג) האפשרויות בהגדרות, ומה בוחרת כל שיטה (● = הערך שהשיטה קובעת), עם ההערות והמקורות שבקוד. (ד) דוגמה שחושבה במנוע. (ה) תיבה לרב.</p>
    <h3>מוסכמות</h3>
    <ul>
      <li><b>ספירה כוללנית:</b> יום הראייה הוא יום 1. ״יום 30״ הוא 29 ימים אחרי יום הראייה.</li>
      <li><b>״ליל X״</b> הוא הלילה שבו מתחיל היום העברי X, כלומר מהשקיעה בערב התאריך האזרחי שלפניו. התאריך האזרחי שבסוגריים הוא תאריך הערב.</li>
      <li>השעות בשעון המקומי של המקום, וזמני השמש בגובה פני הים.</li>
      <li><b>מקורות:</b> הקישורים והציטוטים הם אלה שבקוד (בעיקר אתר יועצות הלכה של מכון נשמת, din.org.il, abc770.org, לוח חב״ד ב-mikvah.org ואתרי שו״ת). ${NV} מסמן מקור שלא נבדק מול לשון הספר בעבודה על המסמך הזה. אף מקור לא נבדק מול הספר עצמו; גם הקישורים לא נבדקו (לא הייתה גישה לאתרים מסביבת העבודה).</li>
      <li><span class="note-inline">הערה</span> מסמנת מקום שבו הקוד שונה מהמקור, מהתיאור שבקוד עצמו, או נראה כטעות. <span class="qref">שאלה N</span> מפנה לרשימת השאלות הפתוחות.</li>
    </ul></section>`;
}

/* ---------- עיצוב ---------- */
const CSS = `
@font-face{font-family:"Heebo";src:url("../../fonts/heebo.ttf") format("truetype");font-weight:100 900}
@font-face{font-family:"Bellefair";src:url("../../fonts/bellefair.ttf") format("truetype")}
@page{size:A4;margin:16mm 14mm 18mm}
:root{--accent:#7f5370;--accent-strong:#6b4560;--accent-soft:#efe4ec;--blush:#ece2e8;--ink:#262125;--muted:#6f6168;--faint:#8b7c83;--line:#e3dbdf;--warn-bg:#f7f0e6;--warn-ink:#85561f;--good:#4f8062;--danger:#b23d55;--surface:#fdfcfc;--clean:#8592c4;--mik:#3f7f80}
*{box-sizing:border-box}
html{background:#fff}
body{margin:0;font-family:"Heebo",Arial,sans-serif;color:var(--ink);font-size:10pt;line-height:1.55;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,h4,h5,h6{font-family:"Bellefair","Frank Ruhl Libre","David",serif;font-weight:400;color:var(--accent-strong);margin:.6em 0 .3em;line-height:1.25}
h2{font-size:21pt;border-bottom:2px solid var(--accent);padding-bottom:4px;margin-top:0}
h2 .cn{display:block;font-family:"Heebo",sans-serif;font-size:9pt;letter-spacing:.08em;color:var(--faint);font-weight:500}
h3{font-size:13pt;color:var(--accent);margin-top:0}
h4{font-size:12.5pt}
h5{font-size:11.5pt;margin:.2em 0 .4em}
h6{font-family:"Heebo",sans-serif;font-size:10pt;font-weight:700;color:var(--accent-strong);margin:.8em 0 .3em}
a{color:var(--accent-strong);text-decoration:none;border-bottom:1px dotted var(--accent)}
p{margin:.35em 0}
ul,ol{margin:.3em 0;padding-inline-start:1.4em}
li{margin:.15em 0}
.code{font-family:"Consolas","DejaVu Sans Mono",monospace;font-size:8pt;color:var(--muted);background:#f6f2f4;border-radius:3px;padding:0 3px;direction:ltr;unicode-bidi:isolate}
.civ{color:var(--muted);font-size:8.5pt}
.tm{unicode-bidi:isolate;white-space:nowrap}
.fine{color:var(--muted);font-size:8.5pt}
.muted{color:var(--faint)}
.good{color:var(--good);font-weight:700}
.bad{color:var(--danger);font-weight:700}
.nv{color:var(--warn-ink);font-size:8pt;white-space:nowrap}
.ask{display:inline-block;background:var(--warn-bg);color:var(--warn-ink);border:1px solid #e6d3b8;border-radius:3px;font-size:7.5pt;padding:0 4px;font-weight:700}
.qref{display:inline-block;background:var(--accent-soft);color:var(--accent-strong);border-radius:3px;font-size:7.5pt;padding:0 4px;font-weight:700;white-space:nowrap}
.note-inline{background:var(--warn-bg);color:var(--warn-ink);padding:0 4px;border-radius:3px;font-weight:700}
.chapter{break-before:page}
.part h3,.example h5,h6{break-after:avoid}
.part{margin:0 0 10px;padding:8px 11px;border-radius:6px;border:1px solid var(--line)}
.pa{background:#faf6f8}
.pb{background:#fff;border-inline-start:3px solid var(--accent)}
.pc{background:#fff}
.pd{background:#fff;border-color:#d9d2e6}
.src{margin-top:6px;font-size:8.5pt;color:var(--muted)}
.note{background:var(--warn-bg);color:#5d3f17;border:1px solid #e6d3b8;border-inline-start:4px solid var(--warn-ink);border-radius:5px;padding:6px 9px;margin:7px 0;font-size:9.3pt;break-inside:avoid}
.note b:first-child{color:var(--warn-ink)}
table{border-collapse:collapse;width:100%;margin:5px 0 8px;font-size:8.8pt}
th,td{border:1px solid var(--line);padding:3px 5px;text-align:start;vertical-align:top}
thead th{background:var(--accent-soft);color:var(--accent-strong);font-weight:700}
tbody th{background:#faf6f8;font-weight:700;width:16%}
tr{break-inside:avoid}
td.num{direction:ltr;text-align:center;white-space:nowrap;unicode-bidi:isolate}
td.mark{text-align:center;color:var(--accent);font-size:11pt}
table.small{font-size:8pt}
table.small th,table.small td{padding:2px 4px}
table.opts{width:auto;min-width:70%}
table.ev td{font-size:8.5pt}
table.summary td{font-size:8.3pt}
table.summary tbody th{width:14%}
ul.onot,ul.rv{margin:0;padding-inline-start:1.1em}
ul.onot li,ul.rv li{margin:0 0 1px}
ul.rv li{color:var(--warn-ink)}
.pnotes{font-size:8.8pt;color:#3e353a}
.setting{margin-bottom:8px;break-inside:avoid}
.example{margin:4px 0 12px}
.example h5{color:var(--accent)}
.rav{border:1.5px dashed var(--accent);border-radius:8px;padding:8px 12px;margin-top:12px;break-inside:avoid;background:#fff}
.rav-h{font-weight:700;color:var(--accent-strong);margin-bottom:4px}
.rav .checks{display:flex;gap:28px;font-size:11pt;margin-bottom:4px}
.lines div{border-bottom:1px solid #cbbfc6;height:22px}
.cover{height:257mm;display:flex;flex-direction:column;justify-content:flex-start;padding-top:18mm}
.cover .brand{font-family:"Bellefair",serif;font-size:58pt;color:var(--accent);line-height:1}
.cover .subtitle{font-family:"Bellefair",serif;font-size:24pt;color:var(--accent-strong);margin-top:6px}
.cover .desc{color:var(--muted);font-size:12pt;margin:4px 0 16px}
.cover table.meta{width:auto;font-size:10pt;margin-bottom:14px}
.cover table.meta th{background:var(--accent-soft);width:auto}
.statement{background:var(--accent-soft);border-inline-start:5px solid var(--accent);padding:10px 14px;border-radius:6px;font-size:10.5pt;margin-bottom:12px}
.ask-rav{border:1px solid var(--line);border-radius:6px;padding:8px 14px;font-size:10pt}
.sign{display:flex;gap:24px;margin-top:auto;padding-top:14px;font-size:10.5pt;color:var(--muted)}
.toc ul.tocl{columns:2;column-gap:24px;font-size:10.5pt;list-style:none;padding:0}
.toc li{break-inside:avoid}
.qs li{margin-bottom:8px;break-inside:avoid}
.scen{border-top:1px solid var(--line);padding-top:6px;margin-top:8px;break-inside:auto}
.scen h4{margin-top:4px}
.scen h6{margin:.4em 0 .1em}
.scen ul{font-size:8.8pt}
.scenarios p{margin:.2em 0}
.tag{font-family:"Heebo",sans-serif;font-size:8pt;background:var(--accent-soft);color:var(--accent-strong);border-radius:3px;padding:0 5px;vertical-align:middle}
table.flags td:nth-child(2){white-space:nowrap}
@media screen{body{max-width:200mm;margin:0 auto;padding:10mm 8mm;background:#fff}.chapter{margin-top:14mm;border-top:1px dashed var(--line);padding-top:6mm}}
`;

/* ---------- הרכבה ---------- */
function runTests() {
  try {
    const res = require(path.join(ROOT, "src", "tests.js"))(M).run();
    return { total: res.length, ok: res.filter(t => t.ok).length, failed: res.filter(t => !t.ok).map(t => `${t.name}: ${t.error}`) };
  } catch (e) { return { total: 0, ok: 0, failed: ["לא ניתן להריץ: " + e.message] }; }
}
function build() {
  let commit = "לא ידוע", commitDate = "";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); commitDate = execSync("git log -1 --format=%cs", { cwd: ROOT }).toString().trim(); if (execSync("git status --porcelain -- src/core.js", { cwd: ROOT }).toString().trim()) commit += " + שינויים שלא נשמרו ב-src/core.js"; } catch { /* מחוץ ל-git */ }
  M.setLang("he");
  const tests = runTests();
  const chapters = [ch1(), ch2(), ch3(), ch4(), ch5(), ch6(), ch7(), ch8(), ch9(), ch10(), ch11(), ch12(), ch13(), ch14(), ch15(), ch16(), ch17(), ch18(), ch19()].join("\n");
  const toc = `<section class="chapter toc" id="toc"><h2><span class="cn">תוכן</span>תוכן העניינים</h2><ul class="tocl"><li><a href="#intro">הקדמה: איך האפליקציה עובדת</a></li>${TOC.map(t => `<li><a href="#ch${t.n}">פרק ${t.n}: ${esc(t.title)}</a></li>`).join("")}<li><a href="#summary">סיכום: כל ההגדרות בכל השיטות</a></li><li><a href="#questions">שאלות פתוחות לרב</a></li><li><a href="#appA">נספח א: 13 תרחישי ההשוואה</a></li><li><a href="#appB">נספח ב: תרחישי הבודקים</a></li><li><a href="#appC">נספח ג: שחזור</a></li></ul>
    <p class="fine">המסמך נוצר אוטומטית מהקוד על ידי <span class="code">docs/halacha/build.js</span>. אין לערוך את קובץ ה-HTML ידנית: שינוי בטקסט נעשה במחולל, ושינוי בתוצאות נעשה במנוע.</p></section>`;
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מעיין — מפרט הלכתי</title><style>${CSS}</style></head><body>
${cover(commit, commitDate)}
${toc}
${intro()}
${chapters}
${summaryTable()}
${questionsSection()}
${appendixA()}
${appendixB()}
${appendixC(tests, commit)}
</body></html>`;
  fs.writeFileSync(OUT_HTML, html);
  return { commit, tests };
}

async function renderPdf(shotsDir) {
  let pw;
  try { pw = require("playwright"); } catch { console.warn("playwright אינו מותקן; ה-PDF לא נוצר"); return; }
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto("file://" + OUT_HTML, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: OUT_PDF, format: "A4", printBackground: true, displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: `<div dir="rtl" style="width:100%;font-size:7.5px;color:#8b7c83;text-align:center;font-family:Arial,sans-serif">מעיין · מפרט הלכתי לבדיקת רב · מנוע ${M.ENGINE_VERSION} · עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span></div>`,
      margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" } });
    if (shotsDir) {
      fs.mkdirSync(shotsDir, { recursive: true });
      const p2 = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
      await p2.goto("file://" + OUT_HTML, { waitUntil: "load" });
      await p2.emulateMedia({ media: "print" });
      await p2.evaluate(() => document.fonts.ready);
      const ids = ["", "#ch1", "#ch2", "#ch5", "#ch10", "#ch11", "#ch19", "#summary", "#questions", "#appA"];
      for (const id of ids) {
        const y = id ? await p2.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, id) : 0;
        await p2.evaluate(v => window.scrollTo(0, v), y);
        await p2.screenshot({ path: path.join(shotsDir, `shot-${id.replace("#", "") || "cover"}.png`) });
      }
    }
  } finally { await browser.close(); }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const { commit, tests } = build();
  console.log(`נוצר ${path.relative(ROOT, OUT_HTML)} (commit ${commit}, מנוע ${M.ENGINE_VERSION}, בדיקות ${tests.ok}/${tests.total})`);
  for (const w of warnings) console.warn("אזהרה: " + w);
  if (!args.includes("--no-pdf")) {
    const si = args.indexOf("--shots");
    renderPdf(si >= 0 ? args[si + 1] : null).then(() => console.log(`נוצר ${path.relative(ROOT, OUT_PDF)}`)).catch(e => { console.error(e); process.exit(1); });
  }
}
module.exports = { build };
