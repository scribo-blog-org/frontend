import { describe, expect, it } from 'vitest';

import nextConfig from './next.config.mjs';

describe('next config redirects', () => {
    it('moves the old posts feed to the root and keeps post pages untouched', async () => {
        const redirects = await nextConfig.redirects();

        expect(redirects).toEqual([
            { source: '/posts', destination: '/', permanent: true },
        ]);
    });
});
