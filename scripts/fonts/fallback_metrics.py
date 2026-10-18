"""Prints @font-face overrides that make a local fallback occupy the same space as IBM Plex Sans Arabic
(less layout shift when the web font swaps in). Run: .venv/Scripts/python scripts/fonts/fallback_metrics.py <fallback.ttf>

size-adjust = average advance of sample Arabic text in Plex / in the fallback (same method as next/font,
with Arabic text instead of Latin). Ascent/descent overrides are Plex's, divided by size-adjust.
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
SAMPLE = "سوريا كما هي اليوم عن قرب معلومات مؤرخة وناس على الأرض وصور من المكان نفسه حال البلد اليوم ماذا ترى ماذا تأكل"


def avg_advance(font: TTFont) -> float:
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    widths = [hmtx[cmap[ord(c)]][0] / upm for c in SAMPLE if ord(c) in cmap]
    return sum(widths) / len(widths)


plex = TTFont(ROOT / "src/og/fonts/plex-arabic-400.ttf")
fallback = TTFont(sys.argv[1])
ratio = avg_advance(plex) / avg_advance(fallback)
hhea, upm = plex["hhea"], plex["head"].unitsPerEm
print(f"size-adjust: {ratio * 100:.2f}%;")
print(f"ascent-override: {hhea.ascent / upm / ratio * 100:.2f}%;")
print(f"descent-override: {abs(hhea.descent) / upm / ratio * 100:.2f}%;")
print("line-gap-override: 0%;")
