/**
 * Deterministic film timeline.
 *
 * The whole film is a pure function of `time`. The timeline only advances
 * `time` by dt * speed while playing; every system (actors, camera, lighting,
 * subtitles, visemes) re-evaluates from the absolute time each frame, so pause,
 * resume, seek and scene jumps are always correct. One-shot events (sound
 * effects) fire when playback crosses their start time.
 */
import type * as THREE from 'three';
import type { EvalContext } from '../scenes/Direction';

export interface TimelineEvent {
  start: number;
  end: number;
  name?: string;
  /** Called every frame while start <= sceneTime < end. local = sceneTime - start. */
  apply?: (local: number, ctx: EvalContext) => void;
  /** Called once when playback crosses `start` (not when seeking). */
  fire?: (ctx: EvalContext) => void;
  /** Lower runs first. Base poses use 0, overlays 10, camera 100. */
  priority?: number;
}

export type EnvironmentId = 'home' | 'street' | 'market' | 'bedroom';

export interface SceneDef {
  id: string;
  title: string;
  duration: number;
  environment: EnvironmentId;
  /** Lighting preset name understood by the environment. */
  lighting: string;
  events: TimelineEvent[];
  /** Called when the scene becomes active (after a seek or natural progression). */
  onEnter?: (ctx: EvalContext) => void;
  /** scene-owned props (added to the 3D scene while the scene is active) */
  props?: THREE.Object3D[];
}

export interface SceneEntry {
  def: SceneDef;
  start: number;
  end: number;
  index: number;
}

export type TimelineListener = (ev: 'play' | 'pause' | 'seek' | 'tick' | 'scene' | 'speed' | 'end') => void;

export class AnimationTimeline {
  time = 0;
  playing = false;
  speed = 1;
  readonly scenes: SceneEntry[] = [];
  duration = 0;
  private listeners: TimelineListener[] = [];
  /** time at the previous evaluation (for one-shot firing) */
  lastTime = -1;
  loop = false;

  constructor(defs: SceneDef[]) {
    let t = 0;
    defs.forEach((def, i) => {
      this.scenes.push({ def, start: t, end: t + def.duration, index: i });
      def.events.sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10) || a.start - b.start);
      t += def.duration;
    });
    this.duration = t;
  }

  on(l: TimelineListener): () => void {
    this.listeners.push(l);
    return () => (this.listeners = this.listeners.filter((x) => x !== l));
  }
  private emit(ev: Parameters<TimelineListener>[0]) {
    for (const l of this.listeners) l(ev);
  }

  /** Advance by real seconds. Returns the amount of film time that passed. */
  update(dt: number): number {
    if (!this.playing) return 0;
    const step = Math.min(dt, 0.1) * this.speed;
    this.time += step;
    if (this.time >= this.duration) {
      if (this.loop) this.time = 0;
      else {
        this.time = this.duration - 0.0001;
        this.playing = false;
        this.emit('end');
      }
    }
    this.emit('tick');
    return step;
  }

  play(): void {
    if (this.time >= this.duration - 0.001) this.time = 0;
    this.playing = true;
    this.emit('play');
  }
  pause(): void {
    this.playing = false;
    this.emit('pause');
  }
  toggle(): void {
    this.playing ? this.pause() : this.play();
  }
  restart(): void {
    this.seek(0);
    this.play();
  }
  seek(t: number): void {
    this.time = Math.max(0, Math.min(this.duration - 0.0001, t));
    this.lastTime = this.time; // do not fire one-shots we jumped over
    this.emit('seek');
  }
  setSpeed(s: number): void {
    this.speed = Math.max(0.1, Math.min(4, s));
    this.emit('speed');
  }
  goToScene(index: number): void {
    const s = this.scenes[Math.max(0, Math.min(this.scenes.length - 1, index))];
    this.seek(s.start);
  }
  sceneAt(t = this.time): SceneEntry {
    for (const s of this.scenes) if (t < s.end) return s;
    return this.scenes[this.scenes.length - 1];
  }
}
