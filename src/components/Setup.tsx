import { useState, type ReactNode } from 'react';
import type { GameSettings } from '../game/types';
import { DEFAULT_NEEDLE_SETTINGS, getNeedleSettings, saveNeedleSettings } from '../utils/aiSettings';

interface Props {
  initialSettings: GameSettings;
  onStart: (settings: GameSettings) => void;
}

const TURN_COUNTS = [15, 25, 40, 60];
const DIFFICULTIES: GameSettings['difficulty'][] = ['EASY', 'NORMAL', 'HARD'];

const AI_OPTIONS: { value: GameSettings['aiDifficulty']; label: string }[] = [
  { value: 'TACTICAL', label: 'Tactical' },
  { value: 'STRATEGIC', label: 'Strategic' },
  { value: 'LEARNED', label: 'Learned' },
  { value: 'NEEDLE', label: 'Needle' },
];

const AI_DESCRIPTIONS: Record<GameSettings['aiDifficulty'], string> = {
  TACTICAL:
    'Single-turn risk lookahead — checks how many turns until each possible move gets hit and picks the safest one.',
  STRATEGIC:
    'Multi-move search — plays out several of its own future moves against the real physics engine to find the path that survives longest. Its attacker simulates against a Tactical defender to find the best drop.',
  LEARNED:
    'A small neural network trained offline via self-play (not hand-written rules or search) picks the defensive move. Attacking reuses Strategic’s simulation.',
  NEEDLE:
    'Tool-calling LLM opponent (Needle-style) — sends the board state to an AI model you configure below and lets it call a move/drop tool. Requires your own API key; falls back to Tactical AI automatically without one.',
};

export function Setup({ initialSettings, onStart }: Props) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [needleSettings, setNeedleSettings] = useState(() => getNeedleSettings());

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const updateNeedleKey = (apiKey: string) => {
    const next = { ...needleSettings, apiKey };
    setNeedleSettings(next);
    saveNeedleSettings(next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <h2 className="text-center text-2xl font-bold text-white">GAME SETUP</h2>

        <Section title="GAME MODE">
          <RadioRow
            options={[
              { value: 'PLAYER_DODGES', label: 'Player Dodges' },
              { value: 'PLAYER_ATTACKS', label: 'Player Attacks' },
            ]}
            value={settings.mode}
            onChange={(v) => update('mode', v as GameSettings['mode'])}
          />
        </Section>

        <Section title="AI OPPONENT">
          <RadioRow
            options={AI_OPTIONS}
            value={settings.aiDifficulty}
            onChange={(v) => update('aiDifficulty', v as GameSettings['aiDifficulty'])}
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{AI_DESCRIPTIONS[settings.aiDifficulty]}</p>

          {settings.aiDifficulty === 'NEEDLE' && (
            <div className="mt-3 space-y-2 rounded-lg bg-slate-900/60 p-3">
              <label className="block text-xs font-semibold text-slate-300">Anthropic API key</label>
              <input
                type="password"
                value={needleSettings.apiKey}
                onChange={(e) => updateNeedleKey(e.target.value)}
                placeholder={DEFAULT_NEEDLE_SETTINGS.apiKey ? '' : 'sk-ant-...'}
                className="w-full rounded-md bg-slate-700 px-3 py-2 text-sm text-slate-100"
              />
              <p className="text-xs leading-relaxed text-slate-500">
                Stored only in this browser and sent directly to Anthropic's API when it's your turn to
                face it — never to any other server. Leave it blank to automatically play against Tactical
                AI instead.
              </p>
            </div>
          )}
        </Section>

        <Section title="TURNS">
          <RadioRow
            options={TURN_COUNTS.map((t) => ({ value: String(t), label: `${t}` }))}
            value={String(settings.totalTurns)}
            onChange={(v) => update('totalTurns', Number(v))}
          />
        </Section>

        <Section title="DIFFICULTY">
          <RadioRow
            options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
            value={settings.difficulty}
            onChange={(v) => update('difficulty', v as GameSettings['difficulty'])}
          />
        </Section>
      </div>

      <div className="p-5 pt-0">
        <button
          onClick={() => onStart(settings)}
          className="w-full rounded-xl bg-orange-500 py-4 text-lg font-bold text-orange-950 shadow-lg active:scale-95 transition-transform"
        >
          START
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {children}
    </div>
  );
}

function RadioRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            value === opt.value ? 'bg-orange-500 text-orange-950' : 'bg-slate-700 text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
