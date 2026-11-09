/**
 * SCENE 5 - THE FINAL ATTEMPT (65 s). Bedroom, night into dawn.
 * Grace reminds Daniel of his promise. Brian returns with a borrowed laptop and the
 * three of them rebuild Market Link through the night. 08:57 - submitted.
 */
import { SceneBuilder, yawTo } from './Direction';
import { SCREENPLAY } from '../story/Screenplay';
import { typingPose, handOnShoulderPose, handOverPose, holdPhonePose, carryPose, pointPose, explainPose, handsOnTablePose, sideHugPose } from '../animations/Gestures';
import { nodPose } from '../animations/Talking';
import { faceInHandsPose, wipeTearsPose, straightenPose, hugPose, cryPose } from '../animations/EmotionalActions';
import { v3, offset, between } from '../camera/CinematicCamera';
import { makePhone, makeOldLaptop, makeHandLamp } from './Props';
import { BedroomEnvironment } from '../environments/Bedroom';
import { Ease } from '../core/MathUtils';

export function buildScene5() {
  const L = SCREENPLAY.scene5;
  const b = new SceneBuilder('s5', 'The Final Attempt', 65, 'bedroom', 'powerCut');
  const D = () => b.actorEyes('daniel');
  const G = () => b.actorEyes('grace');
  const B = () => b.actorEyes('brian');
  const deskChair = { x: 0, z: -0.85, yaw: Math.PI };
  const doorway = { x: -1.2, z: 1.5 };
  const beside = { x: -0.85, z: -0.55, yaw: yawTo({ x: -0.85, z: -0.55 }, deskChair) };
  const besideRight = { x: 0.85, z: -0.45, yaw: yawTo({ x: 0.85, z: -0.45 }, { x: 0, z: -1.3 }) };
  const bedSit = { x: 1.45, z: 0.2, yaw: -Math.PI / 2 };
  const standUp = { x: 0.05, z: -0.45, yaw: 0 };
  const graceHug = { x: 0.05, z: 0.3, yaw: Math.PI };
  const phone = b.prop(makePhone('poster'));
  const lamp = b.prop(makeHandLamp());
  const old = makeOldLaptop();
  const oldLaptop = b.prop(old.group);

  b.fadeIn(1.2).ambient('night', 0, 52).ambient('home', 52, 65).music('sad', 0, 30, 0.5).music('resolve', 30, 56, 0.55).music('triumph', 56, 65, 0.6);
  b.grade({ warmth: -0.05, saturation: 0.98, contrast: 1.05, vignette: 0.5, exposure: 1.12 }, 0, 52);
  b.grade({ warmth: 0.25, saturation: 1.1, contrast: 1.04, vignette: 0.45, exposure: 1.05 }, 52, 65, 2.5);
  b.custom(0, 65, (l, ctx) => {
    const e = ctx.env as BedroomEnvironment;
    e.setLaptopScreenIfChanged(0, false, true);
    e.setKerosene(l < 52);
    e.setRain(l < 52);
    e.applyPresetIfChanged(l >= 52 ? 'dawn' : 'powerCut', ctx.scene);
    // the dead laptop is pushed aside when Brian brings the borrowed one
    const moved = l >= 43.2;
    e.props.laptop.position.set(moved ? 0.55 : 0, 0.765, moved ? -1.55 : -1.48);
    e.props.laptop.rotation.set(0, Math.PI + (moved ? 0.5 : 0), 0);
    // borrowed laptop progress
    const p = l < 44 ? 0.05 : Math.min(1, (l - 44) / 15);
    old.setProgress(Math.round(p * 10) / 10, l >= 59.6);
  });
  b.sfx('door', 0.8, { volume: 0.4 }).sfx('door', 38.2, { volume: 0.4 }).sfx('success', 59.7, { volume: 0.6 }).sfx('notification', 59.0, { volume: 0.4 });
  for (let k = 44.5; k < 59; k += 0.37) b.sfx('keypress', k + (k * 7) % 0.13, { volume: 0.18 });

  // ---- Daniel crying at the desk ----
  b.sit('daniel', deskChair, 0, 61.4);
  b.pose('daniel', (l, tt) => faceInHandsPose(tt), 0, 5.5, { fadeIn: 0, fadeOut: 1.0 });
  b.pose('daniel', (l, tt) => cryPose(tt, 0.6), 5.0, 20, { fadeIn: 1.0, fadeOut: 1.0 });
  b.expr('daniel', 'cry', 0, 12, { weight: 0.9 });
  b.expr('daniel', 'sad', 12, 32, { weight: 0.85 });
  // ---- Grace enters with a lamp ----
  b.walk('grace', [doorway, { x: -0.9, z: 0.6 }, beside], 0.9, 4.6, { faceAtEnd: beside.yaw, ease: Ease.inOutSine });
  b.place('grace', beside, 4.6, 44.0);
  b.hold('grace', lamp, 'L', 0.0, 10.4, { x: 0, y: -0.07, z: -0.06, rx: 0 });
  b.pose('grace', { joints: { upperArmL: [-0.35, 0.1, 0.3], forearmL: [-0.6, 0, 0], handL: [0.3, 0, 0] } }, 0, 10.6, { fadeOut: 0.8 });
  b.showProp(lamp, { x: -0.6, y: 0.76, z: -1.25 }, 10.4, 65);
  b.look('grace', 'daniel', 1.0, 44.0);
  let t = b.say(L[0], 1.3, { hands: 'none', intensity: 0.3 });
  b.look('daniel', 'grace', 3.6, 24.0);
  t = b.say(L[1], 5.6, { hands: 'none', intensity: 0.5 });
  b.pose('grace', handOnShoulderPose('R'), 11.0, 22.5, { fadeIn: 0.9, fadeOut: 0.8 });
  b.expr('grace', 'worried', 2, 11, { weight: 0.6 });
  b.expr('grace', 'proud', 11, 22, { weight: 0.75 });
  t = b.say(L[2], 11.6, { hands: 'none', intensity: 0.35 });
  b.look('daniel', [0, 0.5, -1.0], 20.0, 24.0);
  t = b.say(L[3], 20.4, { hands: 'none', intensity: 0.3 });
  // Grace picks up the phone from the desk and holds it out
  b.showProp(phone, { x: 0.45, y: 0.775, z: -1.4 }, 0, 23.4);
  b.pose('grace', { joints: { spine: [0.35, 0.3, 0], upperArmR: [-1.0, -0.3, -0.1], forearmR: [-0.3, 0, 0] } }, 22.6, 24.4, { fadeIn: 0.6, fadeOut: 0.5 });
  b.hold('grace', phone, 'R', 23.4, 31.8, { x: 0, y: -0.05, z: -0.02, rx: 1.4 });
  b.pose('grace', handOverPose('R', 0.9), 24.4, 32.2, { fadeIn: 0.6, fadeOut: 0.6 });
  b.expr('grace', 'determined', 24, 33, { weight: 0.7 });
  t = b.say(L[4], 24.8, { hands: 'none', intensity: 0.4 });
  b.look('daniel', () => b.actorHead('grace').clone().add(v3(0.35, -0.45, 0.1)), 24.0, 32.0);
  // Daniel takes the phone, wipes his tears, straightens up
  b.hold('daniel', phone, 'L', 31.8, 43.5, { x: 0, y: -0.06, z: -0.02, rx: -1.2 });
  b.pose('daniel', holdPhonePose('L', 0.3), 31.6, 43.8, { fadeIn: 0.6, fadeOut: 0.6 });
  b.look('daniel', () => b.actorHead('daniel').clone().add(v3(0.1, -0.3, 0.35)), 32.0, 38.0);
  b.pose('daniel', (l) => wipeTearsPose(l, 'R'), 34.4, 35.8);
  b.pose('daniel', (l) => straightenPose(l), 36.0, 44.0, { fadeOut: 0 });
  b.expr('daniel', 'determined', 36.5, 56.5, { weight: 0.9 });
  b.look('grace', 'daniel', 32, 44);
  // Brian returns with the borrowed laptop
  b.walk('brian', [{ x: -1.2, z: 1.5 }, { x: 0.3, z: 0.7 }, besideRight], 38.3, 42.6, { faceAtEnd: besideRight.yaw });
  b.place('brian', besideRight, 42.6, 61.8);
  b.hold('brian', oldLaptop, 'L', 38.0, 43.2, { x: 0.12, y: -0.1, z: 0.06, rx: 0, ry: 0.2 });
  b.pose('brian', carryPose(), 38.0, 43.4, { fadeIn: 0, fadeOut: 0.6 });
  b.showProp(oldLaptop, { x: 0.02, y: 0.765, z: -1.4, ry: 0 }, 43.2, 65);
  b.look('daniel', 'brian', 38.0, 44.5);
  b.look('grace', 'brian', 38.0, 44.0);
  b.expr('brian', 'determined', 38, 46);
  t = b.say(L[5], 39.0, { hands: 'none', intensity: 0.5 });
  b.pose('brian', { joints: { spine: [0.3, 0, 0], upperArmL: [-0.9, 0.2, 0.2], upperArmR: [-0.9, -0.2, -0.2], forearmL: [-0.5, 0, 0], forearmR: [-0.5, 0, 0] } }, 42.8, 44.2, { fadeIn: 0.4, fadeOut: 0.5 });
  t = b.say(L[6], 43.6, { hands: 'none', intensity: 0.6, expr: 'smile' });
  // ---- montage: through the night ----
  b.pose('daniel', (l, tt) => typingPose(tt, 0.95), 44.4, 59.2, { fadeIn: 0.8, fadeOut: 0.8 });
  b.look('daniel', [0, 0.95, -1.35], 44.5, 59.5);
  b.pose('brian', pointPose('R', 0.5, 0.2), 46.5, 51.0, { fadeIn: 0.6, fadeOut: 0.6 });
  b.pose('brian', { joints: { spine: [0.2, 0, 0] } }, 44.5, 59.5);
  b.look('brian', [0, 0.95, -1.35], 44.5, 59.0);
  b.pose('brian', (l, tt) => explainPose(tt, 0.5), 52.5, 56.5, { weight: 0.6 });
  b.walk('grace', [beside, { x: 0.6, z: 0.3 }, bedSit], 44.0, 47.2, { faceAtEnd: bedSit.yaw });
  b.sit('grace', bedSit, 47.2, 57.4, 0.5);
  b.pose('grace', handsOnTablePose(), 47.5, 57.0, { weight: 0.5 });
  b.look('grace', 'daniel', 47.0, 65);
  b.expr('grace', 'listening', 46, 57, { weight: 0.7 });
  t = b.say(L[7], 46.2, { noBody: true });
  b.custom(44, 60, (l, ctx) => ctx.actors.daniel.setBreathing(1.3, 0.4));
  // dawn: Grace comes back to his side; the upload completes
  b.walk('grace', [bedSit, { x: 0.9, z: -0.1 }, { x: -0.8, z: -0.3 }, beside], 57.4, 60.2, { faceAtEnd: beside.yaw });
  b.place('grace', beside, 60.2, 61.6);
  b.expr('daniel', 'tired', 54, 59.5, { weight: 0.6 });
  b.pose('daniel', leanToScreen, 59.2, 61.4, { fadeIn: 0.5 });
  t = b.say(L[8], 56.6, { hands: 'none', intensity: 0.3 });
  b.expr('daniel', 'bigSmile', 59.8, 65);
  b.expr('brian', 'bigSmile', 59.6, 65);
  b.expr('grace', 'cry', 60.5, 65, { weight: 0.45 });
  b.expr('grace', 'bigSmile', 60.5, 65, { weight: 0.8 });
  t = b.say(L[9], 61.0, { hands: 'none', intensity: 0.4 });
  // the hug
  b.place('daniel', standUp, 61.4, 65);
  b.walk('grace', [beside, graceHug], 61.6, 62.6, { faceAtEnd: Math.PI });
  b.place('grace', graceHug, 62.6, 65);
  b.pose('daniel', (l, tt) => hugPose(tt, 1), 62.0, 65, { fadeIn: 0.8 });
  b.pose('grace', (l, tt) => hugPose(tt, -1), 62.4, 65, { fadeIn: 0.8 });
  b.walk('brian', [besideRight, { x: 0.6, z: 0.0 }], 62.4, 63.4, { faceAtEnd: -Math.PI / 2 - 0.5 });
  b.place('brian', { x: 0.6, z: 0.0, yaw: -Math.PI / 2 - 0.5 }, 63.4, 65);
  b.pose('brian', sideHugPose('L'), 63.4, 65, { fadeIn: 0.7 });
  b.look('daniel', 'grace', 61.4, 65);
  b.look('grace', 'daniel', 61.6, 65);
  b.fadeOut(64.0, 1.0);

  // ---- camera ----
  b.shot(0, 5.4, { name: 'grace enters with lamp', pos: v3(-1.7, 1.5, 1.3), posEnd: v3(-1.5, 1.45, 0.9), look: between(G, D, 0.5, -0.12), fov: 44, handheld: 0.2 });
  b.shot(5.4, 11.4, { name: 'cu daniel crying', pos: offset(D, -0.3, 0.06, -0.74), look: offset(D, 0, -0.05, 0), fov: 28, handheld: 0.3 });
  b.shot(11.4, 20.4, { name: 'cu grace tender', pos: offset(G, 0.75, -0.02, -0.4), posEnd: offset(G, 0.68, -0.02, -0.36), look: offset(G, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(20.4, 24.6, { name: 'cu daniel nothing left', pos: offset(D, -0.3, 0.05, -0.72), look: offset(D, 0, -0.04, 0), fov: 28, handheld: 0.3 });
  b.shot(24.6, 31.8, { name: 'two shot phone handover from window', pos: v3(-0.4, 1.35, -1.72), posEnd: v3(-0.3, 1.3, -1.7), look: between(G, D, 0.5, -0.15), fov: 40, handheld: 0.25 });
  b.shot(31.8, 38.4, { name: 'cu daniel with phone', pos: offset(D, 0.5, 0.0, -0.75), posEnd: offset(D, 0.45, 0.02, -0.66), look: offset(D, 0, -0.04, 0), fov: 28, handheld: 0.3 });
  b.shot(38.4, 43.6, { name: 'brian returns', pos: v3(1.0, 1.5, -1.5), look: offset(B, 0, -0.2, 0), fov: 42, handheld: 0.25 });
  b.shot(43.6, 46.4, { name: 'two shot at desk', pos: v3(-1.3, 1.3, -0.4), look: between(D, B, 0.5, -0.1), fov: 40, handheld: 0.25 });
  b.shot(46.4, 49.4, { name: 'ecu hands typing', pos: v3(0.5, 1.02, -0.85), look: v3(0, 0.82, -1.3), fov: 34, handheld: 0.35 });
  b.shot(49.4, 52.0, { name: 'brian points at screen', pos: offset(B, -0.75, -0.05, 0.6), look: offset(B, 0, -0.05, 0), fov: 30, handheld: 0.3 });
  b.shot(52.0, 55.2, { name: 'dawn window, grace watching', pos: v3(1.4, 1.35, 1.0), posEnd: v3(1.2, 1.3, 0.8), look: v3(0, 1.3, -1.9), fov: 42, handheld: 0.2 });
  b.shot(55.2, 60.6, { name: 'cu daniel submitted', pos: offset(D, -0.3, 0.05, -0.75), posEnd: offset(D, -0.26, 0.05, -0.66), look: offset(D, 0, -0.04, 0), fov: 27, handheld: 0.3 });
  b.shot(60.6, 62.6, { name: 'cu grace promise kept', pos: offset(G, 0.7, 0.0, 0.45), look: offset(G, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(62.6, 65, { name: 'wide hug', pos: v3(-1.5, 1.5, 1.6), posEnd: v3(-1.3, 1.45, 1.4), look: v3(0.1, 1.2, -0.1), fov: 40, handheld: 0.2 });

  b.onEnter = (ctx) => {
    const e = ctx.env as BedroomEnvironment;
    e.setKerosene(true);
  };
  return { def: b.build(), lines: b.lines };
}

function leanToScreen(l: number, t: number) {
  return { joints: { spine: [0.2, 0, 0] as [number, number, number], neck: [0.1, 0, 0] as [number, number, number], upperArmL: [-0.5, 0.2, 0.2] as [number, number, number], forearmL: [-1.2, -0.2, 0] as [number, number, number], handL: [-0.3 + Math.max(0, Math.sin(t * 6)) * 0.2, 0, 0] as [number, number, number] } };
}
