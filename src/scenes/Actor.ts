/**
 * An Actor wraps a procedural Character and composites, every frame, the
 * layered poses / expressions / look targets / visemes that the active timeline
 * events contribute. finalize() turns that into joint rotations and face shapes.
 */
import * as THREE from 'three';
import { Character } from '../characters/CharacterBuilder';
import { Pose, blendPose, addPose } from '../characters/CharacterRig';
import { FaceController, FaceState, NEUTRAL, blendFace, blinkAmount, Viseme } from '../characters/FacialAnimation';
import { idleStand, breathing } from '../animations/Idle';
import { clamp, lerp } from '../core/MathUtils';

interface PoseLayer {
  pose: Pose;
  w: number;
}
interface FaceLayer {
  state: FaceState;
  w: number;
}
interface LookLayer {
  target: THREE.Vector3;
  w: number;
}

const _target = new THREE.Vector3();
const _local = new THREE.Vector3();
const _headPos = new THREE.Vector3();

export class Actor {
  readonly position = new THREE.Vector3();
  yaw = 0;
  visible = true;
  readonly faceController: FaceController;
  speaking = false;

  private base: PoseLayer | null = null;
  private layers: PoseLayer[] = [];
  private faces: FaceLayer[] = [];
  private looks: LookLayer[] = [];
  private viseme: { v: Viseme; w: number } | null = null;
  private breathDepth = 1;
  private breathRate = 0.27;
  private placed = false;

  constructor(public readonly char: Character, public readonly seed: number, public readonly name: string) {
    this.faceController = new FaceController(char.face);
  }

  get root(): THREE.Group {
    return this.char.root;
  }
  /** World position of the eyes (evaluated from the current matrices). */
  eyePoint(out = new THREE.Vector3()): THREE.Vector3 {
    return this.char.eyePoint(out);
  }
  headPoint(out = new THREE.Vector3()): THREE.Vector3 {
    return this.char.headPoint(0, 0, 0, out);
  }
  chestPoint(out = new THREE.Vector3()): THREE.Vector3 {
    return this.char.chestPoint(out);
  }
  handPoint(side: 'L' | 'R', out = new THREE.Vector3()): THREE.Vector3 {
    return this.char.handPoint(side, out);
  }
  /** Bound getters usable as camera targets. */
  readonly eyes = (): THREE.Vector3 => this.eyePoint(this._eyeTmp);
  readonly chest = (): THREE.Vector3 => this.chestPoint(this._chestTmp);
  readonly head = (): THREE.Vector3 => this.headPoint(this._headTmp);
  readonly facing = (): number => this.yaw;
  private _eyeTmp = new THREE.Vector3();
  private _chestTmp = new THREE.Vector3();
  private _headTmp = new THREE.Vector3();

  beginFrame(): void {
    this.base = null;
    this.layers.length = 0;
    this.faces.length = 0;
    this.looks.length = 0;
    this.viseme = null;
    this.visible = false;
    this.placed = false;
    this.speaking = false;
    this.breathDepth = 1;
    this.breathRate = 0.27;
  }

  /** Place the actor (world position + facing yaw). Later calls override earlier ones. */
  place(x: number, y: number, z: number, yaw: number): void {
    this.position.set(x, y, z);
    this.yaw = yaw;
    this.visible = true;
    this.placed = true;
  }
  /** Replace the idle base pose (sitting, walking) with weight w. */
  setBase(pose: Pose, w = 1): void {
    if (!this.base || w >= this.base.w) this.base = { pose, w };
  }
  addPose(pose: Pose, w = 1): void {
    if (w > 0.0005) this.layers.push({ pose, w });
  }
  addFace(state: FaceState, w = 1): void {
    if (w > 0.0005) this.faces.push({ state, w });
  }
  addLook(target: THREE.Vector3, w = 1): void {
    if (w > 0.0005) this.looks.push({ target: target.clone(), w });
  }
  setViseme(v: Viseme, w = 1): void {
    this.viseme = { v, w };
    this.speaking = true;
  }
  setBreathing(depth: number, rate = 0.27): void {
    this.breathDepth = depth;
    this.breathRate = rate;
  }

