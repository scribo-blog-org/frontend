import { describe, expect, it } from 'vitest';

import {
    classifyLink,
    decodeEntities,
    hostLabel,
    isSafeEmbedUrl,
    parseHttpUrl,
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

    it('falls back to a link card and adds a scheme when missing', () => {
        expect(classifyLink('example.com/article')).toMatchObject({
            kind: 'link',
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
        expect(isSafeEmbedUrl('https://evil.example.com/embed/1')).toBe(false);
        expect(
            isSafeEmbedUrl('http://www.youtube-nocookie.com/embed/abcdefghijk'),
        ).toBe(false);
        expect(isSafeEmbedUrl('')).toBe(false);
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
