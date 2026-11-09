/**
 * Hierarchical rig shared by every character.
 *
 * Every joint is a THREE.Group whose zero rotation is the natural rest pose
 * (standing straight, arms down, palms facing the body). A Pose is a sparse set
 * of Euler deltas from that rest pose, so poses can be layered: a full-body
 * base pose (idle / walk / sit) with partial overlays (gestures, head turns).
 */
import * as THREE from 'three';
import { lerp } from '../core/MathUtils';

export type Vec3 = [number, number, number];

export const JOINT_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'handL', 'handR',
  'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR',
] as const;
export type JointName = (typeof JOINT_NAMES)[number];

export interface FingerPose {
  /** 0 = straight, 1 = fully curled fist. */
  curlL?: number;
  curlR?: number;
  /** Overrides for the index finger (pointing). */
  indexL?: number;
  indexR?: number;
  /** Thumb curl. */
  thumbL?: number;
  thumbR?: number;
  /** Finger spread 0..1. */
  spreadL?: number;
  spreadR?: number;
}

export interface Pose {
  joints?: Partial<Record<JointName, Vec3>>;
  /** Hip position offset in metres (used for bobbing, sitting, crouching). */
  hipsOffset?: Vec3;
  fingers?: FingerPose;
}

export const UPPER_BODY: JointName[] = ['spine', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'handL', 'handR'];
export const ARMS: JointName[] = ['shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'handL', 'handR'];
export const LOWER_BODY: JointName[] = ['hips', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'];

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Return a full copy of pose `a` moved toward pose `b` by `t` on every joint present in `b`. */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return clonePose(a);
  const out = clonePose(a);
  out.joints = out.joints ?? {};
  if (b.joints) {
    for (const k of Object.keys(b.joints) as JointName[]) {
      const bv = b.joints[k]!;
      const av = out.joints[k] ?? [0, 0, 0];
      out.joints[k] = t >= 1 ? ([...bv] as Vec3) : lerpVec(av, bv, t);
    }
  }
  if (b.hipsOffset) {
    out.hipsOffset = lerpVec(out.hipsOffset ?? [0, 0, 0], b.hipsOffset, t);
  }
  if (b.fingers) {
    out.fingers = out.fingers ?? {};
    for (const k of Object.keys(b.fingers) as (keyof FingerPose)[]) {
      const bv = b.fingers[k]!;
      const av = out.fingers[k] ?? (k.startsWith('curl') ? 0.15 : k.startsWith('index') ? 0.15 : k.startsWith('thumb') ? 0.2 : 0.2);
      out.fingers[k] = lerp(av, bv, t);
    }
  }
  return out;
}

/** Add pose `b` on top of `a` (rotations summed), scaled by weight. Used for breathing and look-at overlays. */
export function addPose(a: Pose, b: Pose, w = 1): Pose {
  const out = clonePose(a);
  out.joints = out.joints ?? {};
  if (b.joints) {
    for (const k of Object.keys(b.joints) as JointName[]) {
      const bv = b.joints[k]!;
      const av = out.joints[k] ?? [0, 0, 0];
      out.joints[k] = [av[0] + bv[0] * w, av[1] + bv[1] * w, av[2] + bv[2] * w];
    }
  }
  if (b.hipsOffset) {
    const h = out.hipsOffset ?? [0, 0, 0];
    out.hipsOffset = [h[0] + b.hipsOffset[0] * w, h[1] + b.hipsOffset[1] * w, h[2] + b.hipsOffset[2] * w];
  }
  return out;
}

export function clonePose(p: Pose): Pose {
  const out: Pose = {};
  if (p.joints) {
    out.joints = {};
    for (const k of Object.keys(p.joints) as JointName[]) out.joints[k] = [...p.joints[k]!] as Vec3;
  }
  if (p.hipsOffset) out.hipsOffset = [...p.hipsOffset] as Vec3;
  if (p.fingers) out.fingers = { ...p.fingers };
  return out;
}

/** Mirror a pose left<->right (handy for symmetric gestures). */
export function mirrorPose(p: Pose): Pose {
  const out: Pose = { joints: {}, fingers: {} };
  if (p.joints) {
    for (const k of Object.keys(p.joints) as JointName[]) {
      const v = p.joints[k]!;
      const mk = (k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k) as JointName;
      out.joints![mk] = [v[0], -v[1], -v[2]];
    }
  }
  if (p.hipsOffset) out.hipsOffset = [-p.hipsOffset[0], p.hipsOffset[1], p.hipsOffset[2]];
  if (p.fingers) {
    const f = p.fingers;
    out.fingers = { curlL: f.curlR, curlR: f.curlL, indexL: f.indexR, indexR: f.indexL, thumbL: f.thumbR, thumbR: f.thumbL, spreadL: f.spreadR, spreadR: f.spreadL };
    for (const k of Object.keys(out.fingers) as (keyof FingerPose)[]) if (out.fingers[k] === undefined) delete out.fingers[k];
  }
  return out;
}

export interface FingerChain {
  segments: THREE.Group[]; // base -> tip
  isThumb: boolean;
  /** spread axis sign for this finger (-1..1) */
  spreadSign: number;
}

/**
 * Runtime rig: holds the joint groups and applies a Pose to them.
 */
export class CharacterRig {
  readonly joints: Record<JointName, THREE.Group>;
  readonly fingers: { L: FingerChain[]; R: FingerChain[] } = { L: [], R: [] };
  /** Rest world-space-ish position of the hips in character space. */
  hipsRest = new THREE.Vector3();

  constructor(joints: Record<JointName, THREE.Group>) {
    this.joints = joints;
  }

  applyPose(pose: Pose): void {
    for (const name of JOINT_NAMES) {
      const j = this.joints[name];
      const v = pose.joints?.[name];
      if (v) j.rotation.set(v[0], v[1], v[2]);
      else j.rotation.set(0, 0, 0);
    }
    const h = pose.hipsOffset ?? [0, 0, 0];
    this.joints.hips.position.set(this.hipsRest.x + h[0], this.hipsRest.y + h[1], this.hipsRest.z + h[2]);

    const f = pose.fingers ?? {};
    this.applyFingers('L', f.curlL ?? 0.15, f.indexL, f.thumbL ?? 0.2, f.spreadL ?? 0.2);
    this.applyFingers('R', f.curlR ?? 0.15, f.indexR, f.thumbR ?? 0.2, f.spreadR ?? 0.2);
  }

  private applyFingers(side: 'L' | 'R', curl: number, indexCurl: number | undefined, thumb: number, spread: number): void {
    const chains = this.fingers[side];
    chains.forEach((chain, i) => {
      if (chain.isThumb) {
        chain.segments.forEach((seg, s) => {
          seg.rotation.set(0, 0, 0);
          // thumb curls across the palm
          seg.rotation.z = (side === 'L' ? 1 : -1) * thumb * (s === 0 ? 0.5 : 0.9);
          seg.rotation.x = thumb * 0.35 * (s + 1);
        });
        return;
      }
      const isIndex = i === 1; // chains: [thumb, index, middle, ring, pinky]
      const c = isIndex && indexCurl !== undefined ? indexCurl : curl;
      chain.segments.forEach((seg, s) => {
        seg.rotation.set(0, 0, 0);
        seg.rotation.x = c * (s === 0 ? 1.25 : s === 1 ? 1.45 : 1.0) * 0.95;
        if (s === 0) seg.rotation.z = chain.spreadSign * spread * 0.22 * (1 - c);
      });
    });
  }
}
