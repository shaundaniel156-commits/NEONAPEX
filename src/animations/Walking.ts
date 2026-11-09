/**
 * Locomotion cycles. phase = distance travelled / stride length, so the feet
 * stay planted correctly whatever the playback speed or seek position.
 */
import { Pose } from '../characters/CharacterRig';
import { lerp } from '../core/MathUtils';

export function walkPose(phase: number, energy = 1): Pose {
  const p = phase * Math.PI * 2;
  const s = Math.sin(p);
  const c = Math.cos(p);
  const A = 0.48 * energy;
  const kneeL = 0.95 * Math.pow(Math.max(0, c), 1.4) + 0.08;
  const kneeR = 0.95 * Math.pow(Math.max(0, -c), 1.4) + 0.08;
  const bob = Math.abs(Math.cos(p)) * 0.025 * energy;
  return {
    joints: {
      hips: [0.03, 0.07 * s, -0.03 * c],
      spine: [0.06, -0.07 * s, 0.02 * c],
      chest: [0, -0.04 * s, 0],
      neck: [0.02, 0.03 * s, 0],
      head: [0.0, 0.02 * s, -0.01 * c],
      shoulderL: [0, 0, 0],
      shoulderR: [0, 0, 0],
      upperArmL: [0.55 * A * s, 0, 0.1],
      upperArmR: [-0.55 * A * s, 0, -0.1],
      forearmL: [-0.35 - 0.2 * Math.max(0, -s), 0.1, 0.05],
      forearmR: [-0.35 - 0.2 * Math.max(0, s), -0.1, -0.05],
      handL: [0, 0, 0],
      handR: [0, 0, 0],
      thighL: [-A * s, 0, 0.02],
      thighR: [A * s, 0, -0.02],
      shinL: [kneeL, 0, 0],
      shinR: [kneeR, 0, 0],
      footL: [0.25 * s * (s > 0 ? 1 : 0.4) - 0.05, 0, 0],
      footR: [-0.25 * s * (s < 0 ? 1 : 0.4) - 0.05, 0, 0],
    },
    hipsOffset: [0, -bob, 0],
    fingers: { curlL: 0.25, curlR: 0.25 },
  };
}

export function runPose(phase: number): Pose {
  const p = phase * Math.PI * 2;
  const s = Math.sin(p);
  const c = Math.cos(p);
  const A = 0.95;
  const kneeL = 1.7 * Math.pow(Math.max(0, c), 1.2) + 0.25;
  const kneeR = 1.7 * Math.pow(Math.max(0, -c), 1.2) + 0.25;
  const bob = Math.abs(Math.cos(p)) * 0.05;
  return {
    joints: {
      hips: [0.1, 0.1 * s, -0.04 * c],
      spine: [0.22, -0.12 * s, 0.03 * c],
      chest: [0.05, -0.05 * s, 0],
      neck: [-0.1, 0.03 * s, 0],
      head: [-0.12, 0.02 * s, 0],
      shoulderL: [0, 0, 0],
      shoulderR: [0, 0, 0],
      upperArmL: [0.75 * s - 0.2, 0, 0.18],
      upperArmR: [-0.75 * s - 0.2, 0, -0.18],
      forearmL: [-1.7, 0.2, 0.1],
      forearmR: [-1.7, -0.2, -0.1],
      handL: [0, 0, 0],
      handR: [0, 0, 0],
      thighL: [-A * s - 0.1, 0, 0.02],
      thighR: [A * s - 0.1, 0, -0.02],
      shinL: [kneeL, 0, 0],
      shinR: [kneeR, 0, 0],
      footL: [0.3 * s - 0.1, 0, 0],
      footR: [-0.3 * s - 0.1, 0, 0],
    },
    hipsOffset: [0, -bob + 0.01, 0],
    fingers: { curlL: 0.75, curlR: 0.75 },
  };
}

/** Blend between a walk and a run depending on speed (m/s). */
export function locomotionPose(phase: number, speed: number): Pose {
  if (speed < 2.0) return walkPose(phase, lerp(0.6, 1.1, Math.min(1, speed / 1.6)));
  return runPose(phase);
}

export function strideLength(speed: number, height: number): number {
  // metres per full gait cycle
  return speed < 2.0 ? height * (0.62 + 0.18 * Math.min(1, speed / 1.6)) : height * 1.35;
}
