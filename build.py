import pathlib
s=pathlib.Path("src")
css=(s/"styles.css").read_text(); js="\n".join((s/f).read_text() for f in ["core.js","i18n.js","i18n-dict.js","tests.js","scenarios.js","widget.js","app.js"])
head='''<title>מעיין</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="יומן טהרת המשפחה — חינמי, פרטי, פועל כולו בטלפון">
<meta name="theme-color" content="#fbf8f9">
<meta name="color-scheme" content="light only">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap">
<style>'''+css+'''</style>'''
body='''<div id="app" dir="rtl" lang="he"></div><div id="modal" dir="rtl" lang="he"></div><div id="toast" dir="rtl" lang="he"></div>
<script>document.documentElement.lang="he";document.documentElement.dir="rtl";
'''+js+'''</script>'''
d=pathlib.Path("dist");d.mkdir(exist_ok=True)
(d/"maayan-artifact.html").write_text(head+"\n"+body)
import base64, json, re
iu="data:image/png;base64,"+base64.b64encode(pathlib.Path("brand/out/icon-32.png").read_bytes()).decode()
GF=re.compile(r'<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>')
# גופן Rubik (משתנה, OFL) מקומי: שלוש קבוצות תווים, כל אחת בקובץ woff2 קטן, לפי unicode-range
FONTS=[("rubik-hebrew.woff2","U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F"),
 ("rubik-latin.woff2","U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"),
 ("rubik-latin-ext.woff2","U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF")]
face=lambda src,ur:'@font-face{font-family:"Rubik";src:%s;font-weight:300 900;font-style:normal;font-display:swap;unicode-range:%s}'%(src,ur)
SF='<style id="sf">'+''.join(face('url("fonts/%s") format("woff2"),url("%s") format("woff2")'%(f,f),ur) for f,ur in FONTS)+'</style>'
full='<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<link rel="icon" href="'+iu+'"><link rel="apple-touch-icon" href="icons/icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="מעיין">\n<link rel="manifest" href="manifest.json">\n'+GF.sub('',head)+SF+'\n</head><body>\n'+body+'\n</body></html>\n'
(d/"maayan.html").write_text(full)
# קבצי האתר: מניפסט להתקנה למסך הבית ו-service worker לעבודה בלי רשת
man={"name":"מעיין","short_name":"מעיין","description":"יומן טהרת המשפחה","lang":"he","dir":"rtl","display":"standalone","start_url":"./","scope":"./","background_color":"#fbf8f9","theme_color":"#fbf8f9",
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
(d/"manifest.json").write_text(json.dumps(man,ensure_ascii=False,indent=1))
(d/"sw.js").write_text("""// מעיין: שמירת האפליקציה לעבודה בלי רשת. קודם רשת (כדי לקבל עדכונים), ואם אין — מהמטמון.
const C = "maayan-v3";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(["./", "manifest.json", "icons/icon-192.png", "fonts/rubik-hebrew.woff2", "fonts/rubik-latin.woff2", "fonts/rubik-latin-ext.woff2"])).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/download/")) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
""")
# גרסה בלי אינטרנט (מחשב Windows): הגופנים מוטמעים בקובץ עצמו
F=pathlib.Path("fonts")
ff="".join(face('url(data:font/woff2;base64,%s) format("woff2")'%base64.b64encode((F/f).read_bytes()).decode(),ur) for f,ur in FONTS)
import re
off=re.sub(r'<style id="sf">.*?</style>|<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>|<link rel="manifest"[^>]*>|<link rel="apple-touch-icon"[^>]*>',"",full).replace("<style>","<style>"+ff,1)
assert "fonts.googleapis" not in off
(d/"maayan-offline.html").write_text(off)
print(len(full), len(off))
