/**
 * Base class and helpers shared by the four procedural environments.
 */
import * as THREE from 'three';
import { skyTexture } from '../core/Textures';

export interface Spot {
  x: number;
  z: number;
  yaw: number;
}

export interface LightingPreset {
  sun: { color: string; intensity: number; position: [number, number, number] } | null;
  ambient: { color: string; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  fog: { color: string; near: number; far: number } | null;
  sky: [string, string, string];
  /** extra point/spot lights are controlled by the environment itself */
  interior?: number;
}

export abstract class Environment {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly hemi: THREE.HemisphereLight;
  readonly sky: THREE.Mesh;
  readonly interiorLights: THREE.Light[] = [];
  /** named positions characters can be placed at */
  readonly spots: Record<string, Spot> = {};
  /** named props (laptop, chair, phone...) that scenes can reference */
  readonly props: Record<string, THREE.Object3D> = {};
  readonly disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  protected currentPreset = '';
  abstract readonly id: string;
  abstract readonly presets: Record<string, LightingPreset>;

  constructor() {
    this.sun = new THREE.DirectionalLight('#ffffff', 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 60;
    const s = 12;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.group.add(this.sun, this.sun.target);
    this.ambient = new THREE.AmbientLight('#ffffff', 0.3);
    this.hemi = new THREE.HemisphereLight('#bcd4ff', '#6b5540', 0.5);
    this.group.add(this.ambient, this.hemi);
    const skyGeo = new THREE.SphereGeometry(180, 24, 12);
    this.sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }));
    this.group.add(this.sky);
    this.disposables.push(skyGeo, this.sky.material as THREE.Material);
  }

  /** Called by the Director each frame. */
  abstract update(t: number, dt: number): void;

  applyPresetIfChanged(name: string, scene: THREE.Scene): void {
    if (this.currentPreset !== name) this.applyPreset(name, scene);
  }

  applyPreset(name: string, scene: THREE.Scene): void {
    const p = this.presets[name] ?? this.presets[Object.keys(this.presets)[0]];
    this.currentPreset = name;
    if (p.sun) {
      this.sun.visible = true;
      this.sun.color.set(p.sun.color);
      this.sun.intensity = p.sun.intensity;
      this.sun.position.set(...p.sun.position);
      this.sun.target.position.set(0, 0, 0);
    } else this.sun.visible = false;
    this.ambient.color.set(p.ambient.color);
    this.ambient.intensity = p.ambient.intensity;
    this.hemi.color.set(p.hemi.sky);
    this.hemi.groundColor.set(p.hemi.ground);
    this.hemi.intensity = p.hemi.intensity;
    scene.fog = p.fog ? new THREE.Fog(p.fog.color, p.fog.near, p.fog.far) : null;
    (this.sky.material as THREE.MeshBasicMaterial).map = skyTexture(...p.sky);
    (this.sky.material as THREE.MeshBasicMaterial).needsUpdate = true;
    const k = p.interior ?? 1;
    for (const l of this.interiorLights) l.intensity = (l.userData.baseIntensity ?? l.intensity) * k;
  }

  /** Helper: create a mesh, register geometry/material for disposal. */
  protected mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, cast = true, receive = true): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    this.disposables.push(geo);
    return m;
  }
  protected mat(opts: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial(opts);
    this.disposables.push(m);
    return m;
  }
  protected box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }
  protected addInteriorLight(light: THREE.Light): void {
    light.userData.baseIntensity = light.intensity;
    this.interiorLights.push(light);
    this.group.add(light);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
