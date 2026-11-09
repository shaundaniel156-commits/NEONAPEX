/**
 * Procedural humanoid construction.
 *
 * Every character in the film is produced by buildCharacter(spec): the head is a
 * displaced sphere with eye sockets, cheeks, brow ridge and a shaped jaw; eyes are
 * eyeballs with iris/pupil caps and rotating eyelids; lips are a live-deformed tube
 * mesh; the torso, skirt and limbs are custom ring-tube / lathe geometry; hands have
 * a palm and five articulated three-segment fingers. All joints are THREE.Groups so
 * the rig can be posed every frame.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CharacterRig, JointName, FingerChain } from './CharacterRig';
import { fbm2, hash, clamp01 } from '../core/MathUtils';

export interface FaceSpec {
  noseWidth: number; // 1 = default
  lipFullness: number;
  eyeSize: number;
  browThickness: number;
  cheek: number;
  jaw: number; // narrowing of the jaw (0.2 soft .. 0.45 sharp)
  irisColor: string;
}

export interface ClothingTop {
  type: 'hoodie' | 'blouse' | 'jacket' | 'shirt';
  color: string;
  texture?: THREE.Texture;
  sleeve: 'long' | 'short';
  accent?: string;
}
export interface ClothingBottom {
  type: 'trousers' | 'skirt' | 'shorts';
  color: string;
  texture?: THREE.Texture;
}

export interface CharacterSpec {
  name: string;
  height: number;
  sex: 'male' | 'female';
  build: 'slim' | 'adult' | 'stocky';
  skin: string;
  hair: { style: 'short' | 'natural' | 'bald' | 'headwrap'; color: string; band?: string };
  top: ClothingTop;
  bottom: ClothingBottom;
  shoes: string;
  face: FaceSpec;
  detail?: 'full' | 'low';
}

export interface EyeParts {
  group: THREE.Group; // rotates for gaze
  socket: THREE.Group; // fixed position
  upperLid: THREE.Group;
  lowerLid: THREE.Group;
  brow: THREE.Group;
  tear: THREE.Mesh;
}

export interface FaceParts {
  head: THREE.Group; // head joint
  headCenter: THREE.Group;
  eyeL: EyeParts;
  eyeR: EyeParts;
  lips: LipMesh;
  innerMouth: THREE.Mesh;
  teeth: THREE.Mesh;
  mouthGroup: THREE.Group;
  R: number; // head reference radius (x)
}

export interface CharacterDims {
  height: number;
  headCenterY: number;
  eyeY: number;
  shoulderY: number;
  hipY: number;
  handLength: number;
}

const DEFAULT_FACE: FaceSpec = { noseWidth: 1, lipFullness: 1, eyeSize: 1, browThickness: 1, cheek: 0.6, jaw: 0.24, irisColor: '#3a2416' };

/* ------------------------------------------------------------------------ */
/* Geometry helpers                                                          */
/* ------------------------------------------------------------------------ */

export interface Ring {
  y: number;
  rx: number;
  rz: number;
  /** push the ring forward (bust) */
  zOff?: number;
}

/** A closed tube made of elliptical rings -> smooth torso / skirt / sleeve geometry. */
export function makeRingTube(rings: Ring[], segs = 32, fold = 0, capTop = true, capBottom = true): THREE.BufferGeometry {
  // Interpolate a smooth profile through the rings with Catmull-Rom for silkier silhouettes.
  const pts: THREE.Vector3[] = rings.map((r) => new THREE.Vector3(r.rx, r.y, r.rz));
  const offs: THREE.Vector2[] = rings.map((r) => new THREE.Vector2(r.zOff ?? 0, 0));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const nRings = Math.max(8, rings.length * 6);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ringData: { y: number; rx: number; rz: number; zo: number }[] = [];
  for (let i = 0; i <= nRings; i++) {
    const t = i / nRings;
    const p = curve.getPoint(t);
    // zOff interpolated linearly across ring index
    const fi = t * (rings.length - 1);
    const i0 = Math.floor(fi), i1 = Math.min(rings.length - 1, i0 + 1);
    const zo = offs[i0].x + (offs[i1].x - offs[i0].x) * (fi - i0);
    ringData.push({ y: p.y, rx: Math.max(0.0005, p.x), rz: Math.max(0.0005, p.z), zo });
  }
  for (let i = 0; i <= nRings; i++) {
    const r = ringData[i];
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      let rx = r.rx, rz = r.rz;
      if (fold > 0) {
        const f = 1 + fold * Math.sin(a * 9 + i * 0.3) * (i / nRings);
        rx *= f;
        rz *= f;
      }
      const bust = r.zo > 0 && sa > 0 ? r.zo * Math.pow(sa, 2) * (0.6 + 0.4 * Math.abs(ca)) : 0;
      const x = rx * ca;
      const z = rz * sa + bust;
      positions.push(x, r.y, z);
      // approximate normal from ellipse
      const nx = ca / rx, nz = sa / rz;
      const l = Math.hypot(nx, nz) || 1;
      normals.push(nx / l, 0, nz / l);
      uvs.push(j / segs, i / nRings);
    }
  }
  for (let i = 0; i < nRings; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j;
      const b = a + segs + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  const addCap = (ring: { y: number; rx: number; rz: number; zo: number }, up: boolean) => {
    const base = positions.length / 3;
    positions.push(0, ring.y, ring.zo * 0.3);
    normals.push(0, up ? 1 : -1, 0);
    uvs.push(0.5, up ? 1 : 0);
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      positions.push(ring.rx * Math.cos(a), ring.y, ring.rz * Math.sin(a) + (Math.sin(a) > 0 ? ring.zo * Math.pow(Math.sin(a), 2) : 0));
      normals.push(0, up ? 1 : -1, 0);
      uvs.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a));
    }
    for (let j = 0; j < segs; j++) {
      if (up) indices.push(base, base + 1 + j + 1, base + 1 + j);
      else indices.push(base, base + 1 + j, base + 1 + j + 1);
    }
  };
  if (capTop) addCap(ringData[nRings], true);
  if (capBottom) addCap(ringData[0], false);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Tapered limb with rounded ends, pointing down -Y from the origin. */
