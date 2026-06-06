import { useState } from 'react';
import type { Lick, Note, NoteName, NoteAccidental, NoteDuration, ChordSymbol, Measure } from '../types/music';
import { createEmptyLick, createEmptyMeasure, getMeasureBeats, DURATION_VALUES } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import StaffRenderer from './StaffRenderer';
import PianoKeyboard from './PianoKeyboard';
import NoteToolbar from './NoteToolbar';
import PlaybackControls from './PlaybackControls';
import ChordEditor from './ChordEditor';

interface EditorViewProps {
  onSave: (lick: Lick) => void;
  editingLick?: Lick;
}

export default function EditorView({ onSave, editingLick }: EditorViewProps) {
  const [lick, setLick] = useState<Lick>(editingLick ?? createEmptyLick(4));
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [duration, setDuration] = useState<NoteDuration>('q');
  const [accidental, setAccidental] = useState<NoteAccidental>('');
  const [dotted, setDotted] = useState(false);
  const [isRest, setIsRest] = useState(false);
  const [octave, setOctave] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [drumsEnabled, setDrumsEnabled] = useState(true);
  const [bassEnabled, setBassEnabled] = useState(true);

  function updateMeasures(fn: (ms: Measure[]) => Measure[]) {
    setLick(prev => ({ ...prev, measures: fn(prev.measures) }));
  }

  function addNote(pitch: NoteName, noteOctave: number, noteAccidental: NoteAccidental) {
    const noteBeats = DURATION_VALUES[duration] * (dotted ? 1.5 : 1);
    const measure = lick.measures[currentMeasure];
    const usedBeats = getMeasureBeats(measure);

    if (usedBeats + noteBeats > 4) {
      // Auto-advance to next measure if possible
      if (currentMeasure < lick.measures.length - 1) {
        const nextBeat = DURATION_VALUES[duration] * (dotted ? 1.5 : 1);
        const nextUsed = getMeasureBeats(lick.measures[currentMeasure + 1]);
        if (nextUsed + nextBeat <= 4) {
          setCurrentMeasure(prev => prev + 1);
        }
      }
      return;
    }

    const note: Note = {
      id: crypto.randomUUID(),
      pitch: isRest ? 'b' : pitch,
      octave: isRest ? 4 : noteOctave,
      accidental: isRest ? '' : noteAccidental,
      duration,
      isDotted: dotted,
      isRest,
    };

    updateMeasures(ms =>
      ms.map((m, i) => i === currentMeasure ? { ...m, notes: [...m.notes, note] } : m)
    );

    // Auto-advance when measure is full
    const newUsed = usedBeats + noteBeats;
    if (newUsed >= 4 && currentMeasure < lick.measures.length - 1) {
      setCurrentMeasure(prev => prev + 1);
    }
  }

  function handleUndo() {
    updateMeasures(ms =>
      ms.map((m, i) => i === currentMeasure ? { ...m, notes: m.notes.slice(0, -1) } : m)
    );
  }

  function handleClear() {
    updateMeasures(ms =>
      ms.map((m, i) => i === currentMeasure ? { ...m, notes: [] } : m)
    );
  }

  function handleAddRest() {
    addNote('b', 4, '');
  }

  function handleAddChord(measureIdx: number, chord: Omit<ChordSymbol, 'id'>) {
    updateMeasures(ms =>
      ms.map((m, i) =>
        i === measureIdx
          ? { ...m, chords: [...m.chords, { ...chord, id: crypto.randomUUID() }] }
          : m
      )
    );
  }

  function handleRemoveChord(measureIdx: number, chordId: string) {
    updateMeasures(ms =>
      ms.map((m, i) =>
        i === measureIdx ? { ...m, chords: m.chords.filter(c => c.id !== chordId) } : m
      )
    );
  }

  async function handlePlay() {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    await audioEngine.play(lick, { drums: drumsEnabled, bass: bassEnabled });
  }

  function handleStop() {
    audioEngine.stop();
    setIsPlaying(false);
  }

  function handleSave() {
    onSave({ ...lick });
  }

  function handleBarsChange(bars: 4 | 8) {
    setLick(prev => {
      const currentBars = prev.measures.length;
      let measures = [...prev.measures];
      if (bars > currentBars) {
        while (measures.length < bars) measures.push(createEmptyMeasure());
      } else {
        measures = measures.slice(0, bars);
      }
      return { ...prev, bars, measures };
    });
    setCurrentMeasure(0);
  }

  return (
    <div className="space-y-4">
      {/* Lick metadata */}
      <div className="flex flex-wrap gap-3 items-center bg-gray-800 rounded-xl p-4 border border-gray-700">
        <input
          value={lick.name}
          onChange={e => setLick(prev => ({ ...prev, name: e.target.value }))}
          placeholder="릭 이름..."
          className="flex-1 min-w-[200px] bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-700 text-lg font-semibold focus:outline-none focus:border-purple-500"
        />
        <input
          value={lick.description}
          onChange={e => setLick(prev => ({ ...prev, description: e.target.value }))}
          placeholder="설명 (선택사항)..."
          className="flex-1 min-w-[200px] bg-gray-900 text-gray-300 rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-purple-500"
        />

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">마디:</span>
          {([4, 8] as const).map(b => (
            <button
              key={b}
              onClick={() => handleBarsChange(b)}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all
                ${lick.bars === b ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              {b}마디
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold shadow-lg shadow-purple-900/30 transition-all"
        >
          💾 저장
        </button>
      </div>

      {/* Staff display */}
      <div className="bg-white rounded-xl overflow-hidden shadow-xl">
        <StaffRenderer
          measures={lick.measures}
          currentMeasure={currentMeasure}
        />
      </div>

      {/* Measure selector */}
      <div className="flex gap-1 items-center bg-gray-800/60 rounded-xl p-2 border border-gray-700/50">
        <span className="text-gray-500 text-xs px-2">편집 마디:</span>
        {lick.measures.map((m, i) => {
          const used = getMeasureBeats(m);
          return (
            <button
              key={i}
              onClick={() => setCurrentMeasure(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all
                ${currentMeasure === i
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              {i + 1}
              <span className={`ml-1 text-xs ${used >= 4 ? 'text-green-400' : 'text-gray-500'}`}>
                {used >= 4 ? '✓' : `${used}/4`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Note toolbar */}
      <NoteToolbar
        duration={duration}
        accidental={accidental}
        dotted={dotted}
        isRest={isRest}
        onDuration={setDuration}
        onAccidental={setAccidental}
        onDotted={setDotted}
        onRest={setIsRest}
        onUndo={handleUndo}
        onClear={handleClear}
      />

      {/* Piano keyboard */}
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">음 입력</h3>
          <button
            onClick={handleAddRest}
            className="px-3 py-1 bg-orange-700/60 hover:bg-orange-700 text-orange-200 rounded text-xs transition-colors"
          >
            + 쉼표 추가
          </button>
        </div>
        <PianoKeyboard
          onNote={addNote}
          octave={octave}
          onOctaveChange={setOctave}
        />
      </div>

      {/* Chord editor */}
      <ChordEditor
        measures={lick.measures}
        currentMeasure={currentMeasure}
        onAddChord={handleAddChord}
        onRemoveChord={handleRemoveChord}
        onMeasureSelect={setCurrentMeasure}
      />

      {/* Playback controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        bpm={lick.bpm}
        rhythmPattern={lick.rhythmPattern}
        drumsEnabled={drumsEnabled}
        bassEnabled={bassEnabled}
        onPlay={handlePlay}
        onStop={handleStop}
        onBpmChange={bpm => setLick(prev => ({ ...prev, bpm }))}
        onRhythmChange={rhythmPattern => setLick(prev => ({ ...prev, rhythmPattern }))}
        onDrumsToggle={() => setDrumsEnabled(prev => !prev)}
        onBassToggle={() => setBassEnabled(prev => !prev)}
      />
    </div>
  );
}
