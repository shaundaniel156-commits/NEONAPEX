/**
 * SCENE 6 - THE REAL VICTORY (25 s). Home, one week later, evening.
 * The results: Daniel is a finalist, not the winner. Grace names the real victory.
 */
import { SceneBuilder, yawTo } from './Direction';
import { SCREENPLAY } from '../story/Screenplay';
import { HOME_SPOTS as S } from '../environments/HomeSpots';
import { showPhonePose, explainPose, clapPose, handsOnTablePose } from '../animations/Gestures';
import { jumpJoyPose, celebratePose, surprisePose } from '../animations/EmotionalActions';
import { v3, offset, between } from '../camera/CinematicCamera';
import { makePhone } from './Props';
import { HomeEnvironment } from '../environments/Home';

export function buildScene6() {
  const L = SCREENPLAY.scene6;
  const b = new SceneBuilder('s6', 'The Real Victory', 25, 'home', 'evening');
  const D = () => b.actorEyes('daniel');
  const G = () => b.actorEyes('grace');
  const B = () => b.actorEyes('brian');
  const brianStop = { x: -0.25, z: -1.25, yaw: yawTo({ x: -0.25, z: -1.25 }, S.danielChair) };
  const danielStand = { x: -1.0, z: -1.0, yaw: yawTo({ x: -1.0, z: -1.0 }, brianStop) };
  const graceSit = S.sideChair;
  const graceStand = { x: -2.0, z: -0.45, yaw: yawTo({ x: -2.0, z: -0.45 }, danielStand) };
  const phone = b.prop(makePhone('results'));

  b.fadeIn(1.0).ambient('home').music('triumph', 0, 25, 0.6);
  b.grade({ warmth: 0.3, saturation: 1.12, vignette: 0.45 });
  b.custom(0, 25, (_l, ctx) => (ctx.env as HomeEnvironment).setLaptopScreenIfChanged(1.0));
  b.sfx('door', 0.9, { volume: 0.5 }).sfx('cheer', 18.0, { volume: 0.5 }).sfx('success', 18.4, { volume: 0.5 });

  // ---- blocking ----
  b.sit('daniel', S.danielChair, 0, 8.6);
  b.pose('daniel', handsOnTablePose(), 0, 8.6, { fadeOut: 0.5 });
  b.sit('grace', graceSit, 0, 13.2);
  b.look('grace', 'daniel', 0, 2.5);
  b.look('daniel', 'grace', 0, 2.5);
  b.walk('brian', [S.doorOutside, S.doorway, { x: 0.6, z: -1.5 }, brianStop], 0.9, 3.0, { faceAtEnd: brianStop.yaw });
  b.place('brian', brianStop, 3.0, 25);
  b.look('daniel', 'brian', 2.5, 12.0);
  b.look('grace', 'brian', 2.5, 12.0);
  b.look('brian', 'daniel', 2.0, 25);

  let t = b.say(L[0], 0.3, { dur: 1.5 });
  b.hold('brian', phone, 'R', 2.6, 25, { x: 0, y: -0.06, z: -0.02, rx: -1.3 });
  b.pose('brian', showPhonePose('R'), 3.0, 8.4, { fadeIn: 0.5, fadeOut: 0.6 });
  b.expr('brian', 'bigSmile', 2.5, 25);
  b.expr('daniel', 'surprised', 3.5, 8.5, { weight: 0.8 });
  b.pose('daniel', (l) => surprisePose(l), 4.0, 8.0, { weight: 0.5 });
  b.expr('grace', 'surprised', 4.0, 8.0, { weight: 0.7 });
  t = b.say(L[1], 3.0, { hands: 'none', intensity: 0.9, dur: 5.0 });
  // Daniel stands, takes it in, smiles
  b.place('daniel', danielStand, 8.6, 25);
  b.look('daniel', 'grace', 12.0, 17.4);
  b.expr('daniel', 'smile', 8.6, 17.4);
  b.pose('daniel', (l, tt) => explainPose(tt, 0.6), 8.8, 12.0, { weight: 0.7 });
  t = b.say(L[2], 8.6, { hands: 'none', intensity: 0.5, dur: 3.2 });
  // Grace stands and names the real victory
  b.place('grace', graceStand, 13.2, 25);
  b.look('grace', 'daniel', 12.0, 25);
  b.expr('grace', 'proud', 12.0, 25);
  b.pose('grace', (l, tt) => explainPose(tt, 0.35), 12.6, 17.0, { weight: 0.5 });
  t = b.say(L[3], 12.4, { hands: 'none', intensity: 0.5, dur: 4.6 });
  b.expr('daniel', 'bigSmile', 17.4, 25);
  // celebration
  t = b.say(L[4], 17.4, { hands: 'none', intensity: 0.8, dur: 3.2 });
  b.pose('brian', (l, tt) => jumpJoyPose(tt), 18.2, 23.5, { fadeIn: 0.5 });
  b.pose('daniel', (l, tt) => celebratePose(tt), 18.6, 23.5, { fadeIn: 0.6 });
  b.pose('grace', (l, tt) => clapPose(tt), 18.4, 23.5, { fadeIn: 0.5 });
  b.expr('grace', 'laugh', 18.5, 25);
  b.expr('daniel', 'laugh', 19.0, 25);
  b.expr('brian', 'laugh', 18.5, 25);
  t = b.say(L[5], 20.8, { dur: 4.0 });
  b.fadeOut(23.6, 1.4);

  // ---- camera ----
  b.shot(0, 3.2, { name: 'brian bursts in', pos: v3(-2.4, 1.6, -1.2), posEnd: v3(-2.0, 1.55, -1.0), look: v3(1.2, 1.1, -1.8), lookEnd: v3(0.2, 1.2, -1.3), fov: 46, handheld: 0.25 });
  b.shot(3.2, 8.6, { name: 'cu brian results', pos: offset(B, -0.75, 0.0, 0.5), look: offset(B, 0, -0.03, 0), fov: 30, handheld: 0.35 });
  b.shot(8.6, 12.4, { name: 'cu daniel stands', pos: offset(D, 0.75, 0.0, 0.45), look: offset(D, 0, -0.03, 0), fov: 30, handheld: 0.3 });
  b.shot(12.4, 17.4, { name: 'cu grace real victory', pos: offset(G, 0.85, 0.0, -0.3), look: offset(G, 0, -0.03, 0), fov: 30, handheld: 0.3 });
  b.shot(17.4, 20.8, { name: 'three shot celebrate', pos: v3(0.4, 1.5, -2.6), posEnd: v3(0.2, 1.45, -2.4), look: between(D, G, 0.4, -0.15), fov: 44, handheld: 0.3 });
  b.shot(20.8, 25, { name: 'final wide pull-back', pos: v3(1.6, 1.6, -2.2), posEnd: v3(2.4, 1.9, -2.6), look: v3(-1.0, 1.1, -0.9), fov: 46, handheld: 0.15 });

  return { def: b.build(), lines: b.lines };
}
