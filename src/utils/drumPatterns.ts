import type { RhythmPattern } from '../types/music';

// 16-step patterns (16th note subdivisions, 4/4)
// 1 = hit, 0 = rest, velocity 0-1

export interface DrumHit {
  step: number;
  velocity: number;
}

export interface DrumPattern {
  kick: DrumHit[];
  snare: DrumHit[];
  hihat: DrumHit[];
  ride: DrumHit[];
  rimshot: DrumHit[];
  stepSize: string;  // Tone.js subdivision
  swing: number;     // 0-1
}

function hits(pattern: number[]): DrumHit[] {
  return pattern.reduce<DrumHit[]>((acc, v, i) => {
    if (v > 0) acc.push({ step: i, velocity: v });
    return acc;
  }, []);
}

const SWING_PATTERN: DrumPattern = {
  // Ride: on every 8th (positions 0,2,4,6,8,10,12,14)
  ride: hits([0.9, 0, 0.7, 0, 0.9, 0, 0.7, 0, 0.9, 0, 0.7, 0, 0.9, 0, 0.7, 0]),
  // Hi-hat foot: beats 2 and 4
  hihat: hits([0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0]),
  // Kick: beat 1 primarily
  kick: hits([0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0]),
  // Snare: beats 2 and 4 (comping/ghost notes can be added)
  snare: hits([0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0]),
  rimshot: [],
  stepSize: '16n',
  swing: 0.5,
};

// Bossa Nova pattern (no swing, specific rim/kick pattern)
const BOSSA_PATTERN: DrumPattern = {
  // Hi-hat: every 8th note
  hihat: hits([0.7, 0, 0.7, 0, 0.7, 0, 0.7, 0, 0.7, 0, 0.7, 0, 0.7, 0, 0.7, 0]),
  // Kick: beat 1 and the "and" of 2
  kick: hits([0.9, 0, 0, 0, 0, 0, 0.7, 0, 0.8, 0, 0, 0, 0, 0, 0, 0]),
  // Rimshot (cross-stick): classic bossa pattern
  rimshot: hits([0, 0, 0, 0, 0.8, 0, 0.6, 0, 0, 0, 0.8, 0, 0.6, 0, 0.6, 0]),
  snare: [],
  ride: [],
  stepSize: '16n',
  swing: 0,
};

// Shuffle pattern uses triplet subdivisions (12 steps per bar)
const SHUFFLE_PATTERN: DrumPattern = {
  // Hi-hat: triplet downbeat + upbeat
  hihat: hits([0.9, 0, 0.7, 0.9, 0, 0.7, 0.9, 0, 0.7, 0.9, 0, 0.7]),
  // Snare: beats 2 and 4 (positions 3 and 9 in 12-step)
  snare: hits([0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0.9, 0, 0]),
  // Kick: beats 1 and 3
  kick: hits([0.9, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0]),
  ride: [],
  rimshot: [],
  stepSize: '8t',  // 8th note triplets
  swing: 0,
};

// Straight 4 pattern
const STRAIGHT_PATTERN: DrumPattern = {
  hihat: hits([0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0]),
  kick: hits([0.9, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0]),
  snare: hits([0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0]),
  ride: [],
  rimshot: [],
  stepSize: '16n',
  swing: 0,
};

export function getDrumPattern(rhythm: RhythmPattern): DrumPattern {
  switch (rhythm) {
    case 'swing': return SWING_PATTERN;
    case 'bossa': return BOSSA_PATTERN;
    case 'shuffle': return SHUFFLE_PATTERN;
    case 'straight': return STRAIGHT_PATTERN;
  }
}
