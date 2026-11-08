export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

// What the device prefers when the browser cannot tell.
export const SYSTEM_DARK_FALLBACK = true;

// The stored value used to be a bare boolean (true = dark). It is now the
// mode name; old values are read as an explicit choice so nobody's theme
// changes after the update.
export function parseThemeMode(raw: string | null | undefined): ThemeMode {
    if (raw === null || raw === undefined) {
        return DEFAULT_THEME_MODE;
    }

    try {
        const value = JSON.parse(raw);

        if (value === true) {
            return 'dark';
        }

        if (value === false) {
            return 'light';
        }

        if (THEME_MODES.includes(value)) {
            return value as ThemeMode;
        }
    } catch {}

    return DEFAULT_THEME_MODE;
}

export function resolveIsDark(mode: ThemeMode, systemDark: boolean): boolean {
    return mode === 'dark' || (mode === 'system' && systemDark);
}

export function readStoredThemeMode(): ThemeMode {
    try {
        return parseThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
        return DEFAULT_THEME_MODE;
    }
}

export function storeThemeMode(mode: ThemeMode) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(mode));
    } catch {}
}

export function getSystemDarkQuery(): MediaQueryList | null {
    return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia(SYSTEM_DARK_QUERY)
        : null;
}
