#!/usr/bin/env node
/* מעיין — מצגת בצרפתית לרבנים (16:9).
 * בונה את present/fr/slides.html ואת maayan-presentation.pdf.
 * הלוח העברי בשקופית ״Comment Maayan calcule״ מחושב במנוע עצמו (src/core.js) דרך docs/halacha/questions-build.js.
 *
 * הרצה:  node present/fr/build.js
 * פרטי קשר אישיים לא נשמרים במאגר (המאגר ציבורי). לגרסה אישית:
 *   MAAYAN_CONTACT=/path/contact.json MAAYAN_OUT=/path/outside/repo node present/fr/build.js
 *   contact.json: { "name": "...", "phone": "...", "email": "..." }
 * אז slides.html ו-PDF נכתבים ל-MAAYAN_OUT בלבד, והקבצים שבמאגר אינם משתנים.
 * צילומי המסך: present/fr/screens/ (Playwright, 390x844, deviceScaleFactor 2, בצרפתית, מהיומן לדוגמה).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const ROOT = path.resolve(HERE, "..", "..");
const M = require(path.join(ROOT, "src", "core.js"));
const Q = require(path.join(ROOT, "docs", "halacha", "questions-build.js"));

const contactFile = process.env.MAAYAN_CONTACT;
const contact = contactFile ? JSON.parse(fs.readFileSync(contactFile, "utf8")) : null;
const OUT = process.env.MAAYAN_OUT ? path.resolve(process.env.MAAYAN_OUT) : HERE;
if (contact && path.resolve(OUT).startsWith(ROOT + path.sep)) { console.error("פרטי קשר אישיים: יש לכתוב אל MAAYAN_OUT מחוץ למאגר"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const he = s => `<bdi lang="he" dir="rtl">${esc(s)}</bdi>`;

/* ---------- liens ---------- */
const LINKS = {
  web: "https://nrt613.github.io/maayan/",
  apk: "https://github.com/nrt613/maayan/releases/latest/download/maayan.apk",
  privacy: "https://nrt613.github.io/maayan/privacy.html",
};

/* ---------- exemple calculé par le moteur (Ben Ish 'Haï) ---------- */
const Y = 5787, TISHREI = 7, CHESHVAN = 8, KISLEV = 9;
const N = (d, m) => M.toISO(new M.HDate(d, m, Y).greg());
const A = (d, m) => new M.HDate(d, m, Y).abs();
let n = 0;
const ev = (type, date, time) => ({ id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, type, date, time, cityId: "jerusalem", result: "clear", note: "", authorityNote: "", createdAt: "2026-01-01T00:00:00Z" });
const EX_METHOD = "sefard-bic";
const ex = Q.run(EX_METHOD, [ev("flow", N(5, TISHREI), "10:00"), ev("flow", N(10, CHESHVAN), "10:00"), ev("hefsek", N(13, CHESHVAN), "16:00")], N(14, CHESHVAN));
const see = A(10, CHESHVAN), hef = A(13, CHESHVAN);
const find = kind => ex.marks.filter(m => m.kind === kind);
const one = kind => { const m = find(kind); if (m.length !== 1) throw new Error(`exemple : ${kind} attendu une fois, trouvé ${m.length}`); return m[0]; };
const avg = one("avg"), mon = one("mon"), int = one("int"), mik = one("mik");
const ozs = find("oz");
if (ozs.length !== 3 || !ozs.every(o => o.onah === "night") || ex.hef !== hef) throw new Error("exemple : le moteur a changé, revoir la diapositive 6");
const haflagaDays = int.abs - see + 1;
const tint = Q.tints(see, hef);
const calendar = Q.grid({ from: see, to: int.abs, anchor: see, marks: ex.marks, tint });
const hs = abs => Q.hs(abs);
// ליל טבילה: המנוע מסמן את הלילה של היום העברי שאחרי היום השביעי
const exRows = [
  ["see", "Deux ראיות, de jour", he(`${hs(A(5, TISHREI))} · ${hs(see)}`)],
  ["hef", "Hefsek tahara au plus tôt (4 jours)", he(hs(hef))],
  ["mik", "Nuit du mikvé, après 7 nekiim", he(`ליל ${hs(mik.abs)}`)],
  ["avg", "Ona beinonit (jour 30)", he(hs(avg.abs))],
  ["mon", "Onat ha'hodesh", he(hs(mon.abs))],
  ["int", `Haflaga (${haflagaDays} jours)`, he(hs(int.abs))],
  ["oz", "Or zaroua : la nuit qui précède chacune", he(ozs.map(o => `ליל ${hs(o.abs)}`).join(" · "))],
];

