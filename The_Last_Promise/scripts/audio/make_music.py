"""Procedural score: one bed per scene mood (pad + plucked kalimba-like arpeggio + bass). Writes audio/music/<mood>.wav"""
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import *

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MOODS = {
    'warm':    dict(bpm=76, root=57, chords=[[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], cutoff=1400, pad=0.16, pluck=0.12, bass=True, length=70),
    'hopeful': dict(bpm=96, root=60, chords=[[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], cutoff=2200, pad=0.14, pluck=0.16, bass=True, length=70),
    'tender':  dict(bpm=66, root=55, chords=[[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], cutoff=1100, pad=0.18, pluck=0.08, bass=False, length=70),
    'tense':   dict(bpm=84, root=50, chords=[[0, 3, 7], [0, 3, 7, 10], [-2, 1, 5], [-1, 2, 6]], cutoff=700, pad=0.17, pluck=0.0, bass=True, length=80),
    'sad':     dict(bpm=58, root=52, chords=[[0, 3, 7], [8, 12, 15], [5, 8, 12], [3, 7, 10]], cutoff=900, pad=0.2, pluck=0.07, bass=True, length=80),
    'resolve': dict(bpm=104, root=55, chords=[[0, 3, 7], [8, 12, 15], [10, 14, 17], [0, 3, 7]], cutoff=1800, pad=0.15, pluck=0.14, bass=True, length=80),
    'triumph': dict(bpm=108, root=60, chords=[[0, 4, 7, 11], [5, 9, 12], [7, 11, 14], [9, 12, 16]], cutoff=2600, pad=0.16, pluck=0.18, bass=True, length=70),
}


def pad_note(freq, seconds, amp):
    y = tone(freq, seconds, 'saw', amp * 0.5, 0.004) + tone(freq, seconds, 'tri', amp * 0.6, -0.004) + tone(freq * 0.5, seconds, 'sine', amp * 0.3)
    return y * env_adsr(len(y), 0.6, 0.5, 0.8, 0.8)


def pluck(freq, seconds, amp):
    y = tone(freq, seconds, 'sine', amp) + tone(freq * 2, seconds, 'tri', amp * 0.25) + tone(freq * 3, seconds, 'sine', amp * 0.08)
    return y * np.exp(-np.linspace(0, 7, len(y)))


def bass_note(freq, seconds, amp):
    y = tone(freq, seconds, 'sine', amp) + tone(freq * 2, seconds, 'sine', amp * 0.15)
    return y * env_adsr(len(y), 0.02, 0.3, 0.6, 0.6)


def render(mood):
    m = MOODS[mood]
    beat = 60 / m['bpm']
    bar = beat * 4
    n_bars = int(m['length'] / bar) + 1
    buf = np.zeros(int((n_bars * bar + 3) * SR))
    rng = np.random.default_rng(hash(mood) % 1000)
    for b in range(n_bars):
        chord = m['chords'][b % len(m['chords'])]
        t0 = b * bar
        for semi in chord:
            place(buf, pad_note(midi(m['root'] + semi), bar + 0.8, m['pad'] / len(chord)), t0)
        if m['bass']:
            place(buf, bass_note(midi(m['root'] + chord[0] - 12), bar * 0.95, 0.2), t0)
            place(buf, bass_note(midi(m['root'] + chord[0] - 12), bar * 0.45, 0.14), t0 + beat * 2.5)
        if m['pluck'] > 0:
            for e in range(8):
                if rng.random() < 0.28:
                    continue
                idx = rng.integers(0, len(chord) + 1)
                semi = chord[idx] if idx < len(chord) else chord[0] + 12
                place(buf, pluck(midi(m['root'] + 12 + semi), beat * 1.2, m['pluck']), t0 + e * beat * 0.5)
    buf = lowpass_fast(buf, m['cutoff'] * 2.2)
    buf = buf[:int(m['length'] * SR)]
    fade = int(2.5 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)
    buf[:int(1.0 * SR)] *= np.linspace(0, 1, int(1.0 * SR))
    out = os.path.join(ROOT, 'audio', 'music', f'{mood}.wav')
    write_wav(out, stereo(buf * 0.8, 0.3))
    return out


if __name__ == '__main__':
    for mood in MOODS:
        print(render(mood))
