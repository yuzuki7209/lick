import { useState } from 'react';
import type { ChordRoot, ChordQuality, ChordSymbol, Measure } from '../types/music';

interface ChordEditorProps {
  measures: Measure[];
  currentMeasure: number;
  onAddChord: (measureIdx: number, chord: Omit<ChordSymbol, 'id'>) => void;
  onRemoveChord: (measureIdx: number, chordId: string) => void;
  onMeasureSelect: (idx: number) => void;
}

const ROOTS: ChordRoot[] = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];
const QUALITIES: { v: ChordQuality; label: string }[] = [
  { v: 'maj7', label: 'maj7' }, { v: '7', label: '7' }, { v: 'm7', label: 'm7' },
  { v: 'm7b5', label: 'm7♭5' }, { v: 'dim7', label: 'dim7' }, { v: '6', label: '6' },
  { v: 'm6', label: 'm6' }, { v: 'maj', label: 'maj' }, { v: 'm', label: 'm' },
  { v: 'aug', label: 'aug' }, { v: 'sus4', label: 'sus4' }, { v: 'sus2', label: 'sus2' },
  { v: '9', label: '9' }, { v: 'maj9', label: 'maj9' }, { v: 'm9', label: 'm9' },
  { v: '13', label: '13' }, { v: '7b9', label: '7♭9' }, { v: '7#9', label: '7♯9' },
  { v: 'alt', label: 'alt' }, { v: '', label: '—' },
];
const BEATS = [0, 1, 2, 3] as const;
const BEAT_LABELS = ['1박', '2박', '3박', '4박'];

export default function ChordEditor({ measures, currentMeasure, onAddChord, onRemoveChord, onMeasureSelect }: ChordEditorProps) {
  const [root, setRoot] = useState<ChordRoot>('C');
  const [quality, setQuality] = useState<ChordQuality>('maj7');
  const [bass, setBass] = useState<ChordRoot | ''>('');

  function addTobeat(beat: 0 | 1 | 2 | 3) {
    onAddChord(currentMeasure, { root, quality, bass: bass as ChordRoot || undefined, beatPosition: beat });
  }

  const currentChords = measures[currentMeasure]?.chords ?? [];

  return (
    <div className="bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-4 shadow-sm ui-sans space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#8b6914] uppercase tracking-widest">코드 입력</h3>
        {/* Measure tabs */}
        <div className="flex gap-1 flex-wrap justify-end">
          {measures.map((_, i) => (
            <button key={i} onClick={() => onMeasureSelect(i)}
              className={`w-7 h-7 rounded text-xs font-mono transition-colors
                ${currentMeasure === i ? 'bg-[#8b6914] text-white' : 'bg-[#f7f2e4] text-[#8b6914] hover:bg-[#ede4cc]'}`}
            >{i + 1}</button>
          ))}
        </div>
      </div>

      {/* Chord selector row */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#a08456] uppercase tracking-wider">Root</label>
          <select value={root} onChange={e => setRoot(e.target.value as ChordRoot)}
            className="bg-[#f7f2e4] text-[#1c1610] rounded border border-[#d4c4a0] px-2 py-1.5 text-sm w-20">
            {ROOTS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#a08456] uppercase tracking-wider">Quality</label>
          <select value={quality} onChange={e => setQuality(e.target.value as ChordQuality)}
            className="bg-[#f7f2e4] text-[#1c1610] rounded border border-[#d4c4a0] px-2 py-1.5 text-sm w-24">
            {QUALITIES.map(q => <option key={q.v} value={q.v}>{q.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#a08456] uppercase tracking-wider">Bass</label>
          <select value={bass} onChange={e => setBass(e.target.value as ChordRoot)}
            className="bg-[#f7f2e4] text-[#1c1610] rounded border border-[#d4c4a0] px-2 py-1.5 text-sm w-20">
            <option value="">–</option>
            {ROOTS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#a08456] uppercase tracking-wider">박에 추가</label>
          <div className="flex gap-1">
            {BEATS.map(b => (
              <button key={b} onClick={() => addTobeat(b)}
                className="px-3 py-1.5 rounded bg-[#8b6914] hover:bg-[#6b5010] text-white text-xs font-semibold transition-colors">
                {BEAT_LABELS[b]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current measure chords by beat */}
      <div className="grid grid-cols-4 gap-2">
        {BEATS.map(beat => {
          const chords = currentChords.filter(c => c.beatPosition === beat);
          return (
            <div key={beat} className="bg-[#f7f2e4] rounded-lg p-2 min-h-[48px]">
              <div className="text-[10px] text-[#a08456] font-semibold mb-1">{BEAT_LABELS[beat]}</div>
              <div className="flex flex-wrap gap-1">
                {chords.map(c => (
                  <span key={c.id}
                    className="inline-flex items-center gap-1 bg-white border border-[#d4c4a0] rounded px-1.5 py-0.5 text-xs text-[#1c1610] font-semibold">
                    {c.root}{c.quality}{c.bass ? `/${c.bass}` : ''}
                    <button onClick={() => onRemoveChord(currentMeasure, c.id)}
                      className="text-[#a08456] hover:text-[#9b2020] text-xs leading-none">×</button>
                  </span>
                ))}
                {chords.length === 0 && <span className="text-[#c4b89a] text-xs">–</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
