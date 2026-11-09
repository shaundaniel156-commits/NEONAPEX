/**
 * MILESTONE TEST: 20 seconds of Daniel and Grace talking at home.
 * Verifies: human-looking characters, lip-sync, eye/head motion, gestures, cinematic camera.
 * Run with ?test=1
 */
import { SceneBuilder, yawTo } from './Direction';
import { handsOnTablePose, typingPose, handsOnHipsPose, handOnShoulderPose, explainPose } from '../animations/Gestures';
import { nodPose } from '../animations/Talking';
import { v3, overShoulder, offset, between } from '../camera/CinematicCamera';
import { HOME_SPOTS } from '../environments/HomeSpots';
import { Ease } from '../core/MathUtils';
import { DialogueLine } from '../dialogue/DialogueManager';
import { SceneDef } from '../timeline/AnimationTimeline';

export function buildTestScene(): { def: SceneDef; lines: DialogueLine[] } {
  const b = new SceneBuilder('test', 'Test: Daniel & Grace', 20, 'home', 'morning');
  const S = HOME_SPOTS;
  const graceStand = { x: -0.95, z: 1.05, yaw: yawTo({ x: -0.95, z: 1.05 }, S.danielChair) };

  b.ambient('home').music('warm', 0, 20, 0.6).fadeIn(1.0);
  // Daniel sits at the laptop the whole time
  b.sit('daniel', S.danielChair, 0, 20);
  b.pose('daniel', (l, t) => typingPose(t, 0.8), 0, 6.5, { fadeOut: 0.8 });
  b.pose('daniel', handsOnTablePose(), 6.5, 20, { fadeIn: 0.8 });
  b.expr('daniel', 'determined', 0, 5.5);
  b.look('daniel', [-1.0, 0.95, -0.2], 0, 5.8); // laptop screen
  // Grace walks in from the kitchen and stops across the table
  b.walk('grace', [S.kitchen, { x: 0.2, z: 1.5 }, graceStand], 0.3, 3.4, { faceAtEnd: graceStand.yaw, ease: Ease.inOutSine });
  b.place('grace', graceStand, 3.4, 20);
  b.look('grace', 'daniel', 0.5, 20);

  // dialogue
  let t = 2.6;
  t = b.say('Grace', 'Daniel, you have been on that computer since six o\'clock.', t, { hands: 'right', expr: 'worried' });
  b.look('daniel', 'grace', 5.6, 20);
  b.expr('daniel', 'smile', 5.8, 9.5);
  t = b.say('Daniel', "Mama, I'm almost done. Just one more function.", t, { hands: 'right', intensity: 0.9 });
  b.pose('daniel', nodPose, 9.2, 10.2);
  b.pose('grace', handsOnHipsPose(), 9.3, 13.2);
  t = b.say('Grace', 'One more function, one more hour. Eat something first.', t, { hands: 'none', expr: 'smile', intensity: 1 });
  b.expr('daniel', 'laugh', 13.0, 14.3);
  b.pose('daniel', (l, tt) => explainPose(tt, 0.7), 13.0, 16.2);
  t = b.say('Daniel', 'Okay, okay. I promise, after this.', t, { hands: 'none', expr: 'bigSmile' });
  b.walk('grace', [graceStand, { x: -0.35, z: 0.1 }, { x: -0.55, z: -0.5 }], 15.6, 17.4, { faceAtEnd: -Math.PI / 2 + 0.3 });
  b.place('grace', { x: -0.55, z: -0.5, yaw: -Math.PI / 2 + 0.3 }, 17.4, 20);
  b.pose('grace', handOnShoulderPose('R'), 17.2, 20, { fadeIn: 0.6 });
  b.look('daniel', 'grace', 16, 20);
  t = b.say('Grace', 'Your promises. I am holding you to every one of them.', 17.0, { hands: 'none', expr: 'proud' });
  b.expr('daniel', 'smile', 17.5, 20);

  // camera
  const D = () => b.actorEyes('daniel');
  const G = () => b.actorEyes('grace');
  b.shot(0, 4.2, { name: 'establishing', pos: v3(1.9, 1.75, -2.1), posEnd: v3(1.2, 1.6, -1.6), look: v3(-0.8, 1.0, 0.4), lookEnd: v3(-0.9, 1.1, 0.4), fov: 42, handheld: 0.2 });
  b.shot(4.2, 9.4, { name: 'OTS grace->daniel', pos: overShoulder(G, D, -1, 0.6, 0.1, 0.35), look: offset(D, 0, -0.02, 0), fov: 32, handheld: 0.25 });
  b.shot(9.4, 13.2, { name: 'CU grace', pos: offset(G, 0.35, 0.03, -0.95), look: offset(G, 0, -0.01, 0), fov: 26, handheld: 0.3 });
  b.shot(13.2, 16.6, { name: 'CU daniel', pos: offset(D, -0.45, 0.08, 1.05), look: offset(D, 0, -0.02, 0), fov: 28, handheld: 0.3 });
  b.shot(16.6, 20, { name: 'two shot push', pos: v3(0.9, 1.5, 0.9), posEnd: v3(0.55, 1.4, 0.55), look: between(D, G, 0.45, -0.05), fov: 34, handheld: 0.2 });
  b.fadeOut(19.2, 0.8);
  return { def: b.build(), lines: b.lines };
}
