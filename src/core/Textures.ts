/**
 * Procedural canvas textures. No downloaded or AI-generated imagery:
 * every texture here is painted with Canvas 2D drawing calls and noise.
 */
import * as THREE from 'three';
import { fbm2, hash, hash2 } from './MathUtils';

const cache = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { canvas: c, ctx: c.getContext('2d')! };
}

function finish(canvas: HTMLCanvasElement, repeat: [number, number] = [1, 1], srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function cached(key: string, build: () => THREE.Texture): THREE.Texture {
  let t = cache.get(key);
  if (!t) {
    t = build();
    cache.set(key, t);
  }
  return t;
}

/** Wood planks (floor / table). */
export function woodTexture(repeat: [number, number] = [4, 4], base = '#8a5a35'): THREE.Texture {
  return cached(`wood${repeat}${base}`, () => {
    const { canvas, ctx } = makeCanvas(512, 512);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    const planks = 6;
    for (let p = 0; p < planks; p++) {
      const y0 = (p * 512) / planks;
      const shade = 0.85 + hash(p) * 0.3;
      for (let y = 0; y < 512 / planks; y++) {
        for (let x = 0; x < 512; x += 2) {
          const n = fbm2(x / 70 + p * 10, (y0 + y) / 9, p, 3);
          const v = Math.floor(90 * shade + n * 70);
          ctx.fillStyle = `rgb(${v + 40},${Math.floor(v * 0.68)},${Math.floor(v * 0.4)})`;
          ctx.fillRect(x, y0 + y, 2, 1);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, y0, 512, 2);
    }
    return finish(canvas, repeat);
  });
}

/** Plaster / painted wall with subtle grime. */
export function wallTexture(color = '#d9cdb6', repeat: [number, number] = [2, 1]): THREE.Texture {
  return cached(`wall${color}${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(256, 256);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    const img = ctx.getImageData(0, 0, 256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const n = (fbm2(x / 30, y / 30, 3, 4) - 0.5) * 26 + (hash2(x, y) - 0.5) * 10;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
      }
    ctx.putImageData(img, 0, 0);
    return finish(canvas, repeat);
  });
}

/** Tiles for the kitchen floor. */
export function tileTexture(repeat: [number, number] = [6, 6]): THREE.Texture {
  return cached(`tile${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(256, 256);
    ctx.fillStyle = '#b9b2a4';
    ctx.fillRect(0, 0, 256, 256);
    const n = 4;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const g = 196 + Math.floor((hash2(i, j) - 0.5) * 30);
        ctx.fillStyle = `rgb(${g},${g - 6},${g - 18})`;
        ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
      }
    return finish(canvas, repeat);
  });
}

/** African wax-print style pattern for Grace's blouse. Designed by code. */
export function waxPrintTexture(repeat: [number, number] = [3, 3]): THREE.Texture {
  return cached(`wax${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(512, 512);
    ctx.fillStyle = '#2a1d6b';
    ctx.fillRect(0, 0, 512, 512);
    const cell = 128;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const cx = i * cell + cell / 2;
        const cy = j * cell + cell / 2;
        ctx.strokeStyle = '#f2b632';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, 44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e8532a';
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2b632';
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          ctx.fillStyle = k % 2 ? '#62c6a1' : '#f2e3b6';
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56, 8, 5, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#f2e3b6';
        ctx.lineWidth = 3;
        ctx.strokeRect(i * cell + 6, j * cell + 6, cell - 12, cell - 12);
      }
    return finish(canvas, repeat);
  });
}

/** Knitted fabric detail for hoodies and jackets (bump-ish colour noise). */
export function fabricTexture(color: string, repeat: [number, number] = [6, 6]): THREE.Texture {
  return cached(`fabric${color}${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(128, 128);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    const img = ctx.getImageData(0, 0, 128, 128);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4;
        const weave = ((x + y) % 4 < 2 ? 1 : -1) * 6 + (hash2(x, y) - 0.5) * 14;
        img.data[i] += weave;
        img.data[i + 1] += weave;
        img.data[i + 2] += weave;
      }
    ctx.putImageData(img, 0, 0);
    return finish(canvas, repeat);
  });
}

/** Denim-like trouser texture. */
export function denimTexture(repeat: [number, number] = [4, 8]): THREE.Texture {
  return cached(`denim${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(128, 128);
    ctx.fillStyle = '#2b3550';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const d = ((x - y) % 6 + 6) % 6 < 2 ? 18 : -8;
        const n = (hash2(x, y) - 0.5) * 16;
        ctx.fillStyle = `rgb(${43 + d + n},${53 + d + n},${80 + d + n})`;
        ctx.fillRect(x, y, 1, 1);
      }
    return finish(canvas, repeat);
  });
}

/** Asphalt road with lane markings. */
export function roadTexture(repeat: [number, number] = [1, 10]): THREE.Texture {
  return cached(`road${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(256, 512);
    ctx.fillStyle = '#3b3b3b';
    ctx.fillRect(0, 0, 256, 512);
    const img = ctx.getImageData(0, 0, 256, 512);
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const n = (hash2(x, y) - 0.5) * 30 + (fbm2(x / 40, y / 40, 9, 3) - 0.5) * 40;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
      }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = '#e8d35a';
    for (let y = 0; y < 512; y += 128) ctx.fillRect(124, y, 8, 72);
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(4, 0, 6, 512);
    ctx.fillRect(246, 0, 6, 512);
    return finish(canvas, repeat);
  });
}

