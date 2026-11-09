#!/usr/bin/env bash
# Render all six scenes at the given resolution and assemble the film.
#   bash scripts/render_all.sh 640 360
set -e
cd "$(dirname "$0")/.."
W=${1:-640}; H=${2:-360}
for i in 1 2 3 4 5 6; do
  echo "== scene $i ($W x $H)"
  xvfb-run -a blender -b --python scripts/scene$i.py -- $W $H render 2>&1 | grep -E "RENDER_DONE|Error|Traceback" || true
done
python3 scripts/assemble.py film
