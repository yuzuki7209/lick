interface PlaybackControlsProps {
  isPlaying: boolean;
  bpm: number;
  onPlay: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
}

export default function PlaybackControls({ isPlaying, bpm, onPlay, onStop, onBpmChange }: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-4 bg-[#fffef9] border border-[#d4c4a0] rounded-xl px-4 py-3 shadow-sm ui-sans">
      <button
        onClick={isPlaying ? onStop : onPlay}
        className={`w-11 h-11 rounded-full text-xl font-bold shadow transition-all flex items-center justify-center
          ${isPlaying
            ? 'bg-[#9b2020] hover:bg-[#7a1818] text-white shadow-red-200'
            : 'bg-[#1c1610] hover:bg-[#3a2e18] text-[#f7f2e4] shadow-[#c4b89a]'}`}
      >
        {isPlaying ? '■' : '▶'}
      </button>

      <div className="flex items-center gap-2">
        <button onClick={() => onBpmChange(Math.max(40, bpm - 5))}
          className="w-7 h-7 rounded border border-[#d4c4a0] bg-[#f7f2e4] text-[#5c4a28] hover:bg-[#ede4cc] text-sm font-bold transition-colors">
          −
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-[#a08456] uppercase tracking-widest leading-none">BPM</span>
          <input
            type="number" value={bpm} min={40} max={300}
            onChange={e => onBpmChange(Math.max(40, Math.min(300, Number(e.target.value))))}
            className="w-14 text-center bg-transparent text-[#1c1610] font-mono text-lg font-bold border-b border-[#d4c4a0] focus:outline-none focus:border-[#8b6914]"
          />
        </div>
        <button onClick={() => onBpmChange(Math.min(300, bpm + 5))}
          className="w-7 h-7 rounded border border-[#d4c4a0] bg-[#f7f2e4] text-[#5c4a28] hover:bg-[#ede4cc] text-sm font-bold transition-colors">
          +
        </button>
      </div>

      {isPlaying && (
        <div className="flex items-center gap-2 ml-2">
          <div className="flex gap-0.5 items-end h-5">
            {[4,6,5,7,4].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-[#8b6914] beat-pulse"
                style={{ height: h * 3, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <span className="text-[#8b6914] text-sm font-mono">{bpm}</span>
        </div>
      )}
    </div>
  );
}
