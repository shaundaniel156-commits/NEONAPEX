/**
 * Facial expression system.
 *
 * A FaceState is a small set of continuous controls (brows, lids, gaze, smile,
 * mouth open/width/pucker, cry). Expression presets are FaceStates; the actor
 * blends presets by weight, adds deterministic blinking and viseme mouth shapes,
 * and FaceController.apply() drives the eyelid/brow/lip meshes built by the
 * CharacterBuilder.
 */
import * as THREE from 'three';
import { FaceParts } from './CharacterBuilder';
import { clamp, clamp01, hash, lerp } from '../core/MathUtils';

export interface FaceState {
  browL: number; // -1 (down) .. 1 (raised)
  browR: number;
  browInnerL: number; // inner ends raised (sad / worried)
  browInnerR: number;
  eyeOpenL: number; // 0 closed .. 1 open .. 1.3 wide
  eyeOpenR: number;
  gazeX: number; // radians, + = character's left
  gazeY: number; // radians, + = up
  smile: number; // -1 frown .. 1 smile
  mouthOpen: number; // 0..1
  mouthWidth: number; // -1 (narrow) .. 1 (wide)
  pucker: number; // 0..1
  cry: number; // 0..1 tears
  squint: number; // 0..1
}

export const NEUTRAL: FaceState = {
  browL: 0, browR: 0, browInnerL: 0, browInnerR: 0,
  eyeOpenL: 1, eyeOpenR: 1, gazeX: 0, gazeY: 0,
  smile: 0.05, mouthOpen: 0, mouthWidth: 0, pucker: 0, cry: 0, squint: 0,
};

export type ExpressionName =
  | 'neutral' | 'smile' | 'bigSmile' | 'laugh' | 'frown' | 'worried' | 'surprised' | 'shocked'
  | 'cry' | 'sad' | 'disappointed' | 'determined' | 'thinking' | 'tired' | 'proud' | 'angry' | 'listening';

export const EXPRESSIONS: Record<ExpressionName, Partial<FaceState>> = {
  neutral: {},
  smile: { smile: 0.55, browL: 0.1, browR: 0.1, squint: 0.2 },
  bigSmile: { smile: 1, mouthOpen: 0.25, mouthWidth: 0.5, browL: 0.3, browR: 0.3, squint: 0.4 },
  laugh: { smile: 1, mouthOpen: 0.55, mouthWidth: 0.4, squint: 0.6, browL: 0.2, browR: 0.2 },
  frown: { smile: -0.6, browL: -0.5, browR: -0.5, mouthWidth: -0.2 },
  worried: { smile: -0.3, browInnerL: 0.8, browInnerR: 0.8, browL: 0.15, browR: 0.15, eyeOpenL: 1.05, eyeOpenR: 1.05, mouthWidth: -0.3 },
  surprised: { browL: 0.9, browR: 0.9, eyeOpenL: 1.3, eyeOpenR: 1.3, mouthOpen: 0.45, pucker: 0.4, smile: 0 },
  shocked: { browL: 1, browR: 1, eyeOpenL: 1.35, eyeOpenR: 1.35, mouthOpen: 0.7, pucker: 0.2, smile: -0.2 },
  cry: { smile: -0.7, browInnerL: 1, browInnerR: 1, browL: 0.2, browR: 0.2, eyeOpenL: 0.55, eyeOpenR: 0.55, mouthOpen: 0.15, mouthWidth: 0.2, cry: 1, squint: 0.5 },
  sad: { smile: -0.5, browInnerL: 0.7, browInnerR: 0.7, eyeOpenL: 0.8, eyeOpenR: 0.8, gazeY: -0.15, mouthWidth: -0.1 },
  disappointed: { smile: -0.45, browInnerL: 0.4, browInnerR: 0.4, browL: -0.2, browR: -0.2, eyeOpenL: 0.75, eyeOpenR: 0.75, gazeY: -0.25, mouthWidth: -0.2 },
  determined: { smile: 0.0, browL: -0.45, browR: -0.45, eyeOpenL: 0.9, eyeOpenR: 0.9, mouthWidth: -0.1, squint: 0.3 },
  thinking: { browL: 0.3, browR: -0.2, gazeX: 0.25, gazeY: 0.3, smile: -0.1, pucker: 0.3, mouthWidth: -0.3 },
  tired: { eyeOpenL: 0.6, eyeOpenR: 0.6, browInnerL: 0.3, browInnerR: 0.3, smile: -0.2, gazeY: -0.1 },
  proud: { smile: 0.7, browL: 0.2, browR: 0.2, eyeOpenL: 0.9, eyeOpenR: 0.9, squint: 0.3 },
  angry: { smile: -0.7, browL: -0.9, browR: -0.9, browInnerL: -0.4, browInnerR: -0.4, eyeOpenL: 0.85, eyeOpenR: 0.85, mouthWidth: 0.2 },
  listening: { browL: 0.15, browR: 0.15, smile: 0.1, eyeOpenL: 1.02, eyeOpenR: 1.02 },
};

