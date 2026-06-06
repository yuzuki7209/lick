import { useState, useEffect } from 'react';
import type { Lick } from './types/music';
import EditorView from './components/EditorView';
import LibraryView from './components/LibraryView';
import PracticeView from './components/PracticeView';

type Tab = 'editor' | 'library' | 'practice';

const STORAGE_KEY = 'jazz-lick-library';

function loadLicks(): Lick[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLicks(licks: Lick[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(licks));
}

export default function App() {
  const [tab, setTab] = useState<Tab>('editor');
  const [licks, setLicks] = useState<Lick[]>(loadLicks);
  const [editingLick, setEditingLick] = useState<Lick | undefined>();

  useEffect(() => {
    saveLicks(licks);
  }, [licks]);

  function handleSaveLick(lick: Lick) {
    setLicks(prev => {
      const exists = prev.findIndex(l => l.id === lick.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = lick;
        return updated;
      }
      return [...prev, lick];
    });
    setTab('library');
    setEditingLick(undefined);
  }

  function handleEditLick(lick: Lick) {
    setEditingLick(lick);
    setTab('editor');
  }

  function handleDeleteLick(id: string) {
    setLicks(prev => prev.filter(l => l.id !== id));
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'editor', label: '편집기', icon: '✏️' },
    { id: 'library', label: `라이브러리 (${licks.length})`, icon: '📚' },
    { id: 'practice', label: '연습', icon: '🎹' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎷</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Jazz Lick Trainer</h1>
              <p className="text-xs text-gray-500">재즈 릭 연습 앱</p>
            </div>
          </div>

          <nav className="flex gap-1 ml-4">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === t.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'editor' && (
          <EditorView
            key={editingLick?.id ?? 'new'}
            onSave={handleSaveLick}
            editingLick={editingLick}
          />
        )}
        {tab === 'library' && (
          <LibraryView
            licks={licks}
            onEdit={handleEditLick}
            onDelete={handleDeleteLick}
          />
        )}
        {tab === 'practice' && (
          <PracticeView licks={licks} />
        )}
      </main>
    </div>
  );
}
