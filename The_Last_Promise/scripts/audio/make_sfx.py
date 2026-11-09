"""Synthesised sound effects and ambience beds. Writes audio/sound_effects/*.wav"""
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import *


def add(a, b, at=0.0):
    """a + b (b placed at `at` seconds), growing the buffer if needed."""
    i = int(at * SR)
    n = max(len(a), i + len(b))
    out = np.zeros(n)
    out[:len(a)] += a
    out[i:i + len(b)] += b
    return out

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'audio', 'sound_effects')


def footstep(seed=0):
    y = lowpass_fast(noise(0.12, 1, seed), 500) * np.exp(-np.linspace(0, 9, int(0.12 * SR)))
    return add(y, bandpass_fast(noise(0.05, 0.3, seed + 1), 1200, 2500) * np.exp(-np.linspace(0, 12, int(0.05 * SR))))


def keypress(seed=0):
    y = highpass_fast(noise(0.035, 0.6, seed), 2500) * np.exp(-np.linspace(0, 14, int(0.035 * SR)))
    return add(y, tone(1800 + seed * 90, 0.02, 'square', 0.05) * np.exp(-np.linspace(0, 10, int(0.02 * SR))))


def typing_bed(seconds=20, seed=3):
    rng = np.random.default_rng(seed)
    buf = np.zeros(int(seconds * SR))
    t = 0.2
    while t < seconds - 0.1:
        place(buf, keypress(int(rng.integers(0, 9))) * rng.uniform(0.5, 1.0), t)
        t += rng.uniform(0.07, 0.22) if rng.random() > 0.08 else rng.uniform(0.4, 0.9)
    return buf


def rain_bed(seconds=70, seed=5):
    y = bandpass_fast(noise(seconds, 0.35, seed), 1200, 7000)
    lfo = 1 + 0.15 * np.sin(2 * np.pi * 0.08 * t_axis(seconds))
    y = add(y * lfo, lowpass_fast(noise(seconds, 0.25, seed + 1), 150))
    rng = np.random.default_rng(seed)
    for _ in range(seconds * 6):
        at = rng.uniform(0, seconds - 0.1)
        place(y, bandpass_fast(noise(0.03, 0.5, int(at * 100)), 2000, 6000) * np.exp(-np.linspace(0, 10, int(0.03 * SR))), at)
    return y


def thunder(seed=7):
    n = int(3.2 * SR)
    y = lowpass_fast(noise(3.2, 1.0, seed), 180)
    envl = np.concatenate([np.linspace(0, 1, int(0.25 * SR)), np.exp(-np.linspace(0, 4, n - int(0.25 * SR)))])
    y = y * envl
    crack = lowpass_fast(noise(1.2, 0.5, seed + 1), 600) * np.exp(-np.linspace(0, 6, int(1.2 * SR)))
    return add(y, crack, 0.1) * 1.4


def street_bed(seconds=60, seed=11):
    y = bandpass_fast(noise(seconds, 0.3, seed), 300, 1800)
    t = t_axis(seconds)
    y *= 1 + 0.25 * np.sin(2 * np.pi * 0.13 * t)
    eng = tone(78, seconds, 'saw', 0.06) * (1 + 0.3 * np.sin(2 * np.pi * 0.21 * t))
    y = add(y, lowpass_fast(eng, 220))
    rng = np.random.default_rng(seed)
    for _ in range(int(seconds / 7)):
        at = rng.uniform(1, seconds - 2)
        place(y, horn(int(at)) * 0.25, at)
    for _ in range(int(seconds / 9)):
        at = rng.uniform(1, seconds - 3)
        place(y, boda(int(at)) * 0.3, at)
    return y


def market_bed(seconds=60, seed=13):
    t = t_axis(seconds)
    y = bandpass_fast(noise(seconds, 0.28, seed), 500, 2200) * (1 + 0.4 * np.sin(2 * np.pi * 0.37 * t) * np.sin(2 * np.pi * 0.9 * t + 1))
    y = add(y, bandpass_fast(noise(seconds, 0.12, seed + 1), 200, 700) * (1 + 0.5 * np.sin(2 * np.pi * 0.9 * t)))
    rng = np.random.default_rng(seed)
    # vendor calls: short vowel-like bursts
    for _ in range(int(seconds / 2.5)):
        at = rng.uniform(0.5, seconds - 1)
        f = rng.uniform(160, 320)
        dur = rng.uniform(0.25, 0.6)
        v = (tone(f, dur, 'saw', 0.08) + tone(f * 2.01, dur, 'tri', 0.04)) * env_adsr(int(dur * SR), 0.05, 0.1, 0.6, 0.15)
        place(y, bandpass_fast(v, 300, 2500), at)
    return y


def room_tone(seconds=60, seed=17):
    y = lowpass_fast(noise(seconds, 0.12, seed), 260)
    rng = np.random.default_rng(seed)
    for _ in range(int(seconds / 4)):
        at = rng.uniform(0, seconds - 1)
        chirp = tone(2800, 0.12, 'sine', 0.05) * np.sin(np.linspace(0, np.pi, int(0.12 * SR)))
        for k in range(3):
            place(y, chirp * (0.8 - k * 0.2), at + k * 0.16)
    return y


def night_bed(seconds=70, seed=19):
    y = rain_bed(seconds, seed)
    t = t_axis(seconds)
    cr = tone(4200, seconds, 'sine', 0.012) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 19 * t)))
    return add(y, cr)


