import { describe, expect, it } from 'vitest';

import { classifyLink } from './embed';
import { asDetectedMedia, decideLinkAction, linkHref } from './linkAction';

describe('decideLinkAction', () => {
    const page = classifyLink('https://example.com/article');
    const youtube = classifyLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const twitch = classifyLink('https://www.twitch.tv/videos/123456');
    const image = classifyLink('https://cdn.example.com/a.png');
    const video = classifyLink('https://cdn.example.com/a.mp4');

    it('links the selected text for any url, even media urls', () => {
        expect(decideLinkAction(true, page)).toBe('link-selection');
        expect(decideLinkAction(true, youtube)).toBe('link-selection');
        expect(decideLinkAction(true, image)).toBe('link-selection');
    });

    it('adds players and direct media files to the carousel without a selection', () => {
        expect(decideLinkAction(false, youtube)).toBe('media');
        expect(decideLinkAction(false, twitch)).toBe('media');
        expect(decideLinkAction(false, image)).toBe('media');
        expect(decideLinkAction(false, video)).toBe('media');
    });

    it('treats extensionless links as media only when the server sniffed media', () => {
        expect(decideLinkAction(false, page, 'image')).toBe('media');
        expect(decideLinkAction(false, page, 'gif')).toBe('media');
        expect(decideLinkAction(false, page, 'video')).toBe('media');
        expect(decideLinkAction(false, page, null)).toBe('text');
        expect(decideLinkAction(false, page, 'html')).toBe('text');
    });

    it('rejects things that are not web links', () => {
        expect(decideLinkAction(false, null)).toBe('invalid');
        expect(decideLinkAction(true, null)).toBe('invalid');
    });
});

describe('asDetectedMedia', () => {
    it('only accepts the three media types', () => {
        expect(asDetectedMedia('image')).toBe('image');
        expect(asDetectedMedia('embed')).toBeNull();
        expect(asDetectedMedia(undefined)).toBeNull();
    });
});

describe('linkHref', () => {
    it('keeps what was typed when it has a scheme, otherwise normalises', () => {
        const info = classifyLink('example.com/a')!;
        expect(linkHref('https://example.com/a', info)).toBe(
            'https://example.com/a',
        );
        expect(linkHref('example.com/a', info)).toBe('https://example.com/a');
    });
});
