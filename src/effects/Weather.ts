/**
 * Procedural environmental effects, all deterministic functions of film time:
 *  - Rain: GPU point streaks whose fall is computed in the vertex shader from `time`.
 *  - Window droplets: small drops sliding down glass.
 *  - Dust motes drifting in sunlight.
 *  - Soft moving clouds.
 */
import * as THREE from 'three';
import { hash } from '../core/MathUtils';
import { spriteTexture } from '../core/Textures';

const rainVert = `
  uniform float time; uniform float height; uniform float speed; uniform float wind; uniform float size;
  attribute float seed;
  varying float vAlpha;
  void main(){
    vec3 p = position;
    float fall = mod(p.y - time * speed * (0.8 + seed * 0.4), height);
    p.y = fall;
    p.x += wind * (height - fall) * 0.15 + sin(time * 0.5 + seed * 6.28) * 0.1;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * (300.0 / -mv.z);
    vAlpha = 0.12 + 0.2 * seed;
  }`;
const rainFrag = `
  uniform vec3 color; varying float vAlpha;
  void main(){
    vec2 d = gl_PointCoord - 0.5;
    // vertical streak
    float a = (1.0 - smoothstep(0.0, 0.5, abs(d.y) * 1.0)) * (1.0 - smoothstep(0.0, 0.08, abs(d.x)));
    gl_FragColor = vec4(color, a * vAlpha);
  }`;

export class Rain {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  constructor(count: number, width: number, depth: number, height: number, opts: { speed?: number; wind?: number; size?: number; color?: string } = {}) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (hash(i * 3.1) - 0.5) * width;
      pos[i * 3 + 1] = hash(i * 5.3) * height;
      pos[i * 3 + 2] = (hash(i * 7.7) - 0.5) * depth;
      seed[i] = hash(i * 11.3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        height: { value: height },
        speed: { value: opts.speed ?? 7 },
        wind: { value: opts.wind ?? 0.3 },
        size: { value: opts.size ?? 14 },
        color: { value: new THREE.Color(opts.color ?? '#cfe0ff') },
      },
      vertexShader: rainVert,
      fragmentShader: rainFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
  }
  update(t: number): void {
    this.mat.uniforms.time.value = t;
  }
  dispose(): void {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}

/** Water droplets that run down a window pane (in the pane's local XY plane). */
export class WindowDroplets {
  readonly group = new THREE.Group();
  private drops: { mesh: THREE.Mesh; x: number; speed: number; phase: number; len: number }[] = [];
  constructor(width: number, height: number, count = 40) {
    const geo = new THREE.SphereGeometry(0.008, 8, 6);
    const mat = new THREE.MeshPhysicalMaterial({ color: '#dfeeff', roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      const s = 0.6 + hash(i * 2.2) * 1.2;
      m.scale.set(s, s * (1.5 + hash(i * 3.3)), 0.5);
      this.group.add(m);
      this.drops.push({ mesh: m, x: (hash(i * 1.7) - 0.5) * width, speed: 0.04 + hash(i * 9.1) * 0.12, phase: hash(i * 4.4) * 10, len: height });
    }
  }
  update(t: number): void {
    for (const d of this.drops) {
      // drops pause and slide: use a stepped time so they move in little runs
      const tt = t * d.speed + d.phase;
      const y = d.len / 2 - ((tt + Math.sin(tt * 3) * 0.1) % d.len);
      d.mesh.position.set(d.x + Math.sin(tt * 2) * 0.01, y, 0.004);
    }
  }
}

/** Dust motes floating in the air. */
export class Dust {
  readonly points: THREE.Points;
  private base: Float32Array;
  constructor(count: number, box: THREE.Box3, size = 0.035, color = '#ffe9c0') {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = box.min.x + hash(i * 1.3) * (box.max.x - box.min.x);
      pos[i * 3 + 1] = box.min.y + hash(i * 2.7) * (box.max.y - box.min.y);
      pos[i * 3 + 2] = box.min.z + hash(i * 3.9) * (box.max.z - box.min.z);
    }
    this.base = pos.slice();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size, map: spriteTexture(), transparent: true, opacity: 0.45, depthWrite: false, color, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }
  update(t: number): void {
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const b = i * 3;
      arr[b] = this.base[b] + Math.sin(t * 0.3 + i) * 0.15;
      arr[b + 1] = this.base[b + 1] + Math.sin(t * 0.2 + i * 1.7) * 0.1;
      arr[b + 2] = this.base[b + 2] + Math.cos(t * 0.25 + i * 0.6) * 0.15;
    }
    pos.needsUpdate = true;
  }
}

/** Soft clouds drifting across the sky (camera-facing sprites). */
export class Clouds {
  readonly group = new THREE.Group();
  private sprites: { s: THREE.Sprite; x0: number; speed: number }[] = [];
  constructor(count = 10, radius = 120, height = 45, color = '#ffffff', opacity = 0.75) {
    const mat = new THREE.SpriteMaterial({ map: spriteTexture(), color, transparent: true, opacity, depthWrite: false, fog: false });
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(mat);
      const w = 25 + hash(i * 1.1) * 40;
      s.scale.set(w, w * (0.3 + hash(i * 2.1) * 0.25), 1);
      const z = -radius + hash(i * 3.1) * radius * 2;
      s.position.set(0, height + hash(i * 4.1) * 20, z);
      this.group.add(s);
      this.sprites.push({ s, x0: (hash(i * 5.1) - 0.5) * radius * 2, speed: 0.4 + hash(i * 6.1) * 0.6 });
    }
  }
  update(t: number): void {
    for (const c of this.sprites) {
      const x = ((c.x0 + t * c.speed + 150) % 300) - 150;
      c.s.position.x = x;
    }
  }
}
