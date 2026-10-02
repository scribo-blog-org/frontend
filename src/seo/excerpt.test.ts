import { describe, expect, it } from 'vitest';

import { plainTextExcerpt } from './excerpt';

describe('plainTextExcerpt', () => {
    it('strips tags and collapses whitespace', () => {
        expect(plainTextExcerpt('<p>Привет,   <b>мир</b></p>')).toBe(
            'Привет, мир',
        );
    });

    it('truncates long text with an ellipsis', () => {
        const result = plainTextExcerpt('слово '.repeat(100), 20);

        expect(result.length).toBeLessThanOrEqual(20);
        expect(result.endsWith('…')).toBe(true);
    });

    it('returns an empty string for empty input', () => {
        expect(plainTextExcerpt('')).toBe('');
        expect(plainTextExcerpt(null)).toBe('');
    });
});
