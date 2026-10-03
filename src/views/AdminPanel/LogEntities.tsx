'use client';

import { useContext } from 'react';

import { useNavigate } from '@/navigation';
import { AppContext } from '@/providers/AppProviders';

import RedirectIcon from '../../assets/svg/redirect.svg';
import FilterIcon from '../../assets/svg/filter.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import SupportIcon from '../../assets/svg/support.svg';
import BackupIcon from '../../assets/svg/backup.svg';
import GlobalIcon from '../../assets/svg/global.svg';

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

const GLYPHS: any = {
    post: PostIcon,
    category: TagIcon,
    comment: CommentIcon,
    support: SupportIcon,
    backup: BackupIcon,
    deploy: GlobalIcon,
};

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
            {deleted ? <span className="log_chip_tag">deleted</span> : null}
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
                    title: 'Go to profile',
                    onClick: () =>
                        data
                            ? navigate(`/users/${data.nick_name}`)
                            : showToast({
                                  type: 'error',
                                  message: 'User deleted',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'All actions by the user',
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
                    title: 'Open post',
                    onClick: () =>
                        data
                            ? navigate(`/posts/${data._id}`)
                            : showToast({
                                  type: 'error',
                                  message: 'Post deleted',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'Post history',
                    onClick: () => setFilter({ type: 'post', id }),
                    icon: <FilterIcon />,
                },
            ]}
        >
            <span className="log_entity">
                <EntityView
                    kind="post"
                    name={data?.title ?? snapshotTitle ?? 'Post'}
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
                    title: 'Category posts',
                    onClick: () =>
                        data
                            ? navigate(`/?filter=${data._id}`)
                            : showToast({
                                  type: 'error',
                                  message: 'Category deleted',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'Category history',
                    onClick: () => setFilter({ type: 'category', id }),
                    icon: <FilterIcon />,
                },
            ]}
        >
            <span className="log_entity">
                <EntityView
                    kind="category"
                    name={shown?.name ?? 'Category'}
                    color={shown?.color}
                    deleted={!data}
                />
            </span>
        </Popup>
    );
};

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
                    title: 'Go to the comment',
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
                    title: 'Open request',
                    onClick: () =>
                        accessKey
                            ? navigate(`/support/${accessKey}`)
                            : showToast({
                                  type: 'error',
                                  message: 'Request not found',
                              }),
                    icon: <RedirectIcon />,
                },
                {
                    title: 'Request history',
                    onClick: () => setFilter({ type: 'support_request', id }),
                    icon: <FilterIcon />,
                },
            ]}
        >
            <span className="log_entity">
                <EntityView
                    kind="support"
                    name={kindLabel(kind) || 'Request'}
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
        Guest{email ? ` · ${email}` : ''}
    </span>
);

export const SystemEntity = () => (
    <span className="log_entity log_entity_muted">System</span>
);

export const TextEntity = ({ children }: any) => (
    <span className="log_entity">
        <EntityView kind="text" name={children} />
    </span>
);

export const BackupEntity = ({ name }: any) => (
    <span className="log_entity log_entity_muted">
        <EntityView kind="backup" name={name} />
    </span>
);

export const DeployEntity = ({ name }: any) => (
    <span className="log_entity log_entity_muted">
        <EntityView kind="deploy" name={name} />
    </span>
);

export const Arrow = () => (
    <ArrowIcon className="log_arrow" aria-hidden="true" />
);

const ROLE_BADGES = ['author', 'moderator', 'admin', 'tech_admin'];

const PLAIN_ROLES: Record<string, string> = { user: 'User' };

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

export const StatusChange = ({ from, to }: any) => (
    <span className="log_role_change">
        {from ? (
            <>
                <SupportStatus status={from} />
                <Arrow />
            </>
        ) : null}
        <SupportStatus status={to} />
    </span>
);
