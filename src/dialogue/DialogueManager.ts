/**
 * Dialogue tracks for Daniel, Grace, Brian and the Narrator.
 *
 * Playback priority per line:
 *   1. A recorded audio file listed in public/audio/manifest.json (imported, legally
 *      obtained or self-recorded dialogue) - played through the Web Audio dialogue bus.
 *   2. Otherwise the browser's Web Speech API as a temporary fallback.
 * Subtitles and lip-sync are driven from the timeline, not from the audio, so they
 * stay in sync whichever path is used.
 */
import { AudioManager } from '../audio/AudioManager';

export type Speaker = 'Daniel' | 'Grace' | 'Brian' | 'narrator';

export interface DialogueLine {
  id: string;
  speaker: Speaker;
  text: string;
  /** seconds, relative to scene start until the Director makes them absolute */
  start: number;
  end: number;
}

interface VoiceProfile {
  pitch: number;
  rate: number;
  prefer: RegExp[];
  gender: 'male' | 'female';
}

const PROFILES: Record<Speaker, VoiceProfile> = {
  Daniel: { pitch: 1.08, rate: 1.0, prefer: [/en-(GB|ZA|KE|NG|UG)/i, /en/i], gender: 'male' },
  Grace: { pitch: 0.92, rate: 0.92, prefer: [/en-(GB|ZA|KE|NG|UG)/i, /en/i], gender: 'female' },
  Brian: { pitch: 1.0, rate: 1.08, prefer: [/en-(GB|ZA|KE|NG|UG)/i, /en/i], gender: 'male' },
  narrator: { pitch: 0.82, rate: 0.9, prefer: [/en-GB/i, /en/i], gender: 'male' },
};

export class DialogueManager {
  readonly lines: DialogueLine[] = [];
  private current: DialogueLine | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private voiceFor = new Map<Speaker, SpeechSynthesisVoice | null>();
  enabled = true;
  speechFallback = true;
  private volume = 1;

  constructor(private audio: AudioManager) {
    if ('speechSynthesis' in window) {
      const load = () => {
        this.voices = speechSynthesis.getVoices();
        this.voiceFor.clear();
      };
      load();
      speechSynthesis.addEventListener('voiceschanged', load);
    }
  }

  setLines(lines: DialogueLine[]): void {
    this.lines.length = 0;
    this.lines.push(...lines);
    this.lines.sort((a, b) => a.start - b.start);
  }

  setVolume(v: number): void {
    this.volume = v;
  }

  lineAt(t: number): DialogueLine | null {
    for (const l of this.lines) if (t >= l.start && t < l.end) return l;
    return null;
  }

  private pickVoice(speaker: Speaker): SpeechSynthesisVoice | null {
    if (this.voiceFor.has(speaker)) return this.voiceFor.get(speaker)!;
    const p = PROFILES[speaker];
    let v: SpeechSynthesisVoice | undefined;
    const female = /female|woman|zira|susan|hazel|samantha|victoria|karen|moira|fiona|tessa|serena|kate|anna/i;
    const male = /male|man|david|george|daniel|james|oliver|alex|fred|rishi|arthur|aaron/i;
    for (const re of p.prefer) {
      const cands = this.voices.filter((x) => re.test(x.lang));
      v = cands.find((x) => (p.gender === 'female' ? female.test(x.name) : male.test(x.name))) ?? cands[0];
      if (v) break;
    }
    const chosen = v ?? null;
    this.voiceFor.set(speaker, chosen);
    return chosen;
  }

  /** Evaluate at film time t. Starts / stops playback as lines begin and end. */
  update(t: number, playing: boolean): void {
    const line = playing && this.enabled ? this.lineAt(t) : null;
    if (line !== this.current) {
      this.stopCurrent();
      this.current = line;
      // only start a line if we're near its start (not when seeking into the middle)
      if (line && t - line.start < 0.6) this.startLine(line, t - line.start);
    }
  }

  private stopCurrent(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* ignore */ }
      this.currentSource = null;
    }
    if ('speechSynthesis' in window && speechSynthesis.speaking) speechSynthesis.cancel();
  }

  private startLine(line: DialogueLine, offset: number): void {
    const file = this.audio.dialogueFile(line.id);
    if (file) {
      this.audio.loadBuffer(file).then((buf) => {
        if (!buf || this.current !== line) return;
        this.currentSource = this.audio.playBuffer(buf, 'dialogue', this.volume, offset);
      });
      return;
    }
    if (!this.speechFallback || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(line.text);
    const p = PROFILES[line.speaker];
    const voice = this.pickVoice(line.speaker);
    if (voice) u.voice = voice;
    u.pitch = p.pitch;
    u.rate = p.rate;
    u.volume = this.volume;
    speechSynthesis.speak(u);
  }

  stop(): void {
    this.stopCurrent();
    this.current = null;
  }
}
