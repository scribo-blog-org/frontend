import { describe, expect, it } from 'vitest';

import { postErrorMessage } from './postErrors';

describe('postErrorMessage', () => {
    it('prefers the first field message from any error source', () => {
        expect(
            postErrorMessage(
                {
                    message: 'Some errors in your fields!',
                    errors: {
                        body: {
                            media: {
                                message:
                                    'Only image, video, YouTube, Vimeo or Twitch links can be added as media. Paste other links into the text.',
                            },
                        },
                    },
                },
                'fallback',
            ),
        ).toContain('Only image, video');
        expect(
            postErrorMessage(
                { errors: { query: { page: { message: 'Bad page' } } } },
                'fallback',
            ),
        ).toBe('Bad page');
    });

    it('falls back to the top-level message and then the fallback', () => {
        expect(postErrorMessage({ message: 'Unauthorized' }, 'fallback')).toBe(
            'Unauthorized',
        );
        expect(postErrorMessage({}, 'fallback')).toBe('fallback');
        expect(postErrorMessage(undefined, 'fallback')).toBe('fallback');
    });
});
