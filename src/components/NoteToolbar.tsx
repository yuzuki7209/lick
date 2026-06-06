import type { NoteDuration, NoteAccidental } from '../types/music';

interface NoteToolbarProps {
  duration: NoteDuration;
  accidental: NoteAccidental;
  dotted: boolean;
  isRest: boolean;
  pencilMode: boolean;
  onDuration: (d: NoteDuration) => void;
  onAccidental: (a: NoteAccidental) => void;
  onDotted: (v: boolean) => void;
  onRest: (v: boolean) => void;
  onPencilMode: (v: boolean) => void;
  onUndo: () => void;
  onClear: () => void;
}

const DURATIONS: { value: NoteDuration; label: string; sub: string }[] = [
  { value: 'w',   label: '온음표',    sub: '4박' },
  { value: 'h',   label: '2분음표',   sub: '2박' },
  { value: 'q',   label: '4분음표',   sub: '1박' },
  { value: '8',   label: '8분음표',   sub: '½박' },
  { value: '16',  label: '16분음표',  sub: '¼박' },
];

const ACCIDENTALS: { value: NoteAccidental; label: string }[] = [
  { value: '',  label: '♮ 없음' },
  { value: '#', label: '♯ 샵' },
  { value: 'b', label: '♭ 플랫' },
  { value: 'n', label: '♮ 내추럴' },
];

export default function NoteToolbar({
  duration, accidental, dotted, isRest, pencilMode,
  onDuration, onAccidental, onDotted, onRest, onPencilMode, onUndo, onClear,
}: NoteToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center bg-[#fffef9] border border-[#d4c4a0] rounded-xl p-3 shadow-sm ui-sans">

      {/* Pencil mode toggle */}
      <button
        onClick={() => onPencilMode(!pencilMode)}
        title="연필 모드: 오선지 클릭으로 음 입력"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all
          ${pencilMode
            ? 'bg-[#8b6914] text-white border-[#6b5010] shadow-md'
            : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
      >
        ✏️ 연필
      </button>

      <div className="w-px h-8 bg-[#d4c4a0]" />

      {/* Duration buttons */}
      <div className="flex gap-1">
        {DURATIONS.map(d => (
          <button
            key={d.value}
            onClick={() => onDuration(d.value)}
            title={`${d.label} (${d.sub})`}
            className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all min-w-[46px]
              ${duration === d.value
                ? 'bg-[#1c1610] text-[#f7f2e4] border-[#1c1610] shadow'
                : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
          >
            <span className="text-base leading-none">{d.label[0]}</span>
            <span className="text-[10px] leading-none mt-0.5 opacity-70">{d.sub}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-[#d4c4a0]" />

      {/* Accidental */}
      <div className="flex gap-1">
        {ACCIDENTALS.map(a => (
          <button
            key={a.value}
            onClick={() => onAccidental(a.value)}
            className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-all
              ${accidental === a.value
                ? 'bg-[#5c4a28] text-white border-[#3a2e18]'
                : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-[#d4c4a0]" />

      {/* Dotted */}
      <button
        onClick={() => onDotted(!dotted)}
        title="점음표"
        className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all
          ${dotted
            ? 'bg-[#5c4a28] text-white border-[#3a2e18]'
            : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
      >
        ·점
      </button>

      {/* Rest */}
      <button
        onClick={() => onRest(!isRest)}
        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all
          ${isRest
            ? 'bg-[#8b6914] text-white border-[#6b5010]'
            : 'bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc]'}`}
      >
        쉼표
      </button>

      <div className="flex-1" />

      <button
        onClick={onUndo}
        className="px-3 py-2 rounded-lg text-xs border bg-[#f7f2e4] text-[#5c4a28] border-[#d4c4a0] hover:bg-[#ede4cc] transition-colors"
      >
        ↩ 취소
      </button>
      <button
        onClick={onClear}
        className="px-3 py-2 rounded-lg text-xs border bg-[#fdf0f0] text-[#9b2020] border-[#e8c4c4] hover:bg-[#f8e0e0] transition-colors"
      >
        🗑 지우기
      </button>
    </div>
  );
}
