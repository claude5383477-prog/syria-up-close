#!/usr/bin/env bash
# Contact sheets for reviewing harvest/<slug>.json by eye: 6x5 tiles, each labelled with its index.
set -u
cd harvest
for f in *.json; do
  slug="${f%.json}"
  [ "$slug" = summary ] && continue
  mkdir -p "thumbs/$slug" sheets
  n=$(jq length "$f")
  for ((i = 0; i < n; i++)); do
    url=$(jq -r ".[$i].tiny" "$f")
    out="thumbs/$slug/$(printf %03d "$i").jpg"
    curl -sfL -A 'SyriaUpClose/1.0 (https://upclosesyria.com; photo-harvest)' --max-time 30 "$url" -o "$out.raw" &&
      convert "$out.raw[0]" -resize 240x180^ -gravity center -extent 240x180 "$out" 2>/dev/null ||
      convert -size 240x180 xc:gray "$out"
    rm -f "$out.raw"
    sleep 0.15
  done
  files=(thumbs/$slug/*.jpg)
  per=30
  for ((s = 0; s * per < ${#files[@]}; s++)); do
    chunk=("${files[@]:s*per:per}")
    args=()
    for p in "${chunk[@]}"; do args+=(-label "$(basename "$p" .jpg)" "$p"); done
    montage "${args[@]}" -tile 6x5 -geometry 240x180+4+4 -pointsize 18 "sheets/$slug-$s.jpg"
  done
done
