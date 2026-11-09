/**
 * Hand and arm gestures, typing, holding, pointing. Mostly partial (upper-body)
 * poses that are layered on top of idle / sitting poses.
 */
import { Pose, mirrorPose } from '../characters/CharacterRig';
import { fbm1, noise1, lerp, clamp01, tri } from '../core/MathUtils';

const sideSign = (side: 'L' | 'R') => (side === 'L' ? 1 : -1);

/** Point with the given arm toward "forward-ish". yaw / pitch tweak the direction. */
export function pointPose(side: 'L' | 'R', pitch = 0, yaw = 0): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-1.35 + pitch, s * 0.2 + yaw, s * 0.15];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-0.15, 0, 0];
  j[side === 'L' ? 'handL' : 'handR'] = [0.0, 0, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.95, indexL: 0.02, thumbL: 0.5 } : { curlR: 0.95, indexR: 0.02, thumbR: 0.5 } };
}

/** Both forearms forward over a keyboard, fingers pecking in a rhythm. */
export function typingPose(t: number, intensity = 1): Pose {
  const peckL = Math.abs(Math.sin(t * 9.3)) * 0.08 * intensity + noise1(t * 7, 1) * 0.03;
  const peckR = Math.abs(Math.sin(t * 8.1 + 1)) * 0.08 * intensity + noise1(t * 6.5, 2) * 0.03;
  const driftL = noise1(t * 1.3, 3) * 0.12 * intensity;
  const driftR = noise1(t * 1.1, 4) * 0.12 * intensity;
  return {
    joints: {
      spine: [0.16, 0, 0],
      neck: [0.2, 0, 0],
      head: [0.12, 0, 0],
      upperArmL: [-0.45 + peckL * 0.3, 0.25 + driftL, 0.25],
      upperArmR: [-0.45 + peckR * 0.3, -0.25 - driftR, -0.25],
      forearmL: [-1.35, -0.3 + driftL * 0.5, 0.1],
      forearmR: [-1.35, 0.3 - driftR * 0.5, -0.1],
      handL: [-0.15 + peckL, 0, 0],
      handR: [-0.15 + peckR, 0, 0],
    },
    fingers: {
      curlL: 0.35 + peckL * 2,
      curlR: 0.35 + peckR * 2,
      spreadL: 0.6,
      spreadR: 0.6,
      thumbL: 0.3,
      thumbR: 0.3,
    },
  };
}

/** Hands resting on the table in front of a seated character. */
export function handsOnTablePose(): Pose {
  return {
    joints: {
      upperArmL: [-0.55, 0.15, 0.2],
      upperArmR: [-0.55, -0.15, -0.2],
      forearmL: [-1.15, -0.25, 0],
      forearmR: [-1.15, 0.25, 0],
      handL: [-0.1, 0, 0],
      handR: [-0.1, 0, 0],
    },
    fingers: { curlL: 0.25, curlR: 0.25 },
  };
}

/** Holding a phone up in front of the chest with one hand, looking at it. */
export function holdPhonePose(side: 'L' | 'R', up = 0): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.55 - up * 0.5, s * 0.4, s * 0.05];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-1.95, s * 0.35, s * 0.3];
  j[side === 'L' ? 'handL' : 'handR'] = [-0.3, s * 0.5, 0];
  j.head = [0.25 - up * 0.3, 0, 0];
  j.neck = [0.1, 0, 0];
  const f: Pose['fingers'] = side === 'L' ? { curlL: 0.55, thumbL: 0.6, spreadL: 0 } : { curlR: 0.55, thumbR: 0.6, spreadR: 0 };
  return { joints: j, fingers: f };
}

/** Showing the phone screen to someone else: arm extended forward with the phone. */
export function showPhonePose(side: 'L' | 'R'): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-1.0, s * 0.1, s * 0.1];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-0.9, s * 0.2, s * 0.3];
  j[side === 'L' ? 'handL' : 'handR'] = [-0.4, s * 0.7, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.55, thumbL: 0.6 } : { curlR: 0.55, thumbR: 0.6 } };
}

/** Open palms, explaining. amount animates them. */
export function explainPose(t: number, intensity = 1): Pose {
  const a = fbm1(t * 0.9, 21) * intensity;
  const b = fbm1(t * 0.8 + 5, 22) * intensity;
  return {
    joints: {
      upperArmL: [-0.5 + a * 0.3, 0.2, 0.35 + b * 0.2],
      upperArmR: [-0.5 - b * 0.3, -0.2, -0.35 - a * 0.2],
      forearmL: [-1.4 + a * 0.3, 0.6, 0.3],
      forearmR: [-1.4 - b * 0.3, -0.6, -0.3],
      handL: [0.2, -0.4, 0.3 + a * 0.5],
      handR: [0.2, 0.4, -0.3 - b * 0.5],
    },
    fingers: { curlL: 0.1, curlR: 0.1, spreadL: 0.6, spreadR: 0.6 },
  };
}

