'use client';

import { useContext } from 'react';

import { useNavigate } from '@/navigation';
import { AppContext } from '@/providers/AppProviders';

import RedirectIcon from '../../assets/svg/redirect.svg';
import FilterIcon from '../../assets/svg/filter.svg';
import CommentIcon from '../../assets/svg/comment.svg';

import ArrowIcon from '../../assets/svg/arrow-left.svg';
import PostIcon from '../../assets/svg/post.svg';
import TagIcon from '../../assets/svg/tag.svg';
import Verified from '../../assets/svg/verified.svg';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';

import Popup from '../../components/Ui/Popup';
import RoleBadge from '../../components/RoleBadge/index';
import { imageSrc } from '../../utils/image';
import { CATEGORY_COLORS } from '../../styles/constants';
import { kindLabel, statusLabel } from '../Support/constants';

import './Requests.scss';

/**
 * Сущности, которые встречаются в строках лога. Каждая рисуется компактно и
 * переживает удаление: если живых данных нет, берёт снимок, записанный в лог.
 * Клик открывает меню: перейти к сущности или отфильтровать журнал по ней.
 */

const GLYPHS: any = {
    post: PostIcon,
    category: TagIcon,
    comment: CommentIcon,
    support: CommentIcon,
};

/**
 * Единый вид любой сущности журнала: плашка со значком (у пользователя аватар,
 * у поста, категории, комментария иконка) и названием. Одинаковая везде: в
 * строке, в фильтре и в подсказках поиска, чтобы один и тот же пост или человек
 * узнавался с первого взгляда. Только текст и картинки, без кнопок внутри.
 */
export const EntityView = ({
    kind,
    name,
    avatar,
    verified,
    color,
    deleted = false,
    title,
}: any) => {
    const Glyph = GLYPHS[kind];
    const tint = CATEGORY_COLORS[color as keyof typeof CATEGORY_COLORS];

    return (
        <span
            className={`log_chip${deleted ? ' log_chip_deleted' : ''}`}
            title={title ?? (typeof name === 'string' ? name : undefined)}
        >
            {kind === 'user' ? (
                <img
                    className="log_chip_avatar"
                    src={imageSrc(avatar, DefaultProfileAvatar)}
                    alt=""
                />
            ) : Glyph ? (
                <Glyph
                    className="log_chip_glyph"
                    style={
                        tint ? { color: `var(${tint.variable})` } : undefined
                    }
                />
            ) : null}
            <span className="log_chip_label">{name}</span>
            {verified ? (
                <Verified className="log_chip_verified verified-icon" />
            ) : null}
            {deleted ? <span className="log_chip_tag">удалён</span> : null}
        </span>
    );
};

