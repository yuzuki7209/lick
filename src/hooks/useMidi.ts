import { useState, useCallback } from 'react';

export interface MidiNote {
  number: number;
  name: string;
  octave: number;
  velocity: number;
  timestamp: number;
}

interface UseMidiResult {
  isSupported: boolean;
  isEnabled: boolean;
  inputs: string[];
  activeNotes: Set<number>;
  lastNote: MidiNote | null;
  enable: () => Promise<void>;
  error: string | null;
}

export function useMidi(onNoteOn?: (note: MidiNote) => void, onNoteOff?: (number: number) => void): UseMidiResult {
  const [isSupported] = useState(() => !!navigator.requestMIDIAccess);
  const [isEnabled, setIsEnabled] = useState(false);
  const [inputs, setInputs] = useState<string[]>([]);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [lastNote, setLastNote] = useState<MidiNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function midiNumberToName(num: number): { name: string; octave: number } {
    const octave = Math.floor(num / 12) - 1;
    const name = NOTE_NAMES[num % 12];
    return { name, octave };
  }

  const enable = useCallback(async () => {
    if (!isSupported) {
      setError('Web MIDI API가 이 브라우저에서 지원되지 않습니다. Chrome을 사용해주세요.');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      setIsEnabled(true);
      setError(null);

      const updateInputs = () => {
        const names: string[] = [];
        access.inputs.forEach((input) => names.push(input.name ?? 'Unknown'));
        setInputs(names);
      };

      updateInputs();

      access.inputs.forEach((input) => {
        input.onmidimessage = (event) => {
          const data = event.data;
          if (!data) return;
          const [status, noteNum, velocity] = [data[0], data[1], data[2]];
          const msgType = status & 0xf0;

          if (msgType === 0x90 && velocity > 0) {
            // Note On
            const { name, octave } = midiNumberToName(noteNum);
            const note: MidiNote = { number: noteNum, name, octave, velocity, timestamp: Date.now() };
            setLastNote(note);
            setActiveNotes(prev => new Set([...prev, noteNum]));
            onNoteOn?.(note);
          } else if (msgType === 0x80 || (msgType === 0x90 && velocity === 0)) {
            // Note Off
            setActiveNotes(prev => {
              const next = new Set(prev);
              next.delete(noteNum);
              return next;
            });
            onNoteOff?.(noteNum);
          }
        };
      });

      access.onstatechange = () => updateInputs();
    } catch (err) {
      setError('MIDI 접근 권한이 거부되었습니다.');
    }
  }, [isSupported, onNoteOn, onNoteOff]);

  return { isSupported, isEnabled, inputs, activeNotes, lastNote, enable, error };
}
