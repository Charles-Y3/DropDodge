import type { GameSettings } from '../game/types';

const STORAGE_KEYS = {
  SETTINGS: 'drop_dodge_settings_v1',
  LEADERBOARD: 'drop_dodge_leaderboard_v1',
  PLAYER_NAME: 'drop_dodge_player_name_v1',
};

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  mode: GameSettings['mode'];
  aiDifficulty: GameSettings['aiDifficulty'];
  difficulty: GameSettings['difficulty'];
  turnsSurvived: number;
  date: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  mode: 'PLAYER_DODGES',
  aiDifficulty: 'TACTICAL',
  totalTurns: 30,
  turnIntervalSeconds: 0.8,
  difficulty: 'NORMAL',
};

export function getSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Storage blocked (private mode, quota) — settings just won't persist.
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'date'>): LeaderboardEntry[] {
  const current = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `lb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().split('T')[0],
  };

  const updated = [...current, newEntry].sort((a, b) => b.score - a.score).slice(0, 20);

  try {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(updated));
  } catch {
    // Ignore — leaderboard just won't persist this entry.
  }
  return updated;
}

export function getPlayerName(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || 'Player';
  } catch {
    return 'Player';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
  } catch {
    // Ignore
  }
}

export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.LEADERBOARD);
  } catch {
    // Ignore
  }
}
