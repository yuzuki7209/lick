import { useState } from 'react';
import type { Lick } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import StaffRenderer from './StaffRenderer';
import PlaybackControls from './PlaybackControls';

interface LibraryViewProps {
  licks: Lick[];
  onEdit: (lick: Lick) => void;
  onDelete: (id: string) => void;
}

export default function LibraryView({ licks, onEdit, onDelete }: LibraryViewProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bpmOverride, setBpmOverride] = useState<Record<string, number>>({});

  async function handlePlay(lick: Lick) {
    if (playingId === lick.id) { audioEngine.stop(); setPlayingId(null); return; }
    if (playingId) { audioEngine.stop(); }
    setPlayingId(lick.id);
    await audioEngine.play({ ...lick, bpm: bpmOverride[lick.id] ?? lick.bpm });
  }

  if (licks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4 opacity-30">🎵</div>
        <p className="text-[#8b6914] font-serif text-xl">저장된 악보가 없습니다</p>
        <p className="text-[#a08456] text-sm mt-2 ui-sans">편집기 탭에서 악보를 만들어 저장하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {licks.map(lick => (
        <div key={lick.id}
          className={`bg-[#fffef9] border rounded-2xl overflow-hidden shadow-sm transition-all
            ${playingId === lick.id ? 'border-[#8b6914] shadow-md' : 'border-[#d4c4a0]'}`}
        >
          {/* Header row */}
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => handlePlay(lick)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow transition-all
                ${playingId === lick.id
                  ? 'bg-[#9b2020] hover:bg-[#7a1818] text-white'
                  : 'bg-[#1c1610] hover:bg-[#3a2e18] text-[#f7f2e4]'}`}
            >
              {playingId === lick.id ? '■' : '▶'}
            </button>

            <div className="flex-1 min-w-0">
              <h3 className="text-[#1c1610] font-serif font-bold text-lg truncate">{lick.name}</h3>
              {lick.description && <p className="text-[#a08456] text-sm truncate ui-sans">{lick.description}</p>}
              <div className="flex gap-3 mt-0.5 text-xs text-[#a08456] ui-sans">
                <span>{lick.bars}마디</span>
                <span>{lick.bpm} BPM</span>
                <span>{new Date(lick.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="flex gap-2 ui-sans flex-shrink-0">
              <button onClick={() => setExpandedId(expandedId === lick.id ? null : lick.id)}
                className="px-3 py-1.5 text-xs border border-[#d4c4a0] bg-[#f7f2e4] text-[#5c4a28] rounded-lg hover:bg-[#ede4cc] transition-colors">
                {expandedId === lick.id ? '▲' : '▼'} 악보
              </button>
              <button onClick={() => onEdit(lick)}
                className="px-3 py-1.5 text-xs border border-[#c4b89a] bg-[#fdf8ee] text-[#8b6914] rounded-lg hover:bg-[#f5eccc] transition-colors">
                편집
              </button>
              <button onClick={() => {
                if (confirm(`"${lick.name}"을 삭제하시겠습니까?`)) {
                  if (playingId === lick.id) { audioEngine.stop(); setPlayingId(null); }
                  onDelete(lick.id);
                }
              }}
                className="px-3 py-1.5 text-xs border border-[#e8c4c4] bg-[#fdf0f0] text-[#9b2020] rounded-lg hover:bg-[#f8e0e0] transition-colors">
                삭제
              </button>
            </div>
          </div>

          {/* Expanded view */}
          {expandedId === lick.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#ede4cc] pt-3">
              <StaffRenderer measures={lick.measures} />
              <PlaybackControls
                isPlaying={playingId === lick.id}
                bpm={bpmOverride[lick.id] ?? lick.bpm}
                onPlay={() => handlePlay(lick)}
                onStop={() => { audioEngine.stop(); setPlayingId(null); }}
                onBpmChange={bpm => setBpmOverride(p => ({ ...p, [lick.id]: bpm }))}
              />
            </div>
          )}

          {/* Playing indicator */}
          {playingId === lick.id && (
            <div className="px-4 py-2 bg-[#fdf8ee] border-t border-[#ede4cc] flex items-center gap-2 ui-sans">
              <div className="flex gap-0.5 items-end h-4">
                {[3,5,4,6,3,5].map((h, i) => (
                  <div key={i} className="w-1 rounded-full bg-[#8b6914] beat-pulse"
                    style={{ height: h * 2, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span className="text-[#8b6914] text-xs font-semibold">재생 중</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
