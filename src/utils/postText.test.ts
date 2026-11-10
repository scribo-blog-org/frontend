import { describe, expect, it } from 'vitest';

import { postDisplayTitle, postExcerpt } from './postText';

describe('postExcerpt', () => {
    it('prefers the server excerpt', () => {
        expect(
            postExcerpt({
                excerpt: 'From the server',
                content_text: '<p>x</p>',
            }),
        ).toBe('From the server');
    });

    it('derives one from the html and truncates it', () => {
        const html = `<p>${'word '.repeat(60)}</p>`;
        const result = postExcerpt({ content_text: html }, 40);
        expect(result.length).toBeLessThanOrEqual(40);
        expect(result.startsWith('word word')).toBe(true);
    });
});

describe('postDisplayTitle', () => {
    it('falls back to the author when there is no text', () => {
        expect(
            postDisplayTitle({
                content_text: '',
                author: { nick_name: 'sam' },
            }),
        ).toBe('Post by sam');
        expect(postDisplayTitle({})).toBe('Post');
    });

    it('uses the text excerpt when there is one', () => {
        expect(
            postDisplayTitle({ content_text: '<p>Hello <b>world</b></p>' }),
        ).toBe('Hello world');
    });
});
