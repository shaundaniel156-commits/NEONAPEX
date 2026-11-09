/**
 * Emotional full-body actions: hugging, celebrating, crying, slumping,
 * surprise recoil, wiping tears, head in hands.
 */
import { Pose } from '../characters/CharacterRig';
import { fbm1, clamp01, smoothstep } from '../core/MathUtils';

/** Hug: arms wrap forward around the other person, head leans to one side. */
export function hugPose(t: number, lean = 1): Pose {
  const squeeze = 0.05 * Math.sin(t * 1.2);
  return {
    joints: {
      spine: [0.12, 0, 0],
      neck: [0.05, 0.25 * lean, 0.2 * lean],
      head: [0.1, 0.2 * lean, 0.15 * lean],
      upperArmL: [-1.2 + squeeze, 0.65, 0.2],
      upperArmR: [-1.35 - squeeze, -0.55, -0.15],
      forearmL: [-1.3, 0.3, 0.2],
      forearmR: [-1.1, -0.3, -0.2],
      handL: [0.2, 0.6, 0],
      handR: [0.2, -0.6, 0],
    },
    fingers: { curlL: 0.2, curlR: 0.2, spreadL: 0.4, spreadR: 0.4 },
  };
}

/** Fist pump / arms up celebration. */
export function celebratePose(t: number): Pose {
  const bounce = Math.abs(Math.sin(t * 5)) * 0.06;
  const pump = Math.sin(t * 5) * 0.25;
  return {
    joints: {
      spine: [-0.1, 0, 0],
      neck: [-0.15, 0, 0],
      head: [-0.2, 0, 0],
      upperArmL: [-2.6 + pump, 0.4, 0.6],
      upperArmR: [-2.6 - pump, -0.4, -0.6],
      forearmL: [-0.9 - pump, 0.3, 0.2],
      forearmR: [-0.9 + pump, -0.3, -0.2],
      handL: [0, 0, 0],
      handR: [0, 0, 0],
      shinL: [0.15 + bounce, 0, 0],
      shinR: [0.15 + bounce, 0, 0],
      thighL: [-0.1 - bounce * 0.5, 0, 0.05],
      thighR: [-0.1 - bounce * 0.5, 0, -0.05],
    },
    hipsOffset: [0, bounce * 0.4, 0],
    fingers: { curlL: 1, curlR: 1, thumbL: 0.9, thumbR: 0.9 },
  };
}

/** Jumping with joy (cycle). */
export function jumpJoyPose(t: number): Pose {
  const k = (t % 0.9) / 0.9;
  const air = Math.sin(k * Math.PI);
  return {
    joints: {
      upperArmL: [-2.7, 0.2, 0.7],
      upperArmR: [-2.7, -0.2, -0.7],
      forearmL: [-0.6, 0, 0],
      forearmR: [-0.6, 0, 0],
      thighL: [-0.3 * air, 0, 0.1],
      thighR: [-0.3 * air, 0, -0.1],
      shinL: [0.6 * air, 0, 0],
      shinR: [0.6 * air, 0, 0],
      head: [-0.25, 0, 0],
      neck: [-0.1, 0, 0],
    },
    hipsOffset: [0, air * 0.25, 0],
    fingers: { curlL: 0.1, curlR: 0.1, spreadL: 0.8, spreadR: 0.8 },
  };
}

/** Crying standing: head down, shoulders shaking, hands up near the face. */
export function cryPose(t: number, intensity = 1): Pose {
  const sob = Math.max(0, Math.sin(t * 6.5)) * Math.max(0, Math.sin(t * 1.1)) * 0.05 * intensity;
  return {
    joints: {
      spine: [0.2 * intensity + sob, 0, 0],
      chest: [0.05 + sob, 0, 0],
      neck: [0.25 * intensity, 0, 0],
      head: [0.3 * intensity, 0.05, 0.08],
      shoulderL: [0, 0, 0.1 + sob * 2],
      shoulderR: [0, 0, -0.1 - sob * 2],
      upperArmL: [-0.9, 0.3, 0.2],
      upperArmR: [-0.75, -0.35, -0.2],
      forearmL: [-2.2, 0.5, 0.2],
      forearmR: [-2.0, -0.3, -0.2],
      handL: [-0.4, 0.4, 0],
      handR: [-0.5, -0.3, 0],
    },
    fingers: { curlL: 0.3, curlR: 0.3 },
  };
}

