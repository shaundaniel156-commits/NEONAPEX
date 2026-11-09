/**
 * SCENE 3 - THE SACRIFICE (50 s). Nakasero market, late afternoon.
 * Daniel comes to tell his mother about the competition. Grace gives him the money
 * she had saved for Saturday's stock.
 */
import { SceneBuilder } from './Direction';
import { SCREENPLAY } from '../story/Screenplay';
import { workPose, explainPose, reachLowPose, handOverPose, receivePose, handsOnHipsPose, handOnChestPose } from '../animations/Gestures';
import { nodPose, shakeHeadPose } from '../animations/Talking';
import { wipeTearsPose, straightenPose } from '../animations/EmotionalActions';
import { v3, overShoulder, offset, between } from '../camera/CinematicCamera';
import { makeMoney } from './Props';
import { MarketEnvironment } from '../environments/Market';

export function buildScene3() {
  const L = SCREENPLAY.scene3;
  const b = new SceneBuilder('s3', 'The Sacrifice', 50, 'market', 'afternoon');
  const D = () => b.actorEyes('daniel');
  const G = () => b.actorEyes('grace');
  const stall = { x: 3.45, z: -1.5, yaw: -Math.PI / 2 };
  const walkIn = { x: 0.2, z: 12 };
  const atStall = { x: 1.85, z: -1.25, yaw: Math.PI / 2 };
  const money = b.prop(makeMoney());
  const tinPos = v3(3.0, 0.86, -1.85);

  b.fadeIn(1.2).ambient('market').music('warm', 0, 32, 0.45).music('tender', 32, 50, 0.6);
  b.grade({ warmth: 0.22, saturation: 1.1, vignette: 0.45 });

  // ---- blocking ----
  b.place('grace', stall, 0, 50);
  b.pose('grace', (l, t) => workPose(t, 4), 0, 10.0, { fadeOut: 0.8 });
  b.walk('daniel', [walkIn, { x: 0.3, z: 4 }, { x: 1.0, z: 0.2 }, atStall], 3.0, 10.6, { faceAtEnd: atStall.yaw });
  b.place('daniel', atStall, 10.6, 50);
  b.look('grace', 'daniel', 8.8, 50);
  b.look('daniel', 'grace', 9.0, 50);
  b.expr('daniel', 'smile', 3, 10);

  let t = 0.3;
  t = b.say(L[0], t, { dur: 4.2 });
  b.expr('grace', 'surprised', 9.0, 11.5);
  b.expr('grace', 'worried', 11.5, 14.5, { weight: 0.7 });
  t = b.say(L[1], 10.5, { hands: 'none', intensity: 0.7 });
  b.pose('grace', handsOnHipsPose(), 12.5, 21.0, { fadeIn: 0.8, fadeOut: 0.8 });
  // Daniel explains with his hands
  b.pose('daniel', (l, tt) => explainPose(tt, 0.9), 13.8, 21.2, { fadeIn: 0.5, fadeOut: 0.6 });
  b.expr('daniel', 'bigSmile', 13.8, 21);
  t = b.say(L[2], 14.0, { hands: 'none', intensity: 0.5 });
  b.expr('grace', 'thinking', 21, 25, { weight: 0.8 });
  t = b.say(L[3], 21.3, { hands: 'none', intensity: 0.5 });
  b.look('daniel', [2.6, 0.5, -1.4], 24.5, 29.5); // looks down at the stall
  b.expr('daniel', 'sad', 24.8, 30.5, { weight: 0.8 });
  b.pose('daniel', handOnChestPose('R'), 27.5, 30.5, { weight: 0.6 });
  t = b.say(L[4], 25.0, { hands: 'none', intensity: 0.4 });
  // Grace reaches down to the tin, takes out the money
  b.look('grace', [3.0, 0.9, -1.85], 29.5, 33.5);
  b.pose('grace', (l) => reachLowPose('R', Math.sin(Math.min(1, l / 1.2) * Math.PI / 2)), 29.6, 33.8, { fadeIn: 0.2, fadeOut: 0.8 });
  b.sfx('coin', 31.2, { volume: 0.35 });
  b.hold('grace', money, 'R', 31.6, 44.6, { x: 0, y: -0.06, z: -0.02, rx: 1.3 });
  b.expr('grace', 'determined', 30, 34, { weight: 0.7 });
  t = b.say(L[5], 30.6, { hands: 'none', intensity: 0.4 });
  b.look('grace', 'daniel', 33.5, 50);
  b.look('daniel', () => b.actorHead('grace').clone().add(v3(-0.4, -0.45, -0.2)), 31.5, 34.5); // watches her hands
  b.expr('daniel', 'worried', 33.5, 38.5);
  b.pose('daniel', (l) => shakeHeadPose(l, 2), 34.4, 36.4);
  b.pose('daniel', (l, tt) => explainPose(tt, 0.5), 35.5, 38.3, { weight: 0.5 });
  t = b.say(L[6], 34.2, { hands: 'none', intensity: 0.7 });
  // Grace holds out the money
  b.pose('grace', handOverPose('R', 1), 38.0, 45.2, { fadeIn: 0.7, fadeOut: 0.6 });
  b.expr('grace', 'proud', 38, 45, { weight: 0.8 });
  t = b.say(L[7], 38.3, { hands: 'none', intensity: 0.4 });
  b.pose('daniel', receivePose(), 42.2, 45.6, { fadeIn: 0.7, fadeOut: 0.6 });
  b.hold('daniel', money, 'L', 44.6, 50, { x: 0, y: -0.05, z: -0.02, rx: 1.3 });
  b.expr('daniel', 'cry', 42.5, 47.5, { weight: 0.55 });
  b.expr('daniel', 'smile', 44, 50, { weight: 0.6 });
  t = b.say(L[8], 42.2, { hands: 'none', intensity: 0.4 });
  b.pose('daniel', (l) => wipeTearsPose(l, 'R'), 45.6, 47.0);
  b.expr('grace', 'bigSmile', 45.5, 50);
  t = b.say(L[9], 45.6, { hands: 'none', intensity: 0.6 });
  b.pose('daniel', (l) => nodPose(l, 1), 48.2, 49.4);
  b.pose('daniel', (l) => straightenPose(l), 47.5, 50, { fadeOut: 0 });
  b.fadeOut(48.8, 1.2);

  // ---- camera ----
  b.shot(0, 5.2, { name: 'market establishing', pos: v3(0.3, 2.3, 13), posEnd: v3(0.3, 1.9, 9), look: v3(0, 1.1, -4), fov: 50, handheld: 0.15 });
  b.shot(5.2, 10.8, { name: 'tracking daniel in', pos: offset(D, 0.9, 0.05, -2.1), look: offset(D, 0, -0.05, 0), fov: 36, handheld: 0.35 });
  b.shot(10.8, 14.0, { name: 'cu grace surprised', pos: offset(G, -0.95, 0.02, 0.3), look: offset(G, 0, -0.03, 0), fov: 30, handheld: 0.3 });
  b.shot(14.0, 21.3, { name: 'ots grace -> daniel', pos: overShoulder(G, D, 1, 0.6, 0.1, 0.35), look: offset(D, 0, -0.03, 0), fov: 32, handheld: 0.3 });
  b.shot(21.3, 25.0, { name: 'cu grace thinking', pos: offset(G, -0.9, -0.03, -0.3), look: offset(G, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(25.0, 30.4, { name: 'cu daniel looks down', pos: offset(D, 0.85, -0.08, 0.3), look: offset(D, 0, -0.05, 0), fov: 28, handheld: 0.3 });
  b.shot(30.4, 34.2, { name: 'insert: the savings tin', pos: v3(2.35, 1.15, -2.35), posEnd: v3(2.45, 1.1, -2.3), look: tinPos, fov: 30, handheld: 0.3 });
  b.shot(34.2, 38.3, { name: 'cu daniel refuses', pos: offset(D, 0.8, 0.0, 0.4), look: offset(D, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(38.3, 42.2, { name: 'two shot across the stall', pos: v3(2.65, 1.35, 0.9), posEnd: v3(2.65, 1.3, 0.7), look: between(G, D, 0.5, -0.18), fov: 36, handheld: 0.25 });
  b.shot(42.2, 45.6, { name: 'cu daniel takes it', pos: offset(D, 0.75, -0.02, 0.5), posEnd: offset(D, 0.65, -0.02, 0.45), look: offset(D, 0, -0.03, 0), fov: 27, handheld: 0.3 });
  b.shot(45.6, 48.6, { name: 'cu grace', pos: offset(G, -0.9, -0.02, -0.35), look: offset(G, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(48.6, 50, { name: 'wide pull back', pos: v3(-0.5, 2.0, 3.5), posEnd: v3(-0.9, 2.2, 4.5), look: between(G, D, 0.5, -0.2), fov: 42, handheld: 0.15 });

  b.onEnter = (ctx) => (ctx.env as MarketEnvironment).savingsTin.visible = true;
  return { def: b.build(), lines: b.lines };
}
