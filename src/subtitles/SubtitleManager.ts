/**
 * Subtitle engine: synchronised, speaker-identified captions rendered as DOM,
 * bottom-centred over the viewport with smooth fade in/out and a toggle.
 */
import { DialogueLine } from '../dialogue/DialogueManager';

const COLORS: Record<string, string> = {
  Daniel: '#8fc1ff',
  Grace: '#ffc98f',
  Brian: '#ffe96b',
  narrator: '#d8d8d8',
};

export class SubtitleManager {
  private el: HTMLDivElement;
  private speakerEl: HTMLSpanElement;
  private textEl: HTMLSpanElement;
  private lines: DialogueLine[] = [];
  private shownId: string | null = null;
  visible = true;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'subtitle';
    this.speakerEl = document.createElement('span');
    this.speakerEl.className = 'subtitle-speaker';
    this.textEl = document.createElement('span');
    this.textEl.className = 'subtitle-text';
    this.el.append(this.speakerEl, this.textEl);
    container.appendChild(this.el);
  }

  setLines(lines: DialogueLine[]): void {
    this.lines = [...lines].sort((a, b) => a.start - b.start);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    if (!v) this.el.classList.remove('show');
    this.shownId = null;
  }

  update(t: number): void {
    if (!this.visible) return;
    let line: DialogueLine | null = null;
    for (const l of this.lines) {
      if (t >= l.start - 0.05 && t < l.end + 0.25) {
        line = l;
        break;
      }
    }
    const id = line?.id ?? null;
    if (id !== this.shownId) {
      this.shownId = id;
      if (line) {
        const isNarr = line.speaker === 'narrator';
        this.speakerEl.textContent = isNarr ? '' : line.speaker.toUpperCase();
        this.speakerEl.style.color = COLORS[line.speaker] ?? '#fff';
        this.textEl.textContent = line.text;
        this.textEl.classList.toggle('narration', isNarr);
        this.el.classList.add('show');
      } else this.el.classList.remove('show');
    }
  }
}
