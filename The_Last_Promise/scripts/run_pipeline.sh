#!/usr/bin/env bash
# Waits for the 720p sample render, assembles it, then renders the whole film at preview size and assembles it.
cd "$(dirname "$0")/.."
until [ -f renders/sample/frame_0480.png ]; do sleep 30; done
sleep 5
python3 scripts/assemble.py sample > renders/assemble_sample.log 2>&1 && echo "SAMPLE_ASSEMBLED" || echo "SAMPLE_ASSEMBLE_FAILED"
bash scripts/render_all.sh 640 360 > renders/render_all.log 2>&1 && echo "FILM_DONE" || echo "FILM_FAILED"
