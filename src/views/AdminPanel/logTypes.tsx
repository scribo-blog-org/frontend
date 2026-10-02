import PlusIcon from '../../assets/svg/plus-icon.svg';
import EditIcon from '../../assets/svg/edit.svg';
import DeleteIcon from '../../assets/svg/delete.svg';
import NewUserIcon from '../../assets/svg/new-user.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import LikeIcon from '../../assets/svg/like-filled.svg';
import BookmarkIcon from '../../assets/svg/bookmark-filled.svg';
import WarningIcon from '../../assets/svg/warning-icon.svg';
import InfoIcon from '../../assets/svg/info.svg';
import ShieldIcon from '../../assets/svg/shield-security.svg';
import SettingsIcon from '../../assets/svg/settings.svg';
import PeoplesIcon from '../../assets/svg/peoples.svg';

import { kindLabel, statusLabel } from '../Support/constants';
export { describeChanges, fieldLabel } from './logFormat';

export type LogTone =
    'create' | 'update' | 'delete' | 'info' | 'error' | 'register';

/** Что показывать в колонке «объект» строки лога. */
export type LogObject =
    'post' | 'category' | 'user' | 'support' | 'backup' | 'system' | null;

export type LogTypeConfig = {
    /** Название для фильтра по типу. */
    title: string;
    tone: LogTone;
    icon: any;
    /** Что сделал автор, одной фразой. */
    text: (log: any) => string;
    object: LogObject;
};

const supportText = (log: any) =>
    log.data?.kind === 'complaint'
        ? 'Оставил жалобу'
        : log.data?.kind === 'help'
          ? 'Запросил помощь'
          : 'Оставил запрос';

export const LOG_TYPES: Record<string, LogTypeConfig> = {
    create_post: {
        title: 'Создание поста',
        tone: 'create',
        icon: PlusIcon,
        text: () => 'Создал пост',
        object: 'post',
    },
    update_post: {
        title: 'Редактирование поста',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Отредактировал пост',
        object: 'post',
    },
    delete_post: {
        title: 'Удаление поста',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Удалил пост',
        object: 'post',
    },
    like_post: {
        title: 'Лайк поста',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Поставил лайк посту',
        object: 'post',
    },
    unlike_post: {
        title: 'Снятие лайка с поста',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Убрал лайк с поста',
        object: 'post',
    },
    save_post: {
        title: 'Сохранение поста',
        tone: 'info',
        icon: BookmarkIcon,
        text: () => 'Сохранил пост',
        object: 'post',
    },
    unsave_post: {
        title: 'Удаление поста из сохранённых',
        tone: 'info',
        icon: BookmarkIcon,
        text: () => 'Убрал пост из сохранённых',
        object: 'post',
    },
    comment_post: {
        title: 'Комментарий',
        tone: 'create',
        icon: CommentIcon,
        text: () => 'Оставил комментарий',
        object: 'post',
    },
    reply_comment: {
        title: 'Ответ на комментарий',
        tone: 'create',
        icon: CommentIcon,
        text: () => 'Ответил на комментарий',
        object: 'post',
    },
    update_comment: {
        title: 'Редактирование комментария',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Изменил комментарий',
        object: 'post',
    },
    delete_comment: {
        title: 'Удаление комментария',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Удалил комментарий',
        object: 'post',
    },
    like_comment: {
        title: 'Лайк комментария',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Поставил лайк комментарию',
        object: 'post',
    },
    unlike_comment: {
        title: 'Снятие лайка с комментария',
        tone: 'info',
        icon: LikeIcon,
        text: () => 'Убрал лайк с комментария',
        object: 'post',
    },
    register: {
        title: 'Регистрация',
        tone: 'register',
        icon: NewUserIcon,
        text: () => 'Зарегистрировался',
        object: null,
    },
    update_profile: {
        title: 'Изменение профиля',
        tone: 'update',
        icon: SettingsIcon,
        text: () => 'Изменил свой профиль',
        object: null,
    },
    follow_user: {
        title: 'Подписка',
        tone: 'info',
        icon: PeoplesIcon,
        text: () => 'Подписался на',
        object: 'user',
    },
    unfollow_user: {
        title: 'Отписка',
        tone: 'info',
        icon: PeoplesIcon,
        text: () => 'Отписался от',
        object: 'user',
    },
    update_role: {
        title: 'Смена роли',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Изменил роль пользователя',
        object: 'user',
    },
    create_conversation: {
        title: 'Начало чата',
        tone: 'create',
        icon: CommentIcon,
        text: () => 'Начал чат с',
        object: 'user',
    },
    delete_conversation: {
        title: 'Удаление чата',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Удалил чат с',
        object: 'user',
    },
    create_category: {
        title: 'Создание категории',
        tone: 'create',
        icon: PlusIcon,
        text: () => 'Создал категорию',
        object: 'category',
    },
    update_category: {
        title: 'Редактирование категории',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Отредактировал категорию',
        object: 'category',
    },
    delete_category: {
        title: 'Удаление категории',
        tone: 'delete',
        icon: DeleteIcon,
        text: () => 'Удалил категорию',
        object: 'category',
    },
    create_support_request: {
        title: 'Обращение',
        tone: 'create',
        icon: PlusIcon,
        text: supportText,
        object: 'support',
    },
    reply_support_request: {
        title: 'Ответ на обращение',
        tone: 'update',
        icon: CommentIcon,
        text: (log) =>
            log.data?.author_type === 'requester'
                ? 'Дополнил обращение'
                : 'Ответил на обращение',
        object: 'support',
    },
    update_support_status: {
        title: 'Статус обращения',
        tone: 'update',
        icon: EditIcon,
        text: () => 'Сменил статус обращения',
        object: 'support',
    },
    backup_run: {
        title: 'Запуск бекапа',
        tone: 'info',
        icon: ShieldIcon,
        text: () => 'Запустил бекап вручную',
        object: null,
    },
    backup_restore: {
        title: 'Запуск отката',
        tone: 'delete',
        icon: ShieldIcon,
        text: () => 'Запустил откат на бекап',
        object: 'backup',
    },
    backup_restore_result: {
        title: 'Итог отката',
        tone: 'update',
        icon: ShieldIcon,
        text: (log) =>
            log.data?.status === 'success'
                ? 'Откат завершён'
                : log.data?.rolled_back
                  ? 'Откат не удался, состояние возвращено'
                  : 'Откат не удался',
        object: 'backup',
    },
    backup_failed: {
        title: 'Бекап не удался',
        tone: 'error',
        icon: WarningIcon,
        text: () => 'Бекап не удался',
        object: 'system',
    },
    server_start: {
        title: 'Запуск сервера',
        tone: 'register',
        icon: InfoIcon,
        text: () => 'Сервер запущен',
        object: 'system',
    },
    server_error: {
        title: 'Ошибка сервера',
        tone: 'error',
        icon: WarningIcon,
        text: (log) => `Ошибка сервера ${log.data?.status ?? 500}`,
        object: 'system',
    },
};

/** Запасной вариант для типа, о котором frontend ещё не знает: строка не должна быть пустой. */
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
