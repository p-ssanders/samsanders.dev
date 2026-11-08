"""Build the heading-only Newsreader WOFF2; see fonts/README.md."""
from html.parser import HTMLParser
from pathlib import Path
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


class HeadingParser(HTMLParser):
    in_heading = False
    text = ""

    def handle_starttag(self, tag, attrs):
        if tag == "h1":
            self.in_heading = True

    def handle_endtag(self, tag):
        if tag == "h1":
            self.in_heading = False

    def handle_data(self, data):
        if self.in_heading:
            self.text += data


root = Path(__file__).resolve().parent.parent
heading = HeadingParser()
heading.feed((root / "index.html").read_text())
assert heading.text.strip(), "No heading text found"
font = instantiateVariableFont(TTFont(sys.argv[1]), {"wght": 500, "opsz": 40}, inplace=True)
options = subset.Options()
options.hinting = False
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=heading.text + "’")
subsetter.subset(font)
font.flavor = "woff2"
output = root / "fonts/newsreader-name-500-v1.woff2"
font.save(output)
print(f"{output.name}: {output.stat().st_size} bytes")
