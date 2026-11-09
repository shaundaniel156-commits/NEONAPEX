"""Tiny numpy synthesiser used for music beds and sound effects (no samples, no AI)."""
import numpy as np, wave, struct, os, math

SR = 44100


def write_wav(path, data, sr=SR):
    data = np.asarray(data, dtype=np.float64)
    if data.ndim == 1:
        data = np.stack([data, data], axis=1)
    peak = np.max(np.abs(data)) or 1.0
    if peak > 0.98:
        data = data / peak * 0.98
    pcm = (data * 32767).astype('<i2')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    return path


def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.3, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    out = np.ones(n)
    a = min(a, n); out[:a] = np.linspace(0, 1, a)
    d_end = min(a + d, n); out[a:d_end] = np.linspace(1, s, d_end - a)
    out[d_end:] = s
    r = min(r, n); out[n - r:] *= np.linspace(1, 0, r)
    return out


def tone(freq, seconds, wave_='sine', amp=0.3, detune=0.0):
    t = t_axis(seconds)
    ph = 2 * np.pi * freq * (1 + detune) * t
    if wave_ == 'sine': y = np.sin(ph)
    elif wave_ == 'tri': y = 2 / np.pi * np.arcsin(np.sin(ph))
    elif wave_ == 'saw': y = 2 * ((freq * t) % 1) - 1
    elif wave_ == 'square': y = np.sign(np.sin(ph))
    else: y = np.sin(ph)
    return y * amp


def noise(seconds, amp=1.0, seed=0):
    rng = np.random.default_rng(seed)
    return rng.standard_normal(int(seconds * SR)) * amp


def lowpass(x, cutoff, sr=SR):
    # one-pole IIR, applied twice
    rc = 1 / (2 * np.pi * cutoff)
    a = (1 / sr) / (rc + 1 / sr)
    y = np.empty_like(x); acc = 0.0
    for _ in range(2):
        for i in range(len(x)):
            acc += a * (x[i] - acc); y[i] = acc
        x = y.copy()
    return y


def lowpass_fast(x, cutoff, sr=SR):
    """FFT brickwall-ish lowpass (fast for long buffers)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / sr)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, n=len(x))


def highpass_fast(x, cutoff, sr=SR):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / sr)
    X *= 1 / (1 + (cutoff / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X, n=len(x))


def bandpass_fast(x, lo, hi):
    return highpass_fast(lowpass_fast(x, hi), lo)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def place(buf, part, at):
    i = int(at * SR)
    end = min(len(buf), i + len(part))
    if end > i:
        buf[i:end] += part[:end - i]
    return buf


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def stereo(mono, width=0.2):
    l = np.roll(mono, 0)
    r = np.roll(mono, int(0.0003 * SR))
    return np.stack([l * (1 - width * 0.5), r * (1 - width * 0.5)], axis=1)
