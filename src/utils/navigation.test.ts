import { describe, expect, it } from 'vitest';

import { isPathActive } from './navigation';

describe('isPathActive', () => {
    it('marks the root active only on the home page', () => {
        expect(isPathActive('/', '/')).toBe(true);
        expect(isPathActive('/posts/1', '/')).toBe(false);
        expect(isPathActive('/search', '/')).toBe(false);
    });

    it('matches nested routes by prefix', () => {
        expect(isPathActive('/admin-panel', '/admin-panel')).toBe(true);
        expect(isPathActive('/admin-panel/requests/5', '/admin-panel')).toBe(
            true,
        );
        expect(isPathActive('/admin-panelx', '/admin-panel')).toBe(false);
    });

    it('ignores an empty path', () => {
        expect(isPathActive('/', '')).toBe(false);
    });
});
