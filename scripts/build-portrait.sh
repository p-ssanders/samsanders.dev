#!/bin/sh
# Usage: sh scripts/build-portrait.sh /path/to/original-transparent-portrait.png
# Requires cwebp (libwebp). Generate directly from the original, not a lossy WebP.
set -eu
source_png="${1:?Pass the original transparent portrait PNG}"
case "$source_png" in
  /*) ;;
  *) source_png="$(pwd)/$source_png" ;;
esac
cd "$(dirname "$0")/.."
for width in 280 390 560 780; do
  cwebp -quiet -q 75 -alpha_q 60 -m 6 -sharp_yuv -resize "$width" 0 \
    "$source_png" \
    -o "images/portrait-v2-$width.webp"
done
