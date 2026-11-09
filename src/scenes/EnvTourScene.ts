/** DEBUG: slow camera tour of an environment (?env=street|market|bedroom|home). */
import { SceneBuilder } from './Direction';
import { v3 } from '../camera/CinematicCamera';
import { DialogueLine } from '../dialogue/DialogueManager';
import { EnvironmentId, SceneDef } from '../timeline/AnimationTimeline';

export function buildEnvTourScene(env: EnvironmentId): { def: SceneDef; lines: DialogueLine[] } {
  const lighting = { home: 'morning', street: 'day', market: 'afternoon', bedroom: 'nightRain' }[env];
  const b = new SceneBuilder(`tour-${env}`, `Tour: ${env}`, 30, env, lighting);
  if (env === 'street') {
    b.place('daniel', { x: 5.2, z: 2, yaw: Math.PI });
    b.shot(0, 10, { pos: v3(3, 2.2, 18), posEnd: v3(1, 1.8, 6), look: v3(0, 1.5, -10), fov: 50, handheld: 0 });
    b.shot(10, 20, { pos: v3(7, 1.6, 6), posEnd: v3(6.5, 1.6, 4), look: v3(5.2, 1.5, 1), fov: 40, handheld: 0 });
    b.shot(20, 30, { pos: v3(-6, 3, -10), look: v3(5, 1.5, 2), fov: 45, handheld: 0 });
  } else if (env === 'market') {
    b.place('grace', { x: 3.45, z: -1.5, yaw: -Math.PI / 2 });
    b.place('daniel', { x: 1.75, z: -1.3, yaw: Math.PI / 2 });
    b.shot(0, 10, { pos: v3(0.3, 2.0, 12), posEnd: v3(0.3, 1.7, 3), look: v3(0, 1.2, -4), fov: 48, handheld: 0 });
    b.shot(10, 20, { pos: v3(1.0, 1.5, 1.2), look: v3(3.2, 1.2, -1.5), fov: 40, handheld: 0 });
    b.shot(20, 30, { pos: v3(-3, 4, 6), look: v3(2.6, 0.9, -1.5), fov: 45, handheld: 0 });
  } else if (env === 'bedroom') {
    b.sit('daniel', { x: 0, z: -0.85, yaw: Math.PI }, 0, 30);
    b.shot(0, 10, { pos: v3(1.5, 1.6, 1.5), posEnd: v3(1.0, 1.5, 0.8), look: v3(0, 1.0, -1.5), fov: 48, handheld: 0 });
    b.shot(10, 20, { pos: v3(-1.2, 1.3, -0.6), look: v3(0.1, 1.1, -1.4), fov: 40, handheld: 0 });
    b.shot(20, 30, { pos: v3(0.4, 1.1, -0.2), look: v3(0, 1.5, -1.9), fov: 45, handheld: 0 });
  } else {
    b.place('daniel', { x: 0.6, z: -0.6, yaw: Math.PI });
    b.shot(0, 30, { pos: v3(2.5, 1.8, -2.2), posEnd: v3(-2.5, 1.6, -2.2), look: v3(0, 1.0, 0.5), fov: 50, handheld: 0 });
  }
  return { def: b.build(), lines: b.lines };
}