/** One hand gesture while talking: chopping / emphasising, driven by noise. */
export function talkHandPose(t: number, side: 'L' | 'R', intensity = 1, seed = 0): Pose {
  const s = sideSign(side);
  const a = fbm1(t * 1.1 + seed, 31 + seed) * intensity;
  const b = fbm1(t * 1.4 + seed * 3, 32 + seed) * intensity;
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.4 + a * 0.35, s * (0.15 + b * 0.2), s * 0.2];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-1.5 + b * 0.4, s * 0.3, s * 0.2];
  j[side === 'L' ? 'handL' : 'handR'] = [0.1 + a * 0.4, -s * 0.3, s * (0.2 + b * 0.4)];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.2, spreadL: 0.4 } : { curlR: 0.2, spreadR: 0.4 } };
}

/** Arms crossed over the chest. */
export function armsCrossedPose(): Pose {
  return {
    joints: {
      upperArmL: [-0.55, 0.55, 0.25],
      upperArmR: [-0.55, -0.55, -0.25],
      forearmL: [-1.85, 0.9, 0.2],
      forearmR: [-1.85, -0.9, -0.2],
      handL: [0, 0.4, 0],
      handR: [0, -0.4, 0],
    },
    fingers: { curlL: 0.3, curlR: 0.3 },
  };
}

/** Hand on own chest (sincerity). */
export function handOnChestPose(side: 'L' | 'R'): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.6, s * 0.45, s * 0.25];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-2.0, s * 0.95, s * 0.25];
  j[side === 'L' ? 'handL' : 'handR'] = [-0.2, s * 0.6, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.1, spreadL: 0.5 } : { curlR: 0.1, spreadR: 0.5 } };
}

/** Wave hello / goodbye. */
export function wavePose(t: number, side: 'L' | 'R'): Pose {
  const s = sideSign(side);
  const w = Math.sin(t * 7) * 0.35;
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.4, 0, s * 1.6];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-1.9, s * 0.2 + w, 0];
  j[side === 'L' ? 'handL' : 'handR'] = [0, 0, w * 0.6];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.05, spreadL: 0.6 } : { curlR: 0.05, spreadR: 0.6 } };
}

/** Carrying something with both hands in front (a basin, a stack). */
export function carryPose(): Pose {
  return {
    joints: {
      upperArmL: [-0.5, 0.2, 0.2],
      upperArmR: [-0.5, -0.2, -0.2],
      forearmL: [-1.4, -0.2, 0.0],
      forearmR: [-1.4, 0.2, 0.0],
      handL: [-0.2, 0, 0],
      handR: [-0.2, 0, 0],
    },
    fingers: { curlL: 0.7, curlR: 0.7 },
  };
}

/** Hand on the other person's shoulder (comfort). */
export function handOnShoulderPose(side: 'L' | 'R'): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.95, s * 0.25, s * 0.3];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-0.85, s * 0.3, s * 0.1];
  j[side === 'L' ? 'handL' : 'handR'] = [0.5, 0, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.3, spreadL: 0.3 } : { curlR: 0.3, spreadR: 0.3 } };
}

/** Thinking: hand to chin. */
export function thinkPose(side: 'L' | 'R'): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.75, s * 0.55, s * 0.1];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-2.35, s * 0.4, s * 0.2];
  j[side === 'L' ? 'handL' : 'handR'] = [-0.3, s * 0.3, 0];
  j.head = [0.1, s * 0.15, s * 0.1];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.5, indexL: 0.2 } : { curlR: 0.5, indexR: 0.2 } };
}

/** Shrug. */
export function shrugPose(t: number): Pose {
  const k = clamp01(tri(t * 0.5) * 2);
  return {
    joints: {
      shoulderL: [0, 0, 0.25 * k],
      shoulderR: [0, 0, -0.25 * k],
      upperArmL: [-0.3, 0.3, 0.5],
      upperArmR: [-0.3, -0.3, -0.5],
      forearmL: [-1.3, 0.9, 0.4],
      forearmR: [-1.3, -0.9, -0.4],
      handL: [0.3, -0.5, 0.5],
      handR: [0.3, 0.5, -0.5],
      head: [0, 0, 0.1],
    },
    fingers: { curlL: 0.05, curlR: 0.05, spreadL: 0.7, spreadR: 0.7 },
  };
}

/** Hands on hips. */
export function handsOnHipsPose(): Pose {
  return {
    joints: {
      upperArmL: [0.15, 0.3, 0.55],
      upperArmR: [0.15, -0.3, -0.55],
      forearmL: [-1.2, 1.25, 0.2],
      forearmR: [-1.2, -1.25, -0.2],
      handL: [0.3, 0, 0],
      handR: [0.3, 0, 0],
    },
    fingers: { curlL: 0.3, curlR: 0.3 },
  };
}

/** Handing something over with one hand (money, a phone). */
export function handOverPose(side: 'L' | 'R', reach = 1): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.9 * reach, s * 0.1, s * 0.1];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-0.6 * reach, 0, 0];
  j[side === 'L' ? 'handL' : 'handR'] = [-0.3, s * 1.2, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.35, thumbL: 0.5 } : { curlR: 0.35, thumbR: 0.5 } };
}