def horn(seed=0):
    y = (tone(420, 0.35, 'square', 0.12) + tone(530, 0.35, 'square', 0.12)) * env_adsr(int(0.35 * SR), 0.01, 0.05, 0.9, 0.1)
    return lowpass_fast(y, 3000)


def boda(seed=0):
    n = int(2.0 * SR)
    t = t_axis(2.0)
    f = 70 + 60 * np.clip(t / 1.2, 0, 1)
    y = 2 * ((np.cumsum(f) / SR) % 1) - 1
    y = lowpass_fast(y * 0.12, 900) * np.sin(np.linspace(0, np.pi, n)) ** 0.5
    return add(y, bandpass_fast(noise(2.0, 0.2, seed), 300, 1500) * np.sin(np.linspace(0, np.pi, n)))


def phone_buzz():
    buf = np.zeros(int(1.3 * SR))
    for i in range(3):
        v = tone(110, 0.22, 'saw', 0.12) * env_adsr(int(0.22 * SR), 0.005, 0.02, 0.9, 0.03) + bandpass_fast(noise(0.22, 0.3), 150, 400)
        place(buf, v, i * 0.4)
    return buf


def notification():
    buf = np.zeros(int(0.6 * SR))
    place(buf, tone(880, 0.15, 'sine', 0.3) * np.exp(-np.linspace(0, 6, int(0.15 * SR))), 0)
    place(buf, tone(1320, 0.35, 'sine', 0.25) * np.exp(-np.linspace(0, 5, int(0.35 * SR))), 0.13)
    return buf


def success():
    buf = np.zeros(int(1.2 * SR))
    for i, f in enumerate((523, 659, 784, 1047)):
        place(buf, tone(f, 0.45, 'tri', 0.22) * np.exp(-np.linspace(0, 5, int(0.45 * SR))), i * 0.11)
    return buf


def laptop_crash():
    buf = np.zeros(int(1.3 * SR))
    t = t_axis(0.5)
    f = 220 * (40 / 220) ** (t / 0.5)
    y = 2 * ((np.cumsum(f) / SR) % 1) - 1
    place(buf, lowpass_fast(y * 0.2, 1500) * np.exp(-np.linspace(0, 3, len(y))), 0)
    place(buf, lowpass_fast(noise(0.4, 0.5), 900) * np.exp(-np.linspace(0, 8, int(0.4 * SR))), 0.05)
    for k in (0.55, 0.75):
        place(buf, tone(160, 0.08, 'square', 0.15) * env_adsr(int(0.08 * SR), 0.005, 0.02, 0.8, 0.03), k)
    return buf


def power_cut():
    y = tone(120, 0.8, 'sine', 0.3)
    t = t_axis(0.8)
    f = 120 * (30 / 120) ** (t / 0.8)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 * np.exp(-np.linspace(0, 3, len(t)))
    return add(y, bandpass_fast(noise(0.15, 0.4), 1500, 3000) * np.exp(-np.linspace(0, 10, int(0.15 * SR))))


def door():
    buf = np.zeros(int(0.6 * SR))
    place(buf, lowpass_fast(noise(0.15, 1.0), 300) * np.exp(-np.linspace(0, 8, int(0.15 * SR))), 0)
    place(buf, tone(80, 0.25, 'sine', 0.4) * np.exp(-np.linspace(0, 6, int(0.25 * SR))), 0)
    place(buf, bandpass_fast(noise(0.05, 0.3), 2000, 3500) * np.exp(-np.linspace(0, 10, int(0.05 * SR))), 0.12)
    return buf


def coin():
    buf = np.zeros(int(0.5 * SR))
    place(buf, tone(2200, 0.15, 'sine', 0.2) * np.exp(-np.linspace(0, 8, int(0.15 * SR))), 0)
    place(buf, tone(2900, 0.3, 'sine', 0.15) * np.exp(-np.linspace(0, 6, int(0.3 * SR))), 0.05)
    return buf


def cheer():
    buf = np.zeros(int(1.5 * SR))
    rng = np.random.default_rng(2)
    for _ in range(7):
        d = rng.uniform(0.6, 1.0)
        v = bandpass_fast(noise(d, 0.3, int(rng.integers(0, 99))), 600 + rng.uniform(0, 900), 2500) * np.sin(np.linspace(0, np.pi, int(d * SR)))
        place(buf, v, rng.uniform(0, 0.3))
    return buf


def sigh():
    return bandpass_fast(noise(0.8, 0.25), 600, 1800) * np.sin(np.linspace(0, np.pi, int(0.8 * SR))) ** 2


if __name__ == '__main__':
    items = {
        'footstep': footstep(), 'keypress': keypress(), 'typing_bed': typing_bed(), 'rain_bed': rain_bed(), 'thunder': thunder(),
        'street_bed': street_bed(), 'market_bed': market_bed(), 'room_tone': room_tone(), 'night_bed': night_bed(),
        'horn': horn(), 'boda': boda(), 'phone_buzz': phone_buzz(), 'notification': notification(), 'success': success(),
        'laptop_crash': laptop_crash(), 'power_cut': power_cut(), 'door': door(), 'coin': coin(), 'cheer': cheer(), 'sigh': sigh(),
    }
    for name, y in items.items():
        print(write_wav(os.path.join(OUT, name + '.wav'), stereo(y, 0.25)))
