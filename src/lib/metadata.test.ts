import { describe, expect, it } from 'vitest';

import { HOME_TITLE, absoluteUrl } from '@/seo/site';

import { buildMetadata } from './metadata';

describe('buildMetadata', () => {
    it('makes the home page canonical on the root path', () => {
        const metadata = buildMetadata({
            absoluteTitle: HOME_TITLE,
            path: '/',
        });

        expect(metadata.alternates?.canonical).toBe(absoluteUrl('/'));
        expect(metadata.openGraph?.url).toBe(absoluteUrl('/'));
        expect(metadata.title).toEqual({ absolute: HOME_TITLE });
        expect(metadata.robots).toMatchObject({ index: true, follow: true });
    });

    it('prefixes regular page titles with the brand', () => {
        expect(
            buildMetadata({ title: 'Support', path: '/support' }).title,
        ).toBe('Support | Scribo');
    });

    it('hides filtered pages from the index without a canonical', () => {
        const metadata = buildMetadata({
            path: '/',
            noindex: true,
            follow: true,
        });

        expect(metadata.alternates).toBeUndefined();
        expect(metadata.robots).toEqual({ index: false, follow: true });
    });

    it('adds the shared keywords', () => {
        expect(buildMetadata().keywords).toContain('scribo-blog');
    });
});
