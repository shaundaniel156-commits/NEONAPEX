/**
 * SCENE 1 - A PROMISE (45 s). Daniel's home, early morning.
 * Grace packs tomatoes for the market while Daniel codes at the table. She reminds
 * him of his late father; he renews the promise: finish what you start, never give up.
 */
import { SceneBuilder, yawTo } from './Direction';
import { SCREENPLAY } from '../story/Screenplay';
import { HOME_SPOTS as S } from '../environments/HomeSpots';
import { typingPose, handsOnTablePose, pointPose, workPose, handOnShoulderPose, carryPose, explainPose, handsOnHipsPose } from '../animations/Gestures';
import { nodPose } from '../animations/Talking';
import { v3, overShoulder, offset, between } from '../camera/CinematicCamera';
import { makeBasin } from './Props';
import { HomeEnvironment } from '../environments/Home';
import { Ease } from '../core/MathUtils';

export function buildScene1() {
  const L = SCREENPLAY.scene1;
  const b = new SceneBuilder('s1', 'A Promise', 45, 'home', 'morning');
  const D = () => b.actorEyes('daniel');
  const G = () => b.actorEyes('grace');
  const kitchen = { x: 1.2, z: 1.75, yaw: 0 };
  const besideDaniel = { x: -0.36, z: -0.5, yaw: -Math.PI / 2 + 0.15 };
  const basin = b.prop(makeBasin());

  b.fadeIn(1.5).ambient('home').music('warm', 0, 45, 0.55);
  b.custom(0, 45, (l, ctx) => (ctx.env as HomeEnvironment).setLaptopScreenIfChanged(0.35 + Math.min(1, l / 45) * 0.3));
  b.grade({ warmth: 0.18, saturation: 1.08, vignette: 0.5 });

  // ---- blocking ----
  b.sit('daniel', S.danielChair, 0, 45);
  b.pose('daniel', (l, t) => typingPose(t, 0.9), 0, 9.5, { fadeOut: 0.8 });
  b.look('daniel', S.laptopScreen, 0, 9.2);
  b.expr('daniel', 'determined', 0, 8, { weight: 0.7 });
  const graceToDaniel = yawTo(kitchen, S.danielChair);
  b.place('grace', kitchen, 0, 5.0);
  b.turn('grace', kitchen, 0, graceToDaniel, 5.0, 6.2);
  b.place('grace', { ...kitchen, yaw: graceToDaniel }, 6.2, 14);
  b.pose('grace', (l, t) => workPose(t, 2), 0, 5.4, { fadeOut: 0.6 });
  b.pose('grace', handsOnHipsPose(), 6.0, 13.5, { fadeIn: 0.8, fadeOut: 0.6 });
  b.showProp(basin, { x: 1.2, y: 0.9, z: 2.0 }, 0, 39.5);

  // ---- dialogue + acting ----
  let t = 0.6;
  t = b.say(L[0], t); // narrator
  // Grace turns her head to Daniel and speaks (5.6)
  b.look('grace', 'daniel', 5.0, 14);
  t = b.say(L[1], 5.8, { hands: 'none', expr: 'smile', intensity: 0.5 });
  // Daniel: "Two minutes..." points at the screen
  b.look('daniel', 'grace', 9.4, 11.2);
  b.pose('daniel', handsOnTablePose(), 9.5, 45, { fadeIn: 0.6 });
  t = b.say(L[2], 10.0, { hands: 'none', expr: 'bigSmile', intensity: 0.8 });
  b.pose('daniel', pointPose('L', 0.55, -0.35), 12.2, 15.3, { fadeIn: 0.4 });
  b.look('daniel', S.laptopScreen, 11.2, 17.0);
  // Grace walks over to look at the screen
  b.walk('grace', [kitchen, { x: 0.7, z: 1.2 }, { x: 0.5, z: -0.2 }, besideDaniel], 14.0, 17.6, { faceAtEnd: besideDaniel.yaw, ease: Ease.inOutSine });
  b.place('grace', besideDaniel, 17.6, 39.5);
  b.look('grace', S.laptopScreen, 16.5, 21.0);
  b.expr('grace', 'listening', 16, 21.5);
  t = b.say(L[3], 18.0, { hands: 'none', expr: 'smile', intensity: 0.5 });
  b.look('grace', 'daniel', 21.0, 39.5);
  // Daniel: the father line - soft, looking down then up
  b.look('daniel', [-0.9, 0.6, 0.2], 21.5, 24.5);
  b.look('daniel', 'grace', 24.5, 39.5);
  b.expr('daniel', 'sad', 22.0, 27.0, { weight: 0.75 });
  t = b.say(L[4], 22.5, { hands: 'none', intensity: 0.4 });
  // Grace: hand on his shoulder
  b.pose('grace', handOnShoulderPose('R'), 26.8, 36.0, { fadeIn: 0.8, fadeOut: 0.8 });
  b.expr('grace', 'worried', 26.5, 29.5, { weight: 0.6 });
  b.expr('grace', 'proud', 29.5, 35.5, { weight: 0.8 });
  t = b.say(L[5], 27.5, { hands: 'none', intensity: 0.5 });
  // Daniel: "I promise." - looks up, nods
  b.expr('daniel', 'determined', 31.5, 35.0, { weight: 0.9 });
  b.pose('daniel', (l) => nodPose(l, 1), 33.2, 34.6);
  t = b.say(L[6], 32.6, { hands: 'none', intensity: 0.4 });
  b.expr('daniel', 'smile', 35.0, 45);
  // Grace: "Good. Now eat..." smiles, pats, goes to fetch the basin and leaves
  b.expr('grace', 'bigSmile', 35.0, 40.0);
  t = b.say(L[7], 35.6, { hands: 'none', intensity: 0.6 });
  b.walk('grace', [besideDaniel, { x: 0.45, z: -0.25 }, { x: 0.7, z: 1.3 }, kitchen], 39.5, 42.2, { faceAtEnd: 0 });
  b.pose('grace', (l, t) => workPose(t, 5), 42.0, 42.8, { fadeIn: 0.3, fadeOut: 0.3 });
  b.hold('grace', basin, 'L', 42.5, 45, { x: 0.14, y: -0.12, z: 0.08, rx: 0.1 });
  b.pose('grace', carryPose(), 42.4, 45, { fadeIn: 0.5 });
  b.walk('grace', [kitchen, { x: 1.9, z: 0.6 }, { x: 2.0, z: -1.4 }, S.doorOutside], 42.8, 46.5, { faceAtEnd: Math.PI });
  b.look('daniel', 'grace', 39.5, 44.0);
  b.pose('daniel', (l, t) => explainPose(t, 0.25), 41.5, 45, { weight: 0.5 });
  b.sfx('door', 44.6, { volume: 0.5 });
  b.fadeOut(43.8, 1.2);

  // ---- camera ----
  b.shot(0, 6.0, { name: 'establishing push-in', pos: v3(2.3, 1.75, -2.1), posEnd: v3(1.5, 1.55, -1.3), look: v3(-0.4, 1.0, 0.7), lookEnd: v3(-0.5, 1.05, 0.5), fov: 44, handheld: 0.15 });
  b.shot(6.0, 9.8, { name: 'grace at counter', pos: v3(-0.2, 1.5, 0.45), posEnd: v3(-0.1, 1.48, 0.6), look: offset(G, 0, -0.05, 0), fov: 34, handheld: 0.25 });
  b.shot(9.8, 14.0, { name: 'daniel across table', pos: v3(-0.35, 1.3, 1.25), posEnd: v3(-0.45, 1.25, 1.1), look: offset(D, 0, -0.03, 0), fov: 32, handheld: 0.25 });
  b.shot(14.0, 17.8, { name: 'grace walks over', pos: v3(2.2, 1.6, -1.6), posEnd: v3(1.8, 1.55, -1.5), look: between(G, D, 0.5, -0.15), fov: 42, handheld: 0.2 });
  b.shot(17.8, 22.3, { name: 'cu grace at screen', pos: offset(G, -0.85, -0.12, 0.3), look: offset(G, 0, -0.02, 0), fov: 28, handheld: 0.3 });
  b.shot(22.3, 27.3, { name: 'cu daniel father line', pos: offset(D, 0.75, -0.02, 0.7), look: offset(D, 0, -0.03, 0), fov: 27, handheld: 0.3 });
  b.shot(27.3, 32.4, { name: 'two shot hand on shoulder', pos: v3(-2.3, 1.45, 0.7), posEnd: v3(-2.1, 1.4, 0.5), look: between(D, G, 0.45, -0.12), fov: 36, handheld: 0.2 });
  b.shot(32.4, 35.4, { name: 'ecu daniel i promise', pos: offset(D, 0.7, 0.05, 0.85), posEnd: offset(D, 0.6, 0.04, 0.72), look: offset(D, 0, -0.02, 0), fov: 27, handheld: 0.3 });
  b.shot(35.4, 39.6, { name: 'cu grace smile', pos: offset(G, -0.85, -0.08, -0.35), look: offset(G, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(39.6, 45.0, { name: 'wide grace leaves', pos: v3(-2.6, 1.55, -1.7), posEnd: v3(-2.2, 1.5, -1.9), look: v3(1.0, 1.1, 0.2), lookEnd: v3(1.6, 1.05, -1.0), fov: 46, handheld: 0.15 });

  return { def: b.build(), lines: b.lines };
}
