/**
 * Background people (pedestrians, market customers and sellers) built with the
 * same procedural character builder at low detail and animated with the shared
 * walk / idle cycles. Fully deterministic from time.
 */
import * as THREE from 'three';
import { buildCharacter, Character, CharacterSpec } from '../characters/CharacterBuilder';
import { idleStand } from '../animations/Idle';
import { walkPose, strideLength } from '../animations/Walking';
import { carryPose, explainPose, handsOnHipsPose, holdPhonePose } from '../animations/Gestures';
import { blendPose } from '../characters/CharacterRig';
import { hash } from '../core/MathUtils';

const SKINS = ['#5a3521', '#6a4029', '#4a2a18', '#7a4a30', '#3f2718'];
const TOPS = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#ecf0f1', '#e67e22', '#16a085', '#f5f5f5', '#2c3e50'];
const BOTTOMS = ['#2c3e50', '#1f1f1f', '#5d4037', '#34495e', '#7b241c', '#1b4f72'];

export function extraSpec(seed: number, name = 'extra'): CharacterSpec {
  const female = hash(seed * 1.7) < 0.45;
  const h = hash(seed * 2.3);
  return {
    name: `${name}${seed}`,
    height: female ? 1.55 + h * 0.15 : 1.65 + h * 0.18,
    sex: female ? 'female' : 'male',
    build: hash(seed * 3.1) < 0.3 ? 'stocky' : 'adult',
    skin: SKINS[Math.floor(hash(seed * 4.1) * SKINS.length)],
    hair: female
      ? { style: hash(seed * 5.3) < 0.5 ? 'natural' : 'headwrap', color: '#120c0a', band: TOPS[Math.floor(hash(seed * 6.1) * TOPS.length)] }
      : { style: hash(seed * 5.3) < 0.85 ? 'short' : 'bald', color: '#0e0a08' },
    top: { type: female ? 'blouse' : hash(seed * 7.7) < 0.5 ? 'shirt' : 'jacket', color: TOPS[Math.floor(hash(seed * 8.3) * TOPS.length)], sleeve: hash(seed * 9.1) < 0.5 ? 'short' : 'long', accent: '#222' },
    bottom: { type: female ? 'skirt' : 'trousers', color: BOTTOMS[Math.floor(hash(seed * 10.1) * BOTTOMS.length)] },
    shoes: hash(seed * 11.3) < 0.5 ? '#222' : '#6b4a2b',
    face: { noseWidth: 1 + (hash(seed * 12.1) - 0.5) * 0.3, lipFullness: 1, eyeSize: 1, browThickness: 1, cheek: 0.5, jaw: 0.2 + hash(seed * 13.3) * 0.15, irisColor: '#2b1a10' },
    detail: 'low',
  };
}

export interface ExtraPath {
  from: THREE.Vector3;
  to: THREE.Vector3;
  speed: number;
  /** time offset so people are spread along the path */
  offset: number;
}

export type ExtraBehaviour = { kind: 'walk'; path: ExtraPath } | { kind: 'stand'; pos: THREE.Vector3; yaw: number; gesture?: 'phone' | 'hips' | 'explain' | 'carry' | 'none' };

export class Extra {
  readonly char: Character;
  constructor(public seed: number, public behaviour: ExtraBehaviour) {
    this.char = buildCharacter(extraSpec(seed));
  }
  update(t: number): void {
    const c = this.char;
    const b = this.behaviour;
    if (b.kind === 'walk') {
      const len = b.path.from.distanceTo(b.path.to);
      const period = len / b.path.speed;
      const k = ((t * 1 + b.path.offset) % period) / period;
      c.root.position.lerpVectors(b.path.from, b.path.to, k);
      const dir = new THREE.Vector3().subVectors(b.path.to, b.path.from);
      c.root.rotation.y = Math.atan2(dir.x, dir.z);
      const phase = (k * len) / strideLength(b.path.speed, c.dims.height);
      let pose = blendPose(idleStand(t, this.seed), walkPose(phase, 0.95), 1);
      if (hash(this.seed * 1.9) < 0.3) pose = blendPose(pose, carryPose(), 1);
      c.rig.applyPose(pose);
    } else {
      c.root.position.copy(b.pos);
      c.root.rotation.y = b.yaw;
      let pose = idleStand(t, this.seed);
      switch (b.gesture) {
        case 'phone': pose = blendPose(pose, holdPhonePose('R'), 1); break;
        case 'hips': pose = blendPose(pose, handsOnHipsPose(), 1); break;
        case 'explain': pose = blendPose(pose, explainPose(t, 0.7), 1); break;
        case 'carry': pose = blendPose(pose, carryPose(), 1); break;
      }
      c.rig.applyPose(pose);
    }
  }
}
