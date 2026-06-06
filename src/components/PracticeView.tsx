import { useState, useCallback, useRef } from 'react';
import type { Lick, Note, Measure } from '../types/music';
import { noteToMidi, CHORD_TONES, NOTE_TO_SEMITONE } from '../types/music';
import { useMidi, type MidiNote } from '../hooks/useMidi';
import { audioEngine } from '../utils/audioEngine';
import StaffRenderer from './StaffRenderer';
import PlaybackControls from './PlaybackControls';

interface PracticeViewProps {
  licks: Lick[];
}

type NoteStatus = 'neutral' | 'correct' | 'wrong' | 'active';

interface PracticeState {
  measureIdx: number;
  noteIdx: number;
  noteStatuses: Map<string, NoteStatus>; // noteId → status
}

function getExpectedMidi(note: Note): number {
  return noteToMidi(note);
}

function getChordMidis(measure: Measure): Set<number> {
  const midis = new Set<number>();
  for (const chord of measure.chords) {
    const root = NOTE_TO_SEMITONE[chord.root] ?? 0;
    const tones = CHORD_TONES[chord.quality] ?? [0, 4, 7];
    for (const tone of tones) {
      // Add across multiple octaves
      for (let oct = 1; oct <= 6; oct++) {
        midis.add((oct + 1) * 12 + root + tone);
      }
    }
  }
  return midis;
}

function getAllNotes(lick: Lick): { note: Note; measureIdx: number; noteIdx: number }[] {
  const all: { note: Note; measureIdx: number; noteIdx: number }[] = [];
  for (let mi = 0; mi < lick.measures.length; mi++) {
    const notes = lick.measures[mi].notes.filter(n => !n.isRest);
    for (let ni = 0; ni < notes.length; ni++) {
      all.push({ note: notes[ni], measureIdx: mi, noteIdx: ni });
    }
  }
  return all;
}

