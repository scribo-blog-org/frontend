'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '@/providers/AppProviders';
import { getUsers, read_notifications } from '../../api/users.api';
import { getProfile } from '../../api/profile.api';
import { socketService } from '../../sockets/socket.service';
import { format_back, format_date_time } from '../../utils/format';

import UserBadge from '../../components/UserBadge/index';
import NotificationMessage from '../../components/NotificationMessage/index';

import Tooltip from '../../components/Ui/Tooltip/index';
import Loading from '../../components/Ui/Loading';
import { Panel, PanelRow } from '../../components/Ui';

import NewUserIcon from '../../assets/svg/new-user.svg';
import ProfileIcon from '../../assets/svg/profile.svg';
import LikeIcon from '../../assets/svg/like-outline.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import ReplyIcon from '../../assets/svg/reply.svg';
import AtIcon from '../../assets/svg/at.svg';
import SupportIcon from '../../assets/svg/support.svg';
import NotificationIcon from '../../assets/svg/notification.svg';

import './Notifications.scss';

const TYPE_ICONS: Record<string, any> = {
    follow: NewUserIcon,
    unfollow: ProfileIcon,
    like_post: LikeIcon,
    comment_post: CommentIcon,
    reply_comment: ReplyIcon,
    mention_post: AtIcon,
    mention_comment: AtIcon,
    support_reply: SupportIcon,
    support_status: SupportIcon,
};

const typeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type] || NotificationIcon;

    return <Icon />;
};

const dayKey = (time: any) => {
    const date = new Date(time);

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const dayLabel = (time: any) => {
    const date = new Date(time);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (dayKey(date) === dayKey(now)) {
        return 'Today';
    }

    if (dayKey(date) === dayKey(yesterday)) {
        return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });
};

const Notifications = () => {
    const { profile, setProfile } = useContext(AppContext);

    const [items, setItems] = useState<any[]>([]);
    const [userMap, setUserMap] = useState<any>({});
    const [usersLoading, setUsersLoading] = useState<any>(true);

    const initialized = useRef(false);

    useEffect(() => {
        if (!profile || initialized.current) {
            return;
        }

        initialized.current = true;

        setItems([...(profile.notifications || [])].reverse());
    }, [profile]);

    const actorKey = useMemo(
        () =>
            items
                .map((item: any) => item.user)
                .filter(Boolean)
                .join(','),
        [items],
    );

    useEffect(() => {
        let cancelled = false;

        const loadActors = async () => {
            const userIds = [...new Set(actorKey.split(',').filter(Boolean))];

            if (userIds.length === 0) {
                setUserMap({});
                setUsersLoading(false);
                return;
            }

            setUsersLoading(true);

            const users = await getUsers(userIds.map((_id: any) => ({ _id })));

            if (cancelled) {
                return;
            }

            setUserMap(
                users?.data?.reduce((acc: any, user: any) => {
                    acc[user._id] = user;
                    return acc;
                }, {}) || {},
            );

            setUsersLoading(false);
        };

        loadActors();

        return () => {
            cancelled = true;
        };
    }, [actorKey]);

    useEffect(() => {
        if (!profile?._id) {
            return;
        }

        const markAsRead = async () => {
            // The socket may have been asleep while notifications arrived, for
            // instance when the page is opened from a push, so the profile in
            // memory can be stale. Show the server's list, with its unread
            // marks, before marking everything read.
            const fresh = await getProfile();

            if (
                fresh?.status === true &&
                Array.isArray(fresh.data?.notifications)
            ) {
                setItems([...fresh.data.notifications].reverse());
            }

            const result = await read_notifications();

            if (result?.status !== true) {
                return;
            }

            setProfile((current: any) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    notifications: result.data.notifications,
                };
            });
        };

        markAsRead();
    }, [profile?._id]);

    useEffect(() => {
        if (!profile?._id) {
            return;
        }
        const unsubscribe = socketService.on(
            'notification',
            async (notifications: any) => {
                setItems([...notifications].reverse());

                const result = await read_notifications();

                if (result?.status !== true) {
                    return;
                }

                setProfile((current: any) => {
                    if (!current) {
                        return current;
                    }

                    return {
                        ...current,
                        notifications: result.data.notifications,
                    };
                });
            },
        );
        return unsubscribe;
    }, [profile?._id]);

    const groups = useMemo(() => {
        const result: any[] = [];

        items.forEach((item: any) => {
            const key = dayKey(item.time);
            const last = result[result.length - 1];

            if (last && last.key === key) {
                last.items.push(item);
                return;
            }

            result.push({ key, label: dayLabel(item.time), items: [item] });
        });

        return result;
    }, [items]);

    return (
        <div className="notifications_page">
            <div className="notifications_page_intro">
                <h1>Notifications</h1>
                <p>
                    Likes, comments, mentions, follows, and replies to requests.
                </p>
            </div>

            <div className="notifications_page_list app-transition">
                {usersLoading ? (
                    <Loading size={40} />
                ) : groups.length ? (
                    groups.map((group: any) => (
                        <Panel
                            key={group.key}
                            title={group.label}
                            action={
                                <span className="notifications_page_count">
                                    {group.items.length}
                                </span>
                            }
                        >
                            {group.items.map((item: any) => {
                                const actor = userMap[item.user] || {
                                    nick_name: 'User',
                                };
                                const isUnread = item.is_read === false;

                                return (
                                    <PanelRow
                                        key={item.time}
                                        className={`notifications_page_item${isUnread ? ' notifications_page_item_unread' : ''}`}
                                        icon={typeIcon(item.type)}
                                        title={
                                            <UserBadge
                                                data={actor}
                                                asLink={Boolean(
                                                    userMap[item.user],
                                                )}
                                            />
                                        }
                                        description={
                                            <NotificationMessage item={item} />
                                        }
                                        trailing={
                                            <>
                                                <Tooltip
                                                    text={format_date_time(
                                                        item.time,
                                                    )}
                                                >
                                                    <span className="notifications_page_item_time">
                                                        {format_back(item.time)}
                                                    </span>
                                                </Tooltip>
                                                <span
                                                    className={`notifications_page_item_dot${isUnread ? ' notifications_page_item_dot_on' : ''}`}
                                                    aria-label={
                                                        isUnread
                                                            ? 'Unread'
                                                            : undefined
                                                    }
                                                />
                                            </>
                                        }
                                    />
                                );
                            })}
                        </Panel>
                    ))
                ) : (
                    <Panel>
                        <PanelRow
                            className="notifications_page_empty"
                            icon={<NotificationIcon />}
                            title="No notifications yet"
                            description="Likes, comments and follows will show up here."
                        />
                    </Panel>
                )}
            </div>
        </div>
    );
};

export default Notifications;
