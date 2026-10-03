import PlusIcon from '../../assets/svg/plus-icon.svg';
import EditIcon from '../../assets/svg/edit.svg';
import DeleteIcon from '../../assets/svg/delete.svg';
import NewUserIcon from '../../assets/svg/new-user.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import MessageIcon from '../../assets/svg/message.svg';
import SupportIcon from '../../assets/svg/support.svg';
import BackupIcon from '../../assets/svg/backup.svg';
import LikeIcon from '../../assets/svg/like-filled.svg';
import BookmarkIcon from '../../assets/svg/bookmark-filled.svg';
import WarningIcon from '../../assets/svg/warning-icon.svg';
import InfoIcon from '../../assets/svg/info.svg';
import GlobalIcon from '../../assets/svg/global.svg';
import SettingsIcon from '../../assets/svg/settings.svg';
import PeoplesIcon from '../../assets/svg/peoples.svg';

import { kindLabel, statusLabel } from '../Support/constants';
export { describeChanges, fieldLabel } from './logFormat';

export type LogTone =
    'create' | 'update' | 'delete' | 'info' | 'error' | 'register';

export type LogObject =
    | 'post'
    | 'category'
    | 'user'
    | 'support'
    | 'backup'
    | 'upload'
    | 'system'
    | null;

export type LogTypeConfig = {
    title: string;
    tone: LogTone;
    icon: any;
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
        icon: PlusIcon,
        text: () => 'Created a post',
        object: 'post',
    },
    update_post: {
        title: 'Editing a post',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Edited a post',
        object: 'post',
    },
    delete_post: {
        title: 'Post deletion',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Deleted a post',
        object: 'post',
    },
    like_post: {
        title: 'Post like',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Liked a post',
        object: 'post',
    },
    unlike_post: {
        title: 'Removing a like from a post',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Unliked a post',
        object: 'post',
    },
    save_post: {
        title: 'Saving a post',
        tone: 'info',
        icon: BookmarkIcon,
        text: () => 'Saved a post',
        object: 'post',
    },
    unsave_post: {
        title: 'Removing a post from saved',
        tone: 'info',
        icon: BookmarkIcon,
        text: () => 'Removed a post from saved',
        object: 'post',
    },
    comment_post: {
        title: 'Comment',
        tone: 'create',
        icon: CommentIcon,
        text: () => 'Left a comment',
        object: 'post',
    },
    reply_comment: {
        title: 'Reply to a comment',
        tone: 'create',
        icon: CommentIcon,
        text: () => 'Replied to a comment',
        object: 'post',
    },
    update_comment: {
        title: 'Editing a comment',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Edited a comment',
        object: 'post',
    },
    delete_comment: {
        title: 'Comment deletion',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Deleted a comment',
        object: 'post',
    },
    like_comment: {
        title: 'Comment like',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Liked a comment',
        object: 'post',
    },
    unlike_comment: {
        title: 'Removing a like from a comment',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Unliked a comment',
        object: 'post',
    },
    register: {
        title: 'Sign up',
        tone: 'register',
        icon: NewUserIcon,
        text: () => 'Signed up',
        object: null,
    },
    update_profile: {
        title: 'Profile update',
        tone: 'update',
        icon: SettingsIcon,
        text: () => 'Updated their profile',
        object: null,
    },
    follow_user: {
        title: 'Follow',
        tone: 'info',
        icon: PeoplesIcon,
        text: () => 'Followed',
        object: 'user',
    },
    unfollow_user: {
        title: 'Unfollow',
        tone: 'info',
        icon: PeoplesIcon,
        text: () => 'Unfollowed',
        object: 'user',
    },
    update_role: {
        title: 'Role change',
        tone: 'update',
        icon: EditIcon,
        text: () => "Changed a user's role",
        object: 'user',
    },
    create_conversation: {
        title: 'Chat started',
        tone: 'create',
        icon: MessageIcon,
        text: () => 'Started a chat with',
        object: 'user',
    },
    delete_conversation: {
        title: 'Chat deletion',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Deleted the chat with',
        object: 'user',
    },
    create_category: {
        title: 'Category creation',
        tone: 'create',
        icon: PlusIcon,
        text: () => 'Created a category',
        object: 'category',
    },
    update_category: {
        title: 'Editing a category',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Edited a category',
        object: 'category',
    },
    delete_category: {
        title: 'Category deletion',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Deleted a category',
        object: 'category',
    },
    create_support_request: {
        title: 'Request',
        tone: 'create',
        icon: PlusIcon,
        text: supportText,
        object: 'support',
    },
    reply_support_request: {
        title: 'Reply to a request',
        tone: 'update',
        icon: SupportIcon,
        text: (log) =>
            log.data?.author_type === 'requester'
                ? 'Added to a request'
                : 'Replied to a request',
        object: 'support',
    },
    update_support_status: {
        title: 'Request status',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Changed a request status',
        object: 'support',
    },
    backup_run: {
        title: 'Backup started',
        tone: 'info',
        icon: BackupIcon,
        text: () => 'Started a backup manually',
        object: null,
    },
    backup_done: {
        title: 'Backup ready',
        tone: 'create',
        icon: BackupIcon,
        text: () => 'Backup created',
        object: 'backup',
    },
    backup_upload: {
        title: 'Backup upload',
        tone: 'create',
        icon: BackupIcon,
        text: () => 'Uploaded a backup file',
        object: 'backup',
    },
    backup_upload_failed: {
        title: 'Archive rejected',
        tone: 'error',
        icon: WarningIcon,
        text: () => 'Uploaded an archive, but it failed the check',
        object: 'upload',
    },
    backup_download: {
        title: 'Backup download',
        tone: 'info',
        icon: BackupIcon,
        text: () => 'Downloaded a backup',
        object: 'backup',
    },
    backup_rotated: {
        title: 'Backup rotation',
        tone: 'delete',
        icon: BackupIcon,
        text: () => 'Old backups deleted',
        object: 'system',
    },
    backup_restore: {
        title: 'Restore started',
        tone: 'delete',
        icon: BackupIcon,
        text: () => 'Started a restore from a backup',
        object: 'backup',
    },
    backup_restore_result: {
        title: 'Restore result',
        tone: 'update',
        icon: BackupIcon,
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
        icon: WarningIcon,
        text: () => 'Backup failed',
        object: 'system',
    },
    db_version_sync: {
        title: 'Database version',
        tone: 'info',
        icon: InfoIcon,
        text: () => 'The database version was aligned with the app version',
        object: 'system',
    },
    server_start: {
        title: 'Server start',
        tone: 'register',
        icon: GlobalIcon,
        text: () => 'Server started',
        object: 'system',
    },
    server_error: {
        title: 'Server error',
        tone: 'error',
        icon: WarningIcon,
        text: (log) => `Server error ${log.data?.status ?? 500}`,
        object: 'system',
    },
};

export const fallbackType = (log: any): LogTypeConfig => ({
    title: log.type,
    tone: log.data?.system ? 'info' : 'update',
    icon: InfoIcon,
    text: () => log.message || log.type,
    object: null,
});

export const typeOf = (log: any): LogTypeConfig =>
    LOG_TYPES[log.type] ?? fallbackType(log);

export const supportLabels = { kindLabel, statusLabel };