export const UserEntity = ({
    id,
    data,
    fallbackNick,
    fallbackAvatar,
    setFilter,
}: any) => {
    const navigate = useNavigate();
    const { showToast } = useContext(AppContext);

    return (
        <Popup
            body={[
                {
                    title: 'Перейти в профиль',
                    onClick: () =>
                        data
                            ? navigate(`/users/${data.nick_name}`)
                            : showToast({
                                  type: 'error',
                                  message: 'Пользователь удалён',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'Все действия пользователя',
                    onClick: () => setFilter({ type: 'user', id }),
                    icon: <FilterIcon />,
                },
            ]}
        >
            <span className="log_entity">
                <EntityView
                    kind="user"
                    name={data?.nick_name ?? (fallbackNick || '—')}
                    avatar={data?.avatar ?? fallbackAvatar}
                    verified={data?.is_verified}
                    deleted={!data}
                />
            </span>
        </Popup>
    );
};

export const PostEntity = ({ id, data, snapshotTitle, setFilter }: any) => {
    const navigate = useNavigate();
    const { showToast } = useContext(AppContext);

    return (
        <Popup
            body={[
                {
                    title: 'Открыть пост',
                    onClick: () =>
                        data
                            ? navigate(`/posts/${data._id}`)
                            : showToast({
                                  type: 'error',
                                  message: 'Пост удалён',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'История поста',
                    onClick: () => setFilter({ type: 'post', id }),
                    icon: <FilterIcon />,
                },
            ]}
        >
            <span className="log_entity">
                <EntityView
                    kind="post"
                    name={data?.title ?? snapshotTitle ?? 'Пост'}
                    deleted={!data}
                />
            </span>
        </Popup>
    );
};

export const CategoryEntity = ({ id, data, snapshot, setFilter }: any) => {
    const navigate = useNavigate();
    const { showToast } = useContext(AppContext);
    const shown = data ?? snapshot;

    return (
        <Popup
            body={[
                {
                    title: 'Посты категории',
                    onClick: () =>
                        data
                            ? navigate(`/?filter=${data._id}`)
                            : showToast({
                                  type: 'error',
                                  message: 'Категория удалена',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'История категории',
                    onClick: () => setFilter({ type: 'category', id }),
                    icon: <FilterIcon />,
                },
            ]}
        >
            <span className="log_entity">
                <EntityView
                    kind="category"
                    name={shown?.name ?? 'Категория'}
                    color={shown?.color}
                    deleted={!data}
                />
            </span>
        </Popup>
    );
};

/**
 * Комментарий: цитата, по клику можно перейти прямо к нему. Если комментарий
 * удалён (запись про удаление), открывать нечего, остаётся только текст.
 */
export const CommentEntity = ({ postId, commentId, text, deleted }: any) => {
    const navigate = useNavigate();

    if (!text) {
        return null;
    }

    const view = (
        <span className="log_entity">
            <EntityView kind="comment" name={`«${text}»`} deleted={deleted} />
        </span>
    );

    if (deleted) {
        return view;
    }

    return (
        <Popup
            body={[
                {
                    title: 'Перейти к комментарию',
                    onClick: () =>
                        navigate(`/posts/${postId}`, {
                            state: { comment: commentId, time: Date.now() },
                        }),
                    icon: <RedirectIcon />,
                },
            ]}
        >
            {view}
        </Popup>
    );
};

export const SupportEntity = ({ id, accessKey, kind, setFilter }: any) => {
    const navigate = useNavigate();
    const { showToast } = useContext(AppContext);

    return (
        <Popup
            body={[
                {
                    title: 'Открыть обращение',
                    onClick: () =>
                        accessKey
                            ? navigate(`/support/${accessKey}`)
                            : showToast({
                                  type: 'error',
                                  message: 'Обращение не найдено',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'История обращения',
                    onClick: () => setFilter({ type: 'support_request', id }),
                    icon: <FilterIcon />,
                },
            ]}
        >
            <span className="log_entity">
                <EntityView
                    kind="support"
                    name={kindLabel(kind) || 'Обращение'}
                />
            </span>
        </Popup>
    );
};

export const SupportStatus = ({ status }: any) =>
    status ? (
        <span className={`support_status support_status_${status}`}>
            {statusLabel(status)}
        </span>
    ) : null;

export const GuestEntity = ({ email }: any) => (
    <span className="log_entity log_entity_muted">
        Гость{email ? ` · ${email}` : ''}
    </span>
);

export const SystemEntity = () => (
    <span className="log_entity log_entity_muted">Система</span>
);

/** Простая подпись-плашка для объектов без своей сущности: файл бекапа, версия сервера. */
export const TextEntity = ({ children }: any) => (
    <span className="log_entity">
        <EntityView kind="text" name={children} />
    </span>
);

/** Стрелка «было → стало». Иконка, а не символ: одинаково выглядит в любом шрифте. */
export const Arrow = () => (
    <ArrowIcon className="log_arrow" aria-hidden="true" />
);

const ROLE_BADGES = ['author', 'moderator', 'admin', 'tech_admin'];

// У обычного пользователя на сайте бейджа нет, а в журнале роль называть надо.
const PLAIN_ROLES: Record<string, string> = { user: 'Пользователь' };

/** Роль так, как её рисует сайт: цветной бейдж со значком. */
export const RoleChip = ({ role }: any) =>
    ROLE_BADGES.includes(role) ? (
        <span className="log_role">
            <RoleBadge user={{ role }} />
        </span>
    ) : (
        <span className="log_chip">
            <span className="log_chip_label">
                {PLAIN_ROLES[role] ?? role ?? '—'}
            </span>
        </span>
    );

/** Смена роли: прежняя, стрелка, новая. Если прежней в записи нет, только новая. */
export const RoleChange = ({ from, to }: any) => (
    <span className="log_role_change">
        {from ? (
            <>
                <RoleChip role={from} />
                <Arrow />
            </>
        ) : null}
        <RoleChip role={to} />
    </span>
);
