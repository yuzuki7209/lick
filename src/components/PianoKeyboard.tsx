import { useState } from 'react';
import type { NoteName, NoteAccidental } from '../types/music';
import { audioEngine } from '../utils/audioEngine';

interface PianoKeyboardProps {
  onNote: (pitch: NoteName, octave: number, accidental: NoteAccidental) => void;
  octave: number;
  onOctaveChange: (o: number) => void;
}

interface KeyDef { pitch: NoteName; accidental: NoteAccidental; isBlack: boolean; label: string; }

const WHITE_KEYS: KeyDef[] = [
  { pitch: 'c', accidental: '', isBlack: false, label: 'C' },
  { pitch: 'd', accidental: '', isBlack: false, label: 'D' },
  { pitch: 'e', accidental: '', isBlack: false, label: 'E' },
  { pitch: 'f', accidental: '', isBlack: false, label: 'F' },
  { pitch: 'g', accidental: '', isBlack: false, label: 'G' },
  { pitch: 'a', accidental: '', isBlack: false, label: 'A' },
  { pitch: 'b', accidental: '', isBlack: false, label: 'B' },
];

const BLACK_KEY_POSITIONS = [0, 1, 3, 4, 5];
const BLACK_KEYS: KeyDef[] = [
  { pitch: 'c', accidental: '#', isBlack: true, label: 'C#' },
  { pitch: 'd', accidental: '#', isBlack: true, label: 'D#' },
  { pitch: 'f', accidental: '#', isBlack: true, label: 'F#' },
  { pitch: 'g', accidental: '#', isBlack: true, label: 'G#' },
  { pitch: 'a', accidental: '#', isBlack: true, label: 'A#' },
];

const WW = 38, WH = 110, BW = 24, BH = 68;

export default function PianoKeyboard({ onNote, octave, onOctaveChange }: PianoKeyboardProps) {
  const [pressed, setPressed] = useState<string | null>(null);

  function press(key: KeyDef) {
    const tone = `${key.label}${octave}`;
    setPressed(key.label + octave);
    audioEngine.previewNote(tone);
    onNote(key.pitch, octave, key.accidental);
    setTimeout(() => setPressed(null), 180);
  }

  return (
    <div className="flex flex-col items-center gap-3 ui-sans">
      <div className="flex items-center gap-3 text-sm text-[#5c4a28]">
        <button onClick={() => onOctaveChange(Math.max(2, octave - 1))}
          className="w-8 h-8 rounded border border-[#d4c4a0] bg-[#f7f2e4] hover:bg-[#ede4cc] text-[#1c1610] font-bold transition-colors">▼</button>
        <span className="w-20 text-center font-mono text-[#8b6914] font-semibold">Octave {octave}</span>
        <button onClick={() => onOctaveChange(Math.min(7, octave + 1))}
          className="w-8 h-8 rounded border border-[#d4c4a0] bg-[#f7f2e4] hover:bg-[#ede4cc] text-[#1c1610] font-bold transition-colors">▲</button>
      </div>
      <div className="relative select-none" style={{ width: WHITE_KEYS.length * WW, height: WH }}>
        {WHITE_KEYS.map((key, i) => {
          const active = pressed === key.label + octave;
          return (
            <div key={key.label} onMouseDown={() => press(key)}
              onTouchStart={e => { e.preventDefault(); press(key); }}
              className={`absolute border border-[#c4b89a] rounded-b cursor-pointer flex items-end justify-center pb-2 text-xs font-medium transition-all duration-75
                ${active ? 'bg-[#f0e4b0] border-[#8b6914]' : 'bg-white hover:bg-[#fdfaf2]'}`}
              style={{ left: i * WW, width: WW - 1, height: WH, zIndex: 1 }}>
              <span className="text-[#a08456] text-[10px]">{key.label}</span>
            </div>
          );
        })}
        {BLACK_KEYS.map((key, i) => {
          const active = pressed === key.label + octave;
          return (
            <div key={key.label} onMouseDown={e => { e.stopPropagation(); press(key); }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); press(key); }}
              className={`absolute rounded-b cursor-pointer flex items-end justify-center pb-1 transition-all duration-75
                ${active ? 'bg-[#8b6914]' : 'bg-[#1c1610] hover:bg-[#3a2e18]'}`}
              style={{ left: BLACK_KEY_POSITIONS[i] * WW + WW * 0.65, width: BW, height: BH, zIndex: 2 }}>
              <span className="text-[#c4b89a] text-[8px]">{key.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
