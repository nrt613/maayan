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
  const CAP = window.Capacitor, NATIVE = !!(CAP && typeof CAP.isNativePlatform === "function" && CAP.isNativePlatform()), PL = NATIVE ? CAP.Plugins : {};
  const TERMS_VERSION = "2026-11";
  const $ = sel => document.querySelector(sel);
  const placeOptions = (st, selected) => [...CITIES, ...(st.places || [])].map(c => `<option value="${c.id}"${selected === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- אייקונים ---------- */
  const P = {
    spring: '<path d="M3.6 10.2C6.2 6 11.2 6.6 12.4 18.2"/><path d="M20.4 12.4C18.3 9.4 13.9 10 12.4 18.2"/><ellipse cx="12" cy="18.6" rx="7.2" ry="2.3"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c7 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6C3.6 8.6 2 12 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    sunrise: '<path d="M12 2v8M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0"/>',
    sunset: '<path d="M12 10V2M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M16 6l-4 4-4-4M16 18a4 4 0 0 0-8 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', out: '<path d="M17 17 7 7M7 17V7h10"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    list: '<path d="M10 6h11M10 12h11M10 18h11M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>',
    flask: '<path d="M10 2v7.3L4.3 19a2 2 0 0 0 1.7 3h12a2 2 0 0 0 1.7-3L14 9.3V2M8.5 2h7M7 16h10"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    play: '<path d="m7 4 12 8-12 8z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M8 16H3v5"/>',
    scale: '<path d="M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
    finger: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    backspace: '<path d="M10 5a2 2 0 0 0-1.34.52l-6.33 5.74a1 1 0 0 0 0 1.48l6.33 5.74A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6M18 9l-6 6"/>',
  };
  const I = (n, s = 20) => `<svg class="ic${n === "left" || n === "right" || n === "out" ? " dirflip" : ""}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  /* ---------- מצב ---------- */
  const storage = {
    ok: true,
    get(k) { try { return localStorage.getItem(k); } catch { this.ok = false; return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { this.ok = false; return false; } },
  };
  function loadPersonal() {
    const raw = storage.get(STORE_KEY);
    if (!raw) return M.emptyState();
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
  function planLine(p, { compact = false, open = false } = {}) {
    const c = city(p.cityId), start = timeInZone(new Date(p.start), c.tz);
    const prefix = p.onah === "day" ? "" : "ליל ";
    return `<details class="plan k-${p.kind}${p.done ? " done" : ""}"${open ? " open" : ""}>
      <summary><span class="plan-ic">${I(p.onah === "day" ? "sun" : "moon", 17)}</span>
        <span class="plan-name"><strong>${esc(planTitle(p))}</strong><small><span class="hebdate">${prefix}${esc(planHebrew(p))}</span>${compact ? "" : ` · ${esc(civilLabel(p.date, true))} · ${esc(c.name)}`}</small></span>
        <time dir="ltr">${start}</time>${I("left", 15)}</summary>
      <div class="plan-more"><p>${esc(p.reason)}</p>
        <small>${onahLabel(p.onah)} · ${p.end ? `מ-${start} עד ${timeInZone(new Date(p.end), c.tz)}` : `מ-${start}`} · ${esc(c.name)}</small>
        ${p.done ? '<small class="ok-text">בדיקה נרשמה</small>' : ""}
        ${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">מקור הכלל ${I("out", 13)}</a>` : ""}</div></details>`;
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
    if (!app.modal && !storage.get(SEEN_KEY) && !app.personal.events.length) { app.modal = { kind: "welcome" }; renderModal(); }
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
    const days = phase === "clean" ? `<ol class="seven" aria-label="שבעת הימים">${[1, 2, 3, 4, 5, 6, 7].map(d =>
      `<li class="${d < cd ? "past" : ""}${d === cd ? " now" : ""}"><span>${r.checks[d]?.length ? I("check", 16) : d}</span><small>${d === cd ? "היום" : "יום " + d}</small></li>`).join("")}</ol>` : "";
    const ring = phase === "clean" && cd ? `<div class="ring" style="--p:${cd / 7}"><strong>${cd}</strong><small>מתוך 7</small></div>`
      : `<div class="ring idle">${I(phase === "waiting" ? "moon" : "spring", 44)}</div>`;
    const next = upcoming[0];
    const nextLine = next ? (() => {
      const c = city(next.cityId), when = new Date(next.start), dayDiff = M.isoAbs(next.date) - M.isoAbs(date);
      const rel = dayDiff <= 0 ? (when < now() ? "עכשיו" : next.onah === "day" ? "היום" : "הלילה") : dayDiff === 1 ? "מחר" : `בעוד ${dayDiff} ימים`;
      return `<button class="next k-${next.kind}" data-go="dates"><span class="next-l">המועד הבא</span><span class="next-main"><strong>${esc(planTitle(next))}</strong><small><span>${rel}</span> · <span class="hebdate">${esc(next.onah === "day" ? planHebrew(next) : `ליל ${planHebrew(next)}`)}</span></small></span><time dir="ltr">${timeInZone(when, c.tz)}</time>${I("left", 15)}</button>`;
    })() : "";
    const first = app.mode === "personal" && !st.events.length;
    const checklistOpen = (phase === "clean" && cd >= 6) || (phase === "planned" && mikvahNight);
    return `
    <div class="today">
      <section class="hero" data-phase="${phase}">
        <div class="hero-row"><div class="hero-copy">
          <span class="chip-light"><i class="phase-dot"></i>${first ? "היומן שלך ריק" : esc(phase === "planned" && mikvahNight ? "ליל הטבילה" : PHASE_NAMES[phase])}</span>
          <h2>${esc(C[0])}</h2><p>${esc(first ? "כדאי להתחיל מהזנת המחזורים האחרונים (לפחות שניים), כדי שההפלגה ועונת החודש יחושבו נכון. אפשר גם להתאים קודם את שיטת החישוב." : C[1])}</p>
        </div>${ring}</div>${days}
        <button class="btn hero-btn" data-act="add" data-type="${C[3]}">${I("plus", 19)}${esc(C[2])}</button>
        ${first ? `<div class="row-btns first-btns"><button class="btn ghost sm" data-act="cycle">${I("calendar", 16)}הזנת מחזורים קודמים</button><button class="btn ghost sm" data-go="prefs">${I("sliders", 16)}שיטת החישוב</button><button class="btn ghost sm" data-act="demo">${I("flask", 16)}יומן לדוגמה</button></div>` : ""}
        ${nextLine}
      </section>
      ${backupNudge(st)}
      ${first ? `<section class="card method"><div class="card-h">${I("scale")}<div><h3>שיטת החישוב שלך</h3><p>לבחור לפי ההנחיה שקיבלת. אפשר לשנות בכל עת</p></div></div>
        <ul class="method-sum">${M.settingsSummary(st.settings).filter(x => /^(שיטה|המתנה|הפלגה|עונה בינונית)/.test(x)).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <label class="toggle" for="q-orZarua"><span><strong>עונת אור זרוע</strong><small>העונה שלפני כל עונת פרישה — לפי הוראת הרב</small></span><input id="q-orZarua" type="checkbox" role="switch" data-quickset="orZarua"${st.settings.orZarua ? " checked" : ""}></label>
        <button class="btn ghost full" data-go="prefs">${I("sliders", 17)}כל אפשרויות החישוב</button></section>` : ""}
      ${r.reviews.length ? `<button class="notice" data-go="journal">${I("help", 22)}<span><strong>${r.reviews.length} ${r.reviews.length === 1 ? "נקודה לבירור" : "נקודות לבירור"}</strong><small>${esc(r.reviews[0].title)}</small></span>${I("left", 16)}</button>` : ""}
      <section class="card upcoming"><div class="card-h">${I("bell")}<h3>מועדים קרובים</h3><button class="link" data-go="dates">הכול ${I("left", 14)}</button></div>
        ${upcoming.length > 1 ? `<div class="plans">${upcoming.slice(1).map(p => planLine(p)).join("")}</div>` : `<p class="empty">${upcoming.length ? "אין מועדים נוספים בקרוב." : first ? "המועדים יופיעו כאן אחרי הרישום הראשון." : "אין מועדים קרובים."}</p>`}
      </section>
      <section class="card times">
        <div class="card-h">${I("sunset")}<div><h3>זמני היום</h3><p>${esc(loc.name)} · ${esc(civilLabel(date, true))}</p></div></div>
        <dl>${[["זריחה", "sunrise", times.sunrise], ["שקיעה", "sunset", times.sunset], ["צאת הכוכבים", "moon", times.nightfall]].map(([n, ic, v]) =>
          `<div${ic === "sunset" ? ' class="hl"' : ""}>${I(ic, 18)}<dt>${n}</dt><dd dir="ltr">${timeInZone(v, loc.tz)}</dd></div>`).join("")}</dl>
        <p class="fine">בגובה פני הים · מעוגל לחומרא · צאת הכוכבים: ${esc(M.nightfallLabel(st.settings.nightfall))}</p>
      </section>
      <details class="card checklist"${checklistOpen ? " open" : ""}><summary class="card-h">${I("list")}<h3>רשימת הכנה למקווה</h3><span class="count">${st.settings.checklist.length}/${M.CHECKLIST.length}</span>${I("left", 15)}</summary>
        <div class="checks">${M.CHECKLIST.map((item, i) => `<label class="${st.settings.checklist.includes(item) ? "on" : ""}"><input type="checkbox" id="chk-${i}" data-check="${esc(item)}" ${st.settings.checklist.includes(item) ? "checked" : ""}><span>${esc(item)}</span></label>`).join("")}</div>
      </details>
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
      <div class="legend" aria-label="מקרא"><span><i class="sw sw-niddah"></i>ימי וסת עד ההפסק</span><span><i class="sw sw-clean"></i>שבעה נקיים</span><span><i class="sw sw-sep"></i>עונת פרישה</span>${st.settings.orZarua ? `<span><em class="d-z"></em>עונת אור זרוע</span>` : ""}<span><i class="sw sw-mik"></i>טבילה</span><span><em class="d-f"></em>וסת נרשמה</span><span><em class="d-c"></em>הפסק או בדיקה</span></div>
      <p class="fine">הצבעים מבוססים על הרישומים שלך ועל המועדים המחושבים. התאריך העברי במשבצת שייך לשעות היום; בשקיעה מתחיל התאריך העברי הבא.</p>
    </section>
    <section class="card dayp"><div class="card-h">${I("calendar")}<div><h3>${esc(weekdayName(sel))}, ${esc(civilLabel(sel))}</h3><p class="hebdate">${esc(hebrew(sel))} · שעות היום</p></div></div>
      ${ents.map(entryRow).join("")}${pl.length ? `<div class="plans">${pl.map(p => planLine(p, { compact: true })).join("")}</div>` : ""}
      ${!ents.length && !pl.length ? `<p class="empty">אין רישומים או מועדים ביום הזה.</p>` : ""}
      <button class="btn ghost full" data-act="quick" data-date="${sel}">${I("plus", 17)}רישום ליום הזה</button></section></div>`;
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
    return `<button class="entry" data-edit="${e.id}"><span class="ev-ic t-${e.type}">${I(e.type === "flow" ? "droplet" : e.type === "mikvah" ? "moon" : ["bedikah", "hefsek"].includes(e.type) ? "check" : "book", 17)}</span>
      <span class="entry-main"><strong>${esc(EVENT_NAMES[e.type])}</strong><small>${esc(civilLabel(e.date, true))} · <span dir="ltr">${e.time}</span> · <span class="hebdate">${esc(h)}</span>${onah ? ` · ${onah}` : ""}</small>${e.note ? `<small class="note" data-nt>${esc(e.note)}</small>` : ""}</span>
      <span class="entry-side"><small>${esc(status)}</small>${I("pencil", 15)}</span></button>`;
  }

  function viewJournal(st, r) {
    const q = app.query.trim().toLowerCase();
    const evs = [...st.events].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .filter(e => (app.filter === "all" || e.type === app.filter) && (!q || `${EVENT_NAMES[e.type]} ${e.date} ${e.note} ${hebrew(e.date)}`.toLowerCase().includes(q)));
    return `${r.reviews.length ? `<section class="card reviews"><div class="card-h">${I("help")}<h3>נקודות לבירור <span class="count">${r.reviews.length}</span></h3></div>
      <p class="fine">המערכת אינה מכריעה בנקודות אלה. כל נקודה מפנה לרישומים הנוגעים בה.</p>
      ${r.reviews.map(v => `<details><summary>${esc(v.title)}${I("left", 15)}</summary><p>${esc(v.detail)}</p>${v.eventIds.map(id => { const e = st.events.find(x => x.id === id); return e ? `<button class="link" data-edit="${id}">${esc(EVENT_NAMES[e.type])} · ${esc(civilLabel(e.date, true))} ${I("pencil", 13)}</button>` : ""; }).join("")}</details>`).join("")}</section>` : ""}
    <section class="card"><div class="card-h">${I("book")}<h3>רישומים <span class="count">${st.events.length}</span></h3><button class="link" data-act="report">${I("file", 15)}דוח לבירור</button></div>
      <div class="filters"><label class="search">${I("search", 17)}<input id="q" type="search" placeholder="חיפוש לפי תאריך או הערה" value="${esc(app.query)}" aria-label="חיפוש"></label>
      <select id="filter" aria-label="סינון לפי סוג"><option value="all">כל הסוגים</option>${Object.entries(EVENT_NAMES).map(([v, n]) => `<option value="${v}"${app.filter === v ? " selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="entries">${evs.slice(0, app.jLimit).map(entryRow).join("") || (st.events.length ? `<p class="empty">לא נמצאו רישומים מתאימים.</p>` : `<div class="empty-state">${I("book", 30)}<strong>אין עדיין רישומים</strong><p>כל רישום — וסת, הפסק, בדיקה או טבילה — יופיע כאן, מהחדש לישן.</p></div>`)}</div>
      ${evs.length > app.jLimit ? `<button class="btn ghost full" data-act="more">הצגת רישומים קודמים (${evs.length - app.jLimit} נוספים)</button>` : ""}
      <div class="row-btns"><button class="btn" data-act="add">${I("plus", 17)}רישום חדש</button><button class="btn ghost" data-act="cycle">${I("calendar", 17)}הזנת מחזור קודם</button></div></section>`;
  }

  function viewDates(st, r) {
    const n = now(), up = r.plans.filter(p => !p.done && new Date(p.end || p.start) >= n), past = r.plans.filter(p => !up.includes(p));
    return `<div class="two"><section class="card"><div class="card-h">${I("bell")}<h3>מועדים עתידיים <span class="count">${up.length}</span></h3></div>
      ${up.length ? `<div class="plans">${up.map(p => planLine(p)).join("")}</div>` : `<div class="empty-state">${I("bell", 30)}<strong>אין מועדים עתידיים כרגע</strong><p>${st.events.length ? "מועדים חדשים יחושבו מהרישומים הבאים." : "אחרי רישום תחילת וסת יופיעו כאן עונות הפרישה, ההפסק והבדיקות."}</p></div>`}
      ${past.length ? `<details class="past"><summary>מועדים שעברו או שהושלמו (${past.length})${I("left", 15)}</summary><div class="plans">${past.map(p => planLine(p)).join("")}</div></details>` : ""}
      <p class="fine">כל מועד הוא תכנון לפי השיטה שנבחרה בהגדרות. לחיצה על מועד מציגה את הכלל ואת המקור.</p></section>
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
    <section class="card"><div class="card-h">${I("scale")}<div><h3>שיטת החישוב</h3><p>לבחור לפי ההנחיה שקיבלת</p></div></div>
      ${sel("method", "שיטה מוכנה", s, [["custom", "התאמה אישית"], ["ashkenaz", "מנהג אשכנז הרווח"], ["sefard", "שיטת הרב עובדיה יוסף / מנהג ספרד"], ["chabad", "מנהג חב״ד"]])}
      ${methodNotes(s)}
      ${sel("wait", "המתנה לפני שבעה נקיים", s, [["five", "חמישה ימים מתחילת הנידה"], ["four", "ארבעה ימים מתחילת הנידה — הרב עובדיה יוסף"], ["four-from-relations", "ארבעה ימים ממועד היחסים — לפי הוראה"]])}
      ${sel("haflagah", "שיטת חישוב ההפלגה", s, [["days", "ימים בין תחילות הווסתות"], ["chabad-onot", "עונות מהפסק טהרה — חב״ד"]])}
      ${sel("beinonit", "עונה בינונית ביום 30", s, [["same", "אותה עונה שבה התחילה הווסת"], ["both", "שתי העונות — לילה ויום"]])}
      ${tog("day31", "הוספת יום 31", "לפי המנהג או ההנחיה", s)}<div class="oz-box">${tog("orZarua", "עונת אור זרוע", "העונה שלפני כל עונת פרישה — לפי הוראת הרב. כבויה כברירת מחדל.", s)}</div>
      ${tog("carryLongIntervals", "שימור הפלגות ארוכות", "בחישוב ימים, כשווסת חדשה מקדימה את החשש הקודם", s)}
      ${tog("carryMonthly", "שימור עונת חודש בזמן דימום", "דורש תיעוד מלא של הווסת וההפסק", s)}
      ${sel("missingMonthly", "יום ל׳, כשבחודש הבא אין ל׳", s, [["first-next-month", "א׳ בחודש שאחרי החודש החסר (מומלץ)"], ["skip", "בלי עונת חודש באותו חודש"]])}
      ${sel("bedikot", "תזכורות לבדיקות", s, [["twice", "בוקר וערב בכל אחד משבעת הימים"], ["first-last", "ראשון ושביעי בלבד — לפי הוראה"]])}
      ${sel("nightfall", "צאת הכוכבים", s, [["8.5", "8.5° מתחת לאופק"], ["7.083", "7.083° מתחת לאופק"], ["13.5z", "13.5 דקות זמניות אחרי השקיעה (הגאונים)"], ["18m", "18 דקות אחרי השקיעה"], ["20m", "20 דקות אחרי השקיעה"]])}
      ${sel("beinHashmashot", "ראייה סמוך לשקיעה או בין השמשות", s, [["both", "לחומרא: מועדים לשתי העונות"], ["flag", "השעיית החישוב עד בירור"]])}
      ${sel("hefsekTwilight", "הפסק טהרה אחרי השקיעה", s, [["before-sunset", "רק הפסק לפני השקיעה"], ["ovadia", "בדיעבד עד 13.5 דקות זמניות — הרב עובדיה יוסף"]])}
      ${sel("special", "מצב מיוחד", s, [["regular", "מחזור רגיל"], ["pregnancy", "היריון"], ["postpartum", "אחרי לידה"], ["nursing", "הנקה"], ["hormonal", "טיפול הורמונלי / אמצעי מניעה"]])}
      <p class="fine">במצב מיוחד החישובים הרגילים מושעים, ואפשר לרשום עונות לפי הוראה.</p>
      <label class="field" for="s-methodNote">ממי ההנחיות<textarea id="s-methodNote" name="methodNote" rows="2" maxlength="1000" placeholder="שם מורה ההוראה או המנהג">${esc(s.methodNote)}</textarea></label></section>
    <section class="card"><div class="card-h">${I("bell")}<div><h3>תזכורות</h3></div></div>
      ${tog("remindersEnabled", "התראות כשהיומן פתוח", "דורש הרשאה מהדפדפן", s)}${tog("neutralReminders", "נוסח דיסקרטי", "״תזכורת אישית״ בלי פירוט", s)}
      <div class="pair"><label class="field" for="s-reminderMinutes">דקות לפני השקיעה<input id="s-reminderMinutes" name="reminderMinutes" type="number" min="5" max="120" value="${s.reminderMinutes}" inputmode="numeric"></label>
      <label class="field" for="s-morningTime">שעת בדיקת בוקר<input id="s-morningTime" name="morningTime" type="time" value="${s.morningTime}"></label></div></section>${WIDGET_FIELDS(s)}`;
  /* ---------- וידג׳ט למסך הבית (src/widget.js): רק באנדרואיד וביומן האישי; כבוי כברירת מחדל ---------- */
  const WIDGET_FIELDS = s => !(NATIVE && CAP.getPlatform && CAP.getPlatform() === "android" && app.mode === "personal") ? "" : `
    <section class="card"><div class="card-h">${I("home")}<div><h3>וידג׳ט במסך הבית</h3><p>גלוי לכל מי שרואה את הטלפון. כבוי כברירת מחדל</p></div></div>
      ${tog("widgetEnabled", "הצגת מצב בווידג׳ט", "אחרי ההפעלה: לחיצה ארוכה על מסך הבית ← ווידג׳טים ← מעיין", s)}
      ${sel("widgetStyle", "נוסח הווידג׳ט", s, [["discreet", "דיסקרטי: ״תזכורת אישית״ וספירת ימים"], ["full", "מלא: שם המועד והשעה"]])}
      <p class="fine">כשנעילת האפליקציה פעילה, הווידג׳ט תמיד דיסקרטי. לחיצה על הווידג׳ט פותחת את היומן.</p></section>`;
  /** הערות השיטה שנבחרה: מקור לכל ערך, סימון "לברר עם רב", ואילו הגדרות שונו ממנה */
  function methodNotes(s) {
    const p = M.METHOD_PRESETS[s.method];
    if (!p) return `<p class="fine">בחירת שיטה מוכנה קובעת את כל ההגדרות שלמטה בבת אחת. אחר כך אפשר לשנות כל הגדרה.</p>`;
    const changed = M.presetDiff(s);
    return `<details class="rules"><summary>מה קובעת השיטה ומקורותיה${I("left", 15)}</summary>${p.notes.map(n => `<p>${n.ask ? "<strong>לברר עם רב:</strong> " : ""}${esc(n.t)}${n.src ? ` <a href="${n.src}" target="_blank" rel="noopener">מקור ${I("out", 13)}</a>` : ""}</p>`).join("")}</details>
      ${changed.length ? `<p class="fine">שונו מהשיטה: ${changed.length} הגדרות. בחירה מחדש של השיטה מחזירה אותן.</p>` : ""}`;
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
      <section class="card"><div class="card-h">${I("info")}<div><h3>שפה</h3></div></div>${langSwitch()}</section>
      <section class="card"><div class="card-h">${I("shield")}<div><h3>פרטיות ונתונים</h3><p>שום מידע לא יוצא מהמכשיר</p></div></div>
        ${lockSettings()}
        <a class="action" href="${PRIVACY_URL}" target="_blank" rel="noopener">${I("lock", 19)}<span><strong>מדיניות פרטיות</strong><small>מה נשמר, איפה, ומה לא נאסף</small></span>${I("out", 15)}</a>
        <button class="action" data-act="terms">${I("file", 19)}<span><strong>תנאי שימוש</strong><small>אחריות, גרסת בדיקה ופרטיות בקצרה</small></span></button>
        <button class="action danger" data-act="clear"${app.mode === "personal" && !st.events.length && !st.trips.length ? " disabled" : ""}>${I("trash", 19)}<span><strong>מחיקת כל הרישומים</strong><small>ההגדרות נשמרות. אפשר לבטל מיד אחרי המחיקה</small></span></button>
        ${app.mode === "personal" ? `<button class="action danger" data-act="wipe">${I("x", 19)}<span><strong>מחיקת כל הנתונים שלי</strong><small>יומן, הגדרות, מקומות ותזכורות — מהמכשיר הזה, לצמיתות</small></span></button>` : ""}</section>
      <section class="card"><div class="card-h">${I("scale")}<div><h3>לבודקים הלכתיים</h3><p>תרחישים מוכנים, בדיקות אוטומטיות וכללי החישוב</p></div></div>
        <button class="btn ghost full" data-go="review">${I("flask", 17)}מסך הבודקים</button></section>
      <section class="card about"><div class="card-h">${I("spring")}<div><h3>על מעיין</h3><p>גרסה ${APP_VERSION} · מנוע ${M.ENGINE_VERSION}</p></div></div>
        <p>האפליקציה חינמית ופועלת כולה בטלפון, בלי חשבון ובלי שרת. שום מידע לא נשלח לאף אחד.</p>
        ${NATIVE ? "" : `<p>להתקנה: בתפריט הדפדפן (⋮) בוחרים ״הוספה למסך הבית״.</p>${/Android/i.test(navigator.userAgent) ? `<a class="link" href="https://github.com/nrt613/maayan/releases/latest/download/maayan.apk" target="_blank" rel="noopener">${I("download", 15)}אפליקציית אנדרואיד עם התראות</a>` : ""}`}</section>
    </aside></div>`;
  }

  /* ---------- מסך הבודקים ---------- */
  function viewReview(st) {
    const res = app.testResults, passed = res && res.filter(t => t.ok).length;
    const groups = res ? [...new Set(res.map(t => t.group))] : [];
    return `<section class="review-hero"><div>
        <span class="chip-light">גרסת בדיקה ${APP_VERSION}</span><h2>הנחיות לבודקים</h2>
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
          : `<p>הבדיקות מוודאות את הלוח העברי, זמני השמש ואת כל כללי החישוב מול דוגמאות קבועות, כולל הדוגמה של מכון נשמת (ב׳ ניסן ← ל׳ ניסן ← כ״ח אייר).</p>`}
      </section>
      <section class="card"><div class="card-h">${I("copy")}<div><h3>שליחת הערות</h3><p>דוח עם ההגדרות, הרישומים והתוצאות</p></div></div>
        <label class="field" for="rv-note">ההערות שלך<textarea id="rv-note" rows="4" placeholder="למשל: בתרחיש ״ראייה אחרי השקיעה״ העונה הבינונית צריכה להיות…"></textarea></label>
        <button class="btn full" data-act="review-report">${I("copy", 17)}העתקת הדוח</button>
        <p class="fine">הדוח כולל את היומן שפתוח עכשיו (${app.mode === "personal" ? "היומן האישי" : app.mode === "scenario" ? "התרחיש" : "יומן הדוגמה"}). אחרי ההעתקה מדביקים בוואטסאפ או במייל.</p></section>
      </div>
      <section class="card"><div class="card-h">${I("book")}<div><h3>כללי החישוב ומקורותיהם</h3><p>מה המערכת עושה, ובמה היא לא מכריעה</p></div></div><div class="rules">${RULES.map(rl => `<details><summary>${esc(rl.t)}${I("left", 15)}</summary>${rl.p.map(x => `<p>${esc(x)}</p>`).join("")}${rl.src ? `<a href="${rl.src}" target="_blank" rel="noopener">מקור ${I("out", 13)}</a>` : ""}</details>`).join("")}</div></section>`;
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
        <div class="plans">${plans.map(p => planLine(p)).join("") || '<p class="empty">אין מועדים מחושבים.</p>'}</div>
        ${bed.length ? `<p class="fine">ועוד ${bed.length} תזכורות לבדיקות בשבעה נקיים (מופיעות ביומן המלא).</p>` : ""}
        ${r.reviews.length ? `<h4>נקודות לבירור</h4><ul class="rv">${r.reviews.map(v => `<li><strong>${esc(v.title)}</strong> — ${esc(v.detail)}</li>`).join("")}</ul>` : ""}
        <button class="btn full" data-scenario-load="${sc.id}">${I("play", 16)}פתיחה ביומן המלא</button></div>`;
    }
    return `<article class="scen${open ? " open" : ""}"><button class="scen-h" data-scenario="${sc.id}" aria-expanded="${open}"><span class="tag">${esc(sc.tag)}</span><strong>${esc(sc.title)}</strong>${I("left", 16)}</button>${body}</article>`;
  }
  const PHASE_NAMES = { empty: "אין רישומים", waiting: "ממתינה להפסק", clean: "שבעה נקיים", planned: "מועד הטבילה עבר", immersed: "אחרי טבילה" };
  function diffSettings(s) {
    const d = M.SETTING_DEFAULTS, keys = ["method", "wait", "haflagah", "beinonit", "day31", "orZarua", "carryMonthly", "carryLongIntervals", "missingMonthly", "beinHashmashot", "hefsekTwilight", "nightfall"];
    const changed = keys.filter(k => s[k] !== d[k]);
    if (!changed.length) return `<p class="fine">הגדרות ברירת המחדל: חמישה ימים, הפלגה בימים, עונה בינונית באותה עונה.</p>`;
    return `<p class="fine">הגדרות התרחיש: ${changed.map(k => esc(M.settingsSummary(s).find(x => x.startsWith({ method: "שיטה", wait: "המתנה", haflagah: "הפלגה", beinonit: "עונה בינונית", day31: "יום 31", orZarua: "אור זרוע", carryMonthly: "שימור עונת", carryLongIntervals: "שימור הפלגות", missingMonthly: "יום ל׳", beinHashmashot: "ראייה בין השמשות", hefsekTwilight: "הפסק אחרי השקיעה", nightfall: "צאת הכוכבים" }[k])))).join(" · ")}</p>`;
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
    { t: "היום העברי והעונה", p: ["כל רישום נשמר עם התאריך האזרחי, השעה המקומית והעיר. היום העברי מתחיל בשקיעה, ועונת היום נמשכת מהזריחה עד השקיעה.", "זמני השמש מחושבים בגובה פני הים. צאת הכוכבים לפי ההגדרה שנבחרה: 8.5° או 7.083° מתחת לאופק, 13.5 דקות זמניות (הגאונים), או 18 או 20 דקות אחרי השקיעה.", "השקיעה מעוגלת לדקה כלפי מטה וצאת הכוכבים כלפי מעלה, לחומרא. החישוב נבדק מול ״שקיעה במישור״ בלוח עיתים לבינה ונמצא תואם בטווח של שניות. שקיעה נראית, שמושפעת מהרים ומבניינים בסביבה, אינה מחושבת.", "רישום בטווח שלוש דקות מהזריחה או מהשקיעה, או בין השקיעה לצאת הכוכבים, מסומן לבירור. שלוש הדקות הן סף לסימון ולא הגדרה של בין השמשות.", "שעה כפולה או חסרה במעבר שעון, ומקום בלי זריחה או שקיעה (קוטב), אינם מסווגים אוטומטית."], src: S.calendar },
    { t: "המתנה לפני ההפסק", p: ["חמישה ימים: יום הראייה נספר כיום הראשון, וההפסק המוקדם ביום החמישי.", "ארבעה ימים מתחילת הנידה (הרב עובדיה יוסף, מנהג ספרד): יום הראייה הוא יום 1 וההפסק ביום הרביעי. ראתה בליל שני — ההפסק ביום חמישי.",
      "ארבעה ימים ממועד היחסים: נספרים ממועד היחסים שנרשם כבסיס, ולא מהראייה. בלי בסיס רשום אין חישוב, ומופיעה נקודה לבירור.",
      "ראייה סמוך לשקיעה או בין השמשות: ההמתנה נספרת מהיום העברי המאוחר, לחומרא.", "חידוש ספירה בתוך תקופת הנידה נשען על תחילת הנידה הקודמת ולא מוסיף חמישה ימים חדשים."], src: S.wait },
    { t: "ראייה בין השמשות", p: ["ראייה בין השקיעה לצאת הכוכבים, או בשלוש הדקות שסביב השקיעה והזריחה: לפי ברירת המחדל חוששים לשתי העונות — העונה שהסתיימה והעונה שהתחילה — בעונה הבינונית, בעונת החודש ובהפלגה (ש״ך יו״ד קפד בשם הב״ח; כך נוהגים למעשה). הרישום מסומן גם לבירור.", "אפשר לבחור בהגדרות להשעות את החישוב עד בירור, כמו בגרסאות קודמות.", "סוף בין השמשות נקבע לפי הגדרת צאת הכוכבים. לפי 13.5 דקות זמניות (הגאונים, הרב עובדיה יוסף) ראייה מאוחרת יותר היא לילה ודאי."], src: M.METHOD_PRESETS.ashkenaz.notes.find(n => n.k === "beinHashmashot").src },
    { t: "שיטות מוכנות", p: ["שיטה מוכנה (מנהג אשכנז הרווח, שיטת הרב עובדיה יוסף / מנהג ספרד, מנהג חב״ד) קובעת את כל הגדרות החישוב בבת אחת, ואפשר לשנות כל הגדרה אחר כך.", "לכל ערך בשיטה מופיע מקור בהגדרות. ערכים שהמקורות חלוקים בהם מסומנים ״לברר עם רב״. השיטות אינן תחליף להוראת רב."], src: "" },
    { t: "הפסק טהרה ושבעה נקיים", p: ["הספירה מתחילה רק מהפסק שנרשם כנקי, לפני השקיעה ולא בזמן מסופק, ולא לפני סוף ההמתנה. הפסק מוקדם מתקבל רק עם הוראה אישית מתועדת.", "בבחירת שיטת הרב עובדיה יוסף: הפסק עד 13.5 דקות זמניות אחרי השקיעה מתקבל בדיעבד ונספר ליום שהסתיים, ומסומן לבירור. לכתחילה עושים הפסק לפני השקיעה.", "יום א׳ הוא היום העברי שאחרי ההפסק. ליל הטבילה המתוכנן הוא במוצאי היום השביעי, וזה נשאר תכנון בלבד.", "חוסר רישום בדיקה ביום הראשון או השביעי מסומן לבירור, ואינו פוסל או מאשר. בדיקה שנרשמה כלא נקייה אינה מאפסת אוטומטית."], src: S.clean },
    { t: "עונת החודש", p: ["אותו יום בחודש העברי הבא, באותה עונה.", "ראייה בל׳ כשבחודש הבא אין ל׳: ברירת המחדל היא א׳ בחודש שאחרי החודש החסר, כפסיקת מכון נשמת. אפשר לבחור דילוג.", "ראתה פעמיים באותו חודש: כל החישובים נעשים מהראייה האחרונה, ובנוסף נשמרת עונת החודש של הראייה הקודמת אם עוד לא הגיעה (נשמת; לוח חב״ד).", "בשנה מעוברת אדר א׳ עובר לאדר ב׳.", "שימור עונת חודש שחלה בזמן דימום הוא אפשרות נפרדת שדורשת תיעוד מלא."], src: S.monthly },
    { t: "עונה בינונית", p: ["יום 30 בספירה כוללנית: יום הראייה הוא יום 1, כלומר 29 ימים אחריו, באותה עונה.", "שתי העונות, יום 31 ואור זרוע הם שלוש הגדרות נפרדות. השיטות המוכנות קובעות אותן לפי המנהג, ואפשר לשנות.", "מי ששומרת ימים 30 ו-31 שומרת את עונת אור זרוע ליום 30 בלבד (יועצות הלכה)."], src: S.average },
    { t: "הפלגה", p: ["בשיטת הימים: ההפרש בין התאריכים העבריים של שתי הראיות ועוד 1. אותו מרווח נספר מהראייה האחרונה, באותה עונה.", "בשיטת חב״ד: מספר העונות מההפסק הקודם ועד הראייה הבאה. המועד החדש נספר מההפסק הנוכחי. מספר זוגי נופל ביום ואי-זוגי בלילה. הפלגה ארוכה נשמרת כשמגיעה קצרה ממנה.", "ראייה מסופקת באמצע אינה נמחקת כדי לייצר מרווח ארוך."], src: S.interval },
    { t: "וסת קבוע", p: ["שלוש ראיות רצופות באותו יום בחודש ובאותה עונה, או שלוש הפלגות שוות בארבע ראיות, מסומנות כדפוס אפשרי.", "המערכת אינה קובעת, עוקרת או משעה וסת קבוע בעצמה."], src: S.fixed },
    { t: "במה המערכת לא מכריעה", p: ["היריון, אחרי לידה, הנקה, טיפול הורמונלי, וסתות לא רגילים (דילוג, סירוג), מראות וכתמים, בדיקות שהוחסרו ומעבר קו התאריך.", "במצבים האלה החישוב הרגיל מושעה ואפשר לרשום עונות ידניות לפי הוראה. אין במערכת זיהוי מראות ואין ״שאלת רב״ אוטומטית."], src: "" },
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
        <header class="top"><div class="brand m">${mark()}<strong>מעיין</strong></div>
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
      <nav class="tabs" aria-label="ניווט">${MAIN_NAV.map(([id, t, ic]) => `<button class="${app.tab === id ? "on" : ""}" data-go="${id}"${app.tab === id ? ' aria-current="page"' : ""}>${I(ic, 22)}<span>${t.replace("לוח השנה", "לוח").replace("היומן שלי", "יומן")}</span>${id === "dates" && upcoming && !app.hidden ? `<small class="tab-badge" aria-hidden="true"></small>` : ""}</button>`).join("")}</nav>`;
  }
  const LOGO_IMG = "data:image/png;base64,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";
  /** סרגל ״רישום״ קבוע מעל סרגל הלשוניות: תמיד מציג את היום שנבחר (בלוח) או את היום */
  function addBar(d, todayISO) {
    const label = d === todayISO ? `היום, ${hebDay(d)} ${hd(d).monthTitle().split(" ")[0]}` : `${hebDay(d)} ${hd(d).monthTitle().split(" ")[0]}`;
    return `<div class="addbar-wrap"><button class="addbar" data-act="quick" data-date="${d}">${I("plus", 22)}<span><strong>רישום</strong><small><span class="hebdate">${esc(label)}</span> · ${esc(civilLabel(d, true))}</small></span></button></div>`;
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
        <label class="field" for="e-note">הערה <span class="opt">לא חובה</span><textarea id="e-note" name="note" rows="2" maxlength="2000">${esc(f.note)}</textarea></label>
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
        <div class="quick">${[...QUICK_TYPES, ["other", "list"]].map(([v, ic]) => `<button class="quick-btn t-${v}" data-qtype="${v}"><span class="ev-ic t-${v}">${I(ic, 22)}</span><span>${v === "other" ? "אחר…" : v === "flow" ? "ראייה / וסת" : EVENT_NAMES[v]}</span></button>`).join("")}</div>`;
    }
    if (m.kind === "text") return `<div class="m-h"><h2 id="m-title">${esc(m.title)}</h2>${close}</div><p>${esc(m.intro)}</p>
      <textarea id="m-text" class="mono" rows="9" readonly>${esc(m.text)}</textarea>
      <div class="m-actions"><button class="btn" data-act="copy-text">${I("copy", 17)}העתקה</button>${m.file ? `<button class="btn ghost" data-act="dl-text">${I("download", 17)}שמירה כקובץ</button>` : ""}</div>
      ${m.file ? `<p class="fine">אם השמירה כקובץ לא עובדת בדפדפן הזה, מעתיקים ושומרים בפתקים או שולחים לעצמך.</p>` : ""}`;
    if (m.kind === "cycle") return `<div class="m-h"><h2 id="m-title">הזנת מחזור קודם</h2>${close}</div>
      <form id="cycle-form" class="stack-s"><p class="fine">מזינים כל מחזור בנפרד, בכל סדר. החישוב מסדר הכול לפי התאריכים.${m.saved ? ` נשמרו ${m.saved} מחזורים.` : ""}</p>
        <div class="pair"><label class="field" for="c-flow">תחילת הווסת<input id="c-flow" type="date" required min="2000-01-01" max="2100-12-31"></label>
        <label class="field" for="c-flow-t">שעה<input id="c-flow-t" type="time" required value="10:00"><small>אחרי השקיעה = היום העברי הבא</small></label></div>
        <div class="pair"><label class="field" for="c-hef">הפסק טהרה <span class="opt">אם ידוע</span><input id="c-hef" type="date" min="2000-01-01" max="2100-12-31"></label>
        <label class="field" for="c-hef-t">שעה<input id="c-hef-t" type="time" value="16:00"></label></div>
        <label class="field" for="c-mik">טבילה <span class="opt">תאריך הערב, אם ידוע</span><input id="c-mik" type="date" min="2000-01-01" max="2100-12-31"></label>
        <label class="field" for="c-city">מקום<select id="c-city">${placeOptions(state(), state().settings.cityId)}</select></label>
        ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
        <div class="m-actions"><button class="btn" type="submit">${I("check", 17)}שמירת המחזור</button><button type="button" class="btn ghost" data-act="close-modal">${m.saved ? "סיום" : "ביטול"}</button></div></form>`;
    if (m.kind === "backup") return `<div class="m-h"><h2 id="m-title">גיבוי מוצפן</h2>${close}</div>
      <form id="backup-form" class="stack-s"><p>הגיבוי מוצפן בסיסמה שאת בוחרת. בלי הסיסמה אי אפשר לשחזר אותו, גם לא אנחנו.</p>
      <label class="field" for="b-pass">סיסמת גיבוי<input id="b-pass" type="password" minlength="10" required autocomplete="new-password"><small>לפחות 10 תווים. לשמור אותה בנפרד.</small></label>
      ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}<div class="m-actions"><button class="btn" type="submit">${I("lock", 17)}יצירת גיבוי</button></div></form>`;
    if (m.kind === "restore") return `<div class="m-h"><h2 id="m-title">שחזור מגיבוי</h2>${close}</div>
      <form id="restore-form" class="stack-s"><label class="field" for="r-file">קובץ גיבוי<input id="r-file" type="file"${NATIVE && CAP.getPlatform?.() === "ios" ? "" : ' accept=".may,.json,.txt,application/json,text/plain"'}></label>
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
    if (m.kind === "welcome") return `<div class="welcome">${langSwitch()}<div class="mark big"><img src="${LOGO_IMG}" alt=""></div><h2 id="m-title">ברוכה הבאה למעיין</h2>
      <p>יומן אישי לטהרת המשפחה: רישום, חישוב עונות הפרישה, שבעה נקיים ותזכורות.</p>
      <ul class="promises"><li>${I("lock", 18)}<span><strong>פרטי לגמרי.</strong> הכול נשמר רק בטלפון הזה, בלי חשבון ובלי שרת.</span></li>
      <li>${I("scale", 18)}<span><strong>שקוף.</strong> לכל מועד מוצגים הכלל והמקור, ואת שיטת החישוב בוחרים לפי ההנחיה שקיבלת.</span></li>
      <li>${I("help", 18)}<span><strong>לא פוסק.</strong> זו גרסת בדיקה שטרם קיבלה אישור הלכתי. במקום של ספק המערכת מסמנת לבירור.</span></li></ul>
      <div class="stack-s"><button class="btn full" data-act="start-personal">${I("plus", 18)}התחלת יומן אישי</button>
      <button class="btn ghost full" data-act="start-demo">${I("flask", 18)}צפייה ביומן לדוגמה</button>
      <button class="link reviewer-link" data-act="start-review">${I("scale", 16)}אני בודק/ת הלכתי/ת</button></div>
      <p class="fine">המשך השימוש מהווה הסכמה ל<button class="link inline" data-act="terms">תנאי השימוש והפרטיות</button></p></div>`;
    return "";
  }
  const QUICK_TYPES = [["flow", "droplet"], ["hefsek", "check"], ["bedikah", "check"], ["mikvah", "moon"]];
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
      case "more": app.jLimit += 200; return render();
      case "cycle": app.modal = { kind: "cycle", error: "", saved: 0 }; return renderModal();
      case "hide": app.hidden = !app.hidden; return render();
      case "lock-now": return lockNow();
      case "lock-change": app.modal = { kind: "pin-set", change: true, error: "" }; return renderModal();
      case "nudge-x": saveBackupInfo({ snooze: new Date().toISOString() }); toast("נזכיר שוב בהמשך. הגיבוי תמיד זמין בהגדרות."); return render();
      case "close-modal": if (app.modal?.kind === "terms" && app.modal.back) { app.modal = { kind: "welcome" }; return renderModal(); } if (app.modal?.kind === "welcome") markSeen(); app.modal = null; return renderModal();
      case "toast-x": app.toast = ""; app.toastAction = null; return renderToast();
      case "toast-undo": { const a = app.toastAction; app.toast = ""; app.toastAction = null; renderToast(); try { a?.run(); } catch (err) { toast(err.message); } return; }
      case "demo": Object.assign(app, { mode: "demo", sandbox: M.demoState(realNow()), cal: { cursor: null, mode: "civil", selected: null } }); return go("today");
      case "personal": Object.assign(app, { mode: "personal", sandbox: null, scenario: null, cal: { cursor: null, mode: "civil", selected: null } }); return go("today");
      case "start-personal": markSeen(); app.modal = null; return go("today");
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
    else if (t.id === "r-file") { const f = t.files?.[0]; if (f && f.size < 4e6) f.text().then(x => { $("#r-text").value = x; }); }
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
  document.addEventListener("input", e => { if (e.target.id === "q") { app.query = e.target.value; render(); } });
  document.addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, st = state();
    if (f.id === "event-form") {
      const ev = readEventForm();
      if (ev.type !== "manual") delete ev.onah;
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
  document.addEventListener("keydown", e => { if (e.key === "Escape" && app.modal) { if (app.modal.kind === "welcome") markSeen(); app.modal = null; renderModal(); } });
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
    for (const k of [STORE_KEY, SEEN_KEY, LANG_KEY, LOCK_KEY, LOCKFAIL_KEY, BACKUP_KEY]) { try { localStorage.removeItem(k); } catch { /* */ } }
    Object.assign(app, { locked: false, covered: false, lock: null, lockedModal: null });
    Object.assign(app, { mode: "personal", personal: M.emptyState(), sandbox: null, scenario: null, blockSave: false, loadWarning: "", cal: { cursor: null, mode: "civil", selected: null }, modal: { kind: "welcome" } });
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
  if (!app.locked && !storage.get(SEEN_KEY) && !app.personal.events.length) { app.modal = { kind: "welcome" }; renderModal(); }
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
    if (app.modal) { if (app.modal.kind === "welcome") markSeen(); app.modal = null; renderModal(); }
    else if (app.tab === "review") go("prefs");
    else if (app.tab !== "today") go("today");
    else PL.App.minimizeApp();
  });
  if (NATIVE) syncNotifications().then(() => { if (app.tab === "dates" && !app.modal && !app.locked) render(); });
  // אתר: התקנה למסך הבית ועבודה בלי רשת
  if (!NATIVE && "serviceWorker" in navigator && location.protocol === "https:" && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
