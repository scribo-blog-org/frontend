import { describe, expect, it } from 'vitest';

import { splitPlainRichParts } from './plainRichText';

describe('splitPlainRichParts', () => {
    it('splits text into plain, mention and hashtag parts', () => {
        expect(splitPlainRichParts('hello @maks_k0s, this is #scribo')).toEqual(
            [
                { type: 'text', value: 'hello ' },
                { type: 'mention', value: '@maks_k0s', nick: 'maks_k0s' },
                { type: 'text', value: ', this is ' },
                { type: 'tag', value: '#scribo' },
            ],
        );
    });

    it('keeps plain text as a single part', () => {
        expect(splitPlainRichParts('plain text')).toEqual([
            { type: 'text', value: 'plain text' },
        ]);
    });

    it('does not treat short nicknames as mentions', () => {
        expect(splitPlainRichParts('@ab')).toEqual([
            { type: 'text', value: '@ab' },
        ]);
    });
});
