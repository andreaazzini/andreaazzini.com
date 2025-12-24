export type ParsedNote = {
  /** Frequency in Hz. `null` represents a rest/silence. */
  freqHz: number | null;
  /** Number of "steps" this token occupies (used to support simple durations like `C4*2`). */
  steps: number;
};

export type ParseNotationOptions = {
  /** If true, invalid tokens throw. If false, invalid tokens are treated as rests. */
  strict?: boolean;
};

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Converts a note like "G4", "C#5", "Bb3" to a frequency in Hz using 12-TET.
 * Reference: A4 = 440Hz (MIDI note 69).
 */
export function noteNameToFreqHz(note: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note.trim());
  if (!m) throw new Error(`Invalid note: "${note}" (expected like "G4", "C#5", "Bb3")`);

  const letter = m[1]!.toUpperCase();
  const accidental = m[2] ?? '';
  const octave = Number(m[3]);
  if (!Number.isFinite(octave)) throw new Error(`Invalid octave in note "${note}"`);

  const base = NOTE_TO_SEMITONE[letter];
  if (base === undefined) throw new Error(`Invalid note letter in "${note}"`);

  const acc = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const semitone = base + acc;

  // MIDI note numbers: C4 = 60; formula midi = 12*(octave+1) + semitone
  const midi = 12 * (octave + 1) + semitone;
  return midiToFreqHz(midi);
}

export function midiToFreqHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Parses a space-separated sequence like:
 * - "G4 C5 B4"
 * - "G4*2 -*2 C5" (optional `*N` multiplier; `-` is a rest)
 */
export function parseNoteNotation(input: string, opts: ParseNotationOptions = {}): ParsedNote[] {
  const strict = opts.strict ?? true;
  const raw = input
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const out: ParsedNote[] = [];
  for (const token of raw) {
    const m = /^(.+?)(?:\*(\d+))?$/.exec(token);
    const head = (m?.[1] ?? token).trim();
    const steps = Math.max(1, Number(m?.[2] ?? 1));
    if (!Number.isFinite(steps) || steps < 1) {
      if (strict) throw new Error(`Invalid duration multiplier in token "${token}"`);
      out.push({ freqHz: null, steps: 1 });
      continue;
    }

    if (head === '-' || head.toLowerCase() === 'rest' || head.toLowerCase() === 'r') {
      out.push({ freqHz: null, steps });
      continue;
    }

    try {
      out.push({ freqHz: noteNameToFreqHz(head), steps });
    } catch (e) {
      if (strict) throw e;
      out.push({ freqHz: null, steps });
    }
  }

  return out;
}

/** Convenience helper to repeat a 1-bar (or any) phrase N times (space-separated tokens). */
export function repeatNotation(phrase: string, times: number): string {
  const clean = phrase.trim().replace(/\s+/g, ' ');
  if (times <= 0) return '';
  return new Array(times).fill(clean).join(' ');
}


