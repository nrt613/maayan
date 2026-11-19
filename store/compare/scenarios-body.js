/* מחולל התרחישים להשוואה עם אפליקציות אחרות. הרצה: node store/compare/scenarios-body.js > /tmp/x.md
 * הפלט הוא גוף הקובץ scenarios.md (מתחת לכותרת). כל המספרים מחושבים במנוע של מעיין. */
const M=require("../../src/core.js");
const {HDate,toISO,uuid,emptyState,calculate,sun,city,timeInZone,hebrew,addDays,localInstant}=M;
const N=(d,m,y)=>toISO(new HDate(d,m,y).greg());
const ev=(type,date,time,cityId,extra={})=>({id:uuid(),type,date,time,cityId,result:"clear",note:"",authorityNote:"",createdAt:"2026-01-01T00:00:00Z",...extra});
const T=(d,c,mins)=>timeInZone(new Date(sun(d,city(c)).sunset.valueOf()+mins*60000),city(c).tz);
const wd=d=>["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"][new Date(d+"T12:00:00Z").getUTCDay()];
const S=[];
const add=(title,desc,cityId,events,nowDate,trips)=>S.push({title,desc,cityId,events,nowDate});
// 1
add("מחזור רגיל, ראייה ביום","ראייה בבוקר, הפסק ביום החמישי, טבילה, וראייה שנייה אחרי 28 יום.","bnei-brak",c=>[ev("flow","2026-01-05","10:00",c),ev("hefsek","2026-01-09","15:30",c),ev("mikvah","2026-01-16","19:30",c),ev("flow","2026-02-02","11:00",c),ev("hefsek","2026-02-06","15:30",c)],"2026-02-07");
add("ראייה בלילה","ראייה ב-21:30 (אחרי צאת הכוכבים) — שייכת ליום העברי הבא, עונת לילה.","jerusalem",c=>[ev("flow","2026-03-10","21:30",c)],"2026-03-12");
add("ראייה 10 דקות אחרי השקיעה (בין השמשות)","ספק יום ספק לילה. בכל השיטות כאן: חוששים לשתי העונות; ההמתנה נספרת מהיום המאוחר.","netanya",c=>[ev("flow","2026-04-20",T("2026-04-20",c,10),c)],"2026-04-22");
add("ראייה 2 דקות לפני השקיעה","לפני השקיעה המחושבת, אבל בתוך מרווח הספק של 3 דקות.","haifa",c=>[ev("flow","2026-05-12",T("2026-05-12",c,-2),c)],"2026-05-14");
add("ראייה 25 דקות אחרי השקיעה","לפי 8.5° (אשכנז, חב״ד) עדיין בין השמשות; לפי 20 דקות (הגדרת ספרד כאן) כבר לילה ודאי.","tel-aviv",c=>[ev("flow","2026-06-15",T("2026-06-15",c,25),c)],"2026-06-17");
add("ראייה בל׳ ניסן (אייר חסר)","עונת החודש: בחודש אייר אין ל׳. ברירת המחדל: א׳ סיון.","jerusalem",c=>[ev("flow",N(30,1,5786),"10:00",c)],addDays(N(30,1,5786),2));
add("שנה מעוברת: אדר א׳ ← אדר ב׳","ראייה בי״ב אדר א׳ תשפ״ז; עונת החודש בי״ב אדר ב׳.","beersheba",c=>[ev("flow",N(12,12,5787),"09:00",c)],addDays(N(12,12,5787),2));
add("ראתה פעמיים באותו חודש","ראייה בה׳ ניסן, הפסק, וראייה נוספת בכ״ה ניסן.","bnei-brak",c=>[ev("flow",N(5,1,5786),"10:00",c),ev("hefsek",N(9,1,5786),"16:00",c),ev("flow",N(25,1,5786),"10:00",c)],addDays(N(25,1,5786),1));
add("המתנה: ראתה בליל שני","ראייה ביום ראשון 2026-11-01 בשעה 21:00 (ליל שני). אשכנז וחב״ד: הפסק מיום שישי. הרב עובדיה: מיום חמישי.","netanya",c=>[ev("flow","2026-11-01","21:00",c)],"2026-11-02");
add("הפסק 8 דקות אחרי השקיעה","ראייה ביום, הפסק ביום החמישי 8 דקות אחרי השקיעה. אשכנז וחב״ד: אינו תקף. הרב עובדיה: תקף בדיעבד (מסומן לבירור).","jerusalem",c=>[ev("flow","2026-07-06","10:00",c),ev("hefsek","2026-07-10",T("2026-07-10",c,8),c)],"2026-07-11");
add("הפלגה ארוכה ואחריה קצרה","מרווחים של 35 ואחר כך 26 ימים, כל מחזור עם הפסק וטבילה. בודקים אם הפלגת 35 נשמרת.","haifa",c=>{const a="2026-01-04",b=addDays(a,34),d=addDays(b,25);return [ev("flow",a,"10:00",c),ev("hefsek",addDays(a,4),"15:30",c),ev("mikvah",addDays(a,11),"20:30",c),ev("flow",b,"10:00",c),ev("hefsek",addDays(b,4),"15:30",c),ev("mikvah",addDays(b,11),"20:30",c),ev("flow",d,"10:00",c),ev("hefsek",addDays(d,4),"15:30",c)];},"2026-03-10");
add("ליל טבילה בליל שבת","הפסק ביום שישי 2026-10-23; היום השביעי הוא יום שישי 2026-10-30, וליל הטבילה ליל שבת (מסומן לבירור).","tel-aviv",c=>[ev("flow","2026-10-18","10:00",c),ev("hefsek","2026-10-23","15:00",c)],"2026-10-25");
add("ליל טבילה ביום הכיפורים","הפסק ב-2026-09-13; היום השביעי 2026-09-20, וליל הטבילה ליל יום הכיפורים (מסומן לבירור).","jerusalem",c=>[ev("flow","2026-09-08","10:00",c),ev("hefsek","2026-09-13","16:00",c)],"2026-09-15");
const PRESETS=[["ashkenaz","מנהג אשכנז הרווח"],["sefard","הרב עובדיה יוסף / ספרד"],["chabad","מנהג חב״ד"]];
const KIND={average:"עונה בינונית",monthly:"עונת החודש",interval:"הפלגה","or-zarua":"אור זרוע",hefsek:"הפסק",mikvah:"טבילה"};
let out=[];
S.forEach((sc,i)=>{
  const evs=sc.events(sc.cityId), c=city(sc.cityId);
  out.push(`## ${i+1}. ${sc.title}\n\n${sc.desc}\n\n**עיר:** ${c.name}  \n**רישומים (שעון מקומי):**\n`);
  for (const e of evs) { let h=""; try{const s=M.stamp(e);h=`${s.hebrewDate}, ${s.onah==="day"?"עונת יום":"עונת לילה"}${s.uncertain?" (סמוך לגבול)":""}`;}catch{} out.push(`- ${{flow:"ראייה",hefsek:"הפסק טהרה",mikvah:"טבילה"}[e.type]}: ${e.date} (יום ${wd(e.date)}) ${e.time} — ${h}`); }
  const now=localInstant(sc.nowDate,"12:00",c.tz);
  out.push(`\n**זמן החישוב המדומה:** ${sc.nowDate} 12:00\n`);
  for (const [k,label] of PRESETS) {
    const st=emptyState(); st.settings=M.applyPreset({...st.settings,cityId:sc.cityId},k); st.events=evs;
    const r=calculate(M.parseState(st),now);
    out.push(`### ${label}\n`);
    if (r.earliestHefsek && r.phase==="waiting") out.push(`- הפסק מוקדם ביותר: ${hebrew(r.earliestHefsek)} (${r.earliestHefsek}, יום ${wd(r.earliestHefsek)}), לפני השקיעה`);
    if (r.hefsek) { const h=M.hd(r.hefsek.date).abs(); out.push(`- הפסק שנספר: ${r.hefsek.date} ${r.hefsek.time}`); out.push(`- שבעה נקיים: ${hebrew(addDays(r.immersionDate,-6))} עד ${hebrew(r.immersionDate)} (${addDays(r.immersionDate,-6)} – ${r.immersionDate})`); }
    else if (r.phase!=="immersed" && evs.some(e=>e.type==="hefsek")) out.push(`- ההפסק האחרון לא התקבל אוטומטית (ראו נקודות לבירור)`);
    const mk=r.plans.find(p=>p.kind==="mikvah"); if (mk) out.push(`- ליל טבילה: מוצאי ${hebrew(mk.date)} (${mk.date}, יום ${wd(mk.date)}), מ-${timeInZone(new Date(mk.start),c.tz)}`);
    const on=r.plans.filter(p=>["average","monthly","interval","or-zarua"].includes(p.kind));
    if (on.length) { out.push(`- עונות פרישה:`); for (const p of on) { const hdte=p.onah==="day"?hebrew(p.date):hebrew(addDays(p.date,1)); out.push(`  - ${KIND[p.kind]}${p.title.includes("·")?" ("+p.title.split(" · ").slice(1).join(", ")+")":""}: ${p.onah==="day"?"עונת יום":"ליל"} ${hdte} — ${p.onah==="day"?p.date:p.date+" בערב"} ${timeInZone(new Date(p.start),c.tz)}–${timeInZone(new Date(p.end),c.tz)}`); } }
    else out.push(`- עונות פרישה: אין`);
    const rv=r.reviews.filter(x=>!/^missing-day|^no-mikvah|^immersion-no/.test(x.id)).map(x=>x.title);
    if (rv.length) out.push(`- נקודות לבירור: ${[...new Set(rv)].join("; ")}`);
    out.push("");
  }
  out.push(`**תוצאה בשבע לב:** ☐ תואם ☐ לא תואם — הערות: ______\n`);
});
module.exports = () => out.join("\n");
if (require.main === module) process.stdout.write(out.join("\n"));
