/**
 * DEBUG: character line-up (?lineup=1). Daniel, Grace and Brian stand side by side,
 * wave, show their hands and cycle expressions while the camera slowly orbits.
 */
import { SceneBuilder } from './Direction';
import { wavePose, explainPose, pointPose } from '../animations/Gestures';
import { v3 } from '../camera/CinematicCamera';
import { DialogueLine } from '../dialogue/DialogueManager';
import { SceneDef } from '../timeline/AnimationTimeline';
import { ExpressionName } from '../characters/FacialAnimation';

export function buildLineupScene(): { def: SceneDef; lines: DialogueLine[] } {
  const b = new SceneBuilder('lineup', 'Character line-up', 30, 'home', 'morning');
  b.place('grace', { x: 0, z: -1.2, yaw: 0 });
  b.place('daniel', { x: 1.0, z: -1.2, yaw: 0 });
  b.place('brian', { x: -1.0, z: -1.2, yaw: 0 });
  b.look('daniel', 'camera', 0, 30);
  b.look('grace', 'camera', 0, 30);
  b.look('brian', 'camera', 0, 30);
  b.pose('daniel', (l, t) => wavePose(t, 'R'), 1, 5);
  b.pose('brian', (l, t) => explainPose(t, 1), 5, 10);
  b.pose('grace', pointPose('L', 0.2, 0.3), 10, 15);
  b.pose('daniel', (l, t) => explainPose(t, 0.8), 15, 22);
  const exprs: ExpressionName[] = ['smile', 'surprised', 'worried', 'cry', 'angry', 'bigSmile', 'determined', 'sad'];
  exprs.forEach((e, i) => {
    b.expr('daniel', e, i * 3.5, i * 3.5 + 3.4);
    b.expr('grace', exprs[(i + 2) % exprs.length], i * 3.5, i * 3.5 + 3.4);
    b.expr('brian', exprs[(i + 4) % exprs.length], i * 3.5, i * 3.5 + 3.4);
  });
  b.say('Brian', 'My name is Brian. Daniel, show them your hands.', 5, { hands: 'both' });
  b.say('Daniel', 'These are the hands that type the code, man.', 15.5, { hands: 'both' });
  b.shot(0, 10, { pos: v3(-2.4, 1.5, 1.6), posEnd: v3(2.4, 1.5, 1.6), look: v3(0, 1.3, -1.2), fov: 38, handheld: 0 });
  b.shot(10, 20, { pos: v3(0, 1.45, 0.9), posEnd: v3(0, 1.0, 0.4), look: v3(0, 1.3, -1.2), lookEnd: v3(0, 0.9, -1.2), fov: 45, handheld: 0 });
  b.shot(20, 30, { pos: v3(1.5, 1.2, -0.2), look: v3(1.0, 1.1, -1.2), fov: 35, handheld: 0 });
  return { def: b.build(), lines: b.lines };
}
