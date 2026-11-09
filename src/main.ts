/**
 * THE LAST PROMISE - entry point.
 *
 * URL parameters (handy while developing):
 *   ?test=1        20-second Daniel & Grace test scene instead of the film
 *   ?lineup=1      character line-up / expression test
 *   ?scene=3       start at scene 3
 *   ?t=120         start at 120 s
 *   ?autoplay=1    skip the start screen (audio stays muted until a click)
 *   ?lowfx=1       disable depth of field (and ssao)   ?ssao=1 enable screen-space AO
 *   ?paused=1      load paused
 */
import { AnimationPlayer } from './components/AnimationPlayer';
import { FILM_SCENES } from './scenes';
import { buildTestScene } from './scenes/TestScene';
import { buildLineupScene } from './scenes/LineupScene';
import { buildEnvTourScene } from './scenes/EnvTourScene';
import { EnvironmentId } from './timeline/AnimationTimeline';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app')!;

const scenes = params.has('test') ? [buildTestScene()] : params.has('lineup') ? [buildLineupScene()] : params.has('env') ? [buildEnvTourScene(params.get('env') as EnvironmentId)] : FILM_SCENES.map((f) => f());

const player = new AnimationPlayer(app, {
  scenes,
  dof: !params.has('lowfx'),
  bloom: !params.has('nobloom'),
  ssao: params.has('ssao'),
  startAt: params.has('t') ? parseFloat(params.get('t')!) : undefined,
});
if (params.has('scene')) player.director.timeline.goToScene(parseInt(params.get('scene')!) - 1);

// expose for debugging / automated screenshots
(window as unknown as { player: AnimationPlayer }).player = player;

const start = document.createElement('div');
start.className = 'start-screen';
start.innerHTML = `
  <div class="start-card">
    <h1>THE LAST PROMISE</h1>
    <div class="sub">A fully coded 3D animated short film</div>
    <p>Kampala, Uganda. A son, a mother, a friend, and a promise that costs more than money.<br/>
       Every character, set, movement and camera move in this film is generated in real time by code.</p>
    <button id="startBtn">▶ &nbsp;Watch the film</button>
    <div class="hint">Space: play/pause · ←/→: seek · 1–6: scenes · F: fullscreen</div>
  </div>`;
app.appendChild(start);
const begin = async () => {
  start.classList.add('hidden');
  await player.start(!params.has('paused'));
};
document.getElementById('startBtn')!.addEventListener('click', begin);
if (params.has('autoplay')) {
  start.classList.add('hidden');
  player.start(!params.has('paused'));
}