/* ---------- contact ---------- */
const contactHtml = contact
  ? `<div class="ct-name">${esc(contact.name)}</div>
     ${contact.phone ? `<div class="ct-line"><a href="tel:${esc(contact.phone.replace(/[^\d+]/g, ""))}">${esc(contact.phone)}</a></div>` : ""}
     ${contact.email ? `<div class="ct-line"><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></div>` : ""}`
  : `<div class="ct-name ph">[votre nom / téléphone]</div>`;

/* ---------- icônes (traits simples, comme dans l'application) ---------- */
const ico = d => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  phone: ico('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4.5 21c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6"/><path d="M3 3l18 18"/>'),
  wifi: ico('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0"/><circle cx="12" cy="19.3" r="1"/><path d="M3 3l18 18"/>'),
  lock: ico('<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  key: ico('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16.5 6.5l2.5 2.5"/>'),
  trash: ico('<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14"/>'),
  bell: ico('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>'),
  gift: ico('<rect x="3.5" y="8.5" width="17" height="12" rx="2"/><path d="M12 8.5v12M3.5 13h17M12 8.5C9 8.5 7 4 9.5 4S12 8.5 12 8.5zM12 8.5c3 0 5-4.5 2.5-4.5S12 8.5 12 8.5z"/>'),
  sun: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  check: ico('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>'),
  ring: ico('<circle cx="12" cy="12" r="8.5" stroke-dasharray="3.5 2.2"/><path d="M12 7.5v5l3 2"/>'),
  moon: ico('<path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15.5 3.5z"/>'),
  widget: ico('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3.5" y="13" width="17" height="7.5" rx="2"/>'),
  offline: ico('<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>'),
  scale: ico('<path d="M12 3.5v17M7 20.5h10M5 7.5h14M5 7.5l-2.5 6a3 3 0 0 0 5 0zM19 7.5l-2.5 6a3 3 0 0 0 5 0z"/>'),
  link: ico('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4L11.5 6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>'),
  android: ico('<rect x="5" y="9" width="14" height="10.5" rx="2"/><path d="M5 12h14M8 9a4 4 0 0 1 8 0M8.5 4.5l1.2 2M15.5 4.5l-1.2 2"/>'),
  shield: ico('<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>'),
  mail: ico('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>'),
};
const phone = (src, alt, cls = "") => `<figure class="phone ${cls}"><img src="screens/${src}" alt="${esc(alt)}"></figure>`;

/* ---------- diapositives ---------- */
const S = [];
const slide = (cls, body) => S.push(`<section class="slide ${cls}">${body}<footer class="sf"><img src="../../icons/icon-192.png" alt=""><span>Maayan · ${he("מעיין")}</span><span class="pg">${S.length + 1}</span></footer></section>`);

// 1. Titre
slide("title", `
  <div class="t-wrap">
    <img class="t-icon" src="../../icons/icon-512.png" alt="Icône Maayan">
    <div>
      <h1>Maayan <span class="dash">—</span> ${he("מעיין")}</h1>
      <p class="t-sub">Le carnet de taharat hamishpacha,<br>simple, privé, fiable.</p>
      <p class="t-meta">Application gratuite · présentation aux Rabbanim · ${he("כסלו תשפ״ז")}</p>
    </div>
  </div>`);

// 2. Pourquoi
slide("why vc", `
  <h2>Pourquoi Maayan ?</h2>
  <div class="cols2">
    <div class="box good">
      <h3>Ce dont le couple a besoin</h3>
      <ul>
        <li>Savoir chaque jour où l'on en est</li>
        <li>Les bonnes dates, selon <b>son</b> minhag</li>
        <li>Un rappel <b>avant</b> le moment, pas après</li>
        <li>Savoir quand il faut demander au Rav</li>
      </ul>
    </div>
    <div class="box miss">
      <h3>Ce qui manque souvent aujourd'hui</h3>
      <ul>
        <li>Calculs à la main : des erreurs de dates</li>
        <li>Des outils sans méthode ni source affichées</li>
        <li>Peu d'accompagnement d'un jour à l'autre</li>
        <li>Des rappels qui arrivent trop tard</li>
      </ul>
    </div>
  </div>`);

