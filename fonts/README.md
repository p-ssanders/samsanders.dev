# Heading font

Newsreader by Production Type, licensed under the SIL Open Font License (included
in `OFL-Newsreader.txt`). The site serves one local WOFF2: weight 500, optical size
40, subset to the `h1` text plus a curly apostrophe. Body text uses system fonts.

`font-display: optional` allows the browser to keep the Georgia fallback on a slow
first visit instead of swapping late. The small font is preloaded and cached by
the service worker. No font service is contacted by visitors.

## Rebuilding after a heading change

Source: [Google Fonts Newsreader](https://github.com/google/fonts/tree/main/ofl/newsreader).
The source `Newsreader[opsz,wght].ttf` used here has SHA-256
`8a08d13f8a6c0d51be379a60af84f945f65369a67e509ee3c3bdcc421254d7c1`.

Download that TTF, then run this development-only command from the repository:

```sh
uv run --with 'fonttools[woff]==4.65.0' scripts/build-heading-font.py /path/to/Newsreader.ttf
```

If the generated font changes, increment the font filename version in the script,
CSS, preload, and service-worker asset list, and increment the service-worker
cache version. Recompute the inline style's CSP hash after CSS changes. This
avoids retaining an old font through the cache-first font strategy.

Keep this font limited to the heading: it intentionally omits unused characters.
