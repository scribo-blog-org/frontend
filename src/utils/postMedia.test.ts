import { describe, expect, it } from 'vitest';

import { MAX_MEDIA_BYTES } from './media';
import {
    MAX_MEDIA_ITEMS,
    buildMediaPayload,
    canPublish,
    firstMediaThumbnail,
    normalizePostMedia,
    totalUploadBytes,
    type ComposerTile,
} from './postMedia';

const tile = (patch: Partial<ComposerTile> = {}): ComposerTile => ({
    key: Math.random().toString(36),
    status: 'done',
    kind: 'image',
    size: 1000,
    progress: 100,
    previewUrl: '',
    payload: { type: 'image', url: '/uploads/a.png' },
    ...patch,
});

describe('normalizePostMedia', () => {
    it('reads the media array', () => {
        const media = [{ type: 'image', url: '/uploads/a.png' }];
        expect(normalizePostMedia({ media })).toEqual(media);
    });

    it('falls back to legacy banner and featured_image', () => {
        expect(
            normalizePostMedia({
                banner: { type: 'gif', url: '/uploads/x.gif' },
            }),
        ).toHaveLength(1);
        expect(
            normalizePostMedia({ featured_image: '/uploads/old.png' }),
        ).toEqual([{ type: 'image', url: '/uploads/old.png' }]);
        expect(normalizePostMedia({})).toEqual([]);
    });
});

describe('firstMediaThumbnail', () => {
    it('picks image, poster or embed thumbnails', () => {
        expect(
            firstMediaThumbnail({
                media: [
                    { type: 'video', url: '/v.mp4' },
                    { type: 'image', url: '/i.png' },
                ],
            }),
        ).toBe('/i.png');
        expect(
            firstMediaThumbnail({
                media: [{ type: 'video', url: '/v.mp4', poster: '/p.jpg' }],
            }),
        ).toBe('/p.jpg');
        expect(
            firstMediaThumbnail({
                media: [
                    {
                        type: 'embed',
                        url: 'https://youtu.be/x',
                        embed: { thumbnail: 'https://i.ytimg.com/t.jpg' },
                    },
                ],
            }),
        ).toBe('https://i.ytimg.com/t.jpg');
    });
});

describe('canPublish', () => {
    it('needs text or finished media', () => {
        expect(canPublish('', []).ok).toBe(false);
        expect(canPublish('hello', []).ok).toBe(true);
        expect(canPublish('', [tile()]).ok).toBe(true);
    });

    it('blocks while uploading or after a failure', () => {
        expect(canPublish('hi', [tile({ status: 'uploading' })]).ok).toBe(
            false,
        );
        expect(canPublish('hi', [tile({ status: 'error' })]).ok).toBe(false);
    });

    it('enforces the total size and item limits', () => {
        expect(
            canPublish('hi', [
                tile({ size: MAX_MEDIA_BYTES }),
                tile({ size: 1 }),
            ]).ok,
        ).toBe(false);
        expect(
            canPublish(
                'hi',
                Array.from({ length: MAX_MEDIA_ITEMS + 1 }, () =>
                    tile({ size: 1 }),
                ),
            ).ok,
        ).toBe(false);
    });
});

describe('payload helpers', () => {
    it('sums sizes and only sends finished tiles', () => {
        const tiles = [
            tile({ size: 10 }),
            tile({ size: 20, status: 'uploading', payload: undefined }),
        ];
        expect(totalUploadBytes(tiles)).toBe(30);
        expect(buildMediaPayload(tiles)).toHaveLength(1);
    });
});