export function makeLimbGeometry(rTop: number, rBottom: number, length: number, segs = 20): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 10;
  // rounded top
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push(new THREE.Vector2(rTop * Math.sin(a), rTop * 0.6 - rTop * 0.6 * Math.cos(a)));
  }
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const r = rTop + (rBottom - rTop) * (t * t * (3 - 2 * t));
    pts.push(new THREE.Vector2(r, -length * t));
  }
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push(new THREE.Vector2(rBottom * Math.cos(a), -length - rBottom * 0.6 * Math.sin(a)));
  }
  const g = new THREE.LatheGeometry(pts, segs);
  g.computeVertexNormals();
  return g;
}

/** Skull deformation shared by the head mesh and the hidden part of the hair. Unit-sphere in, unit-ish out. */
function deformHead(x: number, y: number, z: number, f: FaceSpec): [number, number, number] {
  const front = z > 0 ? z : 0;
  if (y < 0) {
    const k = -y;
    const narrow = 1 - f.jaw * k * k * (0.7 + 0.3 * front);
    x *= narrow;
    z *= 1 - 0.22 * k * k;
    if (z > 0 && y < -0.55) z += 0.07 * ((-y - 0.55) / 0.45) * z;
  } else {
    z *= 1 - 0.06 * y * y * front;
  }
  for (const sx of [-1, 1]) {
    const dx = x - sx * 0.33, dy = y - 0.1;
    const d2 = dx * dx + dy * dy;
    if (z > 0.3) z -= 0.11 * Math.exp(-d2 / 0.035) * z;
  }
  if (z > 0.4) {
    const dy = y - 0.3;
    z += 0.035 * Math.exp(-(dy * dy) / 0.012) * z;
  }
  for (const sx of [-1, 1]) {
    const dx = x - sx * 0.55, dy = y + 0.2;
    const d2 = dx * dx + dy * dy;
    const bump = f.cheek * 0.07 * Math.exp(-d2 / 0.07);
    if (z > 0) {
      z += bump * z;
      x += bump * sx * 0.6;
    }
  }
  if (y > 0.1 && Math.abs(x) > 0.6) x *= 0.985;
  return [x, y, z];
}

/** Head: sphere displaced into a human skull with sockets, cheeks, brow ridge and jaw. */
function makeHeadGeometry(rx: number, ry: number, rz: number, f: FaceSpec, segs: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, segs, Math.round(segs * 0.8));
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const [x, y, z] = deformHead(v.x, v.y, v.z, f);
    pos.setXYZ(i, x * rx, y * ry, z * rz);
  }
  g.computeVertexNormals();
  return g;
}

/** Live-deformed lip tube: corners rise with smile, lower lip drops with mouth opening. */
export class LipMesh {
  readonly mesh: THREE.Mesh;
  private geo: THREE.BufferGeometry;
  private uSegs = 22;
  private aSegs = 8;
  constructor(
    private hw: number,
    private r: number,
    private y0: number,
    private isLower: boolean,
    private R: number,
    material: THREE.Material,
  ) {
    this.geo = new THREE.BufferGeometry();
    const n = (this.uSegs + 1) * (this.aSegs + 1);
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    this.geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < this.uSegs; i++)
      for (let j = 0; j < this.aSegs; j++) {
        const a = i * (this.aSegs + 1) + j;
        const b = a + this.aSegs + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.castShadow = false;
    this.update(0, 0, 0, 0);
  }

  /** smile -1..1, open 0..1, width -1..1, pucker 0..1 */
  update(smile: number, open: number, width: number, pucker: number): void {
    const pos = this.geo.attributes.position as THREE.BufferAttribute;
    const nor = this.geo.attributes.normal as THREE.BufferAttribute;
    const R = this.R;
    const hw = this.hw * (1 + width * 0.28) * (1 - pucker * 0.45);
    const c = new THREE.Vector3(), tangent = new THREE.Vector3(), nrm = new THREE.Vector3(), bin = new THREE.Vector3();
    const centre = (u: number, out: THREE.Vector3) => {
      const x = u * hw;
      const corner = u * u;
      let y = this.y0 + smile * 0.13 * R * corner - (this.isLower ? open * 0.26 * R * (1 - 0.55 * corner) : -open * 0.035 * R * (1 - corner));
      // cupid's bow on the upper lip
      if (!this.isLower) y += 0.012 * R * Math.cos(u * Math.PI * 1.5) * (1 - corner);
      const z = -0.16 * R * corner + pucker * 0.06 * R * (1 - corner) + (smile > 0 ? -smile * 0.03 * R * corner : 0);
      out.set(x, y, z);
    };
    let k = 0;
    for (let i = 0; i <= this.uSegs; i++) {
      const u = (i / this.uSegs) * 2 - 1;
      centre(u, c);
      if (u < 0.99) {
        centre(u + 0.02, tangent);
        tangent.sub(c).normalize();
      } else {
        centre(u - 0.02, tangent);
        tangent.subVectors(c, tangent).normalize();
      }
      // radius tapers toward the corners
      const taper = 1 - 0.65 * Math.pow(Math.abs(u), 2.4);
      const r = this.r * taper * (1 + pucker * 0.3);
      // frame: normal roughly +Z (forward), binormal roughly +Y
      nrm.set(0, 0, 1);
      bin.crossVectors(tangent, nrm).normalize();
      nrm.crossVectors(bin, tangent).normalize();
      for (let j = 0; j <= this.aSegs; j++) {
        const a = (j / this.aSegs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        // lips are flatter front-to-back than tall
        const px = c.x + (nrm.x * ca * 0.75 + bin.x * sa) * r;
        const py = c.y + (nrm.y * ca * 0.75 + bin.y * sa) * r;
        const pz = c.z + (nrm.z * ca * 0.75 + bin.z * sa) * r;
        pos.setXYZ(k, px, py, pz);
        nor.setXYZ(k, nrm.x * ca + bin.x * sa, nrm.y * ca + bin.y * sa, nrm.z * ca + bin.z * sa);
        k++;
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------------ */
/* Materials                                                                 */
/* ------------------------------------------------------------------------ */

function skinMaterial(color: string): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.46,
    metalness: 0,
    sheen: 0.4,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#c48a5a'),
    clearcoat: 0.18,
    clearcoatRoughness: 0.45,
  });
  return m;
}
function clothMaterial(color: string, texture?: THREE.Texture, roughness = 0.92): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: texture ? '#ffffff' : color, roughness, metalness: 0 });
  if (texture) m.map = texture;
  return m;
}

