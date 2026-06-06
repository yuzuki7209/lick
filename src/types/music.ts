export type NoteName = 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b';
export type NoteAccidental = '' | '#' | 'b' | 'n';
export type NoteDuration = 'w' | 'h' | 'q' | '8' | '16';
export type RhythmPattern = 'swing' | 'bossa' | 'shuffle' | 'straight';

export type ChordRoot =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E'
  | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A'
  | 'A#' | 'Bb' | 'B';

export type ChordQuality =
  | 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | '6' | 'm6'
  | 'maj' | 'm' | 'aug' | 'sus4' | 'sus2' | '9' | 'maj9'
  | 'm9' | '13' | 'add9' | '7b9' | '7#9' | 'alt' | '';

export interface Note {
  id: string;
  pitch: NoteName;
  octave: number;
  accidental: NoteAccidental;
  duration: NoteDuration;
  isDotted?: boolean;
  isRest?: boolean;
  status?: 'neutral' | 'correct' | 'wrong' | 'active';
}

export interface ChordSymbol {
  id: string;
  root: ChordRoot;
  quality: ChordQuality;
  bass?: ChordRoot;
  beatPosition: number; // 0-indexed beat position in measure
}

export interface Measure {
  id: string;
  notes: Note[];
  chords: ChordSymbol[];
}

export interface Lick {
  id: string;
  name: string;
  description: string;
  bpm: number;
  bars: 4 | 8;
  measures: Measure[];
  rhythmPattern: RhythmPattern;
  createdAt: number;
}

export interface PlaybackOptions {
  melody?: boolean;
  drums?: boolean;
  bass?: boolean;
  loop?: boolean;
}

export const DURATION_VALUES: Record<NoteDuration, number> = {
  w: 4,
  h: 2,
  q: 1,
  '8': 0.5,
  '16': 0.25,
};

export const CHORD_TONES: Record<string, number[]> = {
  'maj7': [0, 4, 7, 11],
  '7': [0, 4, 7, 10],
  'm7': [0, 3, 7, 10],
  'm7b5': [0, 3, 6, 10],
  'dim7': [0, 3, 6, 9],
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  'maj': [0, 4, 7],
  'm': [0, 3, 7],
  'aug': [0, 4, 8],
  'sus4': [0, 5, 7],
  'sus2': [0, 2, 7],
  '9': [0, 4, 7, 10, 14],
  'maj9': [0, 4, 7, 11, 14],
  'm9': [0, 3, 7, 10, 14],
  '13': [0, 4, 7, 10, 14, 21],
  'add9': [0, 4, 7, 14],
  '7b9': [0, 4, 7, 10, 13],
  '7#9': [0, 4, 7, 10, 15],
  'alt': [0, 4, 6, 10, 13, 15],
  '': [0, 4, 7],
};

export const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8,
  Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export const SEMITONE_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function noteToMidi(note: Note): number {
  const semitones: Record<NoteName, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const accOffset: Record<NoteAccidental, number> = { '': 0, '#': 1, b: -1, n: 0 };
  return (note.octave + 1) * 12 + semitones[note.pitch] + accOffset[note.accidental];
}

export function midiToToneName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${SEMITONE_TO_NOTE[midi % 12]}${octave}`;
}

export function noteToToneName(note: Note): string {
  const pitchUp: Record<NoteName, string> = { c: 'C', d: 'D', e: 'E', f: 'F', g: 'G', a: 'A', b: 'B' };
  const acc: Record<NoteAccidental, string> = { '': '', '#': '#', b: 'b', n: '' };
  return `${pitchUp[note.pitch]}${acc[note.accidental]}${note.octave}`;
}

export function durationToTone(duration: NoteDuration, isDotted?: boolean): string {
  const map: Record<NoteDuration, string> = { w: '1n', h: '2n', q: '4n', '8': '8n', '16': '16n' };
  return map[duration] + (isDotted ? '.' : '');
}

export function createEmptyMeasure(): Measure {
  return { id: crypto.randomUUID(), notes: [], chords: [] };
}

export function createEmptyLick(bars: 4 | 8 = 4): Lick {
  return {
    id: crypto.randomUUID(),
    name: '새 릭',
    description: '',
    bpm: 120,
    bars,
    measures: Array.from({ length: bars }, createEmptyMeasure),
    rhythmPattern: 'swing',
    createdAt: Date.now(),
  };
}

export function getMeasureBeats(measure: Measure): number {
  return measure.notes.reduce((sum, n) => {
    const base = DURATION_VALUES[n.duration];
    return sum + (n.isDotted ? base * 1.5 : base);
  }, 0);
}
