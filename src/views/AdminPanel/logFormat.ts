
import { kindLabel, statusLabel } from '../Support/constants';

export const formatSize = (bytes: any) => {
    if (typeof bytes !== 'number') {
        return '—';
    }

    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const FIELD_LABELS: Record<string, string> = {
    title: 'Name',
    category: 'Category',
    image: 'Photo',
    content: 'Text',
    name: 'Name',
    icon: 'Icon',
    color: 'Color',
    text: 'Text',
    nick_name: 'Nick',
    description: 'Description',
    avatar: 'Avatar',
    is_email_public: 'Email is visible to everyone',
    is_saved_posts_public: 'Saved posts are visible to everyone',
    is_last_activity_public: 'Activity is visible to everyone',
};

export const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

const WORDS: Record<string, string> = {
    added: 'added',
    changed: 'replaced',
    removed: 'deleted',
};

const formatValue = (field: string, value: any) => {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'yes' : 'no';
    }

    if ((field === 'icon' || field === 'color') && typeof value === 'number') {
        return `№${value}`;
    }

    return String(value);
};

export const describeChanges = (changes: any) =>
    (Array.isArray(changes) ? changes : []).map((change: any) => {
        const label = fieldLabel(change.field);

        if (change.changed) {
            const sized =
                typeof change.from_length === 'number' &&
                typeof change.to_length === 'number'
                    ? ` · ${change.from_length} → ${change.to_length} chars`
                    : '';

            return { label, from: null, to: `edited${sized}` };
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
    change?: {
        kind: 'role' | 'status' | 'text';
        from: string | null;
        to: string;
    };
};

export type LogDetails = {
    time: string | null;
    route: { method: string; path: string } | null;
    facts: DetailRow[];
    changes: ReturnType<typeof describeChanges>;
    request: DetailRow[];
    error: DetailRow[];
    stack: string | null;
};

const KNOWN_KEYS = new Set([
    'request',
    'changes',
    'category_snapshot',
    'stack',
    'system',
    'user',
    'user_nick',
    'user_role',
    'user_avatar',
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
    'size_bytes',
    'removed_files',
    'original_name',
    'app_version',
    'db_version',
    'source_db',
    'from_version',
    'to_version',
    'from_app_version',
    'source_backup',
    'backup',
    'safety_backup',
    'safety_removed',
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

const yesNo = (value: any) => (value ? 'yes' : 'no');

export type KnownNames = {
    user?: string;
    target?: string;
    post?: string;
    category?: string;
};

export function describeDetails(
    log: any,
    formatDate: (date: any) => string = (date) => String(date),
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
        add('Source', 'System');
    } else if (data.user) {
        add(
            'Who',
            `${data.user_nick ?? names.user ?? 'deleted user'}${data.user_role ? ` · ${data.user_role}` : ''}`,
        );
        add('User ID', data.user, true);
    }

    add('Post', data.post_title ?? names.post);
    add('Post ID', data.post, true);
    add('Category', data.category_snapshot?.name ?? names.category);
    add('Category ID', data.category, true);
    add('Comment', data.comment_text);
    add('Comment ID', data.comment, true);
    add('Reply to a comment', data.parent_comment, true);

    const target = data.target_user ?? data.updated_user;

    add('On the user', data.target_nick ?? names.target);
    add('User ID', target, true);

    if (present(data.old_role) || present(data.new_role)) {
        add(
            'Role',
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
            'Status',
            `${statusLabel(data.previous_status)} → ${statusLabel(data.status)}`,
            false,
            {
                kind: 'status',
                from: String(data.previous_status),
                to: String(data.status),
            },
        );
    } else if (log?.type === 'update_support_status') {
        add('Status', statusLabel(data.status));
    } else if (log?.type === 'backup_restore_result') {
        add('Result', data.status === 'success' ? 'success' : 'failed');
    }

    add('Comments deleted', data.comments_removed);
    add('Comments deleted (including replies)', data.removed);
    add('Likes before', data.likes_count);
    add('Views before', data.views_count);
    add('Text length', data.content_length);

    if (typeof data.has_image === 'boolean') {
        add('With an image', yesNo(data.has_image));
    }

    add('Request type', data.kind ? kindLabel(data.kind) : null);
    add('Guest email', data.email);
    add('Message', data.message_preview);
    add('Reply', data.reply_preview);
    add('Replied', data.author_type);
    add('Request ID', data.support_request, true);

    add('File', data.file_name, true);
    add('Uploaded file name', data.original_name, true);
    add('App version in the archive', data.app_version);
    add('Data version in the archive', data.db_version);
    add('Database in the archive', data.source_db);
    if (log?.type === 'db_version_sync') {
        add(
            'Data version',
            `${data.from_version ?? '—'} → ${data.to_version ?? '—'}`,
        );
        add(
            'App version',
            `${data.from_app_version ?? '—'} → ${data.app_version ?? '—'}`,
        );
    }
    add('Backup ID in the manifest', data.source_backup, true);
    add('File size', data.size_bytes ? formatSize(data.size_bytes) : null);
    add('Deleted by rotation', data.removed_files);
    add('Restore rolled back to the previous state', data.rolled_back ? 'yes' : null);
    add('Safety snapshot', data.safety_backup, true);
    if (data.safety_removed) {
        add('Snapshot after restore', 'deleted');
    }
    add('Run', data.trigger);

    add('Version', data.version);
    add('Node', data.node);
    add('Environment', data.env);
    add('Port', data.port);

    Object.entries(data).forEach(([key, value]) => {
        if (
            !KNOWN_KEYS.has(key) &&
            value !== null &&
            typeof value !== 'object'
        ) {
            add(key, value, true);
        }
    });

    add('Record ID', log?._id, true);

    const request: DetailRow[] = [];
    const meta = data.request ?? {};
    const method = meta.method ?? data.method;
    const path = meta.path ?? data.path;
    const route =
        present(method) || present(path)
            ? { method: String(method ?? ''), path: String(path ?? '') }
            : null;

    [
        ['Request ID', meta.id],
        ['IP', meta.ip],
        ['Browser', meta.user_agent],
    ].forEach(([label, value]) => {
        if (present(value)) {
            request.push({
                label: label as string,
                value: String(value),
                mono: label !== 'Browser',
            });
        }
    });

    const error: DetailRow[] = [];

    if (log?.type === 'server_error' && present(data.status)) {
        error.push({ label: 'Response code', value: String(data.status) });
    }

    if (present(data.error)) {
        error.push({ label: 'Error', value: String(data.error), mono: true });
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
