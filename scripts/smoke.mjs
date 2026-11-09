// Full-film smoke test: steps deterministically through all 300 s and reports runtime errors.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
await page.goto('http://localhost:4174/?autoplay=1&paused=1&lowfx=1', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.player, null, { timeout: 60000 });
const step = Number(process.argv[2] ?? 0.5);
const result = await page.evaluate(async (step) => {
  const p = window.player;
  const tl = p.director.timeline;
  const out = { frames: 0, scenes: [], t0: performance.now() };
  tl.seek(0);
  tl.playing = true;
  let lastScene = -1;
  for (let t = 0; t < tl.duration; t += step) {
    tl.time = t;
    p.frame(step);
    tl.playing = true;
    out.frames++;
    const s = tl.sceneAt();
    if (s.index !== lastScene) {
      let tris = 0;
      p.scene.traverse((o) => { if (o.visible && o.geometry) { const g = o.geometry; const n = g.index ? g.index.count : g.attributes.position?.count ?? 0; tris += (n / 3) * (o.isInstancedMesh ? o.count : 1); } });
      out.scenes.push(`${t.toFixed(1)}s -> ${s.def.title} (~${Math.round(tris / 1000)}k triangles in scene graph)`);
      lastScene = s.index;
    }
    if (out.frames % 100 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  out.ms = performance.now() - out.t0;
  out.lines = p.director.lines.length;
  out.duration = tl.duration;
  return out;
}, step);
console.log(JSON.stringify(result, null, 1));
console.log('errors:', errors.length);
for (const e of errors.slice(0, 20)) console.log(' ', e);
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
