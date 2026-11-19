"""בודק את מגבלות האורך של הטקסטים ב-store/listing.md (Play: שם 30, קצר 80, מלא 4000; Apple: שם/כותרת משנה 30, קידום 170, מילות מפתח 100)."""
import pathlib, re, sys
t = pathlib.Path(__file__).with_name("listing.md").read_text(encoding="utf-8")
limits = [("שם האפליקציה", 30), ("App name", 30), ("תיאור קצר", 80), ("Short description", 80), ("תיאור מלא", 4000), ("Full description", 4000),
          ("שם**", 30), ("Name**", 30), ("כותרת משנה", 30), ("Subtitle**", 30), ("טקסט קידום", 170), ("Promotional text", 170), ("מילות מפתח", 100), ("Keywords**", 100)]
bad = 0
for label, lim in limits:
    for m in re.finditer(re.escape(label) + r"[^\n]*\n```\n(.*?)\n```", t, re.S):
        n = len(m.group(1).encode("utf-8")) if "eywords" in label or "מפתח" in label else len(m.group(1))
        ok = n <= lim
        bad += not ok
        print(f"{'OK  ' if ok else 'LONG'} {n:5}/{lim:<5} {label}: {m.group(1)[:50]!r}")
sys.exit(1 if bad else 0)
