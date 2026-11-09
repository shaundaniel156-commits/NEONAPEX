/**
 * SCENE C - a local market: rows of wooden stalls under colourful umbrellas and
 * tarpaulins, piles of tomatoes, onions, potatoes, matooke bunches, rice sacks,
 * crates, sellers and customers, red murram ground, dust in the afternoon light.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Environment, LightingPreset } from './Environment';
import { dirtTexture, wallTexture, signTexture, woodTexture, fabricTexture } from '../core/Textures';
import { hash } from '../core/MathUtils';
import { Dust, Clouds } from '../effects/Weather';
import { Extra } from './Crowd';

export class MarketEnvironment extends Environment {
  readonly id = 'market';
  readonly presets: Record<string, LightingPreset> = {
    afternoon: {
      sun: { color: '#ffe0b0', intensity: 3.4, position: [-10, 12, 8] },
      ambient: { color: '#fff0dc', intensity: 0.4 },
      hemi: { sky: '#dbe6f5', ground: '#8f5a3a', intensity: 1.0 },
      fog: { color: '#e6d8c2', near: 30, far: 90 },
      sky: ['#3f7ccc', '#cfe0f5', '#f3dcb8'],
    },
    sunset: {
      sun: { color: '#ffb36b', intensity: 2.6, position: [-14, 5, 6] },
      ambient: { color: '#ffd4a8', intensity: 0.35 },
      hemi: { sky: '#f3c7a0', ground: '#6e4630', intensity: 0.8 },
      fog: { color: '#efcaa6', near: 25, far: 80 },
      sky: ['#4b5d9a', '#f0a070', '#fbd9a8'],
    },
  };
  private extras: Extra[] = [];
  private dust: Dust;
  private clouds: Clouds;
  private tarps: THREE.Mesh[] = [];
  readonly savingsTin: THREE.Group;

  constructor() {
    super();
    const g = this.group;
    const ground = this.mesh(new THREE.PlaneGeometry(120, 120), this.mat({ map: dirtTexture([24, 24]), roughness: 1 }), 0, 0, 0, false, true);
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);

    const wood = this.mat({ map: woodTexture([2, 1], '#7a5230'), roughness: 0.85 });
    const darkWood = this.mat({ color: '#4a3220', roughness: 0.9 });
    const tomatoMat = this.mat({ color: '#d9261c', roughness: 0.35, metalness: 0.05 });
    const onionMat = this.mat({ color: '#7b3b6a', roughness: 0.6 });
    const potatoMat = this.mat({ color: '#9c6b3f', roughness: 0.95 });
    const matookeMat = this.mat({ color: '#5f9a3a', roughness: 0.6 });
    const matookeStem = this.mat({ color: '#3d5a22', roughness: 0.9 });
    const sackMat = this.mat({ map: fabricTexture('#e6dcc2', [2, 2]), roughness: 1 });
    const basketMat = this.mat({ color: '#b08a4a', roughness: 1 });

    const tomatoGeo = new THREE.SphereGeometry(0.045, 10, 8);
    const onionGeo = new THREE.SphereGeometry(0.045, 10, 8);
    const potatoGeo = new THREE.SphereGeometry(0.05, 8, 6);
    this.disposables.push(tomatoGeo, onionGeo, potatoGeo);

    /** A pile of produce on a stall as an InstancedMesh. */
    const pile = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, w: number, d: number, count: number, seed: number, squash = 1) => {
      const im = new THREE.InstancedMesh(geo, mat, count);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      const p = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const u = hash(seed + i * 1.1), v = hash(seed + i * 2.3);
        // pile is a mound: height increases toward the centre
        const r = Math.hypot(u - 0.5, v - 0.5) * 2;
        const h = Math.max(0, 1 - r) * 0.12 + hash(seed + i * 3.7) * 0.03;
        p.set(x + (u - 0.5) * w, y + 0.04 + h, z + (v - 0.5) * d);
        q.setFromEuler(new THREE.Euler(hash(i) * 3, hash(i * 2) * 3, 0));
        const s = 0.85 + hash(seed + i * 5.1) * 0.35;
        sc.set(s, s * squash, s);
        m.compose(p, q, sc);
        im.setMatrixAt(i, m);
      }
      im.castShadow = true;
      im.receiveShadow = true;
      g.add(im);
      return im;
    };

    /** Matooke bunch: a stem with rows of curved green fingers. */
    const matooke = (x: number, y: number, z: number, seed: number) => {
      const b = new THREE.Group();
      b.position.set(x, y, z);
      b.rotation.y = hash(seed) * 6;
      b.add(this.mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 8), matookeStem, 0, 0.25, 0));
      const fingerGeo = new THREE.CapsuleGeometry(0.035, 0.18, 4, 8);
      this.disposables.push(fingerGeo);
      for (let row = 0; row < 4; row++) {
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + row * 0.4;
          const f = new THREE.Mesh(fingerGeo, matookeMat);
          f.position.set(Math.cos(a) * 0.12, 0.12 + row * 0.11, Math.sin(a) * 0.12);
          f.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
          f.castShadow = true;
          b.add(f);
        }
      }
      g.add(b);
      return b;
    };

    /** A sack of rice/beans leaning against a stall. */
    const sack = (x: number, z: number, label: string, seed: number) => {
      const s = new THREE.Group();
      s.position.set(x, 0, z);
      s.rotation.y = hash(seed) * 2;
      const body = this.mesh(new RoundedBoxGeometry(0.5, 0.75, 0.35, 3, 0.1), sackMat, 0, 0.37, 0);
      body.scale.set(1, 1, 1);
      s.add(body);
      const tag = this.mesh(new THREE.PlaneGeometry(0.36, 0.14), this.mat({ map: signTexture(label, '#f3eee0', '#8a1c1c') }), 0, 0.45, 0.18, false, false);
      s.add(tag);
      s.add(this.mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), this.mat({ color: '#d8ccb0' }), 0, 0.77, 0).rotateX(Math.PI / 2));
      g.add(s);
    };

    /** Umbrella on a pole over a stall. */
    const umbrella = (x: number, z: number, color: string, h = 2.4) => {
      const u = new THREE.Group();
      u.position.set(x, 0, z);
      u.add(this.mesh(new THREE.CylinderGeometry(0.025, 0.03, h, 8), darkWood, 0, h / 2, 0));
      const canopy = this.mesh(new THREE.ConeGeometry(1.5, 0.55, 10, 1, true), this.mat({ color, roughness: 0.8, side: THREE.DoubleSide }), 0, h + 0.1, 0);
      u.add(canopy);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        u.add(this.box(0.03, 0.1, 0.03, darkWood, Math.cos(a) * 1.45, h - 0.2, Math.sin(a) * 1.45));
      }
      g.add(u);
    };

    /** A stall: table on legs with produce. kind picks what's on it. */
    const stall = (x: number, z: number, yaw: number, kind: 'tomato' | 'onion' | 'potato' | 'matooke' | 'mixed', seed: number, umbrellaColor: string) => {
      const s = new THREE.Group();
      s.position.set(x, 0, z);
      s.rotation.y = yaw;
      s.add(this.box(1.9, 0.05, 0.9, wood, 0, 0.78, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(this.box(0.07, 0.78, 0.07, darkWood, sx * 0.88, 0.39, sz * 0.38));
      s.add(this.box(1.9, 0.05, 0.05, darkWood, 0, 0.35, 0.4));
      g.add(s);
      // piles are placed in world coords (stall yaw is 0 or PI so a simple flip is enough)
      const flip = Math.cos(yaw) < 0 ? -1 : 1;
      const px = (lx: number) => x + lx * flip;
      switch (kind) {
        case 'tomato':
          pile(tomatoGeo, tomatoMat, px(-0.5), 0.8, z, 0.7, 0.6, 70, seed, 0.9);
          pile(onionGeo, onionMat, px(0.45), 0.8, z, 0.6, 0.55, 45, seed + 7);
          break;
        case 'onion':
          pile(onionGeo, onionMat, px(-0.4), 0.8, z, 0.8, 0.6, 60, seed);
          pile(tomatoGeo, tomatoMat, px(0.5), 0.8, z, 0.5, 0.5, 35, seed + 3, 0.9);
          break;
        case 'potato':
          pile(potatoGeo, potatoMat, px(0), 0.8, z, 1.5, 0.6, 90, seed, 0.75);
          break;
        case 'matooke':
          matooke(px(-0.55), 0.8, z, seed);
          matooke(px(0.1), 0.8, z + 0.1, seed + 1);
          matooke(px(0.6), 0.8, z - 0.1, seed + 2);
          break;
        case 'mixed':
          pile(tomatoGeo, tomatoMat, px(-0.6), 0.8, z, 0.5, 0.5, 40, seed, 0.9);
          pile(potatoGeo, potatoMat, px(0.1), 0.8, z, 0.6, 0.55, 40, seed + 1, 0.75);
          pile(onionGeo, onionMat, px(0.65), 0.8, z, 0.45, 0.5, 30, seed + 2);
          break;
      }
      umbrella(x + 0.9 * flip, z - 0.55 * flip, umbrellaColor);
      return s;
    };

    // two rows of stalls along a central walkway (z axis), facing the walkway
    const colors = ['#d32f2f', '#1976d2', '#fbc02d', '#388e3c', '#f57c00', '#7b1fa2', '#0097a7', '#c2185b'];
    const kinds: ('tomato' | 'onion' | 'potato' | 'matooke' | 'mixed')[] = ['tomato', 'matooke', 'potato', 'mixed', 'onion', 'matooke', 'tomato', 'potato'];
    const stallSpots: { x: number; z: number; yaw: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const z = -10.5 + i * 3;
      stall(-2.6, z, Math.PI / 2 + Math.PI / 2, kinds[i], i * 11, colors[i % colors.length]); // left row faces +x
      stall(2.6, z, -Math.PI / 2 - Math.PI / 2, kinds[(i + 3) % kinds.length], i * 13 + 5, colors[(i + 3) % colors.length]); // right row faces -x
      stallSpots.push({ x: -2.6, z, yaw: 0 }, { x: 2.6, z, yaw: Math.PI });
    }
    // Grace's stall is the hero stall: right row, near z = -1.5 (index 3). Seller stands behind it (x = 3.6)
    const heroZ = -1.5;
    this.spots.graceStall = { x: 3.45, z: heroZ, yaw: -Math.PI / 2 };
    this.spots.customerAtStall = { x: 1.75, z: heroZ + 0.2, yaw: Math.PI / 2 };
    this.spots.walkIn = { x: 0.2, z: 12, yaw: Math.PI };
    this.spots.walkInEnd = { x: 1.4, z: heroZ + 0.6, yaw: Math.PI / 2 };
    this.spots.walkOut = { x: 0.2, z: -14, yaw: Math.PI };
    // sacks, crates, baskets around
    sack(4.1, -3.3, 'RICE 50kg', 1);
    sack(4.4, -2.6, 'BEANS', 2);
    sack(-4.0, 2.2, 'POSHO', 3);
    sack(-4.2, -6.5, 'RICE 25kg', 4);
    sack(4.0, 5.2, 'SUGAR', 5);
    for (let i = 0; i < 6; i++) {
      const c = this.mesh(new RoundedBoxGeometry(0.5, 0.3, 0.35, 2, 0.02), this.mat({ color: ['#2e7d32', '#1565c0', '#c62828'][i % 3], roughness: 0.7 }), (i % 2 ? 4.3 : -4.3), 0.15 + (i > 3 ? 0.3 : 0), -8 + i * 2.7);
      g.add(c);
    }
    for (let i = 0; i < 4; i++) g.add(this.mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.35, 12, 1, true), basketMat, -4.0 + hash(i) * 0.5, 0.18, 4.5 + i * 0.8));
    // savings tin on Grace's stall (prop used by scene 3)
    this.savingsTin = new THREE.Group();
    this.savingsTin.position.set(3.0, 0.81, heroZ - 0.35);
    this.savingsTin.add(this.mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16), this.mat({ color: '#b0b8c0', metalness: 0.8, roughness: 0.3 }), 0, 0.05, 0));
    this.savingsTin.add(this.mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 16), this.mat({ color: '#c62828', metalness: 0.3, roughness: 0.4 }), 0, 0.11, 0));
    g.add(this.savingsTin);
    this.props.savingsTin = this.savingsTin;
    // weighing scale
    const scale = new THREE.Group();
    scale.position.set(2.2, 0.8, heroZ + 0.3);
    scale.add(this.mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 14), this.mat({ color: '#c62828', metalness: 0.4, roughness: 0.4 }), 0, 0.04, 0));
    scale.add(this.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), this.mat({ color: '#cfcfcf', metalness: 0.8, roughness: 0.3 }), 0, 0.12, 0));
    g.add(scale);

    // tarpaulin shades spanning the walkway
    const tarpMat = this.mat({ color: '#5b8fe8', roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 3; i++) {
      const tarp = this.mesh(new THREE.PlaneGeometry(6, 4, 10, 8), tarpMat, 0, 3.6, -8 + i * 8, true, false);
      tarp.rotation.x = -Math.PI / 2;
      this.tarps.push(tarp);
      g.add(tarp);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(this.mesh(new THREE.CylinderGeometry(0.03, 0.04, 3.6, 8), darkWood, sx * 2.95, 1.8, -8 + i * 8 + sz * 1.95));
    }
    // surrounding buildings / walls
    const wallMat = this.mat({ map: wallTexture('#c8a97c', [8, 1]), roughness: 1 });
    g.add(this.box(28, 4, 0.4, wallMat, 0, 2, -17));
    g.add(this.box(0.4, 3.5, 36, this.mat({ map: wallTexture('#b7c6b0', [8, 1]) }), 8.5, 1.75, -2));
    g.add(this.box(0.4, 3.5, 36, this.mat({ map: wallTexture('#d8b6a0', [8, 1]) }), -8.5, 1.75, -2));
    const roof = this.mat({ color: '#8b3a2a', roughness: 0.7, metalness: 0.3 });
    g.add(this.box(12, 0.15, 6, roof, -14, 4.2, -12), this.box(12, 5.5, 6, this.mat({ map: wallTexture('#d9b382', [4, 2]) }), -14, 2, -12));
    g.add(this.box(14, 0.15, 7, roof, 15, 3.6, -10), this.box(14, 4.5, 7, this.mat({ map: wallTexture('#9fc5e8', [4, 2]) }), 15, 1.75, -10));
    const marketSign = this.mesh(new THREE.PlaneGeometry(6, 1.0), this.mat({ map: signTexture('NAKASERO MARKET', '#1a4d2e', '#ffe08a', 'fresh vegetables daily') }), 0, 3.4, -16.75, false, false);
    g.add(marketSign);
    // trees beyond the walls
    const trunkMat = this.mat({ color: '#5a3d26', roughness: 1 });
    const leafMat = this.mat({ color: '#3f7a32', roughness: 0.9 });
    for (const [x, z] of [[-11, 4], [11, 6], [-6, -20], [7, -21]]) {
      g.add(this.mesh(new THREE.CylinderGeometry(0.15, 0.25, 4, 8), trunkMat, x, 2, z));
      for (let k = 0; k < 5; k++) g.add(this.mesh(new THREE.SphereGeometry(1.4 + hash(k + x) * 0.8, 12, 10), leafMat, x + (hash(k * 3 + z) - 0.5) * 2.5, 4.4 + hash(k * 5) * 1.5, z + (hash(k * 7 + x) - 0.5) * 2.5));
    }

    // people: sellers behind stalls, customers wandering
    let seed = 300;
    stallSpots.forEach((sp, i) => {
      if (i === 7) return; // Grace's stall (index 7 = right row, z=-1.5)
      if (hash(i * 1.3) < 0.75) {
        const behind = sp.x < 0 ? sp.x - 0.85 : sp.x + 0.85;
        const e = new Extra(seed++, { kind: 'stand', pos: new THREE.Vector3(behind, 0, sp.z), yaw: sp.x < 0 ? Math.PI / 2 : -Math.PI / 2, gesture: hash(i * 2.2) < 0.4 ? 'explain' : hash(i) < 0.5 ? 'hips' : 'none' });
        g.add(e.char.root);
        this.extras.push(e);
      }
    });
    const paths: [number, number, number, number, number][] = [[0.6, 14, 0.6, -14, 0.9], [-0.7, -14, -0.7, 14, 0.8], [1.2, 14, -1.0, -14, 1.0], [-1.3, -14, 1.3, 14, 0.85]];
    paths.forEach((p, i) => {
      const e = new Extra(seed++, { kind: 'walk', path: { from: new THREE.Vector3(p[0], 0, p[1]), to: new THREE.Vector3(p[2], 0, p[3]), speed: p[4], offset: i * 11 } });
      g.add(e.char.root);
      this.extras.push(e);
    });
    const customers: [number, number, number, 'phone' | 'hips' | 'explain' | 'carry' | 'none'][] = [[-1.7, -7.3, -Math.PI / 2, 'explain'], [1.7, 4.4, Math.PI / 2, 'carry'], [-1.8, 7.6, -Math.PI / 2, 'none'], [1.8, -10.2, Math.PI / 2, 'phone']];
    customers.forEach((c) => {
      const e = new Extra(seed++, { kind: 'stand', pos: new THREE.Vector3(c[0], 0, c[1]), yaw: c[2], gesture: c[3] });
      g.add(e.char.root);
      this.extras.push(e);
    });

    // warm bounce fill around the hero stall so faces read under the umbrellas
    const fill = new THREE.PointLight('#ffe2c0', 9, 7, 1.7);
    fill.position.set(1.4, 2.6, 0.6);
    g.add(fill);
    const fill2 = new THREE.PointLight('#ffd9b8', 5, 6, 1.7);
    fill2.position.set(4.5, 2.4, -2.5);
    g.add(fill2);
    this.dust = new Dust(400, new THREE.Box3(new THREE.Vector3(-6, 0.3, -14), new THREE.Vector3(6, 3.5, 12)), 0.045, '#ffe0b8');
    g.add(this.dust.points);
    this.clouds = new Clouds(10, 100, 38);
    g.add(this.clouds.group);
    this.sun.shadow.camera.left = -14;
    this.sun.shadow.camera.right = 14;
    this.sun.shadow.camera.top = 14;
    this.sun.shadow.camera.bottom = -14;
    this.sun.shadow.camera.far = 80;
  }

  update(t: number): void {
    for (const e of this.extras) e.update(t);
    this.dust.update(t);
    this.clouds.update(t);
    // tarpaulins flap gently
    this.tarps.forEach((tp, i) => {
      const pos = tp.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k);
        pos.setZ(k, Math.sin(x * 1.3 + t * 1.5 + i) * 0.08 + Math.cos(y * 1.1 + t * 1.2) * 0.06);
      }
      pos.needsUpdate = true;
    });
  }
}
