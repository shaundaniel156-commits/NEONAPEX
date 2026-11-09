/**
 * SCENE B - a Kampala street: shop-lined buildings with painted signs, a tarmac
 * road with a drainage channel, pavements, boda bodas, white-and-blue matatu taxis,
 * street signs, power poles, a mobile-money kiosk, trees, pedestrians, dust and clouds.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Environment, LightingPreset } from './Environment';
import { facadeTexture, roadTexture, pavementTexture, signTexture, wallTexture, dirtTexture } from '../core/Textures';
import { hash } from '../core/MathUtils';
import { Dust, Clouds } from '../effects/Weather';
import { Extra } from './Crowd';

const SHOPS: [string, string, string, string?][] = [
  ['NAKATO HAIR SALON', '#c2185b', '#fff8e1', 'braids · weaves · barber'],
  ['KATO ELECTRONICS', '#1565c0', '#ffffff', 'phones · repairs · airtime'],
  ['MAMA MARIA RESTAURANT', '#2e7d32', '#fff3cd', 'matooke · luwombo · rolex'],
  ['CITY PHARMACY', '#ffffff', '#1b5e20', 'open 24 hrs'],
  ['JOSH STATIONERY', '#f9a825', '#1a237e', 'photocopy · printing · internet'],
  ['BODA STAGE', '#fdd835', '#000000'],
  ['SSALI HARDWARE', '#5d4037', '#ffe0b2', 'cement · paint · pipes'],
  ['NEW LIFE BOUTIQUE', '#6a1b9a', '#f3e5f5', 'ladies & gents wear'],
  ['MOBILE MONEY', '#ffd600', '#000000', 'deposit · withdraw'],
  ['KAMPALA CYBER CAFE', '#00838f', '#e0f7fa', 'internet · typing'],
];

export class KampalaStreetEnvironment extends Environment {
  readonly id = 'street';
  readonly presets: Record<string, LightingPreset> = {
    day: {
      sun: { color: '#fff1d6', intensity: 3.6, position: [10, 16, 6] },
      ambient: { color: '#ffffff', intensity: 0.35 },
      hemi: { sky: '#cfe3ff', ground: '#8a6b4a', intensity: 1.1 },
      fog: { color: '#d9e2ea', near: 35, far: 110 },
      sky: ['#3d7fd0', '#b9d6f5', '#f2e3c6'],
    },
    afternoon: {
      sun: { color: '#ffd9a8', intensity: 3.0, position: [-12, 9, 6] },
      ambient: { color: '#ffe9d0', intensity: 0.35 },
      hemi: { sky: '#e7d6c0', ground: '#7a5a40', intensity: 0.9 },
      fog: { color: '#e9d9c4', near: 30, far: 100 },
      sky: ['#5c7fc0', '#f3c38f', '#f8e3c0'],
    },
  };
  private extras: Extra[] = [];
  private vehicles: { obj: THREE.Object3D; z0: number; speed: number; x: number; wheels: THREE.Mesh[] }[] = [];
  private dust: Dust;
  private clouds: Clouds;

  constructor() {
    super();
    const g = this.group;
    // ground, road, pavements, drainage
    const dirt = this.mesh(new THREE.PlaneGeometry(160, 160), this.mat({ map: dirtTexture([30, 30]), roughness: 1 }), 0, -0.02, 0, false, true);
    dirt.rotation.x = -Math.PI / 2;
    g.add(dirt);
    const road = this.mesh(new THREE.PlaneGeometry(8, 90), this.mat({ map: roadTexture([1, 9]), roughness: 0.9 }), 0, 0, 0, false, true);
    road.rotation.x = -Math.PI / 2;
    g.add(road);
    const paveMat = this.mat({ map: pavementTexture([2, 40]), roughness: 0.95 });
    for (const sx of [-1, 1]) {
      g.add(this.box(3, 0.15, 90, paveMat, sx * 5.6, 0.075, 0));
      // open drainage channel between road and pavement
      g.add(this.box(0.5, 0.1, 90, this.mat({ color: '#4a4a4a' }), sx * 4.25, 0.0, 0));
      g.add(this.box(0.1, 0.18, 90, this.mat({ color: '#9a9a9a' }), sx * 4.05, 0.09, 0));
    }

    // buildings on both sides
    const roofMat = this.mat({ color: '#8b3a2a', roughness: 0.7, metalness: 0.3 });
    const roofMat2 = this.mat({ color: '#7d8a8f', roughness: 0.5, metalness: 0.6 });
    const windowMat = this.mat({ color: '#1b2a3a', roughness: 0.2, metalness: 0.4 });
    const frameMat = this.mat({ color: '#f1efe6', roughness: 0.7 });
    const colors = ['#d9b382', '#c94f3d', '#e6d9b8', '#8fb3c9', '#d6c56a', '#b0c8a0', '#e5a46b', '#cfcfcf', '#9fc5e8', '#e3b7a0'];
    let shopIdx = 0;
    for (const sx of [-1, 1]) {
      let z = -40;
      let i = 0;
      while (z < 40) {
        const w = 6 + hash(i * 1.3 + sx) * 5;
        const floors = 1 + Math.floor(hash(i * 2.1 + sx * 3) * 3);
        const h = 3.4 * floors;
        const d = 7 + hash(i * 3.7) * 4;
        const x = sx * (7.1 + d / 2);
        const color = colors[(i * 3 + (sx > 0 ? 1 : 0)) % colors.length];
        const b = this.box(d, h, w, this.mat({ map: facadeTexture(color, [Math.ceil(w / 3), floors]), roughness: 0.9 }), x, h / 2, z + w / 2);
        g.add(b);
        // roof
        if (hash(i * 5.1 + sx) < 0.6) g.add(this.box(d + 0.6, 0.12, w + 0.4, hash(i * 1.1) < 0.5 ? roofMat : roofMat2, x, h + 0.06, z + w / 2));
        else g.add(this.box(d + 0.2, 0.5, w + 0.2, this.mat({ color: '#b9a98f' }), x, h + 0.25, z + w / 2));
        // shop front on the ground floor facing the road
        const faceX = sx * 7.1 - sx * 0.01;
        const sign = SHOPS[shopIdx % SHOPS.length];
        shopIdx++;
        const signMesh = this.mesh(new THREE.PlaneGeometry(w * 0.85, 0.8), this.mat({ map: signTexture(sign[0], sign[1], sign[2], sign[3]), roughness: 0.8 }), faceX - sx * 0.06, 2.85, z + w / 2, false, false);
        signMesh.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(signMesh);
        // doorway + shop window
        const door = this.box(0.08, 2.2, 1.1, this.mat({ color: '#3b2a1a' }), faceX - sx * 0.04, 1.1, z + w * 0.3);
        g.add(door);
        const win = this.box(0.06, 1.3, w * 0.35, windowMat, faceX - sx * 0.03, 1.4, z + w * 0.68);
        g.add(win);
        // verandah: columns + slab
        g.add(this.box(1.6, 0.15, w, this.mat({ color: '#c9bca5' }), faceX - sx * 0.8, 3.3, z + w / 2));
        for (let c = 0; c <= 2; c++) g.add(this.box(0.25, 3.3, 0.25, this.mat({ color: '#b9ad99' }), faceX - sx * 1.5, 1.65, z + 0.3 + (w - 0.6) * (c / 2)));
        // upper floor windows
        for (let f = 1; f < floors; f++) {
          const n = Math.max(1, Math.floor(w / 2.2));
          for (let k = 0; k < n; k++) {
            const wz = z + (w / (n + 1)) * (k + 1);
            g.add(this.box(0.06, 1.2, 0.9, windowMat, faceX - sx * 0.02, 3.4 * f + 1.7, wz));
            g.add(this.box(0.1, 1.3, 1.0, frameMat, faceX + sx * 0.01, 3.4 * f + 1.7, wz));
            if (hash(f * 7 + k + i) < 0.4) g.add(this.box(0.9, 0.08, 1.2, this.mat({ color: '#c9bca5' }), faceX - sx * 0.45, 3.4 * f + 1.0, wz)); // balcony slab
          }
        }
        z += w + 0.3 + hash(i * 9.7) * 1.2;
        i++;
      }
    }

    // power poles and wires
    const poleMat = this.mat({ color: '#4a3c30', roughness: 1 });
    const wireMat = new THREE.LineBasicMaterial({ color: '#111111' });
    this.disposables.push(wireMat);
    const polePts: THREE.Vector3[] = [];
    for (let z = -40; z <= 40; z += 14) {
      const x = 6.9;
      g.add(this.mesh(new THREE.CylinderGeometry(0.08, 0.11, 7.5, 8), poleMat, x, 3.75, z));
      g.add(this.box(1.2, 0.08, 0.08, poleMat, x, 7.1, z));
      polePts.push(new THREE.Vector3(x - 0.5, 7.1, z), new THREE.Vector3(x + 0.5, 7.1, z));
    }
    for (let k = 0; k < 2; k++) {
      const pts: THREE.Vector3[] = [];
      for (let i = k; i < polePts.length; i += 2) pts.push(polePts[i]);
      for (let i = 0; i < pts.length - 1; i++) {
        const segs = 10;
        const line: THREE.Vector3[] = [];
        for (let s = 0; s <= segs; s++) {
          const kk = s / segs;
          const p = pts[i].clone().lerp(pts[i + 1], kk);
          p.y -= Math.sin(kk * Math.PI) * 0.5;
          line.push(p);
        }
        const geo = new THREE.BufferGeometry().setFromPoints(line);
        this.disposables.push(geo);
        g.add(new THREE.Line(geo, wireMat));
      }
    }

    // trees
    const trunkMat = this.mat({ color: '#5a3d26', roughness: 1 });
    const leafMat = this.mat({ color: '#3f7a32', roughness: 0.9 });
    for (const [x, z] of [[-6.2, -16], [6.3, 10], [-6.3, 22], [6.3, -30]]) {
      g.add(this.mesh(new THREE.CylinderGeometry(0.12, 0.2, 3, 8), trunkMat, x, 1.5, z));
      for (let k = 0; k < 5; k++) g.add(this.mesh(new THREE.SphereGeometry(1.1 + hash(k + x) * 0.6, 12, 10), leafMat, x + (hash(k * 3 + z) - 0.5) * 2, 3.4 + hash(k * 5) * 1.2, z + (hash(k * 7 + x) - 0.5) * 2));
    }

    // mobile-money kiosk (yellow) and a chapati stand
    const kiosk = new THREE.Group();
    kiosk.position.set(5.8, 0, 4);
    kiosk.add(this.box(1.4, 2.2, 1.2, this.mat({ color: '#ffd600', roughness: 0.6 }), 0, 1.1, 0));
    kiosk.add(this.box(1.5, 0.08, 1.3, this.mat({ color: '#333' }), 0, 2.25, 0));
    const kioskSign = this.mesh(new THREE.PlaneGeometry(1.3, 0.35), this.mat({ map: signTexture('MOBILE MONEY', '#ffd600', '#111') }), -0.71, 1.8, 0, false, false);
    kioskSign.rotation.y = -Math.PI / 2;
    kiosk.add(kioskSign);
    kiosk.add(this.box(0.05, 0.6, 0.8, this.mat({ color: '#1b2a3a', metalness: 0.4, roughness: 0.2 }), -0.71, 1.2, 0));
    g.add(kiosk);
    const stand = new THREE.Group();
    stand.position.set(-5.6, 0, -6);
    stand.add(this.box(1.2, 0.05, 0.6, this.mat({ map: wallTexture('#9a7b55', [1, 1]) }), 0, 0.85, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) stand.add(this.box(0.05, 0.85, 0.05, poleMat, sx * 0.55, 0.42, sz * 0.25));
    stand.add(this.mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 20), this.mat({ color: '#222', metalness: 0.6 }), 0, 0.89, 0));
    const umb = this.mesh(new THREE.ConeGeometry(1.2, 0.5, 8, 1, true), this.mat({ color: '#d32f2f', side: THREE.DoubleSide }), 0, 2.2, 0);
    stand.add(umb, this.mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), poleMat, 0, 1.1, 0));
    g.add(stand);

    // street signs
    const signPost = (x: number, z: number, text: string, bg: string, fg: string, rot: number) => {
      const p = new THREE.Group();
      p.position.set(x, 0, z);
      p.rotation.y = rot;
      p.add(this.mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), this.mat({ color: '#777', metalness: 0.6, roughness: 0.4 }), 0, 1.3, 0));
      const s = this.mesh(new THREE.PlaneGeometry(1.0, 0.3), this.mat({ map: signTexture(text, bg, fg), side: THREE.DoubleSide }), 0, 2.4, 0, false, false);
      p.add(s);
      g.add(p);
    };
    signPost(4.3, -2, 'KABALAGALA RD', '#1a4d2e', '#ffffff', Math.PI / 2);
    signPost(-4.3, 8, 'BODA STAGE', '#ffd600', '#000000', -Math.PI / 2);
    signPost(4.3, 16, 'TAXI STAGE', '#1565c0', '#ffffff', Math.PI / 2);
    // bins, jerrycans, crates
    for (const [x, z] of [[4.6, 7], [-4.6, -3], [4.7, -12]]) g.add(this.mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.7, 12), this.mat({ color: '#2e7d32', roughness: 0.6 }), x, 0.5, z));
    for (let i = 0; i < 6; i++) g.add(this.mesh(new RoundedBoxGeometry(0.28, 0.4, 0.2, 2, 0.03), this.mat({ color: '#e8c520', roughness: 0.5 }), -5.2 + hash(i) * 0.6, 0.35, -8 + i * 0.32));

    // vehicles
    for (let i = 0; i < 3; i++) this.addMatatu(i);
    for (let i = 0; i < 5; i++) this.addBoda(i);
    // parked bodas at the stage
    for (let i = 0; i < 3; i++) {
      const b = this.makeBoda(i + 10, true);
      b.obj.position.set(-4.9 + i * 0.05, 0, 9.5 + i * 0.9);
      b.obj.rotation.y = -0.6;
      g.add(b.obj);
    }

    // pedestrians
    const paths: [number, number, number, number, number][] = [
      [5.3, 30, 5.3, -30, 1.2], [6.2, -30, 6.2, 30, 1.1], [-5.4, -30, -5.4, 30, 1.3], [-6.3, 30, -6.3, -30, 1.0], [5.9, -30, 5.9, 30, 1.25], [-5.8, 30, -5.8, -30, 1.15],
    ];
    paths.forEach((p, i) => {
      const e = new Extra(100 + i, { kind: 'walk', path: { from: new THREE.Vector3(p[0], 0, p[1]), to: new THREE.Vector3(p[2], 0, p[3]), speed: p[4], offset: i * 9 } });
      g.add(e.char.root);
      this.extras.push(e);
    });
    const standing: [number, number, number, 'phone' | 'hips' | 'explain' | 'carry' | 'none'][] = [[6.3, 5.0, -1.3, 'phone'], [-4.6, 9.4, 1.2, 'hips'], [-5.0, 11.2, 2.0, 'explain'], [5.9, -4.5, 0.4, 'none'], [-6.0, -6.8, 1.6, 'carry']];
    standing.forEach((s, i) => {
      const e = new Extra(200 + i, { kind: 'stand', pos: new THREE.Vector3(s[0], 0, s[1]), yaw: s[2], gesture: s[3] });
      g.add(e.char.root);
      this.extras.push(e);
    });

    const fill = new THREE.PointLight('#ffe8d0', 8, 8, 1.7);
    fill.position.set(2.5, 3.0, 1.0);
    g.add(fill);
    this.dust = new Dust(300, new THREE.Box3(new THREE.Vector3(-8, 0.2, -20), new THREE.Vector3(8, 4, 20)), 0.05, '#ffe2b0');
    g.add(this.dust.points);
    this.clouds = new Clouds(12, 120, 40);
    g.add(this.clouds.group);

    // named spots used by the scene script (the +x pavement is the "hero" side)
    this.spots.walkStart = { x: 5.2, z: 14, yaw: Math.PI };
    this.spots.meet = { x: 5.2, z: 1.0, yaw: Math.PI };
    this.spots.brianStart = { x: 5.8, z: -12, yaw: 0 };
    this.spots.brianMeet = { x: 5.4, z: -0.6, yaw: 0 };
    this.spots.kiosk = { x: 4.8, z: 4, yaw: Math.PI / 2 };

    this.sun.shadow.camera.left = -14;
    this.sun.shadow.camera.right = 14;
    this.sun.shadow.camera.top = 14;
    this.sun.shadow.camera.bottom = -14;
    this.sun.shadow.camera.far = 80;
  }

  private makeMatatu(seed: number): { obj: THREE.Group; wheels: THREE.Mesh[] } {
    const v = new THREE.Group();
    const white = this.mat({ color: '#f4f4f4', roughness: 0.35, metalness: 0.2 });
    const blue = this.mat({ color: '#1e5bc6', roughness: 0.4 });
    const glass = this.mat({ color: '#223344', roughness: 0.1, metalness: 0.5 });
    const body = this.mesh(new RoundedBoxGeometry(1.9, 1.6, 4.6, 3, 0.15), white, 0, 1.15, 0);
    v.add(body);
    // blue checker band
    for (let i = 0; i < 12; i++) {
      for (const sx of [-1, 1]) {
        const m = this.box(0.02, 0.2, 0.36, blue, sx * 0.96, 1.05 + (i % 2) * 0.2, -2.1 + i * 0.38);
        v.add(m);
      }
    }
    // windows
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) v.add(this.box(0.02, 0.6, 0.8, glass, sx * 0.96, 1.5, -1.5 + i * 1.0));
    v.add(this.box(1.6, 0.7, 0.02, glass, 0, 1.55, 2.31));
    v.add(this.box(1.6, 0.6, 0.02, glass, 0, 1.5, -2.31));
    // roof rack + mirrors + lights
    v.add(this.box(1.6, 0.06, 3.5, this.mat({ color: '#555', metalness: 0.7 }), 0, 1.98, -0.2));
    for (const sx of [-1, 1]) v.add(this.box(0.08, 0.15, 0.1, this.mat({ color: '#222' }), sx * 1.02, 1.5, 1.9));
    for (const sx of [-1, 1]) v.add(this.mesh(new THREE.SphereGeometry(0.1, 8, 6), this.mat({ color: '#fff2b0', emissive: '#ffe08a', emissiveIntensity: 0.6 }), sx * 0.6, 0.8, 2.3));
    const wheels: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1.4, 1.5]) {
      const w = this.mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), this.mat({ color: '#111', roughness: 0.9 }), sx * 0.85, 0.33, sz);
      w.rotation.z = Math.PI / 2;
      v.add(w);
      wheels.push(w);
    }
    // driver + passengers (silhouettes)
    for (let i = 0; i < 3; i++) v.add(this.mesh(new THREE.SphereGeometry(0.13, 8, 6), this.mat({ color: '#2a1a10' }), (i % 2 ? 0.45 : -0.45), 1.55, 1.2 - i * 0.9));
    return { obj: v, wheels };
  }

  private makeBoda(seed: number, withRider = true): { obj: THREE.Group; wheels: THREE.Mesh[] } {
    const b = new THREE.Group();
    const frameMat = this.mat({ color: ['#c62828', '#1565c0', '#2e7d32', '#111'][seed % 4], roughness: 0.4, metalness: 0.5 });
    const black = this.mat({ color: '#111', roughness: 0.9 });
    const chrome = this.mat({ color: '#cfcfcf', roughness: 0.2, metalness: 0.9 });
    const wheels: THREE.Mesh[] = [];
    for (const z of [-0.65, 0.7]) {
      const w = this.mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 20), black, 0, 0.34, z);
      w.userData.torus = true;
      w.rotation.y = Math.PI / 2;
      b.add(w);
      wheels.push(w);
      b.add(this.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), chrome, 0, 0.34, z).rotateZ(Math.PI / 2));
    }
    b.add(this.box(0.18, 0.3, 0.9, frameMat, 0, 0.6, 0.05));
    b.add(this.box(0.25, 0.35, 0.4, this.mat({ color: '#333' }), 0, 0.55, 0.0)); // engine
    b.add(this.box(0.3, 0.12, 0.75, black, 0, 0.82, -0.15)); // seat
    b.add(this.box(0.28, 0.22, 0.45, frameMat, 0, 0.82, 0.35)); // tank
    b.add(this.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), chrome, 0, 1.05, 0.55).rotateZ(Math.PI / 2)); // handlebars
    b.add(this.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), chrome, 0, 0.75, 0.6).rotateX(0.35)); // fork
    b.add(this.mesh(new THREE.SphereGeometry(0.08, 8, 6), this.mat({ color: '#fff2b0', emissive: '#ffe08a', emissiveIntensity: 0.6 }), 0, 0.95, 0.75));
    if (withRider) {
      // simple rider silhouette with a helmet + reflective vest
      b.add(this.mesh(new RoundedBoxGeometry(0.34, 0.5, 0.26, 2, 0.06), this.mat({ color: ['#ff6f00', '#ffeb3b', '#ff6f00', '#1e88e5'][seed % 4] }), 0, 1.15, -0.1));
      b.add(this.mesh(new THREE.SphereGeometry(0.13, 10, 8), this.mat({ color: '#2a1a10' }), 0, 1.52, -0.08));
      b.add(this.mesh(new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, 1.8), this.mat({ color: ['#d32f2f', '#fbc02d', '#1565c0', '#eeeeee'][seed % 4], roughness: 0.3 }), 0, 1.55, -0.08));
      for (const sx of [-1, 1]) {
        b.add(this.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6), this.mat({ color: '#3a2a1c' }), sx * 0.22, 1.0, 0.2).rotateX(-1.0));
        b.add(this.mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 6), this.mat({ color: '#263238' }), sx * 0.15, 0.6, -0.05).rotateX(0.3));
      }
    }
    return { obj: b, wheels };
  }

  private addMatatu(i: number): void {
    const m = this.makeMatatu(i);
    const dir = i % 2 ? 1 : -1;
    m.obj.rotation.y = dir > 0 ? 0 : Math.PI;
    this.group.add(m.obj);
    this.vehicles.push({ obj: m.obj, z0: -40 + i * 27, speed: dir * (6 + i), x: dir > 0 ? 2.2 : -2.2, wheels: m.wheels });
  }
  private addBoda(i: number): void {
    const b = this.makeBoda(i);
    const dir = i % 2 ? -1 : 1;
    b.obj.rotation.y = dir > 0 ? 0 : Math.PI;
    this.group.add(b.obj);
    this.vehicles.push({ obj: b.obj, z0: -40 + i * 16, speed: dir * (8 + i * 1.5), x: dir > 0 ? 1.2 + (i % 2) * 0.8 : -1.2 - (i % 3) * 0.6, wheels: b.wheels });
  }

  update(t: number): void {
    for (const v of this.vehicles) {
      const z = ((v.z0 + t * v.speed + 60) % 120) - 60;
      v.obj.position.set(v.x, 0, z);
      for (const w of v.wheels) w.rotation.set(t * v.speed * 3, w.userData.torus ? Math.PI / 2 : 0, w.userData.torus ? 0 : Math.PI / 2);
    }
    for (const e of this.extras) e.update(t);
    this.dust.update(t);
    this.clouds.update(t);
  }
}
