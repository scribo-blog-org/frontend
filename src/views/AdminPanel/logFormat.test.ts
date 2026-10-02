import { describe, expect, it } from 'vitest';

import { describeChanges, describeDetails, fieldLabel } from './logFormat';

describe('describeChanges', () => {
    it('shows a category rename as old to new', () => {
        expect(
            describeChanges([{ field: 'name', from: 'test', to: 'test1' }]),
        ).toEqual([{ label: 'Название', from: 'test', to: 'test1' }]);
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
            { label: 'Название', from: 'Old', to: 'New' },
            { label: 'Категория', from: 'News', to: 'Tech' },
            { label: 'Фото', from: null, to: 'удалено' },
            { label: 'Текст', from: null, to: 'изменён' },
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
            { label: 'Почта видна всем', from: 'нет', to: 'да' },
            { label: 'Описание', from: '—', to: 'bio' },
            { label: 'Иконка', from: '№3', to: '№5' },
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
            { label: 'Текст', from: null, to: 'изменён · 1240 → 1310 симв.' },
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
                target_nick: 'Пчеловод',
                old_role: 'user',
                new_role: 'author',
            },
        });
        expect(value(details, 'Роль')).toBe('user → author');
        expect(
            details.facts.find((row: any) => row.label === 'Роль')?.change,
        ).toEqual({ kind: 'role', from: 'user', to: 'author' });
        expect(value(details, 'Кто')).toBe('Dev · tech_admin');
        expect(value(details, 'Над пользователем')).toBe('Пчеловод');
    });

    it('keeps a role change structured even when the old role was not recorded', () => {
        const details = describeDetails({
            type: 'update_role',
            data: { user: 'u1', new_role: 'author' },
        });
        expect(
            details.facts.find((row: any) => row.label === 'Роль')?.change,
        ).toEqual({ kind: 'role', from: null, to: 'author' });
    });

    it('shows how much was deleted together with a post', () => {
        const details = describeDetails({
            type: 'delete_post',
            data: {
                user: 'u1',
                post_title: 'Старый пост',
                comments_removed: 3,
                likes_count: 12,
                views_count: 340,
            },
        });
        expect(value(details, 'Удалено комментариев')).toBe('3');
        expect(value(details, 'Лайков было')).toBe('12');
        expect(value(details, 'Просмотров было')).toBe('340');
        expect(value(details, 'Пост')).toBe('Старый пост');
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
            'Код ответа',
            'Ошибка',
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
        expect(labels(details)).not.toContain('Время');
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
        expect(value(known, 'Кто')).toBe('Dev');
        expect(value(known, 'Пост')).toBe('Hello');
        expect(value(known, 'Над пользователем')).toBe('Maks');

        const gone = describeDetails(old);
        expect(value(gone, 'Кто')).toBe('удалённый пользователь');
        expect(labels(gone)).not.toContain('Пост');
    });

    it('works for a record with no data at all', () => {
        expect(() => describeDetails({ type: 'x', data: null })).not.toThrow();
        expect(describeDetails({ type: 'x' }).facts).toEqual([]);
    });
});