export function expressionState(name: ExpressionName): FaceState {
  return { ...NEUTRAL, ...EXPRESSIONS[name] };
}

export function blendFace(a: FaceState, b: FaceState, t: number): FaceState {
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof FaceState)[]) out[k] = lerp(a[k], b[k], t);
  return out;
}

/* ---------------------------------------------------------------------- */
/* Visemes                                                                 */
/* ---------------------------------------------------------------------- */

/** Mouth shape used while speaking: [open, width, pucker]. */
export type Viseme = [number, number, number];
const VISEMES: Record<string, Viseme> = {
  rest: [0.0, 0, 0],
  A: [0.75, 0.25, 0],
  E: [0.4, 0.75, 0],
  I: [0.3, 0.8, 0],
  O: [0.6, -0.4, 0.75],
  U: [0.35, -0.6, 0.95],
  M: [0.0, 0.05, 0.1],
  F: [0.15, 0.3, 0],
  L: [0.4, 0.2, 0],
  S: [0.2, 0.55, 0],
  T: [0.25, 0.3, 0],
  W: [0.3, -0.5, 0.8],
};

export interface VisemeCue {
  t: number; // seconds from line start
  v: Viseme;
}

/**
 * Convert dialogue text into a deterministic sequence of mouth shapes spread
 * over the spoken duration. This approximates lip-sync without any audio analysis
 * so it works identically for speech synthesis and imported recordings.
 */
