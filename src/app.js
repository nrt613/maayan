/* מעיין — ממשק. קוד צד-לקוח בלבד; שום מידע לא יוצא מהמכשיר. */
(() => {
  "use strict";
  const M = Maayan, SCENARIOS = MaayanScenarios(M);
  const { EVENT_NAMES, CITIES, city, addDays, hebrew, civilLabel, timeInZone, sun, atLocation, currentContext, calculate, hd, fromAbs, fromISO, toISO, HDate } = M;
  const APP_VERSION = "1.0.0-review";
  const STORE_KEY = "maayan.v1.diary", SEEN_KEY = "maayan.v1.seen";
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- אייקונים ---------- */
  const P = {
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
  };
  const I = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

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
    ["dates", "מועדים", "bell"], ["review", "לבודקים", "scale"], ["prefs", "הגדרות", "sliders"],
  ];
  const app = {
    mode: "personal", personal: null, sandbox: null, scenario: null, simNow: null,
    tab: "today", hidden: false, modal: null, toast: "", toastTimer: 0,
    cal: { cursor: null, mode: "civil", selected: null }, filter: "all", query: "",
    testResults: null, openScenario: null, permission: "default", notified: new Set(), loadWarning: "", blockSave: false, lastDayKey: "",
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
    } else { app.sandbox = parsed; toast(app.mode === "scenario" ? "נשמר בתרחיש (לא ביומן האישי)" : "נשמר ביומן לדוגמה"); }
    render();
  }
  function toast(msg) { app.toast = msg; clearTimeout(app.toastTimer); app.toastTimer = setTimeout(() => { app.toast = ""; renderToast(); }, 4200); renderToast(); }

  /* ---------- עזרים לתצוגה ---------- */
  const hebDay = d => hebrew(d).split(" ")[0];
  const hebMonthTitle = d => { const h = hd(d); return `${h.monthName()} ${M.gematriya(h.getFullYear() % 1000)}`; };
  const civilMonthTitle = d => new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d.slice(0, 7)}-15T12:00:00Z`));
  const weekdayName = d => new Intl.DateTimeFormat("he-IL", { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const planHebrew = p => p.onah === "day" ? hebrew(p.date) : hebrew(addDays(p.date, 1));
  const onahLabel = o => o === "day" ? "עונת יום" : o === "night" ? "עונת לילה" : "ערב";
  const SEP_KINDS = ["monthly", "interval", "average", "or-zarua", "manual"];

  function planLine(p, { compact = false, open = false } = {}) {
    const c = city(p.cityId), start = timeInZone(new Date(p.start), c.tz);
    const prefix = p.onah === "day" ? "" : "ליל ";
    return `<details class="plan k-${p.kind}${p.done ? " done" : ""}"${open ? " open" : ""}>
      <summary><span class="plan-ic">${I(p.onah === "day" ? "sun" : "moon", 17)}</span>
        <span class="plan-name"><strong>${esc(p.title)}</strong><small><span class="hebdate">${prefix}${esc(planHebrew(p))}</span>${compact ? "" : ` · ${esc(civilLabel(p.date, true))} · ${esc(c.name)}`}</small></span>
        <time dir="ltr">${start}</time>${I("left", 15)}</summary>
      <div class="plan-more"><p>${esc(p.reason)}</p>
        <small>${onahLabel(p.onah)} · ${p.end ? `מ-${start} עד ${timeInZone(new Date(p.end), c.tz)}` : `מ-${start}`} · ${esc(c.name)}</small>
        ${p.done ? '<small class="ok-text">בדיקה נרשמה</small>' : ""}
        ${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">מקור הכלל ${I("out", 13)}</a>` : ""}</div></details>`;
  }

  /* ---------- מסכים ---------- */
  function viewToday(st, r, ctx) {
    const date = ctx.date, loc = atLocation(st, date), times = sun(date, loc, Number(st.settings.nightfall));
    const upcoming = r.plans.filter(p => !p.done && new Date(p.end || p.start) >= now()).slice(0, 4);
    const phase = r.phase, cd = r.cleanDay;
    const C = {
      empty: ["הרישום הראשון", "כדי לחשב מועדים, רשמי את תחילת הווסת: תאריך, שעה ומקום.", "רישום תחילת וסת", "flow"],
      waiting: ["ממתינה להפסק טהרה", r.earliestHefsek ? `המועד המוקדם לפי ההגדרות: ${hebrew(r.earliestHefsek)}, ${civilLabel(r.earliestHefsek, true)}, לפני השקיעה.` : "חסר מידע כדי לחשב את מועד ההפסק. פרטים בנקודות לבירור.", "רישום הפסק טהרה", "hefsek"],
      clean: [cd ? `יום ${cd} מתוך 7` : "הפסק טהרה נרשם", cd ? "שבעה נקיים לפי ההפסק שנרשם." : "יום הספירה הראשון מתחיל בתאריך העברי הבא.", "רישום בדיקה", "bedikah"],
      planned: ["מועד הטבילה המתוכנן עבר", "אפשר לרשום את הטבילה ולעיין בנקודות לבירור.", "רישום טבילה", "mikvah"],
      immersed: ["טבילה נרשמה", "המועדים הקרובים מופיעים למטה ובלוח השנה.", "רישום חדש", "note"],
    }[phase];
    const days = phase === "clean" ? `<ol class="seven" aria-label="שבעת הימים">${[1, 2, 3, 4, 5, 6, 7].map(d =>
      `<li class="${d < cd ? "past" : ""}${d === cd ? " now" : ""}"><span>${r.checks[d]?.length ? I("check", 16) : d}</span><small>${d === cd ? "היום" : "יום " + d}</small></li>`).join("")}</ol>` : "";
    const ring = phase === "clean" && cd ? `<div class="ring" style="--p:${cd / 7}"><strong>${cd}</strong><small>מתוך 7</small></div>`
      : `<div class="ring idle">${I(phase === "waiting" ? "moon" : "droplet", 44)}</div>`;
    return `
    ${app.mode === "personal" && !st.events.length ? onboardingCard() : ""}
    <div class="grid-top">
      <section class="hero" data-phase="${phase}">
        <div class="hero-row"><div class="hero-copy">
          <span class="chip-light">${phase === "clean" ? "שבעה נקיים" : "המצב לפי היומן"}</span>
          <h2>${esc(C[0])}</h2><p>${esc(C[1])}</p>
          <button class="btn light" data-act="add" data-type="${C[3]}">${I("plus", 18)}${esc(C[2])}</button>
        </div>${ring}</div>${days}
      </section>
      <section class="card times">
        <div class="card-h">${I("sunset")}<div><h3>זמני היום</h3><p>${esc(loc.name)} · ${esc(civilLabel(date, true))}</p></div></div>
        <dl>${[["זריחה", "sunrise", times.sunrise], ["שקיעה", "sunset", times.sunset], ["צאת הכוכבים", "moon", times.nightfall]].map(([n, ic, v]) =>
          `<div${ic === "sunset" ? ' class="hl"' : ""}>${I(ic, 18)}<dt>${n}</dt><dd dir="ltr">${timeInZone(v, loc.tz)}</dd></div>`).join("")}</dl>
        <p class="fine">בגובה פני הים · צאת הכוכבים ${esc(st.settings.nightfall)}° מתחת לאופק</p>
      </section>
    </div>
    ${r.reviews.length ? `<button class="notice" data-go="journal">${I("help", 22)}<span><strong>${r.reviews.length} ${r.reviews.length === 1 ? "נקודה לבירור" : "נקודות לבירור"}</strong><small>${esc(r.reviews[0].title)}</small></span>${I("left", 16)}</button>` : ""}
    <div class="grid-bottom">
      <section class="card"><div class="card-h">${I("bell")}<h3>מועדים קרובים</h3><button class="link" data-go="dates">הכול ${I("left", 14)}</button></div>
        ${upcoming.length ? `<div class="plans">${upcoming.map(p => planLine(p)).join("")}</div>` : `<p class="empty">אין מועדים קרובים.</p>`}
      </section>
      <section class="card"><div class="card-h">${I("list")}<h3>רשימת הכנה למקווה</h3></div>
        <div class="checks">${M.CHECKLIST.map((item, i) => `<label class="${st.settings.checklist.includes(item) ? "on" : ""}"><input type="checkbox" id="chk-${i}" data-check="${esc(item)}" ${st.settings.checklist.includes(item) ? "checked" : ""}><span>${esc(item)}</span></label>`).join("")}</div>
      </section>
    </div>`;
  }
  function onboardingCard() {
    return `<section class="card welcome-inline"><div class="card-h">${I("shield")}<h3>היומן שלך ריק</h3></div>
      <p>כדאי להתחיל מהזנת המחזורים האחרונים (לפחות שניים), כדי שההפלגה ועונת החודש יחושבו נכון. אפשר גם להתאים קודם את שיטת החישוב.</p>
      <div class="row-btns"><button class="btn" data-act="add" data-type="flow">${I("plus", 17)}רישום ראשון</button>
      <button class="btn ghost" data-act="cycle">${I("calendar", 17)}הזנת מחזורים קודמים</button>
      <button class="btn ghost" data-go="prefs">${I("sliders", 17)}שיטת החישוב</button>
      <button class="btn ghost" data-act="demo">${I("flask", 17)}יומן לדוגמה</button></div></section>`;
  }

  function viewCalendar(st, r, ctx) {
    const c = app.cal; c.cursor ||= ctx.date; c.selected ||= ctx.date;
    let first, next;
    if (c.mode === "hebrew") { const h = hd(c.cursor); const f = new HDate(1, h.getMonth(), h.getFullYear()); first = fromAbs(f.abs()); next = fromAbs(f.add(1, "M").abs()); }
    else { const d = fromISO(c.cursor); first = toISO(new Date(d.getFullYear(), d.getMonth(), 1, 12)); next = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)); }
    const offset = fromISO(first).getDay(), len = M.isoAbs(next) - M.isoAbs(first);
    const start = addDays(first, -offset), cells = Math.ceil((offset + len) / 7) * 7;
    const hef = r.hefsek ? M.isoAbs(r.hefsek.date) : null;
    const title = c.mode === "hebrew" ? hebMonthTitle(first) : civilMonthTitle(first);
    const dayCells = Array.from({ length: cells }, (_, i) => {
      const d = addDays(start, i), ents = st.events.filter(e => e.date === d), pl = r.plans.filter(p => p.date === d);
      const out = d < first || d >= next, abs = M.isoAbs(d), clean = hef !== null && abs > hef && abs <= hef + 7;
      const flags = [ents.some(e => e.type === "flow") && "f", ents.some(e => e.type === "hefsek" || e.type === "bedikah") && "c", pl.some(p => SEP_KINDS.includes(p.kind)) && "s", pl.some(p => p.kind === "mikvah") && "m"].filter(Boolean);
      const main = c.mode === "civil" ? fromISO(d).getDate() : hebDay(d), sub = c.mode === "civil" ? hebDay(d) : fromISO(d).getDate();
      return `<button class="day${out ? " out" : ""}${d === ctx.date ? " today" : ""}${d === c.selected ? " sel" : ""}${clean ? " clean" : ""}" data-day="${d}" aria-label="${esc(civilLabel(d))}, ${esc(hebrew(d))}${ents.length ? `, ${ents.length} רישומים` : ""}${pl.length ? `, ${pl.length} מועדים` : ""}" aria-pressed="${d === c.selected}">
        <b>${main}</b><i>${sub}</i><span class="dots">${flags.map(f => `<em class="d-${f}"></em>`).join("")}</span></button>`;
    }).join("");
    const sel = c.selected, ents = M.sorted(st.events.filter(e => e.date === sel)), pl = r.plans.filter(p => p.date === sel);
    return `<div class="cal-layout"><section class="card cal">
      <div class="cal-h"><h3>${esc(title)}</h3><div class="cal-nav">
        <button class="icon-btn" data-cal="-1" aria-label="החודש הקודם">${I("right")}</button>
        <button class="link" data-cal="today">היום</button>
        <button class="icon-btn" data-cal="1" aria-label="החודש הבא">${I("left")}</button></div></div>
      <div class="seg" role="group" aria-label="סוג לוח"><button data-calmode="civil" aria-pressed="${c.mode === "civil"}">לועזי</button><button data-calmode="hebrew" aria-pressed="${c.mode === "hebrew"}">עברי</button></div>
      <div class="wk" aria-hidden="true">${["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map(w => `<span>${w}</span>`).join("")}</div>
      <div class="days">${dayCells}</div>
      <div class="legend"><span><em class="d-f"></em>וסת</span><span><em class="d-c"></em>הפסק ובדיקות</span><span><em class="d-s"></em>עונת פרישה</span><span><em class="d-m"></em>טבילה מתוכננת</span></div>
      <p class="fine">התאריך העברי במשבצת שייך לשעות היום. בשקיעה מתחיל התאריך העברי הבא.</p>
    </section>
    <section class="card dayp"><div class="card-h">${I("calendar")}<div><h3>${esc(weekdayName(sel))}, ${esc(civilLabel(sel))}</h3><p class="hebdate">${esc(hebrew(sel))} · שעות היום</p></div></div>
      ${ents.map(entryRow).join("")}${pl.length ? `<div class="plans">${pl.map(p => planLine(p, { compact: true })).join("")}</div>` : ""}
      ${!ents.length && !pl.length ? `<p class="empty">אין רישומים או מועדים ביום הזה.</p>` : ""}
      <button class="btn ghost full" data-act="add" data-date="${sel}">${I("plus", 17)}רישום ליום הזה</button></section></div>`;
  }
  function entryRow(e) {
    let h = "זמן לבירור", onah = "";
    try { const s = M.stamp(e); h = s.hebrewDate; onah = s.onah === "day" ? "יום" : "לילה"; } catch { /* מסומן לבירור */ }
    const status = e.result === "uncertain" ? "ממתין לבירור" : e.result === "bleeding" ? "נרשמה כלא נקייה" : city(e.cityId).name;
    return `<button class="entry" data-edit="${e.id}"><span class="ev-ic t-${e.type}">${I(e.type === "flow" ? "droplet" : e.type === "mikvah" ? "moon" : ["bedikah", "hefsek"].includes(e.type) ? "check" : "book", 17)}</span>
      <span class="entry-main"><strong>${esc(EVENT_NAMES[e.type])}</strong><small>${esc(civilLabel(e.date, true))} · <span dir="ltr">${e.time}</span> · <span class="hebdate">${esc(h)}</span>${onah ? ` · ${onah}` : ""}</small>${e.note ? `<small class="note">${esc(e.note)}</small>` : ""}</span>
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
      <div class="entries">${evs.map(entryRow).join("") || `<p class="empty">${st.events.length ? "לא נמצאו רישומים מתאימים." : "אין עדיין רישומים."}</p>`}</div>
      <div class="row-btns"><button class="btn" data-act="add">${I("plus", 17)}רישום חדש</button><button class="btn ghost" data-act="cycle">${I("calendar", 17)}הזנת מחזור קודם</button></div></section>`;
  }

  function viewDates(st, r) {
    const n = now(), up = r.plans.filter(p => !p.done && new Date(p.end || p.start) >= n), past = r.plans.filter(p => !up.includes(p));
    return `<div class="two"><section class="card"><div class="card-h">${I("bell")}<h3>מועדים עתידיים <span class="count">${up.length}</span></h3></div>
      ${up.length ? `<div class="plans">${up.map(p => planLine(p)).join("")}</div>` : `<p class="empty">אין מועדים עתידיים כרגע.</p>`}
      ${past.length ? `<details class="past"><summary>מועדים שעברו או שהושלמו (${past.length})${I("left", 15)}</summary><div class="plans">${past.map(p => planLine(p)).join("")}</div></details>` : ""}
      <p class="fine">כל מועד הוא תכנון לפי השיטה שנבחרה בהגדרות. לחיצה על מועד מציגה את הכלל ואת המקור.</p></section>
    <aside class="stack"><section class="card"><div class="card-h">${I("calendar")}<h3>ייצוא ליומן הטלפון</h3></div>
      <p>קובץ מועדים עם התראות, לייבוא ליומן Google או לכל יומן אחר. ${st.settings.neutralReminders ? "הנוסח דיסקרטי: ״תזכורת אישית״ בלבד." : "הנוסח המלא מופיע בקובץ."}</p>
      <button class="btn full" data-act="ics" ${up.length ? "" : "disabled"}>${I("download", 17)}קובץ מועדים</button>
      <p class="fine">אחרי שינוי ברישומים צריך לייצא שוב.</p></section>
      <section class="card"><div class="card-h">${I("bell")}<h3>התראות במכשיר</h3></div>
      <p>התראה מוצגת כשהיומן פתוח, בכפוף להרשאת הדפדפן.</p>
      <button class="btn ghost full" data-act="notify" ${app.permission === "granted" || app.permission === "unsupported" ? "disabled" : ""}>${app.permission === "granted" ? I("check", 17) + "ההרשאה פעילה" : app.permission === "unsupported" ? "הדפדפן אינו תומך" : "הפעלת התראות"}</button></section></aside></div>`;
  }

  const SETTINGS_FIELDS = s => `
    <section class="card"><div class="card-h">${I("pin")}<div><h3>מקום</h3><p>עיר ברירת המחדל לזמני היום</p></div></div>
      <label class="field" for="s-city">עיר מגורים<select id="s-city" name="cityId">${CITIES.map(c => `<option value="${c.id}"${s.cityId === c.id ? " selected" : ""}>${c.name}</option>`).join("")}</select></label>
      <p class="fine">לכל רישום נשמר המקום שלו. שינוי העיר אינו משנה רישומים קודמים.</p></section>
    <section class="card"><div class="card-h">${I("scale")}<div><h3>שיטת החישוב</h3><p>לבחור לפי ההנחיה שקיבלת</p></div></div>
      ${sel("wait", "המתנה לפני שבעה נקיים", s, [["five", "חמישה ימים מתחילת הנידה"], ["four-from-relations", "ארבעה ימים ממועד היחסים — לפי הוראה"]])}
      ${sel("haflagah", "שיטת חישוב ההפלגה", s, [["days", "ימים בין תחילות הווסתות"], ["chabad-onot", "עונות מהפסק טהרה — חב״ד"]])}
      ${sel("beinonit", "עונה בינונית ביום 30", s, [["same", "אותה עונה שבה התחילה הווסת"], ["both", "שתי העונות — לילה ויום"]])}
      ${tog("day31", "הוספת יום 31", "לפי המנהג או ההנחיה", s)}${tog("orZarua", "עונת אור זרוע", "העונה שלפני כל חשש מחושב", s)}
      ${tog("carryLongIntervals", "שימור הפלגות ארוכות", "בחישוב ימים, כשווסת חדשה מקדימה את החשש הקודם", s)}
      ${tog("carryMonthly", "שימור עונת חודש בזמן דימום", "דורש תיעוד מלא של הווסת וההפסק", s)}
      ${sel("missingMonthly", "יום ל׳, כשבחודש הבא אין ל׳", s, [["first-next-month", "א׳ בחודש שאחרי החודש החסר (מומלץ)"], ["skip", "בלי עונת חודש באותו חודש"]])}
      ${sel("bedikot", "תזכורות לבדיקות", s, [["twice", "בוקר וערב בכל אחד משבעת הימים"], ["first-last", "ראשון ושביעי בלבד — לפי הוראה"]])}
      ${sel("nightfall", "צאת הכוכבים", s, [["8.5", "8.5° מתחת לאופק"], ["7.083", "7.083° מתחת לאופק"]])}
      ${sel("special", "מצב מיוחד", s, [["regular", "מחזור רגיל"], ["pregnancy", "היריון"], ["postpartum", "אחרי לידה"], ["nursing", "הנקה"], ["hormonal", "טיפול הורמונלי / אמצעי מניעה"]])}
      <p class="fine">במצב מיוחד החישובים הרגילים מושעים, ואפשר לרשום עונות לפי הוראה.</p>
      <label class="field" for="s-methodNote">ממי ההנחיות<textarea id="s-methodNote" name="methodNote" rows="2" maxlength="1000" placeholder="שם מורה ההוראה או המנהג">${esc(s.methodNote)}</textarea></label></section>
    <section class="card"><div class="card-h">${I("bell")}<div><h3>תזכורות</h3></div></div>
      ${tog("remindersEnabled", "התראות כשהיומן פתוח", "דורש הרשאה מהדפדפן", s)}${tog("neutralReminders", "נוסח דיסקרטי", "״תזכורת אישית״ בלי פירוט", s)}
      <div class="pair"><label class="field" for="s-reminderMinutes">דקות לפני השקיעה<input id="s-reminderMinutes" name="reminderMinutes" type="number" min="5" max="120" value="${s.reminderMinutes}" inputmode="numeric"></label>
      <label class="field" for="s-morningTime">שעת בדיקת בוקר<input id="s-morningTime" name="morningTime" type="time" value="${s.morningTime}"></label></div></section>`;
  const sel = (name, label, s, opts) => `<label class="field" for="s-${name}">${label}<select id="s-${name}" name="${name}">${opts.map(([v, t]) => `<option value="${v}"${s[name] === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
  const tog = (name, label, detail, s) => `<label class="toggle" for="s-${name}"><span><strong>${label}</strong><small>${detail}</small></span><input id="s-${name}" name="${name}" type="checkbox" role="switch"${s[name] ? " checked" : ""}></label>`;

  function viewPrefs(st) {
    const where = app.mode === "personal" ? "היומן האישי" : app.mode === "scenario" ? "התרחיש הפתוח בלבד" : "היומן לדוגמה בלבד";
    return `<div class="two"><form id="settings-form" class="stack">${SETTINGS_FIELDS(st.settings)}
      <div class="save-bar"><button class="btn" type="submit">${I("check", 17)}שמירת ההגדרות</button><small>יחול על ${where}</small></div></form>
    <aside class="stack">
      <section class="card"><div class="card-h">${I("pin")}<div><h3>נסיעות</h3><p>זמני המועדים לפי היעד</p></div></div>
        ${st.trips.map(t => `<div class="trip"><span><strong>${esc(city(t.cityId).name)}</strong><small dir="ltr">${t.from} — ${t.to}</small></span><button class="icon-btn" data-deltrip="${t.id}" aria-label="מחיקת נסיעה">${I("trash", 17)}</button></div>`).join("")}
        <form id="trip-form" class="stack-s"><label class="field" for="t-city">יעד<select id="t-city" name="cityId">${CITIES.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select></label>
        <div class="pair"><label class="field" for="t-from">מתאריך<input id="t-from" name="from" type="date" required min="2000-01-01" max="2100-12-31"></label><label class="field" for="t-to">עד תאריך<input id="t-to" name="to" type="date" required min="2000-01-01" max="2100-12-31"></label></div>
        <button class="btn ghost full" type="submit">${I("plus", 17)}הוספת נסיעה</button></form>
        <p class="fine">נסיעה מעבר לקו התאריך מחייבת בירור אישי.</p></section>
      <section class="card"><div class="card-h">${I("lock")}<div><h3>גיבוי והעברה למכשיר אחר</h3><p>היומן שמור רק בטלפון הזה</p></div></div>
        <button class="action" data-act="backup">${I("download", 19)}<span><strong>גיבוי מוצפן</strong><small>בסיסמה שתבחרי</small></span></button>
        <button class="action" data-act="restore">${I("upload", 19)}<span><strong>שחזור מגיבוי</strong><small>מחליף את היומן לאחר אישור</small></span></button>
        <button class="action" data-act="report">${I("file", 19)}<span><strong>דוח לבירור</strong><small>טקסט גלוי לשליחה למורה הוראה</small></span></button>
        <button class="link danger" data-act="clear">מחיקת כל הרישומים</button></section>
      <section class="card about"><div class="card-h">${I("droplet")}<div><h3>על מעיין</h3><p>גרסה ${APP_VERSION} · מנוע ${M.ENGINE_VERSION}</p></div></div>
        <p>האפליקציה חינמית ופועלת כולה בטלפון, בלי חשבון ובלי שרת. שום מידע לא נשלח לאף אחד.</p>
        <p>להתקנה: בתפריט הדפדפן (⋮) בוחרים ״הוספה למסך הבית״.</p></section>
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
          ${groups.map(g => `<details class="tgroup"><summary>${esc(g)} <span class="count">${res.filter(t => t.group === g && t.ok).length}/${res.filter(t => t.group === g).length}</span>${I("left", 15)}</summary><ul>${res.filter(t => t.group === g).map(t => `<li class="${t.ok ? "ok" : "no"}">${I(t.ok ? "check" : "x", 15)}<span>${esc(t.name)}${t.ok ? "" : `<small>${esc(t.error)}</small>`}</span></li>`).join("")}</ul></details>`).join("")}`
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
    const d = M.SETTING_DEFAULTS, keys = ["wait", "haflagah", "beinonit", "day31", "orZarua", "carryMonthly", "carryLongIntervals", "missingMonthly"];
    const changed = keys.filter(k => s[k] !== d[k]);
    if (!changed.length) return `<p class="fine">הגדרות ברירת המחדל: חמישה ימים, הפלגה בימים, עונה בינונית באותה עונה.</p>`;
    return `<p class="fine">הגדרות התרחיש: ${changed.map(k => esc(M.settingsSummary(s).find(x => x.startsWith({ wait: "המתנה", haflagah: "הפלגה", beinonit: "עונה בינונית", day31: "יום 31", orZarua: "אור זרוע", carryMonthly: "שימור עונת", carryLongIntervals: "שימור הפלגות", missingMonthly: "יום ל׳" }[k])))).join(" · ")}</p>`;
  }
  const S = M.SOURCES;
  const RULES = [
    { t: "היום העברי והעונה", p: ["כל רישום נשמר עם התאריך האזרחי, השעה המקומית והעיר. היום העברי מתחיל בשקיעה, ועונת היום נמשכת מהזריחה עד השקיעה.", "זמני השמש מחושבים בגובה פני הים. צאת הכוכבים לפי הזווית שנבחרה (8.5° או 7.083°).", "רישום בטווח שלוש דקות מהזריחה או מהשקיעה, או בין השקיעה לצאת הכוכבים, מסומן לבירור ואינו משמש לחישוב ודאי. שלוש הדקות הן סף לסימון ולא הגדרה של בין השמשות.", "שעה כפולה או חסרה במעבר שעון, ומקום בלי זריחה או שקיעה (קוטב), אינם מסווגים אוטומטית."], src: S.calendar },
    { t: "המתנה לפני ההפסק", p: ["חמישה ימים: יום הראייה נספר כיום הראשון, וההפסק המוקדם ביום החמישי.", "ארבעה ימים: נספרים ממועד היחסים שנרשם כבסיס, ולא מהראייה. בלי בסיס רשום אין חישוב, ומופיעה נקודה לבירור.", "חידוש ספירה בתוך תקופת הנידה נשען על תחילת הנידה הקודמת ולא מוסיף חמישה ימים חדשים."], src: S.wait },
    { t: "הפסק טהרה ושבעה נקיים", p: ["הספירה מתחילה רק מהפסק שנרשם כנקי, לפני השקיעה ולא בזמן מסופק, ולא לפני סוף ההמתנה. הפסק מוקדם מתקבל רק עם הוראה אישית מתועדת.", "יום א׳ הוא היום העברי שאחרי ההפסק. ליל הטבילה המתוכנן הוא במוצאי היום השביעי, וזה נשאר תכנון בלבד.", "חוסר רישום בדיקה ביום הראשון או השביעי מסומן לבירור, ואינו פוסל או מאשר. בדיקה שנרשמה כלא נקייה אינה מאפסת אוטומטית."], src: S.clean },
    { t: "עונת החודש", p: ["אותו יום בחודש העברי הבא, באותה עונה.", "ראייה בל׳ כשבחודש הבא אין ל׳: ברירת המחדל היא א׳ בחודש שאחרי החודש החסר, כפסיקת מכון נשמת. אפשר לבחור דילוג.", "ראתה פעמיים באותו חודש: כל החישובים נעשים מהראייה האחרונה, ובנוסף נשמרת עונת החודש של הראייה הקודמת אם עוד לא הגיעה (נשמת; לוח חב״ד).", "בשנה מעוברת אדר א׳ עובר לאדר ב׳.", "שימור עונת חודש שחלה בזמן דימום הוא אפשרות נפרדת שדורשת תיעוד מלא."], src: S.monthly },
    { t: "עונה בינונית", p: ["יום 30 בספירה כוללנית: יום הראייה הוא יום 1, כלומר 29 ימים אחריו, באותה עונה.", "שתי העונות, יום 31 ואור זרוע הם שלוש הגדרות נפרדות, ואף אחת מהן אינה נבחרת לפי עדה."], src: S.average },
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
        <nav aria-label="ניווט">${NAV.map(([id, t, ic]) => `<button class="nav${app.tab === id ? " on" : ""}" data-go="${id}"${app.tab === id ? ' aria-current="page"' : ""}>${I(ic, 19)}<span>${t}</span>${id === "dates" && upcoming && !app.hidden ? `<small class="badge">${upcoming}</small>` : ""}</button>`).join("")}</nav>
        <p class="side-note">${I("lock", 15)}נשמר רק במכשיר הזה</p></aside>
      <div class="work">
        <header class="top"><div class="brand m">${mark()}<strong>מעיין</strong></div>
          <div class="top-date"><span class="hebdate">${esc(ctx.hebrewDate)}</span><small>${esc(civilLabel(ctx.date, true))}${ctx.afterSunset ? " · אחרי השקיעה" : ""}</small></div>
          <div class="top-act">${app.hidden ? "" : `<button class="pill" data-go="prefs" aria-label="עיר: ${esc(ctx.city.name)}">${I("pin", 15)}${esc(ctx.city.name)}</button>`}
            <button class="icon-btn" data-act="hide" aria-pressed="${app.hidden}" aria-label="${app.hidden ? "הצגת היומן" : "הסתרת היומן"}">${I(app.hidden ? "eye" : "eyeoff")}</button></div></header>
        ${banner}
        <main ${app.hidden ? "hidden" : ""}>
          <div class="page-h"><h1>${title}</h1>${["today", "calendar", "journal"].includes(app.tab) ? `<button class="btn" data-act="add">${I("plus", 18)}רישום חדש</button>` : ""}</div>
          ${views[app.tab](st, r, ctx)}
          <footer class="foot"><span>${I("info", 15)}החישובים טרם קיבלו אישור הלכתי. אין לראות בהם פסק.</span><button class="link" data-go="review">כללים ומקורות</button></footer>
        </main>
        ${app.hidden ? `<div class="veil">${I("lock", 30)}<h2>היומן מוסתר</h2><button class="btn" data-act="hide">${I("eye", 18)}הצגת היומן</button></div>` : ""}
      </div>
      <nav class="tabs" aria-label="ניווט">${NAV.map(([id, t, ic]) => `<button class="${app.tab === id ? "on" : ""}" data-go="${id}"${app.tab === id ? ' aria-current="page"' : ""}>${I(ic, 21)}<span>${t.replace("לוח השנה", "לוח").replace("היומן שלי", "יומן")}</span></button>`).join("")}</nav>`;
  }
  const mark = () => `<span class="mark">${I("droplet", 22)}</span>`;

  function render() {
    const root = $("#app"), scroll = window.scrollY, focusId = document.activeElement?.id, selStart = document.activeElement?.selectionStart;
    root.innerHTML = shell();
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch { /* */ } } }
    window.scrollTo(0, scroll);
    renderModal(); renderToast();
  }
  function renderToast() { $("#toast").innerHTML = app.toast ? `<div class="toast" role="status">${esc(app.toast)}<button class="icon-btn" data-act="toast-x" aria-label="סגירה">${I("x", 16)}</button></div>` : ""; }
  function go(tab, top = true) {
    app.tab = tab;
    try { history.replaceState(null, "", "#" + tab); } catch { /* */ }
    render(); if (top) window.scrollTo(0, 0);
  }

  /* ---------- חלונות ---------- */
  function renderModal() {
    const host = $("#modal"), m = app.modal;
    if (!m) { host.innerHTML = ""; document.body.classList.remove("locked"); return; }
    document.body.classList.add("locked");
    host.innerHTML = `<div class="scrim" data-act="close-modal"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="m-title">${modalBody(m)}</div>`;
    const first = host.querySelector("[autofocus]") || host.querySelector("input,select,textarea,button");
    first?.focus({ preventScroll: true });
  }
  function modalBody(m) {
    const close = `<button class="icon-btn" data-act="close-modal" aria-label="סגירה">${I("x")}</button>`;
    if (m.kind === "event") {
      const f = m.form, needsResult = ["hefsek", "bedikah", "question"].includes(f.type);
      const HELP = { question: "שאלה לבירור נשמרת ומופיעה בנקודות לבירור. היא אינה הופכת לווסת.", restart: "רישום הוראה להתחיל ספירה חדשה בתוך תקופת הנידה.", intimacy: "משמש בסיס לחישוב כשנבחרה שיטת ארבעה ימים ממועד היחסים.", hefsek: "הפסק סמוך לשקיעה או לפני סוף ההמתנה יסומן לבירור.", manual: "עונה שנקבעה לפי הוראה אישית. אינה נוצרת מהחישוב.", flow: "השעה חשובה: אחרי השקיעה זה כבר היום העברי הבא." };
      let hebHint = ""; if (M.validISO(f.date)) hebHint = `${hebrew(f.date)} · עד השקיעה`;
      return `<div class="m-h"><h2 id="m-title">${m.editing ? "עריכת רישום" : "רישום חדש"}</h2>${close}</div>
      <form id="event-form" class="stack-s">
        <label class="field" for="e-type">סוג<select id="e-type" name="type">${Object.entries(EVENT_NAMES).map(([v, n]) => `<option value="${v}"${f.type === v ? " selected" : ""}>${n}</option>`).join("")}</select></label>
        <div class="pair"><label class="field" for="e-date">${f.type === "manual" ? "התאריך של יום העונה" : "תאריך"}<input id="e-date" name="date" type="date" required min="2000-01-01" max="2100-12-31" value="${f.date}"><small class="hebdate" id="e-heb">${esc(hebHint)}</small></label>
        <label class="field" for="e-time">שעה<input id="e-time" name="time" type="time" required value="${f.time}"><small>לפי השעון במקום</small></label></div>
        <label class="field" for="e-city">מקום<select id="e-city" name="cityId">${CITIES.map(c => `<option value="${c.id}"${f.cityId === c.id ? " selected" : ""}>${c.name}</option>`).join("")}</select></label>
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
        <label class="field" for="c-city">מקום<select id="c-city">${CITIES.map(c => `<option value="${c.id}"${state().settings.cityId === c.id ? " selected" : ""}>${c.name}</option>`).join("")}</select></label>
        ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
        <div class="m-actions"><button class="btn" type="submit">${I("check", 17)}שמירת המחזור</button><button type="button" class="btn ghost" data-act="close-modal">${m.saved ? "סיום" : "ביטול"}</button></div></form>`;
    if (m.kind === "backup") return `<div class="m-h"><h2 id="m-title">גיבוי מוצפן</h2>${close}</div>
      <form id="backup-form" class="stack-s"><p>הגיבוי מוצפן בסיסמה שאת בוחרת. בלי הסיסמה אי אפשר לשחזר אותו, גם לא אנחנו.</p>
      <label class="field" for="b-pass">סיסמת גיבוי<input id="b-pass" type="password" minlength="10" required autocomplete="new-password"><small>לפחות 10 תווים. לשמור אותה בנפרד.</small></label>
      ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}<div class="m-actions"><button class="btn" type="submit">${I("lock", 17)}יצירת גיבוי</button></div></form>`;
    if (m.kind === "restore") return `<div class="m-h"><h2 id="m-title">שחזור מגיבוי</h2>${close}</div>
      <form id="restore-form" class="stack-s"><label class="field" for="r-file">קובץ גיבוי<input id="r-file" type="file" accept=".may,.json,.txt,application/json,text/plain"></label>
      <label class="field" for="r-text">או הדבקת טקסט הגיבוי<textarea id="r-text" class="mono" rows="3" placeholder='{"format":"maayan-encrypted-v1",…}'></textarea></label>
      <label class="field" for="r-pass">סיסמת הגיבוי<input id="r-pass" type="password" required autocomplete="off"></label>
      ${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}<div class="m-actions"><button class="btn" type="submit">${I("upload", 17)}פתיחת הגיבוי</button></div></form>`;
    if (m.kind === "confirm") return `<div class="m-h"><h2 id="m-title">${esc(m.title)}</h2>${close}</div><p>${esc(m.text)}</p>
      <div class="m-actions"><button class="btn ${m.danger ? "danger" : ""}" data-act="confirm-yes">${esc(m.yes)}</button><button class="btn ghost" data-act="close-modal">ביטול</button></div>`;
    if (m.kind === "welcome") return `<div class="welcome"><div class="mark big">${I("droplet", 34)}</div><h2 id="m-title">ברוכה הבאה למעיין</h2>
      <p>יומן אישי לטהרת המשפחה: רישום, חישוב עונות הפרישה, שבעה נקיים ותזכורות.</p>
      <ul class="promises"><li>${I("lock", 18)}<span><strong>פרטי לגמרי.</strong> הכול נשמר רק בטלפון הזה, בלי חשבון ובלי שרת.</span></li>
      <li>${I("scale", 18)}<span><strong>שקוף.</strong> לכל מועד מוצגים הכלל והמקור, ואת שיטת החישוב בוחרים לפי ההנחיה שקיבלת.</span></li>
      <li>${I("help", 18)}<span><strong>לא פוסק.</strong> זו גרסת בדיקה שטרם קיבלה אישור הלכתי. במקום של ספק המערכת מסמנת לבירור.</span></li></ul>
      <div class="stack-s"><button class="btn full" data-act="start-personal">${I("plus", 18)}התחלת יומן אישי</button>
      <button class="btn ghost full" data-act="start-demo">${I("flask", 18)}צפייה ביומן לדוגמה</button>
      <button class="btn ghost full" data-act="start-review">${I("scale", 18)}אני בודק/ת הלכתי/ת</button></div></div>`;
    return "";
  }
  function openEvent(opts = {}) {
    const st = state(), ctx = currentContext(st, now());
    const date = opts.date || ctx.date, c = opts.date ? atLocation(st, date) : ctx.city;
    const form = opts.event ? { ...opts.event } : { id: M.uuid(), type: opts.type || (opts.date && opts.date > ctx.date ? "manual" : "flow"), date, time: timeInZone(now(), c.tz), cityId: c.id, result: "clear", note: "", authorityNote: "", createdAt: new Date().toISOString() };
    app.modal = { kind: "event", form, editing: !!opts.event, error: "", confirmDelete: false };
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
  function download(text, name, type) {
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
    return [`הערות בודק — מעיין ${APP_VERSION}`, note ? `\nהערות:\n${note}\n` : "", `מקור הנתונים: ${where}`, tests, `מכשיר: ${navigator.userAgent}`, "", M.reportExport(st, n)].join("\n");
  }

  /* ---------- אירועים ---------- */
  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-go],[data-act],[data-edit],[data-day],[data-cal],[data-calmode],[data-scenario],[data-scenario-load],[data-deltrip]");
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
    if (d.deltrip) { const st = state(); try { commit({ ...st, trips: st.trips.filter(x => x.id !== d.deltrip) }); } catch (err) { toast(err.message); } return; }
    const st = state();
    switch (d.act) {
      case "add": return openEvent({ type: d.type, date: d.date });
      case "cycle": app.modal = { kind: "cycle", error: "", saved: 0 }; return renderModal();
      case "hide": app.hidden = !app.hidden; return render();
      case "close-modal": if (app.modal?.kind === "welcome") markSeen(); app.modal = null; return renderModal();
      case "toast-x": app.toast = ""; return renderToast();
      case "demo": Object.assign(app, { mode: "demo", sandbox: M.demoState(realNow()), cal: { cursor: null, mode: "civil", selected: null } }); return go("today");
      case "personal": Object.assign(app, { mode: "personal", sandbox: null, scenario: null, cal: { cursor: null, mode: "civil", selected: null } }); return go("today");
      case "start-personal": markSeen(); app.modal = null; return go("today");
      case "start-demo": markSeen(); app.modal = null; Object.assign(app, { mode: "demo", sandbox: M.demoState(realNow()) }); return go("today");
      case "start-review": markSeen(); app.modal = null; return go("review");
      case "delete": app.modal.form = readEventForm(); app.modal.confirmDelete = true; return renderModal();
      case "delete-no": app.modal.confirmDelete = false; return renderModal();
      case "delete-yes": try { const id = app.modal.form.id; app.modal = null; commit({ ...st, events: st.events.filter(x => x.id !== id) }); } catch (err) { toast(err.message); } return;
      case "report": return textModal("דוח לבירור", "טקסט גלוי עם ההגדרות, הרישומים, המועדים והנקודות לבירור. לא נשלח לאף אחד — את מחליטה למי להעביר.", M.reportExport(st, now()), { name: `maayan-report-${currentContext(st, now()).date}.txt`, type: "text/plain;charset=utf-8" });
      case "review-report": { const text = reviewReport(); if (await copy(text)) return; return textModal("דוח לבודק", "סמנו את הטקסט והעתיקו.", text); }
      case "ics": { const r = calculate(st, now()); return textModal("קובץ מועדים ליומן", "שומרים כקובץ ופותחים אותו ביומן הטלפון. אם השמירה לא עובדת כאן, פתחו את מעיין ישירות בדפדפן.", M.calendarExport(r.plans, st.settings.neutralReminders, now()), { name: "maayan-dates.ics", type: "text/calendar;charset=utf-8" }); }
      case "copy-text": return copy(app.modal.text);
      case "dl-text": try { download(app.modal.text, app.modal.file.name, app.modal.file.type); toast("הקובץ נשמר בהורדות"); } catch { toast("השמירה כקובץ נחסמה. אפשר להעתיק."); } return;
      case "backup": app.modal = { kind: "backup", error: "" }; return renderModal();
      case "restore": app.modal = { kind: "restore", error: "" }; return renderModal();
      case "clear": app.modal = { kind: "confirm", title: "למחוק את כל הרישומים?", text: "כל הרישומים והנסיעות יימחקו מהמכשיר. ההגדרות יישארו. אי אפשר לבטל.", yes: "מחיקה", danger: true, run: () => { app.blockSave = false; app.loadWarning = ""; commit({ ...st, events: [], trips: [] }); } }; return renderModal();
      case "confirm-yes": { const run = app.modal.run; app.modal = null; try { run(); } catch (err) { toast(err.message); } return renderModal(); }
      case "tests": { t.disabled = true; setTimeout(() => { app.testResults = MaayanTests(M).run(); render(); }, 30); return; }
      case "notify":
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
    } else if (t.id === "filter") { app.filter = t.value; render(); }
    else if (t.id === "e-type") { app.modal.form = readEventForm(); renderModal(); $("#e-type")?.focus(); }
    else if (t.id === "e-date") { const h = $("#e-heb"); if (h) h.textContent = M.validISO(t.value) ? `${hebrew(t.value)} · עד השקיעה` : ""; }
    else if (t.id === "r-file") { const f = t.files?.[0]; if (f && f.size < 4e6) f.text().then(x => { $("#r-text").value = x; }); }
  });
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
    } else if (f.id === "settings-form") {
      const fd = new FormData(f), s = { ...st.settings };
      for (const k of ["cityId", "wait", "haflagah", "beinonit", "missingMonthly", "bedikot", "nightfall", "special", "methodNote", "morningTime"]) s[k] = String(fd.get(k));
      s.reminderMinutes = Number(fd.get("reminderMinutes"));
      for (const k of ["day31", "orZarua", "carryMonthly", "carryLongIntervals", "remindersEnabled", "neutralReminders"]) s[k] = fd.has(k);
      try { commit({ ...st, settings: s }); } catch (err) { toast(err.message); }
    } else if (f.id === "trip-form") {
      const fd = new FormData(f);
      try { commit({ ...st, trips: [...st.trips, { id: M.uuid(), cityId: String(fd.get("cityId")), from: String(fd.get("from")), to: String(fd.get("to")) }] }); } catch (err) { toast(err.message); }
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
      try { const text = await M.encryptBackup(st, $("#b-pass").value); textModal("הגיבוי מוכן", "שמרי את הקובץ או העתיקי את הטקסט למקום בטוח (למשל מייל לעצמך). לשחזור צריך גם את הסיסמה.", text, { name: `maayan-backup-${currentContext(st, now()).date}.may`, type: "application/json" }); }
      catch (err) { app.modal.error = err.message; renderModal(); }
    } else if (f.id === "restore-form") {
      try {
        const text = $("#r-text").value.trim(); if (!text) throw new Error("יש לבחור קובץ או להדביק את טקסט הגיבוי");
        const restored = M.parseState(await M.decryptBackup(text, $("#r-pass").value));
        app.modal = { kind: "confirm", title: "להחליף את היומן?", text: `היומן הנוכחי יוחלף בגרסה מהגיבוי (${restored.events.length} רישומים).`, yes: "שחזור", run: () => { app.blockSave = false; app.loadWarning = ""; commit(restored); } };
        renderModal();
      } catch (err) { app.modal.error = err.message; renderModal(); }
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && app.modal) { if (app.modal.kind === "welcome") markSeen(); app.modal = null; renderModal(); } });
  function markSeen() { storage.set(SEEN_KEY, "1"); }

  /* ---------- שעון והתראות ---------- */
  function tick() {
    if (app.mode === "scenario") return;
    const st = state(), n = now(), r = calculate(st, n), ctx = currentContext(st, n);
    if (app.permission === "granted" && st.settings.remindersEnabled && app.mode === "personal") {
      for (const p of r.plans) {
        const delta = n - new Date(p.start);
        if (p.done || delta < 0 || delta > 90000 || app.notified.has(p.id)) continue;
        app.notified.add(p.id);
        try { new Notification(st.settings.neutralReminders ? "תזכורת אישית" : p.title, { body: "פרטים ביומן האישי", tag: p.id }); } catch { /* */ }
      }
    }
    if (`${ctx.abs}|${r.phase}|${app.mode}` !== app.lastDayKey && !app.modal) render();
  }

  /* ---------- הפעלה ---------- */
  app.personal = loadPersonal();
  if ("Notification" in window) app.permission = Notification.permission; else app.permission = "unsupported";
  const hash = location.hash.slice(1);
  if (NAV.some(n => n[0] === hash)) app.tab = hash;
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (NAV.some(n => n[0] === h) && h !== app.tab) go(h); });
  render();
  if (!storage.get(SEEN_KEY) && !app.personal.events.length) { app.modal = { kind: "welcome" }; renderModal(); }
  setInterval(tick, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
})();
