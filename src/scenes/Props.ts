/** Hand props used by the scenes: phone, money, basin, notebook, borrowed laptop, tea cup. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { phoneScreenTexture, laptopScreenTexture, signTexture } from '../core/Textures';

export function makePhone(kind: 'poster' | 'results' | 'submitted' | 'dark' = 'poster'): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.15, 0.008, 2, 0.004), new THREE.MeshStandardMaterial({ color: '#15161a', roughness: 0.3, metalness: 0.4 }));
  g.add(body);
  const screenMat = kind === 'dark'
    ? new THREE.MeshStandardMaterial({ color: '#05060a', roughness: 0.2 })
    : new THREE.MeshStandardMaterial({ map: phoneScreenTexture(kind), emissive: '#ffffff', emissiveMap: phoneScreenTexture(kind), emissiveIntensity: 0.9, roughness: 0.2 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.136), screenMat);
  screen.position.z = 0.0045;
  g.add(screen);
  g.name = 'phone';
  return g;
}

/** A folded bundle of Ugandan shilling notes. */
export function makeMoney(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const note = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.0015, 0.035), new THREE.MeshStandardMaterial({ color: i % 2 ? '#c9b26a' : '#8aa37a', roughness: 0.8 }));
    note.position.set((i % 2) * 0.004, i * 0.0018, (i % 3) * 0.003);
    note.rotation.y = (i - 2.5) * 0.08;
    g.add(note);
  }
  g.name = 'money';
  return g;
}

/** Plastic basin of tomatoes Grace carries to the market. */
export function makeBasin(): THREE.Group {
  const g = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.16, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#2e86c1', roughness: 0.5, side: THREE.DoubleSide }));
  basin.position.y = 0.08;
  g.add(basin);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshStandardMaterial({ color: '#2e86c1', roughness: 0.5, side: THREE.DoubleSide }));
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.001;
  g.add(bottom);
  const tomatoMat = new THREE.MeshStandardMaterial({ color: '#d9261c', roughness: 0.35 });
  const geo = new THREE.SphereGeometry(0.035, 10, 8);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = i < 9 ? 0.13 : 0.06;
    const t = new THREE.Mesh(geo, tomatoMat);
    t.position.set(Math.cos(a * 1.7) * r, 0.14 + (i < 9 ? 0 : 0.035), Math.sin(a * 1.7) * r);
    g.add(t);
  }
  g.name = 'basin';
  return g;
}

export function makeNotebook(): THREE.Group {
  const g = new THREE.Group();
  const nb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.2), new THREE.MeshStandardMaterial({ color: '#f1ecdf', roughness: 0.9 }));
  g.add(nb);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.003, 0.202), new THREE.MeshStandardMaterial({ color: '#1565c0', roughness: 0.6 }));
  cover.position.y = 0.0075;
  g.add(cover);
  for (let i = 0; i < 7; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.1 + (i % 3) * 0.015, 0.001, 0.004), new THREE.MeshStandardMaterial({ color: '#333' }));
    line.position.set(-0.01, 0.0095, -0.07 + i * 0.022);
    g.add(line);
  }
  g.name = 'notebook';
  return g;
}

/** Brian's uncle's old laptop (silver, chunky). */
export function makeOldLaptop(): { group: THREE.Group; setProgress: (p: number, submitted?: boolean) => void } {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.5, metalness: 0.5 });
  g.add(new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.028, 0.26, 2, 0.006), mat).translateY(0.014));
  const lid = new THREE.Group();
  lid.position.set(0, 0.028, -0.13);
  lid.rotation.x = -0.32;
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.25, 0.014, 2, 0.005), mat);
  lidMesh.position.y = 0.125;
  lid.add(lidMesh);
  const screenMat = new THREE.MeshStandardMaterial({ map: laptopScreenTexture(0.05), emissive: '#ffffff', emissiveMap: laptopScreenTexture(0.05), emissiveIntensity: 1.1, roughness: 0.3 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.21), screenMat);
  screen.position.set(0, 0.125, 0.008);
  lid.add(screen);
  g.add(lid);
  const keyMat = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.6 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.02), keyMat);
    k.position.set(-0.14 + c * 0.026, 0.03, -0.08 + r * 0.026);
    g.add(k);
  }
  const glow = new THREE.PointLight('#8fb8ff', 0.8, 1.6, 1.8);
  glow.position.set(0, 0.2, 0.1);
  g.add(glow);
  g.name = 'oldLaptop';
  const setProgress = (p: number, submitted = false) => {
    const tex = submitted ? signTexture('SUBMITTED', '#102a1a', '#62c6a1', 'Market Link v1.0 · 08:57') : laptopScreenTexture(p);
    screenMat.map = tex;
    screenMat.emissiveMap = tex;
    screenMat.needsUpdate = true;
  };
  return { group: g, setProgress };
}

export function makeTeaCup(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.085, 14), new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.4 })).translateY(0.042));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: '#f1ece2' }));
  handle.position.set(0.04, 0.045, 0);
  handle.rotation.z = -Math.PI / 2;
  g.add(handle);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.034, 14), new THREE.MeshStandardMaterial({ color: '#9b5a2a', roughness: 0.2 }));
  tea.rotation.x = -Math.PI / 2;
  tea.position.y = 0.08;
  g.add(tea);
  g.name = 'tea';
  return g;
}

/** Kerosene lamp Grace carries in (small hurricane lamp). */
export function makeHandLamp(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#8a6a3a', metalness: 0.6, roughness: 0.4 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 12), metal).translateY(0.035));
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.1, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#ffe9c0', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  glass.position.y = 0.12;
  g.add(glass);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 8), new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a2a', emissiveIntensity: 3 }));
  flame.position.y = 0.11;
  g.add(flame);
  const light = new THREE.PointLight('#ffa040', 2.5, 3, 1.6);
  light.position.y = 0.12;
  g.add(light);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.004, 6, 14), metal).translateY(0.2).rotateX(Math.PI / 2));
  g.name = 'handLamp';
  return g;
}