export function visemesForText(text: string, duration: number): VisemeCue[] {
  const letters = text.toLowerCase().replace(/[^a-z' ]/g, '');
  const cues: VisemeCue[] = [];
  const words = letters.split(/\s+/).filter(Boolean);
  const totalChars = Math.max(1, letters.replace(/\s/g, '').length);
  // speech takes ~85% of the slot; words are separated by small closures.
  const speakTime = duration * 0.86;
  let t = 0.05;
  for (const w of words) {
    for (const c of w) {
      let v: Viseme;
      if ('aá'.includes(c)) v = VISEMES.A;
      else if ('e'.includes(c)) v = VISEMES.E;
      else if ('iy'.includes(c)) v = VISEMES.I;
      else if ('o'.includes(c)) v = VISEMES.O;
      else if ('u'.includes(c)) v = VISEMES.U;
      else if ('mbp'.includes(c)) v = VISEMES.M;
      else if ('fv'.includes(c)) v = VISEMES.F;
      else if ('l'.includes(c)) v = VISEMES.L;
      else if ('szcj'.includes(c)) v = VISEMES.S;
      else if ('w'.includes(c)) v = VISEMES.W;
      else if ("'".includes(c)) continue;
      else v = VISEMES.T;
      cues.push({ t, v });
      t += (speakTime / totalChars) * 0.92;
    }
    cues.push({ t, v: VISEMES.rest });
    t += (speakTime / totalChars) * 0.9;
  }
  cues.push({ t: duration * 0.95, v: VISEMES.rest });
  return cues;
}

export function sampleVisemes(cues: VisemeCue[], t: number): Viseme {
  if (cues.length === 0 || t < cues[0].t) return VISEMES.rest;
  let i = 0;
  while (i + 1 < cues.length && cues[i + 1].t <= t) i++;
  const a = cues[i];
  const b = cues[Math.min(cues.length - 1, i + 1)];
  const span = Math.max(0.0001, b.t - a.t);
  const k = clamp01((t - a.t) / span);
  // ease so mouth moves smoothly between shapes
  const e = k * k * (3 - 2 * k);
  return [lerp(a.v[0], b.v[0], e), lerp(a.v[1], b.v[1], e), lerp(a.v[2], b.v[2], e)];
}

/* ---------------------------------------------------------------------- */
/* Blink                                                                   */
/* ---------------------------------------------------------------------- */

/** Deterministic blink amount (0 open .. 1 closed) at film time t for a character seed. */
export function blinkAmount(t: number, seed: number): number {
  // blinks every 2.5 - 5.5 s, each 0.22 s long, timed from a hash of the interval index.
  let acc = 0;
  let i = 0;
  // iterate intervals until we pass t (intervals are small so this is cheap)
  const start = Math.floor(t / 4) - 2;
  acc = Math.max(0, start) * 4;
  i = Math.max(0, start);
  for (let n = 0; n < 8; n++) {
    const len = 2.5 + hash(i * 3.1 + seed * 17.3) * 3;
    const blinkAt = acc + len * (0.3 + 0.6 * hash(i * 7.7 + seed * 5.1));
    if (t >= blinkAt && t < blinkAt + 0.24) {
      const k = (t - blinkAt) / 0.24;
      return k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
    }
    acc += len;
    i++;
    if (acc > t + 6) break;
  }
  return 0;
}

/* ---------------------------------------------------------------------- */
/* Controller                                                              */
/* ---------------------------------------------------------------------- */

export class FaceController {
  constructor(private face: FaceParts) {}

  apply(s: FaceState, time: number): void {
    const f = this.face;
    const R = f.R;
    const lids = (eye: typeof f.eyeL, open: number, brow: number, browInner: number, sideSign: number) => {
      const o = clamp(open, 0, 1.35);
      // squint lowers the upper lid and raises the lower lid a little
      const upperOpen = clamp01(o) * (1 - s.squint * 0.15);
      const wide = Math.max(0, o - 1) * 0.5;
      eye.upperLid.rotation.x = lerp(0.95, -0.42 - wide * 0.8, upperOpen);
      const lowerOpen = 0.35 + 0.65 * clamp01(o) * (1 - s.squint * 0.6);
      eye.lowerLid.rotation.x = lerp(-0.05, 0.4 + wide * 0.4, lowerOpen);
      eye.group.rotation.y = s.gazeX;
      eye.group.rotation.x = -s.gazeY;
      // brow: vertical raise + inner tilt
      eye.brow.position.y = 0.36 * (R * 1.33) + brow * 0.07 * R + browInner * 0.015 * R;
      eye.brow.rotation.z = sideSign * (browInner * 0.35 - brow * 0.05);
      eye.brow.rotation.x = -brow * 0.1;
      // tears
      const cry = clamp01(s.cry);
      eye.tear.visible = cry > 0.05;
      if (eye.tear.visible) {
        const fall = ((time * 0.35 + sideSign * 0.5) % 1 + 1) % 1;
        const re = R * 0.145;
        eye.tear.position.set(-sideSign * re * 0.2, -re * 0.9 - fall * R * 0.55, re * 0.9 - fall * R * 0.1);
        eye.tear.scale.setScalar(cry * (0.7 + 0.5 * (1 - fall)));
        eye.tear.scale.y *= 1.8;
      }
    };
    lids(f.eyeL, s.eyeOpenL, s.browL, s.browInnerL, 1);
    lids(f.eyeR, s.eyeOpenR, s.browR, s.browInnerR, -1);
    const open = clamp01(s.mouthOpen);
    f.lips.update(clamp(s.smile, -1, 1), open, clamp(s.mouthWidth, -1, 1), clamp01(s.pucker));
    f.innerMouth.scale.y = Math.max(0.001, open * 0.17 * R);
    f.innerMouth.position.y = -0.03 * R - open * 0.1 * R;
    f.teeth.visible = open > 0.08;
    f.teeth.position.y = 0.0 - open * 0.01 * R;
  }
}
