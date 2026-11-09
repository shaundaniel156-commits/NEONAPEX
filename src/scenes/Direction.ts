/**
 * Scene scripting DSL.
 *
 * Scene files (Scene1..Scene6) use a SceneBuilder to declare, in seconds from the
 * start of the scene, where actors stand, how they move, what they say, where
 * the camera is and what the audio does. The builder turns each call into
 * deterministic TimelineEvents evaluated by the Director.
 */
import * as THREE from 'three';
import { Actor } from './Actor';
import { Pose } from '../characters/CharacterRig';
import { ExpressionName, expressionState, FaceState, sampleVisemes, visemesForText } from '../characters/FacialAnimation';
import { sitIdle } from '../animations/Idle';
import { locomotionPose, strideLength } from '../animations/Walking';
import { talkingPose, listeningPose, TalkOptions } from '../animations/Talking';
import { CinematicCamera, ShotSpec } from '../camera/CinematicCamera';
import { Environment, Spot } from '../environments/Environment';
import { AudioManager, AmbientName, MusicMood, SfxName } from '../audio/AudioManager';
import { DialogueManager, DialogueLine, Speaker } from '../dialogue/DialogueManager';
import { SubtitleManager } from '../subtitles/SubtitleManager';
import { Grade } from '../core/Renderer';
import { EnvironmentId, SceneDef, TimelineEvent } from '../timeline/AnimationTimeline';
import { Ease, EaseFn, envelope, smoothstep, lerp, clamp01 } from '../core/MathUtils';
import { Line } from '../story/Screenplay';

export type ActorName = 'daniel' | 'grace' | 'brian';

export interface EvalContext {
  time: number;
  sceneTime: number;
  dt: number;
  playing: boolean;
  actors: Record<ActorName, Actor>;
  camera: CinematicCamera;
  env: Environment;
  envs: Record<EnvironmentId, Environment>;
  scene: THREE.Scene;
  audio: AudioManager;
  dialogue: DialogueManager;
  subtitles: SubtitleManager;
  grade: Grade;
  fade: number;
  /** scratch data scenes can use (e.g. laptop progress) */
  data: Record<string, unknown>;
}

export type PoseClip = Pose | ((local: number, t: number, ctx: EvalContext) => Pose);
export type LookTarget = ActorName | [number, number, number] | (() => THREE.Vector3) | 'camera';
export type PointLike = Spot | { x: number; z: number; yaw?: number };

export interface LayerOpts {
  fadeIn?: number;
  fadeOut?: number;
  weight?: number;
}

export const estimateDuration = (text: string): number => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1.3, words * 0.42 + 0.55);
};

/** Lets scene scripts reference actors before the player has created them. */
export const ActorRegistry = {
  actors: null as Record<ActorName, Actor> | null,
  get(name: ActorName): Actor {
    if (!this.actors) throw new Error('Actors not registered yet');
    return this.actors[name];
  },
};

export const EnvRegistry = { current: null as Environment | null };

export class SceneBuilder {
  readonly events: TimelineEvent[] = [];
  readonly lines: DialogueLine[] = [];
  readonly props: THREE.Object3D[] = [];
  private lineCount = 0;
  onEnter?: (ctx: EvalContext) => void;

  constructor(
    readonly id: string,
    readonly title: string,
    readonly duration: number,
    readonly environment: EnvironmentId,
    readonly lighting: string,
  ) {}

  /* ------------------------------------------------------------ actors -- */

  /** Stand at a spot for [start, end). */
  place(actor: ActorName, spot: PointLike, start = 0, end = this.duration): this {
    this.events.push({
      start, end, priority: 0, name: `place ${actor}`,
      apply: (_l, ctx) => ctx.actors[actor].place(spot.x, 0, spot.z, spot.yaw ?? 0),
    });
    return this;
  }