/** Paving slabs for the pavement. */
export function pavementTexture(repeat: [number, number] = [2, 20]): THREE.Texture {
  return cached(`pave${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(128, 128);
    ctx.fillStyle = '#8c8578';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const g = 150 + Math.floor((hash2(i, j + 3) - 0.5) * 40);
        ctx.fillStyle = `rgb(${g},${g - 5},${g - 15})`;
        ctx.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
      }
    return finish(canvas, repeat);
  });
}

/** Red Kampala dirt / murram for the market ground. */
export function dirtTexture(repeat: [number, number] = [8, 8]): THREE.Texture {
  return cached(`dirt${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(256, 256);
    const img = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const n = fbm2(x / 24, y / 24, 5, 4);
        const g = hash2(x, y);
        img.data[i] = 120 + n * 60 + g * 20;
        img.data[i + 1] = 70 + n * 40 + g * 12;
        img.data[i + 2] = 45 + n * 25 + g * 10;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return finish(canvas, repeat);
  });
}

/** Painted shop-front sign with text, each sign unique. */
export function signTexture(text: string, bg: string, fg: string, sub?: string): THREE.Texture {
  return cached(`sign${text}${bg}${fg}${sub}`, () => {
    const { canvas, ctx } = makeCanvas(512, 128);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = fg;
    ctx.font = 'bold 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, sub ? 48 : 64);
    if (sub) {
      ctx.font = '26px Arial, sans-serif';
      ctx.fillText(sub, 256, 96);
    }
    const t = finish(canvas, [1, 1]);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Building facade: painted concrete with window grime bands. */
export function facadeTexture(color: string, repeat: [number, number] = [2, 2]): THREE.Texture {
  return cached(`facade${color}${repeat}`, () => {
    const { canvas, ctx } = makeCanvas(256, 256);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    const img = ctx.getImageData(0, 0, 256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const streak = fbm2(x / 8, y / 90, 11, 3) - 0.5;
        const n = streak * 36 + (hash2(x, y + 9) - 0.5) * 12 - (y / 256) * 18;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
      }
    ctx.putImageData(img, 0, 0);
    return finish(canvas, repeat);
  });
}

/** Laptop screen with code lines (drawn text, updated via setLaptopScreenProgress). */
export function laptopScreenTexture(progress = 0.4, error = false): THREE.Texture {
  const { canvas, ctx } = makeCanvas(512, 320);
  ctx.fillStyle = error ? '#2a0f14' : '#101826';
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#1b2a44';
  ctx.fillRect(0, 0, 512, 26);
  ctx.fillStyle = '#9fc5ff';
  ctx.font = '16px monospace';
  ctx.fillText('market-link / app.ts', 12, 18);
  const lines = Math.floor(progress * 16);
  for (let i = 0; i < lines; i++) {
    const w = 120 + hash(i * 3.7) * 300;
    ctx.fillStyle = ['#7dd3fc', '#c4b5fd', '#86efac', '#fde68a'][i % 4];
    ctx.fillRect(24 + (i % 3) * 20, 40 + i * 16, w, 8);
  }
  if (error) {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('FATAL: disk read error', 24, 220);
    ctx.font = '16px monospace';
    ctx.fillText('project files could not be recovered', 24, 250);
  }
  const t = finish(canvas, [1, 1]);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Phone screen showing the competition poster. */
export function phoneScreenTexture(kind: 'poster' | 'results' | 'submitted'): THREE.Texture {
  return cached(`phone${kind}`, () => {
    const { canvas, ctx } = makeCanvas(256, 512);
    ctx.fillStyle = kind === 'results' ? '#102a1a' : '#0d1b3a';
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = '#f2b632';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    if (kind === 'poster') {
      ctx.fillText('KAMPALA', 128, 90);
      ctx.fillText('YOUTH TECH', 128, 130);
      ctx.fillText('CHALLENGE', 128, 170);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.fillText('Build an app for', 128, 240);
      ctx.fillText('your community', 128, 268);
      ctx.fillStyle = '#62c6a1';
      ctx.fillText('Prize: laptop +', 128, 330);
      ctx.fillText('full scholarship', 128, 358);
      ctx.fillStyle = '#ff7a7a';
      ctx.fillText('Deadline: Friday 9am', 128, 420);
      ctx.fillText('Entry fee: UGX 50,000', 128, 450);
    } else if (kind === 'results') {
      ctx.fillText('RESULTS', 128, 90);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.fillText('1st: Smart Clinic', 128, 180);
      ctx.fillText('2nd: Boda Safe', 128, 220);
      ctx.fillText('3rd: FarmTalk', 128, 260);
      ctx.fillStyle = '#62c6a1';
      ctx.fillText('Finalist:', 128, 340);
      ctx.fillText('Market Link', 128, 370);
      ctx.fillText('by Daniel Okello', 128, 400);
    } else {
      ctx.fillStyle = '#62c6a1';
      ctx.font = 'bold 36px Arial';
      ctx.fillText('SUBMITTED', 128, 230);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.fillText('Market Link v1.0', 128, 290);
      ctx.fillText('08:57 Friday', 128, 320);
    }
    const t = finish(canvas, [1, 1]);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Soft radial sprite for particles (rain splash / dust). */
export function spriteTexture(): THREE.Texture {
  return cached('sprite', () => {
    const { canvas, ctx } = makeCanvas(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = finish(canvas, [1, 1], false);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Sky gradient texture for the background dome. */
export function skyTexture(top: string, horizon: string, bottom: string): THREE.Texture {
  return cached(`sky${top}${horizon}${bottom}`, () => {
    const { canvas, ctx } = makeCanvas(4, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top);
    g.addColorStop(0.55, horizon);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const t = finish(canvas, [1, 1]);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}
