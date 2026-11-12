/* תרחישים מוכנים לבודקים ההלכתיים. כל תרחיש: קלט, זמן מדומה ומה צריך לבדוק. */
const MaayanScenarios = (M) => {
  const { HDate, toISO, emptyState, uuid, localInstant, city } = M;
  const N = (day, month, year) => toISO(new HDate(day, month, year).greg());
  const ev = (type, date, time = "10:00", extra = {}) => ({ id: uuid(), type, date, time, cityId: "netanya", result: "clear", note: "", authorityNote: "", createdAt: "2026-01-01T10:00:00Z", ...extra });
  const at = (date, time = "12:00", cityId = "netanya") => localInstant(date, time, city(cityId).tz);
  const Y = 5786, NIS = 1, IYR = 2, SIV = 3;
  const list = [
    {
      id: "interval-days", tag: "הפלגה", title: "הפלגה בימים: ב׳ ניסן ← ל׳ ניסן",
      check: "הפלגה של 29 ימים צריכה ליפול בכ״ח אייר בעונת היום. עונה בינונית (יום 30) בכ״ט אייר. בחודש אייר אין ל׳, ולכן עונת החודש לפי ברירת המחדל היא א׳ סיון.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y)), ev("flow", N(30, NIS, Y))], now: () => at(N(1, IYR, Y)),
    },
    {
      id: "five-days", tag: "המתנה", title: "חמישה ימים מתחילת הנידה",
      check: "ראייה בב׳ ניסן בשעה 16:00 (לפני השקיעה). יום הראייה נספר כיום הראשון, ולכן ההפסק המוקדם הוא ביום ו׳ ניסן.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y), "16:00")], now: () => at(N(4, NIS, Y)),
    },
    {
      id: "after-sunset", tag: "המתנה", title: "ראייה אחרי השקיעה",
      check: "ראייה בתאריך האזרחי של ב׳ ניסן בשעה 22:00 שייכת ללילה של ג׳ ניסן. ההפסק המוקדם הוא ז׳ ניסן. העונה הבינונית ועונת החודש בעונת לילה.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y), "22:00")], now: () => at(N(4, NIS, Y)),
    },
    {
      id: "four-days", tag: "המתנה", title: "ארבעה ימים ממועד היחסים",
      check: "בסיס ההמתנה נרשם בא׳ ניסן והראייה בג׳ ניסן. לפי שיטת ארבעה ימים ממועד היחסים ההפסק המוקדם הוא ד׳ ניסן.",
      settings: { wait: "four-from-relations" }, events: () => [ev("intimacy", N(1, NIS, Y)), ev("flow", N(3, NIS, Y))], now: () => at(N(3, NIS, Y), "14:00"),
    },
    {
      id: "clean-days", tag: "שבעה נקיים", title: "ספירה באמצע שבעה נקיים",
      check: "הפסק בו׳ ניסן לפני השקיעה. יום א׳ של הספירה הוא ז׳ ניסן, וההדמיה נמצאת ביום ד׳. ליל הטבילה המתוכנן הוא ליל י״ד ניסן, במוצאי יום ז׳ (י״ג ניסן). בדיקות נרשמו בימים א׳–ג׳.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y)), ev("hefsek", N(6, NIS, Y), "16:00"), ...[7, 8, 9].flatMap(d => [ev("bedikah", N(d, NIS, Y), "08:30"), ev("bedikah", N(d, NIS, Y), "16:00")])], now: () => at(N(10, NIS, Y), "11:00"),
    },
    {
      id: "late-hefsek", tag: "שבעה נקיים", title: "הפסק שנרשם אחרי השקיעה",
      check: "הפסק בשעה 22:00 אינו פותח ספירה אוטומטית ומופיע בנקודות לבירור. המערכת נשארת במצב המתנה.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y)), ev("hefsek", N(6, NIS, Y), "22:00")], now: () => at(N(7, NIS, Y)),
    },
    {
      id: "early-hefsek", tag: "שבעה נקיים", title: "הפסק מוקדם עם הוראה מתועדת",
      check: "הפסק בד׳ ניסן, לפני תום חמשת הימים. נרשמה הוראה אישית, ולכן הספירה מתחילה ממנו. בלי ההוראה הייתה מופיעה נקודה לבירור. אפשר למחוק את ההוראה ברישום ולראות את ההבדל.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y)), ev("hefsek", N(4, NIS, Y), "16:00", { authorityNote: "הוראת מורה הוראה לצורך הדגמה" }), ev("bedikah", N(5, NIS, Y), "08:30")], now: () => at(N(6, NIS, Y)),
    },
    {
      id: "chabad", tag: "הפלגה", title: "שיטת חב״ד: 52 עונות",
      check: "מההפסק בה׳ ניסן עד הראייה בא׳ אייר (ביום) עברו 52 עונות. החשש החדש נספר מההפסק הנוכחי (ה׳ אייר): 52 עונות אחריו, כלומר ב׳ סיון בעונת היום.",
      settings: { haflagah: "chabad-onot" }, events: () => [ev("flow", N(1, NIS, Y)), ev("hefsek", N(5, NIS, Y), "16:00"), ev("flow", N(1, IYR, Y)), ev("hefsek", N(5, IYR, Y), "16:00")], now: () => at(N(6, IYR, Y)),
    },
    {
      id: "missing-30", tag: "עונת החודש", title: "ל׳ ניסן, וחודש אייר חסר",
      check: "ברירת המחדל היא א׳ בחודש שאחרי החודש החסר, כפסיקת מכון נשמת (״יוצאים בזה ידי כל השיטות״, כי העונה הבינונית חלה בכ״ט אייר). עונת החודש היא א׳ סיון ולא תמוז. אפשר לשנות בהגדרות ל״דילוג״ ולראות שהמועד נעלם ונוספת נקודה לבירור.",
      settings: { missingMonthly: "first-next-month" }, events: () => [ev("flow", N(30, NIS, Y))], now: () => at(N(2, IYR, Y)),
    },
    {
      id: "adar", tag: "עונת החודש", title: "שנה מעוברת: אדר א׳ ← אדר ב׳",
      check: "ראייה בי״ב אדר א׳ תשפ״ד. עונת החודש בי״ב אדר ב׳ ולא בי״ב ניסן.",
      settings: {}, events: () => [ev("flow", N(12, 12, 5784))], now: () => at(N(14, 12, 5784)),
    },
    {
      id: "stringencies", tag: "עונה בינונית", title: "יום 31, שתי עונות ואור זרוע",
      check: "בהפעלת שלוש האפשרויות: עונה בינונית ביום 30 וביום 31, בשתי העונות, ולכל חשש גם עונת אור זרוע שלפניו. כל אפשרות נשלטת בנפרד בהגדרות.",
      settings: { beinonit: "both", day31: true, orZarua: true }, events: () => [ev("flow", N(2, NIS, Y))], now: () => at(N(10, NIS, Y)),
    },
    {
      id: "uncertain", tag: "ספקות", title: "כתם מסופק באמצע",
      check: "ראייה מסופקת בט״ו ניסן אינה נמחקת כדי לייצר הפלגה ארוכה. לא מחושבת הפלגה, ומופיעה נקודה לבירור.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y)), ev("flow", N(15, NIS, Y), "10:00", { result: "uncertain", note: "מראה לא ברור — נשאל" }), ev("flow", N(30, NIS, Y))], now: () => at(N(1, IYR, Y)),
    },
    {
      id: "twice", tag: "עונת החודש", title: "ראתה פעמיים באותו חודש",
      check: "ראייה בה׳ ניסן, הפסק, וראייה נוספת בכ״ה ניסן. כל החישובים (הפלגה, עונה בינונית, עונת החודש) נעשים מכ״ה ניסן, ובנוסף נשמרת עונת חודש מה׳ ניסן: ה׳ אייר. כך עונה מכון נשמת לשאלה על שתי ראיות בהפרש קצר, וכך גם לוח חב״ד.",
      settings: {}, events: () => [ev("flow", N(5, NIS, Y)), ev("hefsek", N(9, NIS, Y), "16:00"), ev("flow", N(25, NIS, Y))], now: () => at(N(26, NIS, Y)),
    },
    {
      id: "fixed", tag: "וסת קבוע", title: "שלוש ראיות בי׳ לחודש",
      check: "שלוש ראיות רצופות בי׳ ניסן, אייר וסיון באותה עונה. המערכת מסמנת ״דפוס חודשי אפשרי״ לבירור ואינה קובעת וסת קבוע בעצמה.",
      settings: {}, events: () => [ev("flow", N(10, NIS, Y)), ev("flow", N(10, IYR, Y)), ev("flow", N(10, SIV, Y))], now: () => at(N(12, SIV, Y)),
    },
    {
      id: "travel", tag: "מקום וזמן", title: "נסיעה לפריז בזמן עונה",
      check: "הראייה נרשמה בנתניה. בזמן העונה הבינונית יש נסיעה לפריז, ולכן העונה מחושבת לפי השקיעה והזריחה בפריז, בלי לשנות את מקום הרישום המקורי.",
      settings: {}, events: () => [ev("flow", N(2, NIS, Y))], trips: () => [{ id: uuid(), from: N(28, NIS, Y), to: N(4, IYR, Y), cityId: "paris" }], now: () => at(N(10, NIS, Y)),
    },
  ];
  return list.map(s => ({
    ...s,
    build() {
      const st = emptyState();
      st.settings = { ...st.settings, ...s.settings };
      st.events = s.events();
      st.trips = s.trips ? s.trips() : [];
      return { state: st, now: s.now() };
    },
  }));
};
if (typeof module !== "undefined") module.exports = MaayanScenarios;
