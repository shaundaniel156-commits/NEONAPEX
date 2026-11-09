"""Generate the dialogue tracks.

PLACEHOLDER VOICES: this uses espeak-ng (the only text-to-speech engine available
offline on this machine). The voices are distinct per character but synthetic, and
they are meant as a timing/scratch track. To replace any line with a real recording,
drop a WAV with the same file name into audio/dialogue/recorded/ - the assembler and
the subtitle timing will use it automatically (durations are measured from the files).

Writes: audio/dialogue/generated/<line_id>.wav and audio/dialogue/lines.json
"""
import json, os, subprocess, sys, wave, contextlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "scripts", "lib"))
from screenplay import all_lines  # noqa: E402

VOICES = {
    # voice, pitch (0-99), speed (wpm), amplitude, word gap (10 ms units)
    "Daniel": dict(voice="en-us+m3", pitch=52, speed=150, amp=170, gap=3),
    "Brian": dict(voice="en-us+m4", pitch=60, speed=165, amp=180, gap=2),
    "Grace": dict(voice="en+f3", pitch=38, speed=138, amp=165, gap=4),
    "Narrator": dict(voice="en-gb-x-rp+m7", pitch=24, speed=150, amp=160, gap=6),
}

gen_dir = os.path.join(ROOT, "audio", "dialogue", "generated")
rec_dir = os.path.join(ROOT, "audio", "dialogue", "recorded")
os.makedirs(gen_dir, exist_ok=True)
os.makedirs(rec_dir, exist_ok=True)


def duration(path):
    with contextlib.closing(wave.open(path)) as w:
        return w.getnframes() / float(w.getframerate())


lines = []
for sc, i, speaker, text, lid in all_lines():
    out = os.path.join(gen_dir, lid + ".wav")
    v = VOICES[speaker]
    subprocess.run(["espeak-ng", "-v", v["voice"], "-p", str(v["pitch"]), "-s", str(v["speed"]),
                    "-a", str(v["amp"]), "-g", str(v["gap"]), "-w", out, text], check=True)
    # normalise to 44.1 kHz stereo so every line has the same format
    tmp = out + ".tmp.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-ar", "44100", "-ac", "2",
                    "-af", "highpass=f=80,lowpass=f=9000,volume=1.0", tmp], check=True)
    os.replace(tmp, out)
    rec = os.path.join(rec_dir, lid + ".wav")
    use = rec if os.path.exists(rec) else out
    lines.append({"id": lid, "scene": sc["id"], "index": i, "speaker": speaker, "text": text,
                  "file": os.path.relpath(use, ROOT), "duration": round(duration(use), 3),
                  "source": "recorded" if use == rec else "espeak-ng placeholder"})
with open(os.path.join(ROOT, "audio", "dialogue", "lines.json"), "w") as f:
    json.dump(lines, f, indent=1)
print(f"{len(lines)} lines generated; total speech {sum(l['duration'] for l in lines):.1f} s")
for l in lines:
    print(f"  {l['id']:22s} {l['duration']:5.2f}s  {l['text'][:60]}")
