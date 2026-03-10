export type WinstonPrefs = {
  cloakMode: boolean;
  cloakTitle: string;
  cloakFaviconUrl: string;
  cloakAboutBlank: boolean;
};

export const PREFS_STORAGE_KEY = 'winston_prefs_v1';

export const defaultPrefs: WinstonPrefs = {
  cloakMode: false,
  cloakTitle: 'Google',
  cloakFaviconUrl: 'https://www.google.com/favicon.ico',
  cloakAboutBlank: false,
};

export function loadPrefs(): WinstonPrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<WinstonPrefs>;
    return { ...defaultPrefs, ...parsed };
  } catch {
    return defaultPrefs;
  }
}

export function savePrefs(prefs: WinstonPrefs) {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore (storage blocked)
  }
}

