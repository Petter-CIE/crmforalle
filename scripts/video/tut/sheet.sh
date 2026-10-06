#!/bin/bash
# preview + contact sheet: sheet.sh <slug>
cd "$(dirname "$0")"
s=$1; d=videos/$s
node assets.mjs $s > $d/assets.log 2>&1 || { tail -5 $d/assets.log; exit 1; }
python3 render.py $s --preview > $d/preview.log 2>&1 || { tail -5 $d/preview.log; exit 1; }
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $d/$s-preview.mp4)
n=24; fps=$(python3 -c "print($n/$dur)")
ffmpeg -v error -y -i $d/$s-preview.mp4 -vf "fps=$fps,scale=400:-1,tile=6x4" -frames:v 1 $d/contact.png
echo "$s ok ${dur}s"