/** Crying seated at a desk: elbows on the desk, face in hands. */
export function faceInHandsPose(t: number): Pose {
  const sob = Math.max(0, Math.sin(t * 6.5)) * Math.max(0, Math.sin(t * 1.3)) * 0.04;
  return {
    joints: {
      spine: [0.35 + sob, 0, 0],
      chest: [0.1 + sob, 0, 0],
      neck: [0.3, 0, 0],
      head: [0.35, 0, 0],
      shoulderL: [0, 0, 0.08 + sob * 2],
      shoulderR: [0, 0, -0.08 - sob * 2],
      upperArmL: [-1.1, 0.35, 0.25],
      upperArmR: [-1.1, -0.35, -0.25],
      forearmL: [-2.5, 0.35, 0.3],
      forearmR: [-2.5, -0.35, -0.3],
      handL: [-0.4, 0.5, 0.2],
      handR: [-0.4, -0.5, -0.2],
    },
    fingers: { curlL: 0.15, curlR: 0.15, spreadL: 0.5, spreadR: 0.5 },
  };
}

/** Disappointed slump: shoulders drop, head hangs, arms limp. */
export function slumpPose(t: number): Pose {
  return {
    joints: {
      spine: [0.22, 0, 0],
      chest: [0.08, 0, 0],
      neck: [0.3, 0, 0],
      head: [0.35, fbm1(t * 0.3, 61) * 0.05, 0.05],
      shoulderL: [0.1, 0, -0.08],
      shoulderR: [0.1, 0, 0.08],
      upperArmL: [0.12, 0, 0.05],
      upperArmR: [0.12, 0, -0.05],
      forearmL: [-0.08, 0, 0],
      forearmR: [-0.08, 0, 0],
      handL: [0.1, 0, 0],
      handR: [0.1, 0, 0],
    },
    fingers: { curlL: 0.15, curlR: 0.15 },
  };
}

/** Surprise recoil: lean back, hands up a little, head back. */
export function surprisePose(t: number): Pose {
  const k = smoothstep(0, 0.25, t);
  return {
    joints: {
      spine: [-0.12 * k, 0, 0],
      neck: [-0.1 * k, 0, 0],
      head: [-0.15 * k, 0, 0],
      upperArmL: [-0.5 * k, 0.3 * k, 0.4 * k],
      upperArmR: [-0.5 * k, -0.3 * k, -0.4 * k],
      forearmL: [-1.7 * k, 0.2, 0.2],
      forearmR: [-1.7 * k, -0.2, -0.2],
      handL: [0.3, -0.3, 0.4],
      handR: [0.3, 0.3, -0.4],
    },
    fingers: { curlL: 0.05, curlR: 0.05, spreadL: 0.8, spreadR: 0.8 },
  };
}

/** Wiping tears with the back of a hand. */
export function wipeTearsPose(t: number, side: 'L' | 'R'): Pose {
  const s = side === 'L' ? 1 : -1;
  const k = clamp01(t / 0.6);
  const w = Math.sin(k * Math.PI);
  const j: Pose['joints'] = {};
  j[side === 'L' ? 'upperArmL' : 'upperArmR'] = [-0.9 * w, s * 0.4 * w, s * 0.25];
  j[side === 'L' ? 'forearmL' : 'forearmR'] = [-2.45 * w, s * 0.2, s * 0.3];
  j[side === 'L' ? 'handL' : 'handR'] = [-0.6 * w, s * 0.4, s * (0.2 - 0.4 * Math.sin(t * 9) * w)];
  j.head = [0.15 * w, -s * 0.1 * w, 0];
  return { joints: j, fingers: side === 'L' ? { curlL: 0.6 } : { curlR: 0.6 } };
}

/** Deep breath, straightening up with resolve (0..1 progress). */
export function straightenPose(t: number): Pose {
  const k = smoothstep(0, 1.2, t);
  return {
    joints: {
      spine: [-0.05 * k, 0, 0],
      chest: [-0.04 * k, 0, 0],
      neck: [-0.05 * k, 0, 0],
      head: [-0.08 * k, 0, 0],
      shoulderL: [0, 0, 0.05 * k],
      shoulderR: [0, 0, -0.05 * k],
    },
  };
}

/** Standing, both hands over the mouth in shock. */
export function handsOverMouthPose(): Pose {
  return {
    joints: {
      upperArmL: [-0.8, 0.55, 0.2],
      upperArmR: [-0.8, -0.55, -0.2],
      forearmL: [-2.45, 0.5, 0.3],
      forearmR: [-2.45, -0.5, -0.3],
      handL: [-0.4, 0.6, 0.1],
      handR: [-0.4, -0.6, -0.1],
      head: [-0.05, 0, 0],
    },
    fingers: { curlL: 0.2, curlR: 0.2, spreadL: 0.2, spreadR: 0.2 },
  };
}