// 3. Ce que fait Maayan
slide("what", `
  <div class="split">
    <div class="main">
      <h2>Ce que fait Maayan</h2>
      <p class="lead">Elle note une ${he("ראייה")} en deux gestes.<br>Maayan calcule tout le reste :</p>
      <ol class="flow">
        <li class="f-sep"><span class="dot"></span><b>Les onot de séparation</b> <small>ona beinonit, onat ha'hodesh, haflaga, or zaroua</small></li>
        <li class="f-nid"><span class="dot"></span><b>Les 5 jours</b> (ou 4, selon le minhag) <small>jusqu'au hefsek tahara</small></li>
        <li class="f-cln"><span class="dot"></span><b>Les 7 nekiim</b> <small>avec les bedikot du matin et du soir</small></li>
        <li class="f-mik"><span class="dot"></span><b>La nuit du mikvé</b> <small>et ses préparatifs</small></li>
        <li class="f-bell"><span class="dot"></span><b>Les rappels, au bon moment</b> <small>avant le coucher du soleil, le matin d'une bedika</small></li>
      </ol>
    </div>
    <div class="duo">${phone("calendar-heb.png", "Calendrier hébraïque", "back")}${phone("quick.png", "Écran « Que noter ? »", "front")}</div>
  </div>`);

// 4. Accompagnement
slide("care", `
  <div class="split">
    <div class="main">
      <h2>L'accompagnement, au quotidien</h2>
      <p class="kicker">Le principal avantage</p>
      <ul class="feat">
        <li>${IC.ring}<span><b>Écran « Aujourd'hui »</b> : où elle en est, et la prochaine étape</span></li>
        <li>${IC.check}<span><b>7 nekiim</b> : « jour 5 sur 7 », et chaque bedika à son heure</span></li>
        <li>${IC.sun}<span><b>Ona de nuit</b> : rappel une heure avant le coucher du soleil ; <b>ona de jour</b> : le matin</span></li>
        <li>${IC.bell}<span><b>Notifications discrètes</b> : « Rappel personnel », par défaut</span></li>
        <li>${IC.moon}<span><b>Nuit du mikvé</b> : liste de préparation</span></li>
        <li>${IC.widget}<span><b>Widget</b> sur l'écran d'accueil (Android, au choix)</span></li>
        <li>${IC.offline}<span><b>Fonctionne sans internet</b></span></li>
      </ul>
      <p class="fine">Notifications même application fermée : dans l'application installée. Dans le navigateur : quand elle est ouverte, ou par un fichier d'agenda (.ics).</p>
    </div>
    ${phone("today.png", "Écran « Aujourd'hui »")}
  </div>`);

// 5. Méthodes
slide("methods", `
  <div class="split">
    <div class="main">
      <h2>Chacun selon son minhag</h2>
      <p class="lead">Choisie à la première ouverture, en deux étapes : la coutume, puis « selon les décisions de qui ».</p>
      <div class="meth">
        <div class="fam"><span class="tag">Séfarade</span>
          <div class="m"><b>Rav Ovadia Yossef</b><span>Selon les décisions de Taharat HaBayit.</span></div>
          <div class="m"><b>Ben Ish 'Haï</b><span>Comme le Rav Ovadia, avec en plus or zaroua.</span></div></div>
        <div class="fam"><span class="tag">Ashkénaze</span>
          <div class="m"><b>Ashkénaze (standard)</b><span>Jours 30 et 31, et or zaroua.</span></div>
          <div class="m"><b>Journée complète (Kréti ouPléti)</b><span>Comme le standard, avec l'ona beinonit sur une journée complète.</span></div></div>
        <div class="fam"><span class="tag">'Habad</span>
          <div class="m"><b>Minhag 'Habad</b><span>Selon le Choul'han Aroukh HaRav.</span></div></div>
      </div>
      <p class="note">${IC.scale}<span>Chaque réglage peut être adapté <b>selon la directive de son Rav</b>.</span></p>
    </div>
    ${phone("method.png", "Choix de la coutume à la première ouverture")}
  </div>`);

