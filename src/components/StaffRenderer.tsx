import { useEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
  Barline,
} from 'vexflow';
import type { Measure, Note } from '../types/music';

interface StaffRendererProps {
  measures: Measure[];
  currentMeasure?: number;
  currentBeat?: number;
  practiceMode?: boolean;
}

const MEASURES_PER_ROW = 4;
const STAVE_WIDTH = 190;
const STAVE_PADDING = 12;
const ROW_HEIGHT = 130;
const TOP_MARGIN = 50;

function buildVexNote(note: Note): StaveNote {
  let key: string;
  let duration = note.duration;
  const dotted = note.isDotted;

  if (note.isRest) {
    const restDur = dotted ? duration + 'dr' : duration + 'r';
    return new StaveNote({ keys: ['b/4'], duration: restDur });
  }

  const acc = note.accidental === '#' ? '#' : note.accidental === 'b' ? 'b' : '';
  key = `${note.pitch}${acc}/${note.octave}`;

  const vfDur = dotted ? duration + 'd' : duration;
  const vfNote = new StaveNote({ keys: [key], duration: vfDur });

  if (note.accidental === '#' || note.accidental === 'b' || note.accidental === 'n') {
    vfNote.addModifier(new Accidental(note.accidental), 0);
  }

  // Color based on practice status
  if (note.status === 'correct') {
    vfNote.setStyle({ fillStyle: '#22c55e', strokeStyle: '#22c55e' });
  } else if (note.status === 'wrong') {
    vfNote.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
  } else if (note.status === 'active') {
    vfNote.setStyle({ fillStyle: '#f59e0b', strokeStyle: '#f59e0b' });
  }

  return vfNote;
}

function padMeasureToFull(notes: Note[], beatsTotal = 4): Note[] {
  const DURATION_BEATS: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };
  const usedBeats = notes.reduce((s, n) => {
    const base = DURATION_BEATS[n.duration] ?? 1;
    return s + (n.isDotted ? base * 1.5 : base);
  }, 0);

  const remaining = beatsTotal - usedBeats;
  if (remaining <= 0) return notes;

  // Fill with a whole rest or multiple rests
  const padded = [...notes];
  let rem = remaining;
  const durations: Array<Note['duration']> = ['w', 'h', 'q', '8', '16'];
  const durBeats: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };

  for (const dur of durations) {
    while (rem >= durBeats[dur]) {
      padded.push({
        id: `pad-${crypto.randomUUID()}`,
        pitch: 'b', octave: 4, accidental: '', duration: dur, isRest: true,
      });
      rem -= durBeats[dur];
    }
  }

  return padded;
}

export default function StaffRenderer({ measures, currentMeasure, currentBeat, practiceMode }: StaffRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || measures.length === 0) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const rows = Math.ceil(measures.length / MEASURES_PER_ROW);
    const totalWidth = MEASURES_PER_ROW * STAVE_WIDTH + STAVE_PADDING * 2 + 40;
    const totalHeight = rows * ROW_HEIGHT + TOP_MARGIN + 20;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(totalWidth, totalHeight);
    const context = renderer.getContext();
    context.setFont('Arial', 10);

    for (let i = 0; i < measures.length; i++) {
      const row = Math.floor(i / MEASURES_PER_ROW);
      const col = i % MEASURES_PER_ROW;

      const isFirstInRow = col === 0;
      const isLastInRow = col === MEASURES_PER_ROW - 1 || i === measures.length - 1;
      const isLast = i === measures.length - 1;

      const x = STAVE_PADDING + col * STAVE_WIDTH;
      const y = TOP_MARGIN + row * ROW_HEIGHT;

      const stave = new Stave(x, y, STAVE_WIDTH - (isLastInRow ? 2 : 0));

      if (isFirstInRow) {
        stave.addClef('treble');
        if (i === 0) stave.addTimeSignature('4/4');
      }

      if (isLast) {
        stave.setEndBarType(Barline.type.END);
      }

      stave.setContext(context).draw();

      // Draw chord symbols above the stave
      const measure = measures[i];
      for (const chord of measure.chords) {
        const beatFraction = chord.beatPosition / 4;
        const chordX = x + (isFirstInRow ? 50 : 10) + beatFraction * (STAVE_WIDTH - (isFirstInRow ? 60 : 20));
        const chordText = `${chord.root}${chord.quality}${chord.bass ? `/${chord.bass}` : ''}`;

        // Draw chord text above the stave
        context.save();
        context.setFont('Arial', 11, 'bold');
        context.setFillStyle('#c084fc');
        context.fillText(chordText, chordX, y - 8);
        context.restore();
      }

      // Highlight current measure
      if (practiceMode && i === currentMeasure) {
        context.save();
        context.setFillStyle('rgba(251,191,36,0.08)');
        (context as unknown as CanvasRenderingContext2D).fillRect?.(x, y - 10, STAVE_WIDTH, 80);
        context.restore();
      }

      // Build VexFlow notes
      const paddedNotes = padMeasureToFull(measure.notes);
      if (paddedNotes.length === 0) {
        // Whole rest for empty measure
        const restNote = new StaveNote({ keys: ['b/4'], duration: 'wr' });
        const voice = new Voice({ numBeats: 4, beatValue: 4 });
        voice.setStrict(false);
        voice.addTickables([restNote]);
        new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - (isFirstInRow ? 60 : 20));
        voice.draw(context, stave);
        continue;
      }

      try {
        const vfNotes = paddedNotes.map(buildVexNote);
        const voice = new Voice({ numBeats: 4, beatValue: 4 });
        voice.setStrict(false);
        voice.addTickables(vfNotes);

        const formatWidth = STAVE_WIDTH - (isFirstInRow ? 65 : 25);
        new Formatter().joinVoices([voice]).format([voice], formatWidth);
        voice.draw(context, stave);
      } catch {
        // Silently handle malformed measures
      }
    }
  }, [measures, currentMeasure, currentBeat, practiceMode]);

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto bg-white rounded-lg shadow-inner"
      style={{ minHeight: '140px' }}
    />
  );
}
