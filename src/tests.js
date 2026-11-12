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
  test("מקום וזמן", "רישום בשעת השקיעה מסומן כמסופק ואינו יוצר מועד ודאי", () => { const d = N(10), s = sun(d, city("netanya")), time = timeInZone(s.sunset, "Asia/Jerusalem"), e = event("flow", d, time); a.ok(stamp(e).uncertain); a.equal(run([e]).plans.filter(p => p.kind === "average").length, 0); });
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

  return {
    tests: T,
    run() {
      return T.map(t => { const started = Date.now(); try { t.fn(); return { ...t, ok: true, ms: Date.now() - started }; } catch (e) { return { ...t, ok: false, error: e.message, ms: Date.now() - started }; } });
    },
  };
};
if (typeof module !== "undefined") module.exports = MaayanTests;