  /** Turn on the spot from one facing to another (shortest arc), standing. */
  turn(actor: ActorName, spot: { x: number; z: number }, fromYaw: number, toYaw: number, start: number, end: number): this {
    let d = toYaw - fromYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.events.push({
      start, end, priority: 1, name: `turn ${actor}`,
      apply: (l, ctx) => {
        const k = smoothstep(0, end - start, l);
        const a = ctx.actors[actor];
        a.place(spot.x, 0, spot.z, fromYaw + d * k);
        // small weight shift while turning
        a.addPose({ joints: { hips: [0, -d * 0.15 * Math.sin(k * Math.PI), 0], spine: [0, d * 0.1 * Math.sin(k * Math.PI), 0] } }, 1);
      },
    });
    return this;
  }

  /** Sit on a chair at a spot. */
  sit(actor: ActorName, spot: PointLike, start = 0, end = this.duration, seatHeight = 0.45, opts: LayerOpts = {}): this {
    this.events.push({
      start, end, priority: 1, name: `sit ${actor}`,
      apply: (l, ctx) => {
        const a = ctx.actors[actor];
        a.place(spot.x, 0, spot.z, spot.yaw ?? 0);
        const drop = a.char.dims.hipY - (seatHeight + 0.03);
        const w = envelope(l, end - start, opts.fadeIn ?? 0.6, opts.fadeOut ?? 0.6) * (opts.weight ?? 1);
        a.setBase(sitIdle(ctx.time, drop, a.seed), Math.max(w, 0.001));
      },
    });
    return this;
  }

