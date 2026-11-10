import { describe, expect, it } from 'vitest';

import { uploadPercent } from '../api/postForm';

describe('uploadPercent', () => {
    it('rounds and clamps the progress', () => {
        expect(uploadPercent(0, 100)).toBe(0);
        expect(uploadPercent(1, 3)).toBe(33);
        expect(uploadPercent(50, 100)).toBe(50);
        expect(uploadPercent(150, 100)).toBe(100);
    });

    it('is zero when the total is unknown', () => {
        expect(uploadPercent(10, 0)).toBe(0);
        expect(uploadPercent(10, NaN)).toBe(0);
    });
});
