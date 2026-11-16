# מייצר את סמל מעיין: אדוות מים בירוק מרווה וזהב על רקע שמנת
from PIL import Image, ImageDraw, ImageFilter
import math, sys
S = 2048  # ציור בגודל כפול להחלקה

SAGE, GOLD, CREAM = (127, 149, 131), (184, 154, 94), (251, 246, 238)

def gradient(size):
    # רקע שמנת רך, מעט בהיר יותר למעלה
    img = Image.new("RGB", (size, size)); px = img.load()
    c0, c1 = (255, 252, 246), (244, 236, 222)
    for y in range(size):
        u = y / size; c = tuple(int(c0[i] + (c1[i] - c0[i]) * u) for i in range(3))
        for x in range(size): px[x, y] = c
    return img

def art(size, scale=1.0, with_bg=True, radius=0.225):
    """אדוות מים: נקודה ושלושה עיגולים. scale: גודל הציור ביחס לקנבס"""
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(fg)
    cx = cy = size / 2; k = size * scale
    def ring(r, w, col):
        r *= k; w = max(2, int(w * k)); d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=w)
    ring(.385, .020, GOLD + (235,))
    ring(.285, .028, SAGE + (170,))
    ring(.180, .036, SAGE + (255,))
    r = .070 * k; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SAGE + (255,))
    if not with_bg: return fg
    out = Image.alpha_composite(gradient(size).convert("RGBA"), fg)
    if radius:
        mask = Image.new("L", (size, size), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius), fill=255)
        out.putalpha(mask)
    return out

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    import os
    os.makedirs(out, exist_ok=True)
    full = art(S)                       # מעוגל, לאתר ול-Windows
    square = art(S, radius=0)           # מלא, ל-maskable
    full.resize((1024, 1024), Image.LANCZOS).save(f"{out}/icon-1024.png")
    for n in (512, 192, 180, 32):
        full.resize((n, n), Image.LANCZOS).save(f"{out}/icon-{n}.png")
    art(S, scale=.78, radius=0).resize((512, 512), Image.LANCZOS).save(f"{out}/icon-maskable-512.png")
    full.resize((256, 256), Image.LANCZOS).save(f"{out}/maayan.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    # אנדרואיד: סמל רגיל, עגול, ושכבות לסמל מותאם (108dp, אזור בטוח 66dp)
    dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    fgl = art(S, scale=.62, with_bg=False); bgl = gradient(432).convert("RGBA")
    glow = art(S, scale=.62, radius=0)
    for d, f in dens.items():
        p = f"{out}/android/mipmap-{d}"; os.makedirs(p, exist_ok=True)
        n = int(48 * f); a = int(108 * f)
        full.resize((n, n), Image.LANCZOS).save(f"{p}/ic_launcher.png")
        circ = square.resize((n, n), Image.LANCZOS); m = Image.new("L", (n * 4, n * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, n * 4 - 1, n * 4 - 1], fill=255); circ.putalpha(m.resize((n, n), Image.LANCZOS)); circ.save(f"{p}/ic_launcher_round.png")
        fgl.resize((a, a), Image.LANCZOS).save(f"{p}/ic_launcher_foreground.png")
        bgl.resize((a, a), Image.LANCZOS).save(f"{p}/ic_launcher_background.png")
    # מסך פתיחה: סמל במרכז על רקע בהיר
    sp = Image.new("RGB", (2732, 2732), (251, 246, 238)); ic = full.resize((560, 560), Image.LANCZOS); sp.paste(ic, ((2732 - 560) // 2, (2732 - 560) // 2), ic); sp.save(f"{out}/splash.png")
    print("ok")
