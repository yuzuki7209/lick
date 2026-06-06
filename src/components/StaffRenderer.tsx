import { useEffect, useRef, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Barline } from 'vexflow';
import type { Measure, Note, NoteName, NoteAccidental } from '../types/music';

// ─── Treble clef pitch mapping ───────────────────────────────────────────────
// Step 0 = top line of treble clef = F5, going DOWN (positive step = lower pitch)
function trebleStepToNote(step: number): { pitch: NoteName; octave: number } | null {
  const NOTE_NAMES: NoteName[] = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
  const F5_DIATONIC = 5 * 7 + 3; // F is index 3 in CDEFGAB
  const abs = F5_DIATONIC - step;
  if (abs < 0 || abs > 60) return null;
  return { pitch: NOTE_NAMES[abs % 7], octave: Math.floor(abs / 7) };
}

// ─── VexFlow note builder ─────────────────────────────────────────────────────
function buildVexNote(note: Note): StaveNote {
  if (note.isRest) {
    const dur = note.isDotted ? note.duration + 'dr' : note.duration + 'r';
    return new StaveNote({ keys: ['b/4'], duration: dur });
  }
  const acc = note.accidental === '#' ? '#' : note.accidental === 'b' ? 'b' : '';
  const key = `${note.pitch}${acc}/${note.octave}`;
  const dur = note.isDotted ? note.duration + 'd' : note.duration;
  const vn = new StaveNote({ keys: [key], duration: dur });
  if (note.accidental === '#' || note.accidental === 'b' || note.accidental === 'n') {
    vn.addModifier(new Accidental(note.accidental), 0);
  }
  if (note.status === 'correct') vn.setStyle({ fillStyle: '#2d7a3a', strokeStyle: '#2d7a3a' });
  else if (note.status === 'wrong') vn.setStyle({ fillStyle: '#9b2020', strokeStyle: '#9b2020' });
  else if (note.status === 'active') vn.setStyle({ fillStyle: '#8b6914', strokeStyle: '#8b6914' });
  return vn;
}

// ─── Fill incomplete measure with rests ──────────────────────────────────────
const DUR_BEATS: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };

