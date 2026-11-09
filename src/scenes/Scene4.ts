/**
 * SCENE 4 - THE UNEXPECTED PROBLEM (65 s). Daniel's bedroom, Thursday night, rain.
 * Hours before the deadline the power goes, the old laptop's disk dies and three
 * months of work vanish. Daniel breaks down and sends Brian home.
 */
import * as THREE from 'three';
import { SceneBuilder } from './Direction';
import { SCREENPLAY } from '../story/Screenplay';
import { typingPose, leanToScreenPose, holdPhonePose, crouchPose, explainPose, handsOnTablePose } from '../animations/Gestures';
import { nodPose } from '../animations/Talking';
import { slumpPose, surprisePose, faceInHandsPose, cryPose } from '../animations/EmotionalActions';
import { v3, overShoulder, offset, between } from '../camera/CinematicCamera';
import { makeNotebook } from './Props';
import { BedroomEnvironment } from '../environments/Bedroom';

export function buildScene4() {
  const L = SCREENPLAY.scene4;
  const b = new SceneBuilder('s4', 'The Unexpected Problem', 65, 'bedroom', 'nightRain');
  const D = () => b.actorEyes('daniel');
  const B = () => b.actorEyes('brian');
  const deskChair = { x: 0, z: -0.85, yaw: Math.PI };
  const bedSit = { x: 1.45, z: 0.2, yaw: -Math.PI / 2 };
  const brianStand = { x: 1.25, z: 0.1, yaw: -Math.PI / 2 - 0.4 };
  const lampSpot = { x: 0.55, z: 0.75, yaw: 0.9 };
  const brianByDesk = { x: 0.75, z: 0.2, yaw: Math.PI + 0.55 };
  const doorway = { x: -1.2, z: 1.5 };
  const screen = v3(0, 0.95, -1.42);
  const notebook = b.prop(makeNotebook());
  const env = () => b.envAs<BedroomEnvironment>();

  b.fadeIn(1.4).ambient('rain').music('tense', 0, 65, 0.5);
  b.grade({ warmth: -0.12, saturation: 0.95, contrast: 1.06, vignette: 0.5, exposure: 1.15 });
  // laptop state as a function of scene time (so seeking is exact)
  b.custom(0, 65, (l, ctx) => {
    const e = ctx.env as BedroomEnvironment;
    e.props.laptop.position.set(0, 0.765, -1.48);
    e.props.laptop.rotation.set(0, Math.PI, 0);
    e.setRain(true);
    if (l < 22.4) e.setLaptopScreenIfChanged(0.9, false, false);
    else if (l < 24.6) e.setLaptopScreenIfChanged(0.9, true, false);
    else e.setLaptopScreenIfChanged(0, false, true);
    e.setKerosene(l >= 31.0);
    e.applyPresetIfChanged(l >= 17.0 ? 'powerCut' : 'nightRain', ctx.scene);
    // lightning flashes
    const flashes = [14.3, 14.45, 62.4, 62.6];
    for (const f of flashes) if (l >= f && l < f + 0.12) e.lightningFlash = 1 - (l - f) / 0.12;
  });
  b.sfx('thunder', 14.6, { volume: 0.8 }).sfx('power_cut', 17.0, { volume: 0.6 }).sfx('laptop_crash', 22.6, { volume: 0.7 }).sfx('thunder', 62.7, { volume: 0.7 });
  for (const k of [25.2, 25.55, 25.9, 26.3]) b.sfx('keypress', k, { volume: 0.5 });
  b.sfx('click', 31.0, { volume: 0.4 }).sfx('chair', 17.6, { volume: 0.4 }).sfx('door', 61.8, { volume: 0.5 });

  // ---- blocking ----
  b.sit('daniel', deskChair, 0, 65);
  b.pose('daniel', (l, t) => typingPose(t, 1.0), 0, 17.2, { fadeOut: 0.5 });
  b.look('daniel', [0, 0.95, -1.42], 0, 8.4);
  b.expr('daniel', 'determined', 0, 8, { weight: 0.6 });
  b.sit('brian', bedSit, 0, 17.5, 0.5);
  b.hold('brian', notebook, 'L', 0, 17.5, { x: 0.02, y: -0.08, z: -0.04, rx: -1.1, ry: 0.4 });
  b.pose('brian', holdPhonePose('L', 0.1), 0, 17.5, { fadeOut: 0.5 });
  b.look('brian', () => b.actorHead('brian').clone().add(v3(-0.3, -0.3, 0.1)), 0, 4.0);

  let t = 0.5;
  t = b.say(L[0], t);
  b.look('brian', 'daniel', 4.0, 65);
  t = b.say(L[1], 4.6, { hands: 'none', intensity: 0.5, expr: 'smile' });
  b.look('daniel', 'brian', 8.4, 10.5);
  b.look('daniel', [0, 0.95, -1.42], 10.5, 24.0);
  b.expr('daniel', 'bigSmile', 8.5, 14);
  t = b.say(L[2], 8.8, { hands: 'none', intensity: 0.4 });
  // thunder: both glance at the window
  b.look('daniel', [0, 1.6, -1.9], 14.3, 16.0);
  b.look('brian', [0, 1.6, -1.9], 14.3, 16.5);
  b.expr('brian', 'surprised', 14.3, 16.5, { weight: 0.6 });
  // POWER CUT
  b.expr('daniel', 'surprised', 17.0, 19.5, { weight: 0.7 });
  b.pose('daniel', (l) => surprisePose(l), 17.0, 19.0, { weight: 0.5 });
  b.pose('daniel', (l, tt) => leanToScreenPose(tt), 19.0, 28.5, { fadeIn: 0.6 });
  b.place('brian', brianStand, 17.5, 28.5);
  b.expr('brian', 'shocked', 17.3, 20.5, { weight: 0.8 });
  t = b.say(L[3], 17.6, { hands: 'right', intensity: 0.9 });
  b.look('daniel', 'brian', 19.0, 20.8);
  b.look('daniel', [0, 0.95, -1.42], 20.8, 32.0);
  b.expr('daniel', 'smile', 20.4, 22.4, { weight: 0.5 });
  t = b.say(L[4], 20.6, { hands: 'none', intensity: 0.4 });
  // the disk dies
  b.expr('daniel', 'shocked', 22.5, 28.5);
  t = b.say(L[5], 24.6, { hands: 'none', intensity: 1.0 });
  b.pose('daniel', (l, tt) => ({ joints: { handL: [-0.4 + Math.abs(Math.sin(tt * 14)) * 0.3, 0, 0], handR: [-0.4 + Math.abs(Math.sin(tt * 11)) * 0.3, 0, 0] } }), 24.8, 27.2, { fadeIn: 0.1, fadeOut: 0.3 });
  // Brian goes to light the kerosene lamp
  b.walk('brian', [brianStand, lampSpot], 28.3, 29.6, { faceAtEnd: lampSpot.yaw });
  b.place('brian', lampSpot, 29.6, 32.6);
  b.pose('brian', (l, tt) => crouchPose(tt, 0.55), 29.4, 32.8, { fadeIn: 0.7, fadeOut: 0.7 });
  b.look('brian', [0.8, 0.3, 0.9], 29.4, 31.6);
  b.look('brian', 'daniel', 31.6, 65);
  t = b.say(L[6], 29.8, { hands: 'none', intensity: 0.5, expr: 'worried' });
  // Daniel: the disk is dead
  b.pose('daniel', (l, tt) => slumpPose(tt), 28.5, 44.5, { fadeIn: 1.0, fadeOut: 0.8 });
  b.expr('daniel', 'sad', 28.5, 39, { weight: 0.9 });
  b.look('daniel', [0, 0.95, -1.42], 32.0, 35.5);
  b.look('daniel', 'brian', 35.5, 54.0);
  t = b.say(L[7], 32.8, { hands: 'none', intensity: 0.3 });
  b.walk('brian', [lampSpot, brianByDesk], 32.8, 34.2, { faceAtEnd: brianByDesk.yaw });
  b.place('brian', brianByDesk, 34.2, 57.0);
  // Brian: we can rebuild it
  b.pose('brian', (l, tt) => explainPose(tt, 0.9), 39.3, 44.5, { fadeIn: 0.5, fadeOut: 0.5 });
  b.expr('brian', 'worried', 38, 56, { weight: 0.7 });
  t = b.say(L[8], 39.6, { hands: 'none', intensity: 0.6 });
  // Daniel: angry despair
  b.expr('daniel', 'angry', 44.3, 50.5, { weight: 0.85 });
  b.pose('daniel', (l, tt) => explainPose(tt, 1.3), 44.5, 50.3, { fadeIn: 0.4, fadeOut: 0.5, weight: 0.8 });
  b.pose('daniel', { joints: { spine: [0.05, 0.6, 0], chest: [0, 0.3, 0] } }, 44.0, 56.0, { fadeIn: 0.8, fadeOut: 0.8 });
  t = b.say(L[9], 44.6, { hands: 'none', intensity: 1.0 });
  t = b.say(L[10], 50.6, { hands: 'none', intensity: 0.4 });
  b.expr('daniel', 'cry', 50.5, 65, { weight: 0.9 });
  t = b.say(L[11], 52.4, { hands: 'none', intensity: 0.4 });
  b.pose('daniel', (l, tt) => faceInHandsPose(tt), 54.0, 65, { fadeIn: 1.2 });
  // Brian hesitates, leaves
  b.pose('brian', (l) => nodPose(l, 1), 56.0, 57.2, { weight: 0.5 });
  b.walk('brian', [brianByDesk, { x: -0.3, z: 0.9 }, doorway], 57.2, 61.2, { faceAtEnd: Math.PI });
  b.place('brian', { x: -1.2, z: 1.5, yaw: Math.PI }, 61.2, 61.9);
  b.expr('brian', 'sad', 55, 62);
  b.fadeOut(63.4, 1.6);

  // ---- camera ----
  b.shot(0, 4.6, { name: 'bedroom establishing', pos: v3(-1.5, 1.7, 1.55), posEnd: v3(-1.1, 1.55, 0.9), look: v3(0.3, 1.0, -1.1), fov: 46, handheld: 0.15 });
  b.shot(4.6, 8.8, { name: 'cu brian on bed', pos: offset(B, -0.9, 0.0, 0.25), look: offset(B, 0, -0.03, 0), fov: 30, handheld: 0.3 });
  b.shot(8.8, 14.3, { name: 'ots daniel at laptop', pos: overShoulder(D, () => screen, -1, 0.55, 0.22, 0.32), look: v3(0, 0.95, -1.42), fov: 34, handheld: 0.3 });
  b.shot(14.3, 17.6, { name: 'wide lightning', pos: v3(1.7, 1.6, 1.5), look: v3(0.1, 1.0, -1.2), fov: 44, handheld: 0.2 });
  b.shot(17.6, 20.6, { name: 'cu brian power', pos: offset(B, -0.7, 0.0, -0.55), look: offset(B, 0, -0.03, 0), fov: 30, handheld: 0.35 });
  b.shot(20.6, 24.6, { name: 'insert laptop screen', pos: v3(0.55, 1.05, -0.65), posEnd: v3(0.45, 1.0, -0.75), look: v3(0, 0.92, -1.42), fov: 30, handheld: 0.3 });
  b.shot(24.6, 28.6, { name: 'ecu daniel no no no', pos: offset(D, 0.5, 0.0, -0.78), posEnd: offset(D, 0.42, 0.0, -0.68), look: offset(D, 0, -0.03, 0), fov: 27, handheld: 0.4 });
  b.shot(28.6, 32.8, { name: 'brian lights the lamp', pos: v3(-0.9, 0.95, 1.5), look: v3(0.8, 0.35, 0.9), fov: 36, handheld: 0.3 });
  b.shot(32.8, 39.6, { name: 'cu daniel lamp light', pos: offset(D, -0.25, 0.08, -0.95), look: offset(D, 0, -0.03, 0), fov: 33, handheld: 0.3 });
  b.shot(39.6, 44.6, { name: 'cu brian rebuild', pos: offset(B, -0.55, 0.0, -0.8), look: offset(B, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(44.6, 50.6, { name: 'two shot from window', pos: v3(-1.3, 1.3, -1.3), posEnd: v3(-1.2, 1.3, -1.1), look: between(D, B, 0.5, -0.1), fov: 38, handheld: 0.3 });
  b.shot(50.6, 56.6, { name: 'cu daniel go home', pos: offset(D, 0.55, 0.0, -0.72), look: offset(D, 0, -0.05, 0), fov: 27, handheld: 0.35 });
  b.shot(56.6, 65, { name: 'slow pull back, brian leaves', pos: v3(-0.7, 1.35, 1.0), posEnd: v3(-1.0, 1.5, 1.75), look: offset(D, 0, -0.15, 0), fov: 40, handheld: 0.2 });

  b.onEnter = (ctx) => {
    const e = ctx.env as BedroomEnvironment;
    e.setKerosene(false);
    e.setRain(true);
  };
  return { def: b.build(), lines: b.lines };
}
