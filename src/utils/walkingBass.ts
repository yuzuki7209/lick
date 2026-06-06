import type { Measure, ChordSymbol } from '../types/music';
import { CHORD_TONES, NOTE_TO_SEMITONE, SEMITONE_TO_NOTE } from '../types/music';

interface BassEvent {
  time: string;
  note: string;
  duration: string;
}

function chordRootMidi(chord: ChordSymbol, octave: number): number {
  const semi = NOTE_TO_SEMITONE[chord.root] ?? 0;
  return (octave + 1) * 12 + semi;
}

function normalizeMidi(midi: number, minMidi: number, maxMidi: number): number {
  while (midi > maxMidi) midi -= 12;
  while (midi < minMidi) midi += 12;
  return midi;
}

function midiToTone(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${SEMITONE_TO_NOTE[midi % 12]}${octave}`;
}

export function generateWalkingBass(measures: Measure[], bassOctave = 2): BassEvent[] {
  const events: BassEvent[] = [];
  const minMidi = (bassOctave + 1) * 12;
  const maxMidi = (bassOctave + 2) * 12 + 11;

  for (let mIdx = 0; mIdx < measures.length; mIdx++) {
    const chord = measures[mIdx].chords[0];
    if (!chord) {
      // Rest measure - just hold root of previous or skip
      for (let beat = 0; beat < 4; beat++) {
        events.push({ time: `${mIdx}:${beat}:0`, note: 'C2', duration: '4n' });
      }
      continue;
    }

    const tones = CHORD_TONES[chord.quality] ?? [0, 4, 7, 10];

    // Generate 4 notes per measure
    const rootMidi = normalizeMidi(chordRootMidi(chord, bassOctave), minMidi, maxMidi);
    const thirdMidi = normalizeMidi(rootMidi + tones[1 % tones.length], minMidi, maxMidi);
    const fifthMidi = normalizeMidi(rootMidi + tones[2 % tones.length], minMidi, maxMidi);

    // Beat 4: chromatic approach to next chord root
    let beat4Midi: number;
    const nextMeasure = measures[mIdx + 1];
    const nextChord = nextMeasure?.chords[0];
    if (nextChord) {
      const nextRootSemi = NOTE_TO_SEMITONE[nextChord.root] ?? 0;
      const nextRootMidi = normalizeMidi(
        (bassOctave + 1) * 12 + nextRootSemi,
        minMidi, maxMidi
      );
      // Approach from semitone below
      beat4Midi = nextRootMidi - 1 < minMidi ? nextRootMidi + 1 : nextRootMidi - 1;
      // Sometimes approach from a whole step above (diatonic)
      if (mIdx % 2 === 1) beat4Midi = nextRootMidi + 2 > maxMidi ? nextRootMidi - 2 : nextRootMidi + 2;
    } else {
      beat4Midi = normalizeMidi(rootMidi + (tones[3] ?? 10), minMidi, maxMidi);
    }

    const beat3Midi = mIdx % 3 === 0 ? fifthMidi : thirdMidi;

    const beatNotes = [rootMidi, thirdMidi, beat3Midi, beat4Midi];
    for (let beat = 0; beat < 4; beat++) {
      events.push({
        time: `${mIdx}:${beat}:0`,
        note: midiToTone(beatNotes[beat]),
        duration: '4n',
      });
    }
  }

  return events;
}
