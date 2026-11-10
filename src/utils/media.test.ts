import { describe, expect, it } from 'vitest';

import {
    MAX_MEDIA_BYTES,
    formatBytes,
    mediaKindFromMime,
    validateMediaFile,
} from './media';

describe('mediaKindFromMime', () => {
    it('maps mime types to kinds', () => {
        expect(mediaKindFromMime('image/png')).toBe('image');
        expect(mediaKindFromMime('image/gif')).toBe('gif');
        expect(mediaKindFromMime('video/quicktime')).toBe('video');
        expect(mediaKindFromMime('application/pdf')).toBeNull();
        expect(mediaKindFromMime(undefined)).toBeNull();
    });
});

describe('validateMediaFile', () => {
    it('accepts supported files within the limit', () => {
        expect(
            validateMediaFile({ type: 'image/webp', size: 1024 }),
        ).toBeNull();
        expect(
            validateMediaFile({ type: 'video/mp4', size: MAX_MEDIA_BYTES }),
        ).toBeNull();
    });

    it('rejects unsupported types, empty and oversized files', () => {
        expect(validateMediaFile({ type: 'image/svg+xml', size: 10 })).toMatch(
            /Unsupported/,
        );
        expect(validateMediaFile({ type: 'image/png', size: 0 })).toMatch(
            /empty/,
        );
        expect(
            validateMediaFile({
                type: 'video/webm',
                size: MAX_MEDIA_BYTES + 1,
            }),
        ).toMatch(/too large/);
    });
});

describe('formatBytes', () => {
    it('formats sizes', () => {
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(2048)).toBe('2 KB');
        expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB');
        expect(formatBytes(MAX_MEDIA_BYTES)).toBe('100 MB');
    });
});