// 6. Calcul
slide("calcs", `
  <h2>Comment Maayan calcule</h2>
  <p class="lead small">Exemple réel, calculé par le moteur · méthode Ben Ish 'Haï · dates hébraïques</p>
  <div class="calc">
    <div class="calbox" dir="rtl" lang="he">${calendar}</div>
    <div class="exl">
      <ul>${exRows.map(([k, t, d]) => `<li>${Q.shape(k, { size: 22 })}<span><b>${t.replace("ראיות", he("ראיות"))}</b><br><span class="d">${d}</span></span></li>`).join("")}</ul>
      <p class="fine">Couleurs : jours de nidda jusqu'au hefsek, puis 7 nekiim. Dans chaque case : nuit à droite, jour à gauche. Le petit chiffre : le jour depuis la ${he("ראייה")}.</p>
    </div>
  </div>`);

// 7. Où Maayan ne tranche pas
slide("ask", `
  <div class="split">
    <div class="main">
      <h2>Là où Maayan ne tranche pas</h2>
      <p class="lead">L'application affiche « ${he("יש לשאול רב")} », et indique ce qu'elle fait en attendant.</p>
      <ol class="asks">
        <li>Vue le 30 du mois, et le mois suivant est <b>incomplet</b> (pas de 30)</li>
        <li>Une <b>haflaga longue</b> déracinée par une haflaga plus courte</li>
        <li>Sang trouvé <b>au réveil</b>, heure de début inconnue</li>
      </ol>
      <p class="also"><b>Tranché comme dans tous les autres calendriers :</b> vue le 30 et mois suivant <b>plein</b> — seulement le 30 ; or zaroua avant une ona beinonit d'une journée complète — seulement avant l'ona de la ${he("ראייה")} (vue de jour : pas d'or zaroua le jour 29).</p>
      <p class="also"><b>Également signalés :</b> bedikot non notées · heure du hefsek proche du coucher du soleil · nuit du mikvé un Chabbat ou un Yom Tov · trois ${he("ראיות")} à la même date (veset kavoua possible).</p>
    </div>
    ${phone("ask.png", "Point « À demander à un rav »")}
  </div>`);

// 8. Confidentialité
slide("privacy vc", `
  <h2>Confidentialité et sécurité</h2>
  <div class="tiles">
    <div class="tile">${IC.phone}<b>Tout reste sur le téléphone</b><span>Le carnet n'est envoyé nulle part.</span></div>
    <div class="tile">${IC.user}<b>Pas de compte, pas de serveur</b><span>Aucune donnée collectée.</span></div>
    <div class="tile">${IC.wifi}<b>Android : sans internet</b><span>L'application n'a même pas la permission réseau.</span></div>
    <div class="tile">${IC.lock}<b>Verrouillage</b><span>Code de 4 à 6 chiffres, empreinte ou Face ID.</span></div>
    <div class="tile">${IC.key}<b>Sauvegarde chiffrée</b><span>Protégée par mot de passe, pour changer de téléphone.</span></div>
    <div class="tile">${IC.trash}<b>Effacement complet</b><span>Toutes les données, en un geste.</span></div>
  </div>
  <p class="center fine big">Gratuit · sans publicité · sans achat</p>`);

// 9. Rigueur
slide("rigour vc", `
  <h2>Rigueur</h2>
  <div class="nums">
    <div class="num"><strong>${require(path.join(ROOT, "src", "tests.js"))(M).tests.length}</strong><span>tests automatiques<br>du moteur de calcul</span></div>
    <div class="num"><strong>168 000</strong><span>comparaisons du calendrier hébraïque et des heures solaires avec des références indépendantes · 0 échec</span></div>
    <div class="num"><strong>99 p.</strong><span>spécification halakhique complète, préparée pour la relecture rabbinique</span></div>
  </div>
  <div class="docs">
    <p>${IC.shield}<span>Les documents sont générés à partir du moteur lui-même : chaque tableau et chaque calendrier est calculé, pas recopié.</span></p>
    <p>${IC.check}<span>Pour le Rav, sur demande : un <b>résumé</b> de 7 pages et les <b>questions ouvertes</b>, en hébreu.</span></p>
  </div>`);

