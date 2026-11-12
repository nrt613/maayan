/* מעיין — ליבת החישוב. ללא תלויות חיצוניות.
 * לוח עברי (אלגוריתם הקביעות, כמו בספריית Hebcal) וזמני שמש (אלגוריתם NOAA, גובה פני הים).
 * המנוע הוא העברה נאמנה של lib/engine.ts, lib/dates.ts ו-lib/model.ts מהגרסה הקודמת. */
const Maayan = (() => {
  "use strict";

  /* ---------- לוח עברי ---------- */
  const NISAN = 1, IYYAR = 2, SIVAN = 3, TAMUZ = 4, AV = 5, ELUL = 6, TISHREI = 7, CHESHVAN = 8, KISLEV = 9, TEVET = 10, SHVAT = 11, ADAR_I = 12, ADAR_II = 13;
  const EPOCH = -1373428;
  const isLeapYear = y => (1 + y * 7) % 19 < 7;
  const monthsInYear = y => 12 + (isLeapYear(y) ? 1 : 0);
  const edCache = new Map();
  function elapsedDays(year) {
    let v = edCache.get(year);
    if (v !== undefined) return v;
    const prev = year - 1;
    const mElapsed = 235 * Math.floor(prev / 19) + 12 * (prev % 19) + Math.floor(((prev % 19) * 7 + 1) / 19);
    const pElapsed = 204 + 793 * (mElapsed % 1080);
    const hElapsed = 5 + 12 * mElapsed + 793 * Math.floor(mElapsed / 1080) + Math.floor(pElapsed / 1080);
    const parts = (pElapsed % 1080) + 1080 * (hElapsed % 24);
    const day = 1 + 29 * mElapsed + Math.floor(hElapsed / 24);
    let alt = day;
    if (parts >= 19440 || (day % 7 === 2 && parts >= 9924 && !isLeapYear(year)) || (day % 7 === 1 && parts >= 16789 && isLeapYear(prev))) alt++;
    if (alt % 7 === 0 || alt % 7 === 3 || alt % 7 === 5) alt++;
    edCache.set(year, alt);
    return alt;
  }
  const daysInYear = y => elapsedDays(y + 1) - elapsedDays(y);
  function daysInMonth(m, y) {
    if (m === IYYAR || m === TAMUZ || m === ELUL || m === TEVET || m === ADAR_II) return 29;
    if (m === ADAR_I) return isLeapYear(y) ? 30 : 29;
    if (m === CHESHVAN) return daysInYear(y) % 10 === 5 ? 30 : 29;
    if (m === KISLEV) return daysInYear(y) % 10 === 3 ? 29 : 30;
    return 30;
  }
  function hebrew2abs(y, m, d) {
    let t = d;
    if (m < TISHREI) {
      for (let i = TISHREI; i <= monthsInYear(y); i++) t += daysInMonth(i, y);
      for (let i = NISAN; i < m; i++) t += daysInMonth(i, y);
    } else for (let i = TISHREI; i < m; i++) t += daysInMonth(i, y);
    return EPOCH + elapsedDays(y) + t - 1;
  }
  function abs2hebrew(abs) {
    let y = Math.floor((abs - EPOCH) / 365.24682220597794);
    while (EPOCH + elapsedDays(y) <= abs) y++;
    y--;
    let m = abs < hebrew2abs(y, NISAN, 1) ? TISHREI : NISAN;
    while (abs > hebrew2abs(y, m, daysInMonth(m, y))) m++;
    return { y, m, d: 1 + abs - hebrew2abs(y, m, 1) };
  }
  const RD_1970 = 719163;
  const absFromYMD = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 864e5) + RD_1970;
  function ymdFromAbs(abs) { const t = new Date((abs - RD_1970) * 864e5); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; }

  const MONTH_NAMES = { 1: "ניסן", 2: "אייר", 3: "סיון", 4: "תמוז", 5: "אב", 6: "אלול", 7: "תשרי", 8: "חשון", 9: "כסלו", 10: "טבת", 11: "שבט", 12: "אדר", 13: "אדר ב׳" };
  const monthName = (m, y) => m === ADAR_I && isLeapYear(y) ? "אדר א׳" : MONTH_NAMES[m];
  function gematriya(n) {
    const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"], tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"], hundreds = ["", "ק", "ר", "ש", "ת"];
    let s = "", h = Math.floor(n / 100) % 10, r = n % 100;
    while (h > 4) { s += "ת"; h -= 4; }
    s += hundreds[h];
    if (r === 15) s += "טו"; else if (r === 16) s += "טז"; else s += tens[Math.floor(r / 10)] + ones[r % 10];
    return s.length === 1 ? s + "׳" : s.slice(0, -1) + "״" + s.slice(-1);
  }
  function nextMonth(m, y, dir) {
    if (dir > 0) {
      if (m === ELUL) return [TISHREI, y + 1];
      if (m === ADAR_I) return isLeapYear(y) ? [ADAR_II, y] : [NISAN, y];
      if (m === ADAR_II) return [NISAN, y];
      return [m + 1, y];
    }
    if (m === TISHREI) return [ELUL, y - 1];
    if (m === NISAN) return [isLeapYear(y) ? ADAR_II : ADAR_I, y];
    return [m - 1, y];
  }
  class HDate {
    constructor(a, m, y) {
      if (m === undefined) {
        if (a instanceof Date) a = absFromYMD(a.getFullYear(), a.getMonth() + 1, a.getDate());
        this._abs = a; const h = abs2hebrew(a); this.dd = h.d; this.mm = h.m; this.yy = h.y;
      } else {
        if (m === ADAR_II && !isLeapYear(y)) m = ADAR_I;
        let d = a;
        while (d > daysInMonth(m, y)) { d -= daysInMonth(m, y); [m, y] = nextMonth(m, y, 1); }
        this.dd = d; this.mm = m; this.yy = y; this._abs = hebrew2abs(y, m, d);
      }
    }
    abs() { return this._abs; }
    getDate() { return this.dd; }
    getMonth() { return this.mm; }
    getFullYear() { return this.yy; }
    greg() { const [y, m, d] = ymdFromAbs(this._abs); return new Date(y, m - 1, d, 12); }
    add(n, unit) {
      if (unit !== "M") return new HDate(this._abs + n);
      let m = this.mm, y = this.yy;
      for (let i = 0; i < Math.abs(n); i++) [m, y] = nextMonth(m, y, Math.sign(n));
      return new HDate(this.dd, m, y);
    }
    monthName() { return monthName(this.mm, this.yy); }
    renderGematriya() { return `${gematriya(this.dd)} ${monthName(this.mm, this.yy)} ${gematriya(this.yy % 1000)}`; }
  }

  /* ---------- זמני שמש (NOAA) ---------- */
  const rad = x => x * Math.PI / 180, deg = x => x * 180 / Math.PI;
  function solarParams(jc) {
    const L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
    const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
    const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
    const C = Math.sin(rad(M)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * jc) + Math.sin(rad(3 * M)) * 0.000289;
    const trueLong = L0 + C;
    const omega = 125.04 - 1934.136 * jc;
    const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
    const eps0 = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(rad(omega));
    const dec = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
    const yv = Math.tan(rad(eps / 2)) ** 2;
    const eqTime = 4 * deg(yv * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * yv * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * yv * yv * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
    return { dec, eqTime };
  }
  /** דקות UTC מחצות של התאריך האזרחי; null כאשר השמש אינה מגיעה לזווית */
  function sunEventUTC(y, m, d, lat, lon, zenith, rising) {
    const jd0 = (Date.UTC(y, m - 1, d) / 864e5) + 2440587.5;
    let t = 720 - 4 * lon;
    for (let i = 0; i < 3; i++) {
      const jc = (jd0 + t / 1440 - 2451545) / 36525;
      const { dec, eqTime } = solarParams(jc);
      const cosH = Math.cos(rad(zenith)) / (Math.cos(rad(lat)) * Math.cos(rad(dec))) - Math.tan(rad(lat)) * Math.tan(rad(dec));
      if (cosH > 1 || cosH < -1) return null;
      const H = deg(Math.acos(cosH));
      t = 720 - 4 * (lon + (rising ? H : -H)) - eqTime;
    }
    return t;
  }

  /* ---------- מודל ---------- */
  const CITIES = [
    { id: "netanya", name: "נתניה", lat: 32.3215, lon: 34.8532, tz: "Asia/Jerusalem" },
    { id: "jerusalem", name: "ירושלים", lat: 31.778, lon: 35.235, tz: "Asia/Jerusalem" },
    { id: "tel-aviv", name: "תל אביב", lat: 32.0853, lon: 34.7818, tz: "Asia/Jerusalem" },
    { id: "bnei-brak", name: "בני ברק", lat: 32.0849, lon: 34.8352, tz: "Asia/Jerusalem" },
    { id: "haifa", name: "חיפה", lat: 32.794, lon: 34.9896, tz: "Asia/Jerusalem" },
    { id: "beersheba", name: "באר שבע", lat: 31.2529, lon: 34.7915, tz: "Asia/Jerusalem" },
    { id: "paris", name: "פריז", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
    { id: "london", name: "לונדון", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
    { id: "new-york", name: "ניו יורק", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
    { id: "los-angeles", name: "לוס אנג׳לס", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
    { id: "sydney", name: "סידני", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
    { id: "tromso", name: "טרומסה", lat: 69.6492, lon: 18.9553, tz: "Europe/Oslo" },
  ];
  const city = id => CITIES.find(c => c.id === id) || CITIES[0];
  const EVENT_TYPES = ["flow", "hefsek", "bedikah", "mikvah", "question", "restart", "note", "intimacy", "manual"];
  const EVENT_NAMES = {
    flow: "תחילת וסת", hefsek: "הפסק טהרה", bedikah: "בדיקה", mikvah: "טבילה", question: "שאלה לבירור",
    restart: "חידוש ספירה לפי הוראה", note: "הערה אישית", intimacy: "בסיס להמתנת ארבעה ימים", manual: "עונת פרישה לפי הוראה",
  };
  const CHECKLIST = ["תיאום עם המקווה", "הסרת תכשיטים וחציצות", "טיפול בציפורניים", "רחצה וחפיפה", "סירוק השיער", "בדיקה שאין חציצות", "מגבת ובגדים נקיים", "פריטים אישיים לדרך"];
  const SETTING_DEFAULTS = {
    cityId: "netanya", wait: "five", haflagah: "days", beinonit: "same", day31: false, orZarua: false, carryMonthly: false,
    carryLongIntervals: false, missingMonthly: "first-next-month", bedikot: "twice", nightfall: "8.5", special: "regular", methodNote: "",
    neutralReminders: true, reminderMinutes: 30, morningTime: "08:00", remindersEnabled: true, checklist: [],
  };
  const SETTING_ENUMS = {
    wait: ["five", "four-from-relations"], haflagah: ["days", "chabad-onot"], beinonit: ["same", "both"], missingMonthly: ["skip", "first-next-month"],
    bedikot: ["twice", "first-last"], nightfall: ["8.5", "7.083"], special: ["regular", "pregnancy", "postpartum", "nursing", "hormonal"],
  };
  const uuid = () => {
    if (globalThis.crypto && crypto.randomUUID) try { return crypto.randomUUID(); } catch { /* fallback */ }
    const b = new Uint8Array(16); (globalThis.crypto || { getRandomValues: a => a.map(() => Math.random() * 256 | 0) }).getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const validISO = s => {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T12:00:00Z`);
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s && s >= "2000-01-01" && s <= "2100-12-31";
  };
  class ValidationError extends Error {}
  const fail = msg => { throw new ValidationError(msg); };
  /** מקבילה ל-stateSchema.parse: משלים ברירות מחדל וזורק שגיאה בעברית */
  function parseState(input) {
    if (!input || typeof input !== "object" || input.schemaVersion !== 1) fail("מבנה היומן אינו נתמך");
    const s = { ...SETTING_DEFAULTS, ...(input.settings || {}) };
    if (!CITIES.some(c => c.id === s.cityId)) fail("עיר לא מוכרת בהגדרות");
    for (const [k, vals] of Object.entries(SETTING_ENUMS)) if (!vals.includes(s[k])) fail(`ערך לא תקין בהגדרה ${k}`);
    for (const k of ["day31", "orZarua", "carryMonthly", "carryLongIntervals", "neutralReminders", "remindersEnabled"]) if (typeof s[k] !== "boolean") fail(`ערך לא תקין בהגדרה ${k}`);
    if (typeof s.methodNote !== "string" || s.methodNote.length > 1000) fail("הערת השיטה ארוכה מדי");
    if (!Number.isInteger(s.reminderMinutes) || s.reminderMinutes < 5 || s.reminderMinutes > 120) fail("דקות התזכורת צריכות להיות בין 5 ל-120");
    if (!TIME_RE.test(s.morningTime)) fail("שעת הבוקר אינה תקינה");
    if (!Array.isArray(s.checklist) || s.checklist.length > 40 || s.checklist.some(x => typeof x !== "string" || x.length > 80)) fail("רשימת ההכנה אינה תקינה");
    const events = (input.events || []).map(e => {
      const x = { result: "clear", note: "", authorityNote: "", ...e };
      if (!UUID_RE.test(x.id)) fail("מזהה רישום לא תקין");
      if (!EVENT_TYPES.includes(x.type)) fail("סוג רישום לא מוכר");
      if (!validISO(x.date)) fail("תאריך לא תקין או מחוץ לטווח 2000–2100");
      if (!TIME_RE.test(x.time)) fail("שעה לא תקינה");
      if (!CITIES.some(c => c.id === x.cityId)) fail("מקום לא מוכר");
      if (!["clear", "uncertain", "bleeding"].includes(x.result)) fail("תוצאה לא תקינה");
      if (x.onah !== undefined && !["day", "night"].includes(x.onah)) fail("עונה לא תקינה");
      if (typeof x.note !== "string" || x.note.length > 2000) fail("ההערה ארוכה מדי");
      if (typeof x.authorityNote !== "string" || x.authorityNote.length > 1000) fail("תיעוד ההנחיה ארוך מדי");
      if (typeof x.createdAt !== "string" || Number.isNaN(Date.parse(x.createdAt))) fail("זמן יצירה לא תקין");
      if (x.type === "manual" && !x.onah) fail("יש לבחור עונה למועד ידני");
      const out = { id: x.id, type: x.type, date: x.date, time: x.time, cityId: x.cityId, result: x.result, note: x.note, authorityNote: x.authorityNote, createdAt: x.createdAt };
      if (x.onah) out.onah = x.onah;
      return out;
    });
    if (events.length > 5000) fail("יותר מדי רישומים");
    if (new Set(events.map(e => e.id)).size !== events.length) fail("אירועים כפולים");
    const trips = (input.trips || []).map(t => {
      if (!UUID_RE.test(t.id) || !validISO(t.from) || !validISO(t.to) || !CITIES.some(c => c.id === t.cityId)) fail("נסיעה לא תקינה");
      if (t.to < t.from) fail("סיום הנסיעה חייב להיות אחרי תחילתה");
      return { id: t.id, from: t.from, to: t.to, cityId: t.cityId };
    });
    if (trips.length > 100) fail("יותר מדי נסיעות");
    for (let i = 0; i < trips.length; i++) for (let j = i + 1; j < trips.length; j++)
      if (trips[i].from <= trips[j].to && trips[j].from <= trips[i].to) fail("טווחי נסיעות חופפים");
    return { schemaVersion: 1, settings: s, events, trips };
  }
  const safeParse = input => { try { return { success: true, data: parseState(input) }; } catch (e) { return { success: false, error: e }; } };
  const emptyState = () => ({ schemaVersion: 1, settings: { ...SETTING_DEFAULTS, checklist: [] }, events: [], trips: [] });

  /* ---------- תאריכים ---------- */
  const fromISO = d => { const [y, m, day] = d.split("-").map(Number); return new Date(y, m - 1, day, 12); };
  const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isoAbs = d => { const [y, m, day] = d.split("-").map(Number); return absFromYMD(y, m, day); };
  const fromAbs = n => { const [y, m, d] = ymdFromAbs(n); return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
  const addDays = (d, n) => fromAbs(isoAbs(d) + n);
  const hd = d => new HDate(isoAbs(d));
  const hebrew = d => hd(d).renderGematriya();
  const dayNumber = d => isoAbs(d);
  const civilFmt = new Map();
  const civilLabel = (d, short = false) => {
    const k = short ? "s" : "l";
    if (!civilFmt.has(k)) civilFmt.set(k, new Intl.DateTimeFormat("he-IL", { day: "numeric", month: short ? "short" : "long", year: short ? undefined : "numeric", timeZone: "UTC" }));
    const [y, m, day] = d.split("-").map(Number);
    return civilFmt.get(k).format(new Date(Date.UTC(y, m - 1, day, 12)));
  };
  const dzFmt = new Map();
  const dateInZone = (now, tz) => {
    let f = dzFmt.get(tz);
    if (!f) { f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }); dzFmt.set(tz, f); }
    const p = f.formatToParts(now), val = t => p.find(x => x.type === t).value;
    return `${val("year")}-${val("month")}-${val("day")}`;
  };
  const tzFmt = new Map();
  const timeInZone = (d, tz) => {
    if (!d || !Number.isFinite(d.valueOf())) return "—";
    let f = tzFmt.get(tz);
    if (!f) { f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); tzFmt.set(tz, f); }
    return f.format(d);
  };
  const wallFmt = new Map();
  function localParts(ms, tz) {
    let f = wallFmt.get(tz);
    if (!f) { f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); wallFmt.set(tz, f); }
    const parts = f.formatToParts(new Date(ms)), p = s => Number(parts.find(x => x.type === s)?.value);
    return [p("year"), p("month"), p("day"), p("hour") % 24, p("minute")];
  }
  /** שעה מקומית לרגע מוחלט, בלי לבחור בשקט שעה כפולה במעבר שעון */
  function localInstant(date, time, tz) {
    const target = [...date.split("-").map(Number), ...time.split(":").map(Number)];
    const naive = Date.UTC(target[0], target[1] - 1, target[2], target[3], target[4]);
    const offsets = new Set();
    for (const n of [-24, -12, 0, 12, 24]) {
      const sample = naive + n * 3600000, p = localParts(sample, tz);
      offsets.add(Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4]) - sample);
    }
    const matches = [...offsets].map(o => naive - o).filter(ms => localParts(ms, tz).every((n, i) => n === target[i]));
    if (matches.length !== 1) throw new Error(matches.length ? "השעה מופיעה פעמיים במעבר שעון; נדרש בירור" : "השעה אינה קיימת במעבר שעון");
    return new Date(matches[0]);
  }
  const sunCache = new Map();
  function calculateSun(date, c, degrees) {
    const [y, m, d] = date.split("-").map(Number), base = Date.UTC(y, m - 1, d);
    const at = (zenith, rising) => { const t = sunEventUTC(y, m, d, c.lat, c.lon, zenith, rising); return t === null ? null : new Date(base + Math.round(t * 60000)); };
    return { sunrise: at(90.833, true), sunset: at(90.833, false), nightfall: at(90 + degrees, false), dawn: at(106.1, true) };
  }
  function sun(date, c, degrees = 8.5) {
    const key = `${date}:${c.id}:${degrees}`;
    let s = sunCache.get(key);
    if (!s) { s = calculateSun(date, c, degrees); if (sunCache.size > 4000) sunCache.clear(); sunCache.set(key, s); }
    return s;
  }
  function atLocation(state, date) {
    const trip = state.trips.find(t => t.from <= date && t.to >= date);
    return city(trip ? trip.cityId : state.settings.cityId);
  }
  function stamp(e) {
    const c = city(e.cityId), instant = localInstant(e.date, e.time, c.tz), s = sun(e.date, c);
    if (!s.sunrise || !s.sunset) throw new Error("אין זריחה או שקיעה בתאריך ובמיקום הזה; נדרשת הוראה אישית");
    const after = instant >= s.sunset, night = after || instant < s.sunrise;
    const abs = isoAbs(after ? addDays(e.date, 1) : e.date);
    // מרווח של שלוש דקות הוא סימון לבירור, לא הגדרה של בין השמשות
    const nearSunset = Math.abs(instant - s.sunset) <= 3 * 60000;
    const twilight = instant >= s.sunset && (!s.nightfall || instant < s.nightfall);
    const nearSunrise = Math.abs(instant - s.sunrise) <= 3 * 60000;
    return { abs, onah: night ? "night" : "day", ordinal: 2 * abs + (night ? 0 : 1), instant, hebrewDate: new HDate(abs).renderGematriya(), uncertain: nearSunset || twilight || nearSunrise, sun: s };
  }
  function onahWindow(abs, onah, c, degrees = 8.5) {
    const date = fromAbs(abs), s = sun(date, c, degrees), prior = sun(addDays(date, -1), c, degrees);
    return { start: onah === "day" ? s.sunrise : prior.sunset, end: onah === "day" ? s.sunset : s.sunrise, date: onah === "day" ? date : addDays(date, -1) };
  }
  const today = (cityId = "netanya", now = new Date()) => dateInZone(now, city(cityId).tz);
  function currentContext(state, now = new Date()) {
    const trip = state.trips.find(t => { const d = dateInZone(now, city(t.cityId).tz); return t.from <= d && d <= t.to; });
    const c = city(trip ? trip.cityId : state.settings.cityId), date = dateInZone(now, c.tz), s = sun(date, c, Number(state.settings.nightfall));
    const abs = isoAbs(s.sunset && now >= s.sunset ? addDays(date, 1) : date);
    return { city: c, date, abs, time: timeInZone(now, c.tz), hebrewDate: new HDate(abs).renderGematriya(), afterSunset: !!(s.sunset && now >= s.sunset) };
  }

  /* ---------- מנוע ---------- */
  const ENGINE_VERSION = "0.2.0-review";
  const SOURCES = {
    calendar: "https://www.yoatzot.org/548/", wait: "https://www.yoatzot.org/526/", hefsek: "https://www.yoatzot.org/527/",
    clean: "https://www.yoatzot.org/529/", monthly: "https://www.yoatzot.org/677/", interval: "https://www.yoatzot.org/670/",
    average: "https://www.yoatzot.org/672/", fixed: "https://www.yoatzot.org/676/",
    chabad: "https://learn.mikvah.org/halachos-of-taharas-hamishpacha-chabad/calendar",
  };
  const sorted = events => [...events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.createdAt.localeCompare(b.createdAt));

  /** חישוב מחדש מלא מכל הרישומים. כל מועד מצטט את הרישומים ואת הכלל שעליהם הוא נשען. */
  function calculate(state, now = new Date()) {
    const plans = [], reviews = [], stamped = [], unresolvedStarts = [];
    const context = currentContext(state, now), date = context.date, currentAbs = context.abs;
    const nf = Number(state.settings.nightfall);
    const review = (id, title, detail, eventIds = []) => { if (!reviews.some(r => r.id === id)) reviews.push({ id, title, detail, eventIds }); };
    for (const e of sorted(state.events)) {
      try {
        const s = stamp(e);
        if (s.instant > now && e.type !== "manual" && e.type !== "note") { review(`future-${e.id}`, "רישום עתידי", "אירוע שטרם התרחש אינו משמש כחישוב בפועל.", [e.id]); continue; }
        stamped.push({ e, s });
        if (s.uncertain && ["flow", "hefsek", "restart", "bedikah"].includes(e.type)) review(`boundary-${e.id}`, "רישום סמוך לגבול היום או העונה", "נשמרו השעה והמקום. שיוך האירוע דורש בירור, והוא לא משמש לבדו לחישוב ודאי.", [e.id]);
        if (e.type === "question" || e.result === "uncertain") review(`question-${e.id}`, "רישום שממתין לבירור", e.note || "שאלה על דימום או מראה אינה הופכת אוטומטית לווסת או להפסק תקף.", [e.id]);
      } catch (err) {
        if (e.type === "flow" || e.type === "restart") {
          const zone = city(e.cityId).tz, localDate = dateInZone(now, zone);
          if (e.date < localDate || (e.date === localDate && e.time <= timeInZone(now, zone))) unresolvedStarts.push(e);
        }
        review(`time-${e.id}`, "נדרש בירור של הזמן והמיקום", err instanceof Error ? err.message : "לא ניתן לחשב זמן", [e.id]);
      }
    }
    stamped.sort((a, b) => a.s.instant - b.s.instant);
    const recordedFlows = stamped.filter(x => x.e.type === "flow");
    const natural = recordedFlows.filter(x => x.e.result !== "uncertain");
    const flows = natural.filter(x => !x.s.uncertain);
    const latestFlow = natural.at(-1)?.e;
    const latestNiddah = stamped.filter(x => ["flow", "restart"].includes(x.e.type)).at(-1);
    const latestMikvah = stamped.filter(x => x.e.type === "mikvah").at(-1);
    const couldFollow = (event, reference) => !reference || event.date >= dateInZone(reference.s.instant, city(event.cityId).tz);
    const unresolvedActive = unresolvedStarts.some(event => couldFollow(event, latestNiddah) && couldFollow(event, latestMikvah));
    const unresolvedFlows = unresolvedStarts.filter(event => event.type === "flow");
    let dateline = false;
    for (let i = 1; i < stamped.length; i++) {
      if (Math.abs(city(stamped[i].e.cityId).lon - city(stamped[i - 1].e.cityId).lon) > 180) { dateline = true; review("dateline", "נסיעה אפשרית מעבר לקו התאריך", "החישובים האוטומטיים לעונות הושעו. יש לרשום את ההנחיות האישיות כאירועים ידניים.", [stamped[i - 1].e.id, stamped[i].e.id]); }
    }
    if (state.settings.haflagah === "chabad-onot" && state.settings.beinonit === "same") review("chabad-beinonit", "בשיטת חב״ד העונה הבינונית היא יממה שלמה", "לפי לוח חב״ד פורשים ביום 30 מהשקיעה ועד השקיעה. בהגדרות נבחרה עונה אחת בלבד; כדי ליישר עם השיטה יש לבחור ״שתי העונות״.");
    if (state.settings.special !== "regular") review("special", "נבחר מצב המחייב התאמה אישית", "היריון, אחרי לידה, הנקה וטיפול הורמונלי אינם מחושבים כאן אוטומטית לפי כללי מחזור רגיל. אפשר לרשום מועדים ידניים לפי הוראה.");
    let earliestHefsek;
    if (!unresolvedActive && latestNiddah && (!latestMikvah || latestMikvah.s.instant < latestNiddah.s.instant)) {
      let baseAbs = latestNiddah.s.abs;
      if (latestNiddah.e.type === "restart") {
        const prior = stamped.filter(x => x.e.type === "flow" && x.s.instant < latestNiddah.s.instant && (!latestMikvah || x.s.instant > latestMikvah.s.instant)).at(-1);
        if (prior) baseAbs = prior.s.abs; else review("restart-without-history", "חסר בסיס לחידוש הספירה", "נרשם חידוש ספירה ללא וסת קודמת מתועדת. יש לברר את מועד ההפסק האפשרי.", [latestNiddah.e.id]);
      }
      if (state.settings.wait === "five") earliestHefsek = fromAbs(Math.max(baseAbs + 4, latestNiddah.s.abs));
      else {
        const relations = stamped.filter(x => x.e.type === "intimacy" && x.s.instant <= latestNiddah.s.instant).at(-1);
        if (relations && !relations.s.uncertain) earliestHefsek = fromAbs(Math.max(relations.s.abs + 3, latestNiddah.s.abs));
        else review("wait-base", "חסר מועד בסיס להמתנה", "נבחר חישוב ארבעה ימים ממועד היחסים. צריך לרשום את מועד הבסיס או לצרף הוראה אישית להפסק; אין הנחה אוטומטית של ארבעה ימים מתחילת הווסת.");
      }
      if (latestNiddah.s.uncertain || latestNiddah.e.result === "uncertain") earliestHefsek = undefined;
    }
    const hefsekCandidates = unresolvedActive ? [] : stamped.filter(x => x.e.type === "hefsek" && x.e.result === "clear" && (!latestNiddah || x.s.instant > latestNiddah.s.instant) && (!latestMikvah || x.s.instant > latestMikvah.s.instant));
    let validHefsek;
    for (const h of hefsekCandidates) {
      const beforeSunset = !!h.s.sun.sunset && h.s.instant < h.s.sun.sunset && !h.s.uncertain;
      if (!beforeSunset) { review(`hefsek-late-${h.e.id}`, "זמן ההפסק דורש בירור", "אין להתחיל ספירה אוטומטית מהפסק שנרשם אחרי השקיעה או בזמן מסופק.", [h.e.id]); continue; }
      if (!latestNiddah) { review(`hefsek-no-flow-${h.e.id}`, "חסר רישום תחילת התקופה", "נשמר ההפסק, אך חסרים נתוני הבסיס להמתנה. אפשר לתעד הוראה אישית.", [h.e.id]); if (!h.e.authorityNote) continue; }
      if ((!earliestHefsek || h.e.date < earliestHefsek) && !h.e.authorityNote) { review(`hefsek-early-${h.e.id}`, "הפסק לפני מועד ההמתנה המחושב", "המערכת אינה משנה את ההמתנה ללא תיעוד הוראה אישית.", [h.e.id]); continue; }
      validHefsek = h;
    }
    const checks = {};
    let cleanDay = 0, immersionDate;
    const addPlan = p => plans.push({ ...p, tentative: p.tentative ?? true });
    if (validHefsek) {
      const h = validHefsek;
      immersionDate = fromAbs(h.s.abs + 7);
      cleanDay = Math.max(0, Math.min(7, currentAbs - h.s.abs));
      for (let n = 1; n <= 7; n++) {
        const d = fromAbs(h.s.abs + n), c = atLocation(state, d), s = sun(d, c, nf);
        checks[n] = stamped.filter(x => x.e.type === "bedikah" && x.e.result === "clear" && x.s.abs === h.s.abs + n && !!x.s.sun.dawn && !!x.s.sun.sunset && x.s.instant >= x.s.sun.dawn && x.s.instant < x.s.sun.sunset && !x.s.uncertain).map(x => x.e);
        const morning = checks[n].some(e => e.time < "12:00"), afternoon = checks[n].some(e => e.time >= "12:00");
        if ((n === 1 || n === 7) && d < date && !checks[n].length) review(`missing-day-${n}`, `לא נרשמה בדיקה ביום ${n === 1 ? "הראשון" : "השביעי"}`, "חוסר רישום אינו מוכיח שלא בוצעה בדיקה. יש להשלים רישום או לברר; המערכת אינה פוסלת או מאשרת את הספירה בעצמה.", [h.e.id]);
        if (state.settings.bedikot === "first-last" && n !== 1 && n !== 7) continue;
        if (s.sunrise && s.sunset) {
          const base = { kind: "bedikah", date: d, onah: "day", source: SOURCES.clean, eventIds: [h.e.id], cityId: c.id, day: n };
          let morningInstant = s.sunrise;
          try { morningInstant = localInstant(d, state.settings.morningTime, c.tz); }
          catch { review("morning-clock-" + d, "שעת התזכורת דורשת התאמה במעבר שעון", "תזכורת הבוקר הועברה לשעת הזריחה המקומית ביום הזה."); }
          if (morningInstant < s.sunrise) morningInstant = s.sunrise;
          if (morningInstant >= s.sunset) { morningInstant = s.sunrise; review("morning-outside-day", "שעת הבוקר שנבחרה מחוץ לעונת היום", "תזכורת הבוקר הוזזה לזריחה כדי להישאר בתוך יום הבדיקה."); }
          addPlan({ ...base, id: `bedikah-${h.e.id}-${n}-am`, title: `בדיקת בוקר · יום ${n}`, start: morningInstant.toISOString(), end: s.sunset.toISOString(), reason: "תזכורת לרישום בדיקה; אינה קביעה שבדיקה בוצעה.", done: morning || (state.settings.bedikot === "first-last" && checks[n].length > 0) });
          if (state.settings.bedikot === "twice") addPlan({ ...base, id: `bedikah-${h.e.id}-${n}-pm`, title: `בדיקת ערב · יום ${n}`, start: new Date(s.sunset.valueOf() - state.settings.reminderMinutes * 60000).toISOString(), end: s.sunset.toISOString(), reason: `${state.settings.reminderMinutes} דקות לפני השקיעה המקומית.`, done: afternoon });
        } else review(`sun-${d}`, "חסרים זמני יום", "אין זמן שמש תקף למועד ולמיקום שנבחרו; נדרש בירור.");
      }
      const c = atLocation(state, immersionDate), s = sun(immersionDate, c, nf);
      if (s.nightfall) addPlan({ id: `mikvah-${h.e.id}`, kind: "mikvah", title: "ליל טבילה מתוכנן", date: immersionDate, onah: "evening", start: s.nightfall.toISOString(), reason: "הערב שלאחר היום השביעי. מותנה בהשלמת הספירה, הבדיקות ובירור הספקות; אינו אישור טבילה.", source: SOURCES.clean, eventIds: [h.e.id], cityId: c.id });
    } else if (earliestHefsek) {
      const d = earliestHefsek < date ? date : earliestHefsek, c = atLocation(state, d), s = sun(d, c);
      if (s.sunset) addPlan({ id: `hefsek-${latestNiddah?.e.id}`, kind: "hefsek", title: "תזכורת להפסק טהרה", date: d, onah: "day", start: new Date(s.sunset.valueOf() - state.settings.reminderMinutes * 60000).toISOString(), end: s.sunset.toISOString(), reason: "זהו המועד המוקדם לפי ההמתנה שנבחרה, ורק אם הדימום פסק והבדיקה תקפה. לא נרשם הפסק באופן אוטומטי.", source: SOURCES.wait, eventIds: latestNiddah ? [latestNiddah.e.id] : [], cityId: c.id });
    }
    const addOnah = (abs, onah, kind, title, reason, source, eventIds, id) => {
      const civil = fromAbs(abs), location = atLocation(state, onah === "night" ? addDays(civil, -1) : civil);
      const w = onahWindow(abs, onah, location, nf);
      if (!w.start || !w.end) { review(`onah-sun-${id}`, "לא ניתן לחשב עונה במיקום הזה", "חסרים זמני זריחה או שקיעה תקפים.", eventIds); return; }
      const p = { id, kind, title, date: w.date, onah, start: w.start.toISOString(), end: w.end.toISOString(), reason, source, eventIds, cityId: location.id, tentative: true };
      addPlan(p);
      if (state.settings.orZarua && ["monthly", "interval", "average"].includes(kind)) {
        const prev = 2 * abs + (onah === "night" ? 0 : 1) - 1, pa = Math.floor(prev / 2), po = prev % 2 ? "day" : "night", pw = onahWindow(pa, po, location);
        if (pw.start && pw.end) addPlan({ ...p, id: `oz-${id}`, kind: "or-zarua", title: `אור זרוע · ${title}`, date: pw.date, onah: po, start: pw.start.toISOString(), end: pw.end.toISOString(), reason: "העונה הקודמת לעונה הצפויה, לפי האפשרות שנבחרה בהגדרות." });
      }
    };
    const last = flows.at(-1), lastRecorded = recordedFlows.at(-1);
    const latestHasUncertainty = unresolvedFlows.some(event => couldFollow(event, lastRecorded)) || (!!lastRecorded && (lastRecorded.s.uncertain || lastRecorded.e.result === "uncertain"));
    if (last && !latestHasUncertainty && state.settings.special === "regular" && !dateline) {
      const onot = state.settings.beinonit === "both" ? ["night", "day"] : [last.s.onah];
      for (const day of (state.settings.day31 ? [30, 31] : [30])) for (const onah of onot)
        addOnah(last.s.abs + day - 1, onah, "average", `עונה בינונית · יום ${day}`, `ספירה כוללנית: יום הראייה הוא יום 1. יום ${day} הוא ${day - 1} ימים לאחר התאריך העברי שנרשם.`, SOURCES.average, [last.e.id], `average-${last.e.id}-${day}-${onah}`);
      const monthly = f => {
        const h = new HDate(f.s.abs), nextFirst = new HDate(1, h.getMonth(), h.getFullYear()).add(1, "M");
        const monthLength = nextFirst.add(1, "M").abs() - nextFirst.abs();
        if (h.getDate() <= monthLength) return nextFirst.abs() + h.getDate() - 1;
        if (state.settings.missingMonthly === "first-next-month") return nextFirst.add(1, "M").abs();
        return null;
      };
      const monthlyAbs = monthly(last);
      if (monthlyAbs) addOnah(monthlyAbs, last.s.onah, "monthly", "עונת החודש", "אותו יום בחודש העברי הבא ובאותה עונה. כלל יום ל׳ בחודש חסר נקבע בנפרד בהגדרות.", SOURCES.monthly, [last.e.id], `monthly-${last.e.id}`);
      else review("missing-month-day", "בחודש הבא אין יום מקביל", "נבחר לדלג על עונת החודש בחודש חסר. זו בחירת שיטה, ולא החלטה שמתאימה לכל מנהג.", [last.e.id]);
      const monthlyTargets = new Set([monthlyAbs]);
      // ראייה קודמת שעונת החודש שלה עוד לא הגיעה כשבאה הראייה האחרונה — עונת החודש שלה נשארת (ראתה פעמיים בחודש)
      for (const f of flows.slice(0, -1)) {
        const t = monthly(f);
        if (t && t > last.s.abs && !monthlyTargets.has(t)) {
          monthlyTargets.add(t);
          addOnah(t, f.s.onah, "monthly", "עונת חודש נוספת", "ראייה קודמת שעונת החודש שלה עוד לא הגיעה. הראייה האחרונה אינה עוקרת אותה, ולכן שומרים גם אותה.", SOURCES.monthly, [f.e.id], `monthly-extra-${f.e.id}`);
        }
      }
      if (state.settings.carryMonthly && flows.length > 1) {
        for (const f of flows.slice(0, -1)) {
          let target = monthly(f), guard = 0;
          while (target && target <= last.s.abs && guard++ < 18) {
            const t = target;
            const niddah = stamped.filter(x => ["flow", "restart"].includes(x.e.type) && x.s.abs <= t).at(-1);
            const end = stamped.find(x => x.e.type === "hefsek" && x.e.result === "clear" && niddah && x.s.instant > niddah.s.instant);
            if (!niddah || !end || end.s.abs < target) { target = null; break; }
            const h = new HDate(target), next = h.add(1, "M");
            target = next.getDate() === h.getDate() ? next.abs() : null;
          }
          if (target && target > last.s.abs && !monthlyTargets.has(target) && guard > 0) addOnah(target, f.s.onah, "monthly", "עונת חודש שנשמרה", "עונת חודש קודמת שנפלה בתוך תקופת דימום מתועדת, לפי בחירת שימור. יש לאמת את נסיבות העקירה.", SOURCES.monthly, [f.e.id, last.e.id], `carry-monthly-${f.e.id}-${target}`);
        }
      }
      const uncertainInterval = unresolvedFlows.some(event => couldFollow(event, recordedFlows.at(-2))) || recordedFlows.slice(-2).some(x => x.s.uncertain || x.e.result === "uncertain");
      if (uncertainInterval && recordedFlows.length >= 2) review("uncertain-interval", "חסר בסיס ודאי להפלגה", "אחת משתי הראיות האחרונות מסופקת. אין לדלג עליה ולחשב מרווח מראייה מוקדמת יותר.");
      if (flows.length >= 2 && !uncertainInterval) {
        const intervals = [];
        for (let i = 1; i < flows.length; i++) {
          const a = flows[i - 1], b = flows[i];
          let value;
          if (state.settings.haflagah === "days") value = b.s.abs - a.s.abs + 1;
          else {
            const h = stamped.filter(x => x.e.type === "hefsek" && x.e.result === "clear" && !x.s.uncertain && !!x.s.sun.sunset && x.s.instant < x.s.sun.sunset && x.s.instant > a.s.instant && x.s.instant < b.s.instant && (x.s.abs >= a.s.abs + 4 || !!x.e.authorityNote)).at(-1);
            if (h) value = b.s.ordinal - (2 * h.s.abs + 1);
            else review(`chabad-hefsek-${b.e.id}`, "חסר הפסק לחישוב הפלגה בחב״ד", "חישוב זה דורש את ההפסק הקודם ולא רק שתי התחלות וסת.", [a.e.id, b.e.id]);
          }
          if (!value || value <= 0) continue;
          if (state.settings.haflagah === "chabad-onot" || state.settings.carryLongIntervals) { for (let j = intervals.length - 1; j >= 0; j--) if (intervals[j].value <= value) intervals.splice(j, 1); }
          else intervals.length = 0;
          intervals.push({ value, ids: [a.e.id, b.e.id] });
        }
        for (const interval of intervals) {
          if (state.settings.haflagah === "days") addOnah(last.s.abs + interval.value - 1, last.s.onah, "interval", `הפלגה · ${interval.value} ימים`, "הפרש התאריכים העבריים בתוספת 1, בספירה כוללנית. חוזרים על אותו מרווח מהווסת האחרונה ובאותה עונה.", SOURCES.interval, interval.ids, `interval-${interval.value}-${last.e.id}`);
          else if (validHefsek) {
            const ordinal = 2 * validHefsek.s.abs + 1 + interval.value;
            addOnah(Math.floor(ordinal / 2), ordinal % 2 ? "day" : "night", "interval", `הפלגה · ${interval.value} עונות`, "מספר העונות מההפסק הקודם ועד הראייה הבאה, בספירה כוללנית; מועד חדש נספר מההפסק הנוכחי. מספרים גבוהים נשמרים כשמגיע מספר נמוך.", SOURCES.chabad, [...interval.ids, validHefsek.e.id], `chabad-${interval.value}-${last.e.id}`);
          }
        }
      }
    }
    if (flows.length >= 3) {
      const recent = flows.slice(-3), months = recent.map(x => new HDate(x.s.abs));
      if (recent.every(x => x.s.onah === recent[0].s.onah) && months.every(h => h.getDate() === months[0].getDate()) && months[0].add(1, "M").abs() === months[1].abs() && months[1].add(1, "M").abs() === months[2].abs())
        review("possible-fixed-month", "דפוס חודשי אפשרי שחוזר שלוש פעמים", "נדרש בירור של קביעות ועקירה. המערכת אינה מחליפה את מועדי החשש אוטומטית על בסיס זיהוי דפוס.", recent.map(x => x.e.id));
    }
    if (flows.length >= 4) {
      const f = flows.slice(-4), g = [1, 2, 3].map(i => f[i].s.abs - f[i - 1].s.abs);
      if (g.every(n => n === g[0]) && f.slice(1).every(x => x.s.onah === f[1].s.onah)) review("possible-fixed-interval", "שלוש הפלגות שוות בארבע ראיות", "זהו חשד לדפוס קבוע, ולא קביעה של וסת קבוע. יש לברר אילו חששות לשמור.", f.map(x => x.e.id));
    }
    for (const { e } of stamped) if (e.type === "manual" && e.onah) addOnah(isoAbs(e.date), e.onah, "manual", "עונת פרישה לפי הוראה", e.authorityNote || e.note || "מועד שנרשם ידנית; אינו נוצר מהחישוב האוטומטי.", "", [e.id], `manual-${e.id}`);
    for (const x of stamped.filter(x => x.e.type === "bedikah" && x.e.result === "bleeding")) review(`bleeding-check-${x.e.id}`, "בדיקה שנרשמה כלא נקייה", "אין איפוס אוטומטי על סמך תיאור מראה. יש לברר ולתעד חידוש ספירה אם כך הונחית.", [x.e.id]);
    if (latestNiddah && !validHefsek && (!latestMikvah || latestMikvah.s.instant < latestNiddah.s.instant) && currentAbs - latestNiddah.s.abs > 14)
      review("no-mikvah-after-flow", "לא נרשמו הפסק וטבילה אחרי הראייה האחרונה", "אם הוזנו מחזורים קודמים ללא הפסק וטבילה, המערכת מניחה שעדיין לא נעשו. כדי שהמצב יוצג נכון יש לרשום אותם.", [latestNiddah.e.id]);
    const immersed = !unresolvedActive && latestMikvah && (!latestNiddah || latestMikvah.s.instant > latestNiddah.s.instant);
    const phase = immersed ? "immersed" : validHefsek ? (currentAbs > validHefsek.s.abs + 7 ? "planned" : "clean") : latestNiddah || unresolvedActive ? "waiting" : "empty";
    if (immersed && !stamped.some(x => x.e.type === "hefsek" && x.s.instant < latestMikvah.s.instant)) review("immersion-no-history", "טבילה ללא תיעוד ספירה קודם", "נשמר רישום הטבילה כפי שהוזן. אין להסיק ממנו אישור הלכתי או השלמת בדיקות.", [latestMikvah.e.id]);
    // אור זרוע שחופף בדיוק לעונה שכבר נשמרת (למשל בעונה בינונית של יממה שלמה) אינו מוצג פעמיים
    const windows = new Set(plans.filter(p => p.kind !== "or-zarua").map(p => `${p.start}|${p.end}`));
    const deduped = [...new Map(plans.filter(p => p.kind !== "or-zarua" || !windows.has(`${p.start}|${p.end}`)).map(p => [p.id, p])).values()].sort((a, b) => a.start.localeCompare(b.start));
    return { plans: deduped, reviews, latestFlow, hefsek: validHefsek?.e, earliestHefsek, cleanDay, phase, immersionDate, checks, version: ENGINE_VERSION };
  }

  /* ---------- גיבוי מוצפן וייצוא ---------- */
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function passwordKey(password, salt) {
    const seed = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, seed, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function encryptBackup(value, password) {
    if (!globalThis.crypto?.subtle) throw new Error("הדפדפן הזה אינו תומך בהצפנה. פתחי את היומן בכתובת מאובטחת (https).");
    if (password.length < 10) throw new Error("סיסמת הגיבוי צריכה להכיל לפחות 10 תווים");
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await passwordKey(password, salt);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(value)));
    return JSON.stringify({ format: "maayan-encrypted-v1", kdf: "PBKDF2-SHA256", iterations: 310000, salt: b64(salt), iv: b64(iv), ciphertext: b64(new Uint8Array(encrypted)) });
  }
  async function decryptBackup(data, password) {
    if (!globalThis.crypto?.subtle) throw new Error("הדפדפן הזה אינו תומך בהצפנה.");
    let x; try { x = JSON.parse(data); } catch { throw new Error("קובץ הגיבוי אינו בפורמט נתמך"); }
    if (x.format !== "maayan-encrypted-v1" || x.iterations !== 310000 || typeof x.salt !== "string" || typeof x.iv !== "string" || typeof x.ciphertext !== "string") throw new Error("קובץ הגיבוי אינו בפורמט נתמך");
    const salt = unb64(x.salt), iv = unb64(x.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error("קובץ גיבוי פגום");
    const key = await passwordKey(password, salt);
    try { return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, unb64(x.ciphertext)))); }
    catch { throw new Error("סיסמה שגויה או קובץ גיבוי פגום"); }
  }
  const escapeICS = s => s.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const utc = s => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  function foldICS(line) {
    const out = []; let part = "", size = 0;
    for (const ch of line) { const n = enc.encode(ch).length; if (size + n > 73) { out.push(part); part = " "; size = 1; } part += ch; size += n; }
    out.push(part); return out.join("\r\n");
  }
  function calendarExport(plans, neutral = true, now = new Date()) {
    const rows = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Maayan//Personal Calendar//HE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    for (const p of plans.filter(x => !x.done && new Date(x.start) >= now).slice(0, 250)) {
      const summary = escapeICS(neutral ? "תזכורת אישית" : p.title);
      rows.push("BEGIN:VEVENT", `UID:${p.id}@maayan.local`, `DTSTAMP:${utc(now.toISOString())}`, `DTSTART:${utc(p.start)}`,
        `DTEND:${utc(p.end ?? new Date(new Date(p.start).valueOf() + 30 * 60000).toISOString())}`, `SUMMARY:${summary}`,
        `DESCRIPTION:${escapeICS(neutral ? "פרטים ביומן האישי. מועד לתכנון בלבד." : `${p.reason}\n${p.source}`)}`,
        "CLASS:PRIVATE", "TRANSP:TRANSPARENT", "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:${summary}`, "END:VALARM", "END:VEVENT");
    }
    rows.push("END:VCALENDAR");
    return rows.map(foldICS).join("\r\n") + "\r\n";
  }
  const SETTING_LABELS = {
    wait: { five: "חמישה ימים מתחילת הנידה", "four-from-relations": "ארבעה ימים ממועד היחסים" },
    haflagah: { days: "ימים בין תחילות הווסתות", "chabad-onot": "עונות מהפסק טהרה (חב״ד)" },
    beinonit: { same: "אותה עונה", both: "שתי העונות" },
    missingMonthly: { skip: "דילוג", "first-next-month": "א׳ בחודש שאחריו" },
    bedikot: { twice: "בוקר וערב בכל יום", "first-last": "ראשון ושביעי" },
    special: { regular: "מחזור רגיל", pregnancy: "היריון", postpartum: "אחרי לידה", nursing: "הנקה", hormonal: "טיפול הורמונלי" },
  };
  const yesNo = b => b ? "כן" : "לא";
  function settingsSummary(s) {
    return [
      `מקום: ${city(s.cityId).name}`, `המתנה: ${SETTING_LABELS.wait[s.wait]}`, `הפלגה: ${SETTING_LABELS.haflagah[s.haflagah]}`,
      `עונה בינונית: ${SETTING_LABELS.beinonit[s.beinonit]}`, `יום 31: ${yesNo(s.day31)}`, `אור זרוע: ${yesNo(s.orZarua)}`,
      `שימור הפלגות ארוכות: ${yesNo(s.carryLongIntervals)}`, `שימור עונת חודש בזמן דימום: ${yesNo(s.carryMonthly)}`,
      `יום ל׳ בחודש חסר: ${SETTING_LABELS.missingMonthly[s.missingMonthly]}`, `בדיקות: ${SETTING_LABELS.bedikot[s.bedikot]}`,
      `צאת הכוכבים: ${s.nightfall}°`, `מצב: ${SETTING_LABELS.special[s.special]}`, `הערת שיטה: ${s.methodNote || "לא נרשמה"}`,
    ];
  }
  const RESULT_NAMES = { clear: "נקייה", uncertain: "ממתינה לבירור", bleeding: "לא נקייה" };
  function eventLine(e) {
    let h = "זמן לבירור";
    try { const s = stamp(e); h = `${s.hebrewDate} · ${s.onah === "day" ? "יום" : "לילה"}${s.uncertain ? " · סמוך לגבול עונה" : ""}`; } catch { /* נשאר לבירור */ }
    const extra = ["hefsek", "bedikah", "question"].includes(e.type) ? ` | ${RESULT_NAMES[e.result]}` : "";
    return `${e.date} ${e.time} | ${h} | ${city(e.cityId).name} | ${EVENT_NAMES[e.type]}${extra}${e.onah ? ` | עונת ${e.onah === "day" ? "יום" : "לילה"}` : ""}${e.note ? `\n   הערה: ${e.note}` : ""}${e.authorityNote ? `\n   הוראה שנרשמה: ${e.authorityNote}` : ""}`;
  }
  function planLine(p) {
    const c = city(p.cityId), hdate = hebrew(p.onah === "day" ? p.date : addDays(p.date, 1));
    const onah = p.onah === "day" ? "עונת יום" : p.onah === "night" ? "עונת לילה" : "ערב";
    return `${hdate} (${p.date}) · ${onah} · ${p.title} · מ-${timeInZone(new Date(p.start), c.tz)}${p.end ? ` עד ${timeInZone(new Date(p.end), c.tz)}` : ""} · ${c.name}${p.done ? " · נרשם" : ""}`;
  }
  function reportExport(state, now = new Date(), result = calculate(state, now)) {
    return ["מעיין — סיכום אישי לבירור", `נוצר: ${now.toISOString()} · גרסת מנוע ${ENGINE_VERSION}`, "מנוע החישובים טרם קיבל אישור הלכתי. רישומים אינם אישור שהספירה או הטבילה תקפות.", "",
      "הגדרות:", ...settingsSummary(state.settings).map(x => "  " + x), "",
      `רישומים (${state.events.length}):`, ...sorted(state.events).map(e => "• " + eventLine(e)), "",
      `מועדים מחושבים (${result.plans.length}):`, ...result.plans.map(p => "• " + planLine(p)), "",
      `נקודות לבירור (${result.reviews.length}):`, ...result.reviews.map(r => `• ${r.title} — ${r.detail}`),
    ].join("\n");
  }

  /* ---------- נתוני דוגמה ---------- */
  function demoState(now = new Date()) {
    const s = emptyState(), d = today("netanya", now);
    const ev = (type, offset, time, note = "") => ({ id: uuid(), type, date: addDays(d, offset), time, cityId: "netanya", result: "clear", note, authorityNote: "", createdAt: now.toISOString() });
    s.events = [ev("flow", -39, "11:20"), ev("hefsek", -35, "15:50"), ev("bedikah", -34, "09:00"), ev("bedikah", -28, "09:00"), ev("mikvah", -28, "21:00"), ev("flow", -10, "11:20"), ev("hefsek", -5, "15:50"), ...[-4, -3, -2, -1].map(n => ev("bedikah", n, "09:00"))];
    return s;
  }

  return {
    HDate, isLeapYear, daysInMonth, monthsInYear, gematriya, hebrew2abs, abs2hebrew,
    CITIES, city, EVENT_TYPES, EVENT_NAMES, CHECKLIST, SETTING_DEFAULTS, SETTING_LABELS, RESULT_NAMES, uuid, validISO, parseState, safeParse, emptyState, ValidationError,
    fromISO, toISO, addDays, hd, fromAbs, hebrew, dayNumber, isoAbs, civilLabel, dateInZone, timeInZone, localInstant, sun, atLocation, stamp, onahWindow, today, currentContext,
    ENGINE_VERSION, SOURCES, calculate, sorted,
    encryptBackup, decryptBackup, calendarExport, reportExport, settingsSummary, eventLine, planLine, demoState,
  };
})();
if (typeof module !== "undefined") module.exports = Maayan;
