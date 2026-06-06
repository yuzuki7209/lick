import { useState, useEffect } from 'react';
import type { Lick } from './types/music';
import EditorView from './components/EditorView';
import LibraryView from './components/LibraryView';
import PracticeView from './components/PracticeView';

type Tab = 'editor' | 'library' | 'practice';
const STORAGE_KEY = 'jazz-realbook-v2';

function loadLicks(): Lick[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('editor');
  const [licks, setLicks] = useState<Lick[]>(loadLicks);
  const [editingLick, setEditingLick] = useState<Lick | undefined>();

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(licks)); }, [licks]);

  function handleSave(lick: Lick) {
    setLicks(prev => {
      const idx = prev.findIndex(l => l.id === lick.id);
      return idx >= 0 ? prev.map((l, i) => i === idx ? lick : l) : [...prev, lick];
    });
    setTab('library');
    setEditingLick(undefined);
  }

  const tabs = [
    { id: 'editor' as Tab, label: '편집', icon: '✏️' },
    { id: 'library' as Tab, label: `악보 (${licks.length})`, icon: '♩' },
    { id: 'practice' as Tab, label: '연습', icon: '🎹' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f2e4]">
      {/* Header */}
      <header className="bg-[#1c1610] border-b border-[#3a2e18] sticky top-0 z-50 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-0 flex items-center">
          {/* Logo */}
          <div className="py-3 pr-8 border-r border-[#3a2e18] mr-6">
            <div className="font-serif font-bold text-[#f7f2e4] text-lg leading-none">Real Book</div>
            <div className="text-[#8b6914] text-[11px] tracking-widest uppercase mt-0.5 ui-sans">Jazz Notation</div>
          </div>

          {/* Nav tabs */}
          <nav className="flex">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-4 text-sm font-medium transition-all border-b-2 ui-sans
                  ${tab === t.id
                    ? 'text-[#c4a83a] border-[#c4a83a]'
                    : 'text-[#a08456] border-transparent hover:text-[#f7f2e4] hover:border-[#5c4a28]'}`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'editor' && (
          <EditorView key={editingLick?.id ?? 'new'} onSave={handleSave} editingLick={editingLick} />
        )}
        {tab === 'library' && (
          <LibraryView licks={licks} onEdit={l => { setEditingLick(l); setTab('editor'); }} onDelete={id => setLicks(p => p.filter(l => l.id !== id))} />
        )}
        {tab === 'practice' && <PracticeView licks={licks} />}
      </main>
    </div>
  );
}
