'use client';

import Tooltip from '../../components/Ui/Tooltip';
import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import { format_back, format_date_time } from '../../utils/format';

import {
    Arrow,
    CategoryEntity,
    CommentEntity,
    ConversationEntity,
    BackupEntity,
    DeployEntity,
    GuestEntity,
    PostEntity,
    RoleChange,
    StatusChange,
    SupportEntity,
    SupportStatus,
    SystemEntity,
    TextEntity,
    UserEntity,
} from './LogEntities';
import { useEffect, useRef } from 'react';
import { useOverlayPresence } from '../../components/Ui/useOverlayEnter';

import LogDetails from './LogDetails';
import { describeChanges, reasonLabel } from './logFormat';
import { TimingPlate } from './LogTiming';
import { LEVELS, levelOf, typeOf } from './logTypes';

const Changes = ({ changes }: any) => (
    <>
        {describeChanges(changes).map((row: any, index: any) => (
            <span key={index} className="log_change">
                <span className="log_change_label">{row.label}</span>
                {row.from !== null ? (
                    <>
                        <span className="log_change_from">{row.from}</span>
                        <Arrow />
                    </>
                ) : null}
                <span className="log_change_to">{row.to}</span>
            </span>
        ))}
    </>
);

const Quote = ({ text }: any) =>
    text ? (
        <span className="log_quote" title={text}>
            «{text}»
        </span>
    ) : null;

const ErrorText = ({ text, title }: any) =>
    text ? (
        <span className="log_quote log_quote_error" title={title ?? text}>
            {text}
        </span>
    ) : null;