function padMeasure(notes: Note[]): Note[] {
  const used = notes.reduce((s, n) => s + (DUR_BEATS[n.duration] ?? 1) * (n.isDotted ? 1.5 : 1), 0);
  let rem = Math.max(0, 4 - used);
  const result = [...notes];
  for (const dur of ['w', 'h', 'q', '8', '16'] as Note['duration'][]) {
    while (rem >= (DUR_BEATS[dur] ?? 0) - 0.001) {
      result.push({ id: `r-${crypto.randomUUID()}`, pitch: 'b', octave: 4, accidental: '', duration: dur, isRest: true });
      rem -= DUR_BEATS[dur] ?? 0;
      if (rem < 0.01) break;
    }
    if (rem < 0.01) break;
  }
  return result;
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const MEASURES_PER_ROW = 4;
const BASE_STAVE_W = 200;
const FIRST_STAVE_EXTRA = 55; // extra for clef + time sig
const STAVE_PAD = 14;
const ROW_H = 140;
const TOP_MARGIN = 52;
const LINE_SPACING = 10; // VexFlow default px between staff lines

interface StaveData { measureIdx: number; x: number; topLineY: number; width: number; }

interface StaffRendererProps {
  measures: Measure[];
  currentMeasure?: number;
  pencilMode?: boolean;
  selectedDuration?: Note['duration'];
  selectedAccidental?: NoteAccidental;
  isDotted?: boolean;
  onPencilNote?: (measureIdx: number, pitch: NoteName, octave: number, accidental: NoteAccidental) => void;
}

export default function StaffRenderer({
  measures, currentMeasure, pencilMode,
  selectedDuration: _dur = 'q', selectedAccidental = '', isDotted: _dot = false,
  onPencilNote,
}: StaffRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const staveDataRef = useRef<StaveData[]>([]);
  const hoverRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    const container = containerRef.current;
    if (!container || measures.length === 0) return;
    container.innerHTML = '';
    staveDataRef.current = [];

    const rows = Math.ceil(measures.length / MEASURES_PER_ROW);
    const rowWidth = STAVE_PAD + MEASURES_PER_ROW * BASE_STAVE_W + FIRST_STAVE_EXTRA + STAVE_PAD;
    const totalH = rows * ROW_H + TOP_MARGIN + 20;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(rowWidth, totalH);
    const ctx = renderer.getContext();
    ctx.setFont('Arial', 10);

    for (let i = 0; i < measures.length; i++) {
      const row = Math.floor(i / MEASURES_PER_ROW);
      const col = i % MEASURES_PER_ROW;
      const isFirst = col === 0;
      const isLast = i === measures.length - 1;

      const staveW = isFirst ? BASE_STAVE_W + FIRST_STAVE_EXTRA : BASE_STAVE_W;
      let x = STAVE_PAD;
      for (let c = 0; c < col; c++) x += c === 0 ? BASE_STAVE_W + FIRST_STAVE_EXTRA : BASE_STAVE_W;
      const y = TOP_MARGIN + row * ROW_H;

      const stave = new Stave(x, y, staveW);
      if (isFirst) { stave.addClef('treble'); if (i === 0) stave.addTimeSignature('4/4'); }
      if (isLast) stave.setEndBarType(Barline.type.END);

      // Highlight current measure
      if (i === currentMeasure) {
        ctx.save();
        ctx.setFillStyle('rgba(139,105,20,0.07)');
        (ctx as unknown as { fillRect: (x:number,y:number,w:number,h:number)=>void }).fillRect?.(x, y - 12, staveW, 80);
        ctx.restore();
      }

      stave.setContext(ctx).draw();

      // Chord symbols
      const measure = measures[i];
      const contentX = isFirst ? x + FIRST_STAVE_EXTRA + 10 : x + 10;
      const contentW = staveW - (isFirst ? FIRST_STAVE_EXTRA + 15 : 15);
      for (const chord of measure.chords) {
        const cx = contentX + (chord.beatPosition / 4) * contentW;
        const label = `${chord.root}${chord.quality}${chord.bass ? `/${chord.bass}` : ''}`;
        ctx.save();
        ctx.setFont('Arial', 11, 'bold');
        ctx.setFillStyle('#8b6914');
        ctx.fillText(label, cx, y - 10);
        ctx.restore();
      }

      // Notes
      const padded = padMeasure(measure.notes);
      const vfNotes = padded.length > 0 ? padded.map(buildVexNote) : [new StaveNote({ keys: ['b/4'], duration: 'wr' })];
      try {
        const voice = new Voice({ numBeats: 4, beatValue: 4 });
        voice.setStrict(false);
        voice.addTickables(vfNotes);
        const fmtW = contentW - 10;
        new Formatter().joinVoices([voice]).format([voice], Math.max(fmtW, 80));
        voice.draw(ctx, stave);
      } catch { /* skip bad measure */ }

      // Store stave data for pencil mode
      staveDataRef.current.push({
        measureIdx: i,
        x,
        topLineY: stave.getYForLine(0),
        width: staveW,
      });
    }
  }, [measures, currentMeasure]);

  useEffect(() => { render(); }, [render]);

  // Pencil mode mouse handlers
  const getStepFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    for (const sd of staveDataRef.current) {
      if (cx >= sd.x && cx < sd.x + sd.width) {
        const step = Math.round((cy - sd.topLineY) / (LINE_SPACING / 2));
        return { stave: sd, step };
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pencilMode || !hoverRef.current) return;
    const hit = getStepFromEvent(e);
    if (!hit) { hoverRef.current.style.display = 'none'; return; }
    const note = trebleStepToNote(hit.step);
    if (!note) { hoverRef.current.style.display = 'none'; return; }
    const rect = containerRef.current!.getBoundingClientRect();
    const cy = e.clientY - rect.top;
    const snappedY = hit.stave.topLineY + hit.step * (LINE_SPACING / 2);
    hoverRef.current.style.display = 'block';
    hoverRef.current.style.left = `${e.clientX - rect.left - 6}px`;
    hoverRef.current.style.top = `${snappedY - 6}px`;
    hoverRef.current.title = `${note.pitch.toUpperCase()}${selectedAccidental}${note.octave}`;
    void cy;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pencilMode || !onPencilNote) return;
    const hit = getStepFromEvent(e);
    if (!hit) return;
    const note = trebleStepToNote(hit.step);
    if (!note) return;
    onPencilNote(hit.stave.measureIdx, note.pitch, note.octave, selectedAccidental);
  };

  return (
    <div className="relative staff-container">
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (hoverRef.current) hoverRef.current.style.display = 'none'; }}
        className={pencilMode ? 'pencil-mode' : ''}
        style={{ minHeight: 140 }}
      />
      {/* Hover indicator for pencil mode */}
      <div
        ref={hoverRef}
        style={{
          display: 'none', position: 'absolute', width: 12, height: 12,
          borderRadius: '50%', background: '#8b6914', opacity: 0.6,
          pointerEvents: 'none', zIndex: 10,
        }}
      />
    </div>
  );
}
