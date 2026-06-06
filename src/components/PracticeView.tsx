import { useState, useCallback, useRef, useEffect } from 'react';
import type { Lick, Note } from '../types/music';
import { noteToMidi, CHORD_TONES, NOTE_TO_SEMITONE, DURATION_VALUES } from '../types/music';
import { useMidi, type MidiNote } from '../hooks/useMidi';
import { audioEngine } from '../utils/audioEngine';
import StaffRenderer from './StaffRenderer';
import PlaybackControls from './PlaybackControls';

type NoteStatus = 'neutral' | 'correct' | 'wrong' | 'active';

interface PracticeViewProps { licks: Lick[]; }

interface NoteEntry { note: Note; measureIdx: number; noteIdx: number; }

function buildNoteList(lick: Lick): NoteEntry[] {
  const list: NoteEntry[] = [];
  for (let mi = 0; mi < lick.measures.length; mi++) {
    const nonRest = lick.measures[mi].notes.filter(n => !n.isRest);
    nonRest.forEach((note, ni) => list.push({ note, measureIdx: mi, noteIdx: ni }));
  }
  return list;
}

function getChordMidis(lick: Lick, measureIdx: number): Set<number> {
  const midis = new Set<number>();
  const chords = lick.measures[measureIdx]?.chords ?? [];
  for (const chord of chords) {
    const root = NOTE_TO_SEMITONE[chord.root] ?? 0;
    const tones = CHORD_TONES[chord.quality] ?? [0, 4, 7];
    for (const t of tones) {
      for (let oct = 1; oct <= 6; oct++) midis.add((oct + 1) * 12 + root + t);
    }
  }
  return midis;
}

