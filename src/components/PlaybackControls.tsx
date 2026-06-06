import type { RhythmPattern } from '../types/music';

interface PlaybackControlsProps {
  isPlaying: boolean;
  bpm: number;
  rhythmPattern: RhythmPattern;
  drumsEnabled: boolean;
  bassEnabled: boolean;
  onPlay: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onRhythmChange: (r: RhythmPattern) => void;
  onDrumsToggle: () => void;
  onBassToggle: () => void;
}

const RHYTHMS: { value: RhythmPattern; label: string }[] = [
  { value: 'swing', label: '🎷 Swing' },
  { value: 'bossa', label: '🌴 Bossa Nova' },
  { value: 'shuffle', label: '🎸 Shuffle' },
  { value: 'straight', label: '⬜ Straight' },
];

export default function PlaybackControls({
  isPlaying, bpm, rhythmPattern, drumsEnabled, bassEnabled,
  onPlay, onStop, onBpmChange, onRhythmChange, onDrumsToggle, onBassToggle
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center bg-gray-800 rounded-xl p-3 border border-gray-700">
      {/* Play / Stop */}
      <button
        onClick={isPlaying ? onStop : onPlay}
        className={`w-12 h-12 rounded-full text-xl font-bold shadow-lg transition-all
          ${isPlaying
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'
            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/40'}`}
      >
        {isPlaying ? '⏹' : '▶'}
      </button>

      <div className="w-px h-10 bg-gray-700" />

      {/* BPM */}
      <div className="flex flex-col items-center gap-1">
        <label className="text-xs text-gray-500 uppercase tracking-wider">BPM</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBpmChange(Math.max(40, bpm - 5))}
            className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >-</button>
          <input
            type="number"
            value={bpm}
            min={40}
            max={300}
            onChange={e => onBpmChange(Number(e.target.value))}
            className="w-16 bg-gray-900 text-white text-center rounded border border-gray-700 py-1 text-sm font-mono"
          />
          <button
            onClick={() => onBpmChange(Math.min(300, bpm + 5))}
            className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >+</button>
        </div>
      </div>

      <div className="w-px h-10 bg-gray-700" />

      {/* Rhythm pattern */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 uppercase tracking-wider">리듬</label>
        <div className="flex gap-1">
          {RHYTHMS.map(r => (
            <button
              key={r.value}
              onClick={() => onRhythmChange(r.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all
                ${rhythmPattern === r.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-10 bg-gray-700" />

      {/* Drums toggle */}
      <button
        onClick={onDrumsToggle}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${drumsEnabled ? 'bg-amber-600/80 text-white' : 'bg-gray-700 text-gray-500 line-through'}`}
      >
        🥁 드럼
      </button>

      {/* Bass toggle */}
      <button
        onClick={onBassToggle}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${bassEnabled ? 'bg-cyan-600/80 text-white' : 'bg-gray-700 text-gray-500 line-through'}`}
      >
        🎸 베이스
      </button>

      {/* BPM visualizer */}
      {isPlaying && (
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm font-mono">{bpm} BPM</span>
        </div>
      )}
    </div>
  );
}
