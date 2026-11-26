/* בדיקות המנוע — העברה של tests/engine.test.ts. רצות גם ב-Node וגם בתוך האפליקציה. */
const MaayanTests = (M) => {
  const fail = m => { throw new Error(m); };
  const a = {
    equal: (x, y, m) => { if (x !== y) fail(m || `ציפינו ל-${JSON.stringify(y)} וקיבלנו ${JSON.stringify(x)}`); },
    notEqual: (x, y, m) => { if (x === y) fail(m || `לא ציפינו ל-${JSON.stringify(y)}`); },
    ok: (x, m) => { if (!x) fail(m || "התנאי לא התקיים"); },
    deepEqual: (x, y, m) => { if (JSON.stringify(x) !== JSON.stringify(y)) fail(m || `ציפינו ל-${JSON.stringify(y)} וקיבלנו ${JSON.stringify(x)}`); },
    match: (x, re, m) => { if (!re.test(x)) fail(m || `"${x}" אינו תואם ל-${re}`); },
    throws: (f, re) => { try { f(); } catch (e) { if (re && !re.test(e.message)) fail(`נזרקה שגיאה אחרת: ${e.message}`); return; } fail("ציפינו לשגיאה"); },
  };
  const { HDate, calculate, city, emptyState, safeParse, addDays, currentContext, fromAbs, hd, localInstant, onahWindow, stamp, sun, timeInZone, toISO, uuid } = M;
  const NOW = new Date("2026-11-20T12:00:00Z");
  const N = (day, month = 1, year = 5785) => toISO(new HDate(day, month, year).greg());
  const event = (type, date, time = "10:00", extra = {}) => ({ id: uuid(), type, date, time, cityId: "netanya", result: "clear", note: "", authorityNote: "", createdAt: "2026-11-01T10:00:00Z", ...extra });
  const run = (events, settings = {}, now = NOW) => { const s = emptyState(); s.events = events; s.settings = { ...s.settings, ...settings }; return calculate(s, now); };
  const T = [];
  const test = (group, name, fn) => T.push({ group, name, fn });

  test("הפסק טהרה", "בלי רישום הפסק אין ספירה, גם אחרי שעבר המועד המוקדם", () => {
    const now = new Date(new HDate(14, 1, 5785).greg().toISOString().slice(0, 10) + "T09:00:00Z");
    const r = run([event("flow", N(1), "10:00")], {}, now);
    a.equal(r.phase, "waiting"); a.equal(r.hefsek, undefined); a.ok(!r.cleanDay, "אין יום ספירה");
    a.ok(!r.plans.some(p => p.kind === "bedikah" || p.kind === "mikvah"), "אין בדיקות או טבילה בלי הפסק");
    const h = r.plans.find(p => p.kind === "hefsek"); a.ok(h, "יש תזכורת להפסק");
    a.equal(h.date, toISO(new HDate(14, 1, 5785).greg()), "התזכורת עוברת ליום הנוכחי ולא נשארת ביום החמישי");
  });
  test("הפסק טהרה", "הפסק שנרשם כלא נקי אינו פותח שבעה נקיים", () => {
    const now = new Date(new HDate(8, 1, 5785).greg().toISOString().slice(0, 10) + "T09:00:00Z");
    const r = run([event("flow", N(1), "10:00"), event("hefsek", N(5), "15:00", { result: "bleeding" })], {}, now);
    a.equal(r.phase, "waiting"); a.equal(r.hefsek, undefined);
    const r2 = run([event("flow", N(1), "10:00"), event("hefsek", N(5), "15:00", { result: "bleeding" }), event("hefsek", N(6), "15:00")], {}, now);
    a.equal(r2.phase, "clean"); a.equal(r2.hefsek.date, N(6), "הספירה מתחילה מההפסק הנקי בלבד");
  });
  test("זמני היום", "תואם את לוח עיתים לבינה (גבעת שמואל, כסלו תשפ״ז)", () => {
    // שקיעה במישור וצאת הכוכבים 8.5° מתוך לוח עיתים לבינה לכתובת בגבעת שמואל, 22–28 בנובמבר 2026
    const c = { id: "test-gs", name: "גבעת שמואל", lat: 32.0748, lon: 34.8508, tz: "Asia/Jerusalem" };
    const rows = [["2026-11-22", "16:37:30", "17:16"], ["2026-11-23", "16:37:15", "17:16"], ["2026-11-24", "16:37:00", "17:15"], ["2026-11-25", "16:36:45", "17:15"], ["2026-11-26", "16:36:30", "17:15"], ["2026-11-27", "16:36:15", "17:15"], ["2026-11-28", "16:36:00", "17:15"]];
    for (const [d, set, tz] of rows) {
      const s = M.sun(d, c), luach = new Date(`${d}T${set}+02:00`), luachTz = new Date(`${d}T${tz}:00+02:00`);
      a.ok(s.sunset <= luach, `${d}: השקיעה באפליקציה לא מאוחרת מהלוח`);
      a.ok(luach - s.sunset < 75000, `${d}: הפרש שקיעה ${(luach - s.sunset) / 1000} שניות`);
      a.ok(s.nightfall >= luachTz && s.nightfall - luachTz <= 120000, `${d}: צאת הכוכבים בדקה של הלוח או אחריה`);
    }
  });
  test("לוח עברי", "ראש השנה תשפ״ז חל ב-12 בספטמבר 2026", () => a.equal(N(1, 7, 5787), "2026-09-12"));
  test("לוח עברי", "ט״ו בניסן תשפ״ו חל ב-2 באפריל 2026", () => a.equal(N(15, 1, 5786), "2026-04-02"));
  test("לוח עברי", "התאמה ללוח העברי של הדפדפן ב-3,000 ימים", () => {
    let f; try { f = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", year: "numeric", timeZone: "UTC" }); } catch { return; }
    for (let i = 0; i < 3000; i++) {
      const d = addDays("2022-01-01", i * 3), [y, m, day] = d.split("-").map(Number);
      const parts = f.formatToParts(new Date(Date.UTC(y, m - 1, day, 12)));
      const h = hd(d);
      a.equal(h.getDate(), Number(parts.find(p => p.type === "day").value), `יום שגוי ב-${d}`);
      const yr = parts.find(p => p.type === "year" || p.type === "relatedYear");
      if (yr && /^\d+$/.test(yr.value)) a.equal(h.getFullYear(), Number(yr.value), `שנה שגויה ב-${d}`);
    }
  });
  test("לוח עברי", "חודשים מתחלפים נכון באדר א׳, אדר ב׳ ואלול", () => {
    a.equal(new HDate(12, 12, 5784).add(1, "M").getMonth(), 13);
    a.equal(new HDate(12, 12, 5785).add(1, "M").getMonth(), 1);
    const t = new HDate(3, 6, 5785).add(1, "M"); a.equal(t.getMonth(), 7); a.equal(t.getFullYear(), 5786);
  });

  test("בסיס", "יומן ריק אינו ממציא מועדים", () => { const r = run([]); a.equal(r.phase, "empty"); a.equal(r.plans.length, 0); a.equal(r.hefsek, undefined); });
  test("הפלגה", "הפלגה בספירה כוללנית: ב׳ ניסן ← ל׳ ניסן מחשב כ״ח אייר", () => {
    const x = event("flow", N(2)), y = event("flow", N(30)); const p = run([x, y]).plans.find(p => p.kind === "interval");
    a.equal(p.date, N(28, 2)); a.equal(p.onah, "day"); a.match(p.title, /29/); a.deepEqual(p.eventIds, [x.id, y.id]);
  });
  test("הפלגה", "עונת ההפלגה נקבעת לפי הווסת האחרונה", () => { const p = run([event("flow", N(2)), event("flow", N(30), "01:00")]).plans.find(p => p.kind === "interval"); a.equal(p.onah, "night"); a.equal(p.date, addDays(N(28, 2), -1)); });
  test("עונה בינונית", "יום 30 הוא יום הראייה ועוד 29 (ספירה כוללנית)", () => { const p = run([event("flow", N(2))]).plans.find(p => p.kind === "average"); a.equal(p.date, N(1, 2)); });
  test("עונה בינונית", "שתי העונות ויום 31 הן אפשרויות נפרדות", () => { const pp = run([event("flow", N(2))], { beinonit: "both", day31: true }).plans.filter(p => p.kind === "average"); a.equal(pp.length, 4); a.deepEqual([...new Set(pp.map(p => p.onah))].sort(), ["day", "night"]); });
  test("עונת החודש", "שומרת על התאריך העברי גם כשאורך החודש הלועזי משתנה", () => { const p = run([event("flow", N(15))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(15, 2)); });
  test("עונת החודש", "ל׳ בחודש שאחריו אין ל׳ — במדיניות דילוג אין גלישה שקטה", () => { const r = run([event("flow", N(30))], { missingMonthly: "skip" }); a.equal(r.plans.filter(p => p.kind === "monthly").length, 0); a.ok(r.reviews.some(r => r.id === "missing-month-day")); });
  test("עונת החודש", "ל׳ ניסן במדיניות ״א׳ בחודש שאחריו״ מגיע לא׳ סיון ולא לתמוז", () => { const p = run([event("flow", N(30))], { missingMonthly: "first-next-month" }).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(1, 3)); });
  test("עונת החודש", "ברירת המחדל לל׳ בחודש חסר היא א׳ בחודש שאחריו (לחומרא)", () => { const p = run([event("flow", N(30))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(1, 3)); });
  test("עונת החודש", "ראתה פעמיים בחודש: עונת החודש של הראייה הראשונה נשמרת", () => {
    const pp = run([event("flow", N(5)), event("hefsek", N(9), "16:00"), event("flow", N(25))]).plans.filter(p => p.kind === "monthly");
    a.deepEqual(pp.map(p => p.date).sort(), [N(5, 2), N(25, 2)].sort());
  });
  test("עונת החודש", "ראייה קודמת שעונת החודש שלה כבר עברה אינה מוסיפה עונה", () => a.equal(run([event("flow", N(2)), event("flow", N(4, 2))]).plans.filter(p => p.kind === "monthly").length, 1));
  test("חב״ד", "בחירת חב״ד עם עונה בינונית חלקית מסומנת לבירור", () => a.ok(run([event("flow", N(2))], { haflagah: "chabad-onot" }).reviews.some(r => r.id === "chabad-beinonit")));
  test("אור זרוע", "בעונה בינונית של יממה אין כפילות של אור זרוע", () => { const pp = run([event("flow", N(2))], { orZarua: true, beinonit: "both" }).plans; const w = pp.map(p => p.start + p.end); a.equal(new Set(w).size, w.length); });
  test("רטרואקטיבי", "שנה של מחזורים קודמים בסדר הזנה הפוך נותנת תוצאה זהה", () => {
    const evs = []; let d = N(1, 7, 5785);
    for (let c = 0; c < 12; c++) { evs.push(event("flow", d), event("hefsek", addDays(d, 5), "16:00"), event("mikvah", addDays(d, 12), "20:30")); d = addDays(d, 29 + (c % 3)); }
    const x = run(evs), y = run([...evs].reverse());
    a.deepEqual(x.plans, y.plans); a.equal(x.phase, "immersed"); a.ok(x.plans.some(p => p.kind === "interval"));
  });
  test("רטרואקטיבי", "ראיות ישנות בלי טבילה מסומנות לבירור ולא מציגות מצב שגוי בשקט", () => a.ok(run([event("flow", N(2)), event("flow", N(1, 2))]).reviews.some(r => r.id === "no-mikvah-after-flow")));
  test("עונת החודש", "חוצה את ראש השנה (אלול ← תשרי)", () => { const p = run([event("flow", N(12, 6, 5785))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(12, 7, 5786)); });
  test("עונת החודש", "בשנה מעוברת עוברת מאדר א׳ לאדר ב׳", () => { const p = run([event("flow", N(12, 12, 5784))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(12, 13, 5784)); });
  test("המתנה", "חמישה ימים כוללים את יום תחילת הווסת", () => a.equal(run([event("flow", N(2), "16:00")]).earliestHefsek, N(6)));
  test("המתנה", "ראייה אחרי השקיעה נספרת ליום העברי הבא", () => a.equal(run([event("flow", N(2), "22:00")]).earliestHefsek, N(7)));
  test("המתנה", "שיטת ארבעה ימים נספרת ממועד היחסים ולא מהראייה", () => a.equal(run([event("intimacy", N(1), "10:00"), event("flow", N(3), "10:00")], { wait: "four-from-relations" }).earliestHefsek, N(4)));
  test("המתנה", "שיטת ארבעה ימים בלי מועד בסיס מסומנת לבירור ולא מנוחשת", () => { const r = run([event("flow", N(2))], { wait: "four-from-relations" }); a.equal(r.earliestHefsek, undefined); a.ok(r.reviews.some(r => r.id === "wait-base")); });
  test("שבעה נקיים", "הפסק תקף פותח שבעה ימים ומתכנן טבילה בערב השביעי", () => { const r = run([event("flow", N(2)), event("hefsek", N(6), "16:00")]); a.equal(r.immersionDate, N(13)); a.equal(r.plans.filter(p => p.kind === "bedikah").length, 14); a.ok(r.plans.find(p => p.kind === "mikvah").tentative); });
  test("שבעה נקיים", "הפסק מוקדם אינו פותח ספירה בלי הוראה מתועדת", () => { const r = run([event("flow", N(2)), event("hefsek", N(4), "16:00")]); a.equal(r.hefsek, undefined); a.ok(r.reviews.some(r => r.id.startsWith("hefsek-early"))); });
  test("שבעה נקיים", "הוראה אישית מתועדת מאפשרת הפסק מוקדם", () => { const h = event("hefsek", N(4), "16:00", { authorityNote: "הוראה אישית שנרשמה לצורך הבדיקה" }); a.equal(run([event("flow", N(2)), h]).hefsek?.id, h.id); });
  test("שבעה נקיים", "הפסק אחרי השקיעה אינו מתקבל אוטומטית", () => { const r = run([event("flow", N(2)), event("hefsek", N(6), "22:00")]); a.equal(r.hefsek, undefined); a.ok(r.reviews.some(r => r.id.startsWith("hefsek-late"))); });
  test("שבעה נקיים", "הפסק מסופק אינו פותח ספירה", () => a.equal(run([event("flow", N(2)), event("hefsek", N(6), "16:00", { result: "uncertain" })]).hefsek, undefined));
  test("שבעה נקיים", "חוסר בדיקה ביום הראשון או השביעי מסומן לבירור, לא מאושר", () => { const r = run([event("flow", N(2)), event("hefsek", N(6), "16:00")]); a.ok(r.reviews.some(r => r.id === "missing-day-1")); a.ok(r.reviews.some(r => r.id === "missing-day-7")); });
  test("שבעה נקיים", "בדיקות מתועדות ביום הראשון והשביעי מסירות את הסימון", () => { const r = run([event("flow", N(2)), event("hefsek", N(6), "16:00"), event("bedikah", N(7)), event("bedikah", N(13))]); a.ok(!r.reviews.some(r => r.id === "missing-day-1" || r.id === "missing-day-7")); a.equal(r.checks[1].length, 1); });
  test("שבעה נקיים", "חידוש ספירה בתוך תקופת נידה אינו מחייב חמישה ימים חדשים", () => { const r = run([event("flow", N(2)), event("hefsek", N(6), "16:00"), event("restart", N(9))]); a.equal(r.earliestHefsek, N(9)); a.equal(r.hefsek, undefined); });
  test("ספקות", "כתם מסופק אינו יוצר הפלגה חדשה", () => { const r = run([event("flow", N(2)), event("question", N(20), "10:00", { result: "uncertain" })]); a.equal(r.plans.filter(p => p.kind === "interval").length, 0); a.ok(r.reviews.some(r => r.id.startsWith("question"))); });
  test("שבעה נקיים", "טבילה אינה נרשמת רק משום שהמועד עבר", () => { const r = run([event("flow", N(2)), event("hefsek", N(6), "16:00")]); a.equal(r.phase, "planned"); });
  test("חב״ד", "52 עונות מההפסק עד ראייה ביום", () => { const h = event("hefsek", N(5, 2), "16:00"); const p = run([event("flow", N(1)), event("hefsek", N(5), "16:00"), event("flow", N(1, 2)), h], { haflagah: "chabad-onot" }).plans.find(p => p.kind === "interval"); a.match(p.title, /52/); a.equal(p.date, fromAbs(hd(h.date).abs() + 26)); a.equal(p.onah, "day"); });
  test("חב״ד", "מספר עונות אי-זוגי מחושב לעונת לילה בערב הקודם", () => { const h = event("hefsek", N(5, 2), "16:00"); const p = run([event("flow", N(1)), event("hefsek", N(5), "16:00"), event("flow", N(1, 2), "01:00"), h], { haflagah: "chabad-onot" }).plans.find(p => p.kind === "interval"); a.match(p.title, /51/); a.equal(p.onah, "night"); a.equal(p.date, fromAbs(hd(h.date).abs() + 25)); });
  test("חב״ד", "בלי הפסק קודם — מסומן כחסר נתון", () => { const r = run([event("flow", N(1)), event("flow", N(1, 2))], { haflagah: "chabad-onot" }); a.equal(r.plans.filter(p => p.kind === "interval").length, 0); a.ok(r.reviews.some(r => r.id.startsWith("chabad-hefsek"))); });
  test("חב״ד", "הפסק קודם אחרי השקיעה אינו משמש בסיס להפלגה", () => { const r = run([event("flow", N(1)), event("hefsek", N(5), "22:00"), event("flow", N(1, 2)), event("hefsek", N(5, 2), "16:00")], { haflagah: "chabad-onot" }); a.equal(r.plans.filter(p => p.kind === "interval").length, 0); });
  test("ספקות", "ראייה מסופקת באמצע אינה נמחקת כדי לייצר הפלגה ארוכה", () => { const r = run([event("flow", N(2)), event("flow", N(15), "10:00", { result: "uncertain" }), event("flow", N(30))]); a.equal(r.plans.filter(p => p.kind === "interval").length, 0); a.ok(r.reviews.some(r => r.id === "uncertain-interval")); });
  test("וסת קבוע", "שלוש הפלגות שוות דורשות ארבע ראיות", () => { const s = N(1), f = [0, 28, 56, 84].map(n => event("flow", addDays(s, n))); a.ok(!run(f.slice(0, 3)).reviews.some(r => r.id === "possible-fixed-interval")); a.ok(run(f).reviews.some(r => r.id === "possible-fixed-interval")); });
  test("וסת קבוע", "אותו תאריך בשנים שונות אינו דפוס חודשי", () => { const r = run([event("flow", N(10, 1, 5783)), event("flow", N(10, 2, 5784)), event("flow", N(10, 3, 5785))]); a.ok(!r.reviews.some(r => r.id === "possible-fixed-month")); });
  test("וסת קבוע", "שלוש ראיות רצופות באותו יום ועונה מסומנות לבירור", () => a.ok(run([event("flow", N(10)), event("flow", N(10, 2)), event("flow", N(10, 3))]).reviews.some(r => r.id === "possible-fixed-month")));
  test("מצבים מיוחדים", "היריון, לידה, הנקה וטיפול הורמונלי משעים חישוב רגיל", () => { for (const special of ["pregnancy", "postpartum", "nursing", "hormonal"]) { const r = run([event("flow", N(2))], { special }); a.equal(r.plans.filter(p => ["monthly", "average", "interval"].includes(p.kind)).length, 0); a.ok(r.reviews.some(r => r.id === "special")); } });
  test("רישום ידני", "עונה עתידית לפי הוראה נשמרת כמועד", () => { const r = run([event("manual", "2026-12-01", "12:00", { onah: "night", authorityNote: "הוראה אישית" })]); a.equal(r.plans[0].kind, "manual"); a.equal(r.plans[0].date, "2026-11-30"); });
  test("בסיס", "ראייה עתידית אינה משנה את החישוב הנוכחי", () => { const r = run([event("flow", "2026-12-01")]); a.equal(r.latestFlow, undefined); a.ok(r.reviews.some(r => r.id.startsWith("future"))); });
  test("בסיס", "עריכת תאריך מחשבת מחדש את כל המועדים", () => { const e = event("flow", N(2)), x = run([e]), y = run([{ ...e, date: N(3) }]); a.notEqual(x.plans.find(p => p.kind === "average").date, y.plans.find(p => p.kind === "average").date); });
  test("בסיס", "סדר ההזנה אינו משפיע על החישוב", () => { const x = event("flow", N(2)), y = event("flow", N(30)); a.deepEqual(run([x, y]).plans, run([y, x]).plans); });
  test("אור זרוע", "העונה שלפני העונה המחושבת", () => { const pp = run([event("flow", N(2))], { orZarua: true }).plans; const x = pp.find(p => p.kind === "average"), o = pp.find(p => p.id === `oz-${x.id}`); a.equal(o.onah, "night"); a.equal(new Date(o.end).valueOf(), new Date(x.start).valueOf()); });
  test("מקום וזמן", "נסיעה משנה את אזור הזמן של מועד עתידי בלי לשנות רישום קודם", () => { const s = emptyState(); s.events = [event("flow", N(2))]; const t = N(1, 2); s.trips = [{ id: uuid(), from: t, to: t, cityId: "paris" }]; const p = calculate(s, NOW).plans.find(p => p.kind === "average"); a.equal(p.cityId, "paris"); a.equal(s.events[0].cityId, "netanya"); });
  test("מקום וזמן", "מעבר קו התאריך מסומן ולא מנוחש", () => { const r = run([event("flow", N(2), "10:00", { cityId: "los-angeles" }), event("note", N(4), "10:00", { cityId: "sydney" })]); a.ok(r.reviews.some(r => r.id === "dateline")); a.equal(r.plans.filter(p => p.kind === "average").length, 0); });
  test("מקום וזמן", "עונת לילה ועונת יום נפגשות בדיוק בזריחה", () => { const x = hd(N(10)).abs(), n = onahWindow(x, "night", city("netanya")), d = onahWindow(x, "day", city("netanya")); a.equal(n.end.toISOString(), d.start.toISOString()); });
  test("מקום וזמן", "רישום בשעת השקיעה מסומן כמסופק; בבחירת ״השעיה״ אינו יוצר מועד ודאי", () => { const d = N(10), s = sun(d, city("netanya")), time = timeInZone(s.sunset, "Asia/Jerusalem"), e = event("flow", d, time); a.ok(stamp(e).uncertain); a.equal(run([e], { beinHashmashot: "flag" }).plans.filter(p => p.kind === "average").length, 0); });
  test("מקום וזמן", "שעה כפולה או חסרה במעבר שעון לא נבחרת בשקט", () => { a.throws(() => localInstant("2026-11-01", "01:30", "America/New_York"), /פעמיים/); a.throws(() => localInstant("2026-03-08", "02:30", "America/New_York"), /אינה קיימת/); });
  test("מקום וזמן", "שעה מקומית רגילה מחושבת נכון בלי תלות באזור הזמן של המכשיר", () => a.equal(localInstant("2026-11-10", "12:00", "America/New_York").toISOString(), "2026-11-10T17:00:00.000Z"));
  test("מקום וזמן", "ביום קוטבי לא ממציאים שקיעה או עונה", () => a.throws(() => stamp({ date: "2026-06-21", time: "12:00", cityId: "tromso" }), /אין זריחה/));
  test("מקום וזמן", "היום העברי מתחלף בשקיעה ולא בחצות", () => { const s = emptyState(), ss = sun("2026-11-10", city("netanya")).sunset; const b = currentContext(s, new Date(ss - 60000)), f = currentContext(s, new Date(ss.valueOf() + 60000)); a.equal(f.abs, b.abs + 1); a.equal(b.date, f.date); });
  test("מקום וזמן", "זמני שמש בירושלים בתקופת תמוז סבירים (±3 דק׳)", () => {
    const s = sun("2026-06-21", city("jerusalem"));
    const mins = d => { const [h, m] = timeInZone(d, "Asia/Jerusalem").split(":").map(Number); return h * 60 + m; };
    a.ok(Math.abs(mins(s.sunrise) - (5 * 60 + 33)) <= 3, "זריחה " + timeInZone(s.sunrise, "Asia/Jerusalem"));
    a.ok(Math.abs(mins(s.sunset) - (19 * 60 + 47)) <= 3, "שקיעה " + timeInZone(s.sunset, "Asia/Jerusalem"));
  });
  test("נתונים", "דחיית תאריך לא קיים, כפילות, נסיעות חופפות ועונה ידנית חסרה", () => {
    const s = emptyState(); a.ok(!safeParse({ ...s, events: [event("flow", "2026-02-30")] }).success);
    const v = event("flow", N(2)); a.ok(!safeParse({ ...s, events: [v, v] }).success);
    a.ok(!safeParse({ ...s, events: [event("manual", N(2))] }).success);
    a.ok(!safeParse({ ...s, trips: [{ id: uuid(), from: "2026-11-01", to: "2026-11-05", cityId: "paris" }, { id: uuid(), from: "2026-11-05", to: "2026-11-08", cityId: "london" }] }).success);
  });
  test("מקום וזמן", "תזכורת בוקר שנופלת בשעה שאינה קיימת עוברת לזריחה ומסומנת", () => {
    const ny = { cityId: "new-york" };
    const r = run([event("flow", "2026-03-01", "10:00", ny), event("hefsek", "2026-03-05", "15:00", ny)], { ...ny, morningTime: "02:30" }, new Date("2026-03-07T16:00:00Z"));
    const m = r.plans.find(p => p.kind === "bedikah" && p.date === "2026-03-08" && p.id.endsWith("-am"));
    a.equal(m?.start, sun("2026-03-08", city("new-york")).sunrise.toISOString()); a.ok(r.reviews.some(x => x.id === "morning-clock-2026-03-08"));
  });
  test("ספקות", "ראייה אחרונה בזמן לא ברור מבטלת מועדים של מחזור קודם", () => {
    const ny = { cityId: "new-york" }, amb = event("flow", "2026-11-01", "01:30", ny);
    const r = run([event("flow", "2026-10-08", "10:00", ny), event("hefsek", "2026-10-12", "15:00", ny), amb], ny, new Date("2026-11-02T16:00:00Z"));
    a.equal(r.phase, "waiting"); a.equal(r.earliestHefsek, undefined); a.equal(r.plans.length, 0); a.ok(r.reviews.some(x => x.eventIds.includes(amb.id)));
  });
  test("ספקות", "ראייה בזמן לא ברור בין שתי ראיות חוסמת הפלגה", () => {
    const ny = { cityId: "new-york" };
    const r = run([event("flow", "2026-10-08", "10:00", ny), event("flow", "2026-11-01", "01:30", ny), event("flow", "2026-11-09", "10:00", ny)], ny);
    a.ok(r.plans.some(p => p.kind === "average")); a.ok(!r.plans.some(p => p.kind === "interval"));
  });

  /* ---------- ביקורת מנוע: באגים שנמצאו ומקרי קצה ---------- */
  const place = (id, name, lat, lon, tz) => ({ id, name, lat, lon, tz });
  const runAt = (events, settings, now, places = [], trips = []) => { const s = emptyState(); s.events = events; s.settings = { ...s.settings, ...settings }; s.places = places; s.trips = trips; return calculate(s, now); };
  test("חב״ד", "הפלגה בעונות נשמרת גם אחרי הטבילה", () => {
    const h = event("hefsek", N(5, 2), "16:00");
    const evs = [event("flow", N(1)), event("hefsek", N(5), "16:00"), event("mikvah", N(12), "21:30"), event("flow", N(1, 2)), h, event("mikvah", N(12, 2), "21:30")];
    const r = run(evs, { haflagah: "chabad-onot" }), p = r.plans.find(p => p.kind === "interval");
    a.equal(r.phase, "immersed"); a.ok(p, "עונת ההפלגה נעלמה אחרי הטבילה"); a.match(p.title, /52/); a.equal(p.date, fromAbs(hd(h.date).abs() + 26)); a.equal(p.onah, "day");
  });
  test("חב״ד", "בלי הפסק אחרי הראייה האחרונה — מסומן שאין עדיין בסיס להפלגה", () => {
    const r = run([event("flow", N(1)), event("hefsek", N(5), "16:00"), event("mikvah", N(12), "21:30"), event("flow", N(1, 2))], { haflagah: "chabad-onot" });
    a.equal(r.plans.filter(p => p.kind === "interval").length, 0); a.ok(r.reviews.some(x => x.id === "chabad-no-current-hefsek"));
  });
  test("מקום וזמן", "קו רוחב גבוה: שקיעה אחרי חצות — רישום לפני השקיעה שייך ליום הקודם", () => {
    const st = stamp({ date: "2026-07-27", time: "00:05", cityId: "tromso" });
    a.equal(st.onah, "day"); a.equal(fromAbs(st.abs), "2026-07-26"); a.ok(!st.uncertain, "שמונה דקות לפני השקיעה");
    const ctx = currentContext({ ...emptyState(), settings: { ...emptyState().settings, cityId: "tromso" } }, localInstant("2026-07-27", "00:05", "Europe/Oslo"));
    a.equal(fromAbs(ctx.abs), "2026-07-26"); a.ok(!ctx.afterSunset);
  });
  test("מקום וזמן", "קו רוחב גבוה: אחרי שקיעה שאחרי חצות ובלי צאת הכוכבים — מסומן כמסופק", () => {
    const st = stamp({ date: "2026-05-17", time: "00:10", cityId: "tromso" });
    a.equal(st.onah, "night"); a.equal(fromAbs(st.abs), "2026-05-17"); a.ok(st.uncertain);
  });
  test("מקום וזמן", "אזור זמן רחוק מקו האורך (סמואה): זמני השמש שייכים לתאריך המקומי", () => {
    const ap = place("gps-0000a001", "אפיה", -13.8333, -171.75, "Pacific/Apia"); M.setPlaces([ap]);
    for (const d of ["2026-01-10", "2026-06-15", "2026-09-30"]) { const s = sun(d, ap); a.equal(M.dateInZone(s.sunrise, ap.tz), d, "זריחה " + d); a.equal(M.dateInZone(s.sunset, ap.tz), d, "שקיעה " + d); }
    const st = stamp({ date: "2026-06-15", time: "15:00", cityId: ap.id }); a.equal(st.onah, "day"); a.equal(fromAbs(st.abs), "2026-06-15");
    const ki = place("gps-0000a002", "קיריטימטי", 1.87, -157.43, "Pacific/Kiritimati"); M.setPlaces([ki]);
    a.equal(M.dateInZone(sun("2026-03-01", ki).sunset, ki.tz), "2026-03-01"); M.setPlaces([]);
  });
  test("שבעה נקיים", "בלונדון בקיץ אין עלות השחר מחושב — בדיקת בוקר אחרי הזריחה עדיין נספרת", () => {
    const L = { cityId: "london" };
    const r = run([event("flow", "2026-06-01", "10:00", L), event("hefsek", "2026-06-06", "16:00", L), event("bedikah", "2026-06-07", "09:00", L), event("bedikah", "2026-06-13", "09:00", L)], L, new Date("2026-06-15T12:00:00Z"));
    a.equal(r.checks[1].length, 1); a.equal(r.checks[7].length, 1); a.ok(!r.reviews.some(x => x.id === "missing-day-1" || x.id === "missing-day-7"));
  });
  test("שבעה נקיים", "בדיקה בימי הספירה שלא נספרה (בלילה) מסומנת לבירור ולא נעלמת בשקט", () => {
    const b = event("bedikah", N(9), "23:00");
    const r = run([event("flow", N(2)), event("hefsek", N(6), "16:00"), b]);
    a.ok(r.reviews.some(x => x.id === `bedikah-outside-${b.id}`));
  });
  test("שבעה נקיים", "ליל טבילה במקום שאין בו צאת הכוכבים מסומן לבירור ולא נעלם בשקט", () => {
    const T2 = { cityId: "tromso" };
    const r = run([event("flow", "2026-05-01", "10:00", T2), event("hefsek", "2026-05-06", "16:00", T2)], T2, new Date("2026-05-08T10:00:00Z"));
    a.equal(r.immersionDate, "2026-05-13"); a.ok(!r.plans.some(p => p.kind === "mikvah")); a.ok(r.reviews.some(x => x.id === "mikvah-no-nightfall"));
  });
  test("הפסק טהרה", "אחרי השקיעה תזכורת ההפסק עוברת ליום הבא ולא נשארת בזמן שעבר", () => {
    const d = N(6), ss = sun(d, city("netanya")).sunset, now = new Date(ss.valueOf() + 30 * 60000);
    const r = run([event("flow", N(2), "10:00")], {}, now), h = r.plans.find(p => p.kind === "hefsek");
    a.equal(h.date, N(7)); a.ok(new Date(h.end) > now);
  });
  test("הפסק טהרה", "ביום ללא שקיעה אין תזכורת הפסק, ומופיעה נקודה לבירור", () => {
    const r = runAt([event("flow", "2026-06-10", "10:00")], {}, new Date("2026-06-12T10:00:00Z"), [], [{ id: uuid(), from: "2026-06-12", to: "2026-06-20", cityId: "tromso" }]);
    a.equal(r.earliestHefsek, "2026-06-14"); a.ok(!r.plans.some(p => p.kind === "hefsek")); a.ok(r.reviews.some(x => x.id === "hefsek-no-sunset"));
  });
  test("טבילה", "טבילה שנרשמה לפני צאת הכוכבים של היום השביעי מסומנת לבירור", () => {
    const early = run([event("flow", N(2)), event("hefsek", N(6), "16:00"), event("mikvah", N(13), "12:00")]);
    a.equal(early.phase, "immersed"); a.ok(early.reviews.some(x => x.id === "mikvah-early"));
    const onTime = run([event("flow", N(2)), event("hefsek", N(6), "16:00"), event("mikvah", N(13), "22:00")]);
    a.ok(!onTime.reviews.some(x => x.id === "mikvah-early"));
  });
  test("טבילה", "ליל טבילה ביום הכיפורים מסומן לבירור", () => {
    const r = run([event("flow", "2026-09-08", "10:00"), event("hefsek", "2026-09-13", "16:00")], {}, new Date("2026-09-15T10:00:00Z"));
    a.equal(r.immersionDate, "2026-09-20"); a.ok(r.reviews.some(x => x.id === "mikvah-night-fast"));
  });
  test("טבילה", "ליל טבילה בליל שבת מסומן לבירור (הכנות לפני כניסת השבת)", () => {
    const r = run([event("flow", "2026-10-18", "10:00"), event("hefsek", "2026-10-23", "16:00")], {}, new Date("2026-10-25T10:00:00Z"));
    a.equal(r.immersionDate, "2026-10-30"); a.ok(r.reviews.some(x => x.id === "mikvah-night-shabbat"));
    const plain = run([event("flow", "2026-10-20", "10:00"), event("hefsek", "2026-10-25", "16:00")], {}, new Date("2026-10-27T10:00:00Z"));
    a.equal(plain.immersionDate, "2026-11-01");
    a.ok(!plain.reviews.some(x => x.id.startsWith("mikvah-night") || x.id.startsWith("mikvah-day")));
  });
  test("טבילה", "יום שביעי בשבת: ההכנות לטבילה במוצאי שבת מסומנות לבירור", () => {
    const r = run([event("flow", "2026-10-19", "10:00"), event("hefsek", "2026-10-24", "16:00")], {}, new Date("2026-10-26T10:00:00Z"));
    a.equal(r.immersionDate, "2026-10-31"); a.ok(r.reviews.some(x => x.id === "mikvah-day-shabbat"));
  });
  test("טבילה", "יום טוב שני בחו״ל מסומן רק מחוץ לארץ ישראל", () => {
    // ז׳ סיון תשפ״ו (חג שבועות שני בחו״ל) — ליל ז׳ סיון הוא ערב 2026-05-22
    const ny = { cityId: "new-york" }, il = run([event("flow", "2026-05-10", "10:00"), event("hefsek", "2026-05-15", "16:00")], {}, new Date("2026-05-17T10:00:00Z"));
    const out = run([event("flow", "2026-05-10", "10:00", ny), event("hefsek", "2026-05-15", "16:00", ny)], ny, new Date("2026-05-17T16:00:00Z"));
    a.equal(out.immersionDate, "2026-05-22"); a.ok(out.reviews.some(x => x.id === "mikvah-night-yomtov")); a.ok(!il.reviews.some(x => x.id === "mikvah-night-yomtov"));
  });
  test("טבילה", "תשעה באב נדחה: ליל י׳ באב מסומן כצום, וליל שבת ט׳ באב אינו מסומן כצום", () => {
    const nidcheh = run([event("flow", "2025-07-21", "10:00"), event("hefsek", "2025-07-26", "16:00")]);
    a.equal(nidcheh.immersionDate, "2025-08-02"); a.ok(nidcheh.reviews.some(x => x.id === "mikvah-night-fast"));
    const fri = run([event("flow", "2025-07-20", "10:00"), event("hefsek", "2025-07-25", "16:00")]);
    a.equal(fri.immersionDate, "2025-08-01"); a.ok(!fri.reviews.some(x => x.id === "mikvah-night-fast")); a.ok(fri.reviews.some(x => x.id === "mikvah-night-shabbat"));
  });
  test("שבעה נקיים", "הפסק בלילה (אחרי חצות ולפני הזריחה) שייך ללילה ואינו מתקבל, כמו הפסק בערב של אותו לילה", () => {
    for (const settings of [{}, { hefsekTwilight: "ovadia" }]) for (const [date, time] of [[N(6), "04:00"], [N(7), "01:00"], [N(6), "21:00"]]) {
      const h = event("hefsek", date, time), r = run([event("flow", N(2)), h], settings);
      a.equal(r.hefsek, undefined, `${date} ${time} ${JSON.stringify(settings)}`); a.ok(r.reviews.some(x => x.id === `hefsek-late-${h.id}`), "מסומן לבירור");
    }
  });
  test("נתונים", "יומן שמור פגום נדחה בשגיאת אימות ולא בקריסה", () => {
    const s = emptyState();
    for (const bad of [{ ...s, places: "x" }, { ...s, trips: [null] }, { ...s, events: [null] }, { ...s, events: {} }, { ...s, settings: null, events: [5] }]) {
      try { M.parseState(bad); fail("התקבל יומן פגום"); } catch (e) { a.ok(e instanceof M.ValidationError, "נזרקה " + e.constructor.name + ": " + e.message); }
    }
  });
  test("נתונים", "ברירת המחדל של רשימת ההכנה אינה משותפת בין יומנים", () => { const x = M.parseState({ schemaVersion: 1 }); a.ok(x.settings.checklist !== M.SETTING_DEFAULTS.checklist); x.settings.checklist.push("x"); a.equal(M.SETTING_DEFAULTS.checklist.length, 0); });
  test("נתונים", "ערכים ריקים (null) ביומן ישן מקבלים ברירת מחדל", () => {
    const e = { ...event("flow", N(2)), note: null, authorityNote: null, result: null, onah: null };
    const x = M.parseState({ schemaVersion: 1, events: [e] }); a.equal(x.events[0].result, "clear"); a.equal(x.events[0].note, ""); a.equal(x.events[0].onah, undefined);
  });
  test("מקום וזמן", "מעבר שעון בישראל ובלונדון: שעה כפולה או חסרה אינה נבחרת בשקט", () => {
    a.throws(() => localInstant("2026-03-27", "02:30", "Asia/Jerusalem"), /אינה קיימת/);
    a.throws(() => localInstant("2026-10-25", "01:30", "Asia/Jerusalem"), /פעמיים/);
    a.throws(() => localInstant("2026-03-29", "01:30", "Europe/London"), /אינה קיימת/);
    a.throws(() => localInstant("2026-10-25", "01:30", "Europe/London"), /פעמיים/);
    a.equal(localInstant("2026-03-27", "03:00", "Asia/Jerusalem").toISOString(), "2026-03-27T00:00:00.000Z");
    a.equal(localInstant("2026-10-25", "02:00", "Asia/Jerusalem").toISOString(), "2026-10-25T00:00:00.000Z");
  });
  test("מקום וזמן", "ראייה ביום מעבר השעון בישראל: העונה לפי השקיעה המקומית", () => {
    const st = stamp(event("flow", "2026-03-27", "18:30")), ss = sun("2026-03-27", city("netanya")).sunset;
    a.equal(st.onah, ss <= localInstant("2026-03-27", "18:30", "Asia/Jerusalem") ? "night" : "day");
    a.equal(timeInZone(ss, "Asia/Jerusalem").slice(0, 2), "18", "שקיעה בשעון קיץ");
  });
  test("עונת החודש", "ל׳ אדר א׳ בשנה מעוברת ← א׳ ניסן (אדר ב׳ חסר)", () => { const p = run([event("flow", N(30, 12, 5784))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(1, 1, 5784)); });
  test("עונת החודש", "ל׳ שבט בשנה מעוברת ← ל׳ אדר א׳", () => { const p = run([event("flow", N(30, 11, 5784))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(30, 12, 5784)); });
  test("עונת החודש", "ל׳ כסלו ← א׳ שבט (טבת תמיד חסר)", () => { const y = [5783, 5784, 5785, 5786].find(y => M.daysInMonth(9, y) === 30); const p = run([event("flow", N(30, 9, y))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(1, 11, y)); });
  test("עונת החודש", "ראייה בלילה: עונת החודש בליל אותו תאריך (הערב הקודם)", () => { const p = run([event("flow", N(9), "22:00")]).plans.find(p => p.kind === "monthly"); a.equal(p.onah, "night"); a.equal(p.date, N(9, 2)); });
  test("עונה בינונית", "יום 31 ביום הנכון ובאותה עונה", () => { const pp = run([event("flow", N(2))], { day31: true }).plans.filter(p => p.kind === "average"); a.deepEqual(pp.map(p => p.date), [N(1, 2), N(2, 2)]); a.ok(pp.every(p => p.onah === "day")); });
  test("הפלגה", "הפלגה החוצה את ראש השנה", () => { const p = run([event("flow", N(20, 6, 5785)), event("flow", N(15, 7, 5786))]).plans.find(p => p.kind === "interval"); a.match(p.title, /25/); a.equal(p.date, N(9, 8, 5786)); });
  test("הפלגה", "שימור הפלגות ארוכות: הפלגה קצרה אינה עוקרת ארוכה", () => {
    const f = [0, 35, 60].map(n => event("flow", addDays(N(1), n)));
    const kept = run(f, { carryLongIntervals: true }).plans.filter(p => p.kind === "interval").map(p => p.title).sort();
    // גם ההפלגה של הראייה הקודמת (36 מהראייה השנייה) עוד לא הגיעה ונשמרת — מקרה הרמ״א קפט, יג
    a.deepEqual(kept, ["הפלגה · 26 ימים", "הפלגה · 36 ימים", "הפלגה נוספת · 36 ימים"].sort());
    a.equal(run(f).plans.filter(p => p.kind === "interval").length, 1);
    const longer = [0, 26, 62].map(n => event("flow", addDays(N(1), n)));
    a.deepEqual(run(longer, { carryLongIntervals: true }).plans.filter(p => p.kind === "interval").map(p => p.title), ["הפלגה · 37 ימים"]);
  });
  test("אור זרוע", "אור זרוע לעונת יום הוא הלילה שלפניה, ולעונת לילה הוא היום שלפניה", () => {
    const pp = run([event("flow", N(2), "22:00")], { orZarua: true }).plans, x = pp.find(p => p.kind === "average"), o = pp.find(p => p.id === `oz-${x.id}`);
    a.equal(x.onah, "night"); a.equal(o.onah, "day"); a.equal(o.date, x.date); a.equal(o.end, x.start);
  });
  test("שבעה נקיים", "ליל הטבילה מתחיל בצאת הכוכבים לפי הזווית שנבחרה", () => {
    for (const nightfall of ["8.5", "7.083"]) { const p = run([event("flow", N(2)), event("hefsek", N(6), "16:00")], { nightfall }).plans.find(p => p.kind === "mikvah"); a.equal(p.start, sun(N(13), city("netanya"), Number(nightfall)).nightfall.toISOString()); }
  });
  test("שבעה נקיים", "הפסק ביום השקיעה עצמו בדקה שלפניה מסומן ולא מתקבל", () => { const d = N(6), t = timeInZone(new Date(sun(d, city("netanya")).sunset - 60000), "Asia/Jerusalem"); const r = run([event("flow", N(2)), event("hefsek", d, t)]); a.equal(r.hefsek, undefined); a.ok(r.reviews.some(x => x.id.startsWith("hefsek-late"))); });
  test("המתנה", "ארבעה ימים מיחסים שקדמו בהרבה: ההפסק לא לפני יום הראייה", () => a.equal(run([event("intimacy", N(1), "10:00"), event("flow", N(20), "10:00")], { wait: "four-from-relations" }).earliestHefsek, N(20)));
  test("לוח עברי", "גבולות שנה ושנים רחוקות: יום אחרי כ״ט אלול הוא א׳ תשרי", () => {
    for (const y of [5760, 5800, 5860]) { const last = new HDate(29, 6, y), next = new HDate(last.abs() + 1); a.equal(next.getMonth(), 7); a.equal(next.getDate(), 1); a.equal(next.getFullYear(), y + 1); }
  });

  /* ---------- שיטות חישוב, בין השמשות והמתנת ארבעה ימים ---------- */
  const minutesAfterSunset = (d, m) => timeInZone(new Date(sun(d, city("netanya")).sunset.valueOf() + m * 60000), "Asia/Jerusalem");
  const avg = r => r.plans.filter(p => p.kind === "average").map(p => `${p.date}|${p.onah}`).sort();
  test("המתנה", "ארבעה ימים מתחילת הראייה (הרב עובדיה): ראתה בליל שני — הפסק ביום חמישי", () => {
    // 2026-11-01 הוא יום ראשון; ראייה בערב 21:00 שייכת לליל שני
    const r = run([event("flow", "2026-11-01", "21:00")], { wait: "four" }, new Date("2026-11-02T10:00:00Z"));
    a.equal(r.earliestHefsek, "2026-11-05");
    const day = run([event("flow", "2026-11-02", "10:00")], { wait: "four" }, new Date("2026-11-02T12:00:00Z"));
    a.equal(day.earliestHefsek, "2026-11-05", "ראייה ביום שני — גם כן הפסק ביום חמישי");
    a.equal(run([event("flow", "2026-11-02", "10:00")], {}, new Date("2026-11-02T12:00:00Z")).earliestHefsek, "2026-11-06", "חמישה ימים — יום שישי");
  });
  test("בין השמשות", "ראייה בין השקיעה לצאת הכוכבים: חוששים לשתי העונות בעונה בינונית ובעונת החודש", () => {
    const d = N(10), e = event("flow", d, minutesAfterSunset(d, 10)), r = run([e]);
    a.ok(stamp(e).twilight); a.equal(stamp(e).onah, "night");
    a.deepEqual(avg(r), [`${N(9, 2)}|day`, `${N(9, 2)}|night`].sort(), "יום 30 נספר משני הימים: עונת היום של י׳ ועונת הלילה של י״א");
    const m = r.plans.filter(p => p.kind === "monthly").map(p => `${p.date}|${p.onah}`).sort();
    a.deepEqual(m, [`${N(10, 2)}|day`, `${N(10, 2)}|night`].sort());
    a.equal(r.earliestHefsek, N(15), "ההמתנה נספרת מהלילה (היום העברי המאוחר)");
    a.ok(r.reviews.some(x => x.id === `boundary-${e.id}`), "נשאר סימון לבירור");
  });
  test("בין השמשות", "ראייה בדקות שלפני השקיעה: לחומרא גם עונת הלילה, וההמתנה מהיום המאוחר", () => {
    const d = N(10), e = event("flow", d, minutesAfterSunset(d, -2)), r = run([e]);
    a.equal(stamp(e).onah, "day"); a.ok(!stamp(e).twilight); a.ok(stamp(e).alt);
    a.deepEqual(avg(r), [`${N(9, 2)}|day`, `${N(9, 2)}|night`].sort());
    a.equal(r.earliestHefsek, N(15));
  });
  test("בין השמשות", "הגדרת ״השעיה״ שומרת על ההתנהגות הקודמת: אין מועדים ואין המתנה מחושבת", () => {
    const d = N(10), r = run([event("flow", d, minutesAfterSunset(d, 10))], { beinHashmashot: "flag" });
    a.equal(r.plans.length, 0); a.equal(r.earliestHefsek, undefined);
  });
  test("בין השמשות", "צאת הכוכבים לפי 13.5 דקות זמניות: 20 דקות אחרי השקיעה כבר לילה ודאי", () => {
    const d = N(10), e = event("flow", d, minutesAfterSunset(d, 20));
    a.ok(stamp(e).twilight, "לפי 8.5° עדיין בין השמשות");
    const st = stamp(e, "13.5z"); a.ok(!st.twilight && !st.uncertain);
    a.deepEqual(avg(run([e], { nightfall: "13.5z" })), [`${N(9, 2)}|night`]);
  });
  test("בין השמשות", "הפלגה כשהראייה האחרונה בין השמשות: נשמרות שתי העונות", () => {
    const d = N(30), r = run([event("flow", N(2)), event("flow", d, minutesAfterSunset(d, 10))]);
    const iv = r.plans.filter(p => p.kind === "interval");
    a.ok(iv.length >= 2, "יותר ממועד הפלגה אחד"); a.ok(iv.some(p => p.onah === "day") && iv.some(p => p.onah === "night"));
    a.ok(iv.some(p => p.date === N(28, 2) && p.onah === "day"), "הפלגת 29 מעונת היום");
  });
  test("בין השמשות", "חב״ד: ראייה בין השמשות מוסיפה את מספר העונות הסמוך", () => {
    // ההמתנה נספרת מהיום המאוחר (ב׳ אייר), ולכן ההפסק בו׳ אייר
    const h = event("hefsek", N(6, 2), "16:00"), d = N(1, 2);
    const r = run([event("flow", N(1)), event("hefsek", N(5), "16:00"), event("flow", d, minutesAfterSunset(d, 10)), h], { haflagah: "chabad-onot" });
    const t = r.plans.filter(p => p.kind === "interval").map(p => p.title).sort(); a.ok(t.some(x => /52/.test(x)) && t.some(x => /53/.test(x)), t.join());
  });
  test("הפסק טהרה", "הפסק אחרי השקיעה: באשכנז אינו תקף, ולפי הרב עובדיה תקף בדיעבד עד 13.5 דקות זמניות", () => {
    const d = N(6), late = event("hefsek", d, minutesAfterSunset(d, 8)), flow = event("flow", N(2));
    a.equal(run([flow, late]).hefsek, undefined);
    const ov = run([flow, late], { hefsekTwilight: "ovadia" });
    a.equal(ov.hefsek?.id, late.id); a.equal(ov.immersionDate, N(13), "היום הראשון הוא למחרת יום ההפסק"); a.ok(ov.reviews.some(x => x.id === `hefsek-bedieved-${late.id}`));
    const tooLate = event("hefsek", d, minutesAfterSunset(d, 25));
    a.equal(run([flow, tooLate], { hefsekTwilight: "ovadia" }).hefsek, undefined);
  });
  test("צאת הכוכבים", "צאת הכוכבים בדקות קבועות ובדקות זמניות", () => {
    const c = city("netanya"), d = "2026-06-21", base = sun(d, c), z = sun(d, c, "13.5z").nightfall, m = sun(d, c, "20m").nightfall;
    const dayLen = (base.sunset - base.sunrise) / 60000;
    a.ok(Math.abs((z - base.sunset) / 60000 - 13.5 * dayLen / 720) <= 1.2, "13.5 דקות זמניות"); a.ok((z - base.sunset) / 60000 > 15, "בקיץ יותר מ-13.5 דקות שעון");
    a.ok(Math.abs((m - base.sunset) / 60000 - 20) <= 1.1);
    const p = run([event("flow", N(2)), event("hefsek", N(6), "16:00")], { nightfall: "18m" }).plans.find(p => p.kind === "mikvah");
    a.equal(p.start, sun(N(13), c, "18m").nightfall.toISOString());
  });
  test("אור זרוע", "בשמירת ימים 30 ו-31 אור זרוע רק ליום 30", () => {
    const pp = run([event("flow", N(2))], { day31: true, orZarua: true }).plans.filter(p => p.kind === "or-zarua" && p.id.startsWith("oz-average"));
    a.equal(pp.length, 1); a.ok(pp[0].id.includes("-30-"));
  });
  test("שיטות", "שיטה מוגדרת מראש קובעת את כל ההגדרות ועוברת אימות", () => {
    for (const [k, preset] of Object.entries(M.METHOD_PRESETS)) {
      const s = emptyState(); s.settings = { ...s.settings, ...preset.settings, method: k };
      const parsed = M.parseState(s); a.equal(parsed.settings.method, k); a.deepEqual(M.presetDiff(parsed.settings), [], k);
      a.ok(preset.notes.length >= 5 && preset.notes.every(n => n.t && "src" in n), "לכל ערך מקור");
    }
    const sef = M.METHOD_PRESETS.sefard.settings; a.equal(sef.wait, "four"); a.equal(sef.orZarua, false); a.equal(sef.day31, false); a.equal(sef.hefsekTwilight, "ovadia");
    const ash = M.METHOD_PRESETS.ashkenaz.settings; a.equal(ash.wait, "five"); a.equal(ash.hefsekTwilight, "before-sunset");
    a.equal(M.METHOD_PRESETS.chabad.settings.haflagah, "chabad-onot"); a.equal(M.METHOD_PRESETS.chabad.settings.beinonit, "both");
    a.deepEqual(M.presetDiff({ ...emptyState().settings, ...ash, method: "ashkenaz", day31: !ash.day31 }), ["day31"]);
    a.deepEqual(M.presetDiff({ ...emptyState().settings, method: "custom" }), []);
  });
  const P = M.METHOD_PRESETS, presetState = (pk, events) => { const s = emptyState(); s.settings = M.applyPreset({ ...s.settings, cityId: "jerusalem" }, pk); s.events = events; return M.parseState(s); };
  test("שיטות", "הרב עובדיה יוסף (ספרדי): ארבעה ימים, בלי אור זרוע, הפלגה ארוכה נעקרת מיד", () => {
    const s = P.sefard.settings;
    a.deepEqual([s.wait, s.beinonit, s.day31, s.orZarua, s.carryLongIntervals, s.nightfall, s.hefsekTwilight, s.beinHashmashot], ["four", "same", false, false, false, "20m", "ovadia", "both"]);
    a.equal(P.sefard.label, "הרב עובדיה יוסף (ספרדי)"); a.equal(P.sefard.family, "sefard");
  });
  test("שיטות", "בן איש חי (ספרדי): כמו הרב עובדיה, ועם אור זרוע", () => {
    const s = P["sefard-bic"].settings, diff = Object.keys(s).filter(k => s[k] !== P.sefard.settings[k]);
    a.deepEqual(diff, ["orZarua"]); a.equal(s.orZarua, true); a.equal(P["sefard-bic"].family, "sefard");
    a.ok(P["sefard-bic"].notes.find(n => n.k === "orZarua").src.includes("bic_tzav1b")); a.ok(M.cite("bic_tzav1b").ok, "הציטוט אומת בספריא");
  });
  test("שיטות", "אשכנזי רגיל: חמישה ימים, עונה אחת בימים 30 ו-31, אור זרוע, בלי שימור הפלגות", () => {
    const s = P.ashkenaz.settings;
    a.deepEqual([s.wait, s.haflagah, s.beinonit, s.day31, s.orZarua, s.carryLongIntervals, s.nightfall, s.hefsekTwilight, s.beinHashmashot, s.missingMonthly, s.bedikot, s.carryMonthly], ["five", "days", "same", true, true, false, "8.5", "before-sunset", "both", "first-next-month", "twice", false]);
    a.equal(P.ashkenaz.label, "אשכנזי רגיל"); a.equal(P.ashkenaz.name, "אשכנזי רגיל"); a.equal(P["ashkenaz-kreiti"].name, "יממה שלמה (כרתי ופלתי)"); a.ok(P.ashkenaz.notes.find(n => n.k === "orZarua").ask, "אור זרוע מסומן לבירור");
    a.ok(P.ashkenaz.notes.find(n => n.k === "orZarua").src.includes("taz184_2"), "הט״ז החולק מובא");
  });
  test("שיטות", "יממה שלמה (כרתי ופלתי): נבדלת מהרגיל רק ביממה שלמה ובשימור הפלגה ארוכה", () => {
    const s = P["ashkenaz-kreiti"].settings, diff = Object.keys(s).filter(k => s[k] !== P.ashkenaz.settings[k]).sort();
    a.deepEqual(diff, ["beinonit", "carryLongIntervals"]); a.equal(s.beinonit, "both"); a.equal(s.day31, true); a.equal(s.carryLongIntervals, true);
    a.ok(P["ashkenaz-kreiti"].notes.find(n => n.k === "beinonit").src.includes("sahr189_1f"), "כרתי ופלתי דרך שו״ע הרב");
  });
  test("שיטות", "חב״ד נשארה כפי שהייתה", () => {
    a.deepEqual(P.chabad.settings, { wait: "five", haflagah: "chabad-onot", beinonit: "both", day31: false, orZarua: false, carryLongIntervals: true, carryMonthly: false, missingMonthly: "first-next-month", bedikot: "twice", nightfall: "8.5", beinHashmashot: "both", hefsekTwilight: "before-sunset" });
  });
  test("שיטות", "בחירה בשני שלבים: כל שיטה שייכת למנהג אחד", () => {
    a.deepEqual(M.METHOD_FAMILIES.map(f => f.id), ["sefard", "ashkenaz", "chabad"]);
    a.deepEqual(M.METHOD_FAMILIES.flatMap(f => f.methods).sort(), Object.keys(P).sort());
    for (const f of M.METHOD_FAMILIES) for (const m of f.methods) a.equal(M.methodFamily(m), f.id);
    a.equal(M.methodFamily("custom"), "");
  });
  test("שיטות", "applyPreset קובע את כל ערכי השיטה ושומר הגדרות אחרות", () => {
    const base = { ...emptyState().settings, cityId: "haifa", methodNote: "הרב פלוני", reminderMinutes: 45, wait: "four-from-relations", orZarua: false };
    for (const pk of Object.keys(P)) {
      const s = M.applyPreset(base, pk);
      a.equal(s.method, pk); a.deepEqual(M.presetDiff(s), [], pk); a.equal(s.cityId, "haifa"); a.equal(s.methodNote, "הרב פלוני"); a.equal(s.reminderMinutes, 45);
      a.equal(M.parseState({ ...emptyState(), settings: s }).settings.method, pk, "parseState מקבל את המזהה");
    }
    a.equal(M.applyPreset(base, "no-such").method, "custom");
    a.equal(M.applyPreset(M.applyPreset(base, "ashkenaz-kreiti"), "ashkenaz").beinonit, "same", "מעבר בין שיטות מחזיר את הערכים");
  });
  test("שיטות", "יומן ישן עם ״ashkenaz״ שומר את ערכיו, והשם מתחלף ל״אשכנזי רגיל״", () => {
    // ערכי ״מנהג אשכנז הרווח״ כפי שנשמרו בגרסת מנוע 0.3.0
    const old = { wait: "five", haflagah: "days", beinonit: "same", day31: true, orZarua: true, carryLongIntervals: true, carryMonthly: false, missingMonthly: "first-next-month", bedikot: "twice", nightfall: "8.5", beinHashmashot: "both", hefsekTwilight: "before-sunset" };
    const s = emptyState(); s.settings = { ...s.settings, ...old, method: "ashkenaz" };
    const p = M.parseState(JSON.parse(JSON.stringify(s)));
    for (const [k, v] of Object.entries(old)) a.equal(p.settings[k], v, `${k} נשמר`);
    a.equal(p.settings.method, "ashkenaz"); a.deepEqual(M.presetDiff(p.settings), ["carryLongIntervals"]);
    a.match(M.settingsSummary(p.settings)[0], /^המנהג שלי: אשכנזי רגיל \(עם שינויים\)$/);
    const old2 = M.parseState({ ...s, settings: { ...s.settings, method: "sefard", wait: "four", nightfall: "20m", hefsekTwilight: "ovadia", orZarua: false, day31: false, carryLongIntervals: true } });
    a.deepEqual(M.presetDiff(old2.settings), ["carryLongIntervals"], "יומן ספרדי ישן: רק השימור שונה");
  });
  test("שיטות", "כרתי ופלתי: מעת לעת שלם ביום 30 וביום 31 (מהשקיעה עד השקיעה)", () => {
    for (const time of ["10:00", "22:00"]) {
      const flow = event("flow", N(2), time, { cityId: "jerusalem" }), st = presetState("ashkenaz-kreiti", [flow]);
      const r = calculate(st, NOW), see = M.stamp(flow, st.settings.nightfall).abs, J = city("jerusalem");
      for (const day of [30, 31]) {
        const abs = see + day - 1, av = r.plans.filter(p => p.kind === "average" && p.id.includes(`-${day}-`));
        a.deepEqual(av.map(p => p.onah).sort(), ["day", "night"], `יום ${day}: לילה ויום`);
        const civil = fromAbs(abs), prev = sun(addDays(civil, -1), J), cur = sun(civil, J);
        const night = av.find(p => p.onah === "night"), dayP = av.find(p => p.onah === "day");
        a.equal(night.start, prev.sunset.toISOString(), `יום ${day} מתחיל בשקיעה שלפניו`); a.equal(night.end, dayP.start, "הלילה והיום רצופים");
        a.equal(dayP.end, cur.sunset.toISOString(), `יום ${day} מסתיים בשקיעה`);
        const hours = (new Date(dayP.end) - new Date(night.start)) / 3600000; a.ok(hours > 23.9 && hours < 24.1, `${hours} שעות`);
      }
    }
    const one = calculate(presetState("ashkenaz", [event("flow", N(2), "10:00", { cityId: "jerusalem" })]), NOW).plans.filter(p => p.kind === "average");
    a.deepEqual(one.map(p => `${p.id.match(/-(3[01])-/)[1]}:${p.onah}`), ["30:day", "31:day"], "באשכנזי רגיל: עונה אחת (עונת הראייה) בימים 30 ו-31");
  });
  test("שיטות", "אור זרוע: יש בבן איש חי, אין בשיטת הרב עובדיה", () => {
    const flow = event("flow", N(2), "10:00", { cityId: "jerusalem" }), evs = () => [flow];
    const bic = calculate(presetState("sefard-bic", evs()), NOW).plans, ov = calculate(presetState("sefard", evs()), NOW).plans;
    a.ok(bic.some(p => p.kind === "or-zarua" && p.id.startsWith("oz-average")), "בן איש חי: אור זרוע לפני העונה הבינונית");
    a.ok(bic.some(p => p.kind === "or-zarua" && p.id.startsWith("oz-monthly")), "בן איש חי: אור זרוע לפני עונת החודש");
    a.equal(ov.filter(p => p.kind === "or-zarua").length, 0, "הרב עובדיה: אין אור זרוע");
    const strip = ps => ps.filter(p => p.kind !== "or-zarua").map(p => p.id).sort().join();
    a.equal(strip(bic), strip(ov), "מלבד אור זרוע — אותם מועדים");
  });
  test("שיטות", "אשכנזי רגיל: הפלגה ארוכה נעקרת מיד; בכרתי ופלתי נשמרת", () => {
    const evs = () => [event("flow", N(1, 1)), event("flow", N(6, 2)), event("flow", N(27, 2))];
    const ints = pk => calculate(presetState(pk, evs()), NOW).plans.filter(p => p.kind === "interval").map(p => p.title).sort();
    a.deepEqual(ints("ashkenaz"), ["הפלגה · 22 ימים"]); a.deepEqual(ints("sefard"), ["הפלגה · 22 ימים"]);
    a.deepEqual(ints("ashkenaz-kreiti"), ["הפלגה · 22 ימים", "הפלגה · 36 ימים", "הפלגה נוספת · 36 ימים"]);
  });
  test("שיטות", "מקרה הרמ״א (קפט, יג): א׳ ניסן, כ׳ ניסן, א׳ אייר — ט׳ אייר רק בכרתי ופלתי", () => {
    const evs = [event("flow", N(1, 1)), event("flow", N(20, 1)), event("flow", N(1, 2))], t9 = N(9, 2);
    const at = pk => calculate(presetState(pk, evs), NOW).plans.filter(p => p.kind === "interval" && p.date === t9 && p.onah === "day");
    const kr = at("ashkenaz-kreiti"); a.equal(kr.length, 1, "כרתי ופלתי חוששת לט׳ אייר"); a.match(kr[0].title, /הפלגה נוספת · 20 ימים/);
    a.deepEqual(kr[0].eventIds, [evs[0].id, evs[1].id], "המרווח שקדם לראיית כ׳ ניסן");
    for (const pk of ["ashkenaz", "sefard", "sefard-bic"]) a.equal(at(pk).length, 0, `${pk}: אין חשש בט׳ אייר`);
    const oz = calculate(presetState("ashkenaz-kreiti", evs), NOW).plans.some(p => p.kind === "or-zarua" && p.date === N(8, 2) && p.onah === "night");
    a.ok(oz, "אור זרוע לפני ההפלגה הנוספת");
    // הפלגה ארוכה או שווה אחריה עוקרת: א׳ ניסן, כ׳ ניסן (20), י׳ אייר (21) — אין ט׳ אייר (כבר עבר) ואין הפלגה נוספת
    const r2 = calculate(presetState("ashkenaz-kreiti", [event("flow", N(1, 1)), event("flow", N(20, 1)), event("flow", N(10, 2))]), NOW);
    a.ok(!r2.plans.some(p => /הפלגה נוספת/.test(p.title)), "מועד שעבר אינו נשמר");
  });
  test("שיטות", "יומן ישן בלי ההגדרות החדשות נטען עם ברירות המחדל", () => {
    const s = emptyState(); delete s.settings.beinHashmashot; delete s.settings.hefsekTwilight; delete s.settings.method;
    const p = M.parseState(s); a.equal(p.settings.method, "custom"); a.equal(p.settings.beinHashmashot, "both"); a.equal(p.settings.hefsekTwilight, "before-sunset");
  });
  test("נתונים", "יומן שנשמר בגרסה 1.0.0 (בלי מקומות, שיטה, בין השמשות ווידג׳ט) נטען ומחושב", () => {
    // המבנה המדויק שגרסה 1.0.0 שמרה ב-maayan.v1.diary
    const v1 = { schemaVersion: 1, settings: { cityId: "jerusalem", wait: "five", haflagah: "days", beinonit: "same", day31: false, orZarua: false, carryMonthly: false, carryLongIntervals: false, missingMonthly: "skip", bedikot: "twice", nightfall: "8.5", special: "regular", methodNote: "", neutralReminders: true, reminderMinutes: 30, morningTime: "08:00", remindersEnabled: true, checklist: ["רחצה וחפיפה"] },
      events: [event("flow", N(1), "10:00", { cityId: "jerusalem" }), event("hefsek", N(5), "15:00", { cityId: "jerusalem" })], trips: [] };
    const p = M.parseState(JSON.parse(JSON.stringify(v1)));
    a.deepEqual(p.places, []); a.equal(p.settings.method, "custom"); a.equal(p.settings.beinHashmashot, "both"); a.equal(p.settings.hefsekTwilight, "before-sunset");
    a.equal(p.settings.missingMonthly, "skip", "בחירה קיימת נשמרת"); a.equal(p.settings.widgetEnabled, undefined, "הווידג׳ט נשאר כבוי");
    a.equal(p.events.length, 2); a.deepEqual(M.presetDiff ? typeof M.presetDiff(p.settings) : "object", "object");
    const r = calculate(p, new Date(new HDate(8, 1, 5785).greg().toISOString().slice(0, 10) + "T09:00:00Z"));
    a.equal(r.phase, "clean"); a.ok(r.plans.length > 0, "יש מועדים");
    a.deepEqual(M.parseState(JSON.parse(JSON.stringify(p))), p, "שמירה וטעינה חוזרת יציבות");
  });
  test("מקום וזמן", "חישוב שעה מקומית חוזר נותן תוצאה זהה ועצמאית, גם במעבר שעון", () => {
    const x = localInstant("2026-11-20", "10:00", "Asia/Jerusalem"), y = localInstant("2026-11-20", "10:00", "Asia/Jerusalem");
    a.equal(x.toISOString(), "2026-11-20T08:00:00.000Z"); a.ok(x !== y, "אובייקט חדש בכל קריאה");
    x.setTime(0); a.equal(localInstant("2026-11-20", "10:00", "Asia/Jerusalem").toISOString(), "2026-11-20T08:00:00.000Z", "שינוי תוצאה קודמת אינו משפיע");
    for (let i = 0; i < 2; i++) { a.throws(() => localInstant("2026-03-27", "02:30", "Asia/Jerusalem"), /אינה קיימת/); a.throws(() => localInstant("2026-10-25", "01:30", "Asia/Jerusalem"), /פעמיים/); }
  });
  test("שבעה נקיים", "בדיקה דקה אחרי הזריחה נספרת (חלון הבדיקה מתחיל בעלות השחר)", () => {
    const d = N(7), sr = sun(d, city("netanya")).sunrise, t = timeInZone(new Date(sr.valueOf() + 60000), "Asia/Jerusalem");
    const b = event("bedikah", d, t), r = run([event("flow", N(2)), event("hefsek", N(6), "16:00"), b]);
    a.equal(r.checks[1].length, 1, "נספרה ביום 1"); a.ok(!r.reviews.some(x => x.id === `boundary-${b.id}`), "לא מסומנת כסמוכה לגבול");
    const late = event("bedikah", d, timeInZone(new Date(sun(d, city("netanya")).sunset.valueOf() - 60000), "Asia/Jerusalem"));
    a.equal(run([event("flow", N(2)), event("hefsek", N(6), "16:00"), late]).checks[1].length, 0, "סמוך לשקיעה עדיין לא נספרת");
  });
  test("טבילה", "לילה קוטבי (טרומסה בדצמבר): בלי שקיעה אין ליל טבילה מתוכנן, ומופיע סימון", () => {
    const r = runAt([event("flow", "2026-12-01", "10:00"), event("hefsek", "2026-12-05", "16:00")], {}, new Date("2026-12-08T10:00:00Z"), [], [{ id: uuid(), from: "2026-12-07", to: "2026-12-20", cityId: "tromso" }]);
    a.equal(r.immersionDate, "2026-12-12"); a.ok(!r.plans.some(p => p.kind === "mikvah"), "אין טבילה בצהריים"); a.ok(r.reviews.some(x => x.id === "mikvah-no-nightfall"));
  });
  test("שבעה נקיים", "בדיקה חסרה בכל אחד מימי הספירה מסומנת כשהיום הסתיים, והיום השביעי כבר בשקיעתו", () => {
    const evs = [event("flow", N(2)), event("hefsek", N(6), "16:00"), event("bedikah", N(7)), event("bedikah", N(8))];
    const day3end = sun(N(9), city("netanya")).sunset, mid3 = new Date(day3end.valueOf() - 3600000);
    a.ok(!run(evs, {}, mid3).reviews.some(x => x.id === "missing-day-3"), "יום 3 עוד לא הסתיים");
    a.ok(run(evs, {}, new Date(day3end.valueOf() + 60000)).reviews.some(x => x.id === "missing-day-3"), "יום 3 הסתיים");
    a.ok(!run(evs, { bedikot: "first-last" }, new Date(day3end.valueOf() + 60000)).reviews.some(x => x.id === "missing-day-3"), "בראשון ושביעי אין חובה ביום 3");
    const ss7 = sun(N(13), city("netanya")).sunset;
    a.ok(!run(evs, {}, new Date(ss7.valueOf() - 60000)).reviews.some(x => x.id === "missing-day-7"));
    a.ok(run(evs, {}, new Date(ss7.valueOf() + 60000)).reviews.some(x => x.id === "missing-day-7"), "בליל הטבילה עצמו");
  });
  test("הפסק טהרה", "לפי הרב עובדיה, הפסק סמוך לזריחה אינו מקבל את נוסח ״אחרי השקיעה, בדיעבד״", () => {
    const d = N(6), sr = sun(d, city("netanya")).sunrise, h = event("hefsek", d, timeInZone(new Date(sr.valueOf() + 60000), "Asia/Jerusalem"));
    const r = run([event("flow", N(2)), h], { hefsekTwilight: "ovadia" });
    a.ok(!r.reviews.some(x => x.id === `hefsek-bedieved-${h.id}`));
  });
  test("מקום וזמן", "הזריחה מעוגלת לדקה כלפי מעלה (סוף עונת הלילה לחומרא), כמו השקיעה כלפי מטה", () => {
    for (const d of ["2026-01-10", "2026-04-02", "2026-07-15", "2026-10-20"]) for (const id of ["netanya", "london", "new-york"]) {
      const s = sun(d, city(id)); a.equal(s.sunrise.valueOf() % 60000, 0, `${d} ${id}`); a.equal(s.sunset.valueOf() % 60000, 0);
      const n = onahWindow(M.isoAbs(d), "night", city(id)); a.equal(n.end.valueOf() % 60000, 0);
    }
  });
  test("שבעה נקיים", "בוקר וערב לפי חצות היום ולא לפי 12:00 בשעון", () => {
    const J = { cityId: "jerusalem" }, d = "2026-07-13", s = sun(d, city("jerusalem")), chatzot = new Date((s.sunrise.valueOf() + s.sunset.valueOf()) / 2);
    a.ok(timeInZone(chatzot, "Asia/Jerusalem") > "12:30", "בקיץ חצות אחרי 12:30");
    const r = run([event("flow", "2026-07-05", "10:00", J), event("hefsek", "2026-07-09", "16:00", J), event("bedikah", d, "12:10", J)], J, new Date("2026-07-18T09:00:00Z"));
    const am = r.plans.find(p => p.kind === "bedikah" && p.day === 4 && /-am$/.test(p.id)), pm = r.plans.find(p => p.kind === "bedikah" && p.day === 4 && /-pm$/.test(p.id));
    a.ok(am.done, "12:10 לפני חצות = בוקר"); a.ok(!pm.done, "בדיקת הערב עוד לא נרשמה");
  });

  /* ---------- ״יש לשאול רב״: שאלות פתוחות מסומנות כשהמצב נוצר, והחישוב נשאר לחומרא ---------- */
  const rv = (r, id) => r.reviews.find(x => x.id === id);
  const askOk = (v, ids) => {
    a.ok(v, "הסימון קיים"); a.ok(v.ask, "מסומן כשאלה לרב"); a.equal(v.title, "יש לשאול רב"); a.ok(v.topic, "שם השאלה למסמכי הרב");
    a.ok(v.situation && v.meanwhile, "משפט על המצב ומשפט על מה שנעשה בינתיים"); a.match(v.meanwhile, /^בינתיים מעיין /, "הפירוט אומר מה מעיין עושה בינתיים");
    a.equal(v.detail, `${v.situation} ${v.meanwhile}`);
    a.ok(!/משני|רמ״א|ט״ז|ב״ח|ש״ך|ערוך השולחן|לא אומת|⚠/.test(v.detail), "בלי מקורות ושמות דעות בטקסט לאפליקציה");
    a.ok(Array.isArray(v.source) && v.source.length && v.source.every(id => M.cite(id)), "מקורות מתוך CITES");
    for (const id of ids || []) a.ok(v.source.includes(id), `המקור ${id}`);
  };
  test("יש לשאול רב", "ל׳ בחודש והחודש הבא חסר: ask-30-short, ובינתיים חוששת לא׳ בחודש שאחריו", () => {
    const f = event("flow", N(30, 1)), r = run([f]);
    const v = rv(r, "ask-30-short"); askOk(v, ["aruch189_12", "missing30", "secHeichal"]);
    a.deepEqual(v.eventIds, [f.id]); a.match(v.detail, /א׳ סיון/);
    a.ok(r.plans.some(p => p.kind === "monthly" && p.date === N(1, 3)), "החישוב לחומרא נשאר: א׳ סיון");
    a.ok(!rv(run([event("flow", N(29, 1))]), "ask-30-short"), "כ״ט ניסן — אין סימון");
    a.ok(!rv(run([event("flow", N(15, 1))]), "ask-30-short"), "ט״ו ניסן — אין סימון");
    a.ok(!rv(run([event("flow", N(30, 1)), event("flow", N(25, 2))]), "ask-30-short"), "רק כשהראייה האחרונה בל׳");
  });
  test("עונת החודש", "ל׳ בחודש והחודש הבא מלא: חוששת רק לל׳ בחודש הבא, בלי ״יש לשאול רב״ (הוכרע: כמו כל הלוחות)", () => {
    // תשפ״ד מעוברת: אחרי ל׳ שבט בא אדר א׳ מלא (ראש חודש אדר ב׳ שני ימים)
    const f = event("flow", N(30, 11, 5784));
    for (const settings of [{}, ...["ashkenaz", "ashkenaz-kreiti", "sefard", "sefard-bic", "chabad"].map(pk => M.applyPreset(emptyState().settings, pk))]) {
      const r = run([f], settings);
      a.deepEqual(r.plans.filter(p => p.kind === "monthly").map(p => p.date), [N(30, 12, 5784)], `עונת החודש רק בל׳ אדר א׳ (${settings.method || "ברירת מחדל"})`);
      a.ok(!r.reviews.some(x => /^ask-30/.test(x.id)), "אין סימון לבירור");
    }
  });
  test("יש לשאול רב", "הפלגה ארוכה של ראייה קודמת שנעקרה (מקרה הרמ״א): ask-uprooted-haflagah בלי שימור, עם התאריך", () => {
    const evs = [event("flow", N(1, 1)), event("flow", N(20, 1)), event("flow", N(1, 2))];
    for (const pk of ["ashkenaz", "sefard", "sefard-bic"]) {
      const r = calculate(presetState(pk, evs), NOW), v = rv(r, "ask-uprooted-haflagah");
      askOk(v, ["rema189_13", "shach189_31"]); a.match(v.detail, /ט׳ אייר/, `${pk}: התאריך שהרמ״א מוסיף`);
      a.ok(!r.plans.some(p => p.kind === "interval" && p.date === N(9, 2)), `${pk}: החישוב לא השתנה`);
      a.ok(v.eventIds.includes(evs[1].id));
    }
    a.ok(!rv(calculate(presetState("ashkenaz-kreiti", evs), NOW), "ask-uprooted-haflagah"), "בכרתי ופלתי ההפלגה נשמרת — אין סימון");
    a.ok(!rv(calculate(presetState("ashkenaz", [event("flow", N(1, 1)), event("flow", N(20, 1)), event("flow", N(10, 2))]), NOW), "ask-uprooted-haflagah"), "הפלגה ארוכה יותר אחריה — אין סימון");
    a.ok(!rv(calculate(presetState("ashkenaz", [event("flow", N(1, 1)), event("flow", N(20, 1))]), NOW), "ask-uprooted-haflagah"), "שתי ראיות — אין סימון");
    // הפלגה ארוכה שנעקרה (36 ← 22): התאריך מחושב כמו בשימור של כרתי ופלתי
    const r2 = calculate(presetState("ashkenaz", [event("flow", N(1, 1)), event("flow", N(6, 2)), event("flow", N(27, 2))]), NOW);
    const kr = calculate(presetState("ashkenaz-kreiti", [event("flow", N(1, 1)), event("flow", N(6, 2)), event("flow", N(27, 2))]), NOW).plans.filter(p => /36/.test(p.title) && p.kind === "interval");
    const v2 = rv(r2, "ask-uprooted-haflagah"); askOk(v2);
    for (const p of kr) a.ok(v2.detail.includes(M.hebrew(p.date).split(" ").slice(0, -1).join(" ")), `התאריך ${M.hebrew(p.date)} בפירוט`);
  });
  test("יש לשאול רב", "נמצא בהתעוררות: שתי העונות של אותו יום, ההמתנה מהיום המאוחר, ו-ask-waking", () => {
    const d = N(10), plain = event("flow", d, "07:30"), wake = event("flow", d, "07:30", { foundOnWaking: true });
    a.equal(stamp(wake).onah, "day");
    const r0 = run([plain]), r = run([wake]);
    a.deepEqual([...new Set(r0.plans.filter(p => p.kind === "average").map(p => p.onah))], ["day"], "בלי הסימון — עונה אחת");
    const av = r.plans.filter(p => p.kind === "average");
    a.deepEqual(av.map(p => p.onah).sort(), ["day", "night"], "עם הסימון — לילה ויום");
    a.deepEqual([...new Set(av.map(p => p.onah === "day" ? p.date : addDays(p.date, 1)))], [N(9, 2)], "שתיהן ביום 30, אותו יום עברי");
    a.deepEqual(r.plans.filter(p => p.kind === "monthly").map(p => p.onah).sort(), ["day", "night"], "עונת החודש בשתי העונות");
    a.equal(r.earliestHefsek, N(14), "ההמתנה מהיום המאוחר");
    const v = rv(r, `ask-waking-${wake.id}`); askOk(v, ["sa184_4", "secWaking"]); a.equal(v.topic, "נמצא דם בהתעוררות"); a.deepEqual(v.eventIds, [wake.id]);
    a.ok(!r0.reviews.some(x => /^ask-waking/.test(x.id)), "בלי הסימון אין שאלה");
    const early = event("flow", d, "04:30", { foundOnWaking: true }), re = run([early]);
    a.equal(stamp(early).onah, "night"); a.deepEqual(re.plans.filter(p => p.kind === "average").map(p => p.onah).sort(), ["day", "night"]); a.equal(re.earliestHefsek, N(14));
    a.deepEqual(run([wake], { beinHashmashot: "flag" }).plans.filter(p => p.kind === "average").map(p => p.onah).sort(), ["day", "night"], "גם במצב ״השעיה״ של בין השמשות");
    const iv = run([event("flow", N(2)), event("flow", N(30), "07:30", { foundOnWaking: true })]).plans.filter(p => p.kind === "interval");
    a.deepEqual(iv.map(p => p.onah).sort(), ["day", "night"], "הפלגה בשתי העונות");
  });
  test("יש לשאול רב", "foundOnWaking נשמר ביומן: ברירת מחדל false, ערך לא בוליאני נדחה", () => {
    const s = emptyState(); s.events = [event("flow", N(10)), event("flow", N(12), "07:00", { foundOnWaking: true }), event("hefsek", N(15), "16:00", { foundOnWaking: true })];
    const p = M.parseState(JSON.parse(JSON.stringify(s)));
    a.equal(p.events[0].foundOnWaking, false, "יומן ישן: false"); a.equal(p.events[1].foundOnWaking, true); a.equal(p.events[2].foundOnWaking, undefined, "רק לראייה");
    a.deepEqual(M.parseState(JSON.parse(JSON.stringify(p))), p, "שמירה וטעינה חוזרת יציבות");
    s.events = [event("flow", N(10), "07:00", { foundOnWaking: "yes" })]; a.throws(() => M.parseState(s), /התעוררות/);
  });
  /* אור זרוע לעונה בינונית של יממה שלמה (הוכרע: כמו כל הלוחות). אור זרוע נוסף רק לפני עונת הראייה עצמה; כשהעונה הבינונית
   * היא יממה שלמה, לפני ראייה ביום הוא ליל יום 30, שכבר בתוך היממה, ולכן אין אור זרוע ביום 29. ההרחבה ללילה אינה מוסיפה אור זרוע. */
  const ozAvg = r => r.plans.filter(p => p.kind === "or-zarua" && p.id.startsWith("oz-average"));
  test("אור זרוע", "יממה שלמה (כרתי ופלתי), ראייה ביום: אין אור זרוע ביום 29, ואין ״יש לשאול רב״", () => {
    const f = event("flow", N(2), "10:00", { cityId: "jerusalem" }), r = calculate(presetState("ashkenaz-kreiti", [f]), NOW);
    a.deepEqual(ozAvg(r).map(p => p.id), [], "אין אור זרוע לעונה הבינונית");
    a.ok(!r.plans.some(p => p.kind === "or-zarua" && p.date === N(29) && p.onah === "day"), "אין אור זרוע ביום 29");
    a.ok(!r.reviews.some(x => /^ask-oz/.test(x.id)), "אין סימון לבירור");
    a.deepEqual(r.plans.filter(p => p.kind === "average" && p.id.includes("-30-")).map(p => p.onah).sort(), ["day", "night"], "העונה הבינונית עצמה לא השתנתה");
    const custom = run([event("flow", N(2), "10:00")], { beinonit: "both", orZarua: true, day31: true });
    a.deepEqual(ozAvg(custom).map(p => p.id), [], "אותו כלל בהתאמה אישית");
  });
  test("אור זרוע", "יממה שלמה (כרתי ופלתי): אור זרוע לעונת החודש ולהפלגה נשאר", () => {
    // א׳ אדר, ו׳ ניסן (הפלגה 35). ניסן מלא, ולכן עונת החודש (ו׳ אייר) אינה ביום 30 (ה׳ אייר)
    const evs = [event("flow", N(1, 12), "10:00", { cityId: "jerusalem" }), event("flow", N(6, 1), "10:00", { cityId: "jerusalem" })];
    const r = calculate(presetState("ashkenaz-kreiti", evs), NOW), last = evs[1];
    // בכרתי ופלתי עונת החודש (יום 30 או 31) נמצאת תמיד בתוך יממה שלמה, ולכן אור זרוע שלה הוא ליל היממה. בלי יום 31 הוא נראה בנפרד:
    const m = run([event("flow", N(6, 1), "10:00")], { beinonit: "both", orZarua: true, day31: false });
    a.ok(m.plans.some(p => p.id.startsWith("oz-monthly-") && p.date === N(5, 2) && p.onah === "night"), "אור זרוע לפני עונת החודש");
    a.deepEqual(ozAvg(m).map(p => p.id), [], "ולא לעונה הבינונית");
    a.ok(r.plans.some(p => p.id === `oz-interval-35-${last.id}` && p.onah === "night"), "אור זרוע לפני ההפלגה");
    a.deepEqual(ozAvg(r).map(p => p.id), [], "ולא לעונה הבינונית");
  });
  test("אור זרוע", "יממה שלמה, ראייה בלילה: אור זרוע ביום 29 ביום נשאר (העונה שלפני עונת הראייה)", () => {
    const n = event("flow", N(2), "22:00", { cityId: "jerusalem" }), r = calculate(presetState("ashkenaz-kreiti", [n]), NOW), see = M.stamp(n).abs;
    const oz = ozAvg(r); a.equal(oz.length, 1, "אור זרוע אחד");
    a.equal(oz[0].onah, "day"); a.equal(oz[0].date, fromAbs(see + 28), "ביום 29, בעונת היום");
    a.ok(!r.reviews.some(x => /^ask-oz/.test(x.id)), "אין סימון לבירור");
  });
  test("אור זרוע", "עונה אחת (אשכנזי רגיל, בן איש חי): אור זרוע לפני עונת הראייה ביום 30 לא השתנה", () => {
    const f = event("flow", N(2), "10:00", { cityId: "jerusalem" }), see = M.stamp(f).abs;
    for (const pk of ["ashkenaz", "sefard-bic"]) {
      const oz = ozAvg(calculate(presetState(pk, [f]), NOW));
      a.deepEqual(oz.map(p => `${p.date}:${p.onah}`), [`${fromAbs(see + 28)}:night`], `${pk}: ליל יום 30`);
    }
  });
  test("אור זרוע", "יממה שלמה, נמצא בהתעוררות (ראייה ביום): אור זרוע ביום 29 בגלל האפשרות שהתחילה בלילה", () => {
    const w = event("flow", N(2), "07:30", { cityId: "jerusalem", foundOnWaking: true }), r = calculate(presetState("ashkenaz-kreiti", [w]), NOW), see = M.stamp(w).abs;
    a.equal(M.stamp(w).onah, "day");
    a.deepEqual(ozAvg(r).map(p => `${p.date}:${p.onah}`), [`${fromAbs(see + 28)}:day`], "כמו ראייה בלילה");
  });
  test("יש לשאול רב", "אור זרוע ביום 31 בשיטות אשכנז אינו מסומן (בחירת שיטה מתועדת)", () => {
    for (const pk of ["ashkenaz", "ashkenaz-kreiti"]) {
      const r = calculate(presetState(pk, [event("flow", N(2), "10:00", { cityId: "jerusalem" })]), NOW);
      a.ok(!r.reviews.some(x => /31|זרוע/.test(x.id)), pk);
      a.ok(!r.reviews.some(x => /יום 31/.test(`${x.title} ${x.topic || ""}`)), pk);
    }
  });

  /* ---------- תזכורת לפני השקיעה ובחירת מנהג ביומן חדש ---------- */
  test("תזכורות", "ברירת המחדל: 60 דקות לפני השקיעה, להפסק ולבדיקת הערב; יומן שמור שומר את הערך שלו", () => {
    a.equal(M.SETTING_DEFAULTS.reminderMinutes, 60); a.equal(M.newDiary().settings.reminderMinutes, 60);
    const now = new Date(new HDate(6, 1, 5785).greg().toISOString().slice(0, 10) + "T08:00:00Z");
    const h = run([event("flow", N(2), "10:00")], {}, now).plans.find(p => p.kind === "hefsek");
    a.equal(new Date(h.end) - new Date(h.start), 60 * 60000, "הפסק: שעה לפני השקיעה");
    const pm = run([event("flow", N(2)), event("hefsek", N(6), "16:00")], {}, new Date(new HDate(8, 1, 5785).greg().toISOString().slice(0, 10) + "T08:00:00Z")).plans.find(p => /-pm$/.test(p.id));
    a.equal(new Date(pm.end) - new Date(pm.start), 60 * 60000, "בדיקת ערב: שעה לפני השקיעה"); a.equal(pm.reason, "60 דקות לפני השקיעה המקומית.");
    const s = emptyState(); s.settings.reminderMinutes = 30;
    a.equal(M.parseState(JSON.parse(JSON.stringify(s))).settings.reminderMinutes, 30, "יומן שנשמר עם 30 נשאר 30");
  });
  test("בחירת מנהג", "יומן חדש: המנהג לא נבחר, ואין חישוב עד שבוחרים", () => {
    const s = M.newDiary(); a.equal(s.settings.methodChosen, false); a.equal(s.settings.method, "custom");
    s.events = [event("flow", N(2)), event("flow", N(30))];
    const r = calculate(M.parseState(JSON.parse(JSON.stringify(s))), NOW);
    a.deepEqual(r.plans, [], "אין מועדים"); a.ok(r.reviews.some(x => x.id === "method-not-chosen"), "מסומן שלא נבחר מנהג"); a.equal(r.phase, "empty");
    for (const pk of Object.keys(P)) {
      const chosen = M.applyPreset(s.settings, pk); a.equal(chosen.methodChosen, true, pk);
      const r2 = calculate(M.parseState({ ...s, settings: chosen }), NOW);
      a.ok(r2.plans.length > 0 && !r2.reviews.some(x => x.id === "method-not-chosen"), `${pk}: מחושב`);
    }
    a.equal(M.applyPreset(s.settings, "custom").methodChosen, true, "בחירה מפורשת בהתאמה אישית");
  });
  test("בחירת מנהג", "יומן קיים (בלי השדה, עם ״custom״ או עם שיטה) אינו מחויב לבחור ואינו משתנה", () => {
    for (const method of ["custom", "ashkenaz", "sefard"]) {
      const s = emptyState(); delete s.settings.methodChosen; s.settings.method = method; s.events = [event("flow", N(2))];
      const p = M.parseState(JSON.parse(JSON.stringify(s)));
      a.equal(p.settings.methodChosen, true, `${method}: נחשב כנבחר`); a.equal(p.settings.method, method, "השיטה לא השתנתה");
      a.ok(calculate(p, NOW).plans.length > 0, "מחושב כרגיל");
    }
    a.equal(M.parseState({ schemaVersion: 1 }).settings.methodChosen, true, "יומן ישן בלי הגדרות");
    a.equal(emptyState().settings.methodChosen, true, "emptyState (תרחישים, יומן לדוגמה) אינו מושפע");
    a.equal(M.demoState(NOW).settings.methodChosen, true);
    const bad = emptyState(); bad.settings.methodChosen = "yes"; a.throws(() => M.parseState(bad), /methodChosen/);
    const n = M.newDiary(); a.deepEqual(M.parseState(JSON.parse(JSON.stringify(n))).settings.methodChosen, false, "שמירה וטעינה חוזרת");
  });

  return {
    tests: T,
    run() {
      return T.map(t => { const started = Date.now(); try { t.fn(); return { ...t, ok: true, ms: Date.now() - started }; } catch (e) { return { ...t, ok: false, error: e.message, ms: Date.now() - started }; } });
    },
  };
};
if (typeof module !== "undefined") module.exports = MaayanTests;
