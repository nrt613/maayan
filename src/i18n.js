/* תרגום ממשק. המקור בעברית; כל טקסט שמוצג עובר דרך המילון. מפתח עם {n} תופס מספר, עם {x} תופס כל טקסט. */
const MaayanI18n = (() => {
  "use strict";
  const LANGS = { he: "עברית", en: "English", fr: "Français", es: "Español" };
  const HEB = /[֐-׿]/;
  let lang = "he", dict = {}, patterns = [];
  const misses = new Set();
  function load(d) {
    dict = d;
    patterns = Object.keys(d).filter(k => /\{[nx]\}/.test(k)).map(k => {
      const order = [...k.matchAll(/\{([nx])\}/g)].map(m => m[1]);
      const src = k.split(/\{[nx]\}/).map(s => s.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).reduce((acc, part, i) => acc + (i ? (order[i - 1] === "n" ? "(\\d+(?:[.:,]\\d+)?)" : "(.+?)") : "") + part, "");
      return { key: k, re: new RegExp("^" + src + "$"), order };
    }).sort((a, b) => b.key.length - a.key.length);
  }
  function fill(tpl, vals) { let i = 0; return tpl.replace(/\{[nx]\}/g, () => vals[i++] ?? ""); }
  function one(s) {
    const e = dict[s];
    if (e) return e[lang] ?? s;
    for (const p of patterns) {
      const m = s.match(p.re);
      if (m) { const tr = dict[p.key][lang]; if (tr) return fill(tr, m.slice(1).map(v => HEB.test(v) ? t(v) : v)); }
    }
    return null;
  }
  /** מתרגם מחרוזת שלמה; אם אין התאמה, מפצל לפי מפרידים ומתרגם כל חלק */
  function t(s, depth = 0) {
    if (lang === "he" || !s || !HEB.test(s)) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
    if (!core) return s;
    let r = one(core);
    if (r === null && depth < 6) for (const sep of [" · ", " | "]) if (core.includes(sep)) { r = core.split(sep).map(x => t(x, depth + 1)).join(sep); break; }
    if (r === null) {
      misses.add(core);
      // גיבוי: תרגום חלקי לפי מפרידים בתוך משפט
      if (depth < 6) for (const sep of [" — ", ": ", ", "]) if (core.includes(sep)) { const parts = core.split(sep); if (parts.some(x => one(x.trim()) !== null)) { r = parts.map(x => t(x, 9)).join(sep); break; } }
      if (r === null) r = core;
    }
    return lead + r + trail;
  }
  /** טקסט רב-שורות (דוחות) */
  const tx = text => lang === "he" ? text : text.split("\n").map(line => t(line)).join("\n");
  const SKIP = new Set(["TEXTAREA", "SCRIPT", "STYLE"]);
  function dom(root) {
    if (lang === "he" || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => { for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) if (SKIP.has(p.tagName) || p.hasAttribute("data-nt")) return NodeFilter.FILTER_REJECT; return HEB.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; },
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) n.nodeValue = t(n.nodeValue);
    root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(el => {
      if (el.closest("[data-nt]")) return;
      for (const a of ["placeholder", "aria-label", "title"]) { const v = el.getAttribute(a); if (v && HEB.test(v)) el.setAttribute(a, t(v)); }
    });
  }
  return {
    LANGS, load, t, tx, dom, misses,
    get lang() { return lang; },
    set(l) { if (LANGS[l]) lang = l; },
    dir: () => lang === "he" ? "rtl" : "ltr",
  };
})();
if (typeof module !== "undefined") module.exports = MaayanI18n;
