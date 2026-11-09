// Headless screenshot tool: node scripts/screenshots.mjs [query] [times...]
// Example: node scripts/screenshots.mjs "test=1" 1 5 10 15
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const query = process.argv[2] ?? 'test=1';
const times = process.argv.slice(3).map(Number);
const outDir = process.env.OUT ?? 'screenshots';
mkdirSync(outDir, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1280), height: Number(process.env.H ?? 720) }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); });
const url = `http://localhost:4173/?${query}&autoplay=1&paused=1&lowfx=1`;
console.log('open', url);
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.player, null, { timeout: 60000 });
for (const t of times) {
  const info = await page.evaluate((t) => {
    const p = window.player;
    p.director.timeline.seek(t);
    p.frame(0);
    p.frame(0);
    p.renderer.renderer.getContext().finish();
    const s = p.director.timeline.sceneAt();
    const c = p.cinematic.state; return { scene: s.def.title, cam: [c.pos.x, c.pos.y, c.pos.z].map((v) => +v.toFixed(2)), look: [c.look.x, c.look.y, c.look.z].map((v) => +v.toFixed(2)), fov: c.fov };
  }, t);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(300);
  const file = `${outDir}/${query.replace(/[^a-z0-9]/gi, '_')}_${String(t).padStart(5, '0')}.png`;
  await page.screenshot({ path: file });
  console.log(file, JSON.stringify(info));
}
await browser.close();
server.kill();
process.exit(0);
