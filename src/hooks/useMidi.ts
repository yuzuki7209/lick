import { useState, useCallback, useRef } from 'react';
import type { Note, NoteName, NoteAccidental } from '../types/music';

export interface MidiNote {
  number: number;
  name: string;
  octave: number;
  velocity: number;
  timestamp: number;
}

interface RecordedEvent {
  midiNum: number;
  startMs: number;
  endMs?: number;
}

export interface UseMidiResult {
  isSupported: boolean;
  isEnabled: boolean;
  inputs: string[];
  selectedInput: number;
  activeNotes: Set<number>;
  lastNote: MidiNote | null;
  isRecording: boolean;
  enable: () => Promise<void>;
  selectInput: (idx: number) => void;
  startRecording: () => void;
  stopRecording: (bpm: number) => Note[];
  error: string | null;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PITCH_MAP: Record<string, { pitch: NoteName; accidental: NoteAccidental }> = {
  C: { pitch: 'c', accidental: '' }, 'C#': { pitch: 'c', accidental: '#' },
  D: { pitch: 'd', accidental: '' }, 'D#': { pitch: 'd', accidental: '#' },
  E: { pitch: 'e', accidental: '' }, F: { pitch: 'f', accidental: '' },
  'F#': { pitch: 'f', accidental: '#' }, G: { pitch: 'g', accidental: '' },
  'G#': { pitch: 'g', accidental: '#' }, A: { pitch: 'a', accidental: '' },
  'A#': { pitch: 'a', accidental: '#' }, B: { pitch: 'b', accidental: '' },
};

function midiToInfo(num: number): { name: string; octave: number } {
  return { name: NOTE_NAMES[num % 12], octave: Math.floor(num / 12) - 1 };
}

export function useMidi(
  onNoteOn?: (note: MidiNote) => void,
  onNoteOff?: (num: number) => void
): UseMidiResult {
  const [isSupported] = useState(() => typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess);
  const [isEnabled, setIsEnabled] = useState(false);
  const [inputs, setInputs] = useState<string[]>([]);
  const [selectedInput, setSelectedInput] = useState(0);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [lastNote, setLastNote] = useState<MidiNote | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const recordEventsRef = useRef<RecordedEvent[]>([]);
  const recordStartRef = useRef<number>(0);
  const activeEventsRef = useRef<Map<number, number>>(new Map()); // midiNum → startMs

  const attachListeners = useCallback((access: MIDIAccess, inputIdx: number) => {
    const inputList = Array.from(access.inputs.values());
    inputList.forEach(inp => { inp.onmidimessage = null; });

    const target = inputList[inputIdx];
    if (!target) return;

    target.onmidimessage = (event) => {
      const data = event.data;
      if (!data) return;
      const status = data[0] & 0xf0;
      const num = data[1];
      const vel = data[2];
      const { name, octave } = midiToInfo(num);

      if (status === 0x90 && vel > 0) {
        const note: MidiNote = { number: num, name, octave, velocity: vel, timestamp: Date.now() };
        setLastNote(note);
        setActiveNotes(prev => new Set([...prev, num]));
        onNoteOn?.(note);

        if (isRecording) {
          const ms = Date.now() - recordStartRef.current;
          activeEventsRef.current.set(num, ms);
        }
      } else if (status === 0x80 || (status === 0x90 && vel === 0)) {
        setActiveNotes(prev => { const n = new Set(prev); n.delete(num); return n; });
        onNoteOff?.(num);

        if (isRecording && activeEventsRef.current.has(num)) {
          const startMs = activeEventsRef.current.get(num)!;
          activeEventsRef.current.delete(num);
          recordEventsRef.current.push({ midiNum: num, startMs, endMs: Date.now() - recordStartRef.current });
        }
      }
    };
  }, [isRecording, onNoteOn, onNoteOff]);

  const enable = useCallback(async () => {
    if (!isSupported) { setError('Web MIDI API 미지원 (Chrome 필요)'); return; }
    try {
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;
      setIsEnabled(true);
      setError(null);

      const updateInputs = () => {
        const names = Array.from(access.inputs.values()).map(i => i.name ?? 'Unknown');
        setInputs(names);
        attachListeners(access, selectedInput);
      };
      updateInputs();
      access.onstatechange = updateInputs;
    } catch {
      setError('MIDI 접근 권한이 거부되었습니다.');
    }
  }, [isSupported, selectedInput, attachListeners]);

  const selectInput = useCallback((idx: number) => {
    setSelectedInput(idx);
    if (midiAccessRef.current) attachListeners(midiAccessRef.current, idx);
  }, [attachListeners]);

  const startRecording = useCallback(() => {
    recordEventsRef.current = [];
    activeEventsRef.current.clear();
    recordStartRef.current = Date.now();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback((bpm: number): Note[] => {
    setIsRecording(false);

    const events = recordEventsRef.current;
    if (events.length === 0) return [];

    const beatMs = 60000 / bpm;
    const gridMs = beatMs / 4; // 16th note grid

    const quantize = (ms: number) => Math.round(ms / gridMs) * gridMs;

    // Convert events to Notes, quantized
    const notes: Note[] = events.map(ev => {
      const durMs = (ev.endMs ?? ev.startMs + gridMs) - ev.startMs;
      const durBeats = Math.max(0.25, Math.round(durMs / gridMs) * 0.25);

      // Map beats to duration
      let duration: Note['duration'] = 'q';
      if (durBeats >= 3.5) duration = 'w';
      else if (durBeats >= 1.75) duration = 'h';
      else if (durBeats >= 0.875) duration = 'q';
      else if (durBeats >= 0.4375) duration = '8';
      else duration = '16';

      const { name, octave } = midiToInfo(ev.midiNum);
      const pitchInfo = PITCH_MAP[name] ?? { pitch: 'c' as NoteName, accidental: '' as NoteAccidental };

      return {
        id: crypto.randomUUID(),
        pitch: pitchInfo.pitch,
        octave,
        accidental: pitchInfo.accidental,
        duration,
        isDotted: false,
        isRest: false,
        status: 'neutral' as const,
      };
    }).filter((_, i) => {
      const q = quantize(events[i].startMs);
      return q >= 0;
    });

    recordEventsRef.current = [];
    return notes;
  }, []);

  return { isSupported, isEnabled, inputs, selectedInput, activeNotes, lastNote, isRecording, enable, selectInput, startRecording, stopRecording, error };
}
