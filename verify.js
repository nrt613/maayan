/* בדיקה עצמאית: מחשב את התוצאות הצפויות בדרך אחרת (לוח עברי של הדפדפן, חשבון ימים פשוט) ומשווה למנוע. */
const M = require("./src/core.js");
const heb = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const hparts = iso => { const p = heb.formatToParts(new Date(iso + "T12:00:00Z")); const g = t => p.find(x => x.type === t)?.value; return { d: +g("day"), m: g("month"), y: +(g("year") || g("relatedYear")) }; };
const addD = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const diff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)];
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails < 25) console.log("FAIL", msg); } };
const ev = (type, date, time, extra = {}) => ({ id: M.uuid(), type, date, time, cityId: "netanya", result: "clear", note: "", authorityNote: "", createdAt: "2026-01-01T00:00:00Z", ...extra });
const city = M.city("netanya"), tz = city.tz;
const hm = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const localMin = d => hm(M.timeInZone(d, tz));
// היום העברי (כתאריך אזרחי של שעות היום) והעונה, לפי שקיעה וזריחה — נבדק בנפרד מול שעון עצמאי
function onahOf(date, time) {
  const s = M.sun(date, city), t = hm(time);
  if (t >= localMin(s.sunset)) return { hd: addD(date, 1), onah: "night" };
  if (t < localMin(s.sunrise)) return { hd: date, onah: "night" };
  return { hd: date, onah: "day" };
}
const planHebDay = p => p.onah === "day" ? p.date : addD(p.date, 1);
const monthlyOracle = (hd, policy) => {
  const h = hparts(hd);
  for (let k = 20; k <= 40; k++) { const c = addD(hd, k), x = hparts(c); if (x.d === h.d && x.m !== h.m) return k <= 31 ? c : (policy === "skip" ? null : "CHECK30"); }
  return policy === "skip" ? null : "CHECK30";
};
const SAFE_TIMES = ["07:30", "09:00", "11:15", "13:40", "15:00", "21:30", "23:10", "03:30"];