// 10. Statut et demande
slide("ask-rav vc", `
  <h2>Où nous en sommes</h2>
  <div class="status"><span class="pill">Version pour relecture</span> Les calculs n'ont pas encore reçu d'approbation halakhique. Nous souhaitons les soumettre à des Rabbanim reconnus.</div>
  <h3 class="req">Ce que nous demandons respectueusement au Rav</h3>
  <ol class="steps">
    <li><b>Essayer</b> l'application, quelques minutes, avec le carnet d'exemple</li>
    <li><b>Parcourir</b> le résumé pour le Rav</li>
    <li><b>Répondre</b> aux questions ouvertes</li>
    <li>Et, si le Rav l'estime juste, <b>la valider</b></li>
  </ol>
  <p class="lead small">Chaque remarque sera prise en compte et intégrée.</p>`);

// 11. Liens
slide("links vc", `
  <h2>Liens</h2>
  <div class="lk">
    <a class="l" href="${LINKS.web}">${IC.link}<span><b>Application web</b><small>Sur tout téléphone · peut être ajoutée à l'écran d'accueil</small><em>${LINKS.web.replace("https://", "")}</em></span></a>
    <a class="l" href="${LINKS.apk}">${IC.android}<span><b>Application Android</b><small>Bientôt sur Google Play et l'App Store</small><em>github.com/nrt613/maayan/releases/<wbr>latest/download/maayan.apk</em></span></a>
    <a class="l" href="${LINKS.privacy}">${IC.shield}<span><b>Politique de confidentialité</b><em>${LINKS.privacy.replace("https://", "")}</em></span></a>
    <div class="l contact">${IC.mail}<span><b>Contact</b>${contactHtml}</span></div>
  </div>`);

// 12. Merci
slide("thanks", `
  <div class="t-wrap center">
    <img class="t-icon small" src="../../icons/icon-512.png" alt="">
    <h1>Merci</h1>
    <p class="bless">${he("ברכה והצלחה")}</p>
  </div>`);

