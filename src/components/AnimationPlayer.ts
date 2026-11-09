/**
 * Application shell: creates the renderer, builds characters and environments,
 * wires the Director to the timeline and controls, and runs the frame loop.
 */
import * as THREE from 'three';
import { FilmRenderer } from '../core/Renderer';
import { CinematicCamera } from '../camera/CinematicCamera';
import { Actor } from '../scenes/Actor';
import { ActorName, ActorRegistry } from '../scenes/Direction';
import { createDaniel } from '../characters/Daniel';
import { createGrace } from '../characters/Grace';
import { createBrian } from '../characters/Brian';
import { Environment } from '../environments/Environment';
import { HomeEnvironment } from '../environments/Home';
import { KampalaStreetEnvironment } from '../environments/KampalaStreet';
import { MarketEnvironment } from '../environments/Market';
import { BedroomEnvironment } from '../environments/Bedroom';
import { AudioManager } from '../audio/AudioManager';
import { DialogueManager, DialogueLine } from '../dialogue/DialogueManager';
import { SubtitleManager } from '../subtitles/SubtitleManager';
import { Director } from '../scenes/Director';
import { Controls } from './Controls';
import { EnvironmentId, SceneDef } from '../timeline/AnimationTimeline';

export interface PlayerOptions {
  scenes: { def: SceneDef; lines: DialogueLine[] }[];
  dof?: boolean;
  bloom?: boolean;
  ssao?: boolean;
  shadows?: boolean;
  pixelRatio?: number;
  /** start paused at this time (useful for screenshots / tests) */
  startAt?: number;
  autoplay?: boolean;
}

export class AnimationPlayer {
  readonly scene = new THREE.Scene();
  readonly cinematic: CinematicCamera;
  readonly renderer: FilmRenderer;
  readonly actors: Record<ActorName, Actor>;
  readonly envs: Record<EnvironmentId, Environment>;
  readonly audio = new AudioManager();
  readonly dialogue: DialogueManager;
  readonly subtitles: SubtitleManager;
  readonly director: Director;
  readonly controls: Controls;
  private clock = new THREE.Clock();
  private canvas: HTMLCanvasElement;
  private running = false;
  private frameCount = 0;
  private fpsTime = 0;
  fps = 0;

  constructor(private container: HTMLElement, opts: PlayerOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'viewport';
    container.appendChild(this.canvas);
    this.cinematic = new CinematicCamera(16 / 9);
    this.renderer = new FilmRenderer(this.canvas, this.scene, this.cinematic.camera, { dof: opts.dof, bloom: opts.bloom, ssao: opts.ssao, shadows: opts.shadows, pixelRatio: opts.pixelRatio });

    const daniel = new Actor(createDaniel(), 1, 'daniel');
    const grace = new Actor(createGrace(), 2, 'grace');
    const brian = new Actor(createBrian(), 3, 'brian');
    this.actors = { daniel, grace, brian };
    ActorRegistry.actors = this.actors;

    // environments are built once and swapped in/out of the scene graph
    const needed = new Set(opts.scenes.map((s) => s.def.environment));
    const envs: Partial<Record<EnvironmentId, Environment>> = {};
    if (needed.has('home')) envs.home = new HomeEnvironment();
    if (needed.has('street')) envs.street = new KampalaStreetEnvironment();
    if (needed.has('market')) envs.market = new MarketEnvironment();
    if (needed.has('bedroom')) envs.bedroom = new BedroomEnvironment();
    this.envs = envs as Record<EnvironmentId, Environment>;

    this.dialogue = new DialogueManager(this.audio);
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    container.appendChild(overlay);
    this.subtitles = new SubtitleManager(overlay);

    this.director = new Director(
      { scene: this.scene, actors: this.actors, envs: this.envs, camera: this.cinematic, audio: this.audio, dialogue: this.dialogue, subtitles: this.subtitles, renderer: this.renderer },
      opts.scenes.map((s) => s.def),
      opts.scenes.map((s) => s.lines),
    );
    const tl = this.director.timeline;
    this.controls = new Controls(container, tl, {
      onVolume: (v) => {
        this.audio.setVolume(v);
        this.dialogue.setVolume(v);
      },
      onSubtitles: (v) => this.subtitles.setVisible(v),
      onFullscreen: () => this.toggleFullscreen(),
    });
    tl.on((ev) => {
      if (ev === 'play') this.audio.resume();
      if (ev === 'pause' || ev === 'end') {
        this.audio.suspend();
        this.dialogue.stop();
      }
      if (ev === 'seek') this.dialogue.stop();
    });

    window.addEventListener('resize', () => this.resize());
    this.resize();
    if (opts.startAt !== undefined) tl.seek(opts.startAt);
    this.director.evaluate(0);
    this.renderer.render();
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.cinematic.setAspect(w / h);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) this.container.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  /** Begin the render loop. Audio is initialised from the calling user gesture. */
  async start(autoplay = true): Promise<void> {
    await this.audio.init();
    if (this.running) {
      if (autoplay) this.director.timeline.play();
      return;
    }
    this.running = true;
    this.clock.start();
    if (autoplay) this.director.timeline.play();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.frame();
    };
    requestAnimationFrame(loop);
  }

  /** Advance one frame (public so tests can step deterministically). */
  frame(dt = this.clock.getDelta()): void {
    const tl = this.director.timeline;
    tl.update(dt);
    this.director.evaluate(dt);
    this.renderer.render();
    this.controls.update();
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount / this.fpsTime;
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }

  stop(): void {
    this.running = false;
  }
}
