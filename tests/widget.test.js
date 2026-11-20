// בדיקת סיכום הווידג'ט (src/widget.js) על יומנים לדוגמה מ-src/scenarios.js, בנוסח דיסקרטי ובנוסח מלא.
// הרצה: node tests/widget.test.js
const assert = require("assert");
const M = require("../src/core.js"), L = require("../src/i18n.js");
L.load(require("../src/i18n-dict.js"));
const W = require("../src/widget.js"), S = require("../src/scenarios.js")(M);
const HOUR = 3600000;
const HALACHIC = /נקיים|טבילה|טבילת|הפסק|עונה|עונת|וסת|בדיק|פריש|נידה|נדה|זרוע|הפלגה|מקווה|immersion|hefsek|onah|clean/i;
let n = 0;
const ok = (name, fn) => { try { fn(); n++; console.log("ok  ", name); } catch (e) { console.log("FAIL", name, "\n     ", e.message); process.exitCode = 1; } };
const build = (id, extra = {}) => { const b = S.find(s => s.id === id).build(); Object.assign(b.state.settings, extra); return b; };
const texts = s => s.entries.flatMap(e => [e.head, e.now, e.next]);
const at = (s, ms) => s.entries.find(e => e.from <= ms && ms < e.until);
const contiguous = (s, now) => {
  assert.strictEqual(s.entries[0].from, +now, "starts now");
  for (let i = 1; i < s.entries.length; i++) assert.strictEqual(s.entries[i].from, s.entries[i - 1].until, "no gaps");
  assert.strictEqual(s.entries.at(-1).until, +now + 72 * HOUR, "covers 3 days");
};
L.set("he");

ok("off by default: no content at all", () => {
  const b = build("clean-days"), s = W.summary(b.state, b.now);
  assert.strictEqual(s.enabled, false);
  assert.deepStrictEqual(s.entries, []);
  assert.ok(!HALACHIC.test(JSON.stringify(s)));
});

ok("clean days, discreet: day count and personal reminders only", () => {
  const b = build("clean-days", { widgetEnabled: true }), s = W.summary(b.state, b.now);
  assert.strictEqual(s.style, "discreet");
  contiguous(s, b.now);
  const first = s.entries[0];
  assert.strictEqual(first.head, "יום 4 מתוך 7");
  assert.match(first.now, /^עכשיו: תזכורת אישית · עד \d\d:\d\d$/);
  assert.match(first.next, /^תזכורת אישית: .+ \d\d:\d\d$/);
  for (const x of texts(s)) assert.ok(!HALACHIC.test(x), `halachic word in discreet text: ${x}`);
  assert.ok(s.entries.some(e => e.head === "יום 7 מתוך 7"), "reaches day 7 within 3 days");
  assert.ok(s.entries.some(e => e.now.startsWith("הערב: אין מועד")), "after sunset nothing scheduled");
});

ok("clean days, full: halachic names, mikvah night with time", () => {
  const b = build("clean-days", { widgetEnabled: true, widgetStyle: "full" }), s = W.summary(b.state, b.now);
  assert.strictEqual(s.style, "full");
  contiguous(s, b.now);
  const r = M.calculate(b.state, b.now), mk = r.plans.find(p => p.kind === "mikvah"), hm = M.timeInZone(new Date(mk.start), "Asia/Jerusalem");
  assert.strictEqual(s.entries[0].head, "שבעה נקיים · יום 4");
  assert.match(s.entries[0].now, /^עכשיו: בדיקת בוקר · יום 4 · עד \d\d:\d\d$/);
  assert.strictEqual(s.entries[0].next.split(":")[0], "ליל טבילה");
  assert.ok(s.entries[0].next.endsWith(" " + hm), s.entries[0].next);
  // ביום השביעי, לפני הערב: "ליל טבילה: הערב 19:37"
  const day7 = s.entries.find(e => e.head === "שבעה נקיים · יום 7" && e.now.startsWith("עכשיו"));
  assert.strictEqual(day7.next, `ליל טבילה: הערב ${hm}`);
  // הרגע הנכון: השורה בזמן תחילת בדיקת הבוקר של יום 5
  const am5 = r.plans.find(p => p.id.endsWith("-5-am")), e5 = at(s, Date.parse(am5.start));
  assert.match(e5.now, /^עכשיו: בדיקת בוקר · יום 5/);
});

ok("waiting for hefsek, full and discreet", () => {
  const f = build("five-days", { widgetEnabled: true, widgetStyle: "full" }), sf = W.summary(f.state, f.now);
  contiguous(sf, f.now);
  assert.strictEqual(sf.entries[0].head, "ממתינה להפסק טהרה");
  assert.strictEqual(sf.entries[0].now, "היום: אין מועד");
  assert.match(sf.entries[0].next, /^הפסק טהרה: .+ \d\d:\d\d$/);
  assert.ok(sf.entries.some(e => /^עכשיו: הפסק טהרה · עד/.test(e.now)));
  const d = build("five-days", { widgetEnabled: true }), sd = W.summary(d.state, d.now);
  assert.strictEqual(sd.entries[0].head, "");
  assert.strictEqual(sd.entries[0].now, "היום: אין מועד");
  for (const x of texts(sd)) assert.ok(!HALACHIC.test(x), x);
  assert.strictEqual(sd.entries.length, sf.entries.length);
});

ok("app lock forces discreet even when full is chosen", () => {
  const b = build("clean-days", { widgetEnabled: true, widgetStyle: "full" }), s = W.summary(b.state, b.now, { locked: true });
  assert.strictEqual(s.style, "discreet");
  assert.strictEqual(s.locked, true);
  for (const x of texts(s)) assert.ok(!HALACHIC.test(x), x);
});

ok("lock detection reads maayan.v1.lock", () => {
  const store = {};
  globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  assert.strictEqual(W.lockActive(), false);
  store["maayan.v1.lock"] = JSON.stringify({ v: 1, salt: "x", hash: "y" });
  assert.strictEqual(W.lockActive(), true);
  const b = build("clean-days", { widgetEnabled: true, widgetStyle: "full" });
  assert.strictEqual(W.summary(b.state, b.now).style, "discreet");
  delete globalThis.localStorage;
});

ok("other languages: English text, ltr", () => {
  L.set("en");
  try {
    const b = build("clean-days", { widgetEnabled: true, widgetStyle: "full" }), s = W.summary(b.state, b.now);
    assert.strictEqual(s.dir, "ltr");
    assert.strictEqual(s.entries[0].head, "Seven clean days · Day 4");
    assert.match(s.entries[0].now, /^Now: .+ · until \d\d:\d\d$/);
    for (const x of texts(s)) assert.ok(!/[\u0590-\u05FF]/.test(x), `untranslated: ${x}`);
    const d = W.summary(build("clean-days", { widgetEnabled: true }).state, b.now);
    assert.strictEqual(d.entries[0].head, "Day 4 of 7");
    assert.match(d.entries[0].now, /^Now: Personal reminder · until/);
  } finally { L.set("he"); }
});

ok("every scenario produces a valid summary", () => {
  for (const sc of S) {
    const b = sc.build();
    b.state.settings.widgetEnabled = true;
    for (const style of ["discreet", "full"]) {
      b.state.settings.widgetStyle = style;
      const s = W.summary(b.state, b.now);
      contiguous(s, b.now);
      for (const e of s.entries) assert.ok(e.now && typeof e.head === "string" && typeof e.next === "string", sc.id);
      if (style === "discreet") for (const x of texts(s)) assert.ok(!HALACHIC.test(x), `${sc.id}: ${x}`);
    }
  }
});

console.log(`${n} widget checks passed`);
