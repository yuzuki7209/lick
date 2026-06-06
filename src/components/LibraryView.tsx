import { useState } from 'react';
import type { Lick, RhythmPattern } from '../types/music';
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
  const [bpmOverrides, setBpmOverrides] = useState<Record<string, number>>({});
  const [rhythmOverrides, setRhythmOverrides] = useState<Record<string, RhythmPattern>>({});
  const [drumsEnabled, setDrumsEnabled] = useState<Record<string, boolean>>({});
  const [bassEnabled, setBassEnabled] = useState<Record<string, boolean>>({});

  function getBpm(lick: Lick) { return bpmOverrides[lick.id] ?? lick.bpm; }
  function getRhythm(lick: Lick) { return rhythmOverrides[lick.id] ?? lick.rhythmPattern; }
  function getDrums(lick: Lick) { return drumsEnabled[lick.id] ?? true; }
  function getBass(lick: Lick) { return bassEnabled[lick.id] ?? true; }

  async function handlePlay(lick: Lick) {
    if (playingId === lick.id) {
      audioEngine.stop();
      setPlayingId(null);
      return;
    }

    if (playingId) {
      audioEngine.stop();
    }

    const playLick: Lick = {
      ...lick,
      bpm: getBpm(lick),
      rhythmPattern: getRhythm(lick),
    };

    setPlayingId(lick.id);
    await audioEngine.play(playLick, {
      drums: getDrums(lick),
      bass: getBass(lick),
    });
  }

  function handleStop(lickId: string) {
    audioEngine.stop();
    if (playingId === lickId) setPlayingId(null);
  }

  if (licks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🎵</div>
        <h3 className="text-xl font-semibold text-gray-400 mb-2">저장된 릭이 없습니다</h3>
        <p className="text-gray-600 text-sm">편집기에서 릭을 만들고 저장해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {licks.map(lick => (
        <div
          key={lick.id}
          className={`bg-gray-800 rounded-2xl border transition-all
            ${playingId === lick.id ? 'border-purple-500 shadow-lg shadow-purple-900/20' : 'border-gray-700'}`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => handlePlay(lick)}
              className={`w-10 h-10 rounded-full flex-shrink-0 text-lg transition-all
                ${playingId === lick.id
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-green-600 hover:bg-green-500 text-white'}`}
            >
              {playingId === lick.id ? '⏹' : '▶'}
            </button>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-lg truncate">{lick.name}</h3>
              {lick.description && (
                <p className="text-gray-500 text-sm truncate">{lick.description}</p>
              )}
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span>{lick.bars}마디</span>
                <span>{lick.bpm} BPM</span>
                <span className="capitalize">{lick.rhythmPattern}</span>
                <span>{new Date(lick.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setExpandedId(expandedId === lick.id ? null : lick.id)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
              >
                {expandedId === lick.id ? '▲ 접기' : '▼ 펼치기'}
              </button>
              <button
                onClick={() => onEdit(lick)}
                className="px-3 py-1.5 bg-blue-800/60 hover:bg-blue-700 text-blue-200 rounded-lg text-sm transition-colors"
              >
                편집
              </button>
              <button
                onClick={() => {
                  if (confirm(`"${lick.name}"을 삭제하시겠습니까?`)) {
                    if (playingId === lick.id) { audioEngine.stop(); setPlayingId(null); }
                    onDelete(lick.id);
                  }
                }}
                className="px-3 py-1.5 bg-red-900/60 hover:bg-red-900 text-red-300 rounded-lg text-sm transition-colors"
              >
                삭제
              </button>
            </div>
          </div>

          {/* Expanded: staff + playback controls */}
          {expandedId === lick.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-3">
              <div className="bg-white rounded-xl overflow-hidden shadow">
                <StaffRenderer measures={lick.measures} />
              </div>

              <PlaybackControls
                isPlaying={playingId === lick.id}
                bpm={getBpm(lick)}
                rhythmPattern={getRhythm(lick)}
                drumsEnabled={getDrums(lick)}
                bassEnabled={getBass(lick)}
                onPlay={() => handlePlay(lick)}
                onStop={() => handleStop(lick.id)}
                onBpmChange={bpm => setBpmOverrides(prev => ({ ...prev, [lick.id]: bpm }))}
                onRhythmChange={r => setRhythmOverrides(prev => ({ ...prev, [lick.id]: r }))}
                onDrumsToggle={() => setDrumsEnabled(prev => ({ ...prev, [lick.id]: !getDrums(lick) }))}
                onBassToggle={() => setBassEnabled(prev => ({ ...prev, [lick.id]: !getBass(lick) }))}
              />
            </div>
          )}

          {/* Playing indicator */}
          {playingId === lick.id && (
            <div className="px-4 py-2 bg-purple-900/20 border-t border-purple-800/40 flex items-center gap-2 rounded-b-2xl">
              <div className="flex gap-0.5">
                {[0,1,2,3].map(i => (
                  <div
                    key={i}
                    className="w-1 bg-purple-400 rounded-full animate-pulse"
                    style={{ height: 8 + (i % 3) * 4, animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-purple-300 text-xs">재생 중...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
