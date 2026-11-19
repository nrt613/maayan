# מייצר את סמל מעיין: הלוגו (מעיין נובע מתוך אדווה) בלבן, על משטח מעוגל בצבעי האפליקציה (ורד-פטל ללילך)
# שימוש: python3 brand/icon.py brand/out   ואחר כך מעתיקים: icons/, android/res, android/splash.png, ios/assets, LOGO_IMG ב-src/app.js
from PIL import Image, ImageDraw
import math, os, sys
S = 2048  # ציור בגודל כפול להחלקה
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = Image.open(os.path.join(HERE, "src", "logo.png")).convert("RGBA")
BG = (251, 248, 249)                                          # --bg של האפליקציה
STOPS = [(0.0, (240, 128, 160)), (0.5, (200, 62, 120)), (1.0, (132, 96, 232))]  # ורד ← פטל ← לילך


def white_logo():
    """הלוגו בלבן: הקשת הכהה אטומה, והקשת הבהירה שקופה מעט (כמו שני הגוונים במקור)"""
    px = LOGO.load(); out = Image.new("RGBA", LOGO.size, (0, 0, 0, 0)); po = out.load()
    for y in range(LOGO.height):
        for x in range(LOGO.width):
            r, g, b, a = px[x, y]
            if a:
                light = (r + g + b) / 3 > 170
                po[x, y] = (255, 255, 255, int(a * (0.84 if light else 1)))
    return out


WHITE = white_logo()


def gradient(size):
    """מעבר צבע אלכסוני רך, עם הילה בהירה בפינה העליונה"""
    g = Image.new("RGB", (size, size)); p = g.load()
    for y in range(size):
        for x in range(size):
            t = min(1, max(0, (x * 0.35 + y * 0.65) / size))
            for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
                if t <= t1:
                    k = (t - t0) / (t1 - t0); c = [c0[i] + (c1[i] - c0[i]) * k for i in range(3)]; break
            d = math.hypot(x - size * 0.22, y - size * 0.1) / size  # הילה
            glow = max(0, 1 - d / 0.75) ** 2 * 0.28
            p[x, y] = tuple(int(v + (255 - v) * glow) for v in c)
    return g


_G = {}
def grad(size):
    if size not in _G:
        _G[size] = gradient(512).resize((size, size), Image.BICUBIC)
    return _G[size]


def art(size, scale=1.0, with_bg=True, radius=0.225):
    """הסמל: לוגו לבן במרכז, על רקע מדורג. scale: גודל הלוגו ביחס לקנבס"""
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    w = int(size * scale * 0.66); h = int(w * WHITE.height / WHITE.width)
    lg = WHITE.resize((w, h), Image.LANCZOS)
    fg.paste(lg, ((size - w) // 2, (size - h) // 2 + int(size * 0.02)), lg)
    if not with_bg: return fg
    out = Image.alpha_composite(grad(size).convert("RGBA"), fg)
    if radius:
        mask = Image.new("L", (size, size), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius), fill=255)
        out.putalpha(mask)
    return out


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    full = art(S)                       # מעוגל, לאתר ול-Windows
    square = art(S, radius=0)           # מלא: iOS (המערכת מעגלת בעצמה) ו-maskable
    square.convert("RGB").resize((1024, 1024), Image.LANCZOS).save(f"{out}/AppIcon-1024.png")
    full.resize((1024, 1024), Image.LANCZOS).save(f"{out}/icon-1024.png")
    for n in (512, 192, 32):
        full.resize((n, n), Image.LANCZOS).save(f"{out}/icon-{n}.png")
    square.convert("RGB").resize((180, 180), Image.LANCZOS).save(f"{out}/icon-180.png")  # apple-touch-icon: בלי שקיפות
    art(S, scale=.8, radius=0).resize((512, 512), Image.LANCZOS).save(f"{out}/icon-maskable-512.png")
    full.resize((256, 256), Image.LANCZOS).save(f"{out}/maayan.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    # הלוגו הלבן לסמל שבראש המסך ובמסך הנעילה (הרקע המדורג מצויר ב-CSS)
    m = Image.new("RGBA", (S, S), (0, 0, 0, 0)); w = int(S * 0.8); h = int(w * WHITE.height / WHITE.width)
    m.paste(WHITE.resize((w, h), Image.LANCZOS), ((S - w) // 2, (S - h) // 2 + int(S * .03)))
    m.resize((112, 112), Image.LANCZOS).save(f"{out}/logo-white-112.png", optimize=True)
    # אנדרואיד: סמל רגיל, עגול, ושכבות לסמל מותאם (108dp, אזור בטוח 66dp)
    dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    fgl = art(S, scale=.62, with_bg=False); bgl = grad(432).convert("RGBA")
    for d, f in dens.items():
        p = f"{out}/android/mipmap-{d}"; os.makedirs(p, exist_ok=True)
        n = int(48 * f); a = int(108 * f)
        full.resize((n, n), Image.LANCZOS).save(f"{p}/ic_launcher.png")
        circ = square.resize((n, n), Image.LANCZOS); mk = Image.new("L", (n * 4, n * 4), 0); ImageDraw.Draw(mk).ellipse([0, 0, n * 4 - 1, n * 4 - 1], fill=255); circ.putalpha(mk.resize((n, n), Image.LANCZOS)); circ.save(f"{p}/ic_launcher_round.png")
        fgl.resize((a, a), Image.LANCZOS).save(f"{p}/ic_launcher_foreground.png")
        bgl.resize((a, a), Image.LANCZOS).save(f"{p}/ic_launcher_background.png")
    # מסך פתיחה: הסמל במרכז, על הרקע הבהיר של האפליקציה, עם צל רך
    from PIL import ImageFilter
    sp = Image.new("RGBA", (2732, 2732), BG + (255,)); n = 520; ic = full.resize((n, n), Image.LANCZOS)
    sh = Image.new("RGBA", (2732, 2732), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([(2732 - n) // 2, (2732 - n) // 2 + 30, (2732 + n) // 2, (2732 + n) // 2 + 30], radius=int(n * .225), fill=(150, 40, 90, 70))
    sp = Image.alpha_composite(sp, sh.filter(ImageFilter.GaussianBlur(40)))
    sp.paste(ic, ((2732 - n) // 2, (2732 - n) // 2), ic); sp.convert("RGB").save(f"{out}/splash.png")
    print("ok")