  /**
   * Walk (or run) from A to B between start and end along optional waypoints.
   * Facing follows the direction of travel; the gait phase is derived from the distance.
   */
  walk(actor: ActorName, path: { x: number; z: number }[], start: number, end: number, opts: { run?: boolean; faceAtEnd?: number; ease?: EaseFn; arrive?: number } = {}): this {
    const pts = path.map((p) => new THREE.Vector3(p.x, 0, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
    const length = curve.getLength();
    const dur = end - start;
    const speed = length / Math.max(0.01, dur);
    const ease = opts.ease ?? ((t: number) => t);
    const pos = new THREE.Vector3();
    const tan = new THREE.Vector3();
    this.events.push({
      start, end, priority: 1, name: `walk ${actor}`,
      apply: (l, ctx) => {
        const a = ctx.actors[actor];
        const k = clamp01(ease(l / dur));
        curve.getPointAt(k, pos);
        curve.getTangentAt(Math.min(0.999, Math.max(0.001, k)), tan);
        let yaw = Math.atan2(tan.x, tan.z);
        const arrive = opts.arrive ?? 0.5;
        if (opts.faceAtEnd !== undefined && l > dur - arrive) {
          const kk = smoothstep(dur - arrive, dur, l);
          // shortest-arc blend of yaw
          let d = opts.faceAtEnd - yaw;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          yaw += d * kk;
        }
        a.place(pos.x, 0, pos.z, yaw);
        const dist = k * length;
        const phase = dist / strideLength(speed, a.char.dims.height);
        const w = envelope(l, dur, 0.35, 0.45);
        a.setBase(locomotionPose(phase, speed), Math.max(w, 0.001));
        // footsteps
        if (ctx.playing && l > 0.1) {
          const stepPhase = (phase * 2) % 1;
          const prevStep = (((dist - speed * ctx.dt) / strideLength(speed, a.char.dims.height)) * 2) % 1;
          if (stepPhase < prevStep) ctx.audio.play('footstep', { volume: 0.25 + 0.3 * Math.min(1, speed / 2), pitch: 0.9 + a.seed * 0.1 });
        }
      },
    });
    return this;
  }

  /** Overlay a pose clip. Partial poses only affect the joints they define. */
  pose(actor: ActorName, clip: PoseClip, start: number, end: number, opts: LayerOpts = {}): this {
    this.events.push({
      start, end, priority: 10, name: `pose ${actor}`,
      apply: (l, ctx) => {
        const p = typeof clip === 'function' ? clip(l, ctx.time, ctx) : clip;
        const w = envelope(l, end - start, opts.fadeIn ?? 0.45, opts.fadeOut ?? 0.45) * (opts.weight ?? 1);
        ctx.actors[actor].addPose(p, w);
      },
    });
    return this;
  }

  /** Replace the base (idle) pose with a clip, e.g. a custom sitting pose. */
  base(actor: ActorName, clip: PoseClip, start: number, end: number, opts: LayerOpts = {}): this {
    this.events.push({
      start, end, priority: 2, name: `base ${actor}`,
      apply: (l, ctx) => {
        const p = typeof clip === 'function' ? clip(l, ctx.time, ctx) : clip;
        const w = envelope(l, end - start, opts.fadeIn ?? 0.6, opts.fadeOut ?? 0.6) * (opts.weight ?? 1);
        ctx.actors[actor].setBase(p, Math.max(w, 0.001));
      },
    });
    return this;
  }

  /** Facial expression preset over an interval. */
  expr(actor: ActorName, name: ExpressionName, start: number, end: number, opts: LayerOpts = {}): this {
    const state = expressionState(name);
    this.events.push({
      start, end, priority: 11, name: `expr ${actor} ${name}`,
      apply: (l, ctx) => {
        const w = envelope(l, end - start, opts.fadeIn ?? 0.5, opts.fadeOut ?? 0.5) * (opts.weight ?? 1);
        ctx.actors[actor].addFace(state, w);
      },
    });
    return this;
  }

  /** Custom face state function. */
  face(actor: ActorName, fn: (local: number, t: number) => FaceState, start: number, end: number, opts: LayerOpts = {}): this {
    this.events.push({
      start, end, priority: 11,
      apply: (l, ctx) => {
        const w = envelope(l, end - start, opts.fadeIn ?? 0.5, opts.fadeOut ?? 0.5) * (opts.weight ?? 1);
        ctx.actors[actor].addFace(fn(l, ctx.time), w);
      },
    });
    return this;
  }

  /** Look at another actor / a point / the camera. */
  look(actor: ActorName, target: LookTarget, start: number, end: number, opts: LayerOpts = {}): this {
    const v = new THREE.Vector3();
    this.events.push({
      start, end, priority: 12, name: `look ${actor}`,
      apply: (l, ctx) => {
        const w = envelope(l, end - start, opts.fadeIn ?? 0.6, opts.fadeOut ?? 0.6) * (opts.weight ?? 1);
        const a = ctx.actors[actor];
        if (target === 'camera') v.copy(ctx.camera.state.pos);
        else if (typeof target === 'string') ctx.actors[target].eyePoint(v);
        else if (typeof target === 'function') v.copy(target());
        else v.set(target[0], target[1], target[2]);
        a.addLook(v, w);
      },
    });
    return this;
  }

  /** Listening body language while someone else talks. */
  listen(actor: ActorName, start: number, end: number, weight = 1): this {
    this.events.push({
      start, end, priority: 10,
      apply: (l, ctx) => {
        const a = ctx.actors[actor];
        a.addPose(listeningPose(ctx.time, a.seed), envelope(l, end - start, 0.5, 0.5) * weight);
      },
    });
    return this;
  }

  /* ---------------------------------------------------------- dialogue -- */

  /**
   * A line of dialogue. Creates the subtitle/speech entry, lip-sync visemes and
   * conversational body language. Returns the time the line ends (+ a short gap).
   */
  say(
    line: Line | Speaker,
    textOrStart: string | number,
    startOrOpts?: number | { dur?: number; hands?: TalkOptions['hands']; intensity?: number; expr?: ExpressionName; gap?: number; noBody?: boolean },
    optsMaybe: { dur?: number; hands?: TalkOptions['hands']; intensity?: number; expr?: ExpressionName; gap?: number; noBody?: boolean } = {},
  ): number {
    // overloads: say(line, start, opts) | say(speaker, text, start, opts)
    let speaker: Speaker, text: string, start: number, opts: typeof optsMaybe;
    if (typeof line === 'object') {
      speaker = line.speaker;
      text = line.text;
      start = textOrStart as number;
      opts = (startOrOpts as typeof optsMaybe) ?? {};
    } else {
      speaker = line;
      text = textOrStart as string;
      start = startOrOpts as number;
      opts = optsMaybe;
    }
    return this.sayImpl(speaker, text, start, opts);
  }

  private sayImpl(
    speaker: Speaker,
    text: string,
    start: number,
    opts: { dur?: number; hands?: TalkOptions['hands']; intensity?: number; expr?: ExpressionName; gap?: number; noBody?: boolean } = {},
  ): number {
    const dur = opts.dur ?? estimateDuration(text);
    const id = `${this.id}_${String(this.lineCount++).padStart(2, '0')}`;
    this.lines.push({ id, speaker, text, start, end: start + dur });
    if (speaker !== 'narrator') {
      const actor = speaker.toLowerCase() as ActorName;
      const cues = visemesForText(text, dur);
      this.events.push({
        start, end: start + dur, priority: 15, name: `say ${speaker}`,
        apply: (l, ctx) => {
          const a = ctx.actors[actor];
          a.setViseme(sampleVisemes(cues, l), 1);
          if (!opts.noBody) {
            const w = envelope(l, dur, 0.4, 0.5);
            a.addPose(talkingPose(ctx.time, a.seed, { hands: opts.hands ?? 'none', intensity: opts.intensity ?? 0.7 }), w * 0.9);
          }
        },
      });
      if (opts.expr) this.expr(actor, opts.expr, start - 0.2, start + dur + 0.4);
    }
    return start + dur + (opts.gap ?? 0.35);
  }

  /* ------------------------------------------------------------- props -- */

  /** Register a prop object owned by this scene (added to the 3D scene while the scene plays, hidden by default). */
  prop<T extends THREE.Object3D>(obj: T): T {
    obj.visible = false;
    this.props.push(obj);
    return obj;
  }
  /** Show a prop at a fixed world transform for [start, end). */
  showProp(obj: THREE.Object3D, at: { x: number; y: number; z: number; rx?: number; ry?: number; rz?: number }, start: number, end = this.duration): this {
    this.events.push({
      start, end, priority: 3, name: 'prop',
      apply: (_l, ctx) => {
        if (obj.parent !== ctx.scene) ctx.scene.add(obj);
        obj.visible = true;
        obj.position.set(at.x, at.y, at.z);
        obj.rotation.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0);
      },
    });
    return this;
  }
  /** Put a prop into an actor's hand for [start, end). Offsets are in hand space (fingers point -Y, palm faces -Z). */
  hold(actor: ActorName, obj: THREE.Object3D, side: 'L' | 'R', start: number, end = this.duration, at: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number } = {}): this {
    this.events.push({
      start, end, priority: 30, name: `hold ${actor}`,
      apply: (_l, ctx) => {
        const hand = ctx.actors[actor].char.rig.joints[side === 'L' ? 'handL' : 'handR'];
        if (obj.parent !== hand) hand.add(obj);
        obj.visible = true;
        obj.position.set(at.x ?? 0, at.y ?? -0.05, at.z ?? -0.03);
        obj.rotation.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0);
      },
    });
    return this;
  }
  /** Hide all props every frame first (priority 2); show/hold events re-enable the ones in use. */
  private propsReset(): void {
    this.events.push({ start: 0, end: this.duration, priority: 2, apply: () => this.props.forEach((p) => (p.visible = false)) });
  }

  /* ------------------------------------------------------------ camera -- */

  shot(start: number, end: number, spec: ShotSpec): this {
    this.events.push({
      start, end, priority: 100, name: spec.name ?? 'shot',
      apply: (l, ctx) => ctx.camera.evaluate(spec, l, end - start, ctx.time),
    });
    return this;
  }

  /* ------------------------------------------------------------- audio -- */

  sfx(name: SfxName, at: number, opts: { volume?: number; pitch?: number } = {}): this {
    this.events.push({ start: at, end: at + 0.01, priority: 50, fire: (ctx) => ctx.audio.play(name, opts) });
    return this;
  }
  ambient(name: AmbientName | null, start = 0, end = this.duration): this {
    this.events.push({ start, end, priority: 50, apply: (_l, ctx) => ctx.audio.requestAmbient(name) });
    return this;
  }
  music(mood: MusicMood | null, start = 0, end = this.duration, volume = 1): this {
    this.events.push({ start, end, priority: 50, apply: (_l, ctx) => ctx.audio.requestMusic(mood, volume) });
    return this;
  }

  /* ------------------------------------------------------------- look --- */

  grade(partial: Partial<Grade>, start = 0, end = this.duration, fadeIn = 1): this {
    this.events.push({
      start, end, priority: 60,
      apply: (l, ctx) => {
        const k = smoothstep(0, fadeIn, l);
        const g = ctx.grade;
        if (partial.exposure !== undefined) g.exposure = lerp(g.exposure, partial.exposure, k);
        if (partial.saturation !== undefined) g.saturation = lerp(g.saturation, partial.saturation, k);
        if (partial.contrast !== undefined) g.contrast = lerp(g.contrast, partial.contrast, k);
        if (partial.warmth !== undefined) g.warmth = lerp(g.warmth, partial.warmth, k);
        if (partial.vignette !== undefined) g.vignette = lerp(g.vignette, partial.vignette, k);
        if (partial.lift !== undefined) g.lift = lerp(g.lift, partial.lift, k);
        if (partial.tint !== undefined) g.tint.lerp(partial.tint, k);
      },
    });
    return this;
  }
  fadeIn(dur = 1.2, at = 0): this {
    this.events.push({ start: at, end: at + dur, priority: 61, apply: (l, ctx) => (ctx.fade = Math.max(ctx.fade, 1 - Ease.outQuad(l / dur))) });
    return this;
  }
  fadeOut(at: number, dur = 1.2): this {
    this.events.push({ start: at, end: at + dur + 0.01, priority: 61, apply: (l, ctx) => (ctx.fade = Math.max(ctx.fade, Ease.inQuad(Math.min(1, l / dur)))) });
    return this;
  }
  /** Lighting preset switch mid-scene. */
  lightingPreset(name: string, at: number): this {
    this.events.push({ start: at, end: this.duration, priority: 5, apply: (_l, ctx) => ctx.env.applyPresetIfChanged(name, ctx.scene) });
    return this;
  }

  custom(start: number, end: number, fn: (local: number, ctx: EvalContext) => void, priority = 20): this {
    this.events.push({ start, end, priority, apply: fn });
    return this;
  }
  once(at: number, fn: (ctx: EvalContext) => void): this {
    this.events.push({ start: at, end: at + 0.01, priority: 50, fire: fn });
    return this;
  }

  /** Camera-target helper: the eyes of an actor (resolved at evaluation time). */
  actorEyes(name: ActorName): THREE.Vector3 {
    return ActorRegistry.get(name).eyes();
  }
  actorChest(name: ActorName): THREE.Vector3 {
    return ActorRegistry.get(name).chest();
  }
  actorHead(name: ActorName): THREE.Vector3 {
    return ActorRegistry.get(name).head();
  }
  actorHand(name: ActorName, side: 'L' | 'R'): THREE.Vector3 {
    return ActorRegistry.get(name).handPoint(side);
  }
  actorYaw(name: ActorName): number {
    return ActorRegistry.get(name).yaw;
  }
  /** Typed access to the active environment inside callbacks. */
  envAs<T extends Environment>(): T {
    return EnvRegistry.current as T;
  }

  build(): SceneDef {
    this.propsReset();
    return { id: this.id, title: this.title, duration: this.duration, environment: this.environment, lighting: this.lighting, events: this.events, onEnter: this.onEnter, props: this.props };
  }
}

/** Yaw that makes a character at `from` face `to`. */
export const yawTo = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(to.x - from.x, to.z - from.z);
/** Point at head height of a spot. */
export const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
