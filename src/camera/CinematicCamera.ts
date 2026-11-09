/**
 * Cinematic camera: shots are evaluated from absolute time, so seeking is exact.
 * Supports static shots, dollies / pans / tilts (pos+look interpolation), tracking
 * shots (targets are functions re-evaluated each frame), handheld micro-motion,
 * fov pulls, roll and depth-of-field focus.
 */
import * as THREE from 'three';
import { Ease, EaseFn, fbm1, smoothstep, lerp } from '../core/MathUtils';

export type Target = THREE.Vector3 | (() => THREE.Vector3);

export interface ShotSpec {
  pos: Target;
  look: Target;
  posEnd?: Target;
  lookEnd?: Target;
  ease?: EaseFn;
  fov?: number;
  fovEnd?: number;
  /** 0..1 amount of handheld shake. */
  handheld?: number;
  roll?: number;
  /** Depth of field focus distance in metres, or 'look' to focus on the look target. */
  focus?: number | 'look';
  /** Aperture (bokeh strength); 0 disables DOF for the shot. */
  aperture?: number;
  /** Seconds to ease from the previous camera state (soft transition instead of a cut). */
  blendIn?: number;
  name?: string;
}

export interface CameraState {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  roll: number;
  focus: number;
  aperture: number;
}

const resolve = (t: Target, out: THREE.Vector3) => (typeof t === 'function' ? out.copy(t()) : out.copy(t));

export class CinematicCamera {
  readonly camera: THREE.PerspectiveCamera;
  readonly state: CameraState = { pos: new THREE.Vector3(0, 1.6, 4), look: new THREE.Vector3(0, 1.4, 0), fov: 40, roll: 0, focus: 4, aperture: 0.02 };
  private prev: CameraState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40, roll: 0, focus: 4, aperture: 0.02 };
  private lastShot: ShotSpec | null = null;
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.05, 400);
  }

  /** Evaluate a shot. local = seconds into the shot, length = shot length, t = film time (for noise). */
  evaluate(shot: ShotSpec, local: number, length: number, t: number): void {
    if (shot !== this.lastShot) {
      // remember where we were for blendIn
      this.prev.pos.copy(this.state.pos);
      this.prev.look.copy(this.state.look);
      this.prev.fov = this.state.fov;
      this.prev.roll = this.state.roll;
      this.lastShot = shot;
    }
    const k = length > 0 ? Math.min(1, local / length) : 1;
    const e = (shot.ease ?? Ease.inOutSine)(k);
    resolve(shot.pos, this.tmpA);
    if (shot.posEnd) {
      resolve(shot.posEnd, this.tmpB);
      this.tmpA.lerp(this.tmpB, e);
    }
    this.state.pos.copy(this.tmpA);
    resolve(shot.look, this.tmpA);
    if (shot.lookEnd) {
      resolve(shot.lookEnd, this.tmpB);
      this.tmpA.lerp(this.tmpB, e);
    }
    this.state.look.copy(this.tmpA);
    this.state.fov = shot.fovEnd !== undefined ? lerp(shot.fov ?? 40, shot.fovEnd, e) : shot.fov ?? 40;
    this.state.roll = shot.roll ?? 0;
    this.state.aperture = shot.aperture ?? 0.018;

    if (shot.blendIn && local < shot.blendIn) {
      const b = smoothstep(0, shot.blendIn, local);
      this.state.pos.lerpVectors(this.prev.pos, this.state.pos, b);
      this.state.look.lerpVectors(this.prev.look, this.state.look, b);
      this.state.fov = lerp(this.prev.fov, this.state.fov, b);
    }

    // handheld micro motion
    const hh = shot.handheld ?? 0.15;
    if (hh > 0) {
      const a = hh * 0.02;
      this.state.pos.x += fbm1(t * 0.9, 71) * a;
      this.state.pos.y += fbm1(t * 1.1, 72) * a;
      this.state.pos.z += fbm1(t * 0.8, 73) * a;
      this.state.look.x += fbm1(t * 0.7, 74) * a * 1.5;
      this.state.look.y += fbm1(t * 0.95, 75) * a * 1.5;
      this.state.roll += fbm1(t * 0.5, 76) * hh * 0.006;
    }

    const focusD = shot.focus === undefined || shot.focus === 'look' ? this.state.pos.distanceTo(this.state.look) : shot.focus;
    this.state.focus = focusD;
    this.applyState();
  }

  private applyState(): void {
    const c = this.camera;
    c.position.copy(this.state.pos);
    c.up.copy(this.up);
    c.lookAt(this.state.look);
    if (this.state.roll) c.rotateZ(this.state.roll);
    if (c.fov !== this.state.fov) {
      c.fov = this.state.fov;
      c.updateProjectionMatrix();
    }
  }

  setAspect(a: number): void {
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
  }
}

/* ---------- shot helpers (used by the scene scripts) ---------- */

/** A point offset from a dynamic anchor (e.g. an actor's eyes) in world axes. */
export function offset(anchor: () => THREE.Vector3, dx: number, dy: number, dz: number): () => THREE.Vector3 {
  const out = new THREE.Vector3();
  return () => out.copy(anchor()).add(new THREE.Vector3(dx, dy, dz));
}

/** Point between two anchors. */
export function between(a: () => THREE.Vector3, b: () => THREE.Vector3, k = 0.5, dy = 0): () => THREE.Vector3 {
  const out = new THREE.Vector3();
  return () => {
    out.copy(a()).lerp(b(), k);
    out.y += dy;
    return out;
  };
}

/**
 * Over-the-shoulder: camera behind `from`'s shoulder looking at `to`'s face.
 * side = +1 looks over the character's left shoulder.
 */
export function overShoulder(from: () => THREE.Vector3, to: () => THREE.Vector3, side = 1, back = 0.55, up = 0.12, lateral = 0.32): () => THREE.Vector3 {
  const out = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const right = new THREE.Vector3();
  return () => {
    const f = from();
    const t = to();
    dir.subVectors(t, f);
    dir.y = 0;
    dir.normalize();
    right.set(dir.z, 0, -dir.x);
    out.copy(f).addScaledVector(dir, -back).addScaledVector(right, side * lateral);
    out.y += up;
    return out;
  };
}

/** Camera in front of an actor's face at distance d, slightly to the side. */
export function faceCam(eyes: () => THREE.Vector3, facingYaw: () => number, d = 0.9, side = 0.25, up = 0.02): () => THREE.Vector3 {
  const out = new THREE.Vector3();
  return () => {
    const e = eyes();
    const yaw = facingYaw();
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    out.set(e.x + fx * d + fz * side, e.y + up, e.z + fz * d - fx * side);
    return out;
  };
}

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
