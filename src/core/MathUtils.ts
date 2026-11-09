/**
 * Small deterministic math helpers used across the film.
 * Everything here is a pure function of its inputs so the timeline
 * can be evaluated at any time and give the same result.
 */
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inverseLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v: number, a: number, b: number, c: number, d: number) => lerp(c, d, clamp01(inverseLerp(a, b, v)));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01(inverseLerp(a, b, v));
  return t * t * (3 - 2 * t);
};
export const TAU = Math.PI * 2;
export const deg = (d: number) => (d * Math.PI) / 180;

/** Easing functions (t in 0..1). */
export const Ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};
export type EaseFn = (t: number) => number;

/** Smooth fade-in / fade-out envelope for an event of a given length. */
export function envelope(localT: number, length: number, fadeIn = 0.4, fadeOut = 0.4): number {
  if (localT <= 0 || localT >= length) return 0;
  const a = fadeIn > 0 ? smoothstep(0, fadeIn, localT) : 1;
  const b = fadeOut > 0 ? smoothstep(length, length - fadeOut, localT) : 1;
  return Math.min(a, b);
}

/** Deterministic hash noise: same input always gives same output in [0,1). */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
export function hash2(a: number, b: number): number {
  return hash(a * 157.31 + b * 11.17);
}

/** 1D value noise (smooth) in [-1,1]. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i + seed * 1000) * 2 - 1;
  const b = hash(i + 1 + seed * 1000) * 2 - 1;
  return lerp(a, b, u);
}
/** Fractal noise, a few octaves. */
export function fbm1(x: number, seed = 0, octaves = 3): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += noise1(x * freq, seed + i * 7) * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return v;
}

/** 2D value noise in [0,1] for textures. */
export function noise2(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const s = seed * 31;
  const a = hash2(xi + s, yi), b = hash2(xi + 1 + s, yi);
  const c = hash2(xi + s, yi + 1), d = hash2(xi + 1 + s, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm2(x: number, y: number, seed = 0, octaves = 4): number {
  let v = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += noise2(x * freq, y * freq, seed + i) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / norm;
}

/** Triangle wave 0..1..0 over a period of 1. */
export const tri = (t: number) => 1 - Math.abs(((t % 1) + 1) % 1 * 2 - 1);
