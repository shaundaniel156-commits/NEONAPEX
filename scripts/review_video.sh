#!/usr/bin/env bash
# Quality-control helper: prints stream info, duration, audio loudness, and extracts a contact sheet of frames.
# usage: bash scripts/review_video.sh final/sample.mp4 [out.png] [count]
set -e
V=$1; OUT=${2:-/tmp/review.png}; N=${3:-8}
echo "== streams"; ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate,channels -of csv=p=0 "$V"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V"); echo "== duration ${DUR}s"
echo "== loudness (EBU R128)"; ffmpeg -v info -i "$V" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|LRA:|Peak:" | tail -3
TMP=$(mktemp -d); python3 - "$V" "$DUR" "$N" "$TMP" <<'PY'
import subprocess, sys
v, dur, n, tmp = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
for i in range(n):
    t = dur * (i + 0.5) / n
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', v, '-frames:v', '1', f'{tmp}/f{i:02d}.png'], check=True)
PY
python3 /home/user/NEONAPEX/scripts/grid.py "$TMP/f*.png" "$OUT"; echo "== contact sheet: $OUT"
