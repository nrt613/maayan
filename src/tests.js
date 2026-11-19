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
  test("הפלגה", "וקטור נשמת: ב׳ ניסן ← ל׳ ניסן מחשב כ״ח אייר", () => {
    const x = event("flow", N(2)), y = event("flow", N(30)); const p = run([x, y]).plans.find(p => p.kind === "interval");
    a.equal(p.date, N(28, 2)); a.equal(p.onah, "day"); a.match(p.title, /29/); a.deepEqual(p.eventIds, [x.id, y.id]);
  });
  test("הפלגה", "עונת ההפלגה נקבעת לפי הווסת האחרונה", () => { const p = run([event("flow", N(2)), event("flow", N(30), "01:00")]).plans.find(p => p.kind === "interval"); a.equal(p.onah, "night"); a.equal(p.date, addDays(N(28, 2), -1)); });
  test("עונה בינונית", "יום 30 הוא יום הראייה ועוד 29 (ספירה כוללנית)", () => { const p = run([event("flow", N(2))]).plans.find(p => p.kind === "average"); a.equal(p.date, N(1, 2)); });
  test("עונה בינונית", "שתי העונות ויום 31 הן אפשרויות נפרדות", () => { const pp = run([event("flow", N(2))], { beinonit: "both", day31: true }).plans.filter(p => p.kind === "average"); a.equal(pp.length, 4); a.deepEqual([...new Set(pp.map(p => p.onah))].sort(), ["day", "night"]); });
  test("עונת החודש", "שומרת על התאריך העברי גם כשאורך החודש הלועזי משתנה", () => { const p = run([event("flow", N(15))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(15, 2)); });
  test("עונת החודש", "ל׳ בחודש שאחריו אין ל׳ — במדיניות דילוג אין גלישה שקטה", () => { const r = run([event("flow", N(30))], { missingMonthly: "skip" }); a.equal(r.plans.filter(p => p.kind === "monthly").length, 0); a.ok(r.reviews.some(r => r.id === "missing-month-day")); });
  test("עונת החודש", "ל׳ ניסן במדיניות ״א׳ בחודש שאחריו״ מגיע לא׳ סיון ולא לתמוז", () => { const p = run([event("flow", N(30))], { missingMonthly: "first-next-month" }).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(1, 3)); });
  test("עונת החודש", "ברירת המחדל לל׳ בחודש חסר היא א׳ בחודש שאחריו (כפסיקת נשמת)", () => { const p = run([event("flow", N(30))]).plans.find(p => p.kind === "monthly"); a.equal(p.date, N(1, 3)); });
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
  test("שבעה נקיים", "בדיקות מתועדות ביום הראשון והשביעי מסירות את הסימון", () => { const r = run([event("flow", N(2)), event("hefsek", N(6), "16:00"), event("bedikah", N(7)), event("bedikah", N(13))]); a.ok(!r.reviews.some(r => r.id.startsWith("missing-day"))); a.equal(r.checks[1].length, 1); });
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
    a.equal(r.checks[1].length, 1); a.equal(r.checks[7].length, 1); a.ok(!r.reviews.some(x => x.id.startsWith("missing-day")));
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
  test("שבעה נקיים", "הפסק שנרשם בלילה (לפני הזריחה) מתקבל אך מסומן לבירור", () => {
    const h = event("hefsek", N(6), "04:00"), r = run([event("flow", N(2)), h]);
    a.equal(r.hefsek?.id, h.id); a.ok(r.reviews.some(x => x.id === `hefsek-night-${h.id}`));
    a.ok(!run([event("flow", N(2)), event("hefsek", N(6), "16:00")]).reviews.some(x => x.id.startsWith("hefsek-night")));
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
    a.deepEqual(kept, ["הפלגה · 26 ימים", "הפלגה · 36 ימים"].sort());
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
  test("שיטות", "יומן ישן בלי ההגדרות החדשות נטען עם ברירות המחדל", () => {
    const s = emptyState(); delete s.settings.beinHashmashot; delete s.settings.hefsekTwilight; delete s.settings.method;
    const p = M.parseState(s); a.equal(p.settings.method, "custom"); a.equal(p.settings.beinHashmashot, "both"); a.equal(p.settings.hefsekTwilight, "before-sunset");
  });

  return {
    tests: T,
    run() {
      return T.map(t => { const started = Date.now(); try { t.fn(); return { ...t, ok: true, ms: Date.now() - started }; } catch (e) { return { ...t, ok: false, error: e.message, ms: Date.now() - started }; } });
    },
  };
};
if (typeof module !== "undefined") module.exports = MaayanTests;
