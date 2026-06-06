import { useState } from 'react';
import type { ChordRoot, ChordQuality, ChordSymbol } from '../types/music';

interface ChordEditorProps {
  measures: import('../types/music').Measure[];
  currentMeasure: number;
  onAddChord: (measureIdx: number, chord: Omit<ChordSymbol, 'id'>) => void;
  onRemoveChord: (measureIdx: number, chordId: string) => void;
  onMeasureSelect: (idx: number) => void;
}

const ROOTS: ChordRoot[] = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];
const QUALITIES: ChordQuality[] = ['maj7','7','m7','m7b5','dim7','6','m6','maj','m','aug','sus4','sus2','9','maj9','m9','13','add9','7b9','7#9','alt',''];

export default function ChordEditor({ measures, currentMeasure, onAddChord, onRemoveChord, onMeasureSelect }: ChordEditorProps) {
  const [root, setRoot] = useState<ChordRoot>('C');
  const [quality, setQuality] = useState<ChordQuality>('maj7');
  const [beat, setBeat] = useState(0);
  const [bassRoot, setBassRoot] = useState<ChordRoot | ''>('');

  function handleAdd() {
    onAddChord(currentMeasure, {
      root,
      quality,
      bass: bassRoot as ChordRoot || undefined,
      beatPosition: beat,
    });
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">코드 입력</h3>

      {/* Measure tabs */}
      <div className="flex gap-1 flex-wrap">
        {measures.map((_, i) => (
          <button
            key={i}
            onClick={() => onMeasureSelect(i)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors
              ${currentMeasure === i ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            {i + 1}마디
          </button>
        ))}
      </div>

      {/* Current measure chords */}
      <div className="flex flex-wrap gap-1 min-h-[32px]">
        {measures[currentMeasure]?.chords.map(chord => (
          <span
            key={chord.id}
            className="flex items-center gap-1 bg-purple-900/50 text-purple-200 px-2 py-0.5 rounded text-sm border border-purple-700"
          >
            <span className="font-bold">{chord.root}{chord.quality}</span>
            {chord.bass && <span className="text-purple-400">/{chord.bass}</span>}
            <span className="text-purple-500 text-xs">b{chord.beatPosition + 1}</span>
            <button
              onClick={() => onRemoveChord(currentMeasure, chord.id)}
              className="text-purple-400 hover:text-red-400 ml-1 text-xs"
            >
              ×
            </button>
          </span>
        ))}
        {measures[currentMeasure]?.chords.length === 0 && (
          <span className="text-gray-600 text-xs italic">코드 없음</span>
        )}
      </div>

      {/* Add chord form */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Root</label>
          <select
            value={root}
            onChange={e => setRoot(e.target.value as ChordRoot)}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600"
          >
            {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Quality</label>
          <select
            value={quality}
            onChange={e => setQuality(e.target.value as ChordQuality)}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600 w-24"
          >
            {QUALITIES.map(q => <option key={q} value={q}>{q || '(없음)'}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Beat</label>
          <select
            value={beat}
            onChange={e => setBeat(Number(e.target.value))}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600"
          >
            <option value={0}>1박</option>
            <option value={1}>2박</option>
            <option value={2}>3박</option>
            <option value={3}>4박</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Bass (옵션)</label>
          <select
            value={bassRoot}
            onChange={e => setBassRoot(e.target.value as ChordRoot)}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm border border-gray-600"
          >
            <option value="">-</option>
            {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          + 추가
        </button>
      </div>
    </div>
  );
}