/* ------------------------------------------------------------------------ */
/* Character                                                                 */
/* ------------------------------------------------------------------------ */

export class Character {
  readonly root = new THREE.Group();
  rig!: CharacterRig;
  face!: FaceParts;
  dims!: CharacterDims;
  readonly materials: THREE.Material[] = [];
  readonly geometries: THREE.BufferGeometry[] = [];
  /** world-space helper */
  private tmp = new THREE.Vector3();

  constructor(public readonly spec: CharacterSpec) {
    this.root.name = spec.name;
  }

  /** World position of a point in head space (0,0,0 = centre of the head). */
  headPoint(x = 0, y = 0, z = 0, out = new THREE.Vector3()): THREE.Vector3 {
    return this.face.headCenter.localToWorld(out.set(x, y, z));
  }
  eyePoint(out = new THREE.Vector3()): THREE.Vector3 {
    return this.headPoint(0, this.face.R * 0.08, this.face.R * 0.9, out);
  }
  chestPoint(out = new THREE.Vector3()): THREE.Vector3 {
    return this.rig.joints.chest.localToWorld(out.set(0, 0.02, 0.05));
  }
  handPoint(side: 'L' | 'R', out = new THREE.Vector3()): THREE.Vector3 {
    return this.rig.joints[side === 'L' ? 'handL' : 'handR'].localToWorld(out.set(0, -this.dims.handLength * 0.6, 0));
  }
  dispose(): void {
    this.materials.forEach((m) => m.dispose());
    this.geometries.forEach((g) => g.dispose());
  }
}

