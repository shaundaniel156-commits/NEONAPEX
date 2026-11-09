/**
 * The Director evaluates the film at the timeline's current time every frame:
 * switches environments, runs the active scene's events, finalises the actors,
 * evaluates the camera, then updates audio, dialogue, subtitles and post-processing.
 */
import * as THREE from 'three';
import { AnimationTimeline, EnvironmentId, SceneDef } from '../timeline/AnimationTimeline';
import { Actor } from './Actor';
import { ActorName, EvalContext, EnvRegistry } from './Direction';
import { CinematicCamera } from '../camera/CinematicCamera';
import { Environment } from '../environments/Environment';
import { AudioManager } from '../audio/AudioManager';
import { DialogueManager, DialogueLine } from '../dialogue/DialogueManager';
import { SubtitleManager } from '../subtitles/SubtitleManager';
import { DEFAULT_GRADE, FilmRenderer, Grade } from '../core/Renderer';

export interface DirectorDeps {
  scene: THREE.Scene;
  actors: Record<ActorName, Actor>;
  envs: Record<EnvironmentId, Environment>;
  camera: CinematicCamera;
  audio: AudioManager;
  dialogue: DialogueManager;
  subtitles: SubtitleManager;
  renderer: FilmRenderer;
}

export class Director {
  readonly timeline: AnimationTimeline;
  private currentEnv: Environment | null = null;
  private currentSceneIndex = -1;
  private ctx: EvalContext;
  readonly lines: DialogueLine[] = [];
  private grade: Grade = { ...DEFAULT_GRADE, tint: DEFAULT_GRADE.tint.clone() };

  constructor(private deps: DirectorDeps, scenes: SceneDef[], sceneLines: DialogueLine[][]) {
    this.timeline = new AnimationTimeline(scenes);
    // make dialogue times absolute
    this.timeline.scenes.forEach((entry, i) => {
      for (const l of sceneLines[i] ?? []) this.lines.push({ ...l, start: l.start + entry.start, end: l.end + entry.start });
    });
    deps.dialogue.setLines(this.lines);
    deps.subtitles.setLines(this.lines);
    this.ctx = {
      time: 0, sceneTime: 0, dt: 0, playing: false,
      actors: deps.actors, camera: deps.camera, env: null as unknown as Environment, envs: deps.envs, scene: deps.scene,
      audio: deps.audio, dialogue: deps.dialogue, subtitles: deps.subtitles, grade: this.grade, fade: 0, data: {},
    };
    for (const a of Object.values(deps.actors)) deps.scene.add(a.root);
  }

  private switchScene(index: number): void {
    const prev = this.timeline.scenes[this.currentSceneIndex];
    if (prev?.def.props) for (const p of prev.def.props) p.parent?.remove(p);
    const entry = this.timeline.scenes[index];
    if (entry.def.props) for (const p of entry.def.props) { p.visible = false; this.deps.scene.add(p); }
    const env = this.deps.envs[entry.def.environment];
    if (env !== this.currentEnv) {
      if (this.currentEnv) this.deps.scene.remove(this.currentEnv.group);
      this.deps.scene.add(env.group);
      this.currentEnv = env;
    }
    env.applyPreset(entry.def.lighting, this.deps.scene);
    this.ctx.env = env;
    EnvRegistry.current = env;
    this.ctx.data = {};
    this.currentSceneIndex = index;
    entry.def.onEnter?.(this.ctx);
  }

  /** Evaluate and render one frame. dt = real seconds since last frame. */
  evaluate(dt: number): void {
    const tl = this.timeline;
    const t = tl.time;
    const entry = tl.sceneAt(t);
    if (entry.index !== this.currentSceneIndex) this.switchScene(entry.index);
    const ctx = this.ctx;
    ctx.time = t;
    ctx.sceneTime = t - entry.start;
    ctx.dt = dt * tl.speed;
    ctx.playing = tl.playing;
    ctx.fade = 0;
    Object.assign(ctx.grade, DEFAULT_GRADE);
    ctx.grade.tint.copy(DEFAULT_GRADE.tint);

    for (const a of Object.values(this.deps.actors)) a.beginFrame();

    const st = ctx.sceneTime;
    const lastSt = tl.lastTime - entry.start;
    const events = entry.def.events;
    // pass 1: everything except camera (priority < 100)
    for (const ev of events) {
      if ((ev.priority ?? 10) >= 100) continue;
      if (ev.fire && tl.playing && lastSt < ev.start && st >= ev.start && st < ev.start + 1.0) ev.fire(ctx);
      if (ev.apply && st >= ev.start && st < ev.end) ev.apply(st - ev.start, ctx);
    }
    for (const a of Object.values(this.deps.actors)) a.finalize(t);
    // pass 2: camera (needs final actor positions)
    for (const ev of events) {
      if ((ev.priority ?? 10) < 100) continue;
      if (ev.apply && st >= ev.start && st < ev.end) ev.apply(st - ev.start, ctx);
    }
    this.currentEnv?.update(t, ctx.dt);
    this.deps.audio.update(tl.playing);
    this.deps.dialogue.update(t, tl.playing);
    this.deps.subtitles.update(t);
    this.deps.renderer.setFocus(ctx.camera.state.focus, ctx.camera.state.aperture);
    this.deps.renderer.setGrade(ctx.grade, ctx.fade, t);
    tl.lastTime = t;
  }

  get currentScene() {
    return this.timeline.scenes[Math.max(0, this.currentSceneIndex)];
  }
}
