/**
 * SCENE D - Daniel's bedroom at night: bed, desk with the old laptop and a lamp,
 * chair, wardrobe, shelf, window with rain running down the glass, rain outside,
 * lightning, a kerosene lamp for the power cut.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Environment, LightingPreset } from './Environment';
import { woodTexture, wallTexture, fabricTexture, laptopScreenTexture, waxPrintTexture, signTexture } from '../core/Textures';
import { Rain, WindowDroplets } from '../effects/Weather';
import { hash } from '../core/MathUtils';

export class BedroomEnvironment extends Environment {
  readonly id = 'bedroom';
  readonly presets: Record<string, LightingPreset> = {
    nightRain: {
      sun: { color: '#8ea2d8', intensity: 0.9, position: [-6, 8, 4] },
      ambient: { color: '#6b7cb0', intensity: 0.35 },
      hemi: { sky: '#58709c', ground: '#2a2420', intensity: 0.9 },
      fog: { color: '#0b1020', near: 6, far: 30 },
      sky: ['#04070f', '#0b1226', '#141a2c'],
      interior: 1,
    },
    powerCut: {
      sun: { color: '#8ea2d8', intensity: 0.45, position: [-6, 8, 4] },
      ambient: { color: '#5c6c9c', intensity: 0.45 },
      hemi: { sky: '#4c5c8c', ground: '#2a2420', intensity: 0.9 },
      fog: { color: '#070a14', near: 6, far: 30 },
      sky: ['#04070f', '#0b1226', '#141a2c'],
      interior: 0.0,
    },
    dawn: {
      sun: { color: '#ffc9a0', intensity: 1.4, position: [-8, 4, 6] },
      ambient: { color: '#d9c8c0', intensity: 0.3 },
      hemi: { sky: '#e5c8c0', ground: '#4a3a30', intensity: 0.7 },
      fog: { color: '#d8c0b4', near: 10, far: 40 },
      sky: ['#5a6ea8', '#f0b48a', '#f8dcc0'],
      interior: 0.4,
    },
  };
  private rain: Rain;
  private droplets: WindowDroplets;
  readonly deskLamp: THREE.PointLight;
  readonly screenLight: THREE.PointLight;
  readonly keroseneLight: THREE.PointLight;
  private laptopScreen: THREE.MeshStandardMaterial;
  private lightning: THREE.DirectionalLight;
  readonly keroseneLamp: THREE.Group;
  private flame: THREE.Mesh;
  lightningFlash = 0;

  constructor() {
    super();
    const g = this.group;
    const W = 4.2, D = 3.8, Hh = 2.7;
    const wallMat = this.mat({ map: wallTexture('#c7c2b8', [3, 1]), roughness: 0.95 });
    const floorMat = this.mat({ map: woodTexture([3, 3], '#6b4428'), roughness: 0.8 });
    const darkWood = this.mat({ map: woodTexture([1, 1], '#4a2c16'), roughness: 0.7 });
    const metal = this.mat({ color: '#9ea3a8', roughness: 0.4, metalness: 0.7 });
    const floor = this.mesh(new THREE.PlaneGeometry(W, D), floorMat, 0, 0, 0, false, true);
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);
    const ceil = this.mesh(new THREE.PlaneGeometry(W, D), this.mat({ color: '#d8d2c8' }), 0, Hh, 0, false, false);
    ceil.rotation.x = Math.PI / 2;
    g.add(ceil);
    g.add(this.box(W, Hh, 0.15, wallMat, 0, Hh / 2, -D / 2 - 0.075)); // back wall (-Z) with window
    g.add(this.box(W, Hh, 0.15, wallMat, 0, Hh / 2, D / 2 + 0.075)); // door wall (+Z)
    g.add(this.box(0.15, Hh, D, wallMat, W / 2 + 0.075, Hh / 2, 0));
    g.add(this.box(0.15, Hh, D, wallMat, -W / 2 - 0.075, Hh / 2, 0));
    // window in the back wall above the desk
    const winW = 1.3, winH = 1.1, winY = 1.6;
    const cut = new THREE.Group();
    // (the back wall is solid; we place a window frame "inset" with glass in front of it, plus a night view box behind the glass)
    cut.position.set(0, winY, -D / 2 + 0.01);
    const frameMat = this.mat({ color: '#e8e4dc', roughness: 0.6 });
    cut.add(this.box(winW + 0.12, 0.06, 0.12, frameMat, 0, winH / 2, 0), this.box(winW + 0.12, 0.06, 0.12, frameMat, 0, -winH / 2, 0), this.box(0.06, winH, 0.12, frameMat, winW / 2, 0, 0), this.box(0.06, winH, 0.12, frameMat, -winW / 2, 0, 0), this.box(0.03, winH, 0.08, frameMat, 0, 0, 0));
    // night outside: dark blue plane with distant lit windows
    const outside = this.mesh(new THREE.PlaneGeometry(winW, winH), this.mat({ color: '#0d1430', emissive: '#0d1430', emissiveIntensity: 0.35 }), 0, 0, -0.05, false, false);
    cut.add(outside);
    for (let i = 0; i < 9; i++) {
      const lit = this.mesh(new THREE.PlaneGeometry(0.05, 0.04), this.mat({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 2 }), -0.5 + hash(i * 1.3) * 1.0, -0.4 + hash(i * 2.1) * 0.5, -0.04, false, false);
      cut.add(lit);
    }
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshPhysicalMaterial({ color: '#8fa8d8', roughness: 0.08, transparent: true, opacity: 0.18, clearcoat: 1 }));
    glass.position.z = 0.0;
    cut.add(glass);
    this.droplets = new WindowDroplets(winW - 0.1, winH - 0.1, 50);
    this.droplets.group.position.z = 0.012;
    cut.add(this.droplets.group);
    for (let i = -1; i <= 1; i++) cut.add(this.box(0.015, winH, 0.015, metal, i * 0.4, 0, 0.03));
    g.add(cut);
    // curtains
    const curtainMat = this.mat({ map: waxPrintTexture([1, 2]), roughness: 0.9, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      const c = this.mesh(new THREE.PlaneGeometry(0.45, winH + 0.3, 6, 8), curtainMat, sx * (winW / 2 + 0.05), winY, -D / 2 + 0.12, false, false);
      const pos = c.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 18) * 0.03);
      c.geometry.computeVertexNormals();
      g.add(c);
    }
    g.add(this.mesh(new THREE.CylinderGeometry(0.015, 0.015, winW + 0.9, 8), darkWood, 0, winY + winH / 2 + 0.15, -D / 2 + 0.14).rotateZ(Math.PI / 2));

    // desk under the window with the laptop, lamp, phone, notebook, cup
    const desk = new THREE.Group();
    desk.position.set(0, 0, -D / 2 + 0.5);
    desk.add(this.box(1.5, 0.04, 0.7, this.mat({ map: woodTexture([2, 1], '#8a5a35') }), 0, 0.74, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) desk.add(this.box(0.05, 0.72, 0.05, darkWood, sx * 0.7, 0.36, sz * 0.3));
    desk.add(this.box(0.05, 0.6, 0.6, darkWood, -0.7, 0.42, 0)); // side panel
    g.add(desk);
    this.props.desk = desk;
    this.spots.deskChair = { x: 0, z: -D / 2 + 1.05, yaw: Math.PI };
    this.spots.deskStand = { x: 0.1, z: -D / 2 + 1.35, yaw: Math.PI };
    this.spots.bedSit = { x: 1.45, z: 0.3, yaw: -Math.PI / 2 };
    this.spots.doorway = { x: -1.2, z: 1.65, yaw: Math.PI };
    this.spots.besideDesk = { x: -0.9, z: -D / 2 + 1.1, yaw: Math.PI / 2 + 0.5 };
    this.spots.besideDeskRight = { x: 0.9, z: -D / 2 + 1.1, yaw: -Math.PI / 2 - 0.5 };
    this.spots.laptopScreen = { x: 0, z: -D / 2 + 0.35, yaw: 0 };
    // chair (facing the desk, i.e. -Z)
    const chair = new THREE.Group();
    chair.position.set(0, 0, -D / 2 + 1.05);
    const plastic = this.mat({ color: '#7a2d2d', roughness: 0.6 });
    chair.add(this.box(0.44, 0.04, 0.44, plastic, 0, 0.45, 0));
    chair.add(this.box(0.44, 0.45, 0.04, plastic, 0, 0.7, 0.2));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) chair.add(this.box(0.035, 0.45, 0.035, plastic, sx * 0.19, 0.225, sz * 0.19));
    g.add(chair);
    // laptop
    const laptop = new THREE.Group();
    laptop.position.set(0, 0.765, -D / 2 + 0.42);
    laptop.rotation.y = Math.PI;
    const lapMat = this.mat({ color: '#3a3d42', roughness: 0.5, metalness: 0.3 });
    laptop.add(this.mesh(new RoundedBoxGeometry(0.34, 0.02, 0.24, 2, 0.006), lapMat, 0, 0.01, 0));
    const lid = new THREE.Group();
    lid.position.set(0, 0.02, 0.12);
    lid.rotation.x = 0.32;
    lid.add(this.mesh(new RoundedBoxGeometry(0.34, 0.23, 0.012, 2, 0.005), lapMat, 0, 0.115, 0));
    this.laptopScreen = this.mat({ map: laptopScreenTexture(0.5), emissive: '#ffffff', emissiveMap: laptopScreenTexture(0.5), emissiveIntensity: 1.2, roughness: 0.3 });
    const screen = this.mesh(new THREE.PlaneGeometry(0.31, 0.2), this.laptopScreen, 0, 0.115, -0.007, false, false);
    screen.rotation.y = Math.PI;
    lid.add(screen);
    laptop.add(lid);
    const keyMat = this.mat({ color: '#202225', roughness: 0.6 });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 11; c++) laptop.add(this.box(0.022, 0.004, 0.02, keyMat, -0.13 + c * 0.026, 0.022, -0.07 + r * 0.026));
    g.add(laptop);
    this.props.laptop = laptop;
    this.screenLight = new THREE.PointLight('#8fb8ff', 2.4, 3, 1.6);
    this.screenLight.position.set(0, 1.0, -D / 2 + 0.6);
    this.group.add(this.screenLight);
    this.screenLight.userData.baseIntensity = 2.4;
    // desk lamp
    const lamp = new THREE.Group();
    lamp.position.set(-0.55, 0.76, -D / 2 + 0.35);
    lamp.add(this.mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.02, 14), metal, 0, 0.01, 0));
    lamp.add(this.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), metal, 0, 0.2, 0));
    const shade = this.mesh(new THREE.ConeGeometry(0.12, 0.14, 16, 1, true), this.mat({ color: '#2f6b4a', side: THREE.DoubleSide, roughness: 0.6 }), 0.06, 0.42, 0.04);
    shade.rotation.z = -0.5;
    lamp.add(shade);
    lamp.add(this.mesh(new THREE.SphereGeometry(0.03, 8, 6), this.mat({ color: '#fff4d6', emissive: '#ffd890', emissiveIntensity: 0.8 }), 0.07, 0.38, 0.05));
    g.add(lamp);
    this.deskLamp = new THREE.PointLight('#ffd59a', 5.5, 5, 1.6);
    this.deskLamp.position.set(-0.45, 1.15, -D / 2 + 0.45);
    this.deskLamp.castShadow = true;
    this.deskLamp.shadow.mapSize.set(512, 512);
    this.addInteriorLight(this.deskLamp);
    // phone, notebook, pen, cup
    g.add(this.mesh(new RoundedBoxGeometry(0.07, 0.008, 0.14, 2, 0.004), this.mat({ color: '#111', roughness: 0.3 }), 0.45, 0.765, -D / 2 + 0.5));
    g.add(this.box(0.2, 0.015, 0.26, this.mat({ color: '#f4efe4' }), 0.35, 0.77, -D / 2 + 0.25));
    g.add(this.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), this.mat({ color: '#1565c0' }), 0.42, 0.78, -D / 2 + 0.3).rotateZ(Math.PI / 2).rotateX(0.6));
    g.add(this.mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 14), this.mat({ color: '#d35a3a', roughness: 0.4 }), -0.25, 0.81, -D / 2 + 0.2));
    // bed along the +x wall
    const bed = new THREE.Group();
    bed.position.set(1.5, 0, 0.3);
    bed.add(this.box(0.95, 0.3, 1.95, darkWood, 0, 0.15, 0));
    bed.add(this.mesh(new RoundedBoxGeometry(0.9, 0.2, 1.9, 2, 0.05), this.mat({ map: fabricTexture('#5e6e8e', [4, 4]), roughness: 0.95 }), 0, 0.4, 0));
    bed.add(this.mesh(new RoundedBoxGeometry(0.55, 0.12, 0.35, 2, 0.05), this.mat({ color: '#f1ece2', roughness: 0.9 }), 0, 0.55, -0.72));
    bed.add(this.mesh(new RoundedBoxGeometry(0.9, 0.07, 1.15, 2, 0.03), this.mat({ map: waxPrintTexture([2, 2]), roughness: 0.9 }), 0, 0.53, 0.3));
    g.add(bed);
    this.spots.bedSit = { x: 1.45, z: 0.2, yaw: -Math.PI / 2 };
    // wardrobe and shelf on the -x wall
    g.add(this.box(0.6, 1.9, 1.0, this.mat({ map: woodTexture([1, 2], '#6b3f1f') }), -1.75, 0.95, 0.9));
    g.add(this.box(0.02, 1.7, 0.02, metal, -1.44, 0.95, 0.9));
    for (let i = 0; i < 2; i++) g.add(this.box(0.3, 0.03, 1.0, darkWood, -1.9, 1.3 + i * 0.5, -0.6));
    for (let i = 0; i < 9; i++) {
      const bk = this.box(0.18, 0.2 + hash(i) * 0.08, 0.05, this.mat({ color: ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22'][i % 6] }), -1.9, 1.43 + (i > 4 ? 0.5 : 0), -1.05 + (i % 5) * 0.2);
      g.add(bk);
    }
    // poster: "CODE" and a football poster drawn with text
    g.add(this.mesh(new THREE.PlaneGeometry(0.6, 0.4), this.mat({ map: signTexture('KEEP CODING', '#0d1b3a', '#62c6a1', 'Kampala Youth Tech Challenge') }), -2.04, 1.8, 0.0, false, false).rotateY(Math.PI / 2));
    g.add(this.mesh(new THREE.PlaneGeometry(0.5, 0.65), this.mat({ map: signTexture('CRANES', '#c0392b', '#ffe08a', 'Uganda') }), 2.04, 1.9, -0.8, false, false).rotateY(-Math.PI / 2));
    // door on the +Z wall
    const doorMat = this.mat({ map: woodTexture([1, 2], '#6b3f1f'), roughness: 0.7 });
    g.add(this.box(0.9, 2.05, 0.06, doorMat, -1.2, 1.025, D / 2 - 0.04));
    g.add(this.mesh(new THREE.SphereGeometry(0.03, 10, 8), metal, -0.85, 1.0, D / 2 - 0.1));
    // kerosene lamp on the floor by the bed (lit during the power cut)
    this.keroseneLamp = new THREE.Group();
    this.keroseneLamp.position.set(0.8, 0, 0.9);
    this.keroseneLamp.add(this.mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), this.mat({ color: '#8a6a3a', metalness: 0.6, roughness: 0.4 }), 0, 0.05, 0));
    this.keroseneLamp.add(this.mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 12, 1, true), this.mat({ color: '#ffe9c0', transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 0.17, 0));
    this.flame = this.mesh(new THREE.ConeGeometry(0.012, 0.05, 8), this.mat({ color: '#ffb347', emissive: '#ff9a2a', emissiveIntensity: 3 }), 0, 0.15, 0);
    this.keroseneLamp.add(this.flame);
    this.keroseneLamp.add(this.mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 16), metal, 0, 0.27, 0).rotateX(Math.PI / 2));
    g.add(this.keroseneLamp);
    this.keroseneLight = new THREE.PointLight('#ffa040', 0, 7, 1.4);
    this.keroseneLight.position.set(0.8, 0.3, 0.9);
    this.group.add(this.keroseneLight);
    // ceiling bulb (off most of the night) and a faint fill
    g.add(this.mesh(new THREE.SphereGeometry(0.04, 10, 8), this.mat({ color: '#d8d0c0' }), 0, Hh - 0.15, 0));
    const fill = new THREE.PointLight('#6b7fc0', 3.5, 7, 1.5);
    fill.position.set(0.5, 2.0, 0.5);
    this.addInteriorLight(fill);
    // rain outside the window and lightning
    this.rain = new Rain(1800, 40, 24, 14, { speed: 9, wind: 0.25, size: 6, color: '#9fb4d8' });
    this.rain.points.position.set(0, 0, -D / 2 - 6);
    g.add(this.rain.points);
    this.lightning = new THREE.DirectionalLight('#dfe8ff', 0);
    this.lightning.position.set(-3, 10, -8);
    this.group.add(this.lightning);
    this.sun.shadow.camera.left = -5;
    this.sun.shadow.camera.right = 5;
    this.sun.shadow.camera.top = 5;
    this.sun.shadow.camera.bottom = -5;
  }

  private screenKey = '';
  setLaptopScreenIfChanged(progress: number, error = false, dark = false): void {
    const key = `${Math.round(progress * 20)}|${error}|${dark}`;
    if (key === this.screenKey) return;
    this.screenKey = key;
    this.setLaptopScreen(progress, error, dark);
  }

  setLaptopScreen(progress: number, error = false, dark = false): void {
    // "dark" = the dead disk: the error stays faintly on screen, barely glowing
    const tex = dark ? laptopScreenTexture(0.9, true) : laptopScreenTexture(progress, error);
    this.laptopScreen.map?.dispose();
    this.laptopScreen.map = tex;
    this.laptopScreen.emissiveMap = tex;
    this.laptopScreen.emissiveIntensity = dark ? 0.25 : 1.2;
    this.laptopScreen.needsUpdate = true;
    this.screenLight.userData.baseIntensity = dark ? 1.2 : 2.4;
  }
  setRain(on: boolean): void {
    this.rain.points.visible = on;
    this.droplets.group.visible = on;
  }
  setKerosene(on: boolean): void {
    this.flame.visible = on;
    this.keroseneLight.userData.on = on;
  }
  update(t: number): void {
    this.screenLight.intensity = this.screenLight.userData.baseIntensity ?? 0;
    this.rain.update(t);
    this.droplets.update(t);
    const flick = 0.85 + Math.sin(t * 23) * 0.08 + Math.sin(t * 7.3) * 0.07;
    this.keroseneLight.intensity = this.flame.visible ? 14 * flick : 0;
    this.flame.scale.set(1, 0.8 + flick * 0.3, 1);
    this.lightning.intensity = this.lightningFlash * 4;
    (this.sky.material as THREE.MeshBasicMaterial).color.setScalar(1 + this.lightningFlash * 3);
    this.lightningFlash = 0;
  }
}