/** Receiving with both cupped hands. */
export function receivePose(): Pose {
  return {
    joints: {
      upperArmL: [-0.7, 0.2, 0.15],
      upperArmR: [-0.7, -0.2, -0.15],
      forearmL: [-1.0, -0.35, 0],
      forearmR: [-1.0, 0.35, 0],
      handL: [0.3, 1.3, 0],
      handR: [0.3, -1.3, 0],
    },
    fingers: { curlL: 0.3, curlR: 0.3, spreadL: 0.2, spreadR: 0.2 },
  };
}

/** Lean forward toward the laptop screen, one hand on the trackpad. */
export function leanToScreenPose(t: number): Pose {
  return {
    joints: {
      spine: [0.28, 0, 0],
      neck: [0.15, 0, 0],
      head: [0.05, 0, 0],
      upperArmL: [-0.5, 0.2, 0.2],
      upperArmR: [-0.4, -0.3, -0.25],
      forearmL: [-1.4, -0.3, 0.1],
      forearmR: [-1.3, 0.2, -0.1],
      handL: [-0.1 + Math.abs(Math.sin(t * 4)) * 0.1, 0, 0],
      handR: [-0.1, 0, 0],
    },
    fingers: { curlL: 0.3, curlR: 0.3 },
  };
}

export const mirror = mirrorPose;
export { lerp };

/** Working with the hands at counter / stall height (sorting produce, packing). */
export function workPose(t: number, seed = 0): Pose {
  const a = noise1(t * 1.4, 61 + seed) * 0.25;
  const b = noise1(t * 1.7 + 3, 62 + seed) * 0.25;
  return {
    joints: {
      spine: [0.18, 0, 0],
      neck: [0.2, 0, 0],
      head: [0.15, a * 0.3, 0],
      upperArmL: [-0.55 + a, 0.15, 0.2],
      upperArmR: [-0.55 + b, -0.15, -0.2],
      forearmL: [-1.1 - b * 0.5, -0.2, 0],
      forearmR: [-1.1 - a * 0.5, 0.2, 0],
      handL: [-0.2 + b, 0, 0],
      handR: [-0.2 + a, 0, 0],
    },
    fingers: { curlL: 0.45, curlR: 0.45 },
  };
}

/** Crouching down (lighting a lamp on the floor, picking something up). */
export function crouchPose(t: number, hipDrop: number): Pose {
  return {
    joints: {
      thighL: [-1.9, 0.2, 0.25],
      thighR: [-1.9, -0.2, -0.25],
      shinL: [2.3, 0, 0],
      shinR: [2.3, 0, 0],
      footL: [-0.3, 0, 0],
      footR: [-0.3, 0, 0],
      spine: [0.45, 0, 0],
      neck: [0.1, 0, 0],
      head: [0.2, 0, 0],
      upperArmL: [-0.9, 0.2, 0.2],
      upperArmR: [-1.1, -0.2, -0.1],
      forearmL: [-0.8, 0, 0],
      forearmR: [-0.6 + Math.sin(t * 3) * 0.05, 0, 0],
      handL: [0.2, 0, 0],
      handR: [0.2, 0, 0],
    },
    hipsOffset: [0, -hipDrop, 0.05],
    fingers: { curlL: 0.5, curlR: 0.6 },
  };
}

/** Reaching down to a low object (a tin on the stall) with one hand. */
export function reachLowPose(side: 'L' | 'R', amount = 1): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j.spine = [0.3 * amount, -s * 0.15 * amount, 0];
  j.neck = [0.2 * amount, 0, 0];
  j.head = [0.15 * amount, 0, 0];
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.75 * amount, s * 0.1, s * 0.15];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-0.45 * amount, 0, 0];
  j[side === 'L' ? 'handL' : 'handR'] = [0.2, 0, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.5 } : { curlR: 0.5 } };
}

/** Clapping. */
export function clapPose(t: number): Pose {
  const c = Math.abs(Math.sin(t * 9)) * 0.35;
  return {
    joints: {
      upperArmL: [-0.9, 0.3, 0.3 - c],
      upperArmR: [-0.9, -0.3, -0.3 + c],
      forearmL: [-1.4, 0.6, 0.2],
      forearmR: [-1.4, -0.6, -0.2],
      handL: [0, 0.3, 0.2],
      handR: [0, -0.3, -0.2],
    },
    fingers: { curlL: 0.1, curlR: 0.1 },
  };
}

/** Both arms wrapped around someone's shoulders from the side (group hug / comforting). */
export function sideHugPose(side: 'L' | 'R'): Pose {
  const s = sideSign(side);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-1.4, s * 0.5, s * 0.4];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-0.9, s * 0.3, s * 0.2];
  j[side === 'L' ? 'handL' : 'handR'] = [0.3, 0, 0];
  j.spine = [0.08, s * 0.1, -s * 0.08];
  j.head = [0.05, s * 0.3, s * 0.15];
  j.neck = [0, s * 0.15, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.3 } : { curlR: 0.3 } };
}
