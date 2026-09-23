#!/usr/bin/env python3
"""Generate the branded 1200x630 share cards (og:image) and the PNG favicon.

Maintenance tooling, run on demand (requires Python 3 with Pillow):
    python3 scripts/make-share-images.py

The generated files are committed like other school media so the Node build
stays deterministic and dependency-free. Re-run after changing a chapter
phrase or photograph, then rebuild the site.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUT = ASSETS / "og"

WINE = (80, 28, 47)          # #501c2f
WINE_DEEP = (56, 19, 33)     # #381321
IVORY = (250, 244, 233)      # #faf4e9
GOLD = (208, 173, 114)       # #d0ad72
GOLD_SOFT = (231, 201, 141)  # #e7c98d
ROSE_MUTED = (195, 160, 169) # #c3a0a9

SANS = ASSETS / "font-0.ttf"      # DM Sans 400
SANS_MEDIUM = ASSETS / "font-1.ttf"  # DM Sans 500
CASLON = ASSETS / "font-4.ttf"    # Libre Caslon Display

# chapter key -> (two phrase lines, photo file)
CARDS = {
    "home": (("A place to learn.", "A life of purpose."), "a2"),
    "our-school": (("Rooted in faith.", "Growing with purpose."), "visit001"),
    "learning": (("Curious minds.", "Confident futures."), "mater_class"),
    "school-life": (("A place to belong.", "A story to be part of."), "mamss_students"),
    "admissions": (("A new chapter.", "A world of possibility."), "mamssads2027"),
    "resources": (("The right resource.", "Right here."), "a1"),
    "school-desk": (("A little more organised.", "A little more you."), "visit031"),
    "contact": (("Every new beginning", "starts with a conversation."), "visit005"),
}


def font(path, size):
    return ImageFont.truetype(str(path), size)


def spaced(draw, xy, text, fnt, fill, spacing, anchor_left=True):
    """Draw text with manual letter spacing; return the end x."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + spacing
    return x


def spaced_width(draw, text, fnt, spacing):
    return sum(draw.textlength(ch, font=fnt) for ch in text) + spacing * max(len(text) - 1, 0)


def cover(img, w, h):
    """Crop-to-fill the target box."""
    ratio = max(w / img.width, h / img.height)
    resized = img.resize((round(img.width * ratio), round(img.height * ratio)), Image.LANCZOS)
    left = (resized.width - w) // 2
    top = max((resized.height - h) // 3, 0)  # favour faces above the centre line
    return resized.crop((left, top, left + w, top + h))


def arch(size):
    """Arch-shaped (rounded-top) alpha mask."""
    w, h = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    r = w // 2
    d.ellipse((0, 0, w, 2 * r), fill=255)
    d.rectangle((0, r, w, h), fill=255)
    return mask


def make_card(slug, phrase, photo):
    line1, line2 = phrase
    S = 2  # supersample
    W, H = 1200 * S, 630 * S
    img = Image.new("RGB", (W, H), WINE)

    # Subtle vertical glow behind the text column.
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-500 * S, -260 * S, 900 * S, 880 * S), fill=26)
    overlay = Image.new("RGB", (W, H), (100, 38, 58))
    img = Image.composite(overlay, img, glow)

    d = ImageDraw.Draw(img)

    # Photo panel: gold-backed arch on the right.
    panel_w, panel_h = 455 * S, 530 * S
    panel_x, panel_y = 700 * S, 50 * S
    frame = Image.new("RGB", (panel_w + 16 * S, panel_h + 16 * S), GOLD)
    photo_img = Image.open(ASSETS / (photo + ".webp")).convert("RGB")
    photo_img = cover(photo_img, panel_w, panel_h)
    mask = arch((panel_w, panel_h))
    frame.paste(photo_img, (8 * S, 8 * S), mask)
    img.paste(frame, (panel_x, panel_y), arch((panel_w + 16 * S, panel_h + 16 * S)))

    # Crest badge.
    crest = Image.open(ASSETS / "crest.webp").convert("RGBA")
    disc_d = 96 * S
    badge = Image.new("RGBA", (disc_d, disc_d), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    bd.ellipse((0, 0, disc_d - 1, disc_d - 1), fill=IVORY, outline=GOLD, width=3 * S)
    inner = disc_d - 14 * S
    crest = crest.resize((inner, inner), Image.LANCZOS)
    circle = Image.new("L", (inner, inner), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, inner - 1, inner - 1), fill=255)
    badge.paste(crest, (7 * S, 7 * S), circle)
    img.paste(badge, (72 * S, 56 * S), badge)

    # Wordmark beside the crest.
    lock_x = 72 * S + disc_d + 26 * S
    word_fnt = font(SANS_MEDIUM, 27 * S)
    d.text((lock_x, 66 * S), "MATER MISERICORDIAE", font=word_fnt, fill=IVORY)
    d.text((lock_x, 108 * S), "SECONDARY SCHOOL", font=font(SANS, 19 * S), fill=GOLD_SOFT)

    # Chapter phrase, auto-fitted to the column.
    column = 590 * S
    size = 58 * S
    while size > 40 * S:
        phrase_fnt = font(CASLON, size)
        w1 = d.textlength(line1, font=phrase_fnt)
        w2 = d.textlength(line2, font=phrase_fnt)
        if max(w1, w2) <= column:
            break
        size -= 2 * S
    phrase_fnt = font(CASLON, size)
    y = 226 * S
    for line in (line1, line2):
        d.text((72 * S, y), line, font=phrase_fnt, fill=IVORY)
        y += int(size * 1.24)

    # Rule and location.
    rule_y = y + 26 * S
    d.rectangle((72 * S, rule_y, 136 * S, rule_y + 3 * S), fill=GOLD)
    loc = "RUMUOMASI · PORT HARCOURT"
    spaced(d, (72 * S, rule_y + 26 * S), loc, font(SANS, 20 * S), GOLD, 3 * S)

    # Motto footer.
    motto = "FAITH. CHARACTER. EXCELLENCE."
    spaced(d, (72 * S, 566 * S), motto, font(SANS, 16 * S), ROSE_MUTED, 4 * S)

    card = img.resize((1200, 630), Image.LANCZOS)
    OUT.mkdir(exist_ok=True)
    card.save(OUT / (slug + ".jpg"), quality=87, optimize=True, progressive=True)
    return OUT / (slug + ".jpg")


def make_favicon():
    crest = Image.open(ASSETS / "crest.webp").convert("RGBA")
    big = 192
    circle = Image.new("L", (big, big), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, big - 1, big - 1), fill=255)
    out = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    out.paste(crest.resize((big, big), Image.LANCZOS), (0, 0), circle)
    out.resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon-48.png", optimize=True)


if __name__ == "__main__":
    for slug, (phrase, photo) in CARDS.items():
        path = make_card(slug, phrase, photo)
        print("share card", path.relative_to(ROOT), path.stat().st_size, "bytes")
    make_favicon()
    print("favicon", (ASSETS / "favicon-48.png").stat().st_size, "bytes")
