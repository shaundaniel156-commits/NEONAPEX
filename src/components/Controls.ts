/**
 * Player controls: play/pause, restart, scrubber, timestamp, scene chips,
 * speed, volume, subtitles toggle, fullscreen. Auto-hides while playing.
 */
import { AnimationTimeline } from '../timeline/AnimationTimeline';

export interface ControlsCallbacks {
  onVolume: (v: number) => void;
  onSubtitles: (visible: boolean) => void;
  onFullscreen: () => void;
}

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  cc: '<svg viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm2 5.5v3a1.5 1.5 0 0 0 1.5 1.5H10v-1.5H8v-3h2V9H7.5A1.5 1.5 0 0 0 6 10.5zm7 0v3a1.5 1.5 0 0 0 1.5 1.5H17v-1.5h-2v-3h2V9h-2.5a1.5 1.5 0 0 0-1.5 1.5z"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
};

export class Controls {
  readonly el: HTMLDivElement;
  private playBtn: HTMLButtonElement;
  private scrub: HTMLInputElement;
  private timeEl: HTMLSpanElement;
  private sceneChips: HTMLButtonElement[] = [];
  private sceneTitle: HTMLDivElement;
  private hideTimer = 0;
  private scrubbing = false;
  private wasPlaying = false;

  constructor(container: HTMLElement, private tl: AnimationTimeline, cb: ControlsCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'controls show';
    this.el.innerHTML = `
      <div class="scene-title"></div>
      <div class="scrub-row"><input type="range" class="scrub" min="0" max="${tl.duration}" step="0.05" value="0"></div>
      <div class="row">
        <button class="btn play" title="Play / Pause (space)">${ICONS.play}</button>
        <button class="btn restart" title="Restart">${ICONS.restart}</button>
        <span class="time">0:00 / ${fmt(tl.duration)}</span>
        <div class="scenes"></div>
        <div class="spacer"></div>
        <label class="speed">Speed <select>
          <option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>
        </select></label>
        <label class="volume" title="Volume">${ICONS.vol}<input type="range" min="0" max="1" step="0.01" value="0.9"></label>
        <button class="btn cc active" title="Subtitles">${ICONS.cc}</button>
        <button class="btn full" title="Fullscreen (f)">${ICONS.full}</button>
      </div>`;
    container.appendChild(this.el);
    this.playBtn = this.el.querySelector('.play')!;
    this.scrub = this.el.querySelector('.scrub')!;
    this.timeEl = this.el.querySelector('.time')!;
    this.sceneTitle = this.el.querySelector('.scene-title')!;
    const scenes = this.el.querySelector('.scenes')!;
    tl.scenes.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = `${i + 1}`;
      b.title = `Scene ${i + 1}: ${s.def.title}`;
      b.addEventListener('click', () => tl.goToScene(i));
      scenes.appendChild(b);
      this.sceneChips.push(b);
    });

    this.playBtn.addEventListener('click', () => tl.toggle());
    this.el.querySelector('.restart')!.addEventListener('click', () => tl.restart());
    this.scrub.addEventListener('input', () => {
      if (!this.scrubbing) {
        this.scrubbing = true;
        this.wasPlaying = tl.playing;
        tl.pause();
      }
      tl.seek(parseFloat(this.scrub.value));
    });
    const endScrub = () => {
      if (!this.scrubbing) return;
      this.scrubbing = false;
      if (this.wasPlaying) tl.play();
    };
    this.scrub.addEventListener('change', endScrub);
    this.scrub.addEventListener('pointerup', endScrub);
    (this.el.querySelector('.speed select') as HTMLSelectElement).addEventListener('change', (e) => tl.setSpeed(parseFloat((e.target as HTMLSelectElement).value)));
    (this.el.querySelector('.volume input') as HTMLInputElement).addEventListener('input', (e) => cb.onVolume(parseFloat((e.target as HTMLInputElement).value)));
    const ccBtn = this.el.querySelector('.cc') as HTMLButtonElement;
    ccBtn.addEventListener('click', () => {
      const on = !ccBtn.classList.contains('active');
      ccBtn.classList.toggle('active', on);
      cb.onSubtitles(on);
    });
    this.el.querySelector('.full')!.addEventListener('click', cb.onFullscreen);

    tl.on((ev) => {
      if (ev === 'play' || ev === 'pause' || ev === 'end') this.playBtn.innerHTML = tl.playing ? ICONS.pause : ICONS.play;
      if (ev === 'play') this.scheduleHide();
      if (ev === 'pause' || ev === 'end') this.show(false);
    });
    container.addEventListener('pointermove', () => this.show(true));
    this.el.addEventListener('pointermove', (e) => e.stopPropagation());
    this.el.addEventListener('pointermove', () => this.show(false));
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); tl.toggle(); }
      else if (e.code === 'ArrowRight') tl.seek(tl.time + (e.shiftKey ? 10 : 2));
      else if (e.code === 'ArrowLeft') tl.seek(tl.time - (e.shiftKey ? 10 : 2));
      else if (e.key === 'f') cb.onFullscreen();
      else if (e.key >= '1' && e.key <= '9') tl.goToScene(parseInt(e.key) - 1);
      this.show(true);
    });
  }

  private show(autoHide: boolean): void {
    this.el.classList.add('show');
    document.body.classList.remove('hide-cursor');
    if (autoHide) this.scheduleHide();
    else window.clearTimeout(this.hideTimer);
  }
  private scheduleHide(): void {
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      if (this.tl.playing) {
        this.el.classList.remove('show');
        document.body.classList.add('hide-cursor');
      }
    }, 2600);
  }

  update(): void {
    const tl = this.tl;
    if (!this.scrubbing) this.scrub.value = String(tl.time);
    this.timeEl.textContent = `${fmt(tl.time)} / ${fmt(tl.duration)}`;
    const s = tl.sceneAt();
    this.sceneChips.forEach((c, i) => c.classList.toggle('active', i === s.index));
    const title = `Scene ${s.index + 1} · ${s.def.title}`;
    if (this.sceneTitle.textContent !== title) this.sceneTitle.textContent = title;
    this.scrub.style.setProperty('--p', `${(tl.time / tl.duration) * 100}%`);
  }
}
