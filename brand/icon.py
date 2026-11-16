# מייצר את סמל מעיין: טיפה לבנה מעל אדוות, על רקע ורוד-פטל מדורג
from PIL import Image, ImageDraw, ImageFilter
import math, sys
S = 2048  # ציור בגודל כפול להחלקה

def gradient(size):
    img = Image.new("RGB", (size, size))
    px = img.load()
    c0, c1, c2 = (200, 168, 190), (127, 83, 112), (64, 40, 58)
    for y in range(size):
        for x in range(0, size):
            t = (x * 0.35 + y * 0.9) / (size * 1.25)
            if t < .5: a, b, u = c0, c1, t / .5
            else: a, b, u = c1, c2, (t - .5) / .5
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3))
    return img

def droplet_mask(size, cx, cy, r, tip):
    m = Image.new("L", (size, size), 0); d = ImageDraw.Draw(m)
    dd = cy - tip; c = r / dd; s = math.sqrt(1 - c * c)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    d.polygon([(cx, tip), (cx - r * s, cy - r * c), (cx + r * s, cy - r * c)], fill=255)
    return m

def art(size, scale=1.0, with_bg=True, radius=0.225):
    """scale: גודל הציור ביחס לקנבס (לאייקון מותאם אנדרואיד צריך שוליים)"""
    bg = gradient(size).convert("RGBA")
    # הילה רכה למעלה
    glow = Image.new("L", (size, size), 0); gd = ImageDraw.Draw(glow)
    gd.ellipse([-size * .3, -size * .6, size * .8, size * .35], fill=46)
    glow = glow.filter(ImageFilter.GaussianBlur(size * .16))
    bg = Image.composite(Image.new("RGBA", (size, size), (255, 255, 255, 255)), bg, glow)
    fg = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    cx = size / 2; k = scale
    r = size * .205 * k; cy = size * (.5 + .035 * k); tip = cy - size * .40 * k
    # אדוות
    rip = Image.new("L", (size, size), 0); rd = ImageDraw.Draw(rip)
    for i, (w, a) in enumerate([(0.30, 190), (0.40, 110)]):
        rx = size * w * k; ry = rx * .30; y0 = cy + r * .86
        rd.ellipse([cx - rx, y0 - ry, cx + rx, y0 + ry], outline=a, width=max(2, int(size * .018 * k)))
    # מוחקים את החלק העליון של האדוות שמאחורי הטיפה
    cut = ImageDraw.Draw(rip); cut.rectangle([0, 0, size, cy + r * .78], fill=0)
    fg = Image.composite(Image.new("RGBA", (size, size), (255, 255, 255, 255)), fg, rip)
    # צל עדין לטיפה
    dm = droplet_mask(size, cx, cy, r, tip)
    sh = dm.filter(ImageFilter.GaussianBlur(size * .02)).point(lambda v: int(v * .28))
    sh_img = Image.new("RGBA", (size, size), (40, 20, 35, 255))
    off = Image.new("L", (size, size), 0); off.paste(sh, (0, int(size * .018)))
    fg = Image.composite(sh_img, fg, off)
    fg = Image.composite(Image.new("RGBA", (size, size), (255, 255, 255, 255)), fg, dm)
    # ברק קטן בתוך הטיפה
    hl = Image.new("L", (size, size), 0); hd = ImageDraw.Draw(hl)
    hd.ellipse([cx - r * .52, cy - r * .30, cx - r * .16, cy + r * .34], fill=255)
    hl = Image.composite(hl, Image.new("L", (size, size), 0), dm).filter(ImageFilter.GaussianBlur(size * .012)).point(lambda v: 0)
    fg = Image.composite(Image.new("RGBA", (size, size), (222, 205, 216, 255)), fg, hl)
    if not with_bg: return fg
    out = Image.alpha_composite(bg, fg)
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
    sp = Image.new("RGB", (2732, 2732), (244, 241, 242)); ic = full.resize((560, 560), Image.LANCZOS); sp.paste(ic, ((2732 - 560) // 2, (2732 - 560) // 2), ic); sp.save(f"{out}/splash.png")
    print("ok")
