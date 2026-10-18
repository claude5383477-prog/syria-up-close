"""Subset IBM Plex Sans Arabic for the site (run via `npm run fonts:subset`).

Keeps: the Arabic block (letters, tashkeel, Arabic punctuation, Arabic-Indic and Extended
Arabic-Indic digits), Basic Latin (incl. 0-9), and the few general symbols the UI uses.
Layout features are kept so Arabic still joins and marks still position.

Outputs (committed):
  public/fonts/plex-arabic-{400,600,700}.v1.woff2   web fonts
  src/og/fonts/plex-arabic-{400,700}.ttf            for Open Graph images (Pango needs TTF)
"""
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "node_modules/@ibm/plex-sans-arabic/fonts/complete/woff2"
WEB = ROOT / "public/fonts"
OG = ROOT / "src/og/fonts"
VERSION = "v1"  # bump when the subset changes, so long-cached URLs change too

WEIGHTS = {"400": "Regular", "600": "SemiBold", "700": "Bold"}
OG_WEIGHTS = {"400", "700"}

UNICODES = [
    *range(0x0020, 0x007F),  # Basic Latin (incl. ASCII digits and punctuation)
    *range(0x0600, 0x0700),  # Arabic: letters, tashkeel, punctuation, ٠-٩ and ۰-۹
    0x00A0,  # no-break space
    0x00B7,  # middle dot ·
    0x00D7,  # multiplication sign ×
    0x200C, 0x200D, 0x200E, 0x200F,  # ZWNJ, ZWJ, LRM, RLM
    0x2013, 0x2014,  # en/em dash
    0x2018, 0x2019, 0x201C, 0x201D,  # quotes
    0x2026,  # ellipsis …
    0x2190, 0x2192, 0x2197,  # arrows ← → ↗
]


def run(src: Path, out: Path, flavor: str | None) -> None:
    opts = subset.Options()
    opts.layout_features = ["*"]  # keep init/medi/fina/liga/mark/mkmk/kern…
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    opts.flavor = flavor
    font = TTFont(src, recalcTimestamp=False)  # reproducible bytes on every run
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    out.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = flavor
    font.save(out)
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size / 1024:.1f}KB")


for weight, style in WEIGHTS.items():
    src = SRC / f"IBMPlexSansArabic-{style}.woff2"
    run(src, WEB / f"plex-arabic-{weight}.{VERSION}.woff2", "woff2")
    if weight in OG_WEIGHTS:
        run(src, OG / f"plex-arabic-{weight}.ttf", None)
