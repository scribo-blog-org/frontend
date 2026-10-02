// Форматирование записей журнала без зависимостей от компонентов: так оно проверяется тестами.

import { kindLabel, statusLabel } from '../Support/constants';

const FIELD_LABELS: Record<string, string> = {
    title: 'Название',
    category: 'Категория',
    image: 'Фото',
    content: 'Текст',
    name: 'Название',
    icon: 'Иконка',
    color: 'Цвет',
    text: 'Текст',
    nick_name: 'Ник',
    description: 'Описание',
    avatar: 'Аватар',
    is_email_public: 'Почта видна всем',
    is_saved_posts_public: 'Сохранённые видны всем',
    is_last_activity_public: 'Активность видна всем',
};

export const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

const WORDS: Record<string, string> = {
    added: 'добавлено',
    changed: 'заменено',
    removed: 'удалено',
};

const formatValue = (field: string, value: any) => {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'да' : 'нет';
    }

    if ((field === 'icon' || field === 'color') && typeof value === 'number') {
        return `№${value}`;
    }

    return String(value);
};

/** Строки «поле: было → стало» для колонки изменений. */
export const describeChanges = (changes: any) =>
    (Array.isArray(changes) ? changes : []).map((change: any) => {
        const label = fieldLabel(change.field);

        if (change.changed) {
            const sized =
                typeof change.from_length === 'number' &&
                typeof change.to_length === 'number'
                    ? ` · ${change.from_length} → ${change.to_length} симв.`
                    : '';

            return { label, from: null, to: `изменён${sized}` };
        }

        if (
            (change.field === 'image' || change.field === 'avatar') &&
            change.to
        ) {
            return { label, from: null, to: WORDS[change.to] ?? change.to };
        }

        return {
            label,
            from: formatValue(change.field, change.from),
            to: formatValue(change.field, change.to),
        };
    });

export type DetailRow = {
    label: string;
    value: string;
    mono?: boolean;
    /** Если строка это «было → стало», здесь обе части: интерфейс рисует их по-своему. */
    change?: { kind: 'role' | 'text'; from: string | null; to: string };
};

export type LogDetails = {
    /** Когда произошло, с секундами. */
    time: string | null;
    /** Метод и путь запроса, который породил запись. */
    route: { method: string; path: string } | null;
    /** Факты о самом событии. */
    facts: DetailRow[];
    changes: ReturnType<typeof describeChanges>;
    /** Остальное о запросе: id, адрес, браузер. */
    request: DetailRow[];
    /** Код ответа и текст ошибки. */
    error: DetailRow[];
    stack: string | null;
};

// Ключи, которые разобраны отдельно. Всё остальное, что появится в записи,
// покажется в конце под своим именем: новое поле не потеряется.
const KNOWN_KEYS = new Set([
    'request',
    'changes',
    'category_snapshot',
    'stack',
    'system',
    'user',
    'user_nick',
    'user_role',
    'post',
    'post_title',
    'post_author',
    'category',
    'comment',
    'comment_text',
    'comment_author',
    'parent_comment',
    'target_user',
    'target_nick',
    'updated_user',
    'old_role',
    'new_role',
    'status',
    'previous_status',
    'comments_removed',
    'removed',
    'likes_count',
    'views_count',
    'content_length',
    'has_image',
    'kind',
    'email',
    'anonymous',
    'access_key',
    'support_request',
    'message_preview',
    'reply_preview',
    'author_type',
    'file_name',
    'backup',
    'safety_backup',
    'rolled_back',
    'error',
    'trigger',
    'version',
    'node',
    'env',
    'port',
    'method',
    'path',
    'conversation',
]);

const present = (value: any) =>
    value !== null && value !== undefined && value !== '';

const yesNo = (value: any) => (value ? 'да' : 'нет');

/**
 * Что показать в раскрытой записи: факты о событии, изменения, запрос, стек.
 * Всё, что есть в записи, в человеческих подписях; сырые данные остаются
 * отдельно, для тех, кому нужен точный вид.
 */
export type KnownNames = {
    user?: string;
    target?: string;
    post?: string;
    category?: string;
};

