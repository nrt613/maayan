import pathlib
s=pathlib.Path("src")
css=(s/"styles.css").read_text(); js="\n".join((s/f).read_text() for f in ["core.js","i18n.js","i18n-dict.js","tests.js","scenarios.js","widget.js","app.js"])
head='''<title>מעיין</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="יומן טהרת המשפחה — חינמי, פרטי, פועל כולו בטלפון">
<meta name="theme-color" content="#7f5370">
<meta name="color-scheme" content="light only">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bellefair&family=Heebo:wght@300;400;500;600&display=swap">
<style>'''+css+'''</style>'''
body='''<div id="app" dir="rtl" lang="he"></div><div id="modal" dir="rtl" lang="he"></div><div id="toast" dir="rtl" lang="he"></div>
<script>document.documentElement.lang="he";document.documentElement.dir="rtl";
'''+js+'''</script>'''
d=pathlib.Path("dist");d.mkdir(exist_ok=True)
(d/"maayan-artifact.html").write_text(head+"\n"+body)
import base64, json, re
iu="data:image/png;base64,"+base64.b64encode(pathlib.Path("brand/out/icon-32.png").read_bytes()).decode()
GF=re.compile(r'<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>')
SF='<style id="sf">'+''.join('@font-face{font-family:"%s";src:url("fonts/%s") format("truetype"),url("%s") format("truetype");font-weight:100 900;font-display:swap}'%(n,f,f) for n,f in [("Bellefair","bellefair.ttf"),("Heebo","heebo.ttf")])+'</style>'
full='<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<link rel="icon" href="'+iu+'"><link rel="apple-touch-icon" href="icons/icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="מעיין">\n<link rel="manifest" href="manifest.json">\n'+GF.sub('',head)+SF+'\n</head><body>\n'+body+'\n</body></html>\n'
(d/"maayan.html").write_text(full)
# קבצי האתר: מניפסט להתקנה למסך הבית ו-service worker לעבודה בלי רשת
man={"name":"מעיין","short_name":"מעיין","description":"יומן טהרת המשפחה","lang":"he","dir":"rtl","display":"standalone","start_url":"./","scope":"./","background_color":"#f4f1f2","theme_color":"#7f5370",
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
(d/"manifest.json").write_text(json.dumps(man,ensure_ascii=False,indent=1))
(d/"sw.js").write_text("""// מעיין: שמירת האפליקציה לעבודה בלי רשת. קודם רשת (כדי לקבל עדכונים), ואם אין — מהמטמון.
const C = "maayan-v2";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(["./", "manifest.json", "icons/icon-192.png", "fonts/bellefair.ttf", "fonts/heebo.ttf"])).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/download/")) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
""")
# גרסה בלי אינטרנט (מחשב Windows): הגופנים מוטמעים בקובץ עצמו
F=pathlib.Path("fonts")
ff="".join('@font-face{font-family:"%s";src:url(data:font/ttf;base64,%s) format("truetype");font-weight:100 900;font-display:swap}'%(n,base64.b64encode((F/f).read_bytes()).decode()) for n,f in [("Bellefair","bellefair.ttf"),("Heebo","heebo.ttf")])
import re
off=re.sub(r'<style id="sf">.*?</style>|<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>|<link rel="manifest"[^>]*>|<link rel="apple-touch-icon"[^>]*>',"",full).replace("<style>","<style>"+ff,1)
assert "fonts.googleapis" not in off
(d/"maayan-offline.html").write_text(off)
print(len(full), len(off))
