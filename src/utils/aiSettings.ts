const STORAGE_KEY = 'drop_dodge_needle_settings_v1';

export interface NeedleSettings {
  apiKey: string;
  model: string;
}

export const DEFAULT_NEEDLE_SETTINGS: NeedleSettings = {
  apiKey: '',
  model: 'claude-haiku-4-5-20251001',
};

/** The API key lives only in this browser's localStorage — never sent anywhere but the API host below. */
export function getNeedleSettings(): NeedleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NEEDLE_SETTINGS;
    return { ...DEFAULT_NEEDLE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NEEDLE_SETTINGS;
  }
}

export function saveNeedleSettings(settings: NeedleSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore — key just won't persist this session.
  }
}
