import { describe, expect, it } from 'vitest';

import {
    HOME_TITLE,
    SITE_ALTERNATE_NAMES,
    SITE_DESCRIPTION,
    SITE_KEYWORDS,
    absoluteUrl,
    getSiteOrigin,
    pageTitle,
} from './site';

describe('site', () => {
    it('builds absolute urls on the site origin', () => {
        expect(absoluteUrl('/posts/1')).toBe(`${getSiteOrigin()}/posts/1`);
        expect(absoluteUrl('posts/1')).toBe(`${getSiteOrigin()}/posts/1`);
        expect(absoluteUrl()).toBe(`${getSiteOrigin()}/`);
    });

    it('adds the brand to page titles', () => {
        expect(pageTitle('Search')).toBe('Search | Scribo');
        expect(pageTitle('')).toBe('Scribo');
    });

    it('keeps the description within the snippet limit', () => {
        expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
        expect(SITE_DESCRIPTION).toContain('Scribo');
        expect(SITE_DESCRIPTION).toContain('Scribo');
    });

    it('keeps the home title short and branded', () => {
        expect(HOME_TITLE.length).toBeLessThanOrEqual(60);
        expect(HOME_TITLE).toContain('Scribo');
    });

    it('lists the brand spellings as keywords and alternate names', () => {
        expect(SITE_KEYWORDS).toEqual(
            expect.arrayContaining(['Scribo', 'scribo-blog', 'Scribo']),
        );
        expect(SITE_ALTERNATE_NAMES).toEqual(
            expect.arrayContaining(['scribo-blog', 'Scribo']),
        );
    });
});
