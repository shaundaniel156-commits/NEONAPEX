/**
 * Conversational body language. Layered while a character speaks or listens:
 * subtle nods, head tilts, shoulder movement and hand emphasis driven by
 * deterministic noise so it looks alive but never repeats mechanically.
 */
import { Pose } from '../characters/CharacterRig';
import { fbm1, noise1 } from '../core/MathUtils';
import { talkHandPose } from './Gestures';
import { blendPose } from '../characters/CharacterRig';

export interface TalkOptions {
  intensity?: number; // 0..1.5
  hands?: 'none' | 'left' | 'right' | 'both';
  seated?: boolean;
}

export function talkingPose(t: number, seed: number, opts: TalkOptions = {}): Pose {
  const I = opts.intensity ?? 0.8;
  const nod = fbm1(t * 1.6 + seed, 41 + seed) * 0.08 * I + Math.max(0, Math.sin(t * 2.3 + seed)) * 0.03 * I;
  const tilt = fbm1(t * 0.7 + seed * 2, 42 + seed) * 0.08 * I;
  const turn = fbm1(t * 0.5 + seed * 3, 43 + seed) * 0.06 * I;
  const body = fbm1(t * 0.6 + seed, 44 + seed) * 0.04 * I;
  let pose: Pose = {
    joints: {
      head: [nod, turn, tilt],
      neck: [nod * 0.5, turn * 0.5, 0],
      spine: [body * 0.5 + 0.02 * I, body, 0],
      chest: [0, body * 0.5, 0],
      shoulderL: [0, 0, fbm1(t * 1.1, 45 + seed) * 0.05 * I],
      shoulderR: [0, 0, -fbm1(t * 1.1 + 2, 46 + seed) * 0.05 * I],
    },
  };
  const hands = opts.hands ?? 'right';
  if (hands === 'left' || hands === 'both') pose = blendPose(pose, talkHandPose(t, 'L', I, seed), 1);
  if (hands === 'right' || hands === 'both') pose = blendPose(pose, talkHandPose(t, 'R', I, seed + 1), 1);
  return pose;
}

/** Listening: small nods, attentive stillness. */
export function listeningPose(t: number, seed: number): Pose {
  const nod = Math.max(0, Math.sin(t * 1.4 + seed)) * 0.04 + fbm1(t * 0.8, 51 + seed) * 0.03;
  return {
    joints: {
      head: [nod, fbm1(t * 0.3, 52 + seed) * 0.04, fbm1(t * 0.25, 53 + seed) * 0.05],
      neck: [nod * 0.3, 0, 0],
    },
  };
}

/** A clear nod (yes). */
export function nodPose(t: number, times = 2): Pose {
  const k = Math.min(1, t / (0.45 * times));
  const a = Math.sin(k * Math.PI * times) * 0.18;
  return { joints: { head: [Math.max(0, a) + 0.02, 0, 0], neck: [a * 0.4, 0, 0] } };
}

/** Shake head (no). */
export function shakeHeadPose(t: number, times = 2): Pose {
  const k = Math.min(1, t / (0.5 * times));
  const a = Math.sin(k * Math.PI * 2 * times) * 0.22;
  return { joints: { head: [0, a, 0], neck: [0, a * 0.3, 0] } };
}

export { noise1 };
