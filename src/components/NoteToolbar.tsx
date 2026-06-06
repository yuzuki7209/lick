import type { NoteDuration, NoteAccidental } from '../types/music';

interface NoteToolbarProps {
  duration: NoteDuration;
  accidental: NoteAccidental;
  dotted: boolean;
  isRest: boolean;
  onDuration: (d: NoteDuration) => void;
  onAccidental: (a: NoteAccidental) => void;
  onDotted: (v: boolean) => void;
  onRest: (v: boolean) => void;
  onUndo: () => void;
  onClear: () => void;
}

const DURATIONS: { value: NoteDuration; label: string; symbol: string }[] = [
  { value: 'w', label: 'Whole', symbol: '𝅝' },
  { value: 'h', label: 'Half', symbol: '𝅗𝅥' },
  { value: 'q', label: 'Quarter', symbol: '𝅘𝅥' },
  { value: '8', label: 'Eighth', symbol: '♪' },
  { value: '16', label: '16th', symbol: '𝅘𝅥𝅯' },
];

const ACCIDENTALS: { value: NoteAccidental; label: string; symbol: string }[] = [
  { value: '', label: 'Natural (auto)', symbol: '♮' },
  { value: '#', label: 'Sharp', symbol: '♯' },
  { value: 'b', label: 'Flat', symbol: '♭' },
  { value: 'n', label: 'Force natural', symbol: '♮!' },
];

export default function NoteToolbar({
  duration, accidental, dotted, isRest,
  onDuration, onAccidental, onDotted, onRest,
  onUndo, onClear
}: NoteToolbarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center bg-gray-800 rounded-xl p-3 border border-gray-700">
      {/* Duration buttons */}
      <div className="flex gap-1">
        {DURATIONS.map(d => (
          <button
            key={d.value}
            onClick={() => onDuration(d.value)}
            title={d.label}
            className={`w-10 h-10 rounded-lg text-lg font-bold transition-all
              ${duration === d.value
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {d.symbol}
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-gray-700" />

      {/* Accidental buttons */}
      <div className="flex gap-1">
        {ACCIDENTALS.map(a => (
          <button
            key={a.value}
            onClick={() => onAccidental(a.value)}
            title={a.label}
            className={`w-10 h-10 rounded-lg text-base font-bold transition-all
              ${accidental === a.value
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {a.symbol}
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-gray-700" />

      {/* Dotted toggle */}
      <button
        onClick={() => onDotted(!dotted)}
        title="Dotted note"
        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all
          ${dotted ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
      >
        ·
      </button>

      {/* Rest toggle */}
      <button
        onClick={() => onRest(!isRest)}
        title="Input rest"
        className={`px-3 h-10 rounded-lg text-sm font-bold transition-all
          ${isRest ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
      >
        쉼표
      </button>

      <div className="flex-1" />

      {/* Undo / Clear */}
      <button
        onClick={onUndo}
        title="Undo last note"
        className="px-3 h-10 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
      >
        ↩ Undo
      </button>
      <button
        onClick={onClear}
        title="Clear current measure"
        className="px-3 h-10 rounded-lg text-sm bg-red-900/60 text-red-300 hover:bg-red-900 transition-colors"
      >
        지우기
      </button>
    </div>
  );
}
