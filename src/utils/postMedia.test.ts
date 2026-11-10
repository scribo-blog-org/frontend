import { describe, expect, it } from 'vitest';

import { MAX_MEDIA_BYTES } from './media';
import {
    MAX_MEDIA_ITEMS,
    buildMediaPayload,
    buildPostFormData,
    canPublish,
    firstMediaThumbnail,
    normalizePostMedia,
    totalUploadBytes,
    type ComposerTile,
} from './postMedia';

const tile = (patch: Partial<ComposerTile> = {}): ComposerTile => ({
    key: Math.random().toString(36).slice(2),
    status: 'existing',
    kind: 'image',
    size: 1000,
    previewUrl: '',
    payload: { type: 'image', url: '/uploads/a.png' },
    ...patch,
});

const localTile = (name: string, size = 10): ComposerTile =>
    tile({
        key: `up-${name}`,
        status: 'local',
        size,
        file: new File(['x'.repeat(size)], name, { type: 'image/png' }),
        payload: undefined,
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
    it('needs text or at least one media tile', () => {
        expect(canPublish('', []).ok).toBe(false);
        expect(canPublish('   ', []).ok).toBe(false);
        expect(canPublish('hello', []).ok).toBe(true);
        expect(canPublish('', [tile()]).ok).toBe(true);
        expect(canPublish('', [localTile('a.png')]).ok).toBe(true);
    });

    it('enforces the total size and item limits', () => {
        expect(
            canPublish('hi', [
                tile({ size: MAX_MEDIA_BYTES }),
                localTile('b.png', 1),
            ]).ok,
        ).toBe(false);
        expect(canPublish('hi', [tile({ size: MAX_MEDIA_BYTES / 2 })]).ok).toBe(
            true,
        );
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
    it('sums the sizes of existing and local tiles', () => {
        expect(
            totalUploadBytes([tile({ size: 10 }), localTile('a.png', 20)]),
        ).toBe(30);
    });

    it('references new files by client id and resends existing items', () => {
        const existing = tile({
            payload: { id: 'm1', type: 'image', url: '/uploads/a.png' },
        });
        const embed = tile({
            status: 'embed',
            kind: 'embed',
            size: 0,
            payload: { type: 'embed', url: 'https://youtu.be/abc' },
        });
        const local = localTile('c.png');

        expect(buildMediaPayload([existing, local, embed])).toEqual([
            { id: 'm1', type: 'image', url: '/uploads/a.png' },
            { upload: local.key },
            { type: 'embed', url: 'https://youtu.be/abc' },
        ]);
    });

    it('builds multipart data with one file part per new tile', () => {
        const first = localTile('one.png', 5);
        const second = localTile('two.png', 7);
        const existing = tile();
        const form = buildPostFormData('<p>hi</p>', [existing, first, second]);

        expect(form.get('postContent')).toBe('<p>hi</p>');
        expect(JSON.parse(String(form.get('media')))).toEqual([
            existing.payload,
            { upload: first.key },
            { upload: second.key },
        ]);
        expect((form.get(first.key) as File).name).toBe('one.png');
        expect((form.get(second.key) as File).size).toBe(7);
        expect(form.get(existing.key)).toBeNull();
    });

    it('keeps tile order for URL tiles mixed with files and sends them as embeds', () => {
        const image = tile({
            status: 'embed',
            kind: 'image',
            size: 0,
            payload: { type: 'embed', url: 'https://cdn.example.com/a.png' },
        });
        const local = localTile('b.png', 12);
        const twitch = tile({
            status: 'embed',
            kind: 'embed',
            size: 0,
            payload: { type: 'embed', url: 'https://www.twitch.tv/videos/123' },
        });
        const tiles = [twitch, local, image];

        expect(buildMediaPayload(tiles)).toEqual([
            { type: 'embed', url: 'https://www.twitch.tv/videos/123' },
            { upload: local.key },
            { type: 'embed', url: 'https://cdn.example.com/a.png' },
        ]);
        expect(totalUploadBytes(tiles)).toBe(12);
        expect(canPublish('', [twitch, image]).ok).toBe(true);
    });

    it('does not append file parts for URL tiles', () => {
        const url = tile({
            status: 'embed',
            kind: 'embed',
            size: 0,
            payload: { type: 'embed', url: 'https://youtu.be/abcdefghijk' },
        });
        const form = buildPostFormData('', [url]);
        expect(JSON.parse(String(form.get('media')))).toEqual([url.payload]);
        expect(form.get(url.key)).toBeNull();
    });

    it('sends an empty media list when there is none', () => {
        const form = buildPostFormData('<p>hi</p>', []);
        expect(form.get('media')).toBe('[]');
    });
});