/* ---------- style ---------- */
const CAL_CSS = Q.CSS.split("\n").filter(l => /^(\.cal|figure\.cal|\.mk)/.test(l)).join("\n");
const CSS = `
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-hebrew.woff2") format("woff2");font-weight:300 900;unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-latin.woff2") format("woff2");font-weight:300 900;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Rubik";src:url("../../fonts/rubik-latin-ext.woff2") format("woff2");font-weight:300 900;unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@page{size:1280px 720px;margin:0}
:root{
  --bg:#fbf8f9;--surface:#fff;--soft:#f5eff2;--line:#ece4e8;--ink:#1f1a1e;--muted:#6b6270;--faint:#8f8694;
  --accent:#b8336a;--accent-strong:#8e2452;--accent-soft:#fbe9f0;--lilac:#8c5be0;--lilac-soft:#f1ecff;
  --grad:linear-gradient(135deg,#e8668f 0%,#b8336a 52%,#8c5be0 120%);
  --niddah:#e5484d;--niddah-bg:#fde8ea;--niddah-ink:#b4232f;--clean:#7a6cf2;--clean-bg:#eeebff;--clean-ink:#4f3fd0;
  --mikvah:#14a39e;--mikvah-bg:#ddf3f1;--mikvah-ink:#0c6b68;--sep:#d9901f;--sep-bg:#fcf1dd;--sep-ink:#8a5500;
  --q:#c42b45;--good:#1f8a5b;--good-soft:#e3f5ec;
  --sh-1:0 1px 2px rgb(60 20 40 / .04),0 4px 14px rgb(60 20 40 / .05);--sh-2:0 2px 6px rgb(60 20 40 / .05),0 14px 36px rgb(60 20 40 / .09);
}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#d9d0d5;font-family:"Rubik",system-ui,sans-serif;color:var(--ink)}
bdi[lang=he]{font-family:"Rubik",sans-serif;unicode-bidi:isolate}
.slide{width:1280px;height:720px;position:relative;overflow:hidden;padding:56px 72px 70px;
  background:radial-gradient(55% 70% at 100% 0%,#fbe9f0 0%,transparent 70%),radial-gradient(50% 60% at 0% 100%,#f1ecff 0%,transparent 70%),var(--bg);
  break-after:page;page-break-after:always;margin:0 auto 24px}
@media print{body{background:none}.slide{margin:0}}
h1{font-size:76px;font-weight:700;letter-spacing:-.02em;margin:0;line-height:1.05}
h2{font-size:48px;font-weight:700;letter-spacing:-.015em;margin:0 0 22px;line-height:1.1}
h3{font-size:26px;font-weight:600;margin:0 0 14px}
b{font-weight:600}
.lead{font-size:26px;color:var(--muted);margin:-6px 0 24px;line-height:1.4}
.lead.small{font-size:21px}
.kicker{display:inline-block;margin:-10px 0 18px;font-size:18px;font-weight:600;color:#fff;background:var(--grad);padding:5px 14px;border-radius:999px}
.fine{font-size:16px;color:var(--faint);line-height:1.45;margin:14px 0 0}
.center{text-align:center}
.sf{position:absolute;left:72px;right:72px;bottom:24px;display:flex;align-items:center;gap:10px;font-size:15px;color:var(--faint)}
.sf img{width:22px;height:22px;border-radius:6px}
.sf .pg{margin-left:auto}
.title .sf,.thanks .sf{display:none}
.vc{display:flex;flex-direction:column;justify-content:center;padding-bottom:84px}
/* titre */
.title{display:flex;align-items:center;padding:0 110px}
.t-wrap{display:flex;align-items:center;gap:64px}
.t-wrap.center{flex-direction:column;gap:18px;width:100%;justify-content:center;height:100%}
.t-icon{width:230px;height:230px;border-radius:54px;box-shadow:0 22px 60px rgb(184 51 106 / .30)}
.t-icon.small{width:140px;height:140px;border-radius:34px}
.title h1{font-size:84px}
.title .dash{color:var(--faint);font-weight:300}
.title h1 bdi{color:var(--accent)}
.t-sub{font-size:36px;line-height:1.3;margin:18px 0 26px;color:var(--ink);font-weight:400}
.t-meta{font-size:19px;color:var(--muted);margin:0}
.thanks h1{font-size:96px}
.bless{font-size:54px;color:var(--accent);margin:0;font-weight:500}
/* pourquoi */
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:10px}
.box{background:var(--surface);border-radius:28px;padding:32px 36px;box-shadow:var(--sh-2)}
.box h3{font-size:27px}
.box.good h3{color:var(--good)}
.box.miss h3{color:var(--accent-strong)}
.box ul{list-style:none;margin:0;padding:0}
.box li{font-size:25px;line-height:1.35;padding:12px 0 12px 34px;position:relative;border-top:1px solid var(--line)}
.box li:first-child{border-top:0}
.box.good li::before{content:"";position:absolute;left:4px;top:22px;width:12px;height:12px;border-radius:50%;background:var(--good)}
.box.miss li::before{content:"";position:absolute;left:4px;top:22px;width:14px;height:3px;border-radius:2px;background:var(--accent)}
/* mise en page avec téléphone */
.split{display:flex;gap:56px;align-items:center;height:100%}
.split .main{flex:1;min-width:0}
.phone{flex:none;margin:0;width:278px;padding:9px;border-radius:46px;background:#1f1a1e;box-shadow:0 30px 70px rgb(60 20 40 / .28),inset 0 0 0 2px #3b3438;align-self:center}
.phone img{display:block;width:100%;border-radius:38px}
.split .phone{margin-top:-14px}
.duo{flex:none;position:relative;width:400px;height:600px;margin-top:-14px}
.duo .phone{position:absolute;margin:0;width:262px}
.duo .back{left:0;top:0;transform:rotate(-4deg);opacity:.97}
.duo .front{right:0;top:28px}
/* flux */
.flow{list-style:none;margin:0;padding:0;position:relative}
.flow::before{content:"";position:absolute;left:13px;top:22px;bottom:22px;width:3px;background:linear-gradient(var(--sep),var(--niddah),var(--clean),var(--mikvah),var(--accent));border-radius:2px;opacity:.35}
.flow li{position:relative;padding:9px 0 9px 50px;font-size:25px;line-height:1.3}
.flow li small{display:block;font-size:18px;color:var(--muted);margin-top:2px}
.flow .dot{position:absolute;left:3px;top:13px;width:24px;height:24px;border-radius:50%;border:5px solid var(--surface);box-shadow:var(--sh-1)}
.f-sep .dot{background:var(--sep)}.f-nid .dot{background:var(--niddah)}.f-cln .dot{background:var(--clean)}.f-mik .dot{background:var(--mikvah)}.f-bell .dot{background:var(--accent)}
.f-sep b{color:var(--sep-ink)}.f-nid b{color:var(--niddah-ink)}.f-cln b{color:var(--clean-ink)}.f-mik b{color:var(--mikvah-ink)}.f-bell b{color:var(--accent-strong)}
/* accompagnement */
.feat{list-style:none;margin:0;padding:0}
.feat li{display:flex;gap:16px;align-items:center;font-size:22px;line-height:1.3;padding:7px 0}
.feat svg{flex:none;color:var(--accent);background:var(--accent-soft);border-radius:12px;padding:6px;width:42px;height:42px}
.care .fine{margin-top:10px;font-size:15px}
/* méthodes */
.meth{display:flex;flex-direction:column;gap:12px}
.fam{display:flex;gap:14px;align-items:stretch}
.fam .tag{flex:none;width:132px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:600;color:var(--accent-strong);background:var(--accent-soft);border-radius:16px}
.fam .m{flex:1;background:var(--surface);border-radius:16px;padding:10px 16px;box-shadow:var(--sh-1);font-size:20px}
.fam .m b{display:inline;font-size:21px}
.fam .m > span{display:block;color:var(--muted);font-size:17px;margin-top:3px}
.note{display:flex;gap:12px;align-items:center;font-size:21px;margin:22px 0 0;background:var(--lilac-soft);border-radius:16px;padding:12px 18px;color:#4b2f86}
.note svg{flex:none;color:var(--lilac)}
/* calcul */
.calc{display:flex;gap:40px;align-items:flex-start}
.calbox{flex:none;width:560px}
.exl{flex:1;min-width:0}
.exl ul{list-style:none;margin:0;padding:0}
.exl li{display:flex;gap:14px;align-items:flex-start;font-size:19px;line-height:1.25;padding:5px 0;border-bottom:1px solid var(--line)}
.exl li svg{margin-top:2px}
.exl .d{font-size:20px;font-weight:600;color:var(--accent-strong)}
.calc .fine{font-size:14.5px;margin-top:10px}
${CAL_CSS}
.calbox figure.cal{width:560px}
.calbox .cal th{font-size:15px;padding-bottom:4px}
.calbox .cal td{height:62px;border-color:#e2d6dc}
.calbox .cal .top{height:24px;padding:3px 5px 0}
.calbox .cal .dn{font-size:17px}
.calbox .cal .ct{font-size:12px}
.calbox .cal .mn{font-size:12px;bottom:2px;right:4px}
.calbox .cal .mks{height:34px}
.calbox .cal .mk{width:20px;height:20px}
.calbox .cal .og{width:11px;height:11px}
.calbox .cal td.m1{border-inline-start:3px solid var(--accent)}
.cal td.t-nid{background:var(--niddah-bg)}.cal td.t-cln{background:var(--clean-bg)}
/* ne tranche pas */
.asks{margin:0;padding:0;list-style:none;counter-reset:a}
.asks li{counter-increment:a;position:relative;padding:8px 0 8px 52px;font-size:22px;line-height:1.3}
.asks li::before{content:counter(a);position:absolute;left:0;top:7px;width:36px;height:36px;border-radius:50%;background:var(--accent-soft);color:var(--accent-strong);font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center}
.ask .lead{font-size:23px;margin-bottom:12px}
.also{font-size:18px;line-height:1.45;color:var(--muted);background:var(--surface);border-radius:16px;padding:12px 18px;margin:14px 0 0;box-shadow:var(--sh-1)}
.also b{color:var(--ink)}
/* confidentialité */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.tile{background:var(--surface);border-radius:24px;padding:24px 26px;box-shadow:var(--sh-2);display:flex;flex-direction:column;gap:8px}
.tile svg{color:var(--accent);width:44px;height:44px;background:var(--accent-soft);border-radius:14px;padding:8px}
.tile b{font-size:23px;margin-top:6px}
.tile span{font-size:18px;color:var(--muted);line-height:1.35}
.fine.big{font-size:21px;color:var(--muted);margin-top:26px}
/* rigueur */
.nums{display:grid;grid-template-columns:1fr 1.3fr 1.1fr;gap:24px}
.num{background:var(--surface);border-radius:28px;padding:28px 30px;box-shadow:var(--sh-2)}
.num strong{display:block;font-size:64px;font-weight:700;letter-spacing:-.02em;color:var(--accent);line-height:1.05}
.num span{display:block;font-size:20px;color:var(--muted);margin-top:10px;line-height:1.35}
.docs{margin-top:28px}
.docs p{display:flex;gap:14px;align-items:center;font-size:22px;margin:0 0 12px;line-height:1.35}
.docs svg{flex:none;color:var(--lilac)}
/* statut */
.status{font-size:24px;line-height:1.45;background:var(--surface);border-radius:22px;padding:20px 26px;box-shadow:var(--sh-1);margin-bottom:28px}
.pill{display:inline-block;background:var(--sep-bg);color:var(--sep-ink);font-weight:600;border-radius:999px;padding:3px 14px;margin-right:8px;font-size:20px}
.req{font-size:27px;color:var(--accent-strong)}
.steps{margin:0 0 18px;padding:0;list-style:none;counter-reset:s;display:grid;grid-template-columns:1fr 1fr;gap:14px 28px}
.steps li{counter-increment:s;font-size:23px;line-height:1.3;padding:14px 18px 14px 66px;position:relative;background:var(--surface);border-radius:18px;box-shadow:var(--sh-1)}
.steps li::before{content:counter(s);position:absolute;left:16px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:var(--grad);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:19px}
/* liens */
.lk{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.l{display:flex;gap:18px;align-items:flex-start;background:var(--surface);border-radius:24px;padding:30px 28px;min-height:150px;box-shadow:var(--sh-2);text-decoration:none;color:var(--ink)}
.l svg{flex:none;color:var(--accent);width:46px;height:46px;background:var(--accent-soft);border-radius:14px;padding:8px}
.l > span{min-width:0}
.l b{display:block;font-size:26px}
.l small{display:block;font-size:17px;color:var(--muted);margin-top:4px}
.l em{display:block;font-style:normal;font-size:18px;color:var(--accent-strong);margin-top:8px;overflow-wrap:anywhere;text-decoration:underline;text-decoration-color:#e8b3c8;text-underline-offset:3px}
.l.contact .ct-name{font-size:22px;margin-top:6px}
.l.contact .ct-name.ph{color:var(--faint)}
.l.contact .ct-line{font-size:19px;margin-top:4px}
.l.contact a{color:var(--accent-strong)}
`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1280">
<title>Maayan — présentation</title>
<!-- Généré par present/fr/build.js : ne pas modifier à la main. -->
<style>${CSS}</style>
</head>
<body>
${S.join("\n")}
</body>
</html>
`;

(async () => {
  const outHtml = path.join(OUT, "slides.html"), outPdf = path.join(OUT, "maayan-presentation.pdf");
  // hors du dépôt, les chemins relatifs (polices, icône, captures) pointent vers present/fr/
  const base = OUT === HERE ? html : html.replace("<head>", `<head>\n<base href="file://${HERE}/">`);
  fs.writeFileSync(outHtml, base);
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("file://" + outHtml);
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(() => [...document.querySelectorAll(".slide")].map((s, i) => {
    const r = s.getBoundingClientRect(), bad = [];
    for (const el of s.querySelectorAll("*")) { if (el.closest("footer")) continue; const b = el.getBoundingClientRect(); if (b.width && (b.bottom > r.bottom - 50 || b.right > r.right - 20)) bad.push(el.tagName + "." + el.className); }
    return bad.length ? `${i + 1}: ${bad.slice(0, 4).join(", ")}` : "";
  }).filter(Boolean));
  if (over.length) console.warn("débordement possible :\n  " + over.join("\n  "));
  await page.pdf({ path: outPdf, width: "1280px", height: "720px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  console.log(`${S.length} diapositives → ${outHtml}\n→ ${outPdf}`);
})().catch(e => { console.error(e); process.exit(1); });
