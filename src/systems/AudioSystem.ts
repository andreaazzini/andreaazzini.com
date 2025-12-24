export type BgmId = 'overworld' | 'interior';
export type SfxId = 'step' | 'blip' | 'door';

import { parseNoteNotation, repeatNotation, type ParsedNote } from './musicNotation';

type Scheduled = {
  stop: () => void;
};

type BgmTrackDef = {
  /** Space-separated note tokens like "G4 C5 B4". Use "-" for rests. */
  notation: string;
  /** Subdivision: how many steps per beat. Example: 4 means 16th-notes at 4/4. */
  stepsPerBeat: number;
  osc: OscillatorType;
  /** Peak amplitude per note (pre-master). */
  amp: number;
  /** Portion of the token duration to sustain (0..1). */
  sustainRatio: number;
};

type BgmDefinition = {
  tempo: number;
  barsPerLoop: number;
  tracks: BgmTrackDef[];
};

const BGM_DEFS: Record<BgmId, BgmDefinition> = {
  overworld: {
    tempo: 118,
    barsPerLoop: 4,
    tracks: [
      {
        // 8 steps per bar (eighth notes): G2 x4, then E3 x2, then C3 x2
        notation: repeatNotation('C#2 C#2 C#2 C#2 D#2 D#2 C#2 C#2 C#2 C#2 D#2 D#2 D#2 C#2 B1 B1', 4),
        stepsPerBeat: 2,
        osc: 'triangle',
        amp: 0.05,
        sustainRatio: 0.8,
      },
      {
        // 16 steps per bar (sixteenth notes): G major-ish arpeggio motif (converted from the old degree pattern)
        notation: repeatNotation('F#4 E4 G#4 E4 F#4 E4 G#4 E4 F#4 E4 G#4 E4 F#4 E4 G#4 E4', 4),
        stepsPerBeat: 2,
        osc: 'triangle',
        amp: 0.05,
        sustainRatio: 0.85,
      },
      {
        // 16 steps per bar (sixteenth notes): G major-ish arpeggio motif (converted from the old degree pattern)
        notation: repeatNotation('G#6 G#6 A6 G#6 G#6 F#6 E6 E6 E6 C#6 C#6 C#6 B6 B6 A6 A6', 4),
        stepsPerBeat: 2,
        osc: 'triangle',
        amp: 0.05,
        sustainRatio: 0.85,
      },
    ],
  },
  interior: {
    tempo: 92,
    barsPerLoop: 4,
    tracks: [
      {
        // 8 steps per bar: E2 x4, then C#3 x2, then A2 x2
        notation: repeatNotation('E2 E2 E2 E2 C#3 C#3 A2 A2', 4),
        stepsPerBeat: 2,
        osc: 'square',
        amp: 0.08,
        sustainRatio: 0.8,
      },
      {
        // 16 steps per bar: E major-ish motif (converted from the old degree pattern)
        notation: repeatNotation('E3 G#3 A3 E3 A3 G#3 E3 G#3 A3 F#3 E3 A3 G#3 E3 G#3 A3', 4),
        stepsPerBeat: 4,
        osc: 'triangle',
        amp: 0.035,
        sustainRatio: 0.85,
      },
    ],
  },
};

class WebAudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private unlocked = false;
  private bgm: Scheduled | null = null;

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return;

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;
  }

  playBgm(id: BgmId): void {
    this.playBgmNotation(BGM_DEFS[id]);
  }

  /**
   * Plays looped BGM composed from simple note notation (e.g. "G4 C5 B4").
   * Use `stepsPerBeat` to control rhythmic subdivision per-track.
   */
  playBgmNotation(def: BgmDefinition): void {
    if (!this.ctx || !this.master) return;

    this.stopBgm(120);

    const ctx = this.ctx;
    const out = this.master;

    const beat = 60 / def.tempo;
    const bar = beat * 4; // 4/4
    const scheduleLookahead = 0.25;
    const scheduleAheadBars = 4;
    const loopLen = bar * def.barsPerLoop;

    let startTime = ctx.currentTime + 0.05;
    let nextCycleTime = startTime;
    let timer: number | null = null;
    let stopped = false;

    const bgmGain = ctx.createGain();
    bgmGain.gain.setValueAtTime(0, ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.18);
    bgmGain.connect(out);

    const scheduleTrack = (t0: number, track: BgmTrackDef) => {
      const notes = parseNoteNotation(track.notation, { strict: true });
      const stepSec = beat / track.stepsPerBeat;
      let stepIndex = 0;

      const totalSteps = this.sumSteps(notes);
      const expectedSteps = def.barsPerLoop * 4 * track.stepsPerBeat;
      // If a track isn't the expected length, we'll still schedule it, but the loop length is defined by `barsPerLoop`.
      // This keeps the runtime resilient while you experiment with notation strings.
      if (totalSteps !== expectedSteps) {
        // no-op; intentionally non-throwing
      }

      for (const n of notes) {
        const t = t0 + stepIndex * stepSec;
        if (n.freqHz != null) {
          const dur = Math.min(stepSec * n.steps * track.sustainRatio, stepSec * n.steps - 0.01);
          this.toneAt(t, n.freqHz, track.osc, track.amp, Math.max(0.01, dur), bgmGain);
        }
        stepIndex += n.steps;
      }
    };

    const scheduleCycle = (t0: number) => {
      for (const track of def.tracks) scheduleTrack(t0, track);
    };

    const tick = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      while (nextCycleTime < now + scheduleLookahead + scheduleAheadBars * bar) {
        scheduleCycle(nextCycleTime);
        nextCycleTime += loopLen;
      }
      timer = window.setTimeout(tick, 60);
    };

    scheduleCycle(startTime);
    nextCycleTime = startTime + loopLen;
    tick();

    this.bgm = {
      stop: () => {
        if (stopped) return;
        stopped = true;
        if (timer) window.clearTimeout(timer);
        const t = ctx.currentTime;
        bgmGain.gain.cancelScheduledValues(t);
        bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
        bgmGain.gain.linearRampToValueAtTime(0, t + 0.12);
        window.setTimeout(() => {
          try {
            bgmGain.disconnect();
          } catch {
            // ignore
          }
        }, 200);
      },
    };
  }

  stopBgm(fadeMs = 0): void {
    if (!this.bgm) return;
    if (fadeMs <= 0) {
      this.bgm.stop();
      this.bgm = null;
      return;
    }
    this.bgm.stop();
    this.bgm = null;
  }

  playSfx(id: SfxId): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const out = this.master;

    const t = ctx.currentTime + 0.001;
    const g = ctx.createGain();
    g.connect(out);

    if (id === 'step') {
      // Soft click
      this.toneAt(t, 140, 'square', 0.02, 0.02, g);
      this.toneAt(t + 0.01, 90, 'square', 0.015, 0.02, g);
    } else if (id === 'blip') {
      this.toneAt(t, 660, 'square', 0.04, 0.03, g);
    } else if (id === 'door') {
      // Little upward chirp
      this.toneAt(t, 330, 'square', 0.05, 0.04, g);
      this.toneAt(t + 0.05, 440, 'square', 0.06, 0.04, g);
      this.toneAt(t + 0.11, 660, 'square', 0.07, 0.04, g);
    }

    window.setTimeout(() => {
      try {
        g.disconnect();
      } catch {
        // ignore
      }
    }, 300);
  }

  private toneAt(
    start: number,
    freq: number,
    type: OscillatorType,
    amp: number,
    dur: number,
    destination: AudioNode,
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(amp, start + 0.005);
    gain.gain.linearRampToValueAtTime(0, start + dur);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(start);
    osc.stop(start + dur + 0.02);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private sumSteps(notes: ParsedNote[]): number {
    let s = 0;
    for (const n of notes) s += n.steps;
    return s;
  }
}

export const AudioSystem = new WebAudioSystem();


