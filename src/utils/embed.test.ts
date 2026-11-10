import { describe, expect, it } from 'vitest';

import {
    classifyLink,
    decodeEntities,
    hostLabel,
    isSafeEmbedUrl,
    parseHttpUrl,
    twitchRef,
    withTwitchParent,
} from './embed';

describe('classifyLink', () => {
    it('recognises YouTube watch, short and shorts links', () => {
        const watch = classifyLink(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        );
        expect(watch).toMatchObject({
            kind: 'youtube',
            id: 'dQw4w9WgXcQ',
            embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        });
        expect(watch?.thumbnail).toContain('dQw4w9WgXcQ');

        expect(classifyLink('https://youtu.be/dQw4w9WgXcQ?t=5')?.id).toBe(
            'dQw4w9WgXcQ',
        );
        expect(
            classifyLink('https://www.youtube.com/shorts/abcdefghijk')?.kind,
        ).toBe('youtube');
    });

    it('recognises Vimeo links', () => {
        expect(classifyLink('https://vimeo.com/123456789')).toMatchObject({
            kind: 'vimeo',
            embedUrl: 'https://player.vimeo.com/video/123456789',
        });
    });

    it('recognises direct media files', () => {
        expect(classifyLink('https://cdn.example.com/a/b.PNG')?.kind).toBe(
            'image',
        );
        expect(classifyLink('https://cdn.example.com/clip.mp4?x=1')?.kind).toBe(
            'video',
        );
    });

    it('recognises Twitch videos, clips and channels', () => {
        expect(
            classifyLink('https://www.twitch.tv/videos/123456'),
        ).toMatchObject({
            kind: 'twitch',
            id: '123456',
            embedUrl: 'https://player.twitch.tv/?video=v123456',
        });
        expect(
            classifyLink('https://www.twitch.tv/fleem_ff/clip/SlugName-abc'),
        ).toMatchObject({
            kind: 'twitch',
            embedUrl: 'https://clips.twitch.tv/embed?clip=SlugName-abc',
        });
        expect(
            classifyLink('https://clips.twitch.tv/SlugName-abc'),
        ).toMatchObject({
            kind: 'twitch',
            embedUrl: 'https://clips.twitch.tv/embed?clip=SlugName-abc',
        });
        expect(classifyLink('https://m.twitch.tv/fleem_ff')).toMatchObject({
            kind: 'twitch',
            embedUrl: 'https://player.twitch.tv/?channel=fleem_ff',
        });
    });

    it('does not treat reserved or foreign Twitch paths as players', () => {
        expect(
            twitchRef(new URL('https://www.twitch.tv/directory')),
        ).toBeNull();
        expect(
            twitchRef(new URL('https://www.twitch.tv/videos/abc')),
        ).toBeNull();
        expect(twitchRef(new URL('https://www.twitch.tv/a/b/c/d'))).toBeNull();
        expect(twitchRef(new URL('https://nottwitch.tv/fleem_ff'))).toBeNull();
        expect(classifyLink('https://www.twitch.tv/settings')?.kind).toBe(
            'unknown',
        );
    });

    it('marks other links as unknown and adds a scheme when missing', () => {
        expect(classifyLink('example.com/article')).toMatchObject({
            kind: 'unknown',
            url: 'https://example.com/article',
        });
    });

    it('rejects things that are not web links', () => {
        expect(classifyLink('')).toBeNull();
        expect(classifyLink('javascript:alert(1)')).toBeNull();
        expect(classifyLink('not a url')).toBeNull();
        expect(parseHttpUrl('ftp://example.com/file')).toBeNull();
    });
});

describe('isSafeEmbedUrl', () => {
    it('allows only the known player hosts over https', () => {
        expect(
            isSafeEmbedUrl(
                'https://www.youtube-nocookie.com/embed/abcdefghijk',
            ),
        ).toBe(true);
        expect(isSafeEmbedUrl('https://player.vimeo.com/video/1')).toBe(true);
        expect(isSafeEmbedUrl('https://player.twitch.tv/?video=v1')).toBe(true);
        expect(
            isSafeEmbedUrl('https://clips.twitch.tv/embed?clip=SlugName'),
        ).toBe(true);
        expect(isSafeEmbedUrl('https://www.twitch.tv/videos/1')).toBe(false);
        expect(isSafeEmbedUrl('https://evil.example.com/embed/1')).toBe(false);
        expect(
            isSafeEmbedUrl('http://www.youtube-nocookie.com/embed/abcdefghijk'),
        ).toBe(false);
        expect(isSafeEmbedUrl('')).toBe(false);
    });
});

describe('withTwitchParent', () => {
    it('appends the parent hostname to Twitch player urls only', () => {
        expect(
            withTwitchParent(
                'https://player.twitch.tv/?video=v1',
                'scribo.pp.ua',
            ),
        ).toBe('https://player.twitch.tv/?video=v1&parent=scribo.pp.ua');
        expect(
            withTwitchParent(
                'https://clips.twitch.tv/embed?clip=abc&parent=old.example',
                'localhost',
            ),
        ).toBe('https://clips.twitch.tv/embed?clip=abc&parent=localhost');
        expect(
            withTwitchParent('https://player.vimeo.com/video/1', 'x.y'),
        ).toBe('https://player.vimeo.com/video/1');
        expect(withTwitchParent('https://player.twitch.tv/?video=v1', '')).toBe(
            'https://player.twitch.tv/?video=v1',
        );
    });
});

describe('hostLabel', () => {
    it('drops the www prefix', () => {
        expect(hostLabel('https://www.example.com/path')).toBe('example.com');
        expect(hostLabel('nope')).toBe('');
    });
});

describe('decodeEntities', () => {
    it('decodes named and numeric entities', () => {
        expect(decodeEntities('it&#39;s &#34;x&#34; &amp; &quot;y&quot;')).toBe(
            'it\'s "x" & "y"',
        );
    });

    it('is safe for empty values', () => {
        expect(decodeEntities(undefined)).toBe('');
    });
});