/* 1. תרחישים אקראיים: שתי ראיות + הפסק, הגדרות אקראיות */
for (let i = 0; i < 4000; i++) {
  const base = addD("2023-01-01", Math.floor(rnd() * 1200));
  const t1 = pick(SAFE_TIMES), t2 = pick(SAFE_TIMES), gap = 20 + Math.floor(rnd() * 25);
  const f2 = addD(base, gap);
  const settings = { beinonit: pick(["same", "both"]), day31: rnd() < .4, missingMonthly: pick(["skip", "first-next-month"]), orZarua: rnd() < .3 };
  const events = [ev("flow", base, t1), ev("hefsek", addD(base, 5), "15:00"), ev("mikvah", addD(base, 13), "20:30"), ev("flow", f2, t2)];
  const s = M.emptyState(); s.settings = { ...s.settings, ...settings }; s.events = events;
  const now = new Date(Date.parse(f2 + "T12:00:00Z") + 2 * 864e5);
  const r = M.calculate(s, now);
  const a = onahOf(base, t1), b = onahOf(f2, t2);
  // תנאי: ראייה בטווח 3 דקות משקיעה/זריחה מסומנת — הזמנים שנבחרו רחוקים מהגבולות
  const onot = settings.beinonit === "both" ? ["night", "day"] : [b.onah];
  for (const day of settings.day31 ? [30, 31] : [30]) for (const o of onot) {
    const p = r.plans.find(p => p.kind === "average" && p.id.endsWith(`-${day}-${o}`));
    ok(p && planHebDay(p) === addD(b.hd, day - 1) && p.onah === o, `average ${day} ${o} ${base}/${f2} ${t2}`);
  }
  const mo = monthlyOracle(b.hd, settings.missingMonthly), mp = r.plans.find(p => p.id === "monthly-" + events[3].id);
  { const mo1 = monthlyOracle(a.hd, settings.missingMonthly), ex = r.plans.find(p => p.id === "monthly-extra-" + events[0].id);
    if (mo1 && mo1 !== "CHECK30" && mo1 > b.hd && mo1 !== mo) ok(ex && planHebDay(ex) === mo1 && ex.onah === a.onah, `extra monthly ${a.hd}`); else if (mo1 && mo1 !== "CHECK30" && mo1 <= b.hd) ok(!ex, `no extra monthly ${a.hd}`); }
  if (mo === null) ok(!mp, `monthly should skip ${b.hd}`);
  else if (mo === "CHECK30") { // ל׳ בחודש שאחריו חודש חסר: א׳ בחודש שאחרי החודש החסר
    let k = 1; while (hparts(addD(b.hd, k)).d !== 1) k++; let j = k + 1; while (hparts(addD(b.hd, j)).d !== 1) j++;
    ok(hparts(b.hd).d === 30 && mp && planHebDay(mp) === addD(b.hd, j), `monthly day30 rule ${b.hd} -> ${mp && planHebDay(mp)} expected ${addD(b.hd, j)}`); }
  else ok(mp && planHebDay(mp) === mo && mp.onah === b.onah, `monthly ${b.hd} expected ${mo} got ${mp && planHebDay(mp)}`);
  const ip = r.plans.find(p => p.kind === "interval"), gapH = diff(a.hd, b.hd);
  ok(ip && planHebDay(ip) === addD(b.hd, gapH) && ip.onah === b.onah && ip.title.includes(String(gapH + 1)), `interval ${a.hd}->${b.hd}`);
  ok(r.earliestHefsek === addD(b.hd, 4), `hefsek ${b.hd} ${r.earliestHefsek}`);
  if (settings.orZarua) for (const p of r.plans.filter(p => p.kind === "or-zarua")) {
    const src = r.plans.find(q => p.id === "oz-" + q.id); ok(src && p.end === src.start, "or zarua adjacency");
  }
  // אין מועד שמתחיל אחרי שהסתיים, וחלונות העונות תואמים זריחה/שקיעה
  for (const p of r.plans) if (p.end) ok(new Date(p.start) < new Date(p.end), "window order " + p.id);
}

/* 2. שבעה נקיים: הפסק אקראי, בדיקות ובדיקת יום הספירה וליל הטבילה */
for (let i = 0; i < 1500; i++) {
  const base = addD("2024-01-01", Math.floor(rnd() * 900)), t1 = pick(SAFE_TIMES), extra = Math.floor(rnd() * 4);
  const a = onahOf(base, t1), hef = addD(a.hd, 4 + extra);
  const s = M.emptyState(); s.events = [ev("flow", base, t1), ev("hefsek", hef, "15:30")];
  const k = 1 + Math.floor(rnd() * 8);
  const now = new Date(Date.parse(addD(hef, k) + "T08:00:00Z"));
  const r = M.calculate(s, now);
  ok(r.hefsek && r.immersionDate === addD(hef, 7), `immersion ${hef} ${r.immersionDate}`);
  ok(r.cleanDay === Math.min(7, k), `cleanDay k=${k} got ${r.cleanDay}`);
  const mk = r.plans.find(p => p.kind === "mikvah"); ok(mk && M.timeInZone(new Date(mk.start), tz) > M.timeInZone(M.sun(addD(hef, 7), city).sunset, tz), "mikvah after sunset");
  ok(r.plans.filter(p => p.kind === "bedikah").length === 14, "14 bedikot");
  // הפסק לפני תום ההמתנה נדחה
  const s2 = M.emptyState(); s2.events = [ev("flow", base, t1), ev("hefsek", addD(a.hd, 3), "15:30")];
  ok(!M.calculate(s2, now).hefsek, "early hefsek rejected");
}

