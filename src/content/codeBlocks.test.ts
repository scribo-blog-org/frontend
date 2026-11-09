import { describe, expect, it } from 'vitest';

import { languageFromClassName, normalizeCodeLanguage } from './codeBlocks';

describe('normalizeCodeLanguage', () => {
    it('keeps safe language names', () => {
        expect(normalizeCodeLanguage('JS')).toBe('js');
        expect(normalizeCodeLanguage('c++')).toBe('c++');
        expect(normalizeCodeLanguage('c#')).toBe('c#');
    });

    it('drops anything that could break out of a class attribute', () => {
        expect(normalizeCodeLanguage('js" onload="x')).toBe('');
        expect(normalizeCodeLanguage('')).toBe('');
        expect(normalizeCodeLanguage(null)).toBe('');
        expect(normalizeCodeLanguage('a'.repeat(30))).toBe('');
    });
});

describe('languageFromClassName', () => {
    it('reads the language-* class', () => {
        expect(languageFromClassName('foo language-python bar')).toBe('python');
        expect(languageFromClassName('plain')).toBe('');
    });
});