export function buildCharacter(spec: CharacterSpec): Character {
  const ch = new Character(spec);
  const H = spec.height;
  const low = spec.detail === 'low';
  const S = low ? 12 : 28; // ring segments
  const f = { ...DEFAULT_FACE, ...spec.face };
  const female = spec.sex === 'female';
  const stocky = spec.build === 'stocky';
  const adult = spec.build === 'adult' || stocky;

  const geos = ch.geometries;
  const mats = ch.materials;
  const G = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const M = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  const skinMat = M(skinMaterial(spec.skin));
  const hairMat = M(new THREE.MeshStandardMaterial({ color: spec.hair.color, roughness: 0.95, metalness: 0 }));
  const topMat = M(clothMaterial(spec.top.color, spec.top.texture));
  const bottomMat = M(clothMaterial(spec.bottom.color, spec.bottom.texture));
  const shoeMat = M(new THREE.MeshStandardMaterial({ color: spec.shoes, roughness: 0.6, metalness: 0.05 }));
  const soleMat = M(new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }));
  const eyeWhiteMat = M(new THREE.MeshStandardMaterial({ color: '#f3efe8', roughness: 0.25 }));
  const irisMat = M(new THREE.MeshStandardMaterial({ color: f.irisColor, roughness: 0.3 }));
  const pupilMat = M(new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.3 }));
  const highlightMat = M(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  const lipMat = M(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spec.skin).lerp(new THREE.Color('#6b2f35'), 0.45), roughness: 0.45, clearcoat: 0.25 }));
  const innerMouthMat = M(new THREE.MeshStandardMaterial({ color: '#3a0f12', roughness: 0.8 }));
  const teethMat = M(new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.35 }));
  const tearMat = M(new THREE.MeshPhysicalMaterial({ color: '#dceeff', transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1, depthWrite: false }));
  const accentMat = M(new THREE.MeshStandardMaterial({ color: spec.top.accent ?? '#222222', roughness: 0.7 }));
  const nailMat = skinMat;

  /* ---- key heights ---- */
  const hipY = 0.50 * H;
  const spineY = 0.575 * H;
  const chestY = 0.70 * H;
  const neckY = 0.805 * H;
  const headJointY = 0.85 * H;
  const headCenterY = 0.925 * H;
  const shoulderHalf = (female ? 0.1 : stocky ? 0.122 : 0.108) * H;
  const upperArmLen = 0.17 * H;
  const forearmLen = 0.145 * H;
  const handLen = 0.095 * H;
  const thighLen = 0.22 * H;
  const shinLen = 0.20 * H;
  const rx = 0.054 * H, ry = 0.071 * H, rz = 0.059 * H; // head radii
  const R = rx;

  /* ---- joints ---- */
  const J = {} as Record<JointName, THREE.Group>;
  const mk = (name: JointName, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    J[name] = g;
    return g;
  };
  const hips = mk('hips', ch.root, 0, hipY, 0);
  const spine = mk('spine', hips, 0, spineY - hipY, 0);
  const chest = mk('chest', spine, 0, chestY - spineY, 0);
  const neck = mk('neck', chest, 0, neckY - chestY, 0);
  const head = mk('head', neck, 0, headJointY - neckY, 0);
  const shoulderL = mk('shoulderL', chest, shoulderHalf * 0.55, 0.085 * H, 0);
  const shoulderR = mk('shoulderR', chest, -shoulderHalf * 0.55, 0.085 * H, 0);
  const upperArmL = mk('upperArmL', shoulderL, shoulderHalf * 0.45, 0, 0);
  const upperArmR = mk('upperArmR', shoulderR, -shoulderHalf * 0.45, 0, 0);
  const forearmL = mk('forearmL', upperArmL, 0, -upperArmLen, 0);
  const forearmR = mk('forearmR', upperArmR, 0, -upperArmLen, 0);
  const handRestL = new THREE.Group();
  handRestL.position.set(0, -forearmLen, 0);
  handRestL.rotation.y = Math.PI / 2;
  forearmL.add(handRestL);
  const handRestR = new THREE.Group();
  handRestR.position.set(0, -forearmLen, 0);
  handRestR.rotation.y = -Math.PI / 2;
  forearmR.add(handRestR);
  const handL = mk('handL', handRestL, 0, 0, 0);
  const handR = mk('handR', handRestR, 0, 0, 0);
  const thighL = mk('thighL', hips, 0.047 * H, -0.03 * H, 0);
  const thighR = mk('thighR', hips, -0.047 * H, -0.03 * H, 0);
  const shinL = mk('shinL', thighL, 0, -thighLen, 0);
  const shinR = mk('shinR', thighR, 0, -thighLen, 0);
  const footL = mk('footL', shinL, 0, -shinLen, 0);
  const footR = mk('footR', shinR, 0, -shinLen, 0);

  const rig = new CharacterRig(J);
  rig.hipsRest.set(0, hipY, 0);
  ch.rig = rig;

  const shadow = (m: THREE.Mesh) => {
    m.castShadow = !low;
    m.receiveShadow = false;
    return m;
  };

  /* ---- torso ---- */
  const torsoRings: Ring[] = female
    ? [
        { y: -0.065 * H, rx: 0.095 * H, rz: 0.072 * H },
        { y: 0.0, rx: 0.1 * H, rz: 0.074 * H },
        { y: 0.09 * H, rx: 0.079 * H, rz: 0.06 * H },
        { y: 0.17 * H, rx: 0.09 * H, rz: 0.066 * H, zOff: 0.03 * H },
        { y: 0.21 * H, rx: 0.095 * H, rz: 0.066 * H, zOff: 0.012 * H },
        { y: 0.255 * H, rx: shoulderHalf * 0.9, rz: 0.064 * H },
        { y: 0.283 * H, rx: shoulderHalf * 0.96, rz: 0.06 * H },
        { y: 0.3 * H, rx: shoulderHalf * 0.78, rz: 0.054 * H },
        { y: 0.314 * H, rx: shoulderHalf * 0.5, rz: 0.048 * H },
        { y: 0.325 * H, rx: 0.046 * H, rz: 0.043 * H },
      ]
    : [
        { y: -0.065 * H, rx: 0.086 * H, rz: 0.064 * H },
        { y: 0.0, rx: 0.09 * H, rz: 0.066 * H },
        { y: 0.1 * H, rx: (stocky ? 0.1 : 0.084) * H, rz: 0.06 * H },
        { y: 0.2 * H, rx: (stocky ? 0.11 : 0.098) * H, rz: 0.068 * H },
        { y: 0.255 * H, rx: shoulderHalf * 0.92, rz: 0.068 * H },
        { y: 0.283 * H, rx: shoulderHalf * 0.98, rz: 0.064 * H },
        { y: 0.3 * H, rx: shoulderHalf * 0.8, rz: 0.058 * H },
        { y: 0.314 * H, rx: shoulderHalf * 0.52, rz: 0.05 * H },
        { y: 0.325 * H, rx: 0.048 * H, rz: 0.045 * H },
      ];
  // the whole torso cloth is attached to the spine joint; pelvis part to hips.
  const upperRings = torsoRings.filter((r) => r.y >= 0.04 * H || r.y >= 0.0).map((r) => ({ ...r, y: r.y - (spineY - hipY) }));
  const lowerRings = torsoRings.filter((r) => r.y <= 0.1 * H).map((r) => ({ ...r }));
  // overlap: lower part up to waist, upper part from waist
  const torsoUpper = shadow(new THREE.Mesh(G(makeRingTube(upperRings, S, 0, true, false)), topMat));
  torsoUpper.position.y = 0;
  spine.add(torsoUpper);
  const pelvisRings = lowerRings.map((r) => ({ ...r, y: r.y }));
  const pelvisMat = spec.bottom.type === 'skirt' ? bottomMat : spec.top.type === 'hoodie' || spec.top.type === 'jacket' ? topMat : bottomMat;
  const pelvis = shadow(new THREE.Mesh(G(makeRingTube(pelvisRings, S, 0, false, true)), pelvisMat));
  hips.add(pelvis);

  // top details
  const frontZ = (y: number) => {
    // approximate front surface z of torso at local chest height
    return 0.07 * H;
  };
  if (spec.top.type === 'hoodie') {
    // kangaroo pocket
    const pocket = shadow(new THREE.Mesh(G(new RoundedBoxGeometry(0.12 * H, 0.06 * H, 0.012 * H, 3, 0.006 * H)), topMat));
    pocket.position.set(0, 0.0, 0.066 * H);
    hips.add(pocket);
    // hood ring at the neck + hood bulk behind
    const hoodRing = shadow(new THREE.Mesh(G(new THREE.TorusGeometry(0.055 * H, 0.02 * H, 10, 24)), topMat));
    hoodRing.rotation.x = Math.PI / 2 + 0.25;
    hoodRing.position.set(0, neckY - spineY + 0.016 * H, -0.012 * H);
    spine.add(hoodRing);
    const hoodBack = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(0.06 * H, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6)), topMat));
    hoodBack.scale.set(1.3, 0.8, 0.7);
    hoodBack.position.set(0, neckY - spineY - 0.015 * H, -0.065 * H);
    hoodBack.rotation.x = 0.5;
    spine.add(hoodBack);
    // drawstrings
    for (const sx of [-1, 1]) {
      const str = new THREE.Mesh(G(new THREE.CylinderGeometry(0.003 * H, 0.003 * H, 0.09 * H, 6)), accentMat);
      str.position.set(sx * 0.03 * H, neckY - spineY - 0.05 * H, 0.068 * H);
      spine.add(str);
    }
  }
  if (spec.top.type === 'jacket') {
    // zipper line and collar
    const zip = new THREE.Mesh(G(new THREE.BoxGeometry(0.008 * H, 0.26 * H, 0.004 * H)), accentMat);
    zip.position.set(0, 0.17 * H, 0.071 * H);
    spine.add(zip);
    for (const sx of [-1, 1]) {
      const collar = shadow(new THREE.Mesh(G(new RoundedBoxGeometry(0.06 * H, 0.04 * H, 0.012 * H, 2, 0.004 * H)), topMat));
      collar.position.set(sx * 0.04 * H, neckY - spineY - 0.01 * H, 0.045 * H);
      collar.rotation.set(-0.5, sx * 0.5, sx * 0.3);
      spine.add(collar);
      const pocket = new THREE.Mesh(G(new THREE.BoxGeometry(0.04 * H, 0.004 * H, 0.004 * H)), accentMat);
      pocket.position.set(sx * 0.05 * H, 0.05 * H, 0.063 * H);
      spine.add(pocket);
    }
  }
  if (spec.top.type === 'blouse') {
    // neckline trim
    const trim = shadow(new THREE.Mesh(G(new THREE.TorusGeometry(0.045 * H, 0.008 * H, 8, 24)), accentMat));
    trim.rotation.x = Math.PI / 2 + 0.3;
    trim.position.set(0, neckY - spineY - 0.0 * H, 0.012 * H);
    spine.add(trim);
  }
  if (spec.bottom.type !== 'skirt') {
    const belt = new THREE.Mesh(G(new THREE.TorusGeometry(0.087 * H, 0.007 * H, 8, 28)), M(new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.6 })));
    belt.rotation.x = Math.PI / 2;
    belt.scale.z = 0.75;
    belt.position.y = 0.03 * H;
    if (spec.top.type === 'shirt' || spec.top.type === 'blouse') hips.add(belt);
  }

  /* ---- neck ---- */
  const neckMesh = shadow(new THREE.Mesh(G(new THREE.CylinderGeometry(0.038 * H, 0.046 * H, 0.1 * H, 18)), skinMat));
  neckMesh.position.y = 0.035 * H;
  neck.add(neckMesh);

  /* ---- head ---- */
  const headCenter = new THREE.Group();
  headCenter.position.y = headCenterY - headJointY;
  head.add(headCenter);
  const headMesh = shadow(new THREE.Mesh(G(makeHeadGeometry(rx, ry, rz, f, low ? 20 : 48)), skinMat));
  headCenter.add(headMesh);
  const P = (ux: number, uy: number, uz: number) => new THREE.Vector3(ux * rx, uy * ry, uz * rz);

  // ears
  for (const sx of [-1, 1]) {
    const ear = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(1, 14, 10)), skinMat));
    ear.scale.set(0.085 * R, 0.26 * R, 0.17 * R);
    ear.position.copy(P(sx * 0.97, 0.0, -0.05));
    ear.rotation.z = sx * 0.15;
    headCenter.add(ear);
    const inner = new THREE.Mesh(G(new THREE.SphereGeometry(1, 10, 8)), M(new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.skin).multiplyScalar(0.7), roughness: 0.8 })));
    inner.scale.set(0.05 * R, 0.16 * R, 0.1 * R);
    inner.position.copy(P(sx * 1.0, 0.0, -0.04));
    headCenter.add(inner);
  }

  // nose
  const nose = new THREE.Group();
  nose.position.copy(P(0, -0.02, 0.9));
  nose.scale.setScalar(1.18);
  headCenter.add(nose);
  const nw = f.noseWidth;
  const bridge = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(1, 14, 10)), skinMat));
  bridge.scale.set(0.1 * R, 0.25 * R, 0.09 * R);
  bridge.position.set(0, 0.07 * R, -0.0);
  bridge.rotation.x = -0.3;
  nose.add(bridge);
  const tip = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(1, 16, 12)), skinMat));
  tip.scale.set(0.135 * R * nw, 0.115 * R, 0.12 * R);
  tip.position.set(0, -0.2 * R, 0.09 * R);
  nose.add(tip);
  for (const sx of [-1, 1]) {
    const ala = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(1, 12, 10)), skinMat));
    ala.scale.set(0.095 * R, 0.085 * R, 0.1 * R);
    ala.position.set(sx * 0.13 * R * nw, -0.235 * R, 0.0);
    nose.add(ala);
    const nostril = new THREE.Mesh(G(new THREE.SphereGeometry(1, 8, 6)), innerMouthMat);
    nostril.scale.set(0.04 * R, 0.025 * R, 0.035 * R);
    nostril.position.set(sx * 0.075 * R * nw, -0.31 * R, 0.04 * R);
    nose.add(nostril);
  }

  // eyes
  const makeEye = (sx: number): EyeParts => {
    const socket = new THREE.Group();
    socket.position.copy(P(sx * 0.31, 0.08, 0.86));
    headCenter.add(socket);
    const re = 0.15 * R * f.eyeSize;
    const group = new THREE.Group();
    socket.add(group);
    const ball = new THREE.Mesh(G(new THREE.SphereGeometry(re, low ? 12 : 24, low ? 8 : 16)), eyeWhiteMat);
    group.add(ball);
    const iris = new THREE.Mesh(G(new THREE.SphereGeometry(re * 1.015, 24, 10, 0, Math.PI * 2, 0, 0.8)), irisMat);
    iris.rotation.x = Math.PI / 2;
    group.add(iris);
    const pupil = new THREE.Mesh(G(new THREE.SphereGeometry(re * 1.03, 20, 8, 0, Math.PI * 2, 0, 0.38)), pupilMat);
    pupil.rotation.x = Math.PI / 2;
    group.add(pupil);
    const hl = new THREE.Mesh(G(new THREE.SphereGeometry(re * 0.16, 8, 6)), highlightMat);
    hl.position.set(-sx * re * 0.3, re * 0.35, re * 0.92);
    group.add(hl);
    // eyelids: quarter spheres pivoting around the eye centre
    const lidR = re * 1.1;
    const upperLid = new THREE.Group();
    const upperMesh = new THREE.Mesh(G(new THREE.SphereGeometry(lidR, 24, 8, 0, Math.PI, 0, Math.PI / 2)), skinMat);
    upperLid.add(upperMesh);
    if (!low) {
      const lash = new THREE.Mesh(G(new THREE.TorusGeometry(lidR * 0.99, 0.009 * R, 6, 20, Math.PI)), hairMat);
      lash.rotation.x = Math.PI / 2;
      upperLid.add(lash);
    }
    socket.add(upperLid);
    const lowerLid = new THREE.Group();
    const lowerMesh = new THREE.Mesh(G(new THREE.SphereGeometry(lidR, 24, 8, 0, Math.PI, Math.PI / 2, Math.PI / 2)), skinMat);
    lowerLid.add(lowerMesh);
    socket.add(lowerLid);
    // brow: a tube that hugs the skull surface above the eye
    const brow = new THREE.Group();
    const browY = 0.36;
    brow.position.copy(P(sx * 0.32, browY, 0));
    headCenter.add(brow);
    const onSkull = (ux: number, uy: number) => {
      const uz = Math.sqrt(Math.max(0.05, 1 - ux * ux - uy * uy));
      const [hx, hy, hz] = deformHead(ux, uy, uz, f);
      return new THREE.Vector3((hx - sx * 0.32) * rx, (hy - browY) * ry, hz * rz * 1.03);
    };
    const browCurve = new THREE.CatmullRomCurve3([
      onSkull(sx * 0.1, browY - 0.045),
      onSkull(sx * 0.22, browY + 0.01),
      onSkull(sx * 0.36, browY + 0.02),
      onSkull(sx * 0.52, browY - 0.03),
    ]);
    const browMesh = new THREE.Mesh(G(new THREE.TubeGeometry(browCurve, 12, 0.032 * R * f.browThickness, 8, false)), hairMat);
    browMesh.scale.y = 0.6;
    brow.add(browMesh);
    // tear drop
    const tear = new THREE.Mesh(G(new THREE.SphereGeometry(0.035 * R, 8, 6)), tearMat);
    tear.scale.set(1, 1.8, 0.8);
    tear.visible = false;
    socket.add(tear);
    return { group, socket, upperLid, lowerLid, brow, tear };
  };
  const eyeL = makeEye(1);
  const eyeR = makeEye(-1);

  // mouth
  const mouthGroup = new THREE.Group();
  mouthGroup.position.copy(P(0, -0.47, 0.86));
  headCenter.add(mouthGroup);
  const lipHW = 0.27 * R;
  const upperLip = new LipMesh(lipHW, 0.042 * R * f.lipFullness, 0.028 * R, false, R, lipMat);
  const lowerLip = new LipMesh(lipHW * 0.97, 0.052 * R * f.lipFullness, -0.04 * R, true, R, lipMat);
  mouthGroup.add(upperLip.mesh, lowerLip.mesh);
  const innerMouth = new THREE.Mesh(G(new THREE.SphereGeometry(1, 16, 10)), innerMouthMat);
  innerMouth.scale.set(lipHW * 0.95, 0.001, 0.1 * R);
  innerMouth.position.set(0, -0.02 * R, -0.05 * R);
  mouthGroup.add(innerMouth);
  const teeth = new THREE.Mesh(G(new RoundedBoxGeometry(lipHW * 1.3, 0.06 * R, 0.05 * R, 2, 0.01 * R)), teethMat);
  teeth.position.set(0, 0.0, -0.045 * R);
  mouthGroup.add(teeth);
  // a combined lip object for the face controller
  const lips = {
    mesh: upperLip.mesh,
    update: (smile: number, open: number, width: number, pucker: number) => {
      upperLip.update(smile, open, width, pucker);
      lowerLip.update(smile, open, width, pucker);
    },
  } as unknown as LipMesh;

  // hair
  if (spec.hair.style !== 'bald') {
    const hairGeo = G(new THREE.SphereGeometry(1, low ? 20 : 72, low ? 14 : 48));
    const pos = hairGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const natural = spec.hair.style === 'natural';
    const grow = natural ? 1.13 : 1.04;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      let { x, y, z } = v;
      // hairline: everything in front/below the hairline collapses onto the scalp.
      // In front of the ears (z > 0.25) the hairline runs high on the forehead and
      // drops toward the temples; behind that the hair reaches down to the side line.
      const frontLine = (natural ? 0.44 : 0.37) - 0.65 * Math.max(0, 0.95 - z);
      const sideLine = natural ? -0.22 : -0.2 + 0.12 * Math.max(0, -z);
      const inFront = z > 0.25;
      const inside = inFront ? y < frontLine : y < sideLine;
      const n = fbm2(x * 6 + 3, y * 6 + z * 5, 7, 3) - 0.5;
      const g = grow + (natural ? n * 0.12 : n * 0.04);
      const d = inFront ? y - frontLine : y - sideLine;
      // 0 = fully under the skin (follows the skull), 1 = full hair volume
      const k = inside ? 0 : Math.min(1, d / 0.16);
      const [hx, hy, hz] = deformHead(x, y, z, f);
      const ux = hx * rx * 0.975, uy = hy * ry * 0.975, uz = hz * rz * 0.975;
      const ox = x * rx * g * (natural ? 1.04 : 1), oy = y * ry * g * (natural ? 1.0 : 1.02), oz = z * rz * g * (natural ? 1.02 : 1);
      pos.setXYZ(i, ux + (ox - ux) * k, uy + (oy - uy) * k, uz + (oz - uz) * k);
    }
    hairGeo.computeVertexNormals();
    const hair = shadow(new THREE.Mesh(hairGeo, hairMat));
    hair.position.y = natural ? 0.04 * R : 0.02 * R;
    headCenter.add(hair);
    if (natural && spec.hair.band) {
      const band = new THREE.Mesh(G(new THREE.TorusGeometry(1.08 * rx, 0.045 * R, 8, 32)), M(new THREE.MeshStandardMaterial({ color: spec.hair.band, roughness: 0.7 })));
      band.scale.set(1, 1, rz / rx * 1.05);
      band.rotation.x = Math.PI / 2 - 0.28;
      band.position.set(0, 0.42 * ry, 0.02 * rz);
      headCenter.add(band);
    }
  }
  if (spec.hair.style === 'headwrap') {
    const wrap = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(1.06, 24, 18, 0, Math.PI * 2, 0, 1.6)), M(new THREE.MeshStandardMaterial({ color: spec.hair.band ?? '#c8422b', roughness: 0.85 }))));
    wrap.scale.set(rx * 1.05, ry * 1.08, rz * 1.05);
    wrap.position.y = 0.06 * R;
    headCenter.add(wrap);
  }

  /* ---- arms ---- */
  const sleeveLong = spec.top.sleeve === 'long';
  const armR1 = (female ? 0.03 : 0.033) * H, armR2 = 0.026 * H, foreR1 = 0.026 * H, foreR2 = (female ? 0.019 : 0.021) * H;
  for (const side of ['L', 'R'] as const) {
    const ua = side === 'L' ? upperArmL : upperArmR;
    const fa = side === 'L' ? forearmL : forearmR;
    const hd = side === 'L' ? handL : handR;
    const shoulderCap = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(armR1 * 1.12, 16, 12)), sleeveLong || spec.top.sleeve === 'short' ? topMat : skinMat));
    shoulderCap.position.y = 0.0;
    shoulderCap.scale.set(1, 0.9, 1);
    ua.add(shoulderCap);
    const upper = shadow(new THREE.Mesh(G(makeLimbGeometry(armR1 * 1.05, armR2, upperArmLen, S)), sleeveLong ? topMat : skinMat));
    ua.add(upper);
    if (spec.top.sleeve === 'short') {
      const sleeve = shadow(new THREE.Mesh(G(makeLimbGeometry(armR1 * 1.1, armR1 * 1.0, upperArmLen * 0.46, S)), topMat));
      sleeve.position.y = -0.004 * H;
      ua.add(sleeve);
    }
    const elbow = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(foreR1 * 0.96, 14, 10)), sleeveLong ? topMat : skinMat));
    fa.add(elbow);
    const fore = shadow(new THREE.Mesh(G(makeLimbGeometry(foreR1, foreR2, forearmLen, S)), sleeveLong ? topMat : skinMat));
    fa.add(fore);
    if (sleeveLong) {
      const cuff = new THREE.Mesh(G(new THREE.TorusGeometry(foreR2 * 1.05, 0.0045 * H, 6, 20)), accentMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -forearmLen + 0.012 * H;
      fa.add(cuff);
    }
    // wrist
    const wrist = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(foreR2 * 0.95, 12, 8)), skinMat));
    hd.add(wrist);
    // palm
    const palmW = 0.042 * H, palmL = 0.05 * H, palmT = 0.017 * H;
    const palm = shadow(new THREE.Mesh(G(new RoundedBoxGeometry(palmW, palmL, palmT, 3, palmT * 0.45)), skinMat));
    palm.position.set(0, -palmL * 0.5, 0);
    hd.add(palm);
    const chains: FingerChain[] = [];
    const thumbSide = side === 'L' ? -1 : 1;
    if (!low) {
      // fingers: index, middle, ring, pinky
      const fingerDefs = [
        { x: -0.015, len: 0.92 },
        { x: -0.005, len: 1.0 },
        { x: 0.005, len: 0.93 },
        { x: 0.015, len: 0.75 },
      ];
      const baseLen = 0.021 * H;
      const fr = 0.0062 * H;
      const thumbChain: FingerChain = { segments: [], isThumb: true, spreadSign: 0 };
      // thumb
      {
        let parent: THREE.Object3D = hd;
        let pos = new THREE.Vector3(thumbSide * (palmW * 0.5), -palmL * 0.25, -palmT * 0.15);
        for (let s = 0; s < 2; s++) {
          const seg = new THREE.Group();
          seg.position.copy(pos);
          if (s === 0) {
            seg.rotation.z = -thumbSide * 0.95;
            seg.rotation.x = 0.35;
          }
          parent.add(seg);
          const len = s === 0 ? baseLen * 1.15 : baseLen * 0.9;
          const m = shadow(new THREE.Mesh(G(new THREE.CapsuleGeometry(fr * 1.15, len, 4, 10)), skinMat));
          m.position.y = -len * 0.5;
          seg.add(m);
          thumbChain.segments.push(seg);
          parent = seg;
          pos = new THREE.Vector3(0, -len, 0);
        }
      }
      chains.push(thumbChain);
      for (const fd of fingerDefs) {
        const chain: FingerChain = { segments: [], isThumb: false, spreadSign: Math.sign(fd.x * thumbSide * -1) || 0 };
        let parent: THREE.Object3D = hd;
        let pos = new THREE.Vector3(thumbSide * fd.x * H, -palmL, 0);
        const lens = [baseLen * fd.len, baseLen * 0.8 * fd.len, baseLen * 0.62 * fd.len];
        for (let s = 0; s < 3; s++) {
          const seg = new THREE.Group();
          seg.position.copy(pos);
          parent.add(seg);
          const m = shadow(new THREE.Mesh(G(new THREE.CapsuleGeometry(fr * (1 - s * 0.08), lens[s], 4, 10)), skinMat));
          m.position.y = -lens[s] * 0.5;
          seg.add(m);
          if (s === 2) {
            const nail = new THREE.Mesh(G(new THREE.SphereGeometry(fr * 0.5, 8, 6)), nailMat);
            nail.scale.set(1, 1.3, 0.5);
            nail.position.set(0, -lens[s] * 0.7, fr * 0.7);
            seg.add(nail);
          }
          chain.segments.push(seg);
          parent = seg;
          pos = new THREE.Vector3(0, -lens[s], 0);
        }
        chains.push(chain);
      }
    } else {
      const mitt = shadow(new THREE.Mesh(G(new RoundedBoxGeometry(palmW, palmL * 0.9, palmT, 2, palmT * 0.45)), skinMat));
      mitt.position.set(0, -palmL * 1.4, 0);
      hd.add(mitt);
    }
    rig.fingers[side] = chains;
  }

  /* ---- legs ---- */
  const legMat = spec.bottom.type === 'skirt' ? skinMat : bottomMat;
  const thighR1 = (female ? 0.055 : 0.05) * H, thighR2 = 0.038 * H, shinR1 = 0.038 * H, shinR2 = 0.026 * H;
  for (const side of ['L', 'R'] as const) {
    const th = side === 'L' ? thighL : thighR;
    const sh = side === 'L' ? shinL : shinR;
    const ft = side === 'L' ? footL : footR;
    const thigh = shadow(new THREE.Mesh(G(makeLimbGeometry(thighR1, thighR2, thighLen, S)), legMat));
    th.add(thigh);
    const knee = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(shinR1 * 0.96, 14, 10)), legMat));
    sh.add(knee);
    const shin = shadow(new THREE.Mesh(G(makeLimbGeometry(shinR1, shinR2, shinLen, S)), legMat));
    sh.add(shin);
    if (spec.bottom.type === 'trousers') {
      const hem = new THREE.Mesh(G(new THREE.TorusGeometry(shinR2 * 1.08, 0.004 * H, 6, 20)), bottomMat);
      hem.rotation.x = Math.PI / 2;
      hem.position.y = -shinLen + 0.02 * H;
      sh.add(hem);
    }
    // shoe
    const shoe = shadow(new THREE.Mesh(G(new RoundedBoxGeometry(0.058 * H, 0.05 * H, 0.15 * H, 3, 0.016 * H)), shoeMat));
    shoe.position.set(0, -0.026 * H, 0.03 * H);
    ft.add(shoe);
    const sole = new THREE.Mesh(G(new RoundedBoxGeometry(0.062 * H, 0.012 * H, 0.155 * H, 2, 0.005 * H)), soleMat);
    sole.position.set(0, -0.046 * H, 0.03 * H);
    ft.add(sole);
    const ankle = shadow(new THREE.Mesh(G(new THREE.SphereGeometry(shinR2 * 1.05, 12, 8)), spec.bottom.type === 'skirt' ? skinMat : bottomMat));
    ft.add(ankle);
  }
  if (spec.bottom.type === 'skirt') {
    const skirtRings: Ring[] = [
      { y: 0.09 * H, rx: 0.1 * H, rz: 0.075 * H },
      { y: 0.0, rx: 0.11 * H, rz: 0.085 * H },
      { y: -0.15 * H, rx: 0.14 * H, rz: 0.11 * H },
      { y: -0.3 * H, rx: 0.175 * H, rz: 0.14 * H },
      { y: -0.4 * H, rx: 0.2 * H, rz: 0.16 * H },
    ];
    const skirt = shadow(new THREE.Mesh(G(makeRingTube(skirtRings, S + 8, 0.035, false, false)), bottomMat));
    skirt.material = M(clothMaterial(spec.bottom.color, spec.bottom.texture));
    (skirt.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    hips.add(skirt);
  }

  ch.face = { head, headCenter, eyeL, eyeR, lips, innerMouth, teeth, mouthGroup, R };
  ch.dims = { height: H, headCenterY, eyeY: headCenterY + 0.08 * ry, shoulderY: neckY - 0.01 * H, hipY, handLength: handLen };
  rig.applyPose({});
  ch.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).frustumCulled = false;
  });
  return ch;
}
