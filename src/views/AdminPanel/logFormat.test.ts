import { describe, expect, it } from 'vitest';

import { describeChanges, describeDetails, fieldLabel } from './logFormat';

describe('describeChanges', () => {
    it('shows a category rename as old to new', () => {
        expect(
            describeChanges([{ field: 'name', from: 'test', to: 'test1' }]),
        ).toEqual([{ label: 'Name', from: 'test', to: 'test1' }]);
    });

    it('lists what changed in a post: title, category, photo and text', () => {
        expect(
            describeChanges([
                { field: 'title', from: 'Old', to: 'New' },
                { field: 'category', from: 'News', to: 'Tech' },
                { field: 'image', to: 'removed' },
                { field: 'content', changed: true },
            ]),
        ).toEqual([
            { label: 'Name', from: 'Old', to: 'New' },
            { label: 'Category', from: 'News', to: 'Tech' },
            { label: 'Photo', from: null, to: 'deleted' },
            { label: 'Text', from: null, to: 'edited' },
        ]);
    });

    it('formats booleans, empty values and numbered icons', () => {
        expect(
            describeChanges([
                { field: 'is_email_public', from: false, to: true },
                { field: 'description', from: null, to: 'bio' },
                { field: 'icon', from: 3, to: 5 },
            ]),
        ).toEqual([
            { label: 'Email is visible to everyone', from: 'no', to: 'yes' },
            { label: 'Description', from: '—', to: 'bio' },
            { label: 'Icon', from: '№3', to: '№5' },
        ]);
    });

    it('survives missing or malformed changes and unknown fields', () => {
        expect(describeChanges(undefined)).toEqual([]);
        expect(describeChanges('x')).toEqual([]);
        expect(fieldLabel('something_new')).toBe('something_new');
    });
});

describe('describeChanges sizes', () => {
    it('adds the text length before and after when it is known', () => {
        expect(
            describeChanges([
                {
                    field: 'content',
                    changed: true,
                    from_length: 1240,
                    to_length: 1310,
                },
            ]),
        ).toEqual([
            { label: 'Text', from: null, to: 'edited · 1240 → 1310 chars' },
        ]);
    });
});

describe('describeDetails', () => {
    const labels = (details: any) => details.facts.map((row: any) => row.label);
    const value = (details: any, label: string) =>
        details.facts.find((row: any) => row.label === label)?.value;

    it('shows what a role change replaced', () => {
        const details = describeDetails({
            _id: 'l1',
            type: 'update_role',
            data: {
                user: 'u1',
                user_nick: 'Dev',
                user_role: 'tech_admin',
                updated_user: 'u3',
                target_nick: 'Beekeeper',
                old_role: 'user',
                new_role: 'author',
            },
        });
        expect(value(details, 'Role')).toBe('user → author');
        expect(
            details.facts.find((row: any) => row.label === 'Role')?.change,
        ).toEqual({ kind: 'role', from: 'user', to: 'author' });
        expect(value(details, 'Who')).toBe('Dev · tech_admin');
        expect(value(details, 'On the user')).toBe('Beekeeper');
    });

    it('shows a support status change as the same badges as the list', () => {
        const details = describeDetails({
            type: 'update_support_status',
            data: {
                status: 'reviewed',
                previous_status: 'in_review',
            },
        });
        expect(value(details, 'Status')).toBe('In review → Reviewed');
        expect(
            details.facts.find((row: any) => row.label === 'Status')?.change,
        ).toEqual({
            kind: 'status',
            from: 'in_review',
            to: 'reviewed',
        });
    });

    it('shows whether a verified badge was given or taken away', () => {
        const details = describeDetails({
            type: 'update_verified',
            data: {
                user: 'u1',
                updated_user: 'u3',
                target_nick: 'Beekeeper',
                verified: false,
            },
        });
        expect(value(details, 'Verified badge')).toBe('no');
        expect(value(details, 'On the user')).toBe('Beekeeper');
    });

    it('keeps a role change structured even when the old role was not recorded', () => {
        const details = describeDetails({
            type: 'update_role',
            data: { user: 'u1', new_role: 'author' },
        });
        expect(
            details.facts.find((row: any) => row.label === 'Role')?.change,
        ).toEqual({ kind: 'role', from: null, to: 'author' });
    });

    it('shows how much was deleted together with a post', () => {
        const details = describeDetails({
            type: 'delete_post',
            data: {
                user: 'u1',
                post_title: 'Previous post',
                comments_removed: 3,
                likes_count: 12,
                views_count: 340,
            },
        });
        expect(value(details, 'Comments deleted')).toBe('3');
        expect(value(details, 'Likes before')).toBe('12');
        expect(value(details, 'Views before')).toBe('340');
        expect(value(details, 'Post')).toBe('Previous post');
    });

    it('keeps the error, the stack and the request of a server error', () => {
        const details = describeDetails({
            type: 'server_error',
            data: {
                system: true,
                status: 500,
                error: "Cannot read properties of undefined (reading 'title')",
                stack: 'TypeError: x\n    at a.b',
                request: {
                    id: 'ab12',
                    method: 'GET',
                    path: '/api/debug-error',
                    ip: '203.0.113.7',
                    user_agent: 'Mozilla/5.0',
                },
            },
        });
        expect(details.error.map((r: any) => r.label)).toEqual([
            'Response code',
            'Error',
        ]);
        expect(details.error[0].value).toBe('500');
        expect(details.error[1].value).toContain('reading');
        expect(details.stack).toContain('at a.b');
        expect(details.route).toEqual({
            method: 'GET',
            path: '/api/debug-error',
        });
        expect(details.request.map((r: any) => r.value)).toEqual([
            'ab12',
            '203.0.113.7',
            'Mozilla/5.0',
        ]);
    });

    it('does not lose a field it does not know about', () => {
        const details = describeDetails({
            type: 'brand_new',
            data: { user: 'u1', something_new: 42, nested: { a: 1 } },
        });
        expect(value(details, 'something_new')).toBe('42');
        expect(labels(details)).not.toContain('nested');
    });

    it('puts the time and the route into the header, not into the facts', () => {
        const details = describeDetails(
            {
                date_time: '2026-10-02T19:09:26Z',
                type: 'like_post',
                data: {
                    user: 'u1',
                    request: { method: 'POST', path: '/api/p' },
                },
            },
            () => 'TIME',
        );
        expect(details.time).toBe('TIME');
        expect(details.route).toEqual({ method: 'POST', path: '/api/p' });
        expect(labels(details)).not.toContain('Time');
    });

    it('fills names from live data for records made before snapshots, and says so when the user is gone', () => {
        const old = {
            type: 'delete_post',
            data: { user: 'u1', post: 'p1', target_user: 'u2' },
        };
        const known = describeDetails(old, undefined, {
            user: 'Dev',
            post: 'Hello',
            target: 'Maks',
        });
        expect(value(known, 'Who')).toBe('Dev');
        expect(value(known, 'Post')).toBe('Hello');
        expect(value(known, 'On the user')).toBe('Maks');

        const gone = describeDetails(old);
        expect(value(gone, 'Who')).toBe('deleted user');
        expect(labels(gone)).not.toContain('Post');
    });

    it('works for a record with no data at all', () => {
        expect(() => describeDetails({ type: 'x', data: null })).not.toThrow();
        expect(describeDetails({ type: 'x' }).facts).toEqual([]);
    });
});
