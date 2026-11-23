"""Make one 1200 x 630 share image per page into site/og/.

Run:  python3 site/_build/og.py
Reads the same content fragments as build.py (og_title and og_sub), plus the home page.
"""
import json, os, glob, math
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
OUT = os.path.join(SITE, "og")
os.makedirs(OUT, exist_ok=True)
INK, INK2, PAPER, LINE = (28, 31, 42), (93, 97, 112), (246, 243, 236), (223, 220, 210)
S1, S2, S3 = (44, 55, 102), (106, 58, 99), (47, 90, 69)


def font(size, bold=True):
    for path in (["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/Library/Fonts/Arial Bold.ttf"] if bold else
                 ["/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf"]):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def wrap(draw, text, f, width):
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=f) <= width:
            cur = trial
        else:
            lines.append(cur); cur = word
    lines.append(cur)
    return lines


def wheel(draw, cx, cy, R):
    then, now = [6, 5, 6, 6, 5, 5, 5, 6], [7, 4, 8, 6, 5, 7, 3, 6]
    def pt(i, v):
        a = -math.pi / 2 + i / 8 * 2 * math.pi
        return (cx + v / 10 * R * math.cos(a), cy + v / 10 * R * math.sin(a))
    for ring in (2, 4, 6, 8, 10):
        r = ring / 10 * R
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=LINE, width=2)
    for i in range(8):
        draw.line([(cx, cy), pt(i, 10)], fill=LINE, width=2)
    draw.polygon([pt(i, v) for i, v in enumerate(then)], fill=(44, 55, 102, 45), outline=S1)
    draw.polygon([pt(i, v) for i, v in enumerate(now)], fill=(47, 90, 69, 80), outline=S3)
    for i, v in enumerate(now):
        x, y = pt(i, v); draw.ellipse([x - 7, y - 7, x + 7, y + 7], fill=S3)


def card(slug, title, sub):
    img = Image.new("RGB", (1200, 630), PAPER)
    d = ImageDraw.Draw(img, "RGBA")
    # The mark, "Horizon": a solid circle with a level gap just below the middle (54 to 62 of 100).
    mx, my, ms = 72, 56, 50
    d.ellipse([mx + ms * 0.08, my + ms * 0.08, mx + ms * 0.92, my + ms * 0.92], fill=INK)
    d.rectangle([mx, my + ms * 0.54, mx + ms, my + ms * 0.62], fill=PAPER)
    d.text((138, 62), "The Alignment Plan", font=font(34), fill=INK)
    f = font(76)
    y = 190
    for line in wrap(d, title, f, 640):
        d.text((72, y), line, font=f, fill=INK); y += 88
    fs = font(34, bold=False)
    y += 14
    for line in wrap(d, sub, fs, 640):
        d.text((72, y), line, font=fs, fill=INK2); y += 46
    wheel(d, 940, 330, 190)
    d.rectangle([0, 618, 400, 630], fill=S1); d.rectangle([400, 618, 800, 630], fill=S2); d.rectangle([800, 618, 1200, 630], fill=S3)
    img.save(os.path.join(OUT, slug + ".png"), optimize=True)
    print("og/" + slug + ".png")


# The home page (and the 404 page) use the brand's own share image, made with the logo files in brand/logo.
import shutil
shutil.copyfile(os.path.join(HERE, "social-1200x630.png"), os.path.join(OUT, "home.png"))
print("og/home.png (brand share image)")
for path in sorted(glob.glob(os.path.join(HERE, "content", "*.html"))):
    meta = json.loads(open(path, encoding="utf-8").readline())
    card(meta["slug"], meta["og_title"], meta["og_sub"])