export default function PracticeView({ licks }: PracticeViewProps) {
  const [selectedLick, setSelectedLick] = useState<Lick | null>(null);
  const [practiceState, setPracticeState] = useState<PracticeState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [drumsEnabled, setDrumsEnabled] = useState(true);
  const [bassEnabled, setBassEnabled] = useState(true);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [practiceMode, setPracticeMode] = useState<'melody' | 'chord'>('melody');
  const [, setChordStatuses] = useState<Map<string, NoteStatus>>(new Map());
  const [currentPlayMeasure, setCurrentPlayMeasure] = useState(0);
  const [currentPlayBeat, setCurrentPlayBeat] = useState(0);

  const allNotesRef = useRef<{ note: Note; measureIdx: number; noteIdx: number }[]>([]);

  function startPractice(lick: Lick) {
    setSelectedLick(lick);
    allNotesRef.current = getAllNotes(lick);
    const statuses = new Map<string, NoteStatus>();

    // Mark all melody notes as neutral
    for (const { note } of allNotesRef.current) {
      statuses.set(note.id, 'neutral');
    }

    // Find first non-rest note
    const firstNonRest = allNotesRef.current[0];
    if (firstNonRest) {
      statuses.set(firstNonRest.note.id, 'active');
    }

    setPracticeState({
      measureIdx: firstNonRest?.measureIdx ?? 0,
      noteIdx: 0,
      noteStatuses: statuses,
    });
    setScore({ correct: 0, wrong: 0 });
    setChordStatuses(new Map());
  }

  function resetPractice() {
    if (selectedLick) startPractice(selectedLick);
  }

  // Build display measures with status applied
  const displayMeasures = selectedLick
    ? selectedLick.measures.map(m => ({
        ...m,
        notes: m.notes.map(n => ({
          ...n,
          status: practiceState?.noteStatuses.get(n.id) ?? 'neutral',
        })),
      }))
    : [];

  const handleNoteOn = useCallback((midiNote: MidiNote) => {
    if (!selectedLick || !practiceState) return;

    if (practiceMode === 'melody') {
      const allNotes = allNotesRef.current;
      const currentEntry = allNotes.find(
        e => e.measureIdx === practiceState.measureIdx &&
             e.note.id === [...practiceState.noteStatuses.entries()]
               .find(([, s]) => s === 'active')?.[0]
      );

      if (!currentEntry) return;

      const expected = getExpectedMidi(currentEntry.note);
      // Allow an octave tolerance for ease
      const isCorrect = Math.abs(midiNote.number - expected) % 12 === 0;
      const status: NoteStatus = isCorrect ? 'correct' : 'wrong';

      setScore(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1),
      }));

      // Update statuses
      const newStatuses = new Map(practiceState.noteStatuses);
      newStatuses.set(currentEntry.note.id, status);

      // Find next note
      const currentIdx = allNotes.indexOf(currentEntry);
      const nextEntry = allNotes[currentIdx + 1];

      if (nextEntry) {
        newStatuses.set(nextEntry.note.id, 'active');
        setPracticeState({
          measureIdx: nextEntry.measureIdx,
          noteIdx: nextEntry.noteIdx,
          noteStatuses: newStatuses,
        });
      } else {
        // Completed!
        setPracticeState({ ...practiceState, noteStatuses: newStatuses });
      }
    } else {
      // Chord mode: check if played note is in the current measure's chord
      const measure = selectedLick.measures[practiceState.measureIdx];
      const chordMidis = getChordMidis(measure);
      const isCorrect = chordMidis.has(midiNote.number);
      const noteKey = `${midiNote.number}`;

      setChordStatuses(prev => new Map(prev).set(noteKey, isCorrect ? 'correct' : 'wrong'));
      setScore(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1),
      }));
    }
  }, [selectedLick, practiceState, practiceMode]);

  const { isSupported, isEnabled, inputs, enable, error } = useMidi(handleNoteOn);

  async function handlePlay() {
    if (!selectedLick) return;
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    audioEngine.setPositionCallback((mi, bi) => {
      setCurrentPlayMeasure(mi);
      setCurrentPlayBeat(bi);
    });
    await audioEngine.play(selectedLick, { drums: drumsEnabled, bass: bassEnabled, melody: false });
  }

  function handleStop() {
    audioEngine.stop();
    audioEngine.setPositionCallback(null);
    setIsPlaying(false);
  }

  const accuracy = score.correct + score.wrong > 0
    ? Math.round(score.correct / (score.correct + score.wrong) * 100)
    : null;

  if (licks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🎹</div>
        <h3 className="text-xl font-semibold text-gray-400 mb-2">연습할 릭이 없습니다</h3>
        <p className="text-gray-600 text-sm">먼저 편집기에서 릭을 만들어 저장하세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lick selection */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">연습할 릭 선택</h3>
        <div className="flex flex-wrap gap-2">
          {licks.map(lick => (
            <button
              key={lick.id}
              onClick={() => startPractice(lick)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${selectedLick?.id === lick.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {lick.name}
              <span className="ml-2 text-xs opacity-60">{lick.bars}마디</span>
            </button>
          ))}
        </div>
      </div>

      {selectedLick && (
        <>
          {/* MIDI input status */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">MIDI 입력</h3>
                {isEnabled ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 text-sm">
                      연결됨 {inputs.length > 0 ? `(${inputs.join(', ')})` : '(디바이스 없음)'}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">MIDI 미연결</span>
                )}
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
              </div>

              <div className="flex gap-2 items-center">
                {!isEnabled && isSupported && (
                  <button
                    onClick={enable}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    🎹 MIDI 활성화
                  </button>
                )}
                {!isSupported && (
                  <span className="text-red-400 text-xs">Chrome 브라우저 필요</span>
                )}

                {/* Practice mode */}
                <div className="flex gap-1">
                  {(['melody', 'chord'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPracticeMode(mode)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all
                        ${practiceMode === mode ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                      {mode === 'melody' ? '🎵 멜로디' : '🎼 코드'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Score display */}
          <div className="flex gap-4 bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">정확도</span>
              <span className={`text-3xl font-bold ${
                accuracy === null ? 'text-gray-600' :
                accuracy >= 80 ? 'text-green-400' :
                accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {accuracy !== null ? `${accuracy}%` : '-'}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">정답</span>
              <span className="text-2xl font-bold text-green-400">{score.correct}</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">오답</span>
              <span className="text-2xl font-bold text-red-400">{score.wrong}</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={resetPractice}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
              >
                🔄 초기화
              </button>
            </div>
          </div>

          {/* Staff with note status coloring */}
          <div className="bg-white rounded-xl overflow-hidden shadow-xl">
            <StaffRenderer
              measures={displayMeasures}
              currentMeasure={currentPlayMeasure}
              currentBeat={currentPlayBeat}
              practiceMode={true}
            />
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 bg-gray-800/40 rounded-xl p-3 border border-gray-700/40">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 현재 위치
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> 정답
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> 오답
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" /> 미연주
            </span>
          </div>

          {/* Backing track playback */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 px-1">반주 재생 (멜로디 없이 드럼+베이스만)</p>
            <PlaybackControls
              isPlaying={isPlaying}
              bpm={selectedLick.bpm}
              rhythmPattern={selectedLick.rhythmPattern}
              drumsEnabled={drumsEnabled}
              bassEnabled={bassEnabled}
              onPlay={handlePlay}
              onStop={handleStop}
              onBpmChange={() => {}}
              onRhythmChange={() => {}}
              onDrumsToggle={() => setDrumsEnabled(p => !p)}
              onBassToggle={() => setBassEnabled(p => !p)}
            />
          </div>
        </>
      )}
    </div>
  );
}
