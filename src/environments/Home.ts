/**
 * SCENE A - Daniel's home: a modest one-room Kampala home with a dining table,
 * kitchen corner, a bed, window with curtains, door, laptop and household objects.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Environment, LightingPreset } from './Environment';
import { woodTexture, wallTexture, tileTexture, fabricTexture, laptopScreenTexture, waxPrintTexture } from '../core/Textures';
import { hash } from '../core/MathUtils';

export class HomeEnvironment extends Environment {
  readonly id = 'home';
  readonly presets: Record<string, LightingPreset> = {
    morning: {
      sun: { color: '#ffe3b8', intensity: 3.4, position: [8, 6, -3] },
      ambient: { color: '#ffe9d0', intensity: 0.55 },
      hemi: { sky: '#e4ecff', ground: '#8a7058', intensity: 1.25 },
      fog: null,
      sky: ['#5f93d6', '#cfe4ff', '#f6e6c9'],
      interior: 0.35,
    },
    evening: {
      sun: { color: '#ffb570', intensity: 1.6, position: [7, 2.5, -2] },
      ambient: { color: '#ffd9b0', intensity: 0.35 },
      hemi: { sky: '#ffcf9f', ground: '#5a4335', intensity: 0.7 },
      fog: null,
      sky: ['#4a5fa0', '#ffb088', '#ffd7a8'],
      interior: 0.9,
    },
    night: {
      sun: null,
      ambient: { color: '#8aa0ff', intensity: 0.08 },
      hemi: { sky: '#2a3b66', ground: '#1a1410', intensity: 0.25 },
      fog: null,
      sky: ['#050a18', '#0d1630', '#121a2c'],
      interior: 1.3,
    },
  };
  private laptopScreen: THREE.MeshStandardMaterial;
  private curtainMeshes: THREE.Mesh[] = [];
  private clockHand: THREE.Mesh;

  constructor() {
    super();
    const g = this.group;
    const W = 7, D = 5.5, Hh = 2.8;
    const wallMat = this.mat({ map: wallTexture('#d8ccb2', [3, 1]), roughness: 0.95 });
    const wallMat2 = this.mat({ map: wallTexture('#b9c6b2', [3, 1]), roughness: 0.95 });
    const floorMat = this.mat({ map: woodTexture([4, 3], '#7a4b2a'), roughness: 0.75 });
    const tileMat = this.mat({ map: tileTexture([4, 3]), roughness: 0.6 });
    const ceilMat = this.mat({ color: '#efe9dc', roughness: 1 });
    const darkWood = this.mat({ map: woodTexture([1, 1], '#5a3418'), roughness: 0.7 });
    const metal = this.mat({ color: '#9ea3a8', roughness: 0.4, metalness: 0.7 });
    const plastic = this.mat({ color: '#2f6fb3', roughness: 0.6 });

    // floor
    const floor = this.mesh(new THREE.PlaneGeometry(W, D), floorMat, 0, 0, 0, false, true);
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);
    const kitchenFloor = this.mesh(new THREE.PlaneGeometry(W, 1.6), tileMat, 0, 0.002, D / 2 - 0.8, false, true);
    kitchenFloor.rotation.x = -Math.PI / 2;
    g.add(kitchenFloor);
    // ceiling
    const ceil = this.mesh(new THREE.PlaneGeometry(W, D), ceilMat, 0, Hh, 0, false, false);
    ceil.rotation.x = Math.PI / 2;
    g.add(ceil);
    // walls
    const back = this.box(W, Hh, 0.15, wallMat, 0, Hh / 2, D / 2 + 0.075); // kitchen wall (+Z)
    const front = this.box(W, Hh, 0.15, wallMat, 0, Hh / 2, -D / 2 - 0.075); // door wall (-Z)
    const left = this.box(0.15, Hh, D, wallMat2, -W / 2 - 0.075, Hh / 2, 0);
    g.add(back, front, left);
    // right wall with window opening (+X)
    const winW = 1.6, winH = 1.3, winY = 1.5;
    const rwParts = [
      this.box(0.15, Hh, (D - winW) / 2, wallMat2, W / 2 + 0.075, Hh / 2, -D / 4 - winW / 4),
      this.box(0.15, Hh, (D - winW) / 2, wallMat2, W / 2 + 0.075, Hh / 2, D / 4 + winW / 4),
      this.box(0.15, winY - winH / 2, winW, wallMat2, W / 2 + 0.075, (winY - winH / 2) / 2, 0),
      this.box(0.15, Hh - (winY + winH / 2), winW, wallMat2, W / 2 + 0.075, (Hh + winY + winH / 2) / 2, 0),
    ];
    g.add(...rwParts);
    // window frame + glass
    const frameMat = this.mat({ color: '#f4f1ea', roughness: 0.6 });
    const frame = new THREE.Group();
    frame.position.set(W / 2, winY, 0);
    const fb = 0.06;
    frame.add(this.box(0.1, fb, winW + fb, frameMat, 0, winH / 2, 0), this.box(0.1, fb, winW + fb, frameMat, 0, -winH / 2, 0), this.box(0.1, winH, fb, frameMat, 0, 0, winW / 2), this.box(0.1, winH, fb, frameMat, 0, 0, -winW / 2), this.box(0.08, winH, 0.03, frameMat, 0, 0, 0), this.box(0.08, 0.03, winW, frameMat, 0, 0, 0));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshPhysicalMaterial({ color: '#dfeeff', roughness: 0.05, transparent: true, opacity: 0.22, clearcoat: 1 }));
    glass.rotation.y = -Math.PI / 2;
    frame.add(glass);
    g.add(frame);
    // bars (common in Kampala homes)
    for (let i = -2; i <= 2; i++) frame.add(this.box(0.02, winH, 0.02, metal, -0.05, 0, i * 0.3));
    // curtains
    const curtainMat = this.mat({ map: waxPrintTexture([1, 2]), roughness: 0.9, side: THREE.DoubleSide });
    for (const sz of [-1, 1]) {
      const c = this.mesh(new THREE.PlaneGeometry(0.55, winH + 0.3, 6, 8), curtainMat, W / 2 - 0.1, winY, sz * (winW / 2 - 0.1), false, false);
      c.rotation.y = -Math.PI / 2;
      // give the curtain folds
      const pos = c.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 18) * 0.03);
      c.geometry.computeVertexNormals();
      g.add(c);
      this.curtainMeshes.push(c);
    }
    const rod = this.mesh(new THREE.CylinderGeometry(0.015, 0.015, winW + 0.6, 8), darkWood, W / 2 - 0.12, winY + winH / 2 + 0.15, 0);
    rod.rotation.x = Math.PI / 2;
    g.add(rod);

    // door on the -Z wall
    const door = new THREE.Group();
    door.position.set(2.0, 0, -D / 2);
    const doorMat = this.mat({ map: woodTexture([1, 2], '#6b3f1f'), roughness: 0.7 });
    door.add(this.box(0.9, 2.05, 0.06, doorMat, 0, 1.025, 0.1));
    door.add(this.box(1.0, 0.08, 0.14, darkWood, 0, 2.08, 0.1), this.box(0.08, 2.1, 0.14, darkWood, -0.5, 1.05, 0.1), this.box(0.08, 2.1, 0.14, darkWood, 0.5, 1.05, 0.1));
    const handle = this.mesh(new THREE.SphereGeometry(0.035, 10, 8), metal, 0.35, 1.0, 0.16);
    door.add(handle);
    g.add(door);
    this.props.door = door;

    // dining table (centre-left) + 4 chairs
    const table = new THREE.Group();
    table.position.set(-1.0, 0, 0.1);
    const tableMat = this.mat({ map: woodTexture([2, 1], '#8a5a35'), roughness: 0.55 });
    table.add(this.box(1.5, 0.05, 0.9, tableMat, 0, 0.74, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) table.add(this.box(0.07, 0.72, 0.07, darkWood, sx * 0.68, 0.36, sz * 0.38));
    g.add(table);
    this.props.table = table;
    const mkChair = (x: number, z: number, yaw: number) => {
      const c = new THREE.Group();
      c.position.set(x, 0, z);
      c.rotation.y = yaw;
      c.add(this.box(0.44, 0.04, 0.44, plastic, 0, 0.45, 0));
      c.add(this.box(0.44, 0.45, 0.04, plastic, 0, 0.7, -0.2));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(this.box(0.035, 0.45, 0.035, plastic, sx * 0.19, 0.225, sz * 0.19));
      g.add(c);
      return c;
    };
    // chairs around the table: Daniel's chair faces +Z (toward kitchen) at the -Z side of table
    this.props.chairDaniel = mkChair(-1.0, -0.55, 0);
    this.props.chairGrace = mkChair(-1.0, 0.75, Math.PI);
    this.props.chairSide = mkChair(-1.95, 0.1, Math.PI / 2);
    this.props.chairSide2 = mkChair(-0.05, 0.1, -Math.PI / 2);
    this.spots.danielChair = { x: -1.0, z: -0.55, yaw: 0 };
    this.spots.graceChair = { x: -1.0, z: 0.75, yaw: Math.PI };
    this.spots.sideChair = { x: -1.95, z: 0.1, yaw: Math.PI / 2 };
    this.spots.sideChair2 = { x: -0.05, z: 0.1, yaw: -Math.PI / 2 };
    this.spots.doorway = { x: 2.0, z: -2.2, yaw: 0 };
    this.spots.kitchen = { x: 1.2, z: 1.9, yaw: Math.PI };
    this.spots.tableEnd = { x: -2.2, z: 0.1, yaw: Math.PI / 2 };
    this.spots.centre = { x: 0.6, z: -0.6, yaw: Math.PI };

    // laptop (old, scuffed) on the table in front of Daniel's chair
    const laptop = new THREE.Group();
    laptop.position.set(-1.0, 0.765, -0.15);
    const lapMat = this.mat({ color: '#3a3d42', roughness: 0.5, metalness: 0.3 });
    laptop.add(this.mesh(new RoundedBoxGeometry(0.34, 0.02, 0.24, 2, 0.006), lapMat, 0, 0.01, 0));
    const lid = new THREE.Group();
    lid.position.set(0, 0.02, 0.12);
    lid.rotation.x = 0.32;
    lid.add(this.mesh(new RoundedBoxGeometry(0.34, 0.23, 0.012, 2, 0.005), lapMat, 0, 0.115, 0));
    this.laptopScreen = this.mat({ map: laptopScreenTexture(0.3), emissive: '#ffffff', emissiveMap: laptopScreenTexture(0.3), emissiveIntensity: 0.9, roughness: 0.3 });
    const screen = this.mesh(new THREE.PlaneGeometry(0.31, 0.2), this.laptopScreen, 0, 0.115, -0.007, false, false);
    screen.rotation.y = Math.PI;
    lid.add(screen);
    laptop.add(lid);
    // keyboard keys
    const keyMat = this.mat({ color: '#202225', roughness: 0.6 });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 11; c++) laptop.add(this.box(0.022, 0.004, 0.02, keyMat, -0.13 + c * 0.026, 0.022, -0.07 + r * 0.026));
    laptop.add(this.box(0.08, 0.002, 0.05, keyMat, 0, 0.021, 0.07));
    g.add(laptop);
    this.props.laptop = laptop;
    const screenGlow = new THREE.PointLight('#9fc4ff', 0.6, 1.5, 2);
    screenGlow.position.set(-1.0, 0.95, -0.3);
    this.addInteriorLight(screenGlow);

    // cups, plate, kettle on table
    const ceramic = this.mat({ color: '#f1ece2', roughness: 0.4 });
    const cup = this.mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 14), ceramic, -0.5, 0.81, 0.15);
    g.add(cup);
    const cup2 = this.mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 14), this.mat({ color: '#d35a3a', roughness: 0.4 }), -1.45, 0.81, 0.3);
    g.add(cup2);
    const plate = this.mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 20), ceramic, -1.1, 0.775, 0.35);
    g.add(plate);
    const flask = this.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 16), this.mat({ color: '#c0392b', roughness: 0.5, metalness: 0.2 }), -1.6, 0.92, -0.2);
    g.add(flask);

    // kitchen corner along the +Z wall
    const counterMat = this.mat({ color: '#b8b2a5', roughness: 0.6 });
    const cabinetMat = this.mat({ map: woodTexture([2, 1], '#8e5f3a'), roughness: 0.7 });
    g.add(this.box(3.2, 0.85, 0.6, cabinetMat, 1.6, 0.425, D / 2 - 0.3));
    g.add(this.box(3.3, 0.05, 0.65, counterMat, 1.6, 0.875, D / 2 - 0.3));
    // cabinet doors lines
    for (let i = 0; i < 4; i++) g.add(this.box(0.72, 0.7, 0.01, darkWood, 0.4 + i * 0.8, 0.42, D / 2 - 0.6 - 0.005));
    // stove
    g.add(this.box(0.6, 0.86, 0.6, metal, 0.0, 0.43, D / 2 - 0.3));
    for (const sx of [-0.15, 0.15]) for (const sz of [-0.15, 0.15]) g.add(this.mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), this.mat({ color: '#111' }), sx, 0.87, D / 2 - 0.3 + sz).rotateX(Math.PI / 2));
    // sink
    g.add(this.box(0.5, 0.02, 0.4, metal, 2.3, 0.9, D / 2 - 0.3));
    const tap = this.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), metal, 2.3, 1.0, D / 2 - 0.1);
    g.add(tap);
    // saucepans + kettle
    g.add(this.mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.1, 16), metal, 0.15, 0.95, D / 2 - 0.3));
    g.add(this.mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.14, 14), this.mat({ color: '#d8d8d8', roughness: 0.3, metalness: 0.8 }), 1.1, 0.97, D / 2 - 0.3));
    // shelf with plates/jars
    g.add(this.box(2.0, 0.03, 0.25, cabinetMat, 1.6, 1.7, D / 2 - 0.13));
    for (let i = 0; i < 5; i++) {
      const jar = this.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12 + hash(i) * 0.08, 12), this.mat({ color: ['#e0b060', '#8ab050', '#d04030', '#f0e0c0', '#60a0d0'][i], roughness: 0.4 }), 0.8 + i * 0.4, 1.78, D / 2 - 0.13);
      g.add(jar);
    }
    // yellow jerrycan + charcoal stove (sigiri)
    g.add(this.mesh(new RoundedBoxGeometry(0.3, 0.42, 0.22, 2, 0.03), this.mat({ color: '#e8c520', roughness: 0.5 }), 3.1, 0.21, 1.5));
    g.add(this.mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 14), this.mat({ color: '#4a4a4a', roughness: 0.9, metalness: 0.3 }), -3.0, 0.11, 2.2));
    // fridge
    g.add(this.box(0.65, 1.5, 0.65, this.mat({ color: '#e9e9e9', roughness: 0.35, metalness: 0.1 }), -2.4, 0.75, D / 2 - 0.33));

    // bed in the far-right corner
    const bedMat = this.mat({ map: fabricTexture('#7c3b4a', [4, 4]), roughness: 0.95 });
    const bed = new THREE.Group();
    bed.position.set(2.6, 0, -1.6);
    bed.add(this.box(1.0, 0.3, 1.9, darkWood, 0, 0.15, 0));
    bed.add(this.mesh(new RoundedBoxGeometry(0.95, 0.2, 1.85, 2, 0.05), bedMat, 0, 0.4, 0));
    bed.add(this.mesh(new RoundedBoxGeometry(0.6, 0.12, 0.35, 2, 0.05), this.mat({ color: '#f1ece2', roughness: 0.9 }), 0, 0.55, -0.7));
    bed.add(this.mesh(new RoundedBoxGeometry(0.95, 0.06, 1.1, 2, 0.03), this.mat({ map: waxPrintTexture([2, 2]), roughness: 0.9 }), 0, 0.52, 0.3));
    g.add(bed);
    // mosquito net frame
    g.add(this.mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6), metal, 2.6, 2.2, -1.6));

    // small sofa / armchair near the door
    const sofaMat = this.mat({ map: fabricTexture('#3f5a4a', [3, 3]), roughness: 0.95 });
    const sofa = new THREE.Group();
    sofa.position.set(-2.6, 0, -1.9);
    sofa.rotation.y = 0.6;
    sofa.add(this.mesh(new RoundedBoxGeometry(1.3, 0.4, 0.75, 2, 0.06), sofaMat, 0, 0.25, 0));
    sofa.add(this.mesh(new RoundedBoxGeometry(1.3, 0.5, 0.2, 2, 0.06), sofaMat, 0, 0.65, -0.3));
    for (const sx of [-1, 1]) sofa.add(this.mesh(new RoundedBoxGeometry(0.18, 0.3, 0.75, 2, 0.05), sofaMat, sx * 0.58, 0.55, 0));
    g.add(sofa);

    // wall decorations: clock, family photo, calendar
    const clock = new THREE.Group();
    clock.position.set(-W / 2 + 0.08, 2.1, 0.8);
    clock.rotation.y = Math.PI / 2;
    clock.add(this.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), this.mat({ color: '#f4f4f4' }), 0, 0, 0).rotateX(Math.PI / 2));
    clock.add(this.mesh(new THREE.TorusGeometry(0.2, 0.015, 8, 24), this.mat({ color: '#222' }), 0, 0, 0.0));
    this.clockHand = this.box(0.015, 0.15, 0.01, this.mat({ color: '#111' }), 0, 0.06, 0.025);
    clock.add(this.clockHand);
    clock.add(this.box(0.015, 0.1, 0.01, this.mat({ color: '#111' }), 0.03, 0.03, 0.025).rotateZ(-1.2));
    g.add(clock);
    const photo = this.box(0.35, 0.28, 0.03, darkWood, -W / 2 + 0.08, 1.75, -0.6);
    photo.rotation.y = Math.PI / 2;
    g.add(photo);
    const photoInner = this.box(0.29, 0.22, 0.035, this.mat({ color: '#c9b79a' }), -W / 2 + 0.08, 1.75, -0.6);
    photoInner.rotation.y = Math.PI / 2;
    g.add(photoInner);
    const calendar = this.box(0.3, 0.42, 0.01, this.mat({ color: '#ffffff' }), 1.0, 1.9, -D / 2 + 0.085);
    g.add(calendar);
    g.add(this.box(0.3, 0.12, 0.012, this.mat({ color: '#c0392b' }), 1.0, 2.05, -D / 2 + 0.085));
    // floor mat
    const mat = this.mesh(new THREE.PlaneGeometry(2.0, 1.4), this.mat({ map: waxPrintTexture([4, 3]), roughness: 1 }), -1.0, 0.004, 0.1, false, true);
    mat.rotation.x = -Math.PI / 2;
    g.add(mat);
    // radio on the shelf
    g.add(this.mesh(new RoundedBoxGeometry(0.3, 0.14, 0.1, 2, 0.02), this.mat({ color: '#333', roughness: 0.6 }), 2.6, 1.78, D / 2 - 0.13));

    // ceiling light fixture
    const bulbMat = this.mat({ color: '#fff4d6', emissive: '#ffd890', emissiveIntensity: 1.2 });
    g.add(this.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 6), this.mat({ color: '#111' }), 0, Hh - 0.2, 0));
    g.add(this.mesh(new THREE.ConeGeometry(0.22, 0.16, 20, 1, true), this.mat({ color: '#2f5a8a', roughness: 0.6, side: THREE.DoubleSide }), 0, Hh - 0.45, 0));
    g.add(this.mesh(new THREE.SphereGeometry(0.05, 12, 8), bulbMat, 0, Hh - 0.5, 0));
    const bulb = new THREE.PointLight('#ffd9a0', 8, 9, 1.8);
    bulb.position.set(0, Hh - 0.55, 0);
    bulb.castShadow = false;
    this.addInteriorLight(bulb);
    // window light fill
    const fill = new THREE.PointLight('#ffe8c8', 7, 9, 1.6);
    fill.position.set(2.6, 1.9, 0);
    this.group.add(fill);
    const fill2 = new THREE.PointLight('#fff2dc', 4, 8, 1.6);
    fill2.position.set(-0.5, 2.2, -1.5);
    this.group.add(fill2);

    // outside: a wall + a bit of greenery seen through the window
    const outside = new THREE.Group();
    outside.add(this.box(0.3, 3, 10, this.mat({ map: wallTexture('#c7a97e', [4, 1]) }), 7.5, 1.5, 0));
    const leaf = this.mat({ color: '#3d7a35', roughness: 0.9 });
    for (let i = 0; i < 6; i++) outside.add(this.mesh(new THREE.SphereGeometry(0.5 + hash(i) * 0.4, 10, 8), leaf, 5.6 + hash(i + 9) * 1.2, 1.4 + hash(i + 2) * 1.2, -2 + i * 0.9));
    g.add(outside);

    this.sun.position.set(8, 6, -3);
    this.sun.shadow.camera.left = -6;
    this.sun.shadow.camera.right = 6;
    this.sun.shadow.camera.top = 6;
    this.sun.shadow.camera.bottom = -6;
  }

  private screenKey = '';
  setLaptopScreenIfChanged(progress: number, error = false): void {
    const key = `${Math.round(progress * 20)}|${error}`;
    if (key === this.screenKey) return;
    this.screenKey = key;
    this.setLaptopScreen(progress, error);
  }

  setLaptopScreen(progress: number, error = false): void {
    const tex = laptopScreenTexture(progress, error);
    this.laptopScreen.map?.dispose();
    this.laptopScreen.emissiveMap?.dispose();
    this.laptopScreen.map = tex;
    this.laptopScreen.emissiveMap = tex;
    this.laptopScreen.needsUpdate = true;
  }

  update(t: number): void {
    // curtains sway slightly in the breeze
    this.curtainMeshes.forEach((c, i) => {
      c.rotation.y = -Math.PI / 2 + Math.sin(t * 0.7 + i) * 0.02;
    });
    this.clockHand.rotation.z = -t * 0.02;
  }
}
