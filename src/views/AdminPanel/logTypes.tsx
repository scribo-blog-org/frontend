
import { kindLabel, statusLabel } from '../Support/constants';
export { describeChanges, fieldLabel } from './logFormat';

export type LogTone =
    'create' | 'update' | 'delete' | 'info' | 'error' | 'register';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogObject =
    | 'post'
    | 'category'
    | 'user'
    | 'support'
    | 'backup'
    | 'upload'
    | 'system'
    | 'group'
    | 'method'
    | null;

export type LogTypeConfig = {
    title: string;
    tone: LogTone;
    text: (log: any) => string;
    object: LogObject;
};

const supportText = (log: any) =>
    log.data?.kind === 'complaint'
        ? 'Filed a complaint'
        : log.data?.kind === 'help'
          ? 'Asked for help'
          : 'Submitted a request';

export const LOG_TYPES: Record<string, LogTypeConfig> = {
    create_post: {
        title: 'Post creation',
        tone: 'create',
        text: () => 'Created a post',
        object: 'post',
    },
    update_post: {
        title: 'Editing a post',
        tone: 'update',
        text: () => 'Edited a post',
        object: 'post',
    },
    delete_post: {
        title: 'Post deletion',
        tone: 'delete',
        text: () => 'Deleted a post',
        object: 'post',
    },
    like_post: {
        title: 'Post like',
        tone: 'info',
        text: () => 'Liked a post',
        object: 'post',
    },
    unlike_post: {
        title: 'Removing a like from a post',
        tone: 'info',
        text: () => 'Unliked a post',
        object: 'post',
    },
    save_post: {
        title: 'Saving a post',
        tone: 'info',
        text: () => 'Saved a post',
        object: 'post',
    },
    unsave_post: {
        title: 'Removing a post from saved',
        tone: 'info',
        text: () => 'Removed a post from saved',
        object: 'post',
    },
    comment_post: {
        title: 'Comment',
        tone: 'create',
        text: () => 'Left a comment',
        object: 'post',
    },
    reply_comment: {
        title: 'Reply to a comment',
        tone: 'create',
        text: () => 'Replied to a comment',
        object: 'post',
    },
    update_comment: {
        title: 'Editing a comment',
        tone: 'update',
        text: () => 'Edited a comment',
        object: 'post',
    },
    delete_comment: {
        title: 'Comment deletion',
        tone: 'delete',
        text: () => 'Deleted a comment',
        object: 'post',
    },
    like_comment: {
        title: 'Comment like',
        tone: 'info',
        text: () => 'Liked a comment',
        object: 'post',
    },
    unlike_comment: {
        title: 'Removing a like from a comment',
        tone: 'info',
        text: () => 'Unliked a comment',
        object: 'post',
    },
    register: {
        title: 'Sign up',
        tone: 'register',
        text: () => 'Signed up',
        object: null,
    },
    update_profile: {
        title: 'Profile update',
        tone: 'update',
        text: () => 'Updated their profile',
        object: null,
    },
    follow_user: {
        title: 'Follow',
        tone: 'info',
        text: () => 'Followed',
        object: 'user',
    },
    unfollow_user: {
        title: 'Unfollow',
        tone: 'info',
        text: () => 'Unfollowed',
        object: 'user',
    },
    update_role: {
        title: 'Role change',
        tone: 'update',
        text: () => "Changed a user's role",
        object: 'user',
    },
    update_verified: {
        title: 'Verification',
        tone: 'update',
        text: (log: any) =>
            log?.data?.verified === false
                ? 'Removed the verified badge from'
                : 'Gave the verified badge to',
        object: 'user',
    },
    create_conversation: {
        title: 'Chat started',
        tone: 'create',
        text: () => 'Started a chat with',
        object: 'user',
    },
    delete_conversation: {
        title: 'Chat deletion',
        tone: 'delete',
        text: () => 'Deleted the chat with',
        object: 'user',
    },
    create_category: {
        title: 'Category creation',
        tone: 'create',
        text: () => 'Created a category',
        object: 'category',
    },
    update_category: {
        title: 'Editing a category',
        tone: 'update',
        text: () => 'Edited a category',
        object: 'category',
    },
    delete_category: {
        title: 'Category deletion',
        tone: 'delete',
        text: () => 'Deleted a category',
        object: 'category',
    },
    create_support_request: {
        title: 'Request',
        tone: 'create',
        text: supportText,
        object: 'support',
    },
    reply_support_request: {
        title: 'Reply to a request',
        tone: 'update',
        text: (log) =>
            log.data?.author_type === 'requester'
                ? 'Added to a request'
                : 'Replied to a request',
        object: 'support',
    },
    update_support_status: {
        title: 'Request status',
        tone: 'update',
        text: () => 'Changed a request status',
        object: 'support',
    },
    backup_run: {
        title: 'Backup started',
        tone: 'info',
        text: () => 'Started a backup manually',
        object: null,
    },
    backup_done: {
        title: 'Backup ready',
        tone: 'create',
        text: () => 'Backup created',
        object: 'backup',
    },
    backup_upload: {
        title: 'Backup upload',
        tone: 'create',
        text: () => 'Uploaded a backup file',
        object: 'backup',
    },
    backup_upload_failed: {
        title: 'Archive rejected',
        tone: 'error',
        text: () => 'Uploaded an archive, but it failed the check',
        object: 'upload',
    },
    backup_download: {
        title: 'Backup download',
        tone: 'info',
        text: () => 'Downloaded a backup',
        object: 'backup',
    },
    backup_rotated: {
        title: 'Backup rotation',
        tone: 'delete',
        text: () => 'Old backups deleted',
        object: 'system',
    },
    backup_restore: {
        title: 'Restore started',
        tone: 'delete',
        text: () => 'Started a restore from a backup',
        object: 'backup',
    },
    backup_restore_result: {
        title: 'Restore result',
        tone: 'update',
        text: (log) =>
            log.data?.status === 'success'
                ? 'Restore finished'
                : log.data?.rolled_back
                  ? 'Restore failed and the previous state was brought back'
                  : 'Restore failed',
        object: 'backup',
    },
    backup_failed: {
        title: 'Backup failed',
        tone: 'error',
        text: () => 'Backup failed',
        object: 'system',
    },
    db_version_sync: {
        title: 'Database version',
        tone: 'info',
        text: () => 'The database version was aligned with the app version',
        object: 'system',
    },
    login: {
        title: 'Login',
        tone: 'info',
        text: () => 'Logged in',
        object: 'method',
    },
    password_reset_request: {
        title: 'Password reset request',
        tone: 'info',
        text: () => 'Requested a password reset',
        object: null,
    },
    password_reset: {
        title: 'Password reset',
        tone: 'update',
        text: () => 'Reset their password',
        object: null,
    },
    password_change: {
        title: 'Password change',
        tone: 'update',
        text: () => 'Changed their password',
        object: null,
    },
    update_group: {
        title: 'Group update',
        tone: 'update',
        text: () => 'Updated a group chat',
        object: 'group',
    },
    add_group_member: {
        title: 'Group member added',
        tone: 'create',
        text: () => 'Added to a group chat',
        object: 'user',
    },
    join_group: {
        title: 'Group joined',
        tone: 'create',
        text: () => 'Joined a group chat',
        object: 'group',
    },
    leave_group: {
        title: 'Group left',
        tone: 'info',
        text: () => 'Left a group chat',
        object: 'group',
    },
    remove_group_member: {
        title: 'Group member removed',
        tone: 'delete',
        text: () => 'Removed from a group chat',
        object: 'user',
    },
    update_group_member_role: {
        title: 'Group role change',
        tone: 'update',
        text: (log: any) =>
            log.data?.member_role === 'admin'
                ? 'Made a group admin'
                : 'Removed group admin rights from',
        object: 'user',
    },
    delete_message: {
        title: 'Message deletion',
        tone: 'delete',
        text: () => 'Deleted a chat message',
        object: null,
    },
    delete_messages: {
        title: 'Messages deletion',
        tone: 'delete',
        text: (log: any) => `Deleted ${log.data?.count ?? ''} chat messages`,
        object: null,
    },
    edit_message: {
        title: 'Message edit',
        tone: 'update',
        text: () => 'Edited a chat message',
        object: null,
    },
    db_version_failed: {
        title: 'Database version failed',
        tone: 'error',
        text: () => 'The database version was not synced',
        object: 'system',
    },
    server_start: {
        title: 'Server start',
        tone: 'register',
        text: () => 'Server started',
        object: 'system',
    },
    server_error: {
        title: 'Server error',
        tone: 'error',
        text: (log) => `Server error ${log.data?.status ?? 500}`,
        object: 'system',
    },
};

export const fallbackType = (log: any): LogTypeConfig => ({
    title: log.type,
    tone: log.data?.system ? 'info' : 'update',
    text: () => log.message || log.type,
    object: null,
});

export const typeOf = (log: any): LogTypeConfig =>
    LOG_TYPES[log.type] ?? fallbackType(log);

export const LEVELS: Record<LogLevel, string> = {
    info: 'Info',
    warn: 'Warning',
    error: 'Error',
};

export const levelOf = (log: any): LogLevel =>
    log?.level ?? (typeOf(log).tone === 'error' ? 'error' : 'info');

export const supportLabels = { kindLabel, statusLabel };