const objectOf = (log: any, config: any, ctx: any) => {
    const data = log.data ?? {};
    const { users, posts, categories, setFilter } = ctx;

    switch (config.object) {
        case 'post':
            return data.post ? (
                <PostEntity
                    id={data.post}
                    data={posts.find((p: any) => p._id === data.post)}
                    snapshotTitle={data.post_title}
                    setFilter={setFilter}
                />
            ) : null;
        case 'category':
            return data.category ? (
                <CategoryEntity
                    id={data.category}
                    data={categories.find((c: any) => c._id === data.category)}
                    snapshot={data.category_snapshot}
                    setFilter={setFilter}
                />
            ) : null;
        case 'user': {
            const id = data.target_user ?? data.updated_user;

            return id ? (
                <UserEntity
                    id={id}
                    data={users.find((u: any) => u._id === String(id))}
                    fallbackNick={data.target_nick}
                    setFilter={setFilter}
                />
            ) : null;
        }
        case 'support':
            return (
                <SupportEntity
                    id={data.support_request}
                    accessKey={data.access_key}
                    kind={data.kind}
                    setFilter={setFilter}
                />
            );
        case 'backup':
            return data.file_name ? (
                <BackupEntity name={data.file_name} />
            ) : null;
        case 'upload':
            return data.original_name ? (
                <TextEntity>{data.original_name}</TextEntity>
            ) : null;
        case 'group':
            return data.conversation ? (
                <ConversationEntity
                    id={data.conversation}
                    title={data.title}
                    setFilter={setFilter}
                />
            ) : null;
        case 'method':
            return data.method ? (
                <TextEntity>
                    {data.method === 'google' ? 'Google' : 'Password'}
                </TextEntity>
            ) : null;
        case 'route':
            return data.route ? (
                <TextEntity>
                    {String(data.route).replace(' /api', ' ')}
                </TextEntity>
            ) : null;
        case 'system': {
            if (log.type === 'server_start') {
                return (
                    <DeployEntity
                        name={[
                            `v${data.version ?? '?'}`,
                            data.sha_short,
                            data.env,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    />
                );
            }

            const text =
                log.type === 'db_version_sync'
                    ? `v${data.app_version ?? '?'} · data ${data.to_version ?? '?'}`
                    : log.type === 'server_error'
                      ? `${data.method ?? ''} ${data.path ?? ''}`.trim()
                      : log.type === 'slow_query'
                        ? `${data.collection ?? '?'}.${data.operation ?? '?'}`
                        : log.type === 'external_failed'
                          ? (data.service ?? '')
                          : log.type === 'backup_rotated'
                            ? data.removed_files
                                ? `${data.removed_files} ${data.removed_files === 1 ? 'file' : 'files'}`
                                : ''
                            : (data.trigger ?? '');

            return text ? <TextEntity>{text}</TextEntity> : null;
        }
        default:
            return null;
    }
};

const COMMENT_TYPES = [
    'comment_post',
    'reply_comment',
    'like_comment',
    'unlike_comment',
];

const changesTitle = (changes: any) =>
    describeChanges(changes)
        .map((row: any) =>
            row.from !== null
                ? `${row.label}: ${row.from} → ${row.to}`
                : `${row.label}: ${row.to}`,
        )
        .join('\n');

const detailsOf = (log: any, setFilter?: any) => {
    const data = log.data ?? {};

    if (Array.isArray(data.changes) && data.changes.length) {
        return {
            node: <Changes changes={data.changes} />,
            title: changesTitle(data.changes),
        };
    }

    if (COMMENT_TYPES.includes(log.type) && data.comment_text) {
        return {
            node: (
                <CommentEntity
                    postId={data.post}
                    commentId={data.comment}
                    text={data.comment_text}
                />
            ),
        };
    }

    switch (log.type) {
        case 'delete_comment':
            return data.comment_text
                ? {
                      node: <CommentEntity text={data.comment_text} deleted />,
                  }
                : {};
        case 'update_role':
            return {
                node: (
                    <RoleChange
                        from={data.old_role}
                        to={data.new_role}
                        setFilter={setFilter}
                    />
                ),
            };
        case 'create_support_request':
            return { node: <Quote text={data.message_preview} /> };
        case 'reply_support_request':
            return { node: <Quote text={data.reply_preview} /> };
        case 'update_support_status':
            return {
                node: data.previous_status ? (
                    <StatusChange
                        from={data.previous_status}
                        to={data.status}
                    />
                ) : (
                    <SupportStatus status={data.status} />
                ),
            };
        case 'server_error':
            return {
                node: <ErrorText text={data.error} />,
                title: data.stack || data.error,
            };
        case 'slow_request':
            return data.total_ms != null
                ? {
                      node: (
                          <TimingPlate
                              timing={{
                                  total: Number(data.total_ms),
                                  db: Number(data.db_ms || 0),
                                  queries: Number(data.db_queries || 0),
                              }}
                          />
                      ),
                  }
                : {};
        case 'slow_query':
            return data.duration_ms != null
                ? {
                      node: (
                          <TimingPlate
                              timing={{
                                  total: Number(data.duration_ms),
                                  db: Number(data.duration_ms),
                                  queries: 0,
                              }}
                          />
                      ),
                  }
                : {};
        case 'rate_limited':
            return { node: <Quote text={data.rule} /> };
        case 'login_failed':
            return {
                node: (
                    <Quote text={data.reason ? reasonLabel(data.reason) : ''} />
                ),
            };
        case 'external_failed':
            return { node: <ErrorText text={data.error} /> };
        case 'backup_failed':
        case 'backup_upload_failed':
        case 'backup_restore_result':
            return { node: <ErrorText text={data.error} /> };
        case 'db_version_failed':
            return { node: <ErrorText text={data.error} /> };
        case 'update_group_member_role':
            return {
                node: (
                    <Quote
                        text={`${data.previous_member_role ?? '—'} → ${data.member_role ?? '—'}`}
                    />
                ),
            };
        default:
            return {};
    }
};

const LogRow = ({
    log,
    users,
    posts,
    categories,
    setFilter,
    expanded = false,
    onToggle,
    onPrev,
    onNext,
}: any) => {
    const itemRef = useRef<any>(null);

    const handleClick = (event: any) => {
        if (
            !event.currentTarget.contains(event.target) ||
            event.target.closest('.log_entity:not(.log_entity_muted)')
        ) {
            return;
        }

        onToggle?.();
    };

    useEffect(() => {
        if (expanded) {
            itemRef.current?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [expanded]);

    const { mounted: detailsMounted, visible: detailsVisible } =
        useOverlayPresence(expanded);

    const config = typeOf(log);
    const level = levelOf(log);
    const data = log.data ?? {};
    const details = detailsOf(log, setFilter);

    const actor = data.system ? (
        <SystemEntity />
    ) : data.user ? (
        <UserEntity
            id={data.user}
            data={users.find((user: any) => user._id === String(data.user))}
            fallbackNick={data.user_nick}
            fallbackAvatar={data.user_avatar}
            setFilter={setFilter}
        />
    ) : (
        <GuestEntity email={data.email} />
    );

    return (
        <div
            ref={itemRef}
            className={`log_item${expanded ? ' log_item_expanded' : ''}`}
        >
            <div
                className={`log_row log_row_level_${level}`}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={handleClick}
                onKeyDown={(event: any) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onToggle?.();
                    }
                }}
            >
                <span
                    className="log_row_level"
                    title={`${LEVELS[level]} · ${config.title}`}
                />
                <div className="log_row_actor">{actor}</div>
                <span className="log_row_verb">{config.text(log)}</span>
                <div className="log_row_object">
                    {objectOf(log, config, {
                        users,
                        posts,
                        categories,
                        setFilter,
                    })}
                </div>
                <div className="log_row_details" title={details.title}>
                    {details.node}
                    {data.repeats ? (
                        <span
                            className="log_badge log_badge_mono log_repeats"
                            title={`${data.repeats} similar events were skipped`}
                        >
                            +{data.repeats}
                        </span>
                    ) : null}
                </div>
                <Tooltip
                    text={format_date_time(log.date_time)}
                    className="log_row_time"
                >
                    <span>{format_back(log.date_time)}</span>
                </Tooltip>
                <ChevronDownIcon className="log_row_chevron" />
            </div>
            <div
                className={`log_item_collapse${detailsVisible ? ' log_item_collapse_open' : ''}`}
            >
                <div className="log_item_collapse_inner">
                    {detailsMounted ? (
                        <LogDetails
                            log={log}
                            config={config}
                            level={level}
                            names={{
                                user: users.find(
                                    (u: any) => u._id === String(data.user),
                                )?.nick_name,
                                target: users.find(
                                    (u: any) =>
                                        u._id ===
                                        String(
                                            data.target_user ??
                                                data.updated_user,
                                        ),
                                )?.nick_name,
                                post: posts.find(
                                    (p: any) => p._id === data.post,
                                )?.title,
                                category: categories.find(
                                    (c: any) => c._id === data.category,
                                )?.name,
                            }}
                            setFilter={setFilter}
                            onPrev={onPrev}
                            onNext={onNext}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default LogRow;
