/**
 * Idle / breathing / weight-shift animation. Pure functions of time.
 * Conventions (radians, deltas from rest):
 *  upperArm.x < 0  -> arm forward          upperArm.z (+L / -R) -> arm out to the side
 *  forearm.x  < 0  -> elbow bends          head.x > 0 -> look down, head.y > 0 -> turn to character's left
 *  thigh.x  < 0    -> leg forward          shin.x > 0 -> knee bends
 */
import { Pose } from '../characters/CharacterRig';
import { fbm1, noise1 } from '../core/MathUtils';

/** Natural standing idle: arms relaxed slightly away from the body, tiny sway. */
export function idleStand(t: number, seed = 0): Pose {
  const sway = noise1(t * 0.25, seed) * 0.03;
  const shift = noise1(t * 0.18 + 10, seed) * 0.02;
  return {
    joints: {
      hips: [0, sway * 0.5, shift],
      spine: [0.02 + fbm1(t * 0.2, seed + 1) * 0.02, -sway * 0.4, -shift * 0.7],
      chest: [0, 0, 0],
      neck: [0.03, 0, 0],
      head: [fbm1(t * 0.3, seed + 2) * 0.05, fbm1(t * 0.22, seed + 3) * 0.08, fbm1(t * 0.2, seed + 4) * 0.03],
      shoulderL: [0, 0, 0],
      shoulderR: [0, 0, 0],
      upperArmL: [0.04 + fbm1(t * 0.3, seed + 5) * 0.03, 0, 0.12],
      upperArmR: [0.04 + fbm1(t * 0.3, seed + 6) * 0.03, 0, -0.12],
      forearmL: [-0.18, 0.1, 0.05],
      forearmR: [-0.18, -0.1, -0.05],
      handL: [0, 0, 0.05],
      handR: [0, 0, -0.05],
      thighL: [0, 0, 0.03],
      thighR: [0, 0, -0.03],
      shinL: [0.03, 0, 0],
      shinR: [0.03, 0, 0],
      footL: [0, 0, 0],
      footR: [0, 0, 0],
    },
    hipsOffset: [shift * 0.4, 0, 0],
    fingers: { curlL: 0.2, curlR: 0.2, thumbL: 0.2, thumbR: 0.2, spreadL: 0.2, spreadR: 0.2 },
  };
}

/** Breathing overlay (added on top of whatever pose is active). */
export function breathing(t: number, rate = 0.27, depth = 1): Pose {
  const b = Math.sin(t * Math.PI * 2 * rate);
  return {
    joints: {
      spine: [-b * 0.012 * depth, 0, 0],
      chest: [-b * 0.01 * depth, 0, 0],
      shoulderL: [0, 0, b * 0.012 * depth],
      shoulderR: [0, 0, -b * 0.012 * depth],
      neck: [b * 0.006 * depth, 0, 0],
    },
    hipsOffset: [0, b * 0.002 * depth, 0],
  };
}

/** Seated idle on a chair. hipDrop = how far the hips descend from standing. */
export function sitIdle(t: number, hipDrop: number, seed = 0): Pose {
  const base = idleStand(t, seed);
  const j = base.joints!;
  j.thighL = [-1.5, 0.05, 0.1];
  j.thighR = [-1.5, -0.05, -0.1];
  j.shinL = [1.45, 0, 0];
  j.shinR = [1.45, 0, 0];
  j.footL = [0.1, 0, 0];
  j.footR = [0.1, 0, 0];
  j.spine = [0.08 + fbm1(t * 0.2, seed + 1) * 0.02, 0, 0];
  j.upperArmL = [-0.35, 0, 0.1];
  j.upperArmR = [-0.35, 0, -0.1];
  j.forearmL = [-0.9, 0.3, 0];
  j.forearmR = [-0.9, -0.3, 0];
  j.handL = [0, 0, 0];
  j.handR = [0, 0, 0];
  base.hipsOffset = [0, -hipDrop, 0];
  return base;
}
