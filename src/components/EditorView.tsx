import { useState } from 'react';
import type { Lick, Note, NoteName, NoteAccidental, NoteDuration, Measure } from '../types/music';
import { createEmptyLick, createEmptyMeasure, getMeasureBeats, DURATION_VALUES } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import { useMidi } from '../hooks/useMidi';
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
  const [pencilMode, setPencilMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // MIDI recording
  const { isEnabled: midiEnabled, inputs, selectedInput, enable: enableMidi,
          isRecording, startRecording, stopRecording, selectInput } = useMidi();

  function updateMeasures(fn: (ms: Measure[]) => Measure[]) {
    setLick(prev => ({ ...prev, measures: fn(prev.measures) }));
  }

  function tryAddNote(pitch: NoteName, noteOctave: number, noteAcc: NoteAccidental) {
    const beatVal = DURATION_VALUES[duration] * (dotted ? 1.5 : 1);
    const measure = lick.measures[currentMeasure];
    const used = getMeasureBeats(measure);
    if (used + beatVal > 4.001) {
      // Try next measure
      if (currentMeasure < lick.measures.length - 1) {
        const nextUsed = getMeasureBeats(lick.measures[currentMeasure + 1]);
        if (nextUsed + beatVal <= 4.001) setCurrentMeasure(m => m + 1);
      }
      return;
    }
    const note: Note = {
      id: crypto.randomUUID(),
      pitch: isRest ? 'b' : pitch,
      octave: isRest ? 4 : noteOctave,
      accidental: isRest ? '' : noteAcc,
      duration,
      isDotted: dotted,
      isRest,
      status: 'neutral',
    };
    updateMeasures(ms => ms.map((m, i) => i === currentMeasure ? { ...m, notes: [...m.notes, note] } : m));
    if (used + beatVal >= 3.999 && currentMeasure < lick.measures.length - 1) {
      setCurrentMeasure(m => m + 1);
    }
  }

  // Pencil mode: pitch from staff click
  function handlePencilNote(measureIdx: number, pitch: NoteName, noteOctave: number, noteAcc: NoteAccidental) {
    setCurrentMeasure(measureIdx);
    const beatVal = DURATION_VALUES[duration] * (dotted ? 1.5 : 1);
    const used = getMeasureBeats(lick.measures[measureIdx]);
    if (used + beatVal > 4.001) return;
    const note: Note = {
      id: crypto.randomUUID(),
      pitch, octave: noteOctave, accidental: noteAcc,
      duration, isDotted: dotted, isRest: false, status: 'neutral',
    };
    updateMeasures(ms => ms.map((m, i) => i === measureIdx ? { ...m, notes: [...m.notes, note] } : m));
  }

  // MIDI recording → notes
  function handleStopRecording() {
    const notes = stopRecording(lick.bpm);
    if (notes.length === 0) return;
    // Fill current measure with recorded notes (up to 4 beats)
    updateMeasures(ms => ms.map((m, i) => {
      if (i !== currentMeasure) return m;
      const combined = [...m.notes, ...notes];
      let total = 0;
      const trimmed = combined.filter(n => {
        const v = DURATION_VALUES[n.duration] * (n.isDotted ? 1.5 : 1);
        if (total + v > 4.001) return false;
        total += v;
        return true;
      });
      return { ...m, notes: trimmed };
    }));
  }

  async function handlePlay() {
    if (isPlaying) { audioEngine.stop(); setIsPlaying(false); return; }
    setIsPlaying(true);
    await audioEngine.play(lick);
  }

  function handleBarsChange(bars: 4 | 8) {
    setLick(prev => {
      let measures = [...prev.measures];
      if (bars > measures.length) while (measures.length < bars) measures.push(createEmptyMeasure());
      else measures = measures.slice(0, bars);
      return { ...prev, bars, measures };
    });
    setCurrentMeasure(0);
  }

  const usedBeats = getMeasureBeats(lick.measures[currentMeasure]);

  return (
    <div className="space-y-4">
      {/* Header: title + bars + save */}
      <div className="flex flex-wrap gap-3 items-center bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-4 shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-2">
          <input value={lick.name} onChange={e => setLick(p => ({ ...p, name: e.target.value }))}
            placeholder="곡 이름..." className="w-full text-xl font-serif font-bold text-[#1c1610] bg-transparent border-b border-[#d4c4a0] focus:border-[#8b6914] focus:outline-none pb-1" />
          <input value={lick.description} onChange={e => setLick(p => ({ ...p, description: e.target.value }))}
            placeholder="설명 (선택)..." className="w-full text-sm text-[#8b6914] bg-transparent focus:outline-none ui-sans" />
        </div>
        <div className="flex items-center gap-2 ui-sans">
          <span className="text-xs text-[#a08456]">마디</span>
          {([4, 8] as const).map(b => (
            <button key={b} onClick={() => handleBarsChange(b)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all
                ${lick.bars === b ? 'bg-[#1c1610] text-[#f7f2e4] border-[#1c1610]' : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
            >{b}마디</button>
          ))}
        </div>
        <button onClick={() => onSave({ ...lick })}
          className="px-5 py-2 bg-[#8b6914] hover:bg-[#6b5010] text-white rounded-xl font-semibold shadow-md ui-sans transition-all">
          저장
        </button>
      </div>

      {/* Staff */}
      <StaffRenderer
        measures={lick.measures}
        currentMeasure={currentMeasure}
        pencilMode={pencilMode}
        selectedDuration={duration}
        selectedAccidental={accidental}
        isDotted={dotted}
        onPencilNote={handlePencilNote}
      />

      {/* Measure selector */}
      <div className="flex gap-1.5 items-center flex-wrap ui-sans">
        <span className="text-xs text-[#a08456] font-medium">마디 선택:</span>
        {lick.measures.map((m, i) => {
          const beats = getMeasureBeats(m);
          return (
            <button key={i} onClick={() => setCurrentMeasure(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all
                ${currentMeasure === i ? 'bg-[#1c1610] text-[#f7f2e4] border-[#1c1610]' : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
            >
              {i + 1}
              <span className={`ml-1 ${beats >= 4 ? 'text-[#2d7a3a]' : 'text-[#a08456]'}`}>
                {beats >= 4 ? '✓' : `${beats}`}
              </span>
            </button>
          );
        })}
        <span className="text-xs text-[#a08456] ml-1">
          {currentMeasure + 1}번 마디: {usedBeats.toFixed(2)}/4박
        </span>
      </div>

      {/* Note toolbar */}
      <NoteToolbar
        duration={duration} accidental={accidental} dotted={dotted} isRest={isRest} pencilMode={pencilMode}
        onDuration={setDuration} onAccidental={setAccidental} onDotted={setDotted}
        onRest={setIsRest} onPencilMode={setPencilMode}
        onUndo={() => updateMeasures(ms => ms.map((m, i) => i === currentMeasure ? { ...m, notes: m.notes.slice(0, -1) } : m))}
        onClear={() => updateMeasures(ms => ms.map((m, i) => i === currentMeasure ? { ...m, notes: [] } : m))}
      />

      {/* Piano keyboard (hidden in pencil mode) */}
      {!pencilMode && (
        <div className="bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-4 shadow-sm flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 w-full ui-sans">
            <span className="text-xs font-bold text-[#8b6914] uppercase tracking-widest">피아노 입력</span>
            <button onClick={() => tryAddNote('b', 4, '')}
              className="px-3 py-1 text-xs bg-[#f7f2e4] border border-[#d4c4a0] text-[#5c4a28] rounded hover:bg-[#ede4cc] transition-colors">
              + 쉼표
            </button>
          </div>
          <PianoKeyboard onNote={tryAddNote} octave={octave} onOctaveChange={setOctave} />
        </div>
      )}

      {pencilMode && (
        <div className="bg-[#fffef8] border border-[#d4c4a0] rounded-xl p-4 text-center ui-sans">
          <p className="text-[#8b6914] text-sm font-medium">✏️ 연필 모드 활성화</p>
          <p className="text-[#a08456] text-xs mt-1">오선지 위를 클릭하면 해당 음이 입력됩니다. 상단 툴바에서 음표 길이·임시표를 먼저 선택하세요.</p>
        </div>
      )}

      {/* MIDI recording */}
      <div className="bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-4 shadow-sm ui-sans">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-[#8b6914] uppercase tracking-widest">MIDI 녹음</span>
          {!midiEnabled ? (
            <button onClick={enableMidi}
              className="px-3 py-1.5 text-xs bg-[#1c1610] text-[#f7f2e4] rounded-lg hover:bg-[#3a2e18] transition-colors">
              🎹 MIDI 연결
            </button>
          ) : (
            <>
              {inputs.length > 1 && (
                <select value={selectedInput} onChange={e => selectInput(Number(e.target.value))}
                  className="bg-[#f7f2e4] border border-[#d4c4a0] rounded px-2 py-1 text-xs text-[#1c1610]">
                  {inputs.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
              )}
              {inputs.length === 0 && <span className="text-xs text-[#a08456]">연결된 MIDI 장치 없음</span>}
              {inputs.length > 0 && (
                <span className="text-xs text-[#2d7a3a] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2d7a3a] animate-pulse inline-block" />
                  {inputs[selectedInput] ?? inputs[0]}
                </span>
              )}
              {!isRecording ? (
                <button onClick={startRecording}
                  className="px-3 py-1.5 text-xs bg-[#9b2020] text-white rounded-lg hover:bg-[#7a1818] transition-colors font-semibold">
                  ● 녹음 시작
                </button>
              ) : (
                <button onClick={handleStopRecording}
                  className="px-3 py-1.5 text-xs bg-[#2d7a3a] text-white rounded-lg hover:bg-[#1f5429] transition-colors font-semibold animate-pulse">
                  ■ 녹음 중지 → 악보 변환
                </button>
              )}
            </>
          )}
          <span className="text-[10px] text-[#c4b89a]">녹음 후 현재 마디에 자동으로 음표가 추가됩니다</span>
        </div>
      </div>

      {/* Chord editor */}
      <ChordEditor
        measures={lick.measures}
        currentMeasure={currentMeasure}
        onAddChord={(mIdx, chord) => updateMeasures(ms => ms.map((m, i) => i === mIdx ? { ...m, chords: [...m.chords, { ...chord, id: crypto.randomUUID() }] } : m))}
        onRemoveChord={(mIdx, cid) => updateMeasures(ms => ms.map((m, i) => i === mIdx ? { ...m, chords: m.chords.filter(c => c.id !== cid) } : m))}
        onMeasureSelect={setCurrentMeasure}
      />

      {/* Playback */}
      <PlaybackControls
        isPlaying={isPlaying} bpm={lick.bpm}
        onPlay={handlePlay} onStop={() => { audioEngine.stop(); setIsPlaying(false); }}
        onBpmChange={bpm => setLick(p => ({ ...p, bpm }))}
      />
    </div>
  );
}
