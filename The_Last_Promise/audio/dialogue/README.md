# Dialogue tracks

* `generated/` - placeholder voices synthesised with espeak-ng (clearly synthetic; used for timing).
* `recorded/`  - drop real recordings here using the SAME file names (e.g. `s3_02_grace.wav`,
  44.1 kHz WAV). Re-run `python3 scripts/audio/make_dialogue.py` then `python3 scripts/assemble.py`;
  the recorded take replaces the placeholder and subtitle timing follows the recording's length.
* `lines.json` - the line list with measured durations (generated).
