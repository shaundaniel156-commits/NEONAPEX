/**
 * Physically based renderer with a cinematic post-processing chain:
 * render -> (SSAO optional) -> depth-of-field (bokeh) -> bloom -> colour grade -> output.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';

export interface Grade {
  exposure: number;
  saturation: number;
  contrast: number;
  /** warm (+) / cool (-) shift */
  warmth: number;
  vignette: number;
  tint: THREE.Color;
  lift: number;
}

export const DEFAULT_GRADE: Grade = { exposure: 1, saturation: 1.05, contrast: 1.05, warmth: 0.05, vignette: 0.45, tint: new THREE.Color(1, 1, 1), lift: 0 };

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    saturation: { value: 1 },
    contrast: { value: 1 },
    warmth: { value: 0 },
    vignette: { value: 0.4 },
    tint: { value: new THREE.Color(1, 1, 1) },
    lift: { value: 0 },
    grain: { value: 0.03 },
    time: { value: 0 },
    fade: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float saturation, contrast, warmth, vignette, lift, grain, time, fade; uniform vec3 tint;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      // warmth: push reds up / blues down or vice versa
      col.r *= 1.0 + warmth * 0.18; col.b *= 1.0 - warmth * 0.18;
      col *= tint;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.5) * contrast + 0.5 + lift;
      // vignette
      vec2 d = vUv - 0.5; float v = 1.0 - smoothstep(0.35, 0.95, length(d) * 1.35);
      col *= mix(1.0, v, vignette);
      // film grain
      col += (hash(vUv * 1000.0 + fract(time)) - 0.5) * grain;
      col = mix(col, vec3(0.0), fade);
      gl_FragColor = vec4(max(col, 0.0), c.a);
    }`,
};

export interface RendererOptions {
  dof?: boolean;
  bloom?: boolean;
  ssao?: boolean;
  shadows?: boolean;
  pixelRatio?: number;
}

export class FilmRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bokeh: BokehPass | null = null;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private ssao: SSAOPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  readonly options: Required<RendererOptions>;
  width = 1;
  height = 1;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera, opts: RendererOptions = {}) {
    this.options = { dof: opts.dof ?? true, bloom: opts.bloom ?? true, ssao: opts.ssao ?? false, shadows: opts.shadows ?? true, pixelRatio: opts.pixelRatio ?? Math.min(window.devicePixelRatio, 1.5) };
    this.scene = scene;
    this.camera = camera;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.options.pixelRatio);
    this.renderer.shadowMap.enabled = this.options.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    if (this.options.ssao) {
      this.ssao = new SSAOPass(scene, camera, 1, 1);
      this.ssao.kernelRadius = 0.25;
      this.ssao.minDistance = 0.001;
      this.ssao.maxDistance = 0.08;
      this.composer.addPass(this.ssao);
    }
    if (this.options.dof) {
      this.bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0.015, maxblur: 0.008 });
      this.composer.addPass(this.bokeh);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.6, 0.92);
    if (this.options.bloom) this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.ssao?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setFocus(distance: number, aperture: number): void {
    if (!this.bokeh) return;
    const u = this.bokeh.uniforms as Record<string, THREE.IUniform>;
    u.focus.value = distance;
    u.aperture.value = aperture * 0.5;
    u.maxblur.value = aperture > 0 ? 0.0085 : 0;
  }

  setGrade(g: Grade, fade: number, time: number): void {
    const u = this.grade.uniforms;
    u.saturation.value = g.saturation;
    u.contrast.value = g.contrast;
    u.warmth.value = g.warmth;
    u.vignette.value = g.vignette;
    u.lift.value = g.lift;
    u.tint.value.copy(g.tint);
    u.time.value = time;
    u.fade.value = fade;
    this.renderer.toneMappingExposure = g.exposure;
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