export default function PracticeView({ licks }: PracticeViewProps) {
  const [selectedLick, setSelectedLick] = useState<Lick | null>(null);
  const [statuses, setStatuses] = useState<Map<string, NoteStatus>>(new Map());
  const [cursor, setCursor] = useState(0); // index into noteList
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [practiceMode, setPracticeMode] = useState<'melody' | 'chord'>('melody');

  const noteListRef = useRef<NoteEntry[]>([]);
  const cursorRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function initPractice(lick: Lick) {
    setSelectedLick(lick);
    noteListRef.current = buildNoteList(lick);
    const m = new Map<string, NoteStatus>();
    noteListRef.current.forEach((e, i) => m.set(e.note.id, i === 0 ? 'active' : 'neutral'));
    setStatuses(m);
    setCursor(0); cursorRef.current = 0;
    setScore({ correct: 0, wrong: 0 });
  }

  // Auto-advance: schedule next note advance based on BPM
  function scheduleAutoAdvance(lick: Lick, noteIdx: number) {
    if (!autoAdvance) return;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    const entry = noteListRef.current[noteIdx];
    if (!entry) return;
    const beatMs = 60000 / lick.bpm;
    const noteBeats = DURATION_VALUES[entry.note.duration] * (entry.note.isDotted ? 1.5 : 1);
    const ms = beatMs * noteBeats * 2; // wait 2× note duration before auto-advance

    autoTimerRef.current = setTimeout(() => {
      advanceCursor(lick, noteIdx, 'neutral');
    }, ms);
  }

  function advanceCursor(lick: Lick, fromIdx: number, statusForCurrent: NoteStatus) {
    const list = noteListRef.current;
    setStatuses(prev => {
      const next = new Map(prev);
      const current = list[fromIdx];
      if (current && statusForCurrent !== 'neutral') next.set(current.note.id, statusForCurrent);
      const nextEntry = list[fromIdx + 1];
      if (nextEntry) next.set(nextEntry.note.id, 'active');
      return next;
    });
    const newCursor = fromIdx + 1;
    setCursor(newCursor);
    cursorRef.current = newCursor;
    if (newCursor < list.length && autoAdvance) scheduleAutoAdvance(lick, newCursor);
  }

  const handleNoteOn = useCallback((midi: MidiNote) => {
    const lick = selectedLick;
    if (!lick) return;
    const list = noteListRef.current;
    const idx = cursorRef.current;

    if (practiceMode === 'melody') {
      const entry = list[idx];
      if (!entry) return;
      const expected = noteToMidi(entry.note);
      const isCorrect = (midi.number - expected) % 12 === 0;
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), wrong: s.wrong + (isCorrect ? 0 : 1) }));
      advanceCursor(lick, idx, isCorrect ? 'correct' : 'wrong');
    } else {
      // Chord mode: check if note is in current measure's chord
      const entry = list[idx];
      if (!entry) return;
      const chordMidis = getChordMidis(lick, entry.measureIdx);
      const isCorrect = chordMidis.has(midi.number);
      setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), wrong: s.wrong + (isCorrect ? 0 : 1) }));
    }
  }, [selectedLick, practiceMode]);

  const { isEnabled, inputs, selectedInput, enable, selectInput, error } = useMidi(handleNoteOn);

  // When auto-advance mode is toggled, restart scheduling
  useEffect(() => {
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, []);

  // BPM-based playback for practice
  async function handlePlay() {
    if (!selectedLick) return;
    if (isPlaying) { audioEngine.stop(); setIsPlaying(false); return; }
    setIsPlaying(true);
    // Play the full score, cursor follows via position callback
    audioEngine.setPositionCallback((mi, ni) => {
      setCursor(ni);
      cursorRef.current = ni;
      setStatuses(prev => {
        const next = new Map(prev);
        const entry = noteListRef.current.find(e => e.measureIdx === mi && e.noteIdx === ni);
        if (entry) next.set(entry.note.id, 'active');
        return next;
      });
    });
    await audioEngine.play(selectedLick);
  }

  const displayMeasures = selectedLick
    ? selectedLick.measures.map(m => ({
        ...m,
        notes: m.notes.map(n => ({ ...n, status: statuses.get(n.id) ?? 'neutral' })),
      }))
    : [];

  const currentEntry = noteListRef.current[cursor];
  const total = score.correct + score.wrong;
  const accuracy = total > 0 ? Math.round(score.correct / total * 100) : null;

  if (licks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4 opacity-40">🎹</div>
        <p className="text-[#8b6914] font-serif text-xl">저장된 악보가 없습니다</p>
        <p className="text-[#a08456] text-sm mt-2 ui-sans">편집기에서 악보를 만들어 저장하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score selection */}
      <div className="bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[#8b6914] uppercase tracking-widest mb-3 ui-sans">악보 선택</h3>
        <div className="flex flex-wrap gap-2 ui-sans">
          {licks.map(l => (
            <button key={l.id} onClick={() => initPractice(l)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${selectedLick?.id === l.id
                  ? 'bg-[#1c1610] text-[#f7f2e4] border-[#1c1610] shadow'
                  : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
            >
              {l.name}
              <span className="ml-2 text-[10px] opacity-60">{l.bars}마디</span>
            </button>
          ))}
        </div>
      </div>

      {selectedLick && (
        <>
          {/* MIDI + settings row */}
          <div className="bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-4 shadow-sm ui-sans">
            <div className="flex flex-wrap gap-4 items-center">
              {/* MIDI */}
              <div className="flex items-center gap-2">
                {!isEnabled ? (
                  <button onClick={enable}
                    className="px-3 py-2 text-xs bg-[#1c1610] text-[#f7f2e4] rounded-lg hover:bg-[#3a2e18] transition-colors font-semibold">
                    🎹 MIDI 연결
                  </button>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#2d7a3a] animate-pulse inline-block" />
                    {inputs.length > 1 ? (
                      <select value={selectedInput} onChange={e => selectInput(Number(e.target.value))}
                        className="bg-[#f7f2e4] border border-[#d4c4a0] rounded px-2 py-1 text-xs text-[#1c1610]">
                        {inputs.map((n, i) => <option key={i} value={i}>{n}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-[#2d7a3a]">{inputs[0] ?? '장치 없음'}</span>
                    )}
                  </>
                )}
                {error && <span className="text-xs text-[#9b2020]">{error}</span>}
              </div>

              <div className="w-px h-6 bg-[#d4c4a0]" />

              {/* Practice mode */}
              <div className="flex gap-1">
                {(['melody', 'chord'] as const).map(mode => (
                  <button key={mode} onClick={() => setPracticeMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${practiceMode === mode ? 'bg-[#5c4a28] text-white border-[#3a2e18]' : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}>
                    {mode === 'melody' ? '🎵 멜로디' : '🎼 코드'}
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-[#d4c4a0]" />

              {/* Auto advance toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#5c4a28]">
                <div className={`relative w-9 h-5 rounded-full transition-colors ${autoAdvance ? 'bg-[#8b6914]' : 'bg-[#d4c4a0]'}`}
                  onClick={() => setAutoAdvance(p => !p)}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoAdvance ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                자동 진행
              </label>
            </div>
          </div>

          {/* Score */}
          <div className="grid grid-cols-3 gap-3 ui-sans">
            {[
              { label: '정확도', value: accuracy !== null ? `${accuracy}%` : '—',
                color: accuracy === null ? '#a08456' : accuracy >= 80 ? '#2d7a3a' : accuracy >= 60 ? '#8b6914' : '#9b2020' },
              { label: '정답', value: score.correct, color: '#2d7a3a' },
              { label: '오답', value: score.wrong, color: '#9b2020' },
            ].map(item => (
              <div key={item.label} className="bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-3 text-center shadow-sm">
                <div className="text-[10px] text-[#a08456] uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-2xl font-bold font-serif" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Staff */}
          <StaffRenderer
            measures={displayMeasures}
            currentMeasure={currentEntry?.measureIdx}
          />

          {/* Legend */}
          <div className="flex gap-4 text-xs text-[#a08456] ui-sans bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-3">
            {[
              { color: '#8b6914', label: '현재 음' },
              { color: '#2d7a3a', label: '정답' },
              { color: '#9b2020', label: '오답' },
              { color: '#c4b89a', label: '미연주' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
            <button onClick={() => initPractice(selectedLick)}
              className="ml-auto px-3 py-1 rounded border border-[#d4c4a0] bg-[#f7f2e4] text-[#5c4a28] hover:bg-[#ede4cc] transition-colors">
              🔄 초기화
            </button>
          </div>

          {/* Playback for score reference */}
          <div>
            <p className="text-xs text-[#a08456] mb-2 ui-sans">악보 재생 (피아노 소리로 참고)</p>
            <PlaybackControls
              isPlaying={isPlaying} bpm={selectedLick.bpm}
              onPlay={handlePlay}
              onStop={() => { audioEngine.stop(); audioEngine.setPositionCallback(null); setIsPlaying(false); }}
              onBpmChange={() => {}}
            />
          </div>
        </>
      )}
    </div>
  );
}
