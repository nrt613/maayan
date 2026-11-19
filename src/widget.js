/* מעיין — וידג׳ט למסך הבית (אנדרואיד בלבד, כבוי כברירת מחדל).
 * מחשב סיכום קטן לשלושת הימים הקרובים: שורות טקסט מוכנות, כל אחת עם זמן תחילה וסיום, כדי שהווידג׳ט
 * יחליף טקסט בזמן הנכון גם כשהאפליקציה סגורה. הסיכום נשמר ב-SharedPreferences דרך תוסף מקומי קטן
 * (MaayanWidget, ב-android/widget/), שגם מבקש מהמערכת לרענן את הווידג׳ט.
 * פרטיות: ברירת המחדל דיסקרטית (בלי מונחים הלכתיים). כשנעילת האפליקציה פעילה — תמיד דיסקרטי.
 * הווידג׳ט מציג רק את היומן האישי השמור במכשיר ובזמן האמיתי, גם כשבאפליקציה פתוח יומן לדוגמה או תרחיש. */
const MaayanWidget = (() => {
  "use strict";
  const req = n => (typeof require === "function" ? require(n) : null);
  const M = typeof Maayan !== "undefined" ? Maayan : req("./core.js");
  const L = typeof MaayanI18n !== "undefined" ? MaayanI18n : req("./i18n.js");
  const STORE_KEY = "maayan.v1.diary", LOCK_KEY = "maayan.v1.lock", HOUR = 3600000, HORIZON = 72 * HOUR, NO_END = 6 * HOUR, MAJOR = ["hefsek", "mikvah", "monthly", "interval", "average", "or-zarua", "manual", "fixed"];
  const t = s => L.t(s);

  /** האם נעילת האפליקציה (קוד/ביומטרי) פעילה: הגדרת הנעילה נשמרת ב-maayan.v1.lock (גיבוב וקוד מלח) */
  function lockActive() {
    try {
      const raw = globalThis.localStorage && localStorage.getItem(LOCK_KEY), c = raw && JSON.parse(raw);
      return !!(c && c.hash);
    } catch { return true; } // הגדרת נעילה פגומה: לחומרא, דיסקרטי
  }
  const settingsOf = state => {
    const s = (state && state.settings) || {};
    return { enabled: s.widgetEnabled === true, style: s.widgetStyle === "full" ? "full" : "discreet" };
  };

  const fmtCache = new Map();
  const fmt = (loc, opts) => { const k = loc + JSON.stringify(opts); if (!fmtCache.has(k)) fmtCache.set(k, new Intl.DateTimeFormat(loc, opts)); return fmtCache.get(k); };
  const locale = () => (M.LOCALES && M.LOCALES[L.lang]) || "he-IL";
  const title = p => p.kind === "or-zarua" ? `עונת אור זרוע · לפני ${String(p.title).replace(/^אור זרוע · /, "")}` : p.kind === "mikvah" ? "ליל טבילה" : p.kind === "hefsek" ? "הפסק טהרה" : p.title;
  const isEvening = p => p.onah !== "day";

  /** תווית יום יחסית לרגע t: היום / הערב / מחר / מחר בערב / מוצ״ש / שם היום / תאריך */
  function dayLabel(p, t0, tz) {
    const d = M.dateInZone(new Date(p.start), tz), today = M.dateInZone(new Date(t0), tz), diff = M.isoAbs(d) - M.isoAbs(today);
    const ev = isEvening(p), wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (diff <= 0) return t(ev ? "הערב" : "היום");
    if (diff === 1) return t(ev ? "מחר בערב" : "מחר");
    if (diff < 7) {
      if (ev && wd === 6) return t("מוצ״ש");
      const name = fmt(locale(), { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
      return ev ? `${name} ${t("בערב")}` : name;
    }
    return fmt(locale(), { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  }

  /** השורות לרגע אחד */
  function linesAt(state, at, full) {
    const r = M.calculate(state, new Date(at)), ctx = M.currentContext(state, new Date(at)), tz = ctx.city.tz;
    const items = r.plans.filter(p => !p.done).map(p => ({ p, s: Date.parse(p.start), e: p.end ? Date.parse(p.end) : Date.parse(p.start) + NO_END })).filter(x => x.e > at);
    const hm = ms => M.timeInZone(new Date(ms), tz), name = p => full ? t(title(p)) : t("תזכורת אישית");
    const cd = r.phase === "clean" ? r.cleanDay : 0;
    const mk = r.plans.find(p => p.kind === "mikvah"), mikvahNight = !!mk && at < Date.parse(mk.start) + 14 * HOUR;
    let head = "";
    if (cd) head = full ? `${t("שבעה נקיים")} · ${t(`יום ${cd}`)}` : t(`יום ${cd} מתוך 7`);
    else if (full) head = t(mikvahNight && r.phase === "planned" ? "ליל הטבילה" : { empty: "אין רישומים", waiting: "ממתינה להפסק טהרה", clean: "הפסק טהרה נרשם", planned: "הטבילה המתוכננת עדיין לא נרשמה", immersed: "אחרי טבילה" }[r.phase]);
    // שורת היום/הערב: מועד פעיל עכשיו, או מועד שמתחיל עוד היום (לפי התאריך האזרחי)
    const today = M.dateInZone(new Date(at), tz), sunset = M.sun(today, ctx.city, state.settings.nightfall).sunset;
    const active = items.find(x => x.s <= at), later = items.find(x => x.s > at && M.dateInZone(new Date(x.s), tz) === today);
    let now, shown = null;
    if (active) { shown = active; now = `${t("עכשיו")}: ${name(active.p)} · ${t(`עד ${hm(active.e)}`)}`; }
    else if (later) { shown = later; now = `${t(isEvening(later.p) ? "הערב" : "היום")}: ${name(later.p)} · ${t(`מ-${hm(later.s)}`)}`; }
    else now = `${t(sunset && at >= sunset.valueOf() ? "הערב" : "היום")}: ${t("אין מועד")}`;
    // המועד הבא (בלי תזכורות בדיקה, שמופיעות בשורת היום)
    const nx = items.find(x => x !== shown && x.s > at && MAJOR.includes(x.p.kind));
    const next = nx ? `${full ? t(title(nx.p)) : t("תזכורת אישית")}: ${dayLabel(nx.p, at, tz)} ${hm(nx.s)}` : "";
    return { head, now, next, r, tz, ctx };
  }

  /** הסיכום שנשמר לווידג׳ט. opts.locked כופה תצוגה דיסקרטית (לבדיקות) */
  function summary(state, nowArg, opts = {}) {
    const n = +(nowArg || new Date()), ws = settingsOf(state);
    const base = { v: 1, lang: L.lang, dir: L.lang === "he" ? "rtl" : "ltr", generated: n, app: t("מעיין"), open: t("פתיחת היומן") };
    if (!state || !ws.enabled) return { ...base, enabled: false, entries: [] };
    const locked = opts.locked ?? lockActive(), style = locked ? "discreet" : ws.style, full = style === "full";
    const end = n + HORIZON, first = linesAt(state, n, full);
    // גבולות שבהם הטקסט יכול להשתנות: תחילת וסיום כל מועד, חצות ושקיעה בכל יום
    const cut = new Set();
    for (const p of first.r.plans) { const s = Date.parse(p.start), e = p.end ? Date.parse(p.end) : s + NO_END; for (const x of [s, e, s + 14 * HOUR]) if (x > n && x < end) cut.add(x); }
    for (let i = 0; i <= 4; i++) {
      const d = M.addDays(first.ctx.date, i), c = M.atLocation(state, d), sn = M.sun(d, c, state.settings.nightfall);
      try { const mid = M.localInstant(d, "00:00", c.tz).valueOf(); if (mid > n && mid < end) cut.add(mid); } catch { /* */ }
      if (sn.sunset && sn.sunset > n && sn.sunset < end) cut.add(sn.sunset.valueOf());
    }
    const times = [n, ...[...cut].sort((a, b) => a - b)], entries = [];
    times.forEach((from, i) => {
      const l = i ? linesAt(state, from, full) : first, until = times[i + 1] ?? end, prev = entries[entries.length - 1];
      if (prev && prev.head === l.head && prev.now === l.now && prev.next === l.next) prev.until = until;
      else entries.push({ from, until, head: l.head, now: l.now, next: l.next });
    });
    return { ...base, enabled: true, style, locked, until: end, entries, stale: t("לעדכון, פתחי את היומן") };
  }

  /* ---------- כתיבה למכשיר (אנדרואיד בלבד) ---------- */
  const cap = () => (typeof window !== "undefined" && window.Capacitor) || null;
  const android = () => { const c = cap(); return !!(c && c.isNativePlatform && c.isNativePlatform() && c.getPlatform && c.getPlatform() === "android"); };
  let plugin = null, last = "", lastKey = "", lastAt = 0, chain = Promise.resolve();
  const native = () => { const c = cap(); if (!plugin && c) plugin = (c.Plugins && c.Plugins.MaayanWidget) || (c.registerPlugin && c.registerPlugin("MaayanWidget")) || null; return plugin; };
  function write(obj) {
    const json = JSON.stringify(obj);
    if (json === last) return chain;
    last = json;
    chain = chain.then(() => native() && native().setData({ json })).catch(e => { last = ""; console.warn("widget", e); });
    return chain;
  }
  /** היומן האישי השמור (לא יומן לדוגמה או תרחיש) */
  function personal() {
    try { const raw = localStorage.getItem(STORE_KEY); return raw ? M.parseState(JSON.parse(raw)) : null; } catch { return null; }
  }
  /** נקרא אחרי כל שמירה ובשעון היומי. הארגומנטים משמשים רק כאות לעדכון; המקור הוא היומן האישי השמור */
  function update(_state, _now) {
    if (!android()) return Promise.resolve();
    const st = personal(), n = Date.now(), key = JSON.stringify([st, L.lang, lockActive()]);
    // אותו יומן: מחשבים מחדש רק כל שעה (השורות כבר מכסות שלושה ימים)
    if (key === lastKey && n - lastAt < HOUR) return chain;
    lastKey = key; lastAt = n;
    try { return write(summary(st, n)); } catch (e) { console.warn("widget", e); return write({ v: 1, enabled: false, entries: [], app: t("מעיין"), open: t("פתיחת היומן") }); }
  }
  /** מחיקת כל הנתונים: הווידג׳ט חוזר למצב כבוי */
  function clear() { lastKey = ""; if (!android()) return Promise.resolve(); return write({ v: 1, enabled: false, entries: [], app: t("מעיין"), open: t("פתיחת היומן"), generated: Date.now() }); }
  // גיבוי לקריאות מהאפליקציה: בדיקה כל דקה (זולה כשדבר לא השתנה) וביציאה מהאפליקציה, כדי שהפעלת נעילה
  // או שינוי שפה יגיעו לווידג'ט מיד
  if (typeof document !== "undefined" && typeof setInterval === "function") {
    setInterval(() => { if (android()) update(); }, 60000);
    document.addEventListener("visibilitychange", () => { if (document.hidden && android()) { lastKey = ""; update(); } });
  }
  return { update, clear, summary, lockActive, supported: android };
})();
if (typeof window !== "undefined") window.MaayanWidget = MaayanWidget;
if (typeof module !== "undefined") module.exports = MaayanWidget;