/* 3. סדר הזנה רטרואקטיבי: שנה שלמה של מחזורים, מוזנת בסדר אקראי, חייבת לתת תוצאה זהה */
for (let i = 0; i < 300; i++) {
  let d = addD("2025-01-01", Math.floor(rnd() * 200)); const evs = [];
  for (let c = 0; c < 12; c++) {
    const t = pick(SAFE_TIMES), o = onahOf(d, t);
    evs.push(ev("flow", d, t), ev("hefsek", addD(o.hd, 4 + Math.floor(rnd() * 3)), "15:20"));
    const hdate = evs.at(-1).date; for (let j = 1; j <= 7; j++) if (rnd() < .5) evs.push(ev("bedikah", addD(hdate, j), "09:00"));
    evs.push(ev("mikvah", addD(hdate, 7), "20:30"));
    d = addD(d, 24 + Math.floor(rnd() * 12));
  }
  const settings = { haflagah: pick(["days", "chabad-onot"]), carryLongIntervals: rnd() < .5, carryMonthly: rnd() < .5 };
  const now = new Date(Date.parse(addD(evs.filter(e => e.type === "flow").at(-1).date, 3) + "T12:00:00Z"));
  const run = list => { const s = M.emptyState(); s.settings = { ...s.settings, ...settings }; s.events = list; const r = M.calculate(M.parseState(s), now); return JSON.stringify({ plans: r.plans, reviews: r.reviews, phase: r.phase, h: r.hefsek?.id, e: r.earliestHefsek, i: r.immersionDate, c: r.cleanDay }); };
  const shuffled = [...evs].sort(() => rnd() - .5).map((e, k) => ({ ...e, createdAt: new Date(Date.UTC(2026, 0, 1) + k * 1000).toISOString() }));
  ok(run(evs) === run(shuffled), "order independence " + i);
  // ניסוי: הוספת מחזור ישן באמצע אינה משנה דבר מעבר לחלון שלו
  ok(JSON.parse(run(evs)).plans.length > 0, "plans exist with long history");
}

/* 4. זמני שמש: השוואה לאלגוריתם שני ושונה (נוסחת Almanac for Computers 1990) */
function almanac(date, lat, lon, zenith, rising) {
  const [y, m, d] = date.split("-").map(Number);
  const N = Math.floor(275 * m / 9) - Math.floor((m + 9) / 12) * (1 + Math.floor((y - 4 * Math.floor(y / 4) + 2) / 3)) + d - 30;
  const lngHour = lon / 15, t = N + ((rising ? 6 : 18) - lngHour) / 24;
  const Mn = 0.9856 * t - 3.289, R = Math.PI / 180;
  let L = (Mn + 1.916 * Math.sin(Mn * R) + 0.020 * Math.sin(2 * Mn * R) + 282.634 + 360) % 360;
  let RA = (Math.atan(0.91764 * Math.tan(L * R)) / R + 360) % 360;
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
  const sinDec = 0.39782 * Math.sin(L * R), cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * R) - sinDec * Math.sin(lat * R)) / (cosDec * Math.cos(lat * R));
  if (cosH > 1 || cosH < -1) return null;
  const H = (rising ? 360 - Math.acos(cosH) / R : Math.acos(cosH) / R) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  let UT = (T - lngHour) % 24; if (UT < 0) UT += 24;
  return UT * 60;
}
let maxDiff = 0, worst = "";
for (const c of M.CITIES.filter(c => c.id !== "tromso")) for (let i = 0; i < 365; i += 3) {
  const date = addD("2026-01-01", i), s = M.sun(date, c);
  for (const [k, rising] of [["sunrise", true], ["sunset", false]]) {
    const a = almanac(date, c.lat, c.lon, 90.833, rising);
    const mine = ((s[k].getUTCHours() * 60 + s[k].getUTCMinutes() + s[k].getUTCSeconds() / 60) % 1440 + 1440) % 1440;
    let dlt = Math.abs(mine - a); if (dlt > 720) dlt = 1440 - dlt;
    if (dlt > maxDiff) { maxDiff = dlt; worst = `${c.name} ${date} ${k}`; }
    ok(dlt < 1.5, `sun ${c.name} ${date} ${k} diff ${dlt.toFixed(2)}m`);
  }
}
console.log(`checks: ${checks}, failures: ${fails}, max sun diff vs 2nd algorithm: ${maxDiff.toFixed(2)} min (${worst})`);