  finalize(t: number): void {
    const root = this.char.root;
    root.visible = this.visible;
    if (!this.visible) return;
    root.position.copy(this.position);
    root.rotation.set(0, this.yaw, 0);

    // ---- body ----
    let pose = idleStand(t, this.seed);
    if (this.base) pose = blendPose(pose, this.base.pose, this.base.w);
    for (const l of this.layers) pose = blendPose(pose, l.pose, l.w);
    pose = addPose(pose, breathing(t + this.seed, this.breathRate, this.breathDepth), 1);
    this.char.rig.applyPose(pose);
    root.updateMatrixWorld(true);

    // ---- look-at (head, neck and eyes) ----
    let gazeX = 0, gazeY = 0;
    if (this.looks.length) {
      _target.set(0, 0, 0);
      let wsum = 0;
      for (const l of this.looks) {
        _target.addScaledVector(l.target, l.w);
        wsum += l.w;
      }
      _target.divideScalar(wsum);
      const w = Math.min(1, wsum);
      const neck = this.char.rig.joints.neck;
      const head = this.char.rig.joints.head;
      // pass 1: neck takes a share of the yaw
      head.getWorldPosition(_headPos);
      neck.worldToLocal(_local.copy(_target));
      _local.sub(neck.worldToLocal(_headPos.clone()));
      let yaw = Math.atan2(_local.x, _local.z);
      let pitch = -Math.atan2(_local.y, Math.hypot(_local.x, _local.z));
      yaw = clamp(yaw, -1.2, 1.2);
      pitch = clamp(pitch, -0.6, 0.7);
      neck.rotation.y += yaw * 0.3 * w;
      neck.rotation.x += pitch * 0.25 * w;
      neck.updateMatrixWorld(true);
      // pass 2: head aims at the target from the (now rotated) neck frame
      head.getWorldPosition(_headPos);
      neck.worldToLocal(_local.copy(_target));
      _local.sub(neck.worldToLocal(_headPos.clone()));
      const yaw2 = clamp(Math.atan2(_local.x, _local.z), -1.0, 1.0);
      const pitch2 = clamp(-Math.atan2(_local.y, Math.hypot(_local.x, _local.z)), -0.5, 0.6);
      const headYawTarget = yaw2 * 0.8;
      const headPitchTarget = pitch2 * 0.8;
      head.rotation.y = lerp(head.rotation.y, headYawTarget, w);
      head.rotation.x = lerp(head.rotation.x, headPitchTarget, w);
      // eyes take the remainder so the gaze lands exactly
      gazeX = clamp((yaw2 - headYawTarget) * w, -0.45, 0.45);
      gazeY = clamp(-(pitch2 - headPitchTarget) * w, -0.35, 0.35);
      head.updateMatrixWorld(true);
    }

    // ---- face ----
    let face: FaceState = { ...NEUTRAL };
    for (const f of this.faces) face = blendFace(face, f.state, f.w);
    face.gazeX += gazeX;
    face.gazeY += gazeY;
    if (this.viseme) {
      const [open, width, pucker] = this.viseme.v;
      const w = this.viseme.w;
      face.mouthOpen = Math.max(face.mouthOpen * (1 - w * 0.5), open * w);
      face.mouthWidth = lerp(face.mouthWidth, width, w * 0.8);
      face.pucker = Math.max(face.pucker, pucker * w);
      // talking slightly lifts the brows now and then
      face.browL += 0.08 * w * Math.max(0, Math.sin(t * 1.7 + this.seed));
      face.browR += 0.08 * w * Math.max(0, Math.sin(t * 1.7 + this.seed));
    }
    const blink = blinkAmount(t, this.seed);
    face.eyeOpenL *= 1 - blink;
    face.eyeOpenR *= 1 - blink;
    this.faceController.apply(face, t);
  }
}
