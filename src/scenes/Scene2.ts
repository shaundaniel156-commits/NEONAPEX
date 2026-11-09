/**
 * SCENE 2 - THE OPPORTUNITY (50 s). Kabalagala Road, afternoon.
 * Brian runs after Daniel with the competition poster on his phone. The prize is
 * everything Daniel dreams of - but the entry fee is fifty thousand shillings.
 */
import { SceneBuilder, yawTo } from './Direction';
import { SCREENPLAY } from '../story/Screenplay';
import { showPhonePose, holdPhonePose, handOnShoulderPose, explainPose, shrugPose } from '../animations/Gestures';
import { nodPose, shakeHeadPose } from '../animations/Talking';
import { surprisePose, straightenPose } from '../animations/EmotionalActions';
import { v3, overShoulder, offset, between } from '../camera/CinematicCamera';
import { makePhone } from './Props';

export function buildScene2() {
  const L = SCREENPLAY.scene2;
  const b = new SceneBuilder('s2', 'The Opportunity', 50, 'street', 'day');
  const D = () => b.actorEyes('daniel');
  const B = () => b.actorEyes('brian');
  const walkStart = { x: 4.9, z: 14 };
  const meet = { x: 4.75, z: 1.0, yaw: Math.PI };
  const brianStart = { x: 5.2, z: -12 };
  const brianMeet = { x: 4.95, z: -0.5, yaw: 0 };
  const phone = b.prop(makePhone('poster'));

  b.fadeIn(1.2).ambient('street').music('hopeful', 0, 50, 0.5);
  b.grade({ warmth: 0.1, saturation: 1.12, contrast: 1.06, vignette: 0.4 });
  b.sfx('boda', 2.5, { volume: 0.35 }).sfx('horn', 19.5, { volume: 0.25 }).sfx('boda', 43.5, { volume: 0.3 });

  // ---- blocking ----
  b.walk('daniel', [walkStart, { x: 4.9, z: 8 }, meet], 0.4, 11.0, { faceAtEnd: Math.PI });
  b.place('daniel', meet, 11.0, 50);
  b.expr('daniel', 'neutral', 0, 10);
  b.walk('brian', [brianStart, { x: 5.1, z: -6 }, brianMeet], 6.0, 10.8, { faceAtEnd: brianMeet.yaw, run: true });
  b.place('brian', brianMeet, 10.8, 50);
  b.look('daniel', 'brian', 9.4, 50);
  b.look('brian', 'daniel', 6.5, 50);
  // Brian catches his breath
  b.custom(10.8, 16, (l, ctx) => ctx.actors.brian.setBreathing(2.6 - l * 0.25, 0.9));

  let t = 0.6;
  t = b.say(L[0], t); // narrator
  b.say(L[1], 7.0, { hands: 'none', expr: 'bigSmile', noBody: true });
  // Daniel turns, surprised then amused
  b.pose('daniel', (l) => surprisePose(l), 9.6, 12.2, { weight: 0.6 });
  b.expr('daniel', 'surprised', 9.6, 11.8);
  b.expr('daniel', 'smile', 11.8, 15);
  t = b.say(L[2], 11.6, { hands: 'right', intensity: 0.8 });
  // Brian shows the phone
  b.hold('brian', phone, 'R', 13.8, 23.4, { x: 0.0, y: -0.06, z: -0.02, rx: -1.3, ry: 0.0 });
  b.pose('brian', showPhonePose('R'), 14.0, 23.6, { fadeIn: 0.6, fadeOut: 0.5 });
  b.look('daniel', () => b.actorHead('brian').clone().setY(1.25), 14.5, 23.5);
  b.expr('brian', 'bigSmile', 14, 23);
  t = b.say(L[3], 14.6, { hands: 'none', intensity: 0.9 });
  // Daniel takes the phone and reads
  b.hold('daniel', phone, 'L', 23.4, 45.5, { x: 0.0, y: -0.06, z: -0.02, rx: -1.2 });
  b.pose('daniel', holdPhonePose('L', 0.2), 23.2, 45.5, { fadeIn: 0.6, fadeOut: 0.6 });
  b.look('daniel', () => b.actorHead('daniel').clone().add(v3(0.1, -0.3, 0.35)), 23.5, 31.0);
  b.expr('daniel', 'bigSmile', 23.5, 29);
  t = b.say(L[4], 24.2, { hands: 'none', intensity: 0.7 });
  b.look('daniel', 'brian', 27.5, 29.5);
  b.pose('brian', (l) => nodPose(l, 2), 28.8, 30.2);
  t = b.say(L[5], 29.2, { hands: 'right', intensity: 0.6, expr: 'smile' });
  // the fee
  b.look('daniel', () => b.actorHead('daniel').clone().add(v3(0.1, -0.3, 0.35)), 31.0, 35.0);
  b.expr('daniel', 'worried', 31.5, 34.5);
  b.expr('daniel', 'disappointed', 34.5, 42.0);
  t = b.say(L[6], 32.0, { hands: 'none', intensity: 0.6 });
  b.look('daniel', 'brian', 35.0, 50);
  b.pose('daniel', (l) => shakeHeadPose(l, 1), 35.5, 36.6);
  // Brian: hand on shoulder
  b.pose('brian', handOnShoulderPose('R'), 37.2, 43.0, { fadeIn: 0.7, fadeOut: 0.6 });
  b.expr('brian', 'determined', 37, 43);
  t = b.say(L[7], 37.6, { hands: 'none', intensity: 0.5 });
  // Daniel: resolve
  b.pose('daniel', (l) => straightenPose(l), 42.0, 50, { fadeOut: 0 });
  b.expr('daniel', 'determined', 42.2, 50);
  t = b.say(L[8], 42.8, { hands: 'none', intensity: 0.5 });
  b.pose('daniel', (l) => nodPose(l, 1), 44.6, 45.8);
  // gives the phone back, they set off together
  b.hold('brian', phone, 'R', 45.5, 50, { x: 0.0, y: -0.06, z: -0.02, rx: -0.4 });
  b.expr('brian', 'bigSmile', 45.5, 50);
  b.pose('brian', (l, tt) => explainPose(tt, 0.4), 45.8, 50, { weight: 0.6 });
  b.pose('daniel', (l, tt) => shrugPose(tt), 46.5, 49, { weight: 0.35 });
  b.fadeOut(48.6, 1.4);

  // ---- camera ----
  b.shot(0, 6.0, { name: 'street establishing', pos: v3(-1.5, 3.6, 20), posEnd: v3(0.5, 2.6, 15), look: v3(5.0, 1.3, 2), lookEnd: v3(5.0, 1.3, 4), fov: 50, handheld: 0.15 });
  b.shot(6.0, 11.2, { name: 'tracking daniel, brian running behind', pos: offset(D, 0.9, 0.35, 1.9), look: offset(B, 0, -0.1, 0), fov: 36, handheld: 0.35 });
  b.shot(11.2, 14.6, { name: 'two shot side', pos: v3(2.3, 1.5, 0.4), posEnd: v3(2.6, 1.48, 0.3), look: between(D, B, 0.5, -0.1), fov: 38, handheld: 0.25 });
  b.shot(14.6, 19.0, { name: 'ots daniel -> brian with phone', pos: overShoulder(D, B, -1, 0.55, 0.12, 0.3), look: offset(B, 0, -0.03, 0), fov: 32, handheld: 0.3 });
  b.shot(19.0, 23.6, { name: 'phone insert', pos: overShoulder(D, () => b.actorHand('brian', 'R'), 1, 0.25, 0.3, 0.28), look: () => b.actorHand('brian', 'R').clone().add(v3(0, 0.03, 0)), fov: 30, handheld: 0.3 });
  b.shot(23.6, 29.2, { name: 'cu daniel reads', pos: offset(D, -0.55, 0.02, -0.8), look: offset(D, 0, -0.04, 0), fov: 28, handheld: 0.3 });
  b.shot(29.2, 32.0, { name: 'cu brian deadline', pos: offset(B, 0.5, 0.0, 0.85), look: offset(B, 0, -0.03, 0), fov: 28, handheld: 0.3 });
  b.shot(32.0, 37.4, { name: 'cu daniel fee', pos: offset(D, -0.6, 0.0, -0.75), posEnd: offset(D, -0.5, 0.0, -0.7), look: offset(D, 0, -0.04, 0), fov: 27, handheld: 0.3 });
  b.shot(37.4, 42.6, { name: 'two shot hand on shoulder', pos: v3(2.2, 1.45, 1.6), posEnd: v3(2.5, 1.45, 1.3), look: between(D, B, 0.5, -0.12), fov: 36, handheld: 0.25 });
  b.shot(42.6, 46.2, { name: 'cu daniel resolve push', pos: offset(D, -0.6, 0.02, -0.9), posEnd: offset(D, -0.5, 0.02, -0.72), look: offset(D, 0, -0.03, 0), fov: 27, handheld: 0.3 });
  b.shot(46.2, 50, { name: 'wide from across the road', pos: v3(-3.5, 2.0, -4), posEnd: v3(-3.0, 1.9, -2.5), look: v3(4.8, 1.2, 0.3), fov: 40, handheld: 0.15 });

  return { def: b.build(), lines: b.lines };
}
