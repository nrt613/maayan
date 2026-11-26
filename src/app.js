/* מעיין — ממשק. קוד צד-לקוח בלבד; שום מידע לא יוצא מהמכשיר. */
(() => {
  "use strict";
  const M = Maayan, SCENARIOS = MaayanScenarios(M), L = MaayanI18n;
  if (typeof MaayanDict !== "undefined") L.load(MaayanDict);
  const { EVENT_NAMES, CITIES, city, addDays, hebrew, civilLabel, timeInZone, sun, atLocation, currentContext, calculate, hd, fromAbs, fromISO, toISO, HDate } = M;
  const APP_VERSION = "1.1.0-review";
  const STORE_KEY = "maayan.v1.diary", SEEN_KEY = "maayan.v1.seen", LANG_KEY = "maayan.v1.lang";
  // נעילה בקוד (רק גיבוב PBKDF2 עם מלח, אף פעם לא הקוד עצמו), מונה ניסיונות שגויים, ותזכורת לגיבוי
  const LOCK_KEY = "maayan.v1.lock", LOCKFAIL_KEY = "maayan.v1.lockfail", BACKUP_KEY = "maayan.v1.backup";
  // כרטיס ״בחרי את המנהג שלך״ ליומן קיים עם ״התאמה אישית״: מוצג עד שסוגרים אותו, פעם אחת
  const METHODCARD_KEY = "maayan.v1.methodcard";
  const CAP = window.Capacitor, NATIVE = !!(CAP && typeof CAP.isNativePlatform === "function" && CAP.isNativePlatform()), PL = NATIVE ? CAP.Plugins : {};
  const TERMS_VERSION = "2026-11";
  const $ = sel => document.querySelector(sel);
  const placeOptions = (st, selected) => [...CITIES, ...(st.places || [])].map(c => `<option value="${c.id}"${selected === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /** קישורי מקור למסך הכללים בלבד: רק מקורות ראשוניים שנבדקו מול ספריא, מקושרים לטקסט שם.
   *  מקורות שלא אומתו ומקורות משניים נמצאים במסמכי הרב (docs/halacha), לא באפליקציה. */
  const citeList = (ids, label = "מקורות") => {
    const seen = new Set(), list = (ids || []).map(id => [id, M.cite(id)]).filter(([, c]) => c && c.ok && !seen.has(c.t) && seen.add(c.t));
    if (!list.length) return "";
    return `<div class="cites"><span class="cites-h">${label}:</span><ul>${list.map(([id, c]) => `<li><a href="${esc(M.citeUrl(id))}" target="_blank" rel="noopener">${esc(c.t)}</a></li>`).join("")}</ul></div>`;
  };
  /** נקודה לבירור באפליקציה: ב״יש לשאול רב״ — משפט על המצב ומשפט על מה שמעיין עושה בינתיים, בלי מקורות */
  const reviewBody = v => v.ask ? `<p>${esc(v.situation)}</p><p class="ask-now">${esc(v.meanwhile)}</p>` : `<p>${esc(v.detail)}</p>`;
  const reviewHead = v => v.ask ? v.situation : v.title;

  /** נקודות לבירור: שאלות ״יש לשאול רב״ קודם, ואחריהן השאר בסדרן */
  const askFirst = list => [...list.filter(v => v.ask), ...list.filter(v => !v.ask)];

  /* ---------- אייקונים ---------- */
  // סט אייקונים אחיד: רשת 24, קו 1.75 עם קצוות מעוגלים. class="f" = מילוי רך (במצב פעיל או באריח צבעוני), class="s" = כוכב מלא, class="dot" = נקודה
  const P = {
    spring: '<path d="M3.6 10.2C6.2 6 11.2 6.6 12.4 18.2"/><path d="M20.4 12.4C18.3 9.4 13.9 10 12.4 18.2"/><ellipse cx="12" cy="18.6" rx="7.2" ry="2.3"/>',
    droplet: '<path class="f" d="M12 3.4s6.2 6.5 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 9.9 12 3.4 12 3.4z"/><path d="M12 3.4s6.2 6.5 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 9.9 12 3.4 12 3.4z"/><path d="M9.1 14.9a3 3 0 0 0 2.4 2.8"/>',
    home: '<path class="f" d="M5.5 9 12 4l6.5 5v10.2a1.3 1.3 0 0 1-1.3 1.3H6.8a1.3 1.3 0 0 1-1.3-1.3z"/><path d="M3.5 10.6 10.7 4.6a2 2 0 0 1 2.6 0l7.2 6"/><path d="M5.5 9.2v9.8a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.2"/><path d="M9.8 20.5v-4.3a2.2 2.2 0 0 1 4.4 0v4.3"/>',
    calendar: '<path class="f" d="M3.5 9.5h17v8a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z"/><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v3.5M16 3v3.5M3.5 9.5h17"/><path class="dot" d="M8 14h.01M12 14h.01M16 14h.01M8 17.4h.01"/>',
    book: '<path class="f" d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M6.8 3.5h10.4A1.8 1.8 0 0 1 19 5.3v13.4a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 18.7V5.3a1.8 1.8 0 0 1 1.8-1.8z"/><path d="M9 3.5v17M12.5 8.5h3.5M12.5 12h3.5"/>',
    bell: '<path class="f" d="M6 10.5a6 6 0 0 1 12 0v3.6c0 .9.3 1.7.9 2.4l.6.7a.6.6 0 0 1-.4 1H4.9a.6.6 0 0 1-.4-1l.6-.7c.6-.7.9-1.5.9-2.4z"/><path d="M6 10.5a6 6 0 0 1 12 0v3.6c0 .9.3 1.7.9 2.4l.6.7a.6.6 0 0 1-.4 1H4.9a.6.6 0 0 1-.4-1l.6-.7c.6-.7.9-1.5.9-2.4z"/><path d="M9.8 20.6a2.4 2.4 0 0 0 4.4 0"/>',
    sliders: '<path class="f" d="M18.6 7.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0zM10.6 16.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0z"/><path d="M4 7.5h9.4M18.6 7.5H20M4 16.5h1.4M10.6 16.5H20"/><circle cx="16" cy="7.5" r="2.6"/><circle cx="8" cy="16.5" r="2.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M10 5.7a9 9 0 0 1 2-.2c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.4 3.2M6.6 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5a8.6 8.6 0 0 0 4.6-1.3M3.5 3.5l17 17M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    pin: '<path class="f" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M19 12L20.9 12M16.95 7.05L18.29 5.71M12 5L12 3.1M7.05 7.05L5.71 5.71M5 12L3.1 12M7.05 16.95L5.71 18.29M12 19L12 20.9M16.95 16.95L18.29 18.29"/>',
    moon: '<path class="f" d="M10.78 5.5A7.5 7.5 0 1 0 18.22 15.02A6.2 6.2 0 0 1 10.78 5.5Z"/><path d="M10.78 5.5A7.5 7.5 0 1 0 18.22 15.02A6.2 6.2 0 0 1 10.78 5.5Z"/><path class="s" d="M18.3 1.9C18.7 3.55 19.15 4 20.8 4.4C19.15 4.8 18.7 5.25 18.3 6.9C17.9 5.25 17.45 4.8 15.8 4.4C17.45 4 17.9 3.55 18.3 1.9Z"/><path class="s" d="M21.2 7.9C21.44 8.89 21.71 9.16 22.7 9.4C21.71 9.64 21.44 9.91 21.2 10.9C20.96 9.91 20.69 9.64 19.7 9.4C20.69 9.16 20.96 8.89 21.2 7.9Z"/>',
    mikvah: '<path class="f" d="M11.53 3.8A6.2 6.2 0 1 0 17.48 11.65A5 5 0 0 1 11.53 3.8Z"/><path d="M11.53 3.8A6.2 6.2 0 1 0 17.48 11.65A5 5 0 0 1 11.53 3.8Z"/><path class="s" d="M18.6 1.7C18.9 2.95 19.25 3.3 20.5 3.6C19.25 3.9 18.9 4.25 18.6 5.5C18.3 4.25 17.95 3.9 16.7 3.6C17.95 3.3 18.3 2.95 18.6 1.7Z"/><path d="M3.5 19.6c1.4 0 1.4-1.1 2.8-1.1s1.4 1.1 2.8 1.1 1.4-1.1 2.9-1.1 1.4 1.1 2.8 1.1 1.4-1.1 2.8-1.1 1.4 1.1 2.9 1.1"/>',
    sunrise: '<path d="M3 18.5h18M6.8 18.5a5.2 5.2 0 0 1 10.4 0"/><path d="M5.23 16.04L3.64 15.46M7.57 12.83L6.52 11.49M16.43 12.83L17.48 11.49M18.77 16.04L20.36 15.46"/><path d="M12 2.8v5.4M9.8 5 12 2.8 14.2 5"/>',
    sunset: '<path d="M3 18.5h18M6.8 18.5a5.2 5.2 0 0 1 10.4 0"/><path d="M5.23 16.04L3.64 15.46M7.57 12.83L6.52 11.49M16.43 12.83L17.48 11.49M18.77 16.04L20.36 15.46"/><path d="M12 2.8v5.4M9.8 6 12 8.2 14.2 6"/>',
    check: '<path d="M5 12.6 9.6 17 19 7.4"/>',
    hefsek: '<path class="f" d="M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z"/><circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 4.9-5.1"/>',
    bedikah: '<path class="f" d="M8.5 3.5h7a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5z"/><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8.3 12.3l2.5 2.5 4.9-5.1"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    left: '<path d="M14.5 6l-6 6 6 6"/>',
    right: '<path d="M9.5 6l6 6-6 6"/>',
    out: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v3.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 4 17.5v-9A2.5 2.5 0 0 1 6.5 6H10"/>',
    pencil: '<path d="M4.5 19.5l1-4.2L16.2 4.6a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L8.7 18.5zM14.5 6.3l3.2 3.2"/>',
    trash: '<path d="M4.5 7h15M9.5 11v5.5M14.5 11v5.5M6.5 7l.8 11.7a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14"/>',
    lock: '<path class="f" d="M8 10.5h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"/><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7"/><path class="dot" d="M12 17.2h.01"/>',
    globe: '<circle class="f" cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8"/><path d="M12 3.4c2.3 2.4 3.4 5.3 3.4 8.6s-1.1 6.2-3.4 8.6c-2.3-2.4-3.4-5.3-3.4-8.6S9.7 5.8 12 3.4z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path class="dot" d="M12 7.8h.01"/>',
    list: '<path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20"/><path class="dot" d="M4.8 6.5h.01M4.8 12h.01M4.8 17.5h.01"/>',
    flask: '<path d="M9.5 3.5h5M10.5 3.5v5.3L5.3 17.7a1.9 1.9 0 0 0 1.7 2.8h10a1.9 1.9 0 0 0 1.7-2.8L13.5 8.8V3.5M7.6 14.5h8.8"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.8"/><path d="M15.5 8.5V6.3a2.8 2.8 0 0 0-2.8-2.8H6.3a2.8 2.8 0 0 0-2.8 2.8v6.4a2.8 2.8 0 0 0 2.8 2.8h2.2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    shield: '<path d="M12 3.5 19 6v5.7c0 4.2-2.9 7.6-7 8.8-4.1-1.2-7-4.6-7-8.8V6z"/><path d="M9 12l2.1 2.1 4-4.2"/>',
    play: '<path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4a.8.8 0 0 0-1.2.7z"/>',
    file: '<path d="M14 3.5H7.3a2.8 2.8 0 0 0-2.8 2.8v11.4a2.8 2.8 0 0 0 2.8 2.8h9.4a2.8 2.8 0 0 0 2.8-2.8V9z"/><path d="M14 3.5v3.7A1.8 1.8 0 0 0 15.8 9h3.7M8.5 13h7M8.5 16.5h4.5"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 0 1-13.4 4.6M4.5 12a7.5 7.5 0 0 1 13.4-4.6M18.5 3.8v3.8h-3.8M5.5 20.2v-3.8h3.8"/>',
    scale: '<path d="M12 4v16M8 20h8M5 7.5h14"/><path d="M5 7.5 2.7 13a2.4 2.4 0 0 0 4.6 0zM19 7.5 16.7 13a2.4 2.4 0 0 0 4.6 0z"/>',
    finger: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    backspace: '<path d="M9.6 5.5h9.4a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H9.6a2 2 0 0 1-1.5-.7l-5-5.3a.8.8 0 0 1 0-1.1l5-5.3a2 2 0 0 1 1.5-.6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    sparkle: '<path class="s" d="M12 4C13.28 9.28 14.72 10.72 20 12C14.72 13.28 13.28 14.72 12 20C10.72 14.72 9.28 13.28 4 12C9.28 10.72 10.72 9.28 12 4Z"/>',
    hourglass: '<path d="M7 3.5h10M7 20.5h10"/><path class="f" d="M9.4 17.2 12 15l2.6 2.2c.6.5.9 1.1.9 1.9v1.4h-7v-1.4c0-.8.3-1.4.9-1.9z"/><path d="M8 3.5v2.3a4 4 0 0 0 1.6 3.2L12 11l2.4-2A4 4 0 0 0 16 5.8V3.5M8 20.5v-2.3a4 4 0 0 1 1.6-3.2L12 13l2.4 2a4 4 0 0 1 1.6 3.2v2.3"/>',
    checklist: '<path d="M10 7h10M10 12.5h10M10 18h6"/><path d="M3.8 7l1.4 1.4L7.8 5.8M3.8 12.5l1.4 1.4 2.6-2.6"/><circle cx="5.6" cy="18" r="1.6"/>',
  };
  const I = (n, s = 20) => `<svg class="ic${n === "left" || n === "right" || n === "out" ? " dirflip" : ""}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  /* ---------- מצב ---------- */
  const storage = {
    ok: true,
    get(k) { try { return localStorage.getItem(k); } catch { this.ok = false; return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { this.ok = false; return false; } },
  };
  function loadPersonal() {
    const raw = storage.get(STORE_KEY);
    if (!raw) return M.newDiary();
    try { return M.parseState(JSON.parse(raw)); } catch { app.loadWarning = "היומן השמור במכשיר פגום ולא נטען. הנתונים לא נמחקו."; app.blockSave = true; return M.emptyState(); }
  }
  const NAV = [
    ["today", "היום", "home"], ["calendar", "לוח השנה", "calendar"], ["journal", "היומן שלי", "book"],
    ["dates", "מועדים", "bell"], ["prefs", "הגדרות", "sliders"], ["review", "לבודקים", "scale"],
  ];
  // בסרגל הניווט: חמש לשוניות. מסך הבודקים נגיש מההגדרות ומקישורי "כללים ומקורות".
  const MAIN_NAV = NAV.filter(n => n[0] !== "review");
  const PRIVACY_URL = NATIVE ? "https://nrt613.github.io/maayan/privacy.html" : "privacy.html";
  const app = {
    mode: "personal", personal: null, sandbox: null, scenario: null, simNow: null,
    tab: "today", hidden: false, modal: null, toast: "", toastTimer: 0,
    cal: { cursor: null, mode: "civil", selected: null }, filter: "all", query: "", jLimit: 150,
    testResults: null, openScenario: null, permission: "default", scheduled: 0, exact: null, notified: new Set(), loadWarning: "", blockSave: false, lastDayKey: "",
    locked: false, lock: null, lockedModal: null, bio: null, widgetDay: null,
    methodFamily: null, keep: new Set(),
  };
  const realNow = () => new Date();
  const now = () => app.mode === "scenario" ? app.simNow : realNow();
  const state = () => app.mode === "personal" ? app.personal : app.sandbox;

  function commit(next) {
    const parsed = M.parseState(next);
    if (app.mode === "personal") {
      if (app.blockSave) throw new Error("היומן השמור פגום. שחזרי מגיבוי או מחקי אותו בהגדרות לפני שמירה.");
      app.personal = parsed;
      if (!storage.set(STORE_KEY, JSON.stringify(parsed))) toast("השינוי נשמר רק עד סגירת הדף: הדפדפן חוסם שמירה במכשיר. מומלץ לגבות.");
      else toast("נשמר במכשיר");
      syncNotifications();
      if (window.MaayanWidget) setTimeout(() => MaayanWidget.update(), 0); // אחרי הציור, כדי לא לעכב את המסך
    } else { app.sandbox = parsed; toast(app.mode === "scenario" ? "נשמר בתרחיש (לא ביומן האישי)" : "נשמר ביומן לדוגמה"); }
    render();
  }
  /** הודעה קצרה בתחתית. action: { label, run } — למשל ״ביטול״ אחרי מחיקה */
  function toast(msg, action = null) { app.toast = msg; app.toastAction = action; clearTimeout(app.toastTimer); app.toastTimer = setTimeout(() => { app.toast = ""; app.toastAction = null; renderToast(); }, action ? 7000 : 4200); renderToast(); }
  /** שמירה עם אפשרות ביטול: מציג הודעה עם כפתור שמחזיר את המצב הקודם */
  function commitUndoable(next, msg) {
    const before = state();
    commit(next);
    toast(msg, { label: "ביטול", run: () => { commit(before); toast("השינוי בוטל"); } });
  }

  /* ---------- עזרים לתצוגה ---------- */
  const hebDay = d => hebrew(d).split(" ")[0];
  const loc = () => M.LOCALES[L.lang];
  const hebMonthTitle = d => hd(d).monthTitle();
  const civilMonthTitle = d => new Intl.DateTimeFormat(loc(), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d.slice(0, 7)}-15T12:00:00Z`));
  const weekdayName = d => new Intl.DateTimeFormat(loc(), { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const weekHeads = () => L.lang === "he" ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] : [0, 1, 2, 3, 4, 5, 6].map(i => new Intl.DateTimeFormat(loc(), { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + i, 12))));
  const planHebrew = p => p.onah === "day" ? hebrew(p.date) : hebrew(addDays(p.date, 1));
  const onahLabel = o => o === "day" ? "עונת יום" : o === "night" ? "עונת לילה" : "ערב";
  const SEP_KINDS = ["monthly", "interval", "average", "or-zarua", "manual"];

  /** שם המועד לתצוגה: עונת אור זרוע מסומנת במפורש, עם העונה שהיא קודמת לה */
  const planTitle = p => p.kind === "or-zarua" ? `עונת אור זרוע · לפני ${String(p.title).replace(/^אור זרוע · /, "")}` : p.title;
  /** אייקון ואריח צבע לפי סוג המועד */
  const planIcon = p => p.kind === "mikvah" ? "mikvah" : p.kind === "bedikah" ? "bedikah" : p.kind === "hefsek" ? "hefsek" : p.onah === "day" ? "sun" : "moon";
  const planTone = k => k === "mikvah" ? "mik" : k === "bedikah" || k === "hefsek" ? "clean" : "sep";
  /** כפתור ״הכנות לטבילה״: נפתח מליל הטבילה (במועדים, בלוח ובמסך היום) ולא כרשימה קבועה */
  const prepButton = (st, cls = "btn ghost sm prep-link") => { const n = M.CHECKLIST.filter(x => st.settings.checklist.includes(x)).length; return `<button type="button" class="${cls}" data-act="prep">${I("checklist", 17)}<span>הכנות לטבילה</span><span class="count">${n}/${M.CHECKLIST.length}</span></button>`; };
  function planLine(p, { compact = false, open = false, prep = true } = {}) {
    const c = city(p.cityId), start = timeInZone(new Date(p.start), c.tz);
    const prefix = p.onah === "day" ? "" : "ליל ";
    return `<details class="plan k-${p.kind} tone-${planTone(p.kind)}${p.done ? " done" : ""}"${open ? " open" : ""}>
      <summary><span class="plan-ic">${I(planIcon(p), 18)}</span>
        <span class="plan-name"><strong>${esc(planTitle(p))}</strong><small><span class="hebdate">${prefix}${esc(planHebrew(p))}</span>${compact ? "" : ` · ${esc(civilLabel(p.date, true))}${p.cityId !== state().settings.cityId ? ` · ${esc(c.name)}` : ""}`}</small></span>
        <time dir="ltr">${start}</time>${I("left", 16)}</summary>
      <div class="plan-more"><p>${esc(p.reason)}</p>
        <small>${onahLabel(p.onah)} · ${p.end ? `מ-${start} עד ${timeInZone(new Date(p.end), c.tz)}` : `מ-${start}`} · ${esc(c.name)}</small>
        ${p.done ? '<small class="ok-text">בדיקה נרשמה</small>' : ""}
        ${p.kind === "mikvah" && prep ? prepButton(state()) : ""}</div></details>`;
  }

  /* ---------- תזכורת לגיבוי ---------- */
  // היומן שמור רק במכשיר, בלי ענן. תזכורת עדינה במסך ״היום״ כשיש רישומים ולא נשמר גיבוי בתקופה שנבחרה.
  const readJSON = k => { try { return JSON.parse(storage.get(k) || "null"); } catch { return null; } };
  const backupInfo = () => ({ remind: "30", last: "", snooze: "", ...(readJSON(BACKUP_KEY) || {}) });
  const saveBackupInfo = patch => storage.set(BACKUP_KEY, JSON.stringify({ ...backupInfo(), ...patch }));
  const daysSince = iso => { const t = Date.parse(iso || ""); return Number.isFinite(t) ? (Date.now() - t) / 864e5 : Infinity; };
  function backupDue(st) {
    if (app.mode !== "personal" || !st.events.length) return false;
    const b = backupInfo(), every = Number(b.remind) || 0;
    return every > 0 && daysSince(b.last) >= every && daysSince(b.snooze) >= every;
  }
  function backupNudge(st) {
    if (!backupDue(st)) return "";
    const b = backupInfo(), d = Math.floor(daysSince(b.last));
    return `<section class="card nudge" aria-labelledby="nudge-h"><div class="card-h">${I("download")}<div><h3 id="nudge-h">כדאי לשמור גיבוי</h3><p>${Number.isFinite(d) ? `הגיבוי האחרון: לפני ${d} ימים` : "עוד לא נשמר גיבוי"}</p></div><button class="icon-btn" data-act="nudge-x" aria-label="סגירת התזכורת">${I("x", 18)}</button></div>
      <p>היומן שמור רק בטלפון הזה. גיבוי מוצפן מאפשר לשחזר אותו אם הטלפון יאבד או יוחלף.</p>
      <div class="row-btns"><button class="btn sm" data-act="backup">${I("lock", 16)}גיבוי עכשיו</button><button class="btn ghost sm" data-act="nudge-x">לא עכשיו</button></div></section>`;
  }

  const lastBackupLine = () => { const b = backupInfo(); return b.last && Number.isFinite(Date.parse(b.last)) ? `הגיבוי האחרון: ${civilLabel(toISO(new Date(b.last)), true)}` : "עוד לא נשמר גיבוי במכשיר הזה"; };

  /* ---------- נעילה בקוד ---------- */
  // הקוד עצמו לא נשמר: רק גיבוב PBKDF2-SHA256 עם מלח אקראי. ניסיונות שגויים מעכבים בהדרגה (גם אחרי סגירה ופתיחה).
  // שכחת הקוד: הדרך היחידה היא מחיקת כל הנתונים (ואז שחזור מגיבוי מוצפן, אם נשמר).
  const PIN_ITER = 210000, LOCK_DELAYS = [0, 0, 0, 30, 60, 120, 300, 600, 900];
  const b64e = u => btoa(String.fromCharCode(...u)), b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const lockCfg = () => { const c = readJSON(LOCK_KEY); return c && c.hash && c.salt ? c : null; };
  const saveLockCfg = patch => storage.set(LOCK_KEY, JSON.stringify({ ...lockCfg(), ...patch }));
  const failState = () => ({ n: 0, until: 0, ...(readJSON(LOCKFAIL_KEY) || {}) });
  const waitLeft = () => Math.max(0, Math.ceil((failState().until - Date.now()) / 1000));
  const fmtWait = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const BIO = () => NATIVE && PL.BiometricAuthNative ? PL.BiometricAuthNative : null;
  const validPin = p => /^\d{4,6}$/.test(p);
  async function pinHash(pin, salt, iter) {
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, k, 256));
  }
  async function setPin(pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), prev = lockCfg() || { after: 0, bio: false, secure: true };
    const hash = await pinHash(pin, salt, PIN_ITER);
    if (!storage.set(LOCK_KEY, JSON.stringify({ ...prev, v: 1, kdf: "PBKDF2-SHA256", iter: PIN_ITER, salt: b64e(salt), hash: b64e(hash), len: pin.length }))) throw new Error("לא ניתן לשמור את הקוד במכשיר, ולכן הנעילה לא הופעלה.");
    try { localStorage.removeItem(LOCKFAIL_KEY); } catch { /* */ }
  }
  /** בודק קוד מול הגיבוב השמור, עם השהיה הולכת וגדלה אחרי ניסיונות שגויים. מחזיר true / false, או זורק אם צריך להמתין */
  async function checkPin(pin) {
    const c = lockCfg(); if (!c) return true;
    const w = waitLeft(); if (w) throw new Error(L.t(`יותר מדי ניסיונות. אפשר לנסות שוב בעוד ${fmtWait(w)}`));
    const h = await pinHash(pin, b64d(c.salt), c.iter || PIN_ITER), ref = b64d(c.hash);
    let diff = h.length ^ ref.length; for (let i = 0; i < Math.min(h.length, ref.length); i++) diff |= h[i] ^ ref[i];
    if (!diff) { try { localStorage.removeItem(LOCKFAIL_KEY); } catch { /* */ } return true; }
    const f = failState(); f.n += 1; f.until = Date.now() + LOCK_DELAYS[Math.min(f.n, LOCK_DELAYS.length - 1)] * 1000;
    storage.set(LOCKFAIL_KEY, JSON.stringify(f));
    return false;
  }
  /** באנדרואיד: הסתרת התוכן במסך האפליקציות האחרונות (FLAG_SECURE), רק כשהנעילה פעילה */
  function syncSecure() {
    const c = lockCfg();
    if (NATIVE && PL.MaayanPrivacy) PL.MaayanPrivacy.setSecure({ on: !!c && c.secure !== false }).catch(() => {});
    if (window.MaayanWidget) MaayanWidget.update(); // נעילה פעילה = וידג׳ט דיסקרטי, מיד ולא רק בבדיקה הדקתית
  }
  /** יציאה צפויה מהאפליקציה (שיתוף קובץ, בחירת קובץ, הרשאה, טביעת אצבע): לא נועלים בחזרה ממנה */
  const expectAway = () => { app.awayOk = Date.now() + 10 * 60000; };
  function lockNow() {
    if (!lockCfg() || app.locked) return;
    app.locked = true; app.covered = false;
    if (app.modal) app.lockedModal = app.modal;
    app.modal = null; app.toast = ""; app.toastAction = null;
    app.lock = { entry: "", view: "pin", msg: "", bad: false, busy: false };
    render();
    if (lockCfg()?.bio && app.bio?.isAvailable && !document.hidden) setTimeout(tryBio, 350);
  }
  function unlock() {
    app.locked = false; app.lock = null; app.awayOk = 0;
    app.modal = app.lockedModal; app.lockedModal = null;
    render();
    firstRun();
  }
  async function bioAuth() {
    const B = BIO(); if (!B) return false;
    expectAway();
    try {
      await B.internalAuthenticate({ reason: L.t("פתיחת היומן"), cancelTitle: L.t("הזנת קוד"), iosFallbackTitle: L.t("הזנת קוד"), androidTitle: L.t("פתיחת מעיין"), allowDeviceCredential: false, androidConfirmationRequired: false });
      return true;
    } catch { return false; }
  }
  async function tryBio() {
    if (!app.locked || !app.lock || app.lock.busy || app.lock.view !== "pin") return;
    app.lock.busy = true;
    const ok = await bioAuth();
    if (!app.locked) return;
    app.lock.busy = false;
    if (ok) return unlock();
    app.lock.msg = "אפשר להזין את הקוד"; renderLock();
  }
  async function pinDigit(dg) {
    const lk = app.lock, c = lockCfg();
    if (!lk || lk.busy || waitLeft() || !c) return;
    if (dg === "del") { lk.entry = lk.entry.slice(0, -1); lk.bad = false; return renderLock(); }
    if (lk.entry.length >= (c.len || 6)) return;
    lk.entry += dg; lk.bad = false;
    renderLock();
    if (lk.entry.length < (c.len || 6)) return;
    lk.busy = true;
    let ok = false;
    try { ok = await checkPin(lk.entry); } catch (err) { lk.msg = err.message; }
    lk.busy = false;
    if (ok) return unlock();
    lk.entry = ""; lk.bad = true;
    const w = waitLeft();
    lk.msg = "קוד שגוי. נסי שוב"; lk.wasWaiting = !!w;
    try { navigator.vibrate?.(120); } catch { /* */ }
    renderLock();
  }
  function lockScreen() {
    const lk = app.lock || { view: "cover" }, c = lockCfg() || {};
    const logo = `<div class="mark big"><img src="${LOGO_IMG}" alt=""></div>`;
    if (app.covered || lk.view === "cover") return `<div class="lock"><div class="lock-in">${logo}<h2>מעיין</h2></div></div>`;
    if (lk.view === "forgot1") return `<div class="lock" role="dialog" aria-modal="true" aria-labelledby="lock-h"><div class="lock-in wide">${logo}
      <h2 id="lock-h">שכחת את הקוד?</h2>
      <p>אי אפשר לשחזר את הקוד, ואין עותק של היומן בשום שרת. הדרך היחידה להמשיך היא למחוק את כל הנתונים מהמכשיר הזה ולהתחיל מחדש.</p>
      <p class="fine">אם שמרת גיבוי מוצפן, אפשר לשחזר ממנו את היומן אחרי המחיקה: הגדרות ← שחזור מגיבוי, עם סיסמת הגיבוי.</p>
      <div class="stack-s full"><button class="btn danger full" data-act="lock-forgot2">המשך למחיקה</button><button class="btn ghost full" data-act="lock-back">חזרה להזנת הקוד</button></div></div></div>`;
    if (lk.view === "forgot2") return `<div class="lock" role="dialog" aria-modal="true" aria-labelledby="lock-h"><div class="lock-in wide">${logo}
      <h2 id="lock-h">למחוק את כל הנתונים?</h2>
      <p>היומן, ההגדרות, המקומות, הנסיעות והתזכורות יימחקו מהמכשיר לצמיתות. אי אפשר לבטל את זה.</p>
      <div class="stack-s full"><button class="btn danger full" data-act="lock-wipe">${I("trash", 18)}כן, למחוק הכול</button><button class="btn ghost full" data-act="lock-back">ביטול</button></div></div></div>`;
    const len = c.len || 4, w = waitLeft(), bio = c.bio && app.bio?.isAvailable;
    const msg = w ? (lk.bad ? `קוד שגוי. אפשר לנסות שוב בעוד ${fmtWait(w)}` : `יותר מדי ניסיונות. אפשר לנסות שוב בעוד ${fmtWait(w)}`) : lk.msg || "הזיני את הקוד";
    const key = n => `<button class="key" data-pin="${n}"${w ? " disabled" : ""}>${n}</button>`;
    return `<div class="lock" role="dialog" aria-modal="true" aria-labelledby="lock-h"><div class="lock-in">${logo}
      <h2 id="lock-h">מעיין</h2>
      <p class="lock-msg${lk.bad ? " bad" : ""}" role="status" aria-live="polite">${esc(msg)}</p>
      <div class="pin-dots${lk.bad ? " shake" : ""}" role="img" aria-label="הוזנו ${lk.entry.length} מתוך ${len} ספרות">${Array.from({ length: len }, (_, i) => `<i class="${i < lk.entry.length ? "on" : ""}"></i>`).join("")}</div>
      <div class="pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(key).join("")}
        ${bio ? `<button class="key fn" data-act="lock-bio" aria-label="פתיחה בטביעת אצבע או בזיהוי פנים">${I("finger", 30)}</button>` : "<span></span>"}
        ${key(0)}<button class="key fn" data-pin="del" aria-label="מחיקת ספרה"${lk.entry ? "" : " disabled"}>${I("backspace", 28)}</button></div>
      <button class="link" data-act="lock-forgot">שכחתי את הקוד</button></div></div>`;
  }
  function renderLock() {
    // קורא מסך: אחרי כל הקשה המקלדת נבנית מחדש, ולכן מחזירים את המיקוד למקש שהיה ממוקד
    const root = $("#app"), a = document.activeElement, was = a && root.contains(a) ? (a.dataset.pin ? `[data-pin="${a.dataset.pin}"]` : a.dataset.act ? `[data-act="${a.dataset.act}"]` : "") : "";
    root.innerHTML = lockScreen(); L.dom(root);
    if (was) root.querySelector(was)?.focus({ preventScroll: true });
  }
  // ספירה לאחור על מסך הנעילה בזמן המתנה אחרי ניסיונות שגויים
  setInterval(() => { if (app.locked && app.lock?.view === "pin" && (waitLeft() || app.lock.wasWaiting)) { app.lock.wasWaiting = !!waitLeft(); if (!app.lock.wasWaiting) { app.lock.bad = false; app.lock.msg = ""; } renderLock(); } }, 1000);
  function lockSettings() {
    const c = lockCfg(), can = !!globalThis.crypto?.subtle, android = NATIVE && CAP.getPlatform?.() === "android";
    const bioOk = app.bio?.isAvailable;
    return `<label class="toggle" for="lk-on"><span><strong>נעילה בקוד</strong><small>${c ? "היומן נפתח רק אחרי הזנת הקוד" : can ? "קוד של 4–6 ספרות בכל פתיחה של האפליקציה" : "הדפדפן הזה אינו תומך בנעילה (נדרשת כתובת מאובטחת)"}</small></span><input id="lk-on" type="checkbox" role="switch"${c ? " checked" : ""}${can ? "" : " disabled"}></label>
      ${c ? `<div class="lockset">
        <label class="field" for="lk-after">נעילה אחרי יציאה מהאפליקציה<select id="lk-after">${[[0, "מיד"], [60, "אחרי דקה"], [300, "אחרי 5 דקות"]].map(([v, t]) => `<option value="${v}"${Number(c.after || 0) === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        ${NATIVE ? `<label class="toggle" for="lk-bio"><span><strong>פתיחה בטביעת אצבע או בזיהוי פנים</strong><small>${bioOk ? "אם לא מצליח, נפתח עם הקוד" : "לא הוגדרו במכשיר טביעת אצבע או זיהוי פנים"}</small></span><input id="lk-bio" type="checkbox" role="switch"${c.bio && bioOk ? " checked" : ""}${bioOk ? "" : " disabled"}></label>` : ""}
        ${android ? `<label class="toggle" for="lk-secure"><span><strong>הסתרה במסך האפליקציות האחרונות</strong><small>התוכן לא מוצג במעבר בין אפליקציות, וצילומי מסך נחסמים</small></span><input id="lk-secure" type="checkbox" role="switch"${c.secure !== false ? " checked" : ""}></label>` : ""}
        <button class="action" data-act="lock-change">${I("lock", 19)}<span><strong>שינוי הקוד</strong><small>${c.len || 4} ספרות</small></span></button></div>` : ""}`;
  }

  /* ---------- מסכים ---------- */
  function viewToday(st, r, ctx) {
    const date = ctx.date, loc = atLocation(st, date), times = sun(date, loc, st.settings.nightfall);
    const upcoming = r.plans.filter(p => !p.done && new Date(p.end || p.start) >= now()).slice(0, 5);
    const phase = r.phase, cd = r.cleanDay;
    const mk = r.plans.find(p => p.kind === "mikvah"), mikvahNight = !!mk && now() < new Date(new Date(mk.start).valueOf() + 14 * 3600000);
    const C = {
      empty: [app.mode === "personal" && !st.events.length ? "ברוכה הבאה" : "הרישום הראשון", "כדי לחשב מועדים, רשמי את תחילת הווסת: תאריך, שעה ומקום.", "רישום תחילת וסת", "flow"],
      waiting: ["ממתינה להפסק טהרה", r.earliestHefsek ? (r.earliestHefsek > date ? `הפסק טהרה עושים רק כשהדימום פסק בפועל. המועד המוקדם האפשרי: ${hebrew(r.earliestHefsek)}, ${civilLabel(r.earliestHefsek, true)}, לפני השקיעה.` : "אם הדימום פסק, אפשר לעשות הפסק טהרה היום לפני השקיעה. אם לא, ממתינים ומנסים שוב ביום שאחריו.") : "חסר מידע כדי לחשב את מועד ההפסק. פרטים בנקודות לבירור.", "רישום הפסק טהרה", "hefsek"],
      clean: [cd ? `יום ${cd} מתוך 7` : "הפסק טהרה נרשם", cd === 7 && mk ? `היום השביעי. ליל הטבילה המתוכנן: הלילה, אחרי צאת הכוכבים (${timeInZone(new Date(mk.start), city(mk.cityId).tz)}), בכפוף לבדיקות ולבירור הנקודות הפתוחות.` : cd ? "שבעה נקיים לפי ההפסק שנרשם." : "יום הספירה הראשון מתחיל בתאריך העברי הבא.", "רישום בדיקה", "bedikah"],
      planned: mikvahNight ? ["ליל הטבילה", `הספירה הושלמה. הטבילה אחרי צאת הכוכבים (${timeInZone(new Date(mk.start), city(mk.cityId).tz)}), בכפוף לבדיקות ולבירור הנקודות הפתוחות. אחרי הטבילה רושמים אותה כאן.`, "רישום טבילה", "mikvah"]
        : ["הטבילה המתוכננת עדיין לא נרשמה", "אם הטבילה התקיימה, רושמים אותה כאן. עד שתירשם, היומן מחשב כאילו לא הייתה טבילה.", "רישום טבילה", "mikvah"],
      immersed: ["טבילה נרשמה", "המועדים הקרובים מופיעים למטה ובלוח השנה.", "רישום חדש", "note"],
    }[phase];
    const heroPhase = phase === "planned" && mikvahNight ? "mikvah" : phase;
    const days = phase === "clean" ? `<ol class="seven" aria-label="שבעת הימים">${[1, 2, 3, 4, 5, 6, 7].map(d =>
      `<li class="${d < cd ? "past" : ""}${d === cd ? " now" : ""}"><span>${r.checks[d]?.length ? I("check", 15) : d}</span><small>${d === cd ? "היום" : "יום " + d}</small></li>`).join("")}</ol>` : "";
    // טבעת מקוטעת לשבעה נקיים: מקטע לכל יום; בשאר המצבים — סמל המצב
    const seg = (i, cls) => `<circle class="${cls}" cx="52" cy="52" r="44" pathLength="700" stroke-dasharray="64 636" transform="rotate(${-90 + i * 360 / 7 + 9.3} 52 52)"/>`;
    const ring = phase === "clean" && cd ? `<div class="ring" role="img" aria-label="יום ${cd} מתוך 7"><svg viewBox="0 0 104 104" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8668f"/><stop offset="1" stop-color="#8c5be0"/></linearGradient></defs>${[0, 1, 2, 3, 4, 5, 6].map(i => seg(i, i + 1 < cd ? "on" : i + 1 === cd ? "now" : "off")).join("")}</svg><span aria-hidden="true"><strong>${cd}</strong><small>מתוך 7</small></span></div>`
      : `<div class="ring idle">${I({ waiting: "hourglass", planned: "mikvah", immersed: "spring", empty: "spring" }[phase] || "spring", 34)}</div>`;
    const next = upcoming[0];
    const nextLine = next ? (() => {
      const c = city(next.cityId), when = new Date(next.start), dayDiff = M.isoAbs(next.date) - M.isoAbs(date);
      const rel = dayDiff <= 0 ? (when < now() ? "עכשיו" : next.onah === "day" ? "היום" : "הלילה") : dayDiff === 1 ? "מחר" : `בעוד ${dayDiff} ימים`;
      return `<button class="next tone-${planTone(next.kind)}" data-go="dates"><span class="plan-ic">${I(planIcon(next), 20)}</span><span class="next-main"><small class="next-l"><span>המועד הבא</span> · <span>${rel}</span></small><strong>${esc(planTitle(next))}</strong><small class="hebdate">${esc(next.onah === "day" ? planHebrew(next) : `ליל ${planHebrew(next)}`)}</small></span><time dir="ltr">${timeInZone(when, c.tz)}</time>${I("left", 16)}</button>`;
    })() : "";
    const first = app.mode === "personal" && !st.events.length;
    // הכנות לטבילה: רק ביום השביעי ובליל הטבילה, ככפתור שפותח את הרשימה (לא כרשימה קבועה במסך)
    const prepNow = !first && ((phase === "clean" && cd === 7) || (phase === "planned" && mikvahNight));
    return `
    <div class="today">
      <section class="hero" data-phase="${heroPhase}">
        <div class="hero-row"><div class="hero-copy">
          <span class="chip-phase"><i class="phase-dot"></i>${first ? "היומן שלך ריק" : esc(phase === "planned" && mikvahNight ? "ליל הטבילה" : PHASE_NAMES[phase])}</span>
          <h2>${esc(C[0])}</h2><p>${esc(first ? "כדאי להתחיל מהזנת המחזורים האחרונים (לפחות שניים), כדי שההפלגה ועונת החודש יחושבו נכון." : C[1])}</p>
        </div>${ring}</div>${days}
        ${first ? `<div class="first-btns"><button class="btn" data-act="cycle">${I("calendar", 18)}הזנת מחזורים קודמים</button><div class="row-btns"><button class="btn ghost sm" data-go="prefs">${I("sliders", 16)}המנהג שלי</button><button class="btn ghost sm" data-act="demo">${I("flask", 16)}יומן לדוגמה</button></div></div>` : ""}
        ${nextLine}
        ${prepNow ? prepButton(st, "prep-btn") : ""}
      </section>
      ${backupNudge(st)}
      ${methodCard(st)}
      ${first && st.settings.methodChosen && !methodCardDue(st) ? `<section class="card method"><div class="card-h">${I("scale")}<div><h3>המנהג שלי</h3><p>${esc(M.SETTING_LABELS.method[st.settings.method] || M.SETTING_LABELS.method.custom)}${M.presetDiff(st.settings).length ? " · הותאם אישית" : ""}</p></div></div>
        <ul class="method-sum">${M.settingsSummary(st.settings).filter(x => /^(המתנה|הפלגה|עונה בינונית|יום 31|אור זרוע)/.test(x)).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <button class="btn ghost full" data-go="prefs">${I("sliders", 17)}התאמה אישית לפי הוראת הרב</button></section>` : ""}
      ${r.reviews.length ? `<button class="notice${askFirst(r.reviews)[0].ask ? " ask" : ""}" data-go="journal"><span class="notice-ic">${I("help", 20)}</span><span><strong>${r.reviews.length} ${r.reviews.length === 1 ? "נקודה לבירור" : "נקודות לבירור"}</strong><small>${esc(askFirst(r.reviews).slice(0, 2).map(reviewHead).join(" · "))}</small></span>${I("left", 16)}</button>` : ""}
      <section class="card upcoming"><div class="card-h"><h3>מועדים קרובים</h3><button class="link" data-go="dates">הכול ${I("left", 14)}</button></div>
        ${upcoming.length > 1 ? `<div class="plans">${upcoming.slice(1).map(p => planLine(p, { compact: true })).join("")}</div>` : `<p class="empty">${upcoming.length ? "אין מועדים נוספים בקרוב." : first ? "המועדים יופיעו כאן אחרי הרישום הראשון." : "אין מועדים קרובים."}</p>`}
      </section>
      <section class="card times" aria-labelledby="times-h">
        <div class="card-h"><h3 id="times-h">זמני היום</h3><small class="times-where">${I("pin", 14)}${esc(loc.name)}</small></div>
        <dl>${[["זריחה", "sunrise", times.sunrise], ["שקיעה", "sunset", times.sunset], ["צאת הכוכבים", "moon", times.nightfall]].map(([n, ic, v]) =>
          `<div class="t-${ic}"><dt>${I(ic, 20)}<span>${n}</span></dt><dd dir="ltr">${timeInZone(v, loc.tz)}</dd></div>`).join("")}</dl>
        <p class="fine">בגובה פני הים · מעוגל לחומרא · צאת הכוכבים: ${esc(M.nightfallLabel(st.settings.nightfall))}</p>
      </section>
    </div>`;
  }
  function viewCalendar(st, r, ctx) {
    const c = app.cal; c.cursor ||= ctx.date; c.selected ||= ctx.date;
    let first, next;
    if (c.mode === "hebrew") { const h = hd(c.cursor); const f = new HDate(1, h.getMonth(), h.getFullYear()); first = fromAbs(f.abs()); next = fromAbs(f.add(1, "M").abs()); }
    else { const d = fromISO(c.cursor); first = toISO(new Date(d.getFullYear(), d.getMonth(), 1, 12)); next = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)); }
    const offset = fromISO(first).getDay(), len = M.isoAbs(next) - M.isoAbs(first);
    const start = addDays(first, -offset), cells = Math.ceil((offset + len) / 7) * 7;
    const ranges = dayRanges(st, r, ctx.date);
    const title = c.mode === "hebrew" ? hebMonthTitle(first) : civilMonthTitle(first);
    const dayCells = Array.from({ length: cells }, (_, i) => {
      const d = addDays(start, i), ents = st.events.filter(e => e.date === d), pl = r.plans.filter(p => p.date === d);
      const out = d < first || d >= next, abs = M.isoAbs(d), clean = ranges.clean.has(abs), niddah = !clean && ranges.niddah.has(abs);
      const flags = [ents.some(e => e.type === "flow") && "f", ents.some(e => e.type === "hefsek" || e.type === "bedikah") && "c", pl.some(p => SEP_KINDS.includes(p.kind)) && "s", pl.some(p => p.kind === "or-zarua") && "z", pl.some(p => p.kind === "mikvah") && "m"].filter(Boolean);
      const main = c.mode === "civil" ? fromISO(d).getDate() : hebDay(d), sub = c.mode === "civil" ? hebDay(d) : fromISO(d).getDate();
      return `<button class="day${out ? " out" : ""}${d === ctx.date ? " today" : ""}${d === c.selected ? " sel" : ""}${clean ? " clean" : ""}${niddah ? " niddah" : ""}${flags.includes("s") ? " sep" : ""}${flags.includes("z") ? " oz" : ""}${flags.includes("m") ? " mik" : ""}" data-day="${d}" aria-label="${esc(civilLabel(d))}, ${esc(hebrew(d))}${niddah ? ", ימי וסת" : ""}${clean ? ", שבעה נקיים" : ""}${ents.length ? `, ${ents.length} רישומים` : ""}${pl.length ? `, ${pl.length} מועדים` : ""}" aria-pressed="${d === c.selected}">
        <b>${main}</b><i>${sub}</i><span class="dots">${flags.map(f => `<em class="d-${f}"></em>`).join("")}</span></button>`;
    }).join("");
    const sel = c.selected, ents = M.sorted(st.events.filter(e => e.date === sel)), pl = r.plans.filter(p => p.date === sel);
    return `<div class="cal-layout"><section class="card cal">
      <div class="cal-h"><h3>${esc(title)}</h3><div class="cal-nav">
        <button class="icon-btn" data-cal="-1" aria-label="החודש הקודם">${I("right")}</button>
        <button class="link" data-cal="today">היום</button>
        <button class="icon-btn" data-cal="1" aria-label="החודש הבא">${I("left")}</button></div></div>
      <div class="seg" role="group" aria-label="סוג לוח"><button data-calmode="civil" aria-pressed="${c.mode === "civil"}">לועזי</button><button data-calmode="hebrew" aria-pressed="${c.mode === "hebrew"}">עברי</button></div>
      <div class="wk" aria-hidden="true">${weekHeads().map(w => `<span>${w}</span>`).join("")}</div>
      <div class="days">${dayCells}</div>
      <div class="legend" role="list" aria-label="מקרא"><span role="listitem"><i class="sw sw-niddah"></i>ימי וסת עד ההפסק</span><span role="listitem"><i class="sw sw-clean"></i>שבעה נקיים</span><span role="listitem"><em class="d-s"></em>עונת פרישה</span>${st.settings.orZarua ? `<span role="listitem"><em class="d-z"></em>עונת אור זרוע</span>` : ""}<span role="listitem"><em class="d-m"></em>טבילה</span><span role="listitem"><em class="d-f"></em>וסת נרשמה</span><span role="listitem"><em class="d-c"></em>הפסק או בדיקה</span></div>
      <p class="fine">הצבעים מבוססים על הרישומים שלך ועל המועדים המחושבים. התאריך העברי במשבצת שייך לשעות היום; בשקיעה מתחיל התאריך העברי הבא.</p>
    </section>
    <section class="card dayp"><div class="card-h"><div><h3>${esc(weekdayName(sel))}, ${esc(civilLabel(sel))}</h3><p class="hebdate">${esc(hebrew(sel))} · שעות היום</p></div></div>
      ${ents.map(entryRow).join("")}${pl.length ? `<div class="plans">${pl.map(p => planLine(p, { compact: true })).join("")}</div>` : ""}
      ${!ents.length && !pl.length ? `<p class="empty">אין רישומים או מועדים ביום הזה.</p>` : ""}
      <p class="fine day-hint">לחיצה ארוכה על יום בלוח פותחת רישום ליום הזה.</p></section></div>`;
  }
  /** טווחי ימים לצביעת הלוח, רק מתוך הרישומים: מתחילת וסת עד ההפסק, ושבעה נקיים אחרי הפסק (הנוכחי לפי המנוע, וקודמים שנרשמה אחריהם טבילה) */
  function dayRanges(st, r, todayISO) {
    const niddah = new Set(), clean = new Set(), today = M.isoAbs(todayISO);
    const evs = M.sorted(st.events), flows = evs.filter(e => e.type === "flow").map(e => M.isoAbs(e.date));
    const hefs = evs.filter(e => e.type === "hefsek" && e.result === "clear").map(e => M.isoAbs(e.date)), miks = evs.filter(e => e.type === "mikvah").map(e => M.isoAbs(e.date));
    flows.forEach((f, i) => {
      const nextFlow = flows[i + 1] ?? Infinity, h = hefs.find(x => x >= f && x < nextFlow);
      const end = h ?? (nextFlow === Infinity ? Math.min(today, f + 40) : f);
      for (let a = f; a <= end && a < nextFlow; a++) niddah.add(a);
      const ok = h !== undefined && ((r.hefsek && M.isoAbs(r.hefsek.date) === h) || miks.some(m => m > h && m < nextFlow));
      if (ok) for (let a = h + 1; a <= h + 7 && a < nextFlow; a++) clean.add(a);
    });
    return { niddah, clean };
  }
  function entryRow(e) {
    let h = "זמן לבירור", onah = "";
    try { const s = M.stamp(e); h = s.hebrewDate; onah = s.onah === "day" ? "יום" : "לילה"; } catch { /* מסומן לבירור */ }
    const status = e.result === "uncertain" ? "ממתין לבירור" : e.result === "bleeding" ? "נרשמה כלא נקייה" : city(e.cityId).name;
    return `<button class="entry" data-edit="${e.id}"><span class="ev-ic t-${e.type}">${I(e.type === "flow" ? "droplet" : e.type === "mikvah" ? "mikvah" : e.type === "bedikah" ? "bedikah" : e.type === "hefsek" ? "hefsek" : "book", 19)}</span>
      <span class="entry-main"><strong>${esc(EVENT_NAMES[e.type])}</strong><small>${esc(civilLabel(e.date, true))} · <span dir="ltr">${e.time}</span> · <span class="hebdate">${esc(h)}</span>${onah ? ` · ${onah}` : ""}${e.foundOnWaking ? " · נמצא בהתעוררות" : ""}</small>${e.note ? `<small class="note" data-nt>${esc(e.note)}</small>` : ""}</span>
      <span class="entry-side"><small>${esc(status)}</small>${I("pencil", 15)}</span></button>`;
  }

  function viewJournal(st, r) {
    const q = app.query.trim().toLowerCase();
    const evs = [...st.events].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .filter(e => (app.filter === "all" || e.type === app.filter) && (!q || `${EVENT_NAMES[e.type]} ${e.date} ${e.note} ${hebrew(e.date)}`.toLowerCase().includes(q)));
    return `${r.reviews.length ? `<section class="card reviews"><div class="card-h">${I("help")}<h3>נקודות לבירור <span class="count">${r.reviews.length}</span></h3></div>
      <p class="fine">המערכת אינה מכריעה בנקודות אלה. כל נקודה מפנה לרישומים הנוגעים בה.</p>
      ${askFirst(r.reviews).map(v => `<details${v.ask ? ` class="ask" data-review="${esc(v.id)}"` : ` data-review="${esc(v.id)}"`}><summary>${v.ask ? `<span class="ask-ic">${I("scale", 16)}</span>` : ""}<span class="rv-t">${esc(v.title)}</span>${I("left", 15)}</summary>${reviewBody(v)}${v.eventIds.map(id => { const e = st.events.find(x => x.id === id); return e ? `<button class="link" data-edit="${id}">${esc(EVENT_NAMES[e.type])} · ${esc(civilLabel(e.date, true))} ${I("pencil", 13)}</button>` : ""; }).join("")}</details>`).join("")}</section>` : ""}
    <section class="card"><div class="card-h">${I("book")}<h3>רישומים <span class="count">${st.events.length}</span></h3><button class="link" data-act="report">${I("file", 15)}דוח לבירור</button></div>
      <div class="filters"><label class="search">${I("search", 17)}<input id="q" type="search" placeholder="חיפוש לפי תאריך או הערה" value="${esc(app.query)}" aria-label="חיפוש"></label>
      <select id="filter" aria-label="סינון לפי סוג"><option value="all">כל הסוגים</option>${Object.entries(EVENT_NAMES).map(([v, n]) => `<option value="${v}"${app.filter === v ? " selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="entries">${evs.slice(0, app.jLimit).map(entryRow).join("") || (st.events.length ? `<p class="empty">לא נמצאו רישומים מתאימים.</p>` : `<div class="empty-state">${I("book", 30)}<strong>אין עדיין רישומים</strong><p>כל רישום — וסת, הפסק, בדיקה או טבילה — יופיע כאן, מהחדש לישן.</p></div>`)}</div>
      ${evs.length > app.jLimit ? `<button class="btn ghost full" data-act="more">הצגת רישומים קודמים (${evs.length - app.jLimit} נוספים)</button>` : ""}
      <button class="btn ghost full" data-act="cycle">${I("calendar", 17)}הזנת מחזור קודם</button></section>`;
  }

  function viewDates(st, r) {
    const n = now(), up = r.plans.filter(p => !p.done && new Date(p.end || p.start) >= n), past = r.plans.filter(p => !up.includes(p));
    return `<div class="two"><section class="card"><div class="card-h">${I("bell")}<h3>מועדים עתידיים <span class="count">${up.length}</span></h3></div>
      ${up.length ? `<div class="plans">${up.map(p => planLine(p)).join("")}</div>` : `<div class="empty-state">${I("bell", 30)}<strong>אין מועדים עתידיים כרגע</strong><p>${st.events.length ? "מועדים חדשים יחושבו מהרישומים הבאים." : "אחרי רישום תחילת וסת יופיעו כאן עונות הפרישה, ההפסק והבדיקות."}</p></div>`}
      ${past.length ? `<details class="past"><summary>מועדים שעברו או שהושלמו (${past.length})${I("left", 15)}</summary><div class="plans">${past.map(p => planLine(p)).join("")}</div></details>` : ""}
      <p class="fine">כל מועד הוא תכנון לפי השיטה שנבחרה בהגדרות. לחיצה על מועד מציגה את הכלל.</p></section>
    <aside class="stack"><section class="card"><div class="card-h">${I("calendar")}<h3>ייצוא ליומן הטלפון</h3></div>
      <p>קובץ מועדים עם התראות, לייבוא ליומן Google או לכל יומן אחר. ${st.settings.neutralReminders ? "הנוסח דיסקרטי: ״תזכורת אישית״ בלבד." : "הנוסח המלא מופיע בקובץ."}</p>
      <button class="btn full" data-act="ics" ${up.length ? "" : "disabled"}>${I("download", 17)}קובץ מועדים</button>
      <p class="fine">אחרי שינוי ברישומים צריך לייצא שוב.</p></section>
      <section class="card"><div class="card-h">${I("bell")}<h3>התראות במכשיר</h3></div>
      ${NATIVE ? `<p>ההתראות מגיעות גם כשהאפליקציה סגורה. הן מתעדכנות בכל שינוי ביומן.</p>${app.permission === "granted" ? `<p class="fine">מתוזמנות כרגע: ${app.scheduled} התראות${st.settings.remindersEnabled ? "" : " (התזכורות כבויות בהגדרות)"}</p>` : ""}${app.permission === "granted" && app.exact === false ? `<button class="link" data-act="exact">${I("bell", 15)}אישור התראות בזמן מדויק</button>` : ""}`
        : `<p>התראה מוצגת כשהיומן פתוח, בכפוף להרשאת הדפדפן. באפליקציית האנדרואיד ההתראות מגיעות גם כשהיא סגורה.</p>`}
      <button class="btn ghost full" data-act="notify" ${app.permission === "granted" || app.permission === "unsupported" ? "disabled" : ""}>${app.permission === "granted" ? I("check", 17) + "ההרשאה פעילה" : app.permission === "unsupported" ? "הדפדפן אינו תומך" : "הפעלת התראות"}</button></section></aside></div>`;
  }

  const SETTINGS_FIELDS = s => `
    <section class="card"><div class="card-h">${I("pin")}<div><h3>מקום</h3><p>עיר ברירת המחדל לזמני היום</p></div></div>
      <label class="field" for="s-city">עיר מגורים<select id="s-city" name="cityId">${placeOptions(state(), s.cityId)}</select></label>
      <button class="btn ghost full" type="button" data-act="locate">${I("pin", 17)}זיהוי המיקום שלי</button>
      ${(state().places || []).map(pl => `<div class="trip"><span><strong>${esc(pl.name)}</strong><small dir="ltr">${pl.lat.toFixed(3)}, ${pl.lon.toFixed(3)} · ${esc(pl.tz)}</small></span><button class="icon-btn" type="button" data-delplace="${pl.id}" aria-label="מחיקת מקום">${I("trash", 17)}</button></div>`).join("")}
      <p class="fine">זיהוי המיקום נעשה רק בלחיצה, והמיקום נשמר במכשיר בלבד. לכל רישום נשמר המקום שלו, ושינוי העיר אינו משנה רישומים קודמים.</p></section>
    <section class="card"><div class="card-h">${I("scale")}<div><h3>המנהג שלי</h3><p>לבחור לפי ההנחיה שקיבלת</p></div></div>
      ${methodChooser(s, "prefs")}
      <p class="mc-sum">${esc(M.settingsSummary(s)[0])}</p>
      ${methodNotes(s)}
      <details class="custom-set" data-keep="custom"${app.keep.has("custom") ? " open" : ""}><summary><span>התאמה אישית לפי הוראת הרב</span>${M.presetDiff(s).length ? `<span class="count">הותאם אישית</span>` : ""}${I("left", 15)}</summary>
      <p class="fine">הערכים נקבעים לפי המנהג שנבחר. אפשר לשנות כל הגדרה לפי הוראת הרב.</p>
      ${sel("wait", "ימי המתנה לפני ההפסק", s, [["five", "חמישה ימים"], ["four", "ארבעה ימים"], ["four-from-relations", "ארבעה ימים מהיחסים האחרונים (לפי הוראה)"]])}
      ${sel("haflagah", "ספירת ההפלגה", s, [["days", "בימים"], ["chabad-onot", "בעונות, מההפסק (חב״ד)"]])}
      ${sel("beinonit", "יום 30", s, [["same", "רק העונה שבה התחילה הווסת"], ["both", "יממה שלמה (לילה ויום)"]])}
      ${tog("day31", "לחשוש גם ליום 31", "לפי המנהג או ההנחיה", s)}<div class="oz-box">${tog("orZarua", "אור זרוע (גם העונה שלפני)", "העונה שלפני כל עונת פרישה, לפי הוראת הרב", s)}</div>
      ${tog("carryLongIntervals", "הפלגה ארוכה נשארת גם אחרי הפלגה קצרה", "בספירה בימים, כשווסת חדשה מקדימה את החשש הקודם", s)}
      ${tog("carryMonthly", "עונת חודש שחלה בימי הווסת", "נשמרת. דורש תיעוד מלא של הווסת וההפסק", s)}
      ${sel("missingMonthly", "ראתה בל׳, ובחודש הבא אין ל׳", s, [["first-next-month", "א׳ בחודש שאחריו"], ["skip", "בלי עונת חודש"]])}
      ${sel("bedikot", "תזכורות לבדיקות", s, [["twice", "בוקר וערב, כל יום"], ["first-last", "ביום הראשון וביום השביעי (לפי הוראה)"]])}
      ${sel("nightfall", "צאת הכוכבים", s, [["8.5", "8.5° מתחת לאופק"], ["7.083", "7.083° מתחת לאופק"], ["13.5z", "13.5 דקות זמניות אחרי השקיעה (הגאונים)"], ["18m", "18 דקות אחרי השקיעה"], ["20m", "20 דקות אחרי השקיעה"]])}
      ${sel("beinHashmashot", "ראייה סמוך לשקיעה או בין השמשות", s, [["both", "לחשוש לשתי העונות"], ["flag", "לסמן לבירור, בלי חישוב"]])}
      ${sel("hefsekTwilight", "הפסק טהרה אחרי השקיעה", s, [["before-sunset", "רק לפני השקיעה"], ["ovadia", "בדיעבד, עד 13.5 דקות זמניות אחרי השקיעה"]])}
      ${s.method !== "custom" ? `<button type="button" class="link mc-none" data-method="custom">${I("sliders", 15)}בלי מנהג מוכן: כל ההגדרות ידנית</button>` : ""}</details>
      ${sel("special", "מצב מיוחד", s, [["regular", "מחזור רגיל"], ["pregnancy", "היריון"], ["postpartum", "אחרי לידה"], ["nursing", "הנקה"], ["hormonal", "טיפול הורמונלי / אמצעי מניעה"]])}
      <p class="fine">במצב מיוחד החישובים הרגילים מושעים, ואפשר לרשום עונות לפי הוראה.</p>
      <label class="field" for="s-methodNote"><span>שם הרב או המדריכה <span class="opt">לא חובה</span></span><textarea id="s-methodNote" name="methodNote" rows="2" maxlength="1000" placeholder="למשל: הרב של הקהילה, או מדריכת הכלות">${esc(s.methodNote)}</textarea></label></section>
    <section class="card"><div class="card-h">${I("bell")}<div><h3>תזכורות</h3></div></div>
      ${tog("remindersEnabled", "התראות כשהיומן פתוח", "דורש הרשאה מהדפדפן", s)}${tog("neutralReminders", "נוסח דיסקרטי", "״תזכורת אישית״ בלי פירוט", s)}
      <div class="pair end"><label class="field" for="s-reminderMinutes">תזכורת לפני השקיעה (דקות)<input id="s-reminderMinutes" name="reminderMinutes" type="number" min="5" max="120" value="${s.reminderMinutes}" inputmode="numeric"></label>
      <label class="field" for="s-morningTime">שעת בדיקת בוקר<input id="s-morningTime" name="morningTime" type="time" value="${s.morningTime}"></label></div></section>${WIDGET_FIELDS(s)}`;
  /* ---------- וידג׳ט למסך הבית (src/widget.js): רק באנדרואיד וביומן האישי; כבוי כברירת מחדל ---------- */
  const WIDGET_FIELDS = s => !(NATIVE && CAP.getPlatform && CAP.getPlatform() === "android" && app.mode === "personal") ? "" : `
    <section class="card"><div class="card-h">${I("home")}<div><h3>וידג׳ט במסך הבית</h3><p>גלוי לכל מי שרואה את הטלפון. כבוי כברירת מחדל</p></div></div>
      ${tog("widgetEnabled", "הצגת מצב בווידג׳ט", "אחרי ההפעלה: לחיצה ארוכה על מסך הבית ← ווידג׳טים ← מעיין", s)}
      ${sel("widgetStyle", "נוסח הווידג׳ט", s, [["discreet", "דיסקרטי: ״תזכורת אישית״ וספירת ימים"], ["full", "מלא: שם המועד והשעה"]])}
      <p class="fine">כשנעילת האפליקציה פעילה, הווידג׳ט תמיד דיסקרטי. לחיצה על הווידג׳ט פותחת את היומן.</p></section>`;
  /** שורה קצרה לכל שיטה בבחירה. הפירוט והמקורות של כל ערך נמצאים במסמכי הרב (docs/halacha), לא כאן */
  const METHOD_LINES = {
    sefard: "לפי פסקי טהרת הבית.",
    "sefard-bic": "כמו הרב עובדיה, ובנוסף אור זרוע.",
    ashkenaz: "יום 30 ו־31, ואור זרוע.",
    "ashkenaz-kreiti": "כמו הרגיל, והעונה הבינונית יממה שלמה.",
    chabad: "לפי שולחן ערוך הרב.",
  };
  /** בחירת שיטה בשני שלבים: מה המנהג (ספרדי / אשכנזי / חב״ד), ואז לפי מי. בחב״ד אין שלב שני. */
  function methodChooser(s, where, family) {
    const P = M.METHOD_PRESETS, fam = family !== undefined ? family : app.methodFamily || M.methodFamily(s.method), F = M.METHOD_FAMILIES.find(f => f.id === fam);
    const card = m => `<button type="button" class="mc-card" role="radio" aria-checked="${s.method === m}" data-method="${m}"><span class="mc-dot" aria-hidden="true"></span><span class="mc-body"><strong>${esc(P[m].name)}</strong><small>${esc(METHOD_LINES[m])}</small></span></button>`;
    const one = m => `<div class="mc-card on mc-only"><span class="mc-body"><strong>${esc(P[m].name)}</strong><small>${esc(METHOD_LINES[m])}</small></span></div>`;
    return `<div class="mchoose">
      <div class="mc-step"><p class="mc-q" id="mc1-${where}"><span class="mc-n">1</span>מה המנהג שלך?</p>
        <div class="seg" role="radiogroup" aria-labelledby="mc1-${where}">${M.METHOD_FAMILIES.map(f => `<button type="button" class="seg-b" role="radio" aria-checked="${f.id === fam}" data-family="${f.id}">${esc(f.label)}</button>`).join("")}</div></div>
      ${!F ? "" : F.methods.length > 1 ? `<div class="mc-step"><p class="mc-q" id="mc2-${where}"><span class="mc-n">2</span>${esc(F.ask)}</p>
        <div class="mc-opts" role="radiogroup" aria-labelledby="mc2-${where}">${F.methods.map(card).join("")}</div></div>` : `<div class="mc-step">${one(F.methods[0])}</div>`}
    </div>`;
  }
  function chooseMethod(m) {
    const st = state(); app.methodFamily = null;
    if (m === "custom") dismissMethodCard();
    if (st.settings.method === m && !M.presetDiff(st.settings).length) return render();
    try { commit({ ...st, settings: M.applyPreset(st.settings, m) }); } catch (err) { toast(err.message); render(); }
  }
  function chooseFamily(id) {
    const F = M.METHOD_FAMILIES.find(f => f.id === id); if (!F) return;
    if (F.methods.length === 1) return chooseMethod(F.methods[0]);
    app.methodFamily = M.methodFamily(state().settings.method) === id ? null : id; render();
  }
  /* ---------- בחירת מנהג בכניסה הראשונה ----------
   * יומן אישי חדש (methodChosen: false) אינו מחושב ואינו שמיש עד שבוחרים מנהג: ברוכה הבאה ← התחלת יומן ← ״המנהג שלי״ ← המשך.
   * יומן קיים (גם עם ״התאמה אישית״) אינו מחויב: לכל היותר כרטיס עדין ״בחרי את המנהג שלך״ במסך היום, שאפשר לסגור. */
  const needsMethod = () => app.mode === "personal" && !app.locked && !app.covered && app.personal?.settings.methodChosen === false;
  /** פותח את ברוכה הבאה או את בחירת המנהג, כשצריך. לא במסך הבודקים, כדי שבודק יוכל להגיע לתרחישים */
  function firstRun() {
    if (app.locked || app.covered || app.modal) return;
    if (needsMethod() && app.tab !== "review") app.modal = storage.get(SEEN_KEY) ? onboardModal() : { kind: "welcome" };
    else if (app.mode === "personal" && !storage.get(SEEN_KEY) && !app.personal.events.length) app.modal = { kind: "welcome" };
    if (app.modal) renderModal();
  }
  const onboardModal = () => ({ kind: "onboard", family: null, method: null });
  /** בחירה בתוך מסך הפתיחה: נשמרת רק בלחיצה על ״המשך״ */
  function onboardPick(d) {
    const m = app.modal;
    if (d.family) { const F = M.METHOD_FAMILIES.find(f => f.id === d.family); if (!F) return; m.family = F.id; m.method = F.methods.length === 1 ? F.methods[0] : F.methods.includes(m.method) ? m.method : null; }
    else if (d.method && M.METHOD_PRESETS[d.method]) { m.method = d.method; m.family = M.methodFamily(d.method); }
    renderModal(); document.querySelector(`#modal [data-${d.family ? "family" : "method"}="${d.family || d.method}"]`)?.focus({ preventScroll: true });
  }
  function onboardDone() {
    const m = app.modal; if (!m || !M.METHOD_PRESETS[m.method]) return;
    const st = app.personal;
    markSeen(); app.modal = null; app.methodFamily = null; app.tab = "today";
    try { commit({ ...st, settings: M.applyPreset(st.settings, m.method) }); } catch (err) { app.modal = m; toast(err.message); render(); renderModal(); return; }
    renderModal(); window.scrollTo(0, 0);
  }
  const onboardBody = m => `<div class="onboard">
      <div class="ob-h"><span class="ob-ic">${I("scale", 22)}</span><h2 id="m-title" tabindex="-1" autofocus>המנהג שלי</h2>
        <p>לבחור לפי ההנחיה שקיבלת. לפי המנהג מעיין קובעת את כל החישובים, ואפשר לשנות אותו בכל עת בהגדרות.</p></div>
      ${methodChooser({ method: m.method || "" }, "onboard", m.family)}
      <div class="stack-s"><button class="btn full" data-act="onboard-done"${M.METHOD_PRESETS[m.method] ? "" : " disabled"}>המשך${I("left", 18)}</button>
      <button class="link ob-back" data-act="onboard-back">${I("right", 15)}חזרה</button></div>
      <p class="fine">יש הוראה אחרת מהרב? בוחרים את הקרוב ביותר, ואחר כך משנים בהגדרות, תחת ״התאמה אישית לפי הוראת הרב״.</p></div>`;
  /** יומן קיים עם ״התאמה אישית״ (מגרסה קודמת): הצעה עדינה לבחור מנהג, פעם אחת */
  const methodCardDue = st => app.mode === "personal" && st.settings.methodChosen && st.settings.method === "custom" && !storage.get(METHODCARD_KEY);
  const dismissMethodCard = () => storage.set(METHODCARD_KEY, "1");
  const methodCard = st => !methodCardDue(st) ? "" : `<section class="card nudge" aria-labelledby="mcard-h"><div class="card-h">${I("scale")}<div><h3 id="mcard-h">בחרי את המנהג שלך</h3><p>היומן מחושב עכשיו לפי ״התאמה אישית״</p></div><button class="icon-btn" data-act="method-card-x" aria-label="סגירה">${I("x", 18)}</button></div>
      <p>אפשר לבחור מנהג מוכן (ספרדי, אשכנזי או חב״ד), או להשאיר את ההגדרות שלך כמו שהן.</p>
      <div class="row-btns"><button class="btn sm" data-act="method-card-go">${I("sliders", 16)}בחירת מנהג</button><button class="btn ghost sm" data-act="method-card-x">להשאיר כך</button></div></section>`;
  /** מתחת לבחירה: רק כשלא נבחרה שיטה, או כשההגדרות הותאמו אישית */
  function methodNotes(s) {
    if (!M.METHOD_PRESETS[s.method]) return `<p class="fine">לא נבחר מנהג מוכן: כל ההגדרות נקבעות ידנית, תחת ״התאמה אישית לפי הוראת הרב״.</p>`;
    return M.presetDiff(s).length ? `<p class="fine">הותאם אישית. בחירה מחדש של השיטה מחזירה את ערכיה.</p>` : "";
  }
  const sel = (name, label, s, opts) => `<label class="field" for="s-${name}">${label}<select id="s-${name}" name="${name}">${opts.map(([v, t]) => `<option value="${v}"${s[name] === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
  const tog = (name, label, detail, s) => `<label class="toggle" for="s-${name}"><span><strong>${label}</strong><small>${detail}</small></span><input id="s-${name}" name="${name}" type="checkbox" role="switch"${s[name] ? " checked" : ""}></label>`;

  function viewPrefs(st) {
    const where = app.mode === "personal" ? "היומן האישי" : app.mode === "scenario" ? "התרחיש הפתוח בלבד" : "היומן לדוגמה בלבד";
    return `<div class="two"><form id="settings-form" class="stack">${SETTINGS_FIELDS(st.settings)}
      <p class="autosave">${I("check", 15)}<span>כל שינוי נשמר מיד ויחול על ${where}</span></p></form>
    <aside class="stack">
      <section class="card" id="backup-card"><div class="card-h">${I("download")}<div><h3>גיבוי והעברה למכשיר אחר</h3><p>היומן שמור רק בטלפון הזה</p></div></div>
        <p class="why">אין גיבוי בענן: אם הטלפון יאבד או יוחלף, היומן ישוחזר רק מגיבוי מוצפן ששמרת.</p>
        <button class="action" data-act="backup">${I("download", 19)}<span><strong>גיבוי מוצפן</strong><small>${esc(lastBackupLine())}</small></span></button>
        <button class="action" data-act="restore">${I("upload", 19)}<span><strong>שחזור מגיבוי</strong><small>מחליף את היומן לאחר אישור</small></span></button>
        <label class="field" for="bk-remind">תזכורת לגיבוי<select id="bk-remind">${[["0", "כבויה"], ["30", "פעם בחודש"], ["90", "כל 3 חודשים"]].map(([v, t]) => `<option value="${v}"${String(Number(backupInfo().remind) || 0) === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <button class="action" data-act="report">${I("file", 19)}<span><strong>דוח לבירור</strong><small>טקסט גלוי לשליחה למורה הוראה</small></span></button></section>
      <section class="card"><div class="card-h">${I("pin")}<div><h3>נסיעות</h3><p>זמני המועדים לפי היעד</p></div></div>
        ${st.trips.map(t => `<div class="trip"><span><strong>${esc(city(t.cityId).name)}</strong><small dir="ltr">${t.from} — ${t.to}</small></span><button class="icon-btn" data-deltrip="${t.id}" aria-label="מחיקת נסיעה">${I("trash", 17)}</button></div>`).join("")}
        <form id="trip-form" class="stack-s"><label class="field" for="t-city">יעד<select id="t-city" name="cityId">${placeOptions(st)}</select></label>
        <div class="pair"><label class="field" for="t-from">מתאריך<input id="t-from" name="from" type="date" required min="2000-01-01" max="2100-12-31"></label><label class="field" for="t-to">עד תאריך<input id="t-to" name="to" type="date" required min="2000-01-01" max="2100-12-31"></label></div>
        <button class="btn ghost full" type="submit">${I("plus", 17)}הוספת נסיעה</button></form>
        <p class="fine">נסיעה מעבר לקו התאריך מחייבת בירור אישי.</p></section>
      <section class="card"><div class="card-h">${I("globe")}<div><h3>שפה</h3></div></div>${langSwitch()}</section>
      <section class="card"><div class="card-h">${I("shield")}<div><h3>פרטיות ונתונים</h3><p>שום מידע לא יוצא מהמכשיר</p></div></div>
        ${lockSettings()}
        <a class="action" href="${PRIVACY_URL}" target="_blank" rel="noopener">${I("lock", 19)}<span><strong>מדיניות פרטיות</strong><small>מה נשמר, איפה, ומה לא נאסף</small></span>${I("out", 15)}</a>
        <button class="action" data-act="terms">${I("file", 19)}<span><strong>תנאי שימוש</strong><small>אחריות, גרסת בדיקה ופרטיות בקצרה</small></span></button>
        <button class="action danger" data-act="clear"${app.mode === "personal" && !st.events.length && !st.trips.length ? " disabled" : ""}>${I("trash", 19)}<span><strong>מחיקת כל הרישומים</strong><small>ההגדרות נשמרות. אפשר לבטל מיד אחרי המחיקה</small></span></button>
        ${app.mode === "personal" ? `<button class="action danger" data-act="wipe">${I("x", 19)}<span><strong>מחיקת כל הנתונים שלי</strong><small>יומן, הגדרות, מקומות ותזכורות — מהמכשיר הזה, לצמיתות</small></span></button>` : ""}</section>
      <section class="card"><div class="card-h">${I("scale")}<div><h3>לבודקים הלכתיים</h3><p>תרחישים מוכנים, בדיקות אוטומטיות וכללי החישוב</p></div></div>
        <button class="btn ghost full" data-go="review">${I("flask", 17)}מסך הבודקים</button></section>
      <section class="card about"><div class="card-h">${I("spring")}<div><h3>על מעיין</h3><p>גרסה \u2066${APP_VERSION}\u2069 · מנוע \u2066${M.ENGINE_VERSION}\u2069</p></div></div>
        <p>האפליקציה חינמית ופועלת כולה בטלפון, בלי חשבון ובלי שרת. שום מידע לא נשלח לאף אחד.</p>
        ${NATIVE ? "" : `<p>להתקנה: בתפריט הדפדפן (⋮) בוחרים ״הוספה למסך הבית״.</p>${/Android/i.test(navigator.userAgent) ? `<a class="link" href="https://github.com/nrt613/maayan/releases/latest/download/maayan.apk" target="_blank" rel="noopener">${I("download", 15)}אפליקציית אנדרואיד עם התראות</a>` : ""}`}</section>
    </aside></div>`;
  }

  /* ---------- מסך הבודקים ---------- */
  function viewReview(st) {
    const res = app.testResults, passed = res && res.filter(t => t.ok).length;
    const groups = res ? [...new Set(res.map(t => t.group))] : [];
    return `<section class="review-hero"><div>
        <span class="chip-light">גרסת בדיקה \u2066${APP_VERSION}\u2069</span><h2>הנחיות לבודקים</h2>
        <p>תודה על הבדיקה. המטרה היא לוודא שכל כלל מחושב כמו שצריך לפי השיטה שנבחרה, ושהמערכת לא מכריעה במקום שבו צריך לשאול.</p>
        <ol class="steps"><li>פותחים תרחיש מוכן, רואים מה הוזן ומה חושב, ומשווים להלכה.</li><li>אפשר לפתוח תרחיש ביומן המלא, לשנות רישומים והגדרות ולראות את החישוב משתנה.</li><li>מעתיקים דוח ושולחים למפתח עם ההערות.</li></ol>
      </div></section>
      <section class="card"><div class="card-h">${I("flask")}<div><h3>תרחישים מוכנים <span class="count">${SCENARIOS.length}</span></h3><p>כל תרחיש רץ בזמן מדומה ואינו נוגע ביומן האישי</p></div></div>
        <div class="scen-list">${SCENARIOS.map(scenarioCard).join("")}</div></section>
      <div class="two">
      <section class="card"><div class="card-h">${I("shield")}<div><h3>בדיקות אוטומטיות</h3><p>${res ? `${passed} מתוך ${res.length} עברו` : `${MaayanTests(M).tests.length} בדיקות של מנוע החישוב`}</p></div>
        <button class="btn ghost sm" data-act="tests">${I(res ? "refresh" : "play", 16)}${res ? "הרצה חוזרת" : "הרצה"}</button></div>
        ${res ? `<div class="test-sum ${passed === res.length ? "good" : "bad"}">${passed === res.length ? I("check", 18) + "כל הבדיקות עברו במכשיר הזה" : I("x", 18) + `${res.length - passed} בדיקות נכשלו`}</div>
          ${groups.map(g => `<details class="tgroup" data-nt lang="he" dir="rtl"><summary>${esc(g)} <span class="count">${res.filter(t => t.group === g && t.ok).length}/${res.filter(t => t.group === g).length}</span>${I("left", 15)}</summary><ul>${res.filter(t => t.group === g).map(t => `<li class="${t.ok ? "ok" : "no"}">${I(t.ok ? "check" : "x", 15)}<span>${esc(t.name)}${t.ok ? "" : `<small>${esc(t.error)}</small>`}</span></li>`).join("")}</ul></details>`).join("")}`
          : `<p>הבדיקות מוודאות את הלוח העברי, זמני השמש ואת כל כללי החישוב מול דוגמאות קבועות, כולל דוגמת הפלגה (ב׳ ניסן ← ל׳ ניסן ← כ״ח אייר).</p>`}
      </section>
      <section class="card"><div class="card-h">${I("copy")}<div><h3>שליחת הערות</h3><p>דוח עם ההגדרות, הרישומים והתוצאות</p></div></div>
        <label class="field" for="rv-note">ההערות שלך<textarea id="rv-note" rows="4" placeholder="למשל: בתרחיש ״ראייה אחרי השקיעה״ העונה הבינונית צריכה להיות…"></textarea></label>
        <button class="btn full" data-act="review-report">${I("copy", 17)}העתקת הדוח</button>
        <p class="fine">הדוח כולל את היומן שפתוח עכשיו (${app.mode === "personal" ? "היומן האישי" : app.mode === "scenario" ? "התרחיש" : "יומן הדוגמה"}). אחרי ההעתקה מדביקים בוואטסאפ או במייל.</p></section>
      </div>
      <section class="card"><div class="card-h">${I("book")}<div><h3>כללי החישוב ומקורותיהם</h3><p>מה המערכת עושה, ובמה היא לא מכריעה</p></div></div><div class="rules">${RULES.map(rl => `<details><summary>${esc(rl.t)}${I("left", 15)}</summary>${rl.p.map(x => `<p>${esc(x)}</p>`).join("")}${citeList(rl.src)}</details>`).join("")}</div></section>`;
  }
  function scenarioCard(sc) {
    const open = app.openScenario === sc.id;
    let body = "";
    if (open) {
      const { state: s, now: n } = sc.build(), r = calculate(s, n), ctx = currentContext(s, n);
      const plans = r.plans.filter(p => p.kind !== "bedikah"), bed = r.plans.filter(p => p.kind === "bedikah");
      body = `<div class="scen-body">
        <div class="expect"><strong>מה לבדוק</strong><p>${esc(sc.check)}</p></div>
        <p class="sim">זמן ההדמיה: <span class="hebdate">${esc(ctx.hebrewDate)}</span> · ${esc(civilLabel(ctx.date))} · ${esc(ctx.time)} · ${esc(ctx.city.name)}</p>
        ${diffSettings(s.settings)}
        <h4>מה הוזן</h4><ul class="inputs">${M.sorted(s.events).map(e => `<li>${esc(M.eventLine(e).split("\n")[0].split(" | ").slice(1).join(" · "))}</li>`).join("")}${s.trips.map(t => `<li>נסיעה ל${esc(city(t.cityId).name)}: ${esc(hebrew(t.from))} עד ${esc(hebrew(t.to))}</li>`).join("")}</ul>
        <h4>מה חושב</h4><p class="phase">מצב: <strong>${esc(PHASE_NAMES[r.phase])}</strong>${r.earliestHefsek && r.phase === "waiting" ? ` · הפסק מוקדם: <span class="hebdate">${esc(hebrew(r.earliestHefsek))}</span>` : ""}${r.phase === "clean" ? ` · יום ${r.cleanDay} מתוך 7` : ""}</p>
        <div class="plans">${plans.map(p => planLine(p, { prep: false })).join("") || '<p class="empty">אין מועדים מחושבים.</p>'}</div>
        ${bed.length ? `<p class="fine">ועוד ${bed.length} תזכורות לבדיקות בשבעה נקיים (מופיעות ביומן המלא).</p>` : ""}
        ${r.reviews.length ? `<h4>נקודות לבירור</h4><ul class="rv">${askFirst(r.reviews).map(v => `<li><strong>${esc(v.title)}</strong>${reviewBody(v)}</li>`).join("")}</ul>` : ""}
        <button class="btn full" data-scenario-load="${sc.id}">${I("play", 16)}פתיחה ביומן המלא</button></div>`;
    }
    return `<article class="scen${open ? " open" : ""}"><button class="scen-h" data-scenario="${sc.id}" aria-expanded="${open}"><span class="tag">${esc(sc.tag)}</span><strong>${esc(sc.title)}</strong>${I("left", 16)}</button>${body}</article>`;
  }
  const PHASE_NAMES = { empty: "אין רישומים", waiting: "ממתינה להפסק", clean: "שבעה נקיים", planned: "מועד הטבילה עבר", immersed: "אחרי טבילה" };
  function diffSettings(s) {
    const d = M.SETTING_DEFAULTS, keys = ["method", "wait", "haflagah", "beinonit", "day31", "orZarua", "carryMonthly", "carryLongIntervals", "missingMonthly", "beinHashmashot", "hefsekTwilight", "nightfall"];
    const changed = keys.filter(k => s[k] !== d[k]);
    if (!changed.length) return `<p class="fine">הגדרות ברירת המחדל: חמישה ימים, הפלגה בימים, עונה בינונית באותה עונה.</p>`;
    return `<p class="fine">הגדרות התרחיש: ${changed.map(k => esc(M.settingsSummary(s).find(x => x.startsWith({ method: "המנהג שלי", wait: "המתנה", haflagah: "הפלגה", beinonit: "עונה בינונית", day31: "יום 31", orZarua: "אור זרוע", carryMonthly: "שימור עונת", carryLongIntervals: "שימור הפלגות", missingMonthly: "יום ל׳", beinHashmashot: "ראייה בין השמשות", hefsekTwilight: "הפסק אחרי השקיעה", nightfall: "צאת הכוכבים" }[k])))).join(" · ")}</p>`;
  }
  const TERMS = [
    { t: "מה זה מעיין", p: ["מעיין היא כלי עזר אישי לרישום ולתכנון בענייני טהרת המשפחה. היא אינה פוסקת הלכה, אינה מורה הוראה ואינה ייעוץ רפואי.", "האפליקציה ניתנת בחינם, לשימוש אישי."] },
    { t: "גרסת בדיקה", p: ["זו גרסת בדיקה. החישובים טרם קיבלו אישור הלכתי מגורם מוסמך."] },
    { t: "אחריות", p: ["החישובים והתזכורות ניתנים כמות שהם, וייתכנו בהם טעויות או אי-דיוקים, לרבות בזמני הזריחה והשקיעה.", "אין להסתמך על האפליקציה לבדה. בכל שאלה או ספק יש לפנות למורה הוראה.", "השימוש באפליקציה הוא באחריות המשתמשת בלבד. המפתח אינו אחראי לכל תוצאה או נזק שנובעים מהשימוש בה או מהסתמכות עליה."] },
    { t: "פרטיות", p: ["כל הרישומים וההגדרות נשמרים במכשיר שלך בלבד. אין חשבון, אין שרת, אין מעקב, אין פרסומות ואין איסוף נתונים. למפתח אין גישה ליומן שלך.", "מחיקת האפליקציה או נתוני הדפדפן מוחקת את היומן. הגיבוי הוא באחריותך, ובלי סיסמת הגיבוי אי אפשר לשחזר אותו.", "האפליקציה אינה שולחת מידע לשום שרת. באתר, הדף והגופנים נטענים מהאתר עצמו; באפליקציה המותקנת אין שום פנייה לרשת."] },
    { t: "מיקום", p: ["זיהוי המיקום נעשה רק בלחיצה שלך. הקואורדינטות נשמרות במכשיר בלבד, משמשות לחישוב זמני היום, ואינן נשלחות לאף אחד."] },
    { t: "התראות", p: ["ההתראות תלויות במכשיר ובהגדרותיו, ועלולות להתעכב או לא להגיע, למשל במצב חיסכון בסוללה. אין להסתמך עליהן לבדן."] },
    { t: "שינויים", p: ["התנאים עשויים להתעדכן בגרסאות הבאות. המשך השימוש מהווה הסכמה לתנאים המעודכנים."] },
  ];
  const S = M.SOURCES;
  const RULES = [
    { t: "היום העברי והעונה", p: ["כל רישום נשמר עם התאריך האזרחי, השעה המקומית והעיר. היום העברי מתחיל בשקיעה, ועונת היום נמשכת מהזריחה עד השקיעה.", "זמני השמש מחושבים בגובה פני הים. צאת הכוכבים לפי ההגדרה שנבחרה: 8.5° או 7.083° מתחת לאופק, 13.5 דקות זמניות (הגאונים), או 18 או 20 דקות אחרי השקיעה.", "השקיעה מעוגלת לדקה כלפי מטה, והזריחה וצאת הכוכבים כלפי מעלה, לחומרא. החישוב נבדק מול ״שקיעה במישור״ בלוח עיתים לבינה ונמצא תואם בטווח של שניות. שקיעה נראית, שמושפעת מהרים ומבניינים בסביבה, אינה מחושבת.", "רישום בטווח שלוש דקות מהזריחה או מהשקיעה, או בין השקיעה לצאת הכוכבים, מסומן לבירור. שלוש הדקות הן סף לסימון ולא הגדרה של בין השמשות.", "שעה כפולה או חסרה במעבר שעון, ומקום בלי זריחה או שקיעה (קוטב), אינם מסווגים אוטומטית."], src: S.calendar },
    { t: "המתנה לפני ההפסק", p: ["חמישה ימים: יום הראייה נספר כיום הראשון, וההפסק המוקדם ביום החמישי.", "ארבעה ימים מתחילת הנידה (הרב עובדיה יוסף, ספרדי): יום הראייה הוא יום 1 וההפסק ביום הרביעי. ראתה בליל שני — ההפסק ביום חמישי.",
      "ארבעה ימים ממועד היחסים: נספרים ממועד היחסים שנרשם כבסיס, ולא מהראייה. בלי בסיס רשום אין חישוב, ומופיעה נקודה לבירור.",
      "ראייה סמוך לשקיעה או בין השמשות: ההמתנה נספרת מהיום העברי המאוחר, לחומרא.", "חידוש ספירה בתוך תקופת הנידה נשען על תחילת הנידה הקודמת ולא מוסיף חמישה ימים חדשים."], src: [...S.wait, "thbWait"] },
    { t: "ראייה בין השמשות", p: ["ראייה בין השקיעה לצאת הכוכבים, או בשלוש הדקות שסביב השקיעה והזריחה: לפי ברירת המחדל חוששים לשתי העונות — העונה שהסתיימה והעונה שהתחילה — בעונה הבינונית, בעונת החודש ובהפלגה (ש״ך יו״ד קפד, ס״ק יג–יד, בשם הב״ח; כך נוהגים למעשה). הרישום מסומן גם לבירור.", "אפשר לבחור בהגדרות להשעות את החישוב עד בירור, כמו בגרסאות קודמות.", "סוף בין השמשות נקבע לפי הגדרת צאת הכוכבים. לפי 13.5 דקות זמניות (הגאונים, הרב עובדיה יוסף) ראייה מאוחרת יותר היא לילה ודאי."], src: S.bhs },
    { t: "המנהג שלי", p: ["ביומן חדש בוחרים מנהג בכניסה הראשונה, לפני שהיומן מחשב משהו. בוחרים בשני שלבים: מה המנהג (ספרדי, אשכנזי או חב״ד), ואז לפי מי — לספרדים הרב עובדיה יוסף או בן איש חי, לאשכנזים אשכנזי רגיל או יממה שלמה (כרתי ופלתי). המנהג קובע את כל הגדרות החישוב בבת אחת, ואפשר לשנות כל הגדרה אחר כך תחת ״התאמה אישית לפי הוראת הרב״.", "השיטות אינן תחליף להוראת רב."], src: [] },
    { t: "הפסק טהרה ושבעה נקיים", p: ["הספירה מתחילה רק מהפסק שנרשם כנקי, לפני השקיעה ולא בזמן מסופק, ולא לפני סוף ההמתנה. הפסק מוקדם מתקבל רק עם הוראה אישית מתועדת.", "בבחירת שיטת הרב עובדיה יוסף: הפסק עד 13.5 דקות זמניות אחרי השקיעה מתקבל בדיעבד ונספר ליום שהסתיים, ומסומן לבירור. לכתחילה עושים הפסק לפני השקיעה.", "יום א׳ הוא היום העברי שאחרי ההפסק. ליל הטבילה המתוכנן הוא במוצאי היום השביעי, וזה נשאר תכנון בלבד.", "חוסר רישום בדיקה באחד מימי הספירה (לפי הגדרת הבדיקות) מסומן לבירור כשהיום מסתיים בשקיעה, ואינו פוסל או מאשר. בוקר וערב נקבעים לפי חצות היום. בדיקה שנרשמה כלא נקייה אינה מאפסת אוטומטית."], src: [...S.hefsek, ...S.clean, "thbHefsek", ...S.mikvah] },
    { t: "עונת החודש", p: ["אותו יום בחודש העברי הבא, באותה עונה.", "ראייה בל׳ כשבחודש הבא אין ל׳: ברירת המחדל היא א׳ בחודש שאחרי החודש החסר, לחומרא, ומופיע ״יש לשאול רב״. אפשר לבחור דילוג.", "ראייה בל׳ כשהחודש הבא מלא: עונת החודש בל׳ שלו בלבד.", "ראתה פעמיים באותו חודש: כל החישובים נעשים מהראייה האחרונה, ובנוסף נשמרת עונת החודש של הראייה הקודמת אם עוד לא הגיעה (רמ״א יו״ד קפט, יג; שו״ע הרב שם, ס״ק מד).", "בשנה מעוברת אדר א׳ עובר לאדר ב׳.", "שימור עונת חודש שחלה בזמן דימום הוא אפשרות נפרדת שדורשת תיעוד מלא."], src: [...S.monthly, "missing30"] },
    { t: "עונה בינונית", p: ["יום 30 בספירה כוללנית: יום הראייה הוא יום 1, כלומר 29 ימים אחריו, באותה עונה.", "שתי העונות, יום 31 ואור זרוע הם שלוש הגדרות נפרדות. השיטות המוכנות קובעות אותן לפי המנהג, ואפשר לשנות.", "מי ששומרת ימים 30 ו-31 שומרת את עונת אור זרוע ליום 30 בלבד.", "אור זרוע לעונה הבינונית הוא העונה שלפני עונת הראייה. כשהעונה הבינונית יממה שלמה והראייה ביום, העונה הזו (ליל יום 30) כבר בתוך היממה, ולכן אין אור זרוע ביום 29. אור זרוע לעונת החודש ולהפלגה לא משתנה."], src: [...S.average, "orZarua31"] },
    { t: "הפלגה", p: ["בשיטת הימים: ההפרש בין התאריכים העבריים של שתי הראיות ועוד 1. אותו מרווח נספר מהראייה האחרונה, באותה עונה.", "בשיטת חב״ד: מספר העונות מההפסק הקודם ועד הראייה הבאה. המועד החדש נספר מההפסק הנוכחי. מספר זוגי נופל ביום ואי-זוגי בלילה. הפלגה ארוכה נשמרת כשמגיעה קצרה ממנה.", "ראייה מסופקת באמצע אינה נמחקת כדי לייצר מרווח ארוך."], src: [...S.interval, ...S.chabad] },
    { t: "וסת קבוע", p: ["שלוש ראיות רצופות באותו יום בחודש ובאותה עונה, או שלוש הפלגות שוות בארבע ראיות, מסומנות כדפוס אפשרי.", "המערכת אינה קובעת, עוקרת או משעה וסת קבוע בעצמה."], src: S.fixed },
    { t: "במה המערכת לא מכריעה", p: ["היריון, אחרי לידה, הנקה, טיפול הורמונלי, וסתות לא רגילים (דילוג, סירוג), מראות וכתמים, בדיקות שהוחסרו ומעבר קו התאריך.", "במצבים האלה החישוב הרגיל מושעה ואפשר לרשום עונות ידניות לפי הוראה. אין במערכת זיהוי מראות.", "בכמה מצבים שיש בהם שאלה פתוחה מופיע ״יש לשאול רב״, עם מה שמעיין עושה בינתיים."], src: [] },
  ];

  /* ---------- מסגרת ---------- */
  function shell() {
    const st = state(), ctx = currentContext(st, now()), r = calculate(st, now());
    app.lastDayKey = `${ctx.abs}|${r.phase}|${app.mode}`;
    const title = NAV.find(n => n[0] === app.tab)[1];
    const upcoming = r.plans.filter(p => !p.done && new Date(p.start) >= now()).length;
    const banner = app.mode === "demo" ? `<div class="banner">${I("flask", 17)}<span>יומן לדוגמה. השינויים לא נשמרים.</span><button data-act="personal">ליומן שלי</button></div>`
      : app.mode === "scenario" ? `<div class="banner">${I("flask", 17)}<span>תרחיש: ${esc(app.scenario.title)} · זמן מדומה: <span class="hebdate">${esc(ctx.hebrewDate)}</span></span><button data-go="review">לתרחישים</button><button data-act="personal">ליומן שלי</button></div>`
      : !storage.ok ? `<div class="banner warn">${I("info", 17)}<span>הדפדפן הזה חוסם שמירה במכשיר. הרישומים יימחקו בסגירת הדף, אלא אם תגבי אותם.</span></div>`
      : app.loadWarning ? `<div class="banner warn">${I("info", 17)}<span>${esc(app.loadWarning)}</span></div>` : "";
    const views = { today: viewToday, calendar: viewCalendar, journal: viewJournal, dates: viewDates, review: viewReview, prefs: viewPrefs };
    return `<aside class="side"><div class="brand">${mark()}<span>מעיין<small>יומן טהרת המשפחה</small></span></div>
        <nav aria-label="ניווט">${MAIN_NAV.map(([id, t, ic]) => `<button class="nav${app.tab === id ? " on" : ""}" data-go="${id}"${app.tab === id ? ' aria-current="page"' : ""}>${I(ic, 19)}<span>${t}</span>${id === "dates" && upcoming && !app.hidden ? `<small class="badge">${upcoming}</small>` : ""}</button>`).join("")}</nav>
        ${app.tab === "review" ? `<button class="nav on" data-go="review" aria-current="page">${I("scale", 19)}<span>לבודקים</span></button>` : ""}
        <p class="side-note">${I("lock", 15)}נשמר רק במכשיר הזה</p></aside>
      <div class="work">
        <header class="top"><div class="brand m">${mark()}</div>
          <div class="top-date"><span class="hebdate">${esc(ctx.hebrewDate)}</span><small>${esc(civilLabel(ctx.date, true))}${ctx.afterSunset ? " · אחרי השקיעה" : ""}</small></div>
          <div class="top-act">${app.hidden ? "" : `<button class="pill" data-go="prefs" aria-label="עיר: ${esc(ctx.city.name)}">${I("pin", 15)}${esc(ctx.city.name)}</button>`}
            ${lockCfg() && !app.hidden ? `<button class="icon-btn" data-act="lock-now" aria-label="נעילת היומן">${I("lock")}</button>` : `<button class="icon-btn" data-act="hide" aria-pressed="${app.hidden}" aria-label="${app.hidden ? "הצגת היומן" : "הסתרת היומן"}">${I(app.hidden ? "eye" : "eyeoff")}</button>`}</div></header>
        ${banner}
        <main ${app.hidden ? "hidden" : ""} class="${app.enter ? "enter" : ""}">
          <div class="page-h">${app.tab === "review" ? `<button class="icon-btn back" data-go="prefs" aria-label="חזרה להגדרות">${I("right")}</button>` : ""}<h1>${title}</h1>${["today", "calendar", "journal"].includes(app.tab) ? `<button class="btn" data-act="quick" data-date="${app.tab === "calendar" && app.cal.selected ? app.cal.selected : ctx.date}">${I("plus", 18)}רישום חדש</button>` : ""}</div>
          ${views[app.tab](st, r, ctx)}
          <footer class="foot"><p class="disclaimer">${I("info", 16)}<span>גרסת בדיקה: החישובים טרם קיבלו אישור הלכתי, ואין לראות בהם פסק. בכל ספק פונים למורה הוראה.</span></p>
            <span class="foot-links"><button class="link" data-act="terms">תנאי שימוש</button><a class="link" href="${PRIVACY_URL}" target="_blank" rel="noopener">מדיניות פרטיות</a><button class="link" data-go="review">כללים ומקורות</button></span></footer>
        </main>
        ${!app.hidden && ["today", "calendar", "journal"].includes(app.tab) ? addBar(app.tab === "calendar" && app.cal.selected ? app.cal.selected : ctx.date, ctx.date) : ""}
        ${app.hidden ? `<div class="veil">${I("lock", 30)}<h2>היומן מוסתר</h2><button class="btn" data-act="hide">${I("eye", 18)}הצגת היומן</button></div>` : ""}
      </div>
      <nav class="tabs" aria-label="ניווט">${MAIN_NAV.map(([id, t, ic]) => `<button class="${app.tab === id ? "on" : ""}" data-go="${id}"${app.tab === id ? ' aria-current="page"' : ""}><i class="tab-ic">${I(ic, 22)}</i><span>${t.replace("לוח השנה", "לוח").replace("היומן שלי", "יומן")}</span>${id === "dates" && upcoming && !app.hidden ? `<small class="tab-badge" aria-hidden="true"></small>` : ""}</button>`).join("")}</nav>`;
  }
  const LOGO_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAABwCAYAAADG4PRLAAALyklEQVR42u2da4xcZRnHf8/s7Ba2N2iBFmihF6BAlZvcvEAQEqIkCAJRFIMkEhM/IMjFD0gkGiUqKKJIAgQVgvFDhRBNQItGkGhjAblIpVxKKe22sC29UHrbnZm/H87zpi+HM7uzu7OX2X3/ycnszJw5l+f/Ps/73N6zkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ0Lqw0TqxpA+d28yUKBmDBDpZJT+fgFoRWb5fm7+tAUqkjiKBkkpAycwqBd+Vgc7oGnaaWW+d/WpmVkt0jRCBThxB6JI6gJOAM4DjgSOAA4BpkVZuB94GXgWeA540sxeiY7bV09yEJppKF3R4f5Kkn0l6VYPDc5JulDQvR2TCMJAXE/cpSX+UVIvIqEnq9a0iqeqfha3qn4d9Yrwn6U5Jh0UDpZSk3mTyJB0m6bc54fc6OYNBNUfmJknfTNrYXJNZ8r+/IKk70raKmodajsjHJc2JnJyEIZL3k5zG9UVEs4hcJ+mTicQhkOevD7pAKxFBtWg+i+c7Fcx3lUEQG0jcKem8ROIgPU1Jv3NB9kSkVYY43zVKZjjPHkmfmagk2iAILJtZRdLtwDVAr2dZYodiM7AceAZYCWwAtgK7PHifChwCHOXx4cnAwdHvq1Hmpi/UfL8dwNlmtlxSm5lVk6r17W1eFo3+WOP+LOnLkg4c4HGnSTpX0n3uaarALPeniV2SZqUQo5/siocK29xsBjwq6bT8/pLKvrX5+7C1xd/lfjdb0k2S3s6Z10bmxKXBShQly5P2Za9LIsFtlXRFjrS2gQovzKu5ZMBsSbdH5PQ2SOINKUasr33HRgJ7U9KJQVjNMltOZjl6f7qk5xswqcGJ2iVpUXzdicBMqCZphqSnJa2QtMC/ax/Gc5b9705J90bmtNbPfPh40sI+vFCvLoyIgHJm9Vu5WLIvEi8YiWuMzX+dzcaUJubN6ghagKCNl0SmtFaHwJqk/wSnaTimlIEMjIjkppNpgyVxNOpyktrNrNe16w9RrJi/j6rHpZeY2UPNig19MHygS0DSocAC4FBgOtDu8e4WoAt4w8w25gd+swrULedqRyRe7CQWBf3hs6fN7DRJpaEIrKBAfRzwWeB0Jy8Q94GfeZLjXeAV4B/Ao2a2Npj2ZgyqloyVIhKvBn4OVIBygQABTjWzZwYrsPh3ks4ArgQ+4RmlPUCPn1915NsOTPLXTcBfgHvM7PUwOIYyuFo22I1IvNeFWs2l8wKp95rZ10MKcDDkSZoP3ACc5zJ7P6f5fclRvtWcxKnANuBu4Fd+/EGT2MoEhk63NuDfwAk5EuX3twk40sy2SrJG5m4/tplZTdJFwM3ADBe8cgNlQJft19gO7Odm9Voz6xosiS0b6AYizKwH+Kqbs9h0mgvrANccGhF85KTVJH0b+IWbwC18OGlfRE7YVPBdSL7XgI1uipdIOsrPV5owBLqQq24aXwS+68KtFZivz+fI7U/zJOkW4Fonrlowx8YOU9Cq6a6p0530YCUmRd9NiUzvZrIqzAOS5g6GxJZP+EamVG5KT45MaWxGjzCzbX2Z0WjO+yHwNaC7H+LanBCA9cBLwPPudXZ7OGHAPk7UIuAUN/f7k5XBdgAzgWeBS91zbbiheVxk7CPBnwosy1mXYLbOM7PH6nmj0TGudYdlYx3yAnHT3Jn5O/AnYJmZbWnwehcAFzphhzjZBwM/MrM7JmRNM6qW3J+rToTX20IqsI/fnu+9Nv+V9L/ctsI/XyNppaRbJS0uytAUlM9KRam1qOLylqSX/fhz8lmviUJg6NFZ4BWJWi5nurxIMFGlZZ4LcKWTFZMXPl/nbZOLC0izAV5rXHH5iqQ3vJF57kinKseiFt4daV8tag4+KCYxas5q8/6eNQXa96KXzp6X9KX4XEMVcq6zb7HHm0zYYnSkhQvraOHZOaLjFpENTlaevC5Jj0haGJ2j1OzrzocxEyKMKAgramSroVYBD0exYAgtjgu7uqBq3r9zNfBeLsYLMeQS4FIzW+UhS9NXSoXwwYN5TVgCc6P4lx5GxPd4XHzvLqxvAHM8EWAReTOAu8zsGjPb7cKtDOfgS0vocmbIuwdC95wkPRXNXyZpjs95L+cclvWSro/N8li91/Hq6QRT+OtcvHuwe38hUL7CNa030ryZwO1mdpvPkWmV8Chq4GxJ26Nq/TZJs/y7WV61Xxk5LOs9C8OYa4eYSBroucySmb0NPBFp1xQgNB1fCMx27at4ausx4KZWWg08noPFMHc9kkupTff3FwC73dGZDLwOXBeUuFXM5ngmMGjQX52okPmoSjoa+AhZIrns2nmVmW1177RlvMFxS6DHVmZma8gqBGE+m0RWH+xw0zkd+IGZvdSKSeTxnm8L3uiT0WdzyQqpO9wDXWpmD7RqBWBcrKfLeYsWZWUCQolJwJFknWQVYCdws/9eo9kyOS4JjIgpahxScDZyAo//DiQ+55mWduBEN59TgO+Z2VtF2uf5yaIwQmPJybExRla8NZxa8uC8g6zVr921aEPu2C8BxwIv+76vuSdajdoGO81s5wCutzTapJZHmbSSC0EuROW+b/P4bCZwkM9fs8mq1zN829+1qZOsdcGADkmXm9nfJHWYWY+klU4gTuAd/nmbpMnA74FFkjaSVdq3kPWsbCJbYdxF9iSpbmCjE10tuN4RJbM8SpoWSKsFMydpX5+fFgHHsLdd/RCyFrzJfr29ZI/lepes7SEIdmMk9O3A6pxJXQFc5F7oMmCpB/tVJ3Cpm9o5Pljmk/WvTPeBAVmPy1Zgg6R1ZI8Fe8G1elWc7HarUB1uIssjTF6Ya4LJWgB8GjiH7Blqs9j7ALxdTtKbwD+BVR5sdwHrgE1mtruR0/rr6mjauMfDjDY3t93AnQVmeYZr++E+uI7218OBjwLnR9e52qv+j5O19Pfm7rm158CoaaiDrM3vcuAsJwzgHRfyimhUvw6s7UsAfTgbNU+phfOe40H9Q8AX41TZQOYztxTzgcVkHXCn+Pspbh12AG+RtdDf7Z1wpZYuFUVtA5/zpHHALkn/knSLpHMkzaz3+9yau4ZLPNG5j/F1/ZdE81Wfpj7XclHYQiFpij8b7seSnvUGpVf8XKsknRtfRyuT9/3cGr5XJF2Zf6JFQWeXDfH8oTIxX9JySVMLYscBHS++xtx38/zpjCucyHCvZzUyaMYieaHn5OzoZsLTLc6MBNIxXE+WiAicJ+mqZmpDtHCzI15q7g1SNbcwVUlLonm1pQgMq2qv9xvaEzUaPSXplAKBhMePhAYla9K1dPoa/0EdM6d55SJt8uej3i/pfSdutw/W77QqgXHLXE9Bq1+vd3xd5itd62pyRGy5oHnW4q1BMiw3z8WmOz5XqY/jTJJ0gqTrJD0Rrc+P1+8/LGmf4WrNsJEg0V32i4H72FuP6/EwJghoO/Ai2SO6nnYvdC2wuRmx1FDznJL2Y+/jwY4HPuae6IJcyBJk2g38FLjVvWEbjphwpJ5aH0hcCNxItiagM8pXVjw7ksdmDy9WAWvIFpB0uXC2eFD9nv9+h8eXe/oTlKSQsdnXA/vJHqyHrM+BHpPOdoLm+vsDGpDZCuBB4Ddm9s5wJ8hHPA70vxd6LHYB2cPuyrlRXPFr62/OkAfSFU9/1fx1d53kdzjmVNf8TidwHwa/aHOX51mXeuy3LGRkRqJENaLJ7BB0xzfl1fGPA2dGQXFnH4TV+OAizlIT7kUNHqPXLcCrZMvBlgMvmNnqAuetOhL50FGpRtT7fxJubg4FFnraahHZvygIJmyam7vhQo/PxdvcdK/37NBrkRlfa2Z76njcdf+pybgisIhM9lYk6u032R2guDoRVsNOdWLNSQ6rYy0iZpdv+Ly50993+1wbtm3A+0X/hKTomqOk/KhgTPU9FtQE6Y/YYb6WOM8qxlgxd8wR2CC50P+jPeJ5jQb3Vfy71I2dkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQMPHwf/+jAbtK9XTLAAAAAElFTkSuQmCC";
  /** כפתור ״רישום״ צף מעל סרגל הלשוניות: פותח בלחיצה אחת את התפריט המהיר, ליום שנבחר בלוח או להיום */
  function addBar(d, todayISO) {
    const label = d === todayISO ? "" : `${hebDay(d)} ${hd(d).monthTitle().split(" ")[0]}`;
    return `<div class="fab-wrap"><button class="fab" data-act="quick" data-date="${d}" aria-label="רישום · ${esc(d === todayISO ? "היום" : civilLabel(d, true))}">${I("plus", 22)}<span>רישום</span>${label ? `<small class="hebdate">${esc(label)}</small>` : ""}</button></div>`;
  }
  const mark = () => `<span class="mark"><img src="${LOGO_IMG}" alt=""></span>`;
  const langSwitch = () => `<div class="seg langs" role="group" aria-label="שפה" data-nt>${Object.entries(L.LANGS).map(([k, n]) => `<button type="button" data-lang="${k}" aria-pressed="${L.lang === k}" lang="${k}">${n}</button>`).join("")}</div>`;
  function applyLang(l, save) {
    L.set(l); M.setLang(L.lang);
    const d = L.dir();
    document.documentElement.lang = L.lang; document.documentElement.dir = d;
    for (const id of ["app", "modal", "toast"]) { const el = document.getElementById(id); el.dir = d; el.lang = L.lang; }
    document.title = L.lang === "he" ? "מעיין" : "Maayan";
    if (save) storage.set(LANG_KEY, L.lang);
  }

  function render() {
    // נעול (או מכוסה ברקע): מציגים רק את מסך הנעילה. שום נתון מהיומן לא נבנה לתוך הדף.
    $("#app").classList.toggle("is-locked", !!(app.locked || app.covered));
    if (app.locked || app.covered) { renderLock(); renderModal(); renderToast(); window.scrollTo(0, 0); return; }
    const root = $("#app"), scroll = window.scrollY, focusId = document.activeElement?.id, selStart = document.activeElement?.selectionStart;
    root.innerHTML = shell(); app.enter = false; L.dom(root);
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch { /* */ } } }
    window.scrollTo(0, scroll);
    // יומן חדש בלי מנהג: תמיד חוזרים לבחירת המנהג (גם אחרי ״ליומן שלי״ מהיומן לדוגמה, או אחרי מחיקת כל הנתונים)
    if (!app.modal && needsMethod() && app.tab !== "review") app.modal = storage.get(SEEN_KEY) ? onboardModal() : { kind: "welcome" };
    renderModal(); renderToast();
  }
  function renderToast() {
    const el = $("#toast");
    if (app.locked || app.covered) { el.innerHTML = ""; return; }
    el.innerHTML = app.toast ? `<div class="toast${app.toastAction ? " has-act" : ""}" role="status"><span>${esc(app.toast)}</span>${app.toastAction ? `<button class="toast-act" data-act="toast-undo">${esc(app.toastAction.label)}</button>` : ""}<button class="icon-btn" data-act="toast-x" aria-label="סגירה">${I("x", 16)}</button></div>` : "";
    L.dom(el);
  }
  function go(tab, top = true) {
    app.enter = tab !== app.tab; app.tab = tab;
    try { history.replaceState(null, "", "#" + tab); } catch { /* */ }
    render(); if (top) window.scrollTo(0, 0);
  }

  /* ---------- חלונות ---------- */
  function renderModal() {
    const host = $("#modal"), m = app.locked || app.covered ? null : app.modal;
    if (!m) {
      if (host.firstChild) { host.innerHTML = ""; document.body.classList.remove("locked"); app.modalReturn?.isConnected && app.modalReturn.focus({ preventScroll: true }); app.modalReturn = null; }
      return;
    }
    const fresh = !host.firstChild, keep = !fresh && host.querySelector(".sheet")?.scrollTop;
    if (fresh) app.modalReturn = document.activeElement;
    document.body.classList.add("locked");
    host.innerHTML = `<div class="scrim${fresh ? " in" : ""}" data-act="close-modal"></div><div class="sheet${fresh ? " in" : ""}" role="dialog" aria-modal="true" aria-labelledby="m-title">${modalBody(m)}</div>`;
    L.dom(host);
    if (keep) host.querySelector(".sheet").scrollTop = keep;
    const first = host.querySelector("[autofocus]") || host.querySelector("input:not([type=hidden]),select,textarea,button");
    if (fresh) first?.focus({ preventScroll: true });
  }
  function modalBody(m) {
    const close = `<button class="icon-btn" data-act="close-modal" aria-label="סגירה">${I("x")}</button>`;
    if (m.kind === "event") {
      const f = m.form, needsResult = ["hefsek", "bedikah", "question"].includes(f.type), other = !QUICK_TYPES.some(q => q[0] === f.type);
      const HELP = { question: "שאלה לבירור נשמרת ומופיעה בנקודות לבירור. היא אינה הופכת לווסת.", restart: "רישום הוראה להתחיל ספירה חדשה בתוך תקופת הנידה.", intimacy: "משמש בסיס לחישוב כשנבחרה שיטת ארבעה ימים ממועד היחסים.", hefsek: "הפסק סמוך לשקיעה או לפני סוף ההמתנה יסומן לבירור.", manual: "עונה שנקבעה לפי הוראה אישית. אינה נוצרת מהחישוב.", flow: "השעה חשובה: אחרי השקיעה זה כבר היום העברי הבא." };
      let hebHint = ""; if (M.validISO(f.date)) hebHint = `${hebrew(f.date)} · עד השקיעה`;
      return `<div class="m-h"><h2 id="m-title">${m.editing ? "עריכת רישום" : "רישום חדש"}</h2>${close}</div>
      <form id="event-form" class="stack-s">
        <div class="field"><span id="e-type-l">מה לרשום</span><div class="types" role="radiogroup" aria-labelledby="e-type-l">${QUICK_TYPES.map(([v, ic]) => `<button type="button" role="radio" class="type-chip t-${v}" data-etype="${v}" aria-checked="${!other && f.type === v}">${I(ic, 18)}<span>${EVENT_NAMES[v]}</span></button>`).join("")}<button type="button" role="radio" class="type-chip" data-etype="other" aria-checked="${other}">${I("list", 18)}<span>אחר</span></button></div></div>
        ${other ? `<label class="field" for="e-type">סוג הרישום<select id="e-type" name="type">${Object.entries(EVENT_NAMES).filter(([v]) => !QUICK_TYPES.some(q => q[0] === v)).map(([v, n]) => `<option value="${v}"${f.type === v ? " selected" : ""}>${n}</option>`).join("")}</select></label>` : `<input type="hidden" name="type" value="${f.type}">`}
        <div class="pair"><label class="field" for="e-date">${f.type === "manual" ? "התאריך של יום העונה" : "תאריך"}<input id="e-date" name="date" type="date" required min="2000-01-01" max="2100-12-31" value="${f.date}"><small class="hebdate" id="e-heb">${esc(hebHint)}</small></label>
        <label class="field" for="e-time">שעה<input id="e-time" name="time" type="time" required value="${f.time}"><small>לפי השעון במקום</small></label></div>
        <label class="field" for="e-city">מקום<select id="e-city" name="cityId">${placeOptions(state(), f.cityId)}</select></label>
        ${f.type === "manual" ? `<label class="field" for="e-onah">עונה<select id="e-onah" name="onah" required><option value="" ${f.onah ? "" : "selected"} disabled>בחירה</option><option value="day"${f.onah === "day" ? " selected" : ""}>יום · מהזריחה עד השקיעה</option><option value="night"${f.onah === "night" ? " selected" : ""}>לילה · מהשקיעה הקודמת עד הזריחה</option></select></label>` : ""}
        ${needsResult ? `<label class="field" for="e-result">תוצאה<select id="e-result" name="result"><option value="clear"${f.result === "clear" ? " selected" : ""}>נקייה</option><option value="uncertain"${f.result === "uncertain" ? " selected" : ""}>ממתינה לבירור</option><option value="bleeding"${f.result === "bleeding" ? " selected" : ""}>לא נקייה</option></select></label>` : ""}
        ${f.type === "flow" ? `<label class="toggle wake" for="e-wake"><span><strong>לא ידוע מתי התחיל (מצאתי בקימה או בבדיקה)</strong><small>לא חובה. מעיין תחשוש לשתי העונות של היום ותסמן ״יש לשאול רב״.</small></span><input id="e-wake" name="foundOnWaking" type="checkbox"${f.foundOnWaking ? " checked" : ""}></label>` : ""}
        <label class="field" for="e-note"><span>הערה <span class="opt">לא חובה</span></span><textarea id="e-note" name="note" rows="2" maxlength="2000">${esc(f.note)}</textarea></label>
        <details class="adv"${f.authorityNote ? " open" : ""}><summary>הוראה אישית שקיבלת${I("left", 14)}</summary><label class="field" for="e-auth">תיעוד ההוראה<textarea id="e-auth" name="authorityNote" rows="2" maxlength="1000" placeholder="מי הורה, מתי ומה נאמר">${esc(f.authorityNote)}</textarea></label></details>
        ${HELP[f.type] ? `<p class="hint">${I("info", 16)}${HELP[f.type]}</p>` : ""}
        ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
        ${m.confirmDelete ? `<div class="confirm"><p>למחוק את הרישום? כל המועדים יחושבו מחדש.</p><div class="row-btns"><button type="button" class="btn danger" data-act="delete-yes">מחיקה</button><button type="button" class="btn ghost" data-act="delete-no">ביטול</button></div></div>`
          : `<div class="m-actions"><button class="btn" type="submit">${I("check", 17)}שמירה</button><button type="button" class="btn ghost" data-act="close-modal">ביטול</button>${m.editing ? `<button type="button" class="icon-btn danger push" data-act="delete" aria-label="מחיקת רישום">${I("trash", 19)}</button>` : ""}</div>`}
      </form>`;
    }
    if (m.kind === "quick") {
      const ctxd = currentContext(state(), now()).date, d = m.date;
      const head = d === ctxd ? "היום" : weekdayName(d);
      return `<div class="m-h"><div><h2 id="m-title">מה לרשום?</h2><p class="fine"><span>${esc(head)}</span> · <span class="hebdate">${esc(hebrew(d))}</span> · ${esc(civilLabel(d, true))}</p></div>${close}</div>
        <div class="quick">${[...QUICK_TYPES, ["other", "list"]].map(([v, ic]) => `<button class="quick-btn t-${v}" data-qtype="${v}"><span class="ev-ic t-${v}">${I(ic, 26)}</span><span>${v === "other" ? "אחר…" : v === "flow" ? "ראייה / וסת" : EVENT_NAMES[v]}</span></button>`).join("")}</div>`;
    }
    if (m.kind === "prep") {
      const list = state().settings.checklist, total = M.CHECKLIST.length, n = M.CHECKLIST.filter(x => list.includes(x)).length;
      return `<div class="m-h"><div><h2 id="m-title">הכנות לטבילה</h2><p class="fine">${n} מתוך ${total}. הרשימה נשמרת במכשיר בלבד.</p></div>${close}</div>
        <div class="prep-bar" role="progressbar" aria-label="הכנות לטבילה" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="width:${Math.round(n / total * 100)}%"></i></div>
        <div class="checks">${M.CHECKLIST.map((item, i) => { const on = list.includes(item); return `<label class="${on ? "on" : ""}" for="chk-${i}"><input type="checkbox" id="chk-${i}" data-check="${esc(item)}"${on ? " checked" : ""}><span class="box" aria-hidden="true">${I("check", 15)}</span><span>${esc(item)}</span></label>`; }).join("")}</div>
        <div class="m-actions"><button class="btn" data-act="close-modal">${I("check", 17)}סיום</button></div>`;
    }
    if (m.kind === "text") return `<div class="m-h"><h2 id="m-title">${esc(m.title)}</h2>${close}</div><p>${esc(m.intro)}</p>
      <textarea id="m-text" class="${/[\u0590-\u05FF]/.test(String(m.text).slice(0, 400)) ? "plain-text" : "mono"}" dir="auto" rows="9" readonly>${esc(m.text)}</textarea>
      <div class="m-actions"><button class="btn" data-act="copy-text">${I("copy", 17)}העתקה</button>${m.file ? `<button class="btn ghost" data-act="dl-text">${I("download", 17)}שמירה כקובץ</button>` : ""}</div>
      ${m.file ? `<p class="fine">אם השמירה כקובץ לא עובדת בדפדפן הזה, מעתיקים ושומרים בפתקים או שולחים לעצמך.</p>` : ""}`;
    if (m.kind === "cycle") return `<div class="m-h"><h2 id="m-title">הזנת מחזור קודם</h2>${close}</div>
      <form id="cycle-form" class="stack-s"><p class="fine">מזינים כל מחזור בנפרד, בכל סדר. החישוב מסדר הכול לפי התאריכים.${m.saved ? ` נשמרו ${m.saved} מחזורים.` : ""}</p>
        <div class="pair"><label class="field" for="c-flow">תחילת הווסת<input id="c-flow" type="date" required min="2000-01-01" max="2100-12-31"></label>
        <label class="field" for="c-flow-t">שעה<input id="c-flow-t" type="time" required value="10:00"><small>אחרי השקיעה = היום העברי הבא</small></label></div>
        <div class="pair"><label class="field" for="c-hef"><span>הפסק טהרה <span class="opt">אם ידוע</span></span><input id="c-hef" type="date" min="2000-01-01" max="2100-12-31"></label>
        <label class="field" for="c-hef-t">שעה<input id="c-hef-t" type="time" value="16:00"></label></div>
        <label class="field" for="c-mik"><span>טבילה <span class="opt">תאריך הערב, אם ידוע</span></span><input id="c-mik" type="date" min="2000-01-01" max="2100-12-31"></label>
        <label class="field" for="c-city">מקום<select id="c-city">${placeOptions(state(), state().settings.cityId)}</select></label>
        ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
        <div class="m-actions"><button class="btn" type="submit">${I("check", 17)}שמירת המחזור</button><button type="button" class="btn ghost" data-act="close-modal">${m.saved ? "סיום" : "ביטול"}</button></div></form>`;
    if (m.kind === "backup") return `<div class="m-h"><h2 id="m-title">גיבוי מוצפן</h2>${close}</div>
      <form id="backup-form" class="stack-s"><p>הגיבוי מוצפן בסיסמה שאת בוחרת. בלי הסיסמה אי אפשר לשחזר אותו, גם לא אנחנו.</p>
      <label class="field" for="b-pass">סיסמת גיבוי<input id="b-pass" type="password" minlength="10" required autocomplete="new-password"><small>לפחות 10 תווים. לשמור אותה בנפרד.</small></label>
      ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}<div class="m-actions"><button class="btn" type="submit">${I("lock", 17)}יצירת גיבוי</button></div></form>`;
    if (m.kind === "restore") return `<div class="m-h"><h2 id="m-title">שחזור מגיבוי</h2>${close}</div>
      <form id="restore-form" class="stack-s"><div class="field"><span id="r-file-l">קובץ גיבוי</span><input id="r-file" class="file-in" type="file" aria-labelledby="r-file-l"${NATIVE && CAP.getPlatform?.() === "ios" ? "" : ' accept=".may,.json,.txt,application/json,text/plain"'}><label class="file-pick" for="r-file">${I("upload", 18)}<span id="r-file-name">בחירת קובץ</span></label></div>
      <label class="field" for="r-text">או הדבקת טקסט הגיבוי<textarea id="r-text" class="mono" rows="3" placeholder='{"format":"maayan-encrypted-v1",…}'>${esc(m.text || "")}</textarea></label>
      <label class="field" for="r-pass">סיסמת הגיבוי<input id="r-pass" type="password" required autocomplete="off"></label>
      ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}<div class="m-actions"><button class="btn" type="submit">${I("upload", 17)}פתיחת הגיבוי</button></div></form>`;
    if (m.kind === "confirm") return `<div class="m-h"><h2 id="m-title">${esc(m.title)}</h2>${close}</div><p>${esc(m.text)}</p>
      <div class="m-actions"><button class="btn ${m.danger ? "danger" : ""}" data-act="confirm-yes">${esc(m.yes)}</button><button class="btn ghost" data-act="close-modal">ביטול</button></div>`;
    if (m.kind === "terms") return `<div class="m-h"><h2 id="m-title">תנאי שימוש ופרטיות</h2>${close}</div>
      <div class="terms">${TERMS.map(sec => `<h4>${esc(sec.t)}</h4>${sec.p.map(x => `<p>${esc(x)}</p>`).join("")}`).join("")}<p><a class="link" href="${PRIVACY_URL}" target="_blank" rel="noopener">${I("lock", 15)}מדיניות הפרטיות המלאה${I("out", 13)}</a></p><p class="fine">עדכון אחרון: ${TERMS_VERSION}</p></div>
      <div class="m-actions"><button class="btn" data-act="${m.back ? "terms-back" : "close-modal"}">הבנתי</button></div>`;
    if (m.kind === "place") return `<div class="m-h"><h2 id="m-title">המיקום שזוהה</h2>${close}</div>
      <form id="place-form" class="stack-s"><p>${m.near ? `המיקום נמצא ליד ${esc(m.near)}.` : "המיקום אינו קרוב לאחת הערים ברשימה."} זמני הזריחה והשקיעה יחושבו לפי הנקודה המדויקת.</p>
        <p class="fine" dir="ltr">${m.lat.toFixed(4)}, ${m.lon.toFixed(4)} · ${esc(m.tz)}</p>
        <label class="field" for="p-name">שם המקום<input id="p-name" maxlength="60" required value="${esc(m.name)}" data-nt></label>
        <p class="fine">המקום יישמר במכשיר וייקבע כמקום ברירת המחדל. רישומים קודמים לא משתנים.</p>
        ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
        <div class="m-actions"><button class="btn" type="submit">${I("check", 17)}שמירה כמקום שלי</button><button type="button" class="btn ghost" data-act="close-modal">ביטול</button></div></form>`;
    if (m.kind === "pin-set") return `<div class="m-h"><h2 id="m-title">${m.change ? "שינוי הקוד" : "נעילה בקוד"}</h2>${close}</div>
      <form id="pin-form" class="stack-s"><p>בחרי קוד של 4 עד 6 ספרות. הקוד יידרש בכל פתיחה של האפליקציה. הקוד עצמו לא נשמר, רק גיבוב מוצפן שלו.</p>
        ${m.change ? `<label class="field" for="pin-old">הקוד הנוכחי<input id="pin-old" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" required autocomplete="off" dir="ltr" class="pin-in"></label>` : ""}
        <div class="pair"><label class="field" for="pin-new">קוד חדש<input id="pin-new" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" required autocomplete="off" dir="ltr" class="pin-in" autofocus></label><label class="field" for="pin-new2">שוב, לאימות<input id="pin-new2" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" required autocomplete="off" dir="ltr" class="pin-in"></label></div>
        <div class="warn-box">${I("info", 18)}<p><strong>חשוב לדעת:</strong> אם תשכחי את הקוד, אין דרך לשחזר אותו. האפשרות היחידה תהיה למחוק את כל הנתונים מהמכשיר. גיבוי מוצפן מאפשר לשחזר את היומן גם אחרי מחיקה, ולכן כדאי לשמור אחד.</p></div>
        ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
        <div class="m-actions"><button class="btn" type="submit">${I("lock", 17)}${m.change ? "שמירת הקוד החדש" : "הפעלת הנעילה"}</button><button type="button" class="btn ghost" data-act="backup">${I("download", 17)}קודם גיבוי</button></div></form>`;
    if (m.kind === "pin-off") return `<div class="m-h"><h2 id="m-title">כיבוי הנעילה</h2>${close}</div>
      <form id="pin-off-form" class="stack-s"><p>כדי לכבות את הנעילה, הזיני את הקוד הנוכחי.</p>
        <label class="field" for="pin-cur">הקוד הנוכחי<input id="pin-cur" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" required autocomplete="off" dir="ltr" class="pin-in" autofocus></label>
        ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
        <div class="m-actions"><button class="btn" type="submit">כיבוי הנעילה</button><button type="button" class="btn ghost" data-act="close-modal">ביטול</button></div></form>`;
    if (m.kind === "onboard") return onboardBody(m);
    if (m.kind === "welcome") return `<div class="welcome">${langSwitch()}<div class="mark big"><img src="${LOGO_IMG}" alt=""></div><h2 id="m-title" tabindex="-1" autofocus>ברוכה הבאה למעיין</h2>
      <p>יומן אישי לטהרת המשפחה: רישום, חישוב עונות הפרישה, שבעה נקיים ותזכורות.</p>
      <ul class="promises"><li>${I("lock", 18)}<span><strong>פרטי לגמרי.</strong> הכול נשמר רק בטלפון הזה, בלי חשבון ובלי שרת.</span></li>
      <li>${I("scale", 18)}<span><strong>שקוף.</strong> לכל מועד מוצג הכלל, ואת המנהג בוחרים לפי ההנחיה שקיבלת.</span></li>
      <li>${I("help", 18)}<span><strong>לא פוסק.</strong> זו גרסת בדיקה שטרם קיבלה אישור הלכתי. במקום של ספק המערכת מסמנת לבירור.</span></li></ul>
      <div class="stack-s"><button class="btn full" data-act="start-personal">${I("plus", 18)}התחלת יומן אישי</button>
      <button class="btn ghost full" data-act="start-demo">${I("flask", 18)}צפייה ביומן לדוגמה</button>
      <button class="link reviewer-link" data-act="start-review">${I("scale", 16)}אני בודק/ת הלכתי/ת</button></div>
      <p class="fine">המשך השימוש מהווה הסכמה ל<button class="link inline" data-act="terms">תנאי השימוש והפרטיות</button></p></div>`;
    return "";
  }
  const QUICK_TYPES = [["flow", "droplet"], ["hefsek", "hefsek"], ["bedikah", "bedikah"], ["mikvah", "mikvah"]];
  function openEvent(opts = {}) {
    const st = state(), ctx = currentContext(st, now());
    const date = opts.date || ctx.date, c = opts.date ? atLocation(st, date) : ctx.city;
    const form = opts.event ? { ...opts.event } : { id: M.uuid(), type: opts.type || (opts.date && opts.date > ctx.date ? "manual" : "flow"), date, time: timeInZone(now(), c.tz), cityId: c.id, result: "clear", note: "", authorityNote: "", createdAt: new Date().toISOString() };
    app.modal = { kind: "event", form, editing: !!opts.event, error: "", confirmDelete: false };
    if (opts.other) form.type = "note";
    renderModal();
  }
  function readEventForm() {
    const fd = new FormData($("#event-form")), f = { ...app.modal.form };
    for (const k of ["type", "date", "time", "cityId", "note", "authorityNote"]) if (fd.has(k)) f[k] = String(fd.get(k));
    f.result = fd.has("result") ? String(fd.get("result")) : f.result;
    f.onah = fd.has("onah") ? String(fd.get("onah")) || undefined : f.onah;
    if ($("#e-wake")) f.foundOnWaking = fd.has("foundOnWaking");
    return f;
  }
  function textModal(title, intro, text, file) { app.modal = { kind: "text", title, intro, text, file }; renderModal(); }
  async function download(text, name, type) {
    if (NATIVE && PL.Filesystem && PL.Share) {
      // אנדרואיד ו-iOS: הקובץ נכתב לתיקיית המטמון של האפליקציה ונפתח בחלון השיתוף של המערכת (שמירה בקבצים, מייל לעצמך וכו׳)
      const f = await PL.Filesystem.writeFile({ path: name, data: text, directory: "CACHE", encoding: "utf8" });
      expectAway();
      try { await PL.Share.share({ title: name, files: [f.uri], dialogTitle: L.t("שמירה או שליחה של הקובץ") }); }
      catch (err) { if (/cancel/i.test(String(err?.message || err))) return "cancelled"; throw err; }
      return "shared";
    }
    const a = document.createElement("a"), url = URL.createObjectURL(new Blob([text], { type }));
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("הועתק"); return true; }
    catch { const t = $("#m-text"); if (t) { t.focus(); t.select(); } toast("ההעתקה האוטומטית נחסמה. הטקסט מסומן — אפשר להעתיק ידנית."); return false; }
  }
  function reviewReport() {
    const st = state(), n = now(), note = ($("#rv-note")?.value || "").trim();
    const where = app.mode === "scenario" ? `תרחיש: ${app.scenario.title} (זמן מדומה)` : app.mode === "demo" ? "יומן לדוגמה" : "יומן אישי";
    const tests = app.testResults ? `בדיקות אוטומטיות: ${app.testResults.filter(t => t.ok).length}/${app.testResults.length} עברו` : "בדיקות אוטומטיות: לא הורצו";
    return [`הערות בודק — מעיין ${APP_VERSION}`, note ? `\nהערות:\n${note}\n` : "", `מקור הנתונים: ${where}`, tests, `מכשיר: ${navigator.userAgent}`, "", M.reportExport(st, n)].map(x => L.tx(x)).join("\n");
  }

  /* ---------- אירועים ---------- */
  document.addEventListener("click", async e => {
    if (app.locked || app.covered) {
      // מסך הנעילה: רק לחצני המקשים, טביעת אצבע ו״שכחתי את הקוד״
      const k = e.target.closest("[data-pin],[data-act]"); if (!k || !app.lock) return;
      if (k.dataset.pin) return pinDigit(k.dataset.pin);
      switch (k.dataset.act) {
        case "lock-bio": return tryBio();
        case "lock-forgot": app.lock.view = "forgot1"; return renderLock();
        case "lock-forgot2": app.lock.view = "forgot2"; return renderLock();
        case "lock-back": Object.assign(app.lock, { view: "pin", entry: "", bad: false, msg: "" }); return renderLock();
        case "lock-wipe": return wipeAll();
      }
      return;
    }
    const mf = e.target.closest("[data-family],[data-method]");
    if (mf && app.modal?.kind === "onboard") { e.preventDefault(); return onboardPick(mf.dataset); }
    if (mf) { e.preventDefault(); return mf.dataset.family ? chooseFamily(mf.dataset.family) : chooseMethod(mf.dataset.method); }
    const lb = e.target.closest("[data-lang]");
    if (lb) { applyLang(lb.dataset.lang, true); render(); syncNotifications(); return; }
    const qb = e.target.closest("[data-qtype]");
    if (qb && app.modal?.kind === "quick") {
      const v = qb.dataset.qtype, date = app.modal.date;
      app.modal = null; document.getElementById("modal").innerHTML = "";
      return openEvent({ type: v === "other" ? "note" : v, date, other: v === "other" });
    }
    if (e.target.closest('#r-file,label[for="r-file"]')) expectAway();
    if (app.suppressClick) { app.suppressClick = false; if (e.target.closest("[data-day]")) return; }
    const chip = e.target.closest("[data-etype]");
    if (chip && app.modal?.kind === "event") {
      app.modal.form = readEventForm();
      const v = chip.dataset.etype;
      app.modal.form.type = v === "other" ? (QUICK_TYPES.some(q => q[0] === app.modal.form.type) ? "note" : app.modal.form.type) : v;
      renderModal(); document.querySelector(`[data-etype="${v}"]`)?.focus({ preventScroll: true }); return;
    }
    const t = e.target.closest("[data-go],[data-act],[data-edit],[data-day],[data-cal],[data-calmode],[data-scenario],[data-scenario-load],[data-deltrip],[data-delplace]");
    if (!t) return;
    const d = t.dataset;
    if (d.go) { app.modal = null; return go(d.go); }
    if (d.edit) { const ev = state().events.find(x => x.id === d.edit); if (ev) openEvent({ event: ev }); return; }
    if (d.day) { app.cal.selected = d.day; if (d.day < app.cal.cursor.slice(0, 8) + "01" || t.classList.contains("out")) app.cal.cursor = d.day; return render(); }
    if (d.calmode) { app.cal.mode = d.calmode; app.cal.cursor = app.cal.selected; return render(); }
    if (d.cal) {
      const c = app.cal;
      if (d.cal === "today") { c.cursor = c.selected = currentContext(state(), now()).date; }
      else if (c.mode === "hebrew") { const h = hd(c.cursor); c.cursor = fromAbs(new HDate(1, h.getMonth(), h.getFullYear()).add(Number(d.cal), "M").abs()); c.selected = c.cursor; }
      else { const x = fromISO(c.cursor); c.cursor = c.selected = toISO(new Date(x.getFullYear(), x.getMonth() + Number(d.cal), 1, 12)); }
      return render();
    }
    if (d.scenario) { app.openScenario = app.openScenario === d.scenario ? null : d.scenario; return render(); }
    if (d.scenarioLoad) {
      const sc = SCENARIOS.find(s => s.id === d.scenarioLoad), b = sc.build();
      Object.assign(app, { mode: "scenario", scenario: sc, sandbox: M.parseState(b.state), simNow: b.now, cal: { cursor: null, mode: "civil", selected: null } });
      toast("נפתח תרחיש בזמן מדומה. היומן האישי לא השתנה."); return go("today");
    }
    if (d.delplace) {
      const st = state(), id = d.delplace;
      if (st.settings.cityId === id || st.events.some(x => x.cityId === id) || st.trips.some(x => x.cityId === id)) return toast("המקום בשימוש בהגדרות, ברישומים או בנסיעות, ולכן אי אפשר למחוק אותו.");
      try { commit({ ...st, places: st.places.filter(x => x.id !== id) }); } catch (err) { toast(err.message); } return;
    }
    if (d.deltrip) { const st = state(); try { commitUndoable({ ...st, trips: st.trips.filter(x => x.id !== d.deltrip) }, "הנסיעה נמחקה"); } catch (err) { toast(err.message); } return; }
    const st = state();
    switch (d.act) {
      case "add": return openEvent({ type: d.type, date: d.date });
      case "quick": app.modal = { kind: "quick", date: d.date || currentContext(st, now()).date }; return renderModal();
      case "prep": app.modal = { kind: "prep" }; return renderModal();
      case "more": app.jLimit += 200; return render();
      case "cycle": app.modal = { kind: "cycle", error: "", saved: 0 }; return renderModal();
      case "hide": app.hidden = !app.hidden; return render();
      case "lock-now": return lockNow();
      case "lock-change": app.modal = { kind: "pin-set", change: true, error: "" }; return renderModal();
      case "nudge-x": saveBackupInfo({ snooze: new Date().toISOString() }); toast("נזכיר שוב בהמשך. הגיבוי תמיד זמין בהגדרות."); return render();
      case "close-modal": if (app.modal?.kind === "terms" && app.modal.back) { app.modal = { kind: "welcome" }; return renderModal(); }
        if (app.modal?.kind === "onboard") return; // בחירת המנהג אינה נסגרת בלחיצה בצד
        if (app.modal?.kind === "welcome") { markSeen(); if (needsMethod()) { app.modal = onboardModal(); return renderModal(); } }
        app.modal = null; return renderModal();
      case "onboard-done": return onboardDone();
      case "onboard-back": app.modal = { kind: "welcome" }; return renderModal();
      case "method-card-x": dismissMethodCard(); return render();
      case "method-card-go": dismissMethodCard(); app.keep.delete("custom"); return go("prefs");
      case "toast-x": app.toast = ""; app.toastAction = null; return renderToast();
      case "toast-undo": { const a = app.toastAction; app.toast = ""; app.toastAction = null; renderToast(); try { a?.run(); } catch (err) { toast(err.message); } return; }
      case "demo": Object.assign(app, { mode: "demo", sandbox: M.demoState(realNow()), cal: { cursor: null, mode: "civil", selected: null } }); return go("today");
      case "personal": Object.assign(app, { mode: "personal", sandbox: null, scenario: null, cal: { cursor: null, mode: "civil", selected: null } }); return go("today");
      case "start-personal": markSeen(); app.modal = needsMethod() ? onboardModal() : null; renderModal(); return go("today");
      case "start-demo": markSeen(); app.modal = null; Object.assign(app, { mode: "demo", sandbox: M.demoState(realNow()) }); return go("today");
      case "start-review": markSeen(); app.modal = null; return go("review");
      case "delete": app.modal.form = readEventForm(); app.modal.confirmDelete = true; return renderModal();
      case "delete-no": app.modal.confirmDelete = false; return renderModal();
      case "delete-yes": try { const id = app.modal.form.id; app.modal = null; commitUndoable({ ...st, events: st.events.filter(x => x.id !== id) }, "הרישום נמחק"); } catch (err) { toast(err.message); } return;
      case "report": return textModal("דוח לבירור", "טקסט גלוי עם ההגדרות, הרישומים, המועדים והנקודות לבירור. לא נשלח לאף אחד — את מחליטה למי להעביר.", L.tx(M.reportExport(st, now())), { name: `maayan-report-${currentContext(st, now()).date}.txt`, type: "text/plain;charset=utf-8" });
      case "review-report": { const text = reviewReport(); if (await copy(text)) return; return textModal("דוח לבודק", "סמנו את הטקסט והעתיקו.", text); }
      case "ics": { const r = calculate(st, now()); return textModal("קובץ מועדים ליומן", "שומרים כקובץ ופותחים אותו ביומן הטלפון. אם השמירה לא עובדת כאן, פתחו את מעיין ישירות בדפדפן.", M.calendarExport(r.plans.map(p => ({ ...p, title: L.t(planTitle(p)), reason: L.t(p.reason) })), st.settings.neutralReminders, now(), { personal: L.t("תזכורת אישית"), details: L.t("פרטים ביומן האישי. מועד לתכנון בלבד.") }), { name: "maayan-dates.ics", type: "text/calendar;charset=utf-8" }); }
      case "copy-text": { const isBackup = app.modal.backup; if (await copy(app.modal.text) && isBackup) saveBackupInfo({ last: new Date().toISOString() }); return; }
      case "dl-text": try { const isBackup = app.modal.backup, how = await download(app.modal.text, app.modal.file.name, app.modal.file.type); if (how === "cancelled") return; if (isBackup) saveBackupInfo({ last: new Date().toISOString() }); if (how !== "shared") toast("הקובץ נשמר בהורדות"); } catch { toast("השמירה כקובץ נחסמה. אפשר להעתיק."); } return;
      case "backup": app.modal = { kind: "backup", error: "" }; return renderModal();
      case "restore": app.modal = { kind: "restore", error: "" }; return renderModal();
      case "clear": app.modal = { kind: "confirm", title: "למחוק את כל הרישומים?", text: "כל הרישומים והנסיעות יימחקו מהמכשיר. ההגדרות יישארו. אי אפשר לבטל.", yes: "מחיקה", danger: true, run: () => { app.blockSave = false; app.loadWarning = ""; commitUndoable({ ...st, events: [], trips: [] }, "כל הרישומים נמחקו"); } }; return renderModal();
      case "wipe": app.modal = { kind: "confirm", title: "למחוק את כל הנתונים?", text: "היומן, ההגדרות, המקומות והנסיעות יימחקו מהמכשיר הזה לצמיתות, וגם התזכורות המתוזמנות יבוטלו. אין עותק בשום שרת, ולכן אי אפשר לשחזר אלא מגיבוי ששמרת.", yes: "מחיקת כל הנתונים", danger: true, run: wipeAll }; return renderModal();
      case "confirm-yes": { const run = app.modal.run; app.modal = null; try { run(); } catch (err) { toast(err.message); } return renderModal(); }
      case "tests": { t.disabled = true; setTimeout(() => { app.testResults = MaayanTests(M).run(); M.setPlaces(state().places || []); render(); }, 30); return; }
      case "terms": app.modal = { kind: "terms", back: app.modal?.kind === "welcome" }; return renderModal();
      case "terms-back": app.modal = { kind: "welcome" }; return renderModal();
      case "locate": return detectLocation(t);
      case "exact": try { expectAway(); await PL.LocalNotifications.changeExactNotificationSetting(); } catch { /* */ } return;
      case "notify":
        if (NATIVE && PL.LocalNotifications) {
          try { expectAway(); const res = await PL.LocalNotifications.requestPermissions(); app.permission = res.display === "granted" ? "granted" : "denied"; toast(app.permission === "granted" ? "התראות הופעלו" : "ההרשאה לא ניתנה. אפשר לשנות בהגדרות המכשיר."); await syncNotifications(); } catch { toast("לא ניתן לבקש הרשאה להתראות"); }
          return render();
        }
        if (!("Notification" in window)) { app.permission = "unsupported"; toast("הדפדפן אינו תומך בהתראות"); return render(); }
        try { app.permission = await Notification.requestPermission(); toast(app.permission === "granted" ? "התראות הופעלו" : "ההרשאה לא ניתנה. אפשר לשנות בהגדרות הדפדפן."); } catch { app.permission = "unsupported"; toast("הדפדפן לא מאפשר לבקש הרשאה כאן"); }
        return render();
    }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.check !== undefined && t.dataset.check) {
      const st = state(), list = st.settings.checklist, item = t.dataset.check;
      try { commit({ ...st, settings: { ...st.settings, checklist: t.checked ? [...list, item] : list.filter(x => x !== item) } }); } catch (err) { toast(err.message); }
    } else if (t.form?.id === "settings-form") { saveSettings(t.form); }
    else if (t.dataset.quickset) { const st = state(); try { commit({ ...st, settings: { ...st.settings, [t.dataset.quickset]: t.checked } }); } catch (err) { toast(err.message); } }
    else if (t.id === "filter") { app.filter = t.value; render(); }
    else if (t.id === "e-type") { app.modal.form = readEventForm(); renderModal(); $("#e-type")?.focus(); }
    else if (t.id === "e-date") { const h = $("#e-heb"); if (h) h.textContent = M.validISO(t.value) ? L.t(`${hebrew(t.value)} · עד השקיעה`) : ""; }
    else if (t.id === "lk-on") { const on = t.checked; t.checked = !on; app.modal = { kind: on ? "pin-set" : "pin-off", change: false, error: "" }; renderModal(); }
    else if (t.id === "lk-after") { saveLockCfg({ after: Number(t.value) || 0 }); toast("נשמר במכשיר"); }
    else if (t.id === "lk-secure") { saveLockCfg({ secure: t.checked }); syncSecure(); toast("נשמר במכשיר"); }
    else if (t.id === "lk-bio") {
      if (!t.checked) { saveLockCfg({ bio: false }); toast("נשמר במכשיר"); return; }
      t.checked = false;
      bioAuth().then(ok => { if (ok) { saveLockCfg({ bio: true }); toast("הפתיחה בטביעת אצבע או בזיהוי פנים הופעלה"); } else toast("הזיהוי לא הצליח. הנעילה נשארת בקוד בלבד."); render(); });
    }
    else if (t.id === "bk-remind") { saveBackupInfo({ remind: t.value }); toast("נשמר במכשיר"); }
    else if (t.id === "r-file") { const f = t.files?.[0], nm = $("#r-file-name"); if (nm && f) { nm.textContent = f.name; nm.dir = "auto"; } if (f && f.size < 4e6) f.text().then(x => { $("#r-text").value = x; }); }
  });
  /* לחיצה ארוכה על יום בלוח (או תפריט הקשר) פותחת את תפריט הרישום המהיר לאותו יום */
  {
    let lp = null;
    const cancel = () => { if (lp) { clearTimeout(lp.timer); lp = null; } };
    const openQuick = d => { app.cal.selected = d; app.modal = { kind: "quick", date: d }; render(); };
    document.addEventListener("pointerdown", e => {
      app.suppressClick = false; // מחווה חדשה: הלחיצה הארוכה הקודמת כבר לא רלוונטית (לא תמיד מגיע אחריה click)
      const day = e.target.closest?.("[data-day]"); if (!day || e.button > 0) return;
      cancel();
      lp = { x: e.clientX, y: e.clientY, timer: setTimeout(() => { lp = null; app.suppressClick = true; try { navigator.vibrate?.(15); } catch { /* */ } openQuick(day.dataset.day); }, 500) };
    });
    document.addEventListener("pointermove", e => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) cancel(); }, { passive: true });
    for (const ev of ["pointerup", "pointercancel", "scroll"]) document.addEventListener(ev, cancel, { passive: true, capture: true });
    document.addEventListener("contextmenu", e => { const day = e.target.closest?.("[data-day]"); if (!day) return; e.preventDefault(); cancel(); app.suppressClick = false; if (app.modal?.kind !== "quick") openQuick(day.dataset.day); });
  }
  // פתיחה וסגירה של אזור שנשמר פתוח גם אחרי ציור מחדש (data-keep)
  document.addEventListener("toggle", e => { const k = e.target.dataset?.keep; if (k) { if (e.target.open) app.keep.add(k); else app.keep.delete(k); } }, true);
  document.addEventListener("input", e => { if (e.target.id === "q") { app.query = e.target.value; render(); } });
  document.addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, st = state();
    if (f.id === "event-form") {
      const ev = readEventForm();
      if (ev.type !== "manual") delete ev.onah;
      if (ev.type === "flow") ev.foundOnWaking = !!ev.foundOnWaking; else delete ev.foundOnWaking;
      if (!["hefsek", "bedikah", "question"].includes(ev.type)) ev.result = "clear";
      try { commit({ ...st, events: [...st.events.filter(x => x.id !== ev.id), ev] }); app.modal = null; renderModal(); }
      catch (err) { app.modal.form = ev; app.modal.error = err.message; renderModal(); }
    } else if (f.id === "settings-form") { saveSettings(f); } else if (f.id === "trip-form") {
      const fd = new FormData(f);
      try { commit({ ...st, trips: [...st.trips, { id: M.uuid(), cityId: String(fd.get("cityId")), from: String(fd.get("from")), to: String(fd.get("to")) }] }); } catch (err) { toast(err.message); }
    } else if (f.id === "place-form") {
      const m = app.modal, name = $("#p-name").value.trim();
      const bytes = new Uint8Array(4); crypto.getRandomValues(bytes);
      const pl = { id: "gps-" + [...bytes].map(x => x.toString(16).padStart(2, "0")).join(""), name, lat: m.lat, lon: m.lon, tz: m.tz };
      try { app.modal = null; commit({ ...st, places: [...(st.places || []), pl], settings: { ...st.settings, cityId: pl.id } }); renderModal(); }
      catch (err) { app.modal = { ...m, name, error: err.message }; renderModal(); }
    } else if (f.id === "cycle-form") {
      const v = id => $(id).value, c = v("#c-city"), stamp = new Date().toISOString();
      const mk = (type, date, time) => ({ id: M.uuid(), type, date, time, cityId: c, result: "clear", note: "", authorityNote: "", createdAt: stamp });
      try {
        const list = [mk("flow", v("#c-flow"), v("#c-flow-t"))];
        if (v("#c-hef")) { if (v("#c-hef") < v("#c-flow")) throw new Error("ההפסק צריך להיות אחרי תחילת הווסת"); list.push(mk("hefsek", v("#c-hef"), v("#c-hef-t") || "16:00")); }
        if (v("#c-mik")) { if (v("#c-mik") <= (v("#c-hef") || v("#c-flow"))) throw new Error("הטבילה צריכה להיות אחרי ההפסק"); if (!v("#c-hef")) throw new Error("כדי לרשום טבילה צריך לרשום גם את ההפסק"); list.push(mk("mikvah", v("#c-mik"), "20:30")); }
        if (st.events.some(e => e.type === "flow" && e.date === list[0].date)) throw new Error("כבר רשומה תחילת וסת בתאריך הזה");
        const saved = app.modal.saved + 1;
        commit({ ...st, events: [...st.events, ...list] });
        app.modal = { kind: "cycle", error: "", saved }; renderModal();
      } catch (err) { app.modal.error = err.message; renderModal(); }
    } else if (f.id === "backup-form") {
      try { const text = await M.encryptBackup(st, $("#b-pass").value); textModal("הגיבוי מוכן", "שמרי את הקובץ או העתיקי את הטקסט למקום בטוח (למשל מייל לעצמך). לשחזור צריך גם את הסיסמה.", text, { name: `maayan-backup-${currentContext(st, now()).date}.may`, type: "application/json" }); app.modal.backup = true; if (app.mode === "personal") { saveBackupInfo({ last: new Date().toISOString() }); render(); } }
      catch (err) { app.modal.error = err.message; renderModal(); }
    } else if (f.id === "pin-form") {
      const m = app.modal, v = id => ($(id)?.value || "").trim();
      try {
        if (m.change && !(await checkPin(v("#pin-old")))) throw new Error("הקוד הנוכחי שגוי");
        if (!validPin(v("#pin-new"))) throw new Error("הקוד צריך להיות 4 עד 6 ספרות");
        if (v("#pin-new") !== v("#pin-new2")) throw new Error("שני הקודים אינם זהים");
        await setPin(v("#pin-new"));
        app.modal = null; syncSecure(); render();
        toast(m.change ? "הקוד הוחלף" : "הנעילה הופעלה. שמרי את הקוד במקום שתזכרי.");
      } catch (err) { app.modal = { ...m, error: err.message }; renderModal(); }
    } else if (f.id === "pin-off-form") {
      const m = app.modal;
      try {
        if (!(await checkPin(($("#pin-cur")?.value || "").trim()))) throw new Error("הקוד שגוי");
        try { localStorage.removeItem(LOCK_KEY); localStorage.removeItem(LOCKFAIL_KEY); } catch { /* */ }
        app.modal = null; syncSecure(); render(); toast("הנעילה כובתה");
      } catch (err) { app.modal = { ...m, error: err.message }; renderModal(); }
    } else if (f.id === "restore-form") {
      try {
        const text = $("#r-text").value.trim(); if (!text) throw new Error("יש לבחור קובץ או להדביק את טקסט הגיבוי");
        const restored = M.parseState(await M.decryptBackup(text, $("#r-pass").value));
        app.modal = { kind: "confirm", title: "להחליף את היומן?", text: `היומן הנוכחי יוחלף בגרסה מהגיבוי (${restored.events.length} רישומים).`, yes: "שחזור", run: () => { app.blockSave = false; app.loadWarning = ""; commit(restored); } };
        renderModal();
      } catch (err) { app.modal.error = err.message; app.modal.text = $("#r-text")?.value || ""; renderModal(); }
    }
  });
  document.addEventListener("keydown", e => {
    // מקלדת: Tab נשאר בתוך החלון הפתוח
    if (e.key === "Tab" && app.modal) {
      const f = [...document.querySelectorAll("#modal .sheet :is(button,input:not([type=hidden]),select,textarea,a[href],summary):not(:disabled)")].filter(x => x.offsetParent);
      if (f.length && !f.includes(document.activeElement)) { e.preventDefault(); f[0].focus(); }
      else if (f.length && e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (f.length && !e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && app.modal) closeTop(); });
  /** Escape ובאנדרואיד ״חזרה״: מבחירת המנהג חוזרים לברוכה הבאה, ומברוכה הבאה ליומן רק אם המנהג כבר נבחר */
  function closeTop() {
    if (app.modal.kind === "onboard") { app.modal = { kind: "welcome" }; return renderModal(); }
    if (app.modal.kind === "welcome") { markSeen(); if (needsMethod()) return false; }
    app.modal = null; renderModal();
  }
  /** ההגדרות נשמרות מיד בכל שינוי, בלי כפתור שמירה */
  function saveSettings(f) {
    const st = state(), fd = new FormData(f), s = { ...st.settings };
    for (const k of ["cityId", "method", "wait", "haflagah", "beinonit", "missingMonthly", "bedikot", "nightfall", "beinHashmashot", "hefsekTwilight", "special", "methodNote", "morningTime"]) if (fd.has(k)) s[k] = String(fd.get(k));
    s.reminderMinutes = Number(fd.get("reminderMinutes"));
    for (const k of ["day31", "orZarua", "carryMonthly", "carryLongIntervals", "remindersEnabled", "neutralReminders"]) s[k] = fd.has(k);
    if (f.querySelector('[name="widgetStyle"]')) { s.widgetEnabled = fd.has("widgetEnabled"); s.widgetStyle = fd.get("widgetStyle") === "full" ? "full" : "discreet"; } // וידג׳ט
    // בחירת שיטה חדשה קובעת את כל הגדרות החישוב שלה; שינוי הגדרה בודדת אחר כך נשמר כשינוי מהשיטה
    if (s.method !== st.settings.method) Object.assign(s, M.applyPreset(s, s.method));
    if (JSON.stringify(s) === JSON.stringify(st.settings)) return;
    try { commit({ ...st, settings: s }); } catch (err) { toast(err.message); render(); }
  }
  function markSeen() { storage.set(SEEN_KEY, "1"); }
  /** מחיקת כל הנתונים מהמכשיר (דרישת חנויות האפליקציות): יומן, הגדרות, שפה, ותזכורות מתוזמנות */
  async function wipeAll() {
    for (const k of [STORE_KEY, SEEN_KEY, LANG_KEY, LOCK_KEY, LOCKFAIL_KEY, BACKUP_KEY, METHODCARD_KEY]) { try { localStorage.removeItem(k); } catch { /* */ } }
    Object.assign(app, { locked: false, covered: false, lock: null, lockedModal: null });
    Object.assign(app, { mode: "personal", personal: M.newDiary(), sandbox: null, scenario: null, blockSave: false, loadWarning: "", cal: { cursor: null, mode: "civil", selected: null }, modal: { kind: "welcome" } });
    syncSecure();
    if (window.MaayanWidget) MaayanWidget.clear();
    toast("כל הנתונים נמחקו מהמכשיר");
    go("today");
    // ביטול התזכורות דרך אותו תור של כל סנכרון: סנכרון שכבר רץ עם היומן הקודם יסתיים קודם, ואחריו הכול מבוטל
    // (יומן ריק = שום תזכורת לא מתוזמנת מחדש)
    await syncNotifications();
  }

  /* ---------- זיהוי מיקום ---------- */
  function webLocation(gps) {
    if (!navigator.geolocation) return Promise.reject(new Error("הדפדפן הזה אינו תומך בזיהוי מיקום. אפשר לבחור עיר מהרשימה."));
    return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, () => rej(new Error(gps ? "לא ניתן לזהות מיקום כרגע. אפשר לנסות שוב במקום פתוח, או לבחור עיר מהרשימה." : "לא ניתן לזהות מיקום כאן. יש לאשר הרשאת מיקום בדפדפן, או לבחור עיר מהרשימה.")), { enableHighAccuracy: gps, timeout: 30000, maximumAge: 600000 }));
  }
  async function detectLocation(btn) {
    if (btn) btn.disabled = true;
    toast("מזהה מיקום…");
    try {
      let pos;
      if (NATIVE && PL.Geolocation) {
        expectAway();
        const perm = await PL.Geolocation.requestPermissions();
        if (perm.location !== "granted" && perm.coarseLocation !== "granted") throw new Error("לא ניתנה הרשאת מיקום. אפשר לאשר בהגדרות המכשיר, או לבחור עיר מהרשימה.");
        // קודם שירות המיקום של Google; אם אינו זמין (למשל במכשיר בלי שירותי Google) — ה-GPS של המכשיר
        try { pos = await Promise.race([PL.Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))]); }
        catch { pos = await webLocation(true); }
      } else pos = await webLocation(false);
      const lat = Math.round(pos.coords.latitude * 1e4) / 1e4, lon = Math.round(pos.coords.longitude * 1e4) / 1e4;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem";
      const dist = c => { const R = Math.PI / 180, x = (c.lon - lon) * R * Math.cos((c.lat + lat) / 2 * R), y = (c.lat - lat) * R; return Math.sqrt(x * x + y * y) * 6371; };
      const near = [...CITIES].sort((a, b) => dist(a) - dist(b))[0], close = dist(near) <= 25;
      app.toast = "";
      app.modal = { kind: "place", lat, lon, tz, near: close ? near.name : "", name: L.t(close ? `ליד ${near.name}` : "המיקום שלי"), error: "" };
      renderModal(); renderToast();
    } catch (err) { toast(err && err.message && /[\u0590-\u05FF]/.test(err.message) ? err.message : "לא ניתן לזהות מיקום כרגע. אפשר לנסות שוב במקום פתוח, או לבחור עיר מהרשימה."); }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  }

  /* ---------- התראות מתוזמנות (אפליקציית אנדרואיד) ---------- */
  const hashId = str => { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000 + 1; };
  /**
   * מתי להתריע על כל מועד. עונת פרישה שמתחילה בשקיעה (כולל אור זרוע): ההתראה מגיעה ״דקות לפני השקיעה״ לפני תחילתה,
   * כדי שיהיה זמן להתכונן. עונת יום: התראה בבוקר, בשעת בדיקת הבוקר. שאר המועדים (הפסק, בדיקות, טבילה) — כפי שחושבו.
   */
  function alertsFor(st, r, n) {
    const s = st.settings, neutral = s.neutralReminders, out = [];
    for (const p of r.plans) {
      if (p.done) continue;
      const c = city(p.cityId), start = new Date(p.start), sep = SEP_KINDS.includes(p.kind);
      let at = start, body = `${p.onah === "day" ? planHebrew(p) : L.t(`ליל ${planHebrew(p)}`)} · ${L.t(onahLabel(p.onah))}`;
      if (sep && p.onah === "night") {
        at = new Date(start.valueOf() - Number(s.reminderMinutes || 0) * 60000);
        body = L.t(`הערב (מהשקיעה ${timeInZone(start, c.tz)}) ${planTitle(p)}`);
      } else if (sep && p.onah === "day") {
        let morning = null;
        try { morning = M.localInstant(p.date, s.morningTime || "08:00", c.tz); } catch { /* */ }
        if (morning && morning > start && (!p.end || morning < new Date(p.end))) at = morning;
        body = L.t(`היום${p.end ? ` (עד השקיעה ${timeInZone(new Date(p.end), c.tz)})` : ""} ${planTitle(p)}`);
      }
      if (at <= n) continue;
      out.push({ key: p.id, at, title: L.t(neutral ? "תזכורת אישית" : planTitle(p)), body: neutral ? L.t("פרטים ביומן האישי") : body });
    }
    return out.sort((a, b) => a.at - b.at);
  }
  let syncing = Promise.resolve();
  function syncNotifications() { syncing = syncing.then(doSync, doSync); return syncing; }
  async function doSync() {
    if (!NATIVE || !PL.LocalNotifications) return;
    const LN = PL.LocalNotifications;
    try {
      const perm = await LN.checkPermissions();
      app.permission = perm.display === "granted" ? "granted" : perm.display === "denied" ? "denied" : "default";
      try { const ex = await LN.checkExactNotificationSetting(); app.exact = ex.exact_alarm === "granted"; } catch { app.exact = null; }
      const pending = await LN.getPending();
      if (pending.notifications.length) await LN.cancel({ notifications: pending.notifications.map(x => ({ id: x.id })) });
      app.scheduled = 0;
      const st = app.personal;
      if (app.permission !== "granted" || !st.settings.remindersEnabled) return;
      // ערוצי התראות קיימים רק באנדרואיד; ב-iOS הקריאה נכשלת ועוצרת את תזמון כל התזכורות
      if (CAP.getPlatform && CAP.getPlatform() === "android") { try { await LN.createChannel({ id: "maayan", name: L.t("תזכורות"), description: L.t("תזכורות אישיות מהיומן"), importance: 4, visibility: 0 }); } catch { /* ממשיכים בלי ערוץ */ } }
      const n = new Date(), r = calculate(st, n);
      const list = alertsFor(st, r, n).slice(0, 60).map(a => ({ id: hashId(a.key), channelId: "maayan", title: a.title, body: a.body, schedule: { at: a.at, allowWhileIdle: true } }));
      if (list.length) await LN.schedule({ notifications: list });
      app.scheduled = list.length;
    } catch (err) { console.warn("notifications", err); }
  }

  /* ---------- שעון והתראות ---------- */
  function tick() {
    if (app.mode === "scenario") return;
    const st = state(), n = now(), r = calculate(st, n), ctx = currentContext(st, n);
    if (!NATIVE && app.permission === "granted" && st.settings.remindersEnabled && app.mode === "personal") {
      // אותו חישוב כמו באפליקציה: מסתכלים 90 שניות אחורה, כי השעון מתקתק כל 30 שניות
      for (const al of alertsFor(st, r, new Date(n.valueOf() - 90000))) {
        if (al.at > n || app.notified.has(al.key)) continue;
        app.notified.add(al.key);
        try { new Notification(al.title, { body: al.body, tag: al.key }); } catch { /* */ }
      }
    }
    if (app.mode === "personal" && ctx.abs !== app.widgetDay) { app.widgetDay = ctx.abs; if (window.MaayanWidget) MaayanWidget.update(state(), now()); }
    if (app.locked || app.covered) return;
    if (`${ctx.abs}|${r.phase}|${app.mode}` !== app.lastDayKey && !app.modal) render();
  }

  /* ---------- הפעלה ---------- */
  {
    const saved = storage.get(LANG_KEY), nav = (navigator.language || "he").slice(0, 2).toLowerCase();
    applyLang(saved || (L.LANGS[nav] ? nav : (nav === "iw" ? "he" : "en")), false);
  }
  app.personal = loadPersonal();
  if (NATIVE) app.permission = "default"; else if ("Notification" in window) app.permission = Notification.permission; else app.permission = "unsupported";
  const hash = location.hash.slice(1);
  if (NAV.some(n => n[0] === hash)) app.tab = hash;
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (NAV.some(n => n[0] === h) && h !== app.tab) go(h); });
  // נעילה בפתיחה: אם הוגדר קוד, מסך הנעילה מוצג לפני כל דבר אחר
  if (lockCfg()) { app.locked = true; app.lock = { entry: "", view: "pin", msg: "", bad: false, busy: false }; }
  render();
  syncSecure();
  firstRun();
  if (BIO()) BIO().checkBiometry().then(r => { app.bio = r; if (app.locked && lockCfg()?.bio && r.isAvailable) tryBio(); else if (!app.locked && app.tab === "prefs" && !app.modal) render(); }).catch(() => { app.bio = null; });
  setInterval(tick, 30000);
  /** יציאה לרקע: נעילה מיד, או כיסוי המסך (בלי נתונים) עד שיעבור זמן הנעילה שנבחר */
  let awayAt = 0;
  function onHide() {
    if (awayAt) return;
    awayAt = Date.now();
    const c = lockCfg();
    if (!c || app.locked || app.awayOk > Date.now()) return;
    if (!Number(c.after)) lockNow(); else { app.covered = true; render(); }
  }
  function onShow() {
    if (!awayAt) return;
    const gone = (Date.now() - awayAt) / 1000, c = lockCfg(), expected = app.awayOk > awayAt;
    awayAt = 0; app.awayOk = 0;
    if (c && !app.locked) {
      const limit = expected ? Math.max(Number(c.after) || 0, 600) : Number(c.after) || 0;
      app.covered = false;
      if (gone > limit) lockNow(); else render();
    } else if (app.locked && lockCfg()?.bio && app.bio?.isAvailable && !expected) tryBio();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return onHide();
    onShow();
    tick(); if (NATIVE) syncNotifications().then(() => { if (app.tab === "dates" && !app.modal && !app.locked) render(); });
  });
  if (NATIVE && PL.App) PL.App.addListener("appStateChange", ({ isActive }) => { if (isActive) onShow(); else onHide(); });
  document.addEventListener("keydown", e => {
    if (!app.locked || !app.lock || app.lock.view !== "pin") return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pinDigit(e.key); } else if (e.key === "Backspace") { e.preventDefault(); pinDigit("del"); }
  });
  if (NATIVE && PL.App) PL.App.addListener("backButton", () => {
    if (app.locked || app.covered) { if (app.lock && app.lock.view !== "pin") { app.lock.view = "pin"; return renderLock(); } return PL.App.minimizeApp(); }
    if (app.modal) { if (closeTop() === false) PL.App.minimizeApp(); }
    else if (app.tab === "review") go("prefs");
    else if (app.tab !== "today") go("today");
    else PL.App.minimizeApp();
  });
  if (NATIVE) syncNotifications().then(() => { if (app.tab === "dates" && !app.modal && !app.locked) render(); });
  // אתר: התקנה למסך הבית ועבודה בלי רשת
  if (!NATIVE && "serviceWorker" in navigator && location.protocol === "https:" && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
