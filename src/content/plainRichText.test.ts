import { describe, expect, it } from 'vitest';

import { splitPlainRichParts } from './plainRichText';

describe('splitPlainRichParts', () => {
    it('splits text into plain, mention and hashtag parts', () => {
        expect(splitPlainRichParts('привет @maks_k0s, это #scribo')).toEqual([
            { type: 'text', value: 'привет ' },
            { type: 'mention', value: '@maks_k0s', nick: 'maks_k0s' },
            { type: 'text', value: ', это ' },
            { type: 'tag', value: '#scribo' },
        ]);
    });

    it('keeps plain text as a single part', () => {
        expect(splitPlainRichParts('просто текст')).toEqual([
            { type: 'text', value: 'просто текст' },
        ]);
    });

    it('does not treat short nicknames as mentions', () => {
        expect(splitPlainRichParts('@ab')).toEqual([
            { type: 'text', value: '@ab' },
        ]);
    });
});
