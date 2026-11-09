"""Assemble rendered frames + audio + subtitles into MP4 (H.264, AAC stereo) with FFmpeg.

Usage:
  python3 scripts/assemble.py sample            -> final/sample.mp4 from renders/sample/frame_%04d.png + renders/sample/timing.json
  python3 scripts/assemble.py scene1 ... scene6 -> per-scene MP4s in renders/scenes/
  python3 scripts/assemble.py film              -> final/The_Last_Promise.mp4 (all six scenes concatenated)

timing.json (written by each scene script) lists dialogue lines, sfx cues, ambience and music so the
audio mix is built deterministically from the same timeline as the animation.
"""
import json, os, subprocess, sys, glob, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'audio')


def run(cmd):
    print(' '.join(cmd[:12]) + (' ...' if len(cmd) > 12 else ''))
    subprocess.run(cmd, check=True)


def srt_time(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = int(t % 60); ms = int(round((t - int(t)) * 1000))
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def write_srt(lines, path, offset=0.0):
    with open(path, 'w') as f:
        for i, l in enumerate(lines, 1):
            t0 = l['t'] + offset
            t1 = t0 + l['duration'] + 0.25
            name = '' if l['speaker'] == 'Narrator' else f"{l['speaker'].upper()}: "
            text = l['text']
            if l['speaker'] == 'Narrator':
                text = f'<i>{text}</i>'
            f.write(f'{i}\n{srt_time(t0)} --> {srt_time(t1)}\n{name}{text}\n\n')
    return path


def build_audio(timing, duration, out_path):
    """Mix dialogue, ambience, music and sfx into one stereo WAV."""
    inputs = []
    filters = []
    labels = []
    idx = 0
    def add_input(path, at, gain, loop=False, fade_in=0.0, fade_out=0.0, end=None):
        nonlocal idx
        args = ['-stream_loop', '-1'] if loop else []
        inputs.extend(args + ['-i', path])
        chain = f'[{idx}:a]'
        fl = []
        if end is not None:
            fl.append(f'atrim=0:{max(0.1, end - at):.3f}')
        fl.append(f'volume={gain:.3f}')
        if fade_in > 0:
            fl.append(f'afade=t=in:st=0:d={fade_in:.2f}')
        if fade_out > 0 and end is not None:
            fl.append(f'afade=t=out:st={max(0.0, end - at - fade_out):.3f}:d={fade_out:.2f}')
        fl.append(f'adelay={int(at * 1000)}|{int(at * 1000)}')
        fl.append('aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo')
        filters.append(chain + ','.join(fl) + f'[a{idx}]')
        labels.append(f'[a{idx}]')
        idx += 1
    for l in timing.get('dialogue', []):
        add_input(os.path.join(ROOT, l['file']), l['t'], 1.0)
    for amb in timing.get('ambience', []):
        add_input(os.path.join(AUD, 'sound_effects', amb['name'] + '.wav'), amb['t0'], amb.get('gain', 0.35), loop=True, fade_in=1.0, fade_out=1.5, end=amb['t1'])
    for mus in timing.get('music', []):
        add_input(os.path.join(AUD, 'music', mus['mood'] + '.wav'), mus['t0'], mus.get('gain', 0.28), loop=True, fade_in=2.0, fade_out=2.5, end=mus['t1'])
    for sfx in timing.get('sfx', []):
        add_input(os.path.join(AUD, 'sound_effects', sfx['name'] + '.wav'), sfx['t'], sfx.get('gain', 0.6))
    if not labels:
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', str(duration), out_path])
        return out_path
    mixf = ''.join(labels) + f'amix=inputs={len(labels)}:duration=longest:normalize=0,atrim=0:{duration:.3f},alimiter=limit=0.95[out]'
    run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters + [mixf]), '-map', '[out]', '-ar', '44100', '-ac', '2', out_path])
    return out_path


def encode(frames_pattern, audio_path, srt_path, out_path, fps=24, crf=18):
    vf = f"subtitles='{srt_path}':force_style='FontName=DejaVu Sans,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,BorderStyle=4,Outline=1,Shadow=0,MarginV=36,Alignment=2'"
    run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', frames_pattern, '-i', audio_path, '-vf', vf,
         '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out_path])
    return out_path


def assemble(name, frames_dir, out_path):
    timing = json.load(open(os.path.join(frames_dir, 'timing.json')))
    duration = timing['duration']
    frames = sorted(glob.glob(os.path.join(frames_dir, 'frame_*.png')))
    expected = int(round(duration * 24))
    if len(frames) < expected:
        print(f'WARNING: {name}: {len(frames)} frames rendered, {expected} expected')
    audio = build_audio(timing, duration, os.path.join(frames_dir, 'mix.wav'))
    srt = write_srt(timing['dialogue'], os.path.join(ROOT, 'subtitles', f'{name}.srt'))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    encode(os.path.join(frames_dir, 'frame_%04d.png'), audio, srt, out_path)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out_path], capture_output=True, text=True)
    print(f'{out_path}: {float(probe.stdout):.2f} s')
    return out_path


if __name__ == '__main__':
    what = sys.argv[1:] or ['sample']
    os.makedirs(os.path.join(ROOT, 'subtitles'), exist_ok=True)
    if what == ['film']:
        parts = []
        offset = 0.0
        all_lines = []
        for i in range(1, 7):
            d = os.path.join(ROOT, 'renders', f'scene{i}')
            out = os.path.join(ROOT, 'renders', 'scenes', f'scene{i}.mp4')
            if not os.path.exists(out):
                assemble(f'scene{i}', d, out)
            timing = json.load(open(os.path.join(d, 'timing.json')))
            for l in timing['dialogue']:
                all_lines.append({**l, 't': l['t'] + offset})
            offset += timing['duration']
            parts.append(out)
        lst = os.path.join(ROOT, 'renders', 'scenes', 'concat.txt')
        with open(lst, 'w') as f:
            for p in parts:
                f.write(f"file '{p}'\n")
        final = os.path.join(ROOT, 'final', 'The_Last_Promise.mp4')
        os.makedirs(os.path.dirname(final), exist_ok=True)
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', final])
        write_srt(all_lines, os.path.join(ROOT, 'subtitles', 'The_Last_Promise.srt'))
        print('FINAL', final)
    else:
        for w in what:
            d = os.path.join(ROOT, 'renders', w)
            assemble(w, d, os.path.join(ROOT, 'final' if w == 'sample' else 'renders/scenes', f'{w}.mp4'))
