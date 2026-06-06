import { useState } from 'react';
import type { NoteName, NoteAccidental } from '../types/music';
import { audioEngine } from '../utils/audioEngine';

interface PianoKeyboardProps {
  onNote: (pitch: NoteName, octave: number, accidental: NoteAccidental) => void;
  octave: number;
  onOctaveChange: (o: number) => void;
}

interface KeyDef {
  pitch: NoteName;
  accidental: NoteAccidental;
  isBlack: boolean;
  label: string;
}

const WHITE_KEYS: KeyDef[] = [
  { pitch: 'c', accidental: '', isBlack: false, label: 'C' },
  { pitch: 'd', accidental: '', isBlack: false, label: 'D' },
  { pitch: 'e', accidental: '', isBlack: false, label: 'E' },
  { pitch: 'f', accidental: '', isBlack: false, label: 'F' },
  { pitch: 'g', accidental: '', isBlack: false, label: 'G' },
  { pitch: 'a', accidental: '', isBlack: false, label: 'A' },
  { pitch: 'b', accidental: '', isBlack: false, label: 'B' },
];

// Black key positions (relative to white keys): after C, D, F, G, A
const BLACK_KEY_POSITIONS = [0, 1, 3, 4, 5]; // index of preceding white key

const BLACK_KEYS: KeyDef[] = [
  { pitch: 'c', accidental: '#', isBlack: true, label: 'C#' },
  { pitch: 'd', accidental: '#', isBlack: true, label: 'D#' },
  { pitch: 'f', accidental: '#', isBlack: true, label: 'F#' },
  { pitch: 'g', accidental: '#', isBlack: true, label: 'G#' },
  { pitch: 'a', accidental: '#', isBlack: true, label: 'A#' },
];

const WHITE_KEY_W = 40;
const WHITE_KEY_H = 120;
const BLACK_KEY_W = 26;
const BLACK_KEY_H = 74;

export default function PianoKeyboard({ onNote, octave, onOctaveChange }: PianoKeyboardProps) {
  const [pressed, setPressed] = useState<string | null>(null);

  function handlePress(key: KeyDef) {
    const toneName = `${key.label}${octave}`;
    setPressed(key.label + octave);
    audioEngine.previewNote(toneName);
    onNote(key.pitch, octave, key.accidental);
    setTimeout(() => setPressed(null), 200);
  }

  const totalWidth = WHITE_KEYS.length * WHITE_KEY_W;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Octave selector */}
      <div className="flex items-center gap-3 text-sm text-gray-300">
        <button
          onClick={() => onOctaveChange(Math.max(2, octave - 1))}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
        >
          ▼
        </button>
        <span className="text-white font-mono text-base min-w-[60px] text-center">
          Octave {octave}
        </span>
        <button
          onClick={() => onOctaveChange(Math.min(7, octave + 1))}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
        >
          ▲
        </button>
      </div>

      {/* Piano keys */}
      <div
        className="relative select-none"
        style={{ width: totalWidth, height: WHITE_KEY_H }}
      >
        {/* White keys */}
        {WHITE_KEYS.map((key, i) => {
          const isActive = pressed === key.label + octave;
          return (
            <div
              key={key.label}
              onMouseDown={() => handlePress(key)}
              onTouchStart={(e) => { e.preventDefault(); handlePress(key); }}
              className={`absolute border border-gray-400 rounded-b-md cursor-pointer transition-all duration-75 flex items-end justify-center pb-2 text-xs font-bold select-none
                ${isActive ? 'bg-blue-200 border-blue-400' : 'bg-white hover:bg-gray-50 active:bg-blue-100'}`}
              style={{
                left: i * WHITE_KEY_W,
                width: WHITE_KEY_W - 1,
                height: WHITE_KEY_H,
                zIndex: 1,
              }}
            >
              <span className="text-gray-500 text-xs">{key.label}{octave}</span>
            </div>
          );
        })}

        {/* Black keys */}
        {BLACK_KEYS.map((key, i) => {
          const whiteIdx = BLACK_KEY_POSITIONS[i];
          const isActive = pressed === key.label + octave;
          return (
            <div
              key={key.label}
              onMouseDown={(e) => { e.stopPropagation(); handlePress(key); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handlePress(key); }}
              className={`absolute rounded-b-sm cursor-pointer transition-all duration-75 flex items-end justify-center pb-1 text-white text-xs select-none
                ${isActive ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-700 active:bg-blue-700'}`}
              style={{
                left: whiteIdx * WHITE_KEY_W + WHITE_KEY_W * 0.65,
                width: BLACK_KEY_W,
                height: BLACK_KEY_H,
                zIndex: 2,
              }}
            >
              <span className="text-gray-400 text-xs" style={{ fontSize: 9 }}>{key.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
