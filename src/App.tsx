import { useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { HowToPlay } from './components/HowToPlay';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MainMenu } from './components/MainMenu';
import { Results } from './components/Results';
import { Setup } from './components/Setup';
import type { GameSettings, GameState } from './game/types';
import {
  addLeaderboardEntry,
  clearLeaderboard,
  getLeaderboard,
  getPlayerName,
  getSettings,
  saveSettings,
  savePlayerName,
} from './utils/storage';

type Screen = 'menu' | 'setup' | 'playing' | 'results';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<GameSettings>(() => getSettings());
  const [gameRunId, setGameRunId] = useState(0);
  const [lastState, setLastState] = useState<GameState | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard());

  const startGame = (newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setLastState(null);
    setGameRunId((id) => id + 1);
    setScreen('playing');
  };

  const handleGameOver = (state: GameState) => {
    setLastState(state);
    setScreen('results');
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 select-none">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-slate-900 sm:h-[90vh] sm:rounded-[28px] sm:border-8 sm:border-slate-800 sm:shadow-2xl">
        {screen === 'menu' && (
          <MainMenu
            onPlay={() => setScreen('setup')}
            onOpenHowToPlay={() => setShowHowTo(true)}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
          />
        )}

        {screen === 'setup' && <Setup initialSettings={settings} onStart={startGame} />}

        {screen === 'playing' && <GameScreen key={gameRunId} settings={settings} onGameOver={handleGameOver} />}

        {screen === 'results' && lastState && (
          <Results
            state={lastState}
            defaultPlayerName={getPlayerName()}
            onSubmitScore={(name) => {
              savePlayerName(name);
              const updated = addLeaderboardEntry({
                playerName: name,
                score: lastState.score,
                mode: lastState.settings.mode,
                aiDifficulty: lastState.settings.aiDifficulty,
                difficulty: lastState.settings.difficulty,
                turnsSurvived: lastState.turn,
              });
              setLeaderboard(updated);
            }}
            onPlayAgain={() => startGame(settings)}
            onHome={() => setScreen('menu')}
          />
        )}

        {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}

        {showLeaderboard && (
          <LeaderboardModal
            entries={leaderboard}
            onClose={() => setShowLeaderboard(false)}
            onClear={() => {
              clearLeaderboard();
              setLeaderboard([]);
            }}
          />
        )}
      </div>
    </div>
  );
}