export function describeDetails(
    log: any,
    formatDate: (date: any) => string = (date) => String(date),
    // Живые названия для записей, сделанных до появления снимков в логе.
    names: KnownNames = {},
): LogDetails {
    const data = log?.data ?? {};
    const facts: DetailRow[] = [];
    const add = (
        label: string,
        value: any,
        mono = false,
        change?: DetailRow['change'],
    ) => {
        if (present(value)) {
            facts.push({ label, value: String(value), mono, change });
        }
    };

    if (data.system) {
        add('Источник', 'Система');
    } else if (data.user) {
        add(
            'Кто',
            `${data.user_nick ?? names.user ?? 'удалённый пользователь'}${data.user_role ? ` · ${data.user_role}` : ''}`,
        );
        add('ID пользователя', data.user, true);
    }

    add('Пост', data.post_title ?? names.post);
    add('ID поста', data.post, true);
    add('Категория', data.category_snapshot?.name ?? names.category);
    add('ID категории', data.category, true);
    add('Комментарий', data.comment_text);
    add('ID комментария', data.comment, true);
    add('Ответ на комментарий', data.parent_comment, true);

    const target = data.target_user ?? data.updated_user;

    add('Над пользователем', data.target_nick ?? names.target);
    add('ID пользователя', target, true);

    if (present(data.old_role) || present(data.new_role)) {
        add(
            'Роль',
            `${data.old_role ?? '—'} → ${data.new_role ?? '—'}`,
            false,
            {
                kind: 'role',
                from: data.old_role ?? null,
                to: String(data.new_role ?? '—'),
            },
        );
    }

    if (present(data.status) && present(data.previous_status)) {
        add(
            'Статус',
            `${statusLabel(data.previous_status)} → ${statusLabel(data.status)}`,
            false,
            {
                kind: 'text',
                from: statusLabel(data.previous_status),
                to: statusLabel(data.status),
            },
        );
    } else if (log?.type === 'update_support_status') {
        add('Статус', statusLabel(data.status));
    } else if (log?.type === 'backup_restore_result') {
        add('Итог', data.status === 'success' ? 'успешно' : 'не удалось');
    }

    add('Удалено комментариев', data.comments_removed);
    add('Удалено комментариев (вместе с ответами)', data.removed);
    add('Лайков было', data.likes_count);
    add('Просмотров было', data.views_count);
    add('Длина текста', data.content_length);

    if (typeof data.has_image === 'boolean') {
        add('С картинкой', yesNo(data.has_image));
    }

    add('Тип обращения', data.kind ? kindLabel(data.kind) : null);
    add('Почта гостя', data.email);
    add('Сообщение', data.message_preview);
    add('Ответ', data.reply_preview);
    add('Отвечал', data.author_type);
    add('ID обращения', data.support_request, true);

    add('Файл', data.file_name, true);
    add('Откат вернул прежнее состояние', data.rolled_back ? 'да' : null);
    add('Страховочный снимок', data.safety_backup, true);
    add('Запуск', data.trigger);

    add('Версия', data.version);
    add('Node', data.node);
    add('Окружение', data.env);
    add('Порт', data.port);

    Object.entries(data).forEach(([key, value]) => {
        if (
            !KNOWN_KEYS.has(key) &&
            value !== null &&
            typeof value !== 'object'
        ) {
            add(key, value, true);
        }
    });

    add('ID записи', log?._id, true);

    const request: DetailRow[] = [];
    const meta = data.request ?? {};
    const method = meta.method ?? data.method;
    const path = meta.path ?? data.path;
    const route =
        present(method) || present(path)
            ? { method: String(method ?? ''), path: String(path ?? '') }
            : null;

    [
        ['ID запроса', meta.id],
        ['IP', meta.ip],
        ['Браузер', meta.user_agent],
    ].forEach(([label, value]) => {
        if (present(value)) {
            request.push({
                label: label as string,
                value: String(value),
                mono: label !== 'Браузер',
            });
        }
    });

    const error: DetailRow[] = [];

    if (log?.type === 'server_error' && present(data.status)) {
        error.push({ label: 'Код ответа', value: String(data.status) });
    }

    if (present(data.error)) {
        error.push({ label: 'Ошибка', value: String(data.error), mono: true });
    }

    return {
        time: log?.date_time ? formatDate(log.date_time) : null,
        route,
        facts,
        changes: describeChanges(data.changes),
        request,
        error,
        stack: present(data.stack) ? String(data.stack) : null,
    };
}
