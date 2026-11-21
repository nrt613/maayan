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

  /* שפת התצוגה של תאריכים עבריים ולועזיים. 0 = אדר א׳ בשנה מעוברת */
  let LANG = "he";
  const LOCALES = { he: "he-IL", en: "en-GB", fr: "fr-FR", es: "es-ES" };
  const MONTH_TR = {
    en: { 0: "Adar I", 1: "Nisan", 2: "Iyar", 3: "Sivan", 4: "Tammuz", 5: "Av", 6: "Elul", 7: "Tishrei", 8: "Cheshvan", 9: "Kislev", 10: "Tevet", 11: "Shevat", 12: "Adar", 13: "Adar II" },
    fr: { 0: "Adar I", 1: "Nissan", 2: "Iyar", 3: "Sivan", 4: "Tamouz", 5: "Av", 6: "Eloul", 7: "Tichri", 8: "'Hechvan", 9: "Kislev", 10: "Tévet", 11: "Chevat", 12: "Adar", 13: "Adar II" },
    es: { 0: "Adar I", 1: "Nisán", 2: "Iyar", 3: "Siván", 4: "Tamuz", 5: "Av", 6: "Elul", 7: "Tishrei", 8: "Jeshván", 9: "Kislev", 10: "Tevet", 11: "Shevat", 12: "Adar", 13: "Adar II" },
  };
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
    monthName() { return LANG === "he" ? monthName(this.mm, this.yy) : MONTH_TR[LANG][this.mm === ADAR_I && isLeapYear(this.yy) ? 0 : this.mm]; }
    monthTitle() { return LANG === "he" ? `${monthName(this.mm, this.yy)} ${gematriya(this.yy % 1000)}` : `${this.monthName()} ${this.yy}`; }
    renderGematriya() { return LANG === "he" ? `${gematriya(this.dd)} ${monthName(this.mm, this.yy)} ${gematriya(this.yy % 1000)}` : `${this.dd} ${this.monthName()} ${this.yy}`; }
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
  /* מקומות שהמשתמשת הוסיפה (זיהוי מיקום). נטענים מהיומן לפני כל חישוב. */
  let customPlaces = [];
  const setPlaces = list => { customPlaces = Array.isArray(list) ? list : []; };
  const city = id => CITIES.find(c => c.id === id) || customPlaces.find(c => c.id === id) || CITIES[0];
  const validTZ = tz => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return typeof tz === "string" && tz.length < 60; } catch { return false; } };
  const EVENT_TYPES = ["flow", "hefsek", "bedikah", "mikvah", "question", "restart", "note", "intimacy", "manual"];
  const EVENT_NAMES = {
    flow: "תחילת וסת", hefsek: "הפסק טהרה", bedikah: "בדיקה", mikvah: "טבילה", question: "שאלה לבירור",
    restart: "חידוש ספירה לפי הוראה", note: "הערה אישית", intimacy: "בסיס להמתנת ארבעה ימים", manual: "עונת פרישה לפי הוראה",
  };
  const CHECKLIST = ["תיאום עם המקווה", "הסרת תכשיטים וחציצות", "טיפול בציפורניים", "רחצה וחפיפה", "סירוק השיער", "בדיקה שאין חציצות", "מגבת ובגדים נקיים", "פריטים אישיים לדרך"];
  const SETTING_DEFAULTS = {
    cityId: "netanya", wait: "five", haflagah: "days", beinonit: "same", day31: false, orZarua: false, carryMonthly: false,
    carryLongIntervals: false, missingMonthly: "first-next-month", bedikot: "twice", nightfall: "8.5", special: "regular", methodNote: "",
    method: "custom", beinHashmashot: "both", hefsekTwilight: "before-sunset",
    neutralReminders: true, reminderMinutes: 30, morningTime: "08:00", remindersEnabled: true, checklist: [],
  };
  const SETTING_ENUMS = {
    wait: ["five", "four", "four-from-relations"], method: ["custom", "ashkenaz", "ashkenaz-kreiti", "sefard", "sefard-bic", "chabad"], beinHashmashot: ["both", "flag"], hefsekTwilight: ["before-sunset", "ovadia"], haflagah: ["days", "chabad-onot"], beinonit: ["same", "both"], missingMonthly: ["skip", "first-next-month"],
    bedikot: ["twice", "first-last"], nightfall: ["8.5", "7.083", "13.5z", "18m", "20m"], special: ["regular", "pregnancy", "postpartum", "nursing", "hormonal"],
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
    const list = (v, msg) => { if (v === undefined || v === null) return []; if (!Array.isArray(v)) fail(msg); return v; };
    const raw = input.settings && typeof input.settings === "object" && !Array.isArray(input.settings) ? input.settings : {};
    // ערך null ביומן ישן מתפרש כחסר; מספרים שנשמרו כמחרוזת (או להפך) מנורמלים לפני הבדיקה
    const s = { ...SETTING_DEFAULTS, checklist: [], ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null && v !== undefined)) };
    if (typeof s.nightfall === "number") s.nightfall = String(s.nightfall);
    if (typeof s.reminderMinutes === "string" && /^\d{1,3}$/.test(s.reminderMinutes)) s.reminderMinutes = Number(s.reminderMinutes);
    if (Array.isArray(s.checklist)) s.checklist = [...s.checklist];
    const places = list(input.places, "מקום שמור לא תקין").map(p => {
      if (!p || !/^gps-[0-9a-f]{8}$/.test(p.id) || typeof p.name !== "string" || !p.name.trim() || p.name.length > 60) fail("מקום שמור לא תקין");
      if (typeof p.lat !== "number" || typeof p.lon !== "number" || !(Math.abs(p.lat) <= 90) || !(Math.abs(p.lon) <= 180) || !validTZ(p.tz)) fail("מקום שמור לא תקין");
      return { id: p.id, name: p.name.trim(), lat: p.lat, lon: p.lon, tz: p.tz };
    });
    if (places.length > 30 || new Set(places.map(p => p.id)).size !== places.length) fail("יותר מדי מקומות שמורים");
    const known = id => CITIES.some(c => c.id === id) || places.some(c => c.id === id);
    if (!known(s.cityId)) fail("עיר לא מוכרת בהגדרות");
    for (const [k, vals] of Object.entries(SETTING_ENUMS)) if (!vals.includes(s[k])) fail(`ערך לא תקין בהגדרה ${k}`);
    for (const k of ["day31", "orZarua", "carryMonthly", "carryLongIntervals", "neutralReminders", "remindersEnabled"]) if (typeof s[k] !== "boolean") fail(`ערך לא תקין בהגדרה ${k}`);
    if (typeof s.methodNote !== "string" || s.methodNote.length > 1000) fail("הערת השיטה ארוכה מדי");
    if (!Number.isInteger(s.reminderMinutes) || s.reminderMinutes < 5 || s.reminderMinutes > 120) fail("דקות התזכורת צריכות להיות בין 5 ל-120");
    if (!TIME_RE.test(s.morningTime)) fail("שעת הבוקר אינה תקינה");
    if (!Array.isArray(s.checklist) || s.checklist.length > 40 || s.checklist.some(x => typeof x !== "string" || x.length > 80)) fail("רשימת ההכנה אינה תקינה");
    const events = list(input.events, "רשימת הרישומים אינה תקינה").map(e => {
      if (!e || typeof e !== "object") fail("רישום לא תקין");
      const x = { result: "clear", note: "", authorityNote: "", ...Object.fromEntries(Object.entries(e).filter(([, v]) => v !== null)) };
      if (!UUID_RE.test(x.id)) fail("מזהה רישום לא תקין");
      if (!EVENT_TYPES.includes(x.type)) fail("סוג רישום לא מוכר");
      if (!validISO(x.date)) fail("תאריך לא תקין או מחוץ לטווח 2000–2100");
      if (!TIME_RE.test(x.time)) fail("שעה לא תקינה");
      if (!known(x.cityId)) fail("מקום לא מוכר");
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
    const trips = list(input.trips, "נסיעה לא תקינה").map(t => {
      if (!t || typeof t !== "object" || !UUID_RE.test(t.id) || !validISO(t.from) || !validISO(t.to) || !known(t.cityId)) fail("נסיעה לא תקינה");
      if (t.to < t.from) fail("סיום הנסיעה חייב להיות אחרי תחילתה");
      return { id: t.id, from: t.from, to: t.to, cityId: t.cityId };
    });
    if (trips.length > 100) fail("יותר מדי נסיעות");
    for (let i = 0; i < trips.length; i++) for (let j = i + 1; j < trips.length; j++)
      if (trips[i].from <= trips[j].to && trips[j].from <= trips[i].to) fail("טווחי נסיעות חופפים");
    setPlaces(places);
    return { schemaVersion: 1, settings: s, events, trips, places };
  }
  const safeParse = input => { try { return { success: true, data: parseState(input) }; } catch (e) { return { success: false, error: e }; } };
  const emptyState = () => ({ schemaVersion: 1, settings: { ...SETTING_DEFAULTS, checklist: [] }, events: [], trips: [], places: [] });

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
    const k = LANG + (short ? "s" : "l");
    if (!civilFmt.has(k)) civilFmt.set(k, new Intl.DateTimeFormat(LOCALES[LANG], { day: "numeric", month: short ? "short" : "long", year: short ? undefined : "numeric", timeZone: "UTC" }));
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
  // זיכרון: פונקציה טהורה של תאריך, שעה ואזור זמן, והחלק הכבד בכל חישוב (Intl). מחזירים תמיד אובייקט Date חדש.
  const instantCache = new Map();
  function localInstant(date, time, tz) {
    const key = `${date}|${time}|${tz}`;
    let hit = instantCache.get(key);
    if (hit === undefined) {
      try { hit = localInstantRaw(date, time, tz); } catch (e) { hit = { error: e.message }; }
      if (instantCache.size > 20000) instantCache.clear();
      instantCache.set(key, hit);
    }
    if (typeof hit === "number") return new Date(hit);
    throw new Error(hit.error);
  }
  function localInstantRaw(date, time, tz) {
    const target = [...date.split("-").map(Number), ...time.split(":").map(Number)];
    const naive = Date.UTC(target[0], target[1] - 1, target[2], target[3], target[4]);
    const offsets = new Set();
    for (const n of [-24, -12, 0, 12, 24]) {
      const sample = naive + n * 3600000, p = localParts(sample, tz);
      offsets.add(Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4]) - sample);
    }
    const matches = [...offsets].map(o => naive - o).filter(ms => localParts(ms, tz).every((n, i) => n === target[i]));
    if (matches.length !== 1) throw new Error(matches.length ? "השעה מופיעה פעמיים במעבר שעון; נדרש בירור" : "השעה אינה קיימת במעבר שעון");
    return matches[0];
  }
  const sunCache = new Map();
  /* הגדרת צאת הכוכבים: מספר = מעלות מתחת לאופק; "18m" = דקות קבועות אחרי השקיעה; "13.5z" = דקות זמניות
   * (שעה זמנית = 1/12 מהזריחה עד השקיעה), כשיטת הגאונים שנוהגים בה לפי הרב עובדיה יוסף. */
  const NIGHTFALL_RE = /^(\d+(?:\.\d+)?)(m|z)?$/;
  const nightfallSpec = v => { const m = NIGHTFALL_RE.exec(String(v)); return m ? { n: Number(m[1]), kind: m[2] || "deg" } : { n: 8.5, kind: "deg" }; };
  function nightfallLabel(v) {
    const { n, kind } = nightfallSpec(v);
    return kind === "deg" ? `${n}°` : kind === "m" ? `${n} דקות אחרי השקיעה` : `${n} דקות זמניות אחרי השקיעה`;
  }
  function calculateSun(date, c, degrees) {
    const [y, m, d] = date.split("-").map(Number), base = Date.UTC(y, m - 1, d);
    // sunEventUTC מחשב סביב הצהריים השמשי של היום ב-UTC. כשאזור הזמן רחוק מקו האורך ביותר מחצי יממה
    // (סמואה, טונגה, קיריבטי) זה יוצא היום המקומי הסמוך, ולכן מזיזים ביום שלם כדי לקבל את הזמנים של התאריך המקומי.
    let shift = 0;
    if (c.tz) {
      try {
        const noon = base + 12 * 3600000, p = localParts(noon, c.tz), offset = (Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4]) - noon) / 60000;
        if (Number.isFinite(offset)) shift = Math.round((4 * c.lon - offset) / 1440);
      } catch { shift = 0; }
    }
    const at = (zenith, rising) => { const t = sunEventUTC(y, m, d + shift, c.lat, c.lon, zenith, rising); return t === null ? null : new Date(base + Math.round((t + shift * 1440) * 60000)); };
    // עיגול לדקה לחומרא, כמו בלוחות: שקיעה כלפי מטה (מוקדם), צאת הכוכבים כלפי מעלה (מאוחר),
    // וזריחה כלפי מעלה (סוף עונת הלילה מאוחר, ולא מוצג דקה מוקדם מדי כשהתצוגה קוטעת את השניות).
    // לפני העיגול החישוב תואם את "שקיעה במישור" של עיתים לבינה בטווח של שניות.
    const floorMin = t => t && new Date(Math.floor(t.valueOf() / 60000) * 60000), ceilMin = t => t && new Date(Math.ceil(t.valueOf() / 60000) * 60000);
    const sunrise = at(90.833, true), rawSunset = at(90.833, false), spec = nightfallSpec(degrees);
    let nightfall;
    if (spec.kind === "deg") nightfall = at(90 + spec.n, false);
    else if (!rawSunset) nightfall = null;
    else if (spec.kind === "m") nightfall = new Date(rawSunset.valueOf() + spec.n * 60000);
    else nightfall = sunrise ? new Date(rawSunset.valueOf() + spec.n * (rawSunset - sunrise) / 720) : null;
    return { sunrise: ceilMin(sunrise), sunset: floorMin(rawSunset), nightfall: ceilMin(nightfall), dawn: at(106.1, true) };
  }
  function sun(date, c, degrees = 8.5) {
    if (typeof degrees === "string" && /^\d+(\.\d+)?$/.test(degrees)) degrees = Number(degrees);
    const key = `${date}:${c.id}:${degrees}`;
    let s = sunCache.get(key);
    if (!s) { s = calculateSun(date, c, degrees); if (sunCache.size > 4000) sunCache.clear(); sunCache.set(key, s); }
    return s;
  }
  function atLocation(state, date) {
    const trip = state.trips.find(t => t.from <= date && t.to >= date);
    return city(trip ? trip.cityId : state.settings.cityId);
  }
  const NO_SUN = "אין זריחה או שקיעה בתאריך ובמיקום הזה; נדרשת הוראה אישית";
  /** היום העברי של רגע נתון. בקווי רוחב גבוהים השקיעה יכולה להיות אחרי חצות, ואז רגע שלפני הזריחה
   *  עדיין שייך ליום של התאריך האזרחי הקודם. מחזיר את זמני השמש של היום שהרגע שייך אליו. */
  function locateDayNF(instant, date, c, nf) {
    const s = sun(date, c, nf);
    if (!s.sunrise || !s.sunset) return null;
    if (instant >= s.sunset) return { abs: isoAbs(date) + 1, night: true, s, prev: null };
    if (instant >= s.sunrise) return { abs: isoAbs(date), night: false, s, prev: null };
    const prev = sun(addDays(date, -1), c, nf);
    if (!prev.sunset) return null; // אתמול לא הייתה שקיעה (יום קוטבי): גבול היום אינו מוגדר
    if (instant < prev.sunset) return { abs: isoAbs(date) - 1, night: false, s: prev, prev: null };
    return { abs: isoAbs(date), night: true, s, prev };
  }
  /** שיוך רישום ליום עברי ולעונה. nightfall קובע את סוף בין השמשות (ברירת מחדל 8.5°).
   *  כשהרגע סמוך לגבול (שלוש דקות מזריחה או משקיעה) או בין השקיעה לצאת הכוכבים, `alt` הוא השיוך האפשרי השני
   *  (העונה הסמוכה), ו-`twilight` מסמן בין השמשות ממש. */
  function stamp(e, nightfall = 8.5) {
    const c = city(e.cityId), instant = localInstant(e.date, e.time, c.tz), loc = locateDayNF(instant, e.date, c, nightfall);
    if (!loc) throw new Error(NO_SUN);
    const { abs, night, s, prev } = loc;
    // מרווח של שלוש דקות הוא סימון לבירור, לא הגדרה של בין השמשות
    const near = t => !!t && Math.abs(instant - t) <= 3 * 60000;
    const dusk = x => !!x && !!x.sunset && instant >= x.sunset && (!x.nightfall || instant < x.nightfall);
    const mk = (a, o) => ({ abs: a, onah: o, ordinal: 2 * a + (o === "night" ? 0 : 1) });
    let alt = null, twilight = false;
    if (night && instant >= s.sunset) { twilight = dusk(s); if (twilight || near(s.sunset)) alt = mk(abs - 1, "day"); }
    else if (!night) { if (near(s.sunset)) alt = mk(abs + 1, "night"); else if (near(s.sunrise)) alt = mk(abs, "night"); }
    else if (near(s.sunrise)) alt = mk(abs, "day");
    else if (prev) { twilight = dusk(prev); if (twilight || near(prev.sunset)) alt = mk(abs - 1, "day"); }
    return { abs, onah: night ? "night" : "day", ordinal: 2 * abs + (night ? 0 : 1), instant, hebrewDate: new HDate(abs).renderGematriya(), uncertain: !!alt, alt, twilight, sun: s };
  }
  function onahWindow(abs, onah, c, degrees = 8.5) {
    const date = fromAbs(abs), s = sun(date, c, degrees), prior = sun(addDays(date, -1), c, degrees);
    return { start: onah === "day" ? s.sunrise : prior.sunset, end: onah === "day" ? s.sunset : s.sunrise, date: onah === "day" ? date : addDays(date, -1) };
  }
  /** שבת, יום טוב וצומות שבהם חל יום עברי (abs לפי התאריך האזרחי של שעות היום). יום טוב שני רק בחו״ל. */
  function holyDayKinds(abs, israel) {
    const h = new HDate(abs), m = h.getMonth(), d = h.getDate(), is = list => list.some(([mm, dd]) => mm === m && dd === d), out = [];
    if (abs % 7 === 6) out.push("shabbat");
    if (is([[NISAN, 15], [NISAN, 21], [SIVAN, 6], [TISHREI, 1], [TISHREI, 2], [TISHREI, 15], [TISHREI, 22]]) || (!israel && is([[NISAN, 16], [NISAN, 22], [SIVAN, 7], [TISHREI, 16], [TISHREI, 23]]))) out.push("yomtov");
    if (m === TISHREI && d === 10) out.push("yomkippur");
    if (m === AV && ((d === 9 && abs % 7 !== 6) || (d === 10 && (abs - 1) % 7 === 6))) out.push("tishabav");
    return out;
  }
  const today = (cityId = "netanya", now = new Date()) => dateInZone(now, city(cityId).tz);
  function currentContext(state, now = new Date()) {
    const trip = state.trips.find(t => { const d = dateInZone(now, city(t.cityId).tz); return t.from <= d && d <= t.to; });
    const c = city(trip ? trip.cityId : state.settings.cityId), date = dateInZone(now, c.tz), s = sun(date, c, state.settings.nightfall);
    let abs = isoAbs(s.sunset && now >= s.sunset ? addDays(date, 1) : date);
    // שקיעה של אתמול שחלה אחרי חצות (קווי רוחב גבוהים): עד אליה עדיין היום של אתמול
    if (!(s.sunset && now >= s.sunset) && !(s.sunrise && now >= s.sunrise)) { const p = sun(addDays(date, -1), c, state.settings.nightfall); if (p.sunset && now < p.sunset) abs -= 1; }
    return { city: c, date, abs, time: timeInZone(now, c.tz), hebrewDate: new HDate(abs).renderGematriya(), afterSunset: !!(s.sunset && now >= s.sunset) };
  }

  /* ---------- מנוע ---------- */
  const ENGINE_VERSION = "0.4.0-review";
  /* ---------- מקורות ----------
   * כל מקור הוא מקום בטקסט הראשוני, לא אתר. ref הוא מקום הטקסט בספריא: הציטוט q נבדק מול הטקסט שם.
   * מקור בלי ref לא נבדק מול לשון הספר (הספר אינו בספריא, או שהמקום המדויק לא אומת) — לבדיקת הרב. */
  const C = (t, ref, q) => ({ t, ref: ref || "", q: q || "", ok: !!ref });
  const CITES = {
    sa184_2: C("שולחן ערוך יורה דעה קפד, ב", "Shulchan_Arukh,_Yoreh_De'ah.184.2", "אם הוא ביום פורש ממנה אותו היום כולו אפי' אם הוסת בסופו ומותר מיד בלילה שלאחריו"),
    sa184_4: C("שולחן ערוך יורה דעה קפד, ד", "Shulchan_Arukh,_Yoreh_De'ah.184.4", "אם רגילה לראות בהנץ החמה ולא קים לן שפיר אי קודם הנץ החמה או אחריו אינה אסורה אלא ביום"),
    shach184_7: C("ש״ך יורה דעה קפד, ס״ק ז", "Siftei_Kohen_on_Shulchan_Arukh,_Yoreh_De'ah.184.7", "ובא\"ז כתב וז\"ל פורש אדם מאשתו סמוך לווסתה כ\"ד שעות אם רגילה לראות ביום פורש ממנה כל אותו יום והלילה שלפניו"),
    taz184_2: C("ט״ז יורה דעה קפד, ס״ק ב", "Turei_Zahav_on_Shulchan_Arukh,_Yoreh_De'ah.184.2", "ותמוה הוא להחמיר על מה שמפורש בתלמוד לקולא"),
    shach184_13: C("ש״ך יורה דעה קפד, ס״ק יג", "Siftei_Kohen_on_Shulchan_Arukh,_Yoreh_De'ah.184.13", "אם רגילה לראות בין השמשות ולא קים לן אי קודם או לאחר הלילה אינה אסורה אלא בלילה"),
    shach184_14: C("ש״ך יורה דעה קפד, ס״ק יד (בשם הב״ח)", "Siftei_Kohen_on_Shulchan_Arukh,_Yoreh_De'ah.184.14", "והב\"ח כתב דראוי להחמיר מכח ספק לאסור ביום ובלילה"),
    sahr184_12: C("שולחן ערוך הרב יורה דעה קפד, ס״ק יב", "Shulchan_Arukh_HaRav,_Yoreh_Deah.184.12", "הלילה. עד הנץ החמה"),
    sahr184_19: C("שולחן ערוך הרב יורה דעה קפד, ס״ק יט", "Shulchan_Arukh_HaRav,_Yoreh_Deah.184.19", "אם רגילה לראות בין השמשות אינה אסורה אלא בלילה (ש\"ך). והב\"ח כתב על פסק הש\"ע אף על גב דכך הלכה מכל מקום באיסור כרת ראוי להחמיר"),
    sa189_1: C("שולחן ערוך יורה דעה קפט, א", "Shulchan_Arukh,_Yoreh_De'ah.189.1", "כל אשה שאין לה וסת קבוע חוששת ליום ל' לראייתה שהיא עונה בינונית לסתם נשים"),
    sa189_2: C("שולחן ערוך יורה דעה קפט, ב", "Shulchan_Arukh,_Yoreh_De'ah.189.2", "מיד אחר שראתה פעם אחת ליום ידוע לחדש כגון כ\"א או כ\"ה בו חוששת לפעם אחרת לזה היום ואסורה לשמש כל אותה העונה"),
    sa189_2h: C("שולחן ערוך יורה דעה קפט, ב", "Shulchan_Arukh,_Yoreh_De'ah.189.2", "ואפי' קודם שקבעתו שלש פעמים חוששת שמיד אחר שראתה פעם אחת לסוף כ' חוששת מכאן ואילך כשיגיע כ'"),
    sa189_2k: C("שולחן ערוך יורה דעה קפט, ב", "Shulchan_Arukh,_Yoreh_De'ah.189.2", "כגון שתראה ד' פעמים וביניהם ג' זמנים שוין"),
    sa189_6: C("שולחן ערוך יורה דעה קפט, ו", "Shulchan_Arukh,_Yoreh_De'ah.189.6", "באחד בניסן ובאחד באייר ובאחד בסיון או בה' בניסן ובה' באייר ובה' בסיון קבעה לה וסת"),
    sa189_13: C("שולחן ערוך יורה דעה קפט, יג", "Shulchan_Arukh,_Yoreh_De'ah.189.13", "אין האשה קובעת לה וסת אפילו ראתה שלשה ר\"ח זה אחר זה אלא אם כן יהיו כולם בעונה אחת ביום או בלילה"),
    rema189_13: C("שולחן ערוך יורה דעה קפט, יג (רמ״א)", "Shulchan_Arukh,_Yoreh_De'ah.189.13", "ראתה בא' בניסן וכ' בו חוששת לאחד באייר מפני ר\"ח ניסן ראתה בא' באייר או לא ראתה בו חוששת לט' באייר שהוא יום כ' מראיית יום כ' שראתה"),
    shach189_30: C("ש״ך יורה דעה קפט, ס״ק ל", "Siftei_Kohen_on_Shulchan_Arukh,_Yoreh_De'ah.189.30", "אלמא דא\"צ לחוש אלא ליום ל\"א"),
    sahr189_1: C("שולחן ערוך הרב יורה דעה קפט, ס״ק א", "Shulchan_Arukh_HaRav,_Yoreh_Deah.189.1", "ול' יום אלו הם מתחילת ראיה לתחלת ראיה וב' ימי הראיות בכלל הל' (ב\"י ב\"ח פרישה לבוש של\"ה ט\"ז חכם צבי דלא כש\"ך)"),
    sahr189_1f: C("שולחן ערוך הרב יורה דעה קפט, ס״ק א", "Shulchan_Arukh_HaRav,_Yoreh_Deah.189.1", "חוששת ליום ל' לפרוש מבעלה מתחלת הלילה (של\"ה) עד סוף היום אפילו ראתה עכשיו בלילה (כרתי פלתי"),
    sahr189_1d: C("שולחן ערוך הרב יורה דעה קפט, ס״ק א", "Shulchan_Arukh_HaRav,_Yoreh_Deah.189.1", "ויש אומרים שעונה בינונית היא ביום ל\"א (רש\"י תוס' ש\"ך)"),
    sahr189_36: C("שולחן ערוך הרב יורה דעה קפט, ס״ק לו", "Shulchan_Arukh_HaRav,_Yoreh_Deah.189.36", "ואף בוסת ההפלגות מחשבין מעונה לעונה ולא מיום ליום"),
    sahr189_44: C("שולחן ערוך הרב יורה דעה קפט, ס״ק מד", "Shulchan_Arukh_HaRav,_Yoreh_Deah.189.44", "צריכה לחוש לכל ימי ההפלגות כי לא נעקרו במה שהקדימה לראות אלא עד שיבא יומן ולא תראה"),
    sahr189_44m: C("שולחן ערוך הרב יורה דעה קפט, ס״ק מד", "Shulchan_Arukh_HaRav,_Yoreh_Deah.189.44", "וכן חוששת היא לימי החדש של כל הראיות"),
    sa196_1: C("שולחן ערוך יורה דעה קצו, א", "Shulchan_Arukh,_Yoreh_De'ah.196.1", "בודקת ביום שפסקה כדי שתפסוק בטהרה  ובדיקה זו תהיה סמוך לבין השמשות"),
    sa196_1s: C("שולחן ערוך יורה דעה קצו, א", "Shulchan_Arukh,_Yoreh_De'ah.196.1", "שבעת ימים שהזבה סופרת מתחילין ממחרת יום שפסקה בו"),
    sa196_4: C("שולחן ערוך יורה דעה קצו, ד", "Shulchan_Arukh,_Yoreh_De'ah.196.4", "בודקת לכתחלה פעמים בכל יום אחת שחרית וא' סמוך לבין השמשות"),
    sa196_4f: C("שולחן ערוך יורה דעה קצו, ד", "Shulchan_Arukh,_Yoreh_De'ah.196.4", "וי\"א שצריך שתבדוק ביום ראשון מהשבעה  וביום השביעי ואין להקל"),
    sa196_11: C("שולחן ערוך יורה דעה קצו, יא", "Shulchan_Arukh,_Yoreh_De'ah.196.11", "לפיכך אינה מתחלת לספור עד יום ה' לשמושה"),
    rema196_11: C("שולחן ערוך יורה דעה קצו, יא (רמ״א)", "Shulchan_Arukh,_Yoreh_De'ah.196.11", "צריכה להמתין ה' ימים עם יום שראתה בו ותפסוק לעת ערב ותספור ז' נקיים"),
    rema197_2: C("שולחן ערוך יורה דעה קצז, ב (רמ״א)", "Shulchan_Arukh,_Yoreh_De'ah.197.2", "ומותרת לטבול ליל שבת"),
    sa197_3: C("שולחן ערוך יורה דעה קצז, ג", "Shulchan_Arukh,_Yoreh_De'ah.197.3", "אסורה לטבול ביום ז'"),
    oc554_8: C("שולחן ערוך אורח חיים תקנד, ח", "Shulchan_Arukh,_Orach_Chayim.554.8", "בזמן הזה אין טבילה בזמנה הילכך לא תטבול בו"),
    oc613_12: C("שולחן ערוך אורח חיים תריג, יב", "Shulchan_Arukh,_Orach_Chayim.613.12", "בזמן הזה אסור לאשה לטבול ביום הכפורים"),
    bic_tzav1: C("בן איש חי, שנה שנייה, פרשת צו, אות א", "Ben_Ish_Hai,_Halachot_2nd_Year,_Tzav.1", "ויש אומרים דעונה זו היא לפני העונה שהוסת בה, דהיינו, אם וסתה ביום, צריך לפרוש ממנה כל הלילה שלפניו"),
    bic_tzav1b: C("בן איש חי, שנה שנייה, פרשת צו, אות א", "Ben_Ish_Hai,_Halachot_2nd_Year,_Tzav.1", "ומרן ז\"ל סבירא לה כדעה הראשונה, אך צריך לחוש לדעה זו השניה"),
    bic_tzav7: C("בן איש חי, שנה שנייה, פרשת צו, אות ז", "Ben_Ish_Hai,_Halachot_2nd_Year,_Tzav.7", "ואינה יכולה למנות ז' נקיים ולטבול אלא דווקא אם עברו עליה ששה ימים מיום שראתה בו"),
    sa184_2o: C("שולחן ערוך יורה דעה קפד, ב", "Shulchan_Arukh,_Yoreh_De'ah.184.2", "בשעת וסתה צריך לפרוש ממנה עונה אחת"),
    shach184_7b: C("ש״ך יורה דעה קפד, ס״ק ז", "Siftei_Kohen_on_Shulchan_Arukh,_Yoreh_De'ah.184.7", "גם הב\"ח כתב שמשמע שהירא דבר ה' נוהג כהא\"ז"),
    shach184_15: C("ש״ך יורה דעה קפד, ס״ק טו", "Siftei_Kohen_on_Shulchan_Arukh,_Yoreh_De'ah.184.15", "דבתר תחלת הוסת אזלינן"),
    sa189_2u: C("שולחן ערוך יורה דעה קפט, ב", "Shulchan_Arukh,_Yoreh_De'ah.189.2", "ומיהו אע\"פ שחוששת לו נעקר בפעם אחת"),
    rema189_13t: C("שולחן ערוך יורה דעה קפט, יג (רמ״א)", "Shulchan_Arukh,_Yoreh_De'ah.189.13", "דהולכין תמיד אחר תחילת הראיה וכן עיקר"),
    sahr189_36x: C("שולחן ערוך הרב יורה דעה קפט, ס״ק לו", "Shulchan_Arukh_HaRav,_Yoreh_Deah.189.36", "שנמצאו מ' עונות מראיה לראיה עם עונות הראיות עצמן"),
    rema196_1: C("שולחן ערוך יורה דעה קצו, א (רמ״א)", "Shulchan_Arukh,_Yoreh_De'ah.196.1", "ונוהגין לכתחלה ליזהר ובדיעבד אין לחוש"),
    rema196_11b: C("שולחן ערוך יורה דעה קצו, יא (רמ״א)", "Shulchan_Arukh,_Yoreh_De'ah.196.11", "וכן נוהגין במדינות אלו ואין לשנות"),
    bic_tzav10: C("בן איש חי, שנה שנייה, פרשת צו, אות י", "Ben_Ish_Hai,_Halachot_2nd_Year,_Tzav.10", "ביום שישי לראייתה, או ביום שביעי להמחמירים"),
    bic_tzav11: C("בן איש חי, שנה שנייה, פרשת צו, אות יא", "Ben_Ish_Hai,_Halachot_2nd_Year,_Tzav.11", "זמן בדיקה זו של הפסק בטהרה, הוא חצי שעה קודם קריאת ה\"מגרב\""),
    // לא בספריא, או שהמקום המדויק לא אומת — לבדיקת הרב
    thbWait: C("טהרת הבית (הרב עובדיה יוסף), ארבעה ימים מתחילת הראייה — מקום מדויק לא אומת"),
    thbOrZarua: C("טהרת הבית, סימן ב (חלק לא צוין) — אור זרוע, יום 31 וכרתי ופלתי לספרדים"),
    thbHefsek: C("טהרת הבית ח״ב, עמ׳ רעח — הפסק עד 13.5 דקות זמניות אחרי השקיעה"),
    thbNightfall: C("טהרת הבית — צאת הכוכבים לשיטת הגאונים, מקום מדויק לא אומת"),
    igrotHefsek: C("אגרות משה יורה דעה ח״ד, סימן יז, אות כו — הפסק סמוך אחרי השקיעה"),
    chavot189: C("חוות דעת יורה דעה קפט, ס״ק יב — יום 31"),
    thkChabad: C("טהרה כהלכה (הרב יוסף ישעיה ברוין) — הפלגה בעונות מההפסק, מקום מדויק לא אומת"),
    missing30: C("ל׳ בחודש כשבחודש הבא אין ל׳ — מקור ראשוני לא אותר"),
    // מקור משני: סיכום הלכות נידה לרבנות. הדעות מובאות כפי שהן בסיכום, ולא נבדקו מול הספרים עצמם
    secCarryTaz: C("סיכום הלכות נידה לרבנות (משני) — רמ״א וט״ז: חוששת להפלגה הארוכה שלא נעקרה"),
    secCarryMajority: C("סיכום הלכות נידה לרבנות (משני) — ב״ח, ש״ך, סדרי טהרה, חוות דעת, רעק״א: ההפלגה הארוכה נעקרת מיד"),
    shach189_31: C("ש״ך יורה דעה קפט, ס״ק לא", "Siftei_Kohen_on_Shulchan_Arukh,_Yoreh_De'ah.189.31", "אבל באמת נראה עיקר דאם ראתה בא' באייר א\"צ לחוש לט' בו"),
    secBadei: C("סיכום הלכות נידה לרבנות (משני) — בדי השלחן: עונה בינונית מעת לעת, כדעת כרתי ופלתי"),
    secShevet3031: C("סיכום הלכות נידה לרבנות (משני) — שבט הלוי: לחומרא גם יום 30 וגם יום 31"),
    orZarua31: C("אור זרוע ליום 30 בלבד למי ששומרת 30 ו-31 — מקור ראשוני לא אותר"),
  };
  const SOURCES = {
    calendar: ["sa184_2", "sa184_4", "sahr184_12"], wait: ["rema196_11", "sa196_11"], hefsek: ["sa196_1"],
    clean: ["sa196_1s", "sa196_4"], mikvah: ["sa197_3", "rema197_2"], monthly: ["sa189_2", "sa189_13", "rema189_13", "sahr189_44m"],
    interval: ["sa189_2h", "rema189_13", "sahr189_44"], average: ["sa189_1", "sahr189_1"], fixed: ["sa189_2k", "sa189_6", "sa189_13"],
    chabad: ["sahr189_36", "thkChabad"], orZarua: ["shach184_7", "bic_tzav1"], bhs: ["shach184_13", "shach184_14"],
  };
  const cite = id => CITES[id] || null;
  const citeUrl = id => { const c = cite(id); return c && c.ref ? `https://www.sefaria.org/${c.ref}?lang=he` : ""; };
  /** שורת מקורות בטקסט פשוט (לקובץ יומן) */
  const citeText = ids => (ids || []).map(cite).filter(Boolean).map(c => c.t + (c.ok ? "" : " (לא אומת מול לשון הספר)")).join("; ");
  const sorted = events => [...events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.createdAt.localeCompare(b.createdAt));

  /** חישוב מחדש מלא מכל הרישומים. כל מועד מצטט את הרישומים ואת הכלל שעליהם הוא נשען. */
  function calculate(state, now = new Date()) {
    setPlaces(state.places);
    const plans = [], reviews = [], stamped = [], unresolvedStarts = [];
    const context = currentContext(state, now), date = context.date, currentAbs = context.abs;
    const nf = state.settings.nightfall, set = state.settings;
    // בין השמשות: "both" — לחומרא חוששים לשתי העונות; "flag" — משעים את החישוב ומסמנים לבירור
    const bhs = set.beinHashmashot !== "flag";
    const review = (id, title, detail, eventIds = []) => { if (!reviews.some(r => r.id === id)) reviews.push({ id, title, detail, eventIds }); };
    /* ליל טבילה בשבת, ביום טוב או בצום, ויום שביעי שחל בשבת או ביום טוב: מסומן לבירור, לא מוזז */
    const calendarReviews = (day7, c, id) => {
      const israel = c.tz === "Asia/Jerusalem", night = holyDayKinds(isoAbs(day7) + 1, israel), day = holyDayKinds(isoAbs(day7), israel);
      if (night.includes("yomkippur") || night.includes("tishabav")) review("mikvah-night-fast", "ליל הטבילה חל ביום הכיפורים או בתשעה באב", "בלילות אלה אין טובלים, והטבילה נדחית. יש לברר עם רב את המועד ואת סדר ההכנות.", [id]);
      if (night.includes("shabbat")) review("mikvah-night-shabbat", "ליל הטבילה חל בליל שבת", "ההכנות (רחצה, חפיפה, ציפורניים) נעשות לפני כניסת השבת, ויש הלכות מיוחדות לטבילה בשבת. יש לברר עם רב ועם המקווה.", [id]);
      if (night.includes("yomtov")) review("mikvah-night-yomtov", `ליל הטבילה חל ביום טוב${israel ? "" : " (כולל יום טוב שני של גלויות)"}`, "ההכנות נעשות לפני כניסת החג, ויש הלכות מיוחדות לטבילה ביום טוב. יש לברר עם רב ועם המקווה.", [id]);
      if (day.includes("shabbat")) review("mikvah-day-shabbat", "היום השביעי חל בשבת", "הטבילה במוצאי שבת: את ההכנות שאינן מותרות בשבת עושים ביום שישי או במוצאי שבת. יש לברר את סדר ההכנות.", [id]);
      if (day.some(k => k !== "shabbat")) review("mikvah-day-yomtov", "היום השביעי חל ביום טוב או בצום", "ההכנות לטבילה במוצאי היום מוגבלות ביום עצמו. יש לברר את סדר ההכנות עם רב.", [id]);
    };
    // חלון הבדיקה: מעלות השחר (ואם אין, מהזריחה) ועד השקיעה. רק הגבול של השקיעה מסופק לבדיקה;
    // בדיקה סמוך לזריחה היא ודאי אחרי עלות השחר, ולכן מרווח שלוש הדקות של הזריחה אינו חל עליה.
    const bedikahInDay = x => { const start = x.s.sun.dawn || x.s.sun.sunrise, ss = x.s.sun.sunset; return !!start && !!ss && x.s.instant >= start && x.s.instant < ss.valueOf() - 3 * 60000 && !x.s.twilight; };
    for (const e of sorted(state.events)) {
      try {
        const s = stamp(e, nf);
        if (s.instant > now && e.type !== "manual" && e.type !== "note") { review(`future-${e.id}`, "רישום עתידי", "אירוע שטרם התרחש אינו משמש כחישוב בפועל.", [e.id]); continue; }
        stamped.push({ e, s });
        if (s.uncertain && ["flow", "hefsek", "restart", "bedikah"].includes(e.type) && !(e.type === "bedikah" && bedikahInDay({ e, s }))) review(`boundary-${e.id}`, "רישום סמוך לגבול היום או העונה", bhs && e.type === "flow" ? "הראייה הייתה סמוך לשקיעה או לזריחה, או בין השקיעה לצאת הכוכבים. לחומרא חושבו מועדי הפרישה לשתי העונות, וההמתנה נספרת מהיום המאוחר. יש לברר." : "נשמרו השעה והמקום. שיוך האירוע דורש בירור, והוא לא משמש לבדו לחישוב ודאי.", [e.id]);
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
    const flows = bhs ? natural : natural.filter(x => !x.s.uncertain);
    /** כל השיוכים האפשריים של ראייה: העונה שנקבעה, ובבין השמשות גם העונה הסמוכה */
    const readings = x => [{ abs: x.s.abs, onah: x.s.onah, ordinal: x.s.ordinal }, ...(bhs && x.s.alt ? [x.s.alt] : [])];
    const lateAbs = x => Math.max(...readings(x).map(r => r.abs));
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
    if (state.settings.haflagah === "chabad-onot" && state.settings.beinonit === "same") review("chabad-beinonit", "בשיטת חב״ד העונה הבינונית היא יממה שלמה", "לפי שולחן ערוך הרב (יו״ד קפט, ס״ק א) פורשים ביום 30 מתחילת הלילה ועד סוף היום. בהגדרות נבחרה עונה אחת בלבד; כדי ליישר עם השיטה יש לבחור ״שתי העונות״.");
    if (state.settings.special !== "regular") review("special", "נבחר מצב המחייב התאמה אישית", "היריון, אחרי לידה, הנקה וטיפול הורמונלי אינם מחושבים כאן אוטומטית לפי כללי מחזור רגיל. אפשר לרשום מועדים ידניים לפי הוראה.");
    let earliestHefsek;
    if (!unresolvedActive && latestNiddah && (!latestMikvah || latestMikvah.s.instant < latestNiddah.s.instant)) {
      let baseAbs = lateAbs(latestNiddah);
      if (latestNiddah.e.type === "restart") {
        const prior = stamped.filter(x => x.e.type === "flow" && x.s.instant < latestNiddah.s.instant && (!latestMikvah || x.s.instant > latestMikvah.s.instant)).at(-1);
        if (prior) baseAbs = lateAbs(prior); else review("restart-without-history", "חסר בסיס לחידוש הספירה", "נרשם חידוש ספירה ללא וסת קודמת מתועדת. יש לברר את מועד ההפסק האפשרי.", [latestNiddah.e.id]);
      }
      // ספירה כוללנית: יום הראייה הוא יום 1. חמישה ימים — ההפסק ביום החמישי; ארבעה (הרב עובדיה) — ביום הרביעי
      if (state.settings.wait === "five") earliestHefsek = fromAbs(Math.max(baseAbs + 4, lateAbs(latestNiddah)));
      else if (state.settings.wait === "four") earliestHefsek = fromAbs(Math.max(baseAbs + 3, lateAbs(latestNiddah)));
      else {
        const relations = stamped.filter(x => x.e.type === "intimacy" && x.s.instant <= latestNiddah.s.instant).at(-1);
        if (relations && !relations.s.uncertain) earliestHefsek = fromAbs(Math.max(relations.s.abs + 3, latestNiddah.s.abs));
        else review("wait-base", "חסר מועד בסיס להמתנה", "נבחר חישוב ארבעה ימים ממועד היחסים. צריך לרשום את מועד הבסיס או לצרף הוראה אישית להפסק; אין הנחה אוטומטית של ארבעה ימים מתחילת הווסת.");
      }
      if ((latestNiddah.s.uncertain && !bhs) || latestNiddah.e.result === "uncertain") earliestHefsek = undefined;
    }
    const hefsekCandidates = unresolvedActive ? [] : stamped.filter(x => x.e.type === "hefsek" && x.e.result === "clear" && (!latestNiddah || x.s.instant > latestNiddah.s.instant) && (!latestMikvah || x.s.instant > latestMikvah.s.instant));
    let validHefsek;
    for (const raw of hefsekCandidates) {
      let h = raw, bedieved = false;
      // לפי הרב עובדיה יוסף (טהרת הבית): הפסק שנעשה אחרי השקיעה, עד 13.5 דקות זמניות, תקף בדיעבד ונחשב ליום שהסתיים.
      // היום שהסתיים נקבע לפי העונה: הפסק בלילה שייך לליל היום העברי הבא, ולכן היום שהסתיים הוא היום שלפניו.
      // רק הפסק סמוך לשקיעה או אחריה (ולא סמוך לזריחה) נכנס לכלל הזה.
      if (set.hefsekTwilight === "ovadia" && (raw.s.uncertain || raw.s.onah === "night")) {
        const dayAbs = raw.s.onah === "day" ? raw.s.abs : raw.s.abs - 1, c = city(raw.e.cityId), ds = sun(fromAbs(dayAbs), c, nf);
        const limit = sun(fromAbs(dayAbs), c, "13.5z").nightfall;
        if (ds.sunset && limit && raw.s.instant >= ds.sunset - 3 * 60000 && raw.s.instant < limit) { h = { e: raw.e, s: { ...raw.s, abs: dayAbs, onah: "day", ordinal: 2 * dayAbs + 1, uncertain: false, sun: ds } }; bedieved = true; }
      }
      // הפסק לכתחילה: בעונת היום של היום העברי שלו, לפני השקיעה ולא בזמן מסופק. הפסק בלילה (גם אחרי חצות) אינו לפני השקיעה של שום יום.
      const beforeSunset = bedieved || (h.s.onah === "day" && !!h.s.sun.sunset && h.s.instant < h.s.sun.sunset && !h.s.uncertain);
      if (!beforeSunset) { review(`hefsek-late-${h.e.id}`, "זמן ההפסק דורש בירור", "אין להתחיל ספירה אוטומטית מהפסק שנרשם אחרי השקיעה או בזמן מסופק.", [h.e.id]); continue; }
      if (!latestNiddah) { review(`hefsek-no-flow-${h.e.id}`, "חסר רישום תחילת התקופה", "נשמר ההפסק, אך חסרים נתוני הבסיס להמתנה. אפשר לתעד הוראה אישית.", [h.e.id]); if (!h.e.authorityNote) continue; }
      if ((!earliestHefsek || fromAbs(h.s.abs) < earliestHefsek) && !h.e.authorityNote) { review(`hefsek-early-${h.e.id}`, "הפסק לפני מועד ההמתנה המחושב", "המערכת אינה משנה את ההמתנה ללא תיעוד הוראה אישית.", [h.e.id]); continue; }
      if (bedieved) review(`hefsek-bedieved-${h.e.id}`, "הפסק סמוך לשקיעה או אחריה — תקף בדיעבד לפי השיטה שנבחרה", "לפי פסק הרב עובדיה יוסף הפסק שנעשה עד 13.5 דקות זמניות אחרי השקיעה תקף בדיעבד, ונספר ליום שהסתיים. לכתחילה עושים את ההפסק לפני השקיעה. יש לוודא עם רב, ובפרט לגבי המקום (יש שכתבו שבארץ ישראל השיעור קצר יותר).", [h.e.id]);
      validHefsek = h;
    }
    const checks = {};
    let cleanDay = 0, immersionDate;
    const addPlan = p => plans.push({ ...p, tentative: p.tentative ?? true });
    if (validHefsek) {
      const h = validHefsek;
      for (const x of stamped) if (x.e.type === "bedikah" && x.e.result === "clear" && x.s.instant > h.s.instant && x.s.abs > h.s.abs && x.s.abs <= h.s.abs + 7 && !x.s.uncertain && !bedikahInDay(x))
        review(`bedikah-outside-${x.e.id}`, "בדיקה שנרשמה מחוץ לשעות היום", "הבדיקה נרשמה בלילה או לפני עלות השחר, ולכן לא נספרה כבדיקה של יום מימי הספירה. יש לברר.", [x.e.id]);
      immersionDate = fromAbs(h.s.abs + 7);
      cleanDay = Math.max(0, Math.min(7, currentAbs - h.s.abs));
      for (let n = 1; n <= 7; n++) {
        const d = fromAbs(h.s.abs + n), c = atLocation(state, d), s = sun(d, c, nf);
        // כשאין עלות השחר מחושב (קיץ בקווי רוחב מעל כ-50°) תחילת חלון הבדיקה היא הזריחה, לחומרא
        const counted = stamped.filter(x => x.e.type === "bedikah" && x.e.result === "clear" && x.s.abs === h.s.abs + n && bedikahInDay(x));
        checks[n] = counted.map(x => x.e);
        // בוקר וערב לפי חצות היום (אמצע הזמן שבין הזריחה לשקיעה), ולא לפי 12:00 בשעון
        const beforeNoon = x => x.s.instant < (x.s.sun.sunrise.valueOf() + x.s.sun.sunset.valueOf()) / 2;
        const morning = counted.some(beforeNoon), afternoon = counted.some(x => !beforeNoon(x));
        const required = state.settings.bedikot !== "first-last" || n === 1 || n === 7;
        // היום הסתיים בשקיעתו (היום השביעי: בכניסת ליל הטבילה); כשאין שקיעה, כשהתאריך האזרחי עבר
        const ended = s.sunset ? now >= s.sunset : d < date;
        if (required && ended && !checks[n].length) review(`missing-day-${n}`, `לא נרשמה בדיקה ביום ${["הראשון", "השני", "השלישי", "הרביעי", "החמישי", "השישי", "השביעי"][n - 1]}`, "חוסר רישום אינו מוכיח שלא בוצעה בדיקה. יש להשלים רישום או לברר; המערכת אינה פוסלת או מאשרת את הספירה בעצמה.", [h.e.id]);
        if (!required) continue;
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
      if (!s.nightfall || !s.sunset) review("mikvah-no-nightfall", "אין צאת כוכבים מחושב בליל הטבילה", nightfallSpec(nf).kind === "deg" && s.sunset ? `במיקום ובתאריך הזה השמש אינה יורדת ${nightfallSpec(nf).n}° מתחת לאופק, ולכן לא נקבעה שעת ליל הטבילה. נדרשת הוראה אישית.` : "במיקום ובתאריך הזה אין שקיעה, ולכן לא נקבעה שעת ליל הטבילה. נדרשת הוראה אישית.", [h.e.id]);
      calendarReviews(immersionDate, c, h.e.id);
      // בלי שקיעה (לילה קוטבי) אין ״מוצאי היום השביעי״, גם אם השמש יורדת לזווית של צאת הכוכבים בצהריים
      if (s.nightfall && s.sunset) addPlan({ id: `mikvah-${h.e.id}`, kind: "mikvah", title: "ליל טבילה מתוכנן", date: immersionDate, onah: "evening", start: s.nightfall.toISOString(), reason: "הערב שלאחר היום השביעי. מותנה בהשלמת הספירה, הבדיקות ובירור הספקות; אינו אישור טבילה.", source: SOURCES.mikvah, eventIds: [h.e.id], cityId: c.id });
    } else if (earliestHefsek) {
      // אחרי השקיעה היום העברי כבר התחלף, ולכן התזכורת עוברת ליום הבא ולא נשארת בחלון שעבר
      const currentDay = fromAbs(currentAbs), d = earliestHefsek < currentDay ? currentDay : earliestHefsek, c = atLocation(state, d), s = sun(d, c);
      if (!s.sunset) review("hefsek-no-sunset", "אין שקיעה ביום ההפסק המוקדם", "במיקום ובתאריך הזה אין שקיעה, ולכן לא נקבעה תזכורת להפסק. נדרשת הוראה אישית.", latestNiddah ? [latestNiddah.e.id] : []);
      if (s.sunset) addPlan({ id: `hefsek-${latestNiddah?.e.id}`, kind: "hefsek", title: "הפסק טהרה, רק אם הדימום פסק", date: d, onah: "day", start: new Date(s.sunset.valueOf() - state.settings.reminderMinutes * 60000).toISOString(), end: s.sunset.toISOString(), reason: "זהו המועד המוקדם ביותר לפי ההמתנה שנבחרה, לא מועד קבוע. עושים הפסק רק אם הדימום פסק בפועל; אם לא, ממתינים והתזכורת עוברת ליום הבא. שבעה נקיים נספרים רק מהפסק שנרשם כנקי, והמערכת לעולם לא רושמת הפסק בעצמה.", source: SOURCES.wait, eventIds: latestNiddah ? [latestNiddah.e.id] : [], cityId: c.id });
    }
    const addOnah = (abs, onah, kind, title, reason, source, eventIds, id, orZarua = true) => {
      const civil = fromAbs(abs), location = atLocation(state, onah === "night" ? addDays(civil, -1) : civil);
      const w = onahWindow(abs, onah, location, nf);
      if (!w.start || !w.end) { review(`onah-sun-${id}`, "לא ניתן לחשב עונה במיקום הזה", "חסרים זמני זריחה או שקיעה תקפים.", eventIds); return; }
      const p = { id, kind, title, date: w.date, onah, start: w.start.toISOString(), end: w.end.toISOString(), reason, source, eventIds, cityId: location.id, tentative: true };
      addPlan(p);
      if (orZarua && state.settings.orZarua && ["monthly", "interval", "average"].includes(kind)) {
        const prev = 2 * abs + (onah === "night" ? 0 : 1) - 1, pa = Math.floor(prev / 2), po = prev % 2 ? "day" : "night", pw = onahWindow(pa, po, location);
        if (pw.start && pw.end) addPlan({ ...p, id: `oz-${id}`, kind: "or-zarua", title: `אור זרוע · ${title}`, date: pw.date, onah: po, start: pw.start.toISOString(), end: pw.end.toISOString(), reason: "העונה הקודמת לעונה הצפויה, לפי האפשרות שנבחרה בהגדרות.", source: SOURCES.orZarua });
      }
    };
    const last = flows.at(-1), lastRecorded = recordedFlows.at(-1);
    const latestHasUncertainty = unresolvedFlows.some(event => couldFollow(event, lastRecorded)) || (!!lastRecorded && ((lastRecorded.s.uncertain && !bhs) || lastRecorded.e.result === "uncertain"));
    if (last && !latestHasUncertainty && state.settings.special === "regular" && !dateline) {
      const lastReadings = readings(last), altOf = (r, i) => i ? `-alt` : "";
      const seenAverage = new Set();
      lastReadings.forEach((r, i) => {
        const onot = state.settings.beinonit === "both" ? ["night", "day"] : [r.onah];
        // אור זרוע ביום 31 אינו נוסף: מי ששומרת ימים 30 ו-31 שומרת את אור זרוע ליום 30 בלבד (מקור ראשוני לא אותר — CITES.orZarua31)
        for (const day of (state.settings.day31 ? [30, 31] : [30])) for (const onah of onot) {
          const key = `${r.abs + day - 1}|${onah}`; if (seenAverage.has(key)) continue; seenAverage.add(key);
          addOnah(r.abs + day - 1, onah, "average", `עונה בינונית · יום ${day}`, i ? "הראייה הייתה סמוך לגבול העונה או בין השמשות; לחומרא חוששים גם לעונה הסמוכה." : `ספירה כוללנית: יום הראייה הוא יום 1. יום ${day} הוא ${day - 1} ימים לאחר התאריך העברי שנרשם.`, SOURCES.average, [last.e.id], `average-${last.e.id}-${day}-${onah}${altOf(r, i)}`, day === 30);
        }
      });
      const monthly = f => {
        const h = new HDate(typeof f === "number" ? f : f.s.abs), nextFirst = new HDate(1, h.getMonth(), h.getFullYear()).add(1, "M");
        const monthLength = nextFirst.add(1, "M").abs() - nextFirst.abs();
        if (h.getDate() <= monthLength) return nextFirst.abs() + h.getDate() - 1;
        if (state.settings.missingMonthly === "first-next-month") return nextFirst.add(1, "M").abs();
        return null;
      };
      const monthlyAbs = monthly(last);
      if (last.s.alt && bhs) { const t = monthly(last.s.alt.abs); if (t) addOnah(t, last.s.alt.onah, "monthly", "עונת החודש · העונה הסמוכה", "הראייה הייתה סמוך לגבול העונה או בין השמשות; לחומרא חוששים גם לעונה הסמוכה.", SOURCES.monthly, [last.e.id], `monthly-${last.e.id}-alt`); }
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
      const uncertainInterval = unresolvedFlows.some(event => couldFollow(event, recordedFlows.at(-2))) || recordedFlows.slice(-2).some(x => (x.s.uncertain && !bhs) || x.e.result === "uncertain");
      if (uncertainInterval && recordedFlows.length >= 2) review("uncertain-interval", "חסר בסיס ודאי להפלגה", "אחת משתי הראיות האחרונות מסופקת. אין לדלג עליה ולחשב מרווח מראייה מוקדמת יותר.");
      if (flows.length >= 2 && !uncertainInterval) {
        const intervals = [];
        for (let i = 1; i < flows.length; i++) {
          const a = flows[i - 1], b = flows[i];
          let value, alts = [];
          if (state.settings.haflagah === "days") { value = b.s.abs - a.s.abs + 1; for (const ra of readings(a)) for (const rb of readings(b)) alts.push(rb.abs - ra.abs + 1); }
          else {
            const h = stamped.filter(x => x.e.type === "hefsek" && x.e.result === "clear" && !x.s.uncertain && !!x.s.sun.sunset && x.s.instant < x.s.sun.sunset && x.s.instant > a.s.instant && x.s.instant < b.s.instant && (x.s.abs >= a.s.abs + 4 || !!x.e.authorityNote)).at(-1);
            if (h) { value = b.s.ordinal - (2 * h.s.abs + 1); alts = readings(b).map(r => r.ordinal - (2 * h.s.abs + 1)); }
            else review(`chabad-hefsek-${b.e.id}`, "חסר הפסק לחישוב הפלגה בחב״ד", "חישוב זה דורש את ההפסק הקודם ולא רק שתי התחלות וסת.", [a.e.id, b.e.id]);
          }
          if (!value || value <= 0) continue;
          if (state.settings.haflagah === "chabad-onot" || state.settings.carryLongIntervals) { for (let j = intervals.length - 1; j >= 0; j--) if (intervals[j].value <= value) intervals.splice(j, 1); }
          else intervals.length = 0;
          // בין השמשות באחת הראיות: נשמרים גם המרווחים האפשריים האחרים (לחומרא)
          intervals.push({ value, alts: i === flows.length - 1 ? [...new Set(alts)].filter(v => v > 0 && v !== value) : [], ids: [a.e.id, b.e.id] });
        }
        // שימור הפלגות (רמ״א קפט, יג; ט״ז): ההפלגה של ראייה קודמת, שנספרת מאותה ראייה, נשמרת אם מועדה עוד לא הגיע
        // כשבאה הראייה האחרונה, ואם אחריה לא בא מרווח ארוך ממנה או שווה לה. כמו ״עונת חודש נוספת״. לשיטת הב״ח והש״ך — אין.
        if (state.settings.haflagah === "days" && state.settings.carryLongIntervals) {
          for (let i = 1; i < flows.length - 1; i++) {
            const f = flows[i], v = f.s.abs - flows[i - 1].s.abs + 1, target = f.s.abs + v - 1;
            if (target <= last.s.abs) continue;
            let uprooted = false;
            for (let j = i + 1; j < flows.length; j++) if (flows[j].s.abs - flows[j - 1].s.abs + 1 >= v) uprooted = true;
            if (uprooted || intervals.some(x => last.s.abs + x.value - 1 === target)) continue;
            addOnah(target, f.s.onah, "interval", `הפלגה נוספת · ${v} ימים`, "הפלגה של ראייה קודמת, שנספרת מאותה ראייה. הראייה שבאה לפני מועדה אינה עוקרת אותה (שימור הפלגות), ולכן שומרים גם אותה.", SOURCES.interval, [flows[i - 1].e.id, f.e.id], `interval-extra-${f.e.id}`);
          }
        }
        // בשיטת חב״ד המועד החדש נספר מההפסק שאחרי הראייה האחרונה — גם אחרי שכבר טבלה
        const chabadBase = state.settings.haflagah !== "chabad-onot" ? undefined : validHefsek || (latestMikvah && latestMikvah.s.instant > last.s.instant ? stamped.filter(x => x.e.type === "hefsek" && x.e.result === "clear" && !x.s.uncertain && !!x.s.sun.sunset && x.s.instant < x.s.sun.sunset && x.s.instant > last.s.instant && x.s.instant < latestMikvah.s.instant && (x.s.abs >= last.s.abs + 4 || !!x.e.authorityNote)).at(-1) : undefined);
        if (state.settings.haflagah === "chabad-onot" && intervals.length && !chabadBase) review("chabad-no-current-hefsek", "הפלגת חב״ד תחושב אחרי ההפסק", "בשיטה זו המועד נספר מההפסק שאחרי הראייה האחרונה. כשיירשם הפסק נקי יופיע המועד.", [last.e.id]);
        const seenInterval = new Set();
        for (const interval of intervals) for (const v of [interval.value, ...interval.alts]) {
          const isAlt = v !== interval.value;
          if (state.settings.haflagah === "days") lastReadings.forEach((r, i) => {
            if (!isAlt && !i) return addOnah(last.s.abs + v - 1, last.s.onah, "interval", `הפלגה · ${v} ימים`, "הפרש התאריכים העבריים בתוספת 1, בספירה כוללנית. חוזרים על אותו מרווח מהווסת האחרונה ובאותה עונה.", SOURCES.interval, interval.ids, `interval-${v}-${last.e.id}`);
            const key = `${r.abs + v - 1}|${r.onah}`; if (seenInterval.has(key)) return; seenInterval.add(key);
            addOnah(r.abs + v - 1, r.onah, "interval", `הפלגה · ${v} ימים · העונה הסמוכה`, "הראייה הייתה סמוך לגבול העונה או בין השמשות; לחומרא חוששים גם לעונה הסמוכה.", SOURCES.interval, interval.ids, `interval-${v}-${last.e.id}-${r.abs}-${r.onah}`);
          });
          else if (chabadBase) {
            const ordinal = 2 * chabadBase.s.abs + 1 + v;
            addOnah(Math.floor(ordinal / 2), ordinal % 2 ? "day" : "night", "interval", `הפלגה · ${v} עונות${isAlt ? " · העונה הסמוכה" : ""}`, isAlt ? "הראייה הייתה סמוך לגבול העונה או בין השמשות; לחומרא חוששים גם לעונה הסמוכה." : "מספר העונות מההפסק הקודם ועד הראייה הבאה, בספירה כוללנית; מועד חדש נספר מההפסק הנוכחי. מספרים גבוהים נשמרים כשמגיע מספר נמוך.", SOURCES.chabad, [...interval.ids, chabadBase.e.id], `chabad-${v}-${last.e.id}`);
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
    if (immersed) {
      // טבילה שנרשמה לפני צאת הכוכבים של היום השביעי להפסק שקדם לה — מסומנת, לא נפסלת ולא מאושרת
      const prevNiddah = stamped.filter(x => ["flow", "restart"].includes(x.e.type) && x.s.instant < latestMikvah.s.instant).at(-1);
      const hef = stamped.filter(x => x.e.type === "hefsek" && x.e.result === "clear" && x.s.instant < latestMikvah.s.instant && (!prevNiddah || x.s.instant > prevNiddah.s.instant)).at(-1);
      if (hef) {
        const day7 = fromAbs(hef.s.abs + 7), t = sun(day7, city(latestMikvah.e.cityId), nf).nightfall;
        if (!t || latestMikvah.s.instant < t) review("mikvah-early", "הטבילה נרשמה לפני ליל הטבילה המחושב", "לפי ההפסק שנרשם, ליל הטבילה הוא אחרי צאת הכוכבים של היום השביעי. ייתכן שהרישום שגוי או שהייתה הוראה מיוחדת; יש לברר.", [latestMikvah.e.id, hef.e.id]);
      }
    }
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
  function calendarExport(plans, neutral = true, now = new Date(), labels = {}) {
    const personal = labels.personal || "תזכורת אישית", details = labels.details || "פרטים ביומן האישי. מועד לתכנון בלבד.";
    const rows = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Maayan//Personal Calendar//HE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    for (const p of plans.filter(x => !x.done && new Date(x.start) >= now).slice(0, 250)) {
      const summary = escapeICS(neutral ? personal : p.title);
      rows.push("BEGIN:VEVENT", `UID:${p.id}@maayan.local`, `DTSTAMP:${utc(now.toISOString())}`, `DTSTART:${utc(p.start)}`,
        `DTEND:${utc(p.end ?? new Date(new Date(p.start).valueOf() + 30 * 60000).toISOString())}`, `SUMMARY:${summary}`,
        `DESCRIPTION:${escapeICS(neutral ? details : `${p.reason}${p.source && p.source.length ? `\nמקור: ${citeText(p.source)}` : ""}`)}`,
        "CLASS:PRIVATE", "TRANSP:TRANSPARENT", "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:${summary}`, "END:VALARM", "END:VEVENT");
    }
    rows.push("END:VCALENDAR");
    return rows.map(foldICS).join("\r\n") + "\r\n";
  }
  const SETTING_LABELS = {
    wait: { five: "חמישה ימים מתחילת הנידה", four: "ארבעה ימים מתחילת הנידה (הרב עובדיה יוסף)", "four-from-relations": "ארבעה ימים ממועד היחסים" },
    method: { custom: "התאמה אישית", ashkenaz: "אשכנזי – עיקר הדין", "ashkenaz-kreiti": "אשכנזי – כרתי ופלתי", sefard: "הרב עובדיה יוסף (ספרדי)", "sefard-bic": "בן איש חי (ספרדי)", chabad: "מנהג חב״ד" },
    beinHashmashot: { both: "לחומרא שתי העונות", flag: "השעיית החישוב ובירור" },
    hefsekTwilight: { "before-sunset": "רק לפני השקיעה", ovadia: "בדיעבד עד 13.5 דקות זמניות אחרי השקיעה (הרב עובדיה יוסף)" },
    haflagah: { days: "ימים בין תחילות הווסתות", "chabad-onot": "עונות מהפסק טהרה (חב״ד)" },
    beinonit: { same: "אותה עונה", both: "שתי העונות" },
    missingMonthly: { skip: "דילוג", "first-next-month": "א׳ בחודש שאחריו" },
    bedikot: { twice: "בוקר וערב בכל יום", "first-last": "ראשון ושביעי" },
    special: { regular: "מחזור רגיל", pregnancy: "היריון", postpartum: "אחרי לידה", nursing: "הנקה", hormonal: "טיפול הורמונלי" },
  };
  const yesNo = b => b ? "כן" : "לא";
  /* ---------- שיטות חישוב מוגדרות מראש ----------
   * שיטה קובעת את כל ההגדרות בבת אחת; המשתמשת יכולה לשנות כל הגדרה אחר כך. לכל ערך מקור, ו-ask מסמן "לברר עם רב". */
  const PS = {
    wait: SOURCES.wait, interval: SOURCES.interval, average: SOURCES.average, monthly: SOURCES.monthly, clean: SOURCES.clean, chabad: SOURCES.chabad,
    ovadiaWait: ["sa196_11", "thbWait"], ozAshkenaz: ["shach184_7", "taz184_2", "orZarua31"], ozSefard: ["thbOrZarua", "bic_tzav1"],
    day31: ["chavot189", "shach189_30", "sahr189_1d"], day31Sefard: ["sa189_1", "thbOrZarua"], day31Chabad: ["sahr189_1d"],
    beinonitAshkenaz: ["sa189_1", "sahr189_1f"], beinonitChabad: ["sahr189_1f", "sahr189_1"],
    haflagah: ["sa189_2h", "rema189_13", "sahr189_44"], missing30: ["missing30"], bedikot: ["sa196_4", "sa196_4f"],
    bhs: SOURCES.bhs, bhsSefard: ["shach184_13", "shach184_14", "thbHefsek"], bhsChabad: ["sahr184_19"],
    ozBic: ["bic_tzav1", "bic_tzav1b"], ozAshkenazBasic: ["shach184_7", "shach184_7b", "taz184_2"], ozKreiti: ["shach184_7", "taz184_2", "orZarua31"],
    day30: ["sa189_1", "sahr189_1", "shach189_30"], day31Kreiti: ["chavot189", "shach189_30", "sahr189_1d", "secShevet3031"], beinonitKreiti: ["sahr189_1f", "secBadei"],
    uproot: ["sa189_2u", "shach189_31", "secCarryMajority", "rema189_13"], carryTaz: ["rema189_13", "secCarryTaz", "secCarryMajority"], bicWait: ["sa196_11", "thbWait", "bic_tzav7", "bic_tzav10"],
    hefsekLate: ["sa196_1"], hefsekOvadia: ["sa196_1", "thbHefsek"], nightfallOvadia: ["thbNightfall"], none: [],
  };

  const note = (k, t, src, ask = false) => ({ k, t, src, ask });
  /* ההגדרות המשותפות לכל שיטה ספרדית ולכל שיטה אשכנזית. כל שיטה משנה מהן רק את מה שמבדיל אותה. */
  const SEFARD_BASE = { wait: "four", haflagah: "days", beinonit: "same", day31: false, orZarua: false, carryLongIntervals: false, carryMonthly: false, missingMonthly: "first-next-month", bedikot: "twice", nightfall: "20m", beinHashmashot: "both", hefsekTwilight: "ovadia" };
  const ASHKENAZ_BASE = { wait: "five", haflagah: "days", beinonit: "same", day31: true, orZarua: true, carryLongIntervals: false, carryMonthly: false, missingMonthly: "first-next-month", bedikot: "twice", nightfall: "8.5", beinHashmashot: "both", hefsekTwilight: "before-sunset" };
  const SEFARD_NOTES = [
    note("wait", "ארבעה ימים: יום הראייה הוא יום 1 וההפסק ביום הרביעי (ראתה בליל שני — הפסק ביום חמישי). לפי הרב עובדיה יסוד הדין הוא 72 שעות מהתשמיש; אם לא היו יחסים בארבעת הימים שלפני הראייה, יש שמתירים הפסק מיד כשפסק הדם. רבים מהפוסקים הספרדים ממתינים חמישה ימים.", PS.ovadiaWait, true),
    note("beinonit", "עונה בינונית ביום 30 בלבד, בעונת הראייה (שו״ע יו״ד קפט, א).", PS.average),
    note("day31", "יום 31 אינו נדרש לפי השו״ע ולפי טהרת הבית.", PS.day31Sefard, true),
    note("orZarua", "לפי טהרת הבית אין חוששים לעונת אור זרוע. מי שנוהגת כבן איש חי, שחשש לה — שיטת ״בן איש חי (ספרדי)״.", PS.ozSefard, true),
    note("haflagah", "הפלגה בימים מתחילת וסת לתחילת וסת, בספירה כוללנית.", PS.haflagah),
    note("carryLongIntervals", "הפלגה ארוכה נעקרת מיד כשבאה ראייה לפניה (״נעקר בפעם אחת״), כדעת הב״ח והש״ך (ובסיכום המשני גם סדרי טהרה, חוות דעת, רעק״א) — דלא כרמ״א (קפט, יג) והט״ז.", PS.uproot),
    note("missingMonthly", "ל׳ בחודש כשבחודש הבא אין ל׳: א׳ בחודש שאחריו (לחומרא).", PS.missing30, true),
    note("bedikot", "בדיקה בבוקר ולפני השקיעה בכל אחד משבעת הימים לכתחילה (שו״ע יו״ד קצו, ד).", PS.bedikot),
    note("nightfall", "ליל הטבילה: 20 דקות אחרי השקיעה, לחומרא. לשיטת הגאונים שהרב עובדיה נוקט צאת הכוכבים כ-13.5 דקות זמניות; לברר עם רב מתי לטבול.", PS.nightfallOvadia, true),
    note("beinHashmashot", "ראייה סמוך לשקיעה או בין השמשות: חוששים לשתי העונות. אחרי 13.5 דקות זמניות הזמן נחשב לילה ודאי.", PS.bhsSefard, true),
    note("hefsekTwilight", "הפסק לכתחילה לפני השקיעה. בדיעבד, לפי טהרת הבית, הפסק עד 13.5 דקות זמניות אחרי השקיעה תקף ונספר ליום שהסתיים (יש שכתבו שבארץ ישראל השיעור קצר יותר).", PS.hefsekOvadia, true),
  ];
  const ASHKENAZ_NOTES = [
    note("wait", "חמישה ימים מתחילת הווסת: יום הראייה הוא יום 1, וההפסק ביום החמישי לפני השקיעה (רמ״א יו״ד קצו, יא; כך נוהגים כל קהילות אשכנז).", PS.wait),
    note("beinonit", "עונה בינונית ביום 30, בעונה שבה התחילה הראייה בלבד (שו״ע יו״ד קפט, א). מעת לעת שלם — בשיטת ״כרתי ופלתי״.", PS.average),
    note("day31", "שומרים גם את יום 31, בעונת הראייה (חוות דעת קפט; ש״ך קפט, ס״ק ל). כך המנהג הרווח: לחוש גם ליום 30 וגם ליום 31 (שבט הלוי, מקור משני).", PS.day31Kreiti),
    note("orZarua", "עונת אור זרוע — העונה שלפני כל וסת (ש״ך קפד, ס״ק ז, בשם האור זרוע, ובשם הב״ח: ״הירא דבר ה׳ נוהג כהא״ז״). הט״ז (קפד, ס״ק ב) חולק. האם לכלול אותה בעיקר הדין — לברר.", PS.ozAshkenazBasic, true),
    note("haflagah", "הפלגה בימים מתחילת וסת לתחילת וסת, בספירה כוללנית.", PS.haflagah),
    note("carryLongIntervals", "הפלגה ארוכה נעקרת מיד כשבאה ראייה לפניה (״נעקר בפעם אחת״), כדעת הב״ח והש״ך (ובסיכום המשני גם סדרי טהרה, חוות דעת, רעק״א) — דלא כרמ״א (קפט, יג) והט״ז.", PS.uproot),
    note("missingMonthly", "ל׳ בחודש כשבחודש הבא אין ל׳: א׳ בחודש שאחריו, לחומרא (העונה הבינונית חלה ממילא בכ״ט).", PS.missing30),
    note("bedikot", "בדיקה בבוקר ולפני השקיעה בכל אחד משבעת הימים לכתחילה (שו״ע יו״ד קצו, ד).", PS.bedikot),
    note("nightfall", "צאת הכוכבים 8.5° מתחת לאופק, לחומרא, לליל הטבילה ולסוף בין השמשות. יש שנוהגים בשיעור אחר.", PS.none, true),
    note("beinHashmashot", "ראייה בין השקיעה לצאת הכוכבים: מעיקר הדין כלילה, ונוהגים להחמיר ולחשוש לשתי העונות (ש״ך יו״ד קפד, ס״ק יג–יד, בשם הב״ח).", PS.bhs),
    note("hefsekTwilight", "הפסק טהרה רק לפני השקיעה. לרוב פוסקי אשכנז הפסק אחרי השקיעה אינו תקף אף בדיעבד.", PS.hefsekLate),
  ];
  /** מחליף הערות לפי מפתח ומשאיר את השאר בסדרן */
  const withNotes = (base, ...repl) => base.map(n => repl.find(r => r.k === n.k) || n);
  const METHOD_PRESETS = {
    sefard: {
      label: SETTING_LABELS.method.sefard, family: "sefard", name: "הרב עובדיה יוסף",
      line: "בלי עונת אור זרוע. ארבעה ימים לפני ההפסק, והפסק בדיעבד עד 13.5 דקות אחרי השקיעה.", source: "טהרת הבית",
      settings: { ...SEFARD_BASE },
      notes: SEFARD_NOTES,
    },
    "sefard-bic": {
      label: SETTING_LABELS.method["sefard-bic"], family: "sefard", name: "בן איש חי",
      line: "כמו שיטת הרב עובדיה, ובנוסף חוששים לעונת אור זרוע, העונה שלפני כל וסת.", source: "בן איש חי, שנה ב, צו, א",
      settings: { ...SEFARD_BASE, orZarua: true },
      notes: withNotes(SEFARD_NOTES,
        note("wait", "ארבעה ימים מתחילת הראייה, כמו בשיטת הרב עובדיה. הבן איש חי (שנה ב, צו, ז; י) כותב שההפסק ביום השישי לראייה — כאן לא הוחל; לברר עם רב.", PS.bicWait, true),
        note("orZarua", "חוששים לעונת אור זרוע — העונה שלפני כל וסת: ״ומרן ז״ל סבירא לה כדעה הראשונה, אך צריך לחוש לדעה זו השניה״ (בן איש חי, שנה ב, צו, א).", PS.ozBic)),
    },
    ashkenaz: {
      label: SETTING_LABELS.method.ashkenaz, family: "ashkenaz", name: "עיקר הדין",
      line: "עונה בינונית ביום 30 ו-31, עונה אחת (עונת הראייה), ועונת אור זרוע לפני כל וסת.", source: "שו״ע ורמ״א; חוות דעת קפט; ש״ך קפד, ס״ק ז",
      settings: { ...ASHKENAZ_BASE },
      notes: ASHKENAZ_NOTES,
    },
    "ashkenaz-kreiti": {
      label: SETTING_LABELS.method["ashkenaz-kreiti"], family: "ashkenaz", name: "כרתי ופלתי",
      line: "עונה בינונית יממה שלמה, לילה ויום, בימים 30 ו-31. הפלגה ארוכה נשמרת עד שנעקרת (רמ״א, ט״ז).", source: "כרתי ופלתי, מובא בשו״ע הרב קפט, א",
      settings: { ...ASHKENAZ_BASE, beinonit: "both", carryLongIntervals: true },
      notes: withNotes(ASHKENAZ_NOTES,
        note("beinonit", "עונה בינונית מעת לעת שלם, לילה ויום, מתחילת הלילה ועד סוף היום (כרתי ופלתי, מובא בשו״ע הרב קפט, א). בדי השלחן פוסק כך (מקור משני).", PS.beinonitKreiti),
        note("day31", "שומרים גם את יום 31, גם הוא יממה שלמה (חוות דעת קפט; ש״ך קפט, ס״ק ל). כך המנהג הרווח: לחוש גם ליום 30 וגם ליום 31 (שבט הלוי, מקור משני).", PS.day31Kreiti),
        note("orZarua", "עונת אור זרוע לפני יום 30, עונת החודש וההפלגה (ש״ך קפד, ס״ק ז; הט״ז, ס״ק ב, חולק). לפני יום 31 אין אור זרוע. כשהעונה הבינונית היא מעת לעת, אור זרוע מתווסף לפני עונת הלילה שלה, כלומר ביום 29 — לברר.", PS.ozKreiti, true),
        note("carryLongIntervals", "הפלגה ארוכה שלא נעקרה נשמרת לצד ההפלגה הקצרה, וגם ההפלגה של הראייה הקודמת, שנספרת ממנה, כל עוד מועדה לא הגיע — כדעת הרמ״א (קפט, יג: ״חוששת לט׳ באייר״) והט״ז. הב״ח והש״ך חולקים.", PS.carryTaz, true)),
    },
    chabad: {
      label: SETTING_LABELS.method.chabad, family: "chabad", name: "מנהג חב״ד",
      line: "הפלגה בעונות מההפסק, ועונה בינונית מעת לעת ביום 30.", source: "שולחן ערוך הרב",
      settings: { wait: "five", haflagah: "chabad-onot", beinonit: "both", day31: false, orZarua: false, carryLongIntervals: true, carryMonthly: false, missingMonthly: "first-next-month", bedikot: "twice", nightfall: "8.5", beinHashmashot: "both", hefsekTwilight: "before-sunset" },
      notes: [
        note("wait", "חמישה ימים מתחילת הווסת, ההפסק ביום החמישי.", PS.wait),
        note("haflagah", "הפלגה בעונות: מספר העונות מההפסק ועד הראייה הבאה, ומועד חדש נספר מההפסק הנוכחי; הפלגה ארוכה נשמרת.", PS.chabad),
        note("beinonit", "עונה בינונית ביום 30 — כל המעת לעת, מהשקיעה ועד השקיעה (שו״ע הרב).", PS.beinonitChabad),
        note("day31", "יום 31 אינו מופעל בשיטה זו. שולחן ערוך הרב מביא אותו בשם ״יש אומרים״. לברר.", PS.day31Chabad, true),
        note("orZarua", "אור זרוע אינו מופעל כאן. לברר עם רב חב״די.", PS.none, true),
        note("missingMonthly", "ל׳ בחודש כשבחודש הבא אין ל׳: א׳ בחודש שאחריו.", PS.missing30, true),
        note("bedikot", "בדיקה בבוקר ולפני השקיעה בכל אחד משבעת הימים.", PS.bedikot),
        note("nightfall", "צאת הכוכבים 8.5°, לחומרא. לברר את מנהג המקום.", PS.none, true),
        note("beinHashmashot", "ראתה בין השמשות: מעיקר הדין חוששת לעונת הלילה בלבד, ויש להחמיר ולחשוש גם לעונת היום.", PS.bhsChabad),
        note("hefsekTwilight", "הפסק טהרה רק לפני השקיעה.", PS.hefsekLate),
      ],
    },
  };
  /* בחירת שיטה בשני שלבים: מה המנהג, ואחר כך לפי מי (בחב״ד אין שלב שני) */
  const METHOD_FAMILIES = [
    { id: "sefard", label: "ספרדי", ask: "לפי מי?", methods: ["sefard", "sefard-bic"] },
    { id: "ashkenaz", label: "אשכנזי", ask: "לפי איזו שיטה?", methods: ["ashkenaz", "ashkenaz-kreiti"] },
    { id: "chabad", label: "חב״ד", ask: "", methods: ["chabad"] },
  ];
  const methodFamily = method => (METHOD_PRESETS[method] || {}).family || "";
  /** אילו הגדרות שונו אחרי בחירת שיטה */
  const presetDiff = s => { const p = METHOD_PRESETS[s && s.method]; return p ? Object.keys(p.settings).filter(k => s[k] !== p.settings[k]) : []; };
  const applyPreset = (settings, method) => { const p = METHOD_PRESETS[method]; return p ? { ...settings, ...p.settings, method } : { ...settings, method: "custom" }; };
  function settingsSummary(s) {
    return [
      `שיטה: ${SETTING_LABELS.method[s.method] || SETTING_LABELS.method.custom}${presetDiff(s).length ? " (עם שינויים)" : ""}`,
      `מקום: ${city(s.cityId).name}`, `המתנה: ${SETTING_LABELS.wait[s.wait]}`, `הפלגה: ${SETTING_LABELS.haflagah[s.haflagah]}`,
      `עונה בינונית: ${SETTING_LABELS.beinonit[s.beinonit]}`, `יום 31: ${yesNo(s.day31)}`, `אור זרוע: ${yesNo(s.orZarua)}`,
      `שימור הפלגות ארוכות: ${yesNo(s.carryLongIntervals)}`, `שימור עונת חודש בזמן דימום: ${yesNo(s.carryMonthly)}`,
      `יום ל׳ בחודש חסר: ${SETTING_LABELS.missingMonthly[s.missingMonthly]}`, `בדיקות: ${SETTING_LABELS.bedikot[s.bedikot]}`,
      `צאת הכוכבים: ${nightfallLabel(s.nightfall)}`, `ראייה בין השמשות: ${SETTING_LABELS.beinHashmashot[s.beinHashmashot] || SETTING_LABELS.beinHashmashot.both}`,
      `הפסק אחרי השקיעה: ${SETTING_LABELS.hefsekTwilight[s.hefsekTwilight] || SETTING_LABELS.hefsekTwilight["before-sunset"]}`, `מצב: ${SETTING_LABELS.special[s.special]}`, `הערת שיטה: ${s.methodNote || "לא נרשמה"}`,
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

  const setLang = l => { if (LOCALES[l]) LANG = l; };
  const getLang = () => LANG;
  return {
    setLang, getLang, LOCALES, HDate, isLeapYear, daysInMonth, monthsInYear, gematriya, hebrew2abs, abs2hebrew,
    CITIES, city, setPlaces, EVENT_TYPES, EVENT_NAMES, CHECKLIST, SETTING_DEFAULTS, SETTING_LABELS, RESULT_NAMES, uuid, validISO, parseState, safeParse, emptyState, ValidationError,
    fromISO, toISO, addDays, hd, fromAbs, hebrew, dayNumber, isoAbs, civilLabel, dateInZone, timeInZone, localInstant, sun, atLocation, stamp, onahWindow, today, currentContext,
    ENGINE_VERSION, SOURCES, CITES, cite, citeUrl, citeText, calculate, sorted, METHOD_PRESETS, METHOD_FAMILIES, methodFamily, presetDiff, applyPreset, nightfallLabel,
    encryptBackup, decryptBackup, calendarExport, reportExport, settingsSummary, eventLine, planLine, demoState,
  };
})();
if (typeof module !== "undefined") module.exports = Maayan;
