import { describe, expect, it } from 'vitest';

import { parseThemeMode, resolveIsDark } from './themeMode';

describe('parseThemeMode', () => {
    it('follows the device when nothing is stored', () => {
        expect(parseThemeMode(null)).toBe('system');
        expect(parseThemeMode(undefined)).toBe('system');
    });

    it('reads the stored mode names', () => {
        expect(parseThemeMode('"system"')).toBe('system');
        expect(parseThemeMode('"light"')).toBe('light');
        expect(parseThemeMode('"dark"')).toBe('dark');
    });

    it('keeps the choice of people who saved the old boolean', () => {
        expect(parseThemeMode('true')).toBe('dark');
        expect(parseThemeMode('false')).toBe('light');
    });

    it('falls back to the device for anything unreadable', () => {
        expect(parseThemeMode('')).toBe('system');
        expect(parseThemeMode('not json')).toBe('system');
        expect(parseThemeMode('"purple"')).toBe('system');
        expect(parseThemeMode('42')).toBe('system');
    });
});

describe('resolveIsDark', () => {
    it('lets an explicit choice win over the device', () => {
        expect(resolveIsDark('dark', false)).toBe(true);
        expect(resolveIsDark('light', true)).toBe(false);
    });

    it('uses the device when the mode is system', () => {
        expect(resolveIsDark('system', true)).toBe(true);
        expect(resolveIsDark('system', false)).toBe(false);
    });
});
