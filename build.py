import pathlib
s=pathlib.Path("src")
css=(s/"styles.css").read_text(); js="\n".join((s/f).read_text() for f in ["core.js","tests.js","scenarios.js","app.js"])
head='''<title>מעיין</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="יומן טהרת המשפחה — חינמי, פרטי, פועל כולו בטלפון">
<meta name="theme-color" content="#0f2a24">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;600&family=Rubik:wght@400;500;600;700&display=swap">
<style>'''+css+'''</style>'''
body='''<div id="app" dir="rtl" lang="he"></div><div id="modal" dir="rtl" lang="he"></div><div id="toast" dir="rtl" lang="he"></div>
<script>document.documentElement.lang="he";document.documentElement.dir="rtl";
'''+js+'''</script>'''
d=pathlib.Path("dist");d.mkdir(exist_ok=True)
(d/"maayan-artifact.html").write_text(head+"\n"+body)
icon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#c3f4d9"/><path d="M32 54a17 17 0 0 0 17-17c0-5-2.4-9.4-7.2-13.2S33.2 14 32 8c-1.2 6-4.8 11.8-9.6 15.8S15 32 15 37a17 17 0 0 0 17 17z" fill="none" stroke="#123a2f" stroke-width="4" stroke-linejoin="round"/></svg>'
import urllib.parse, json
iu="data:image/svg+xml,"+urllib.parse.quote(icon)
man=json.dumps({"name":"מעיין","short_name":"מעיין","lang":"he","dir":"rtl","display":"standalone","start_url":".","background_color":"#f2f6f3","theme_color":"#0f2a24","icons":[{"src":iu,"sizes":"any","type":"image/svg+xml"}]},ensure_ascii=False)
full='<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<link rel="icon" href="'+iu+'"><link rel="apple-touch-icon" href="'+iu+'"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">\n<link rel="manifest" href="data:application/manifest+json,'+urllib.parse.quote(man)+'">\n'+head+'\n</head><body>\n'+body+'\n</body></html>\n'
(d/"maayan.html").write_text(full)
print(len(full))
