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

import './Notifications.scss';

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
                ) : items.length ? (
                    items.map((item: any) => {
                        const actor = userMap[item.user] || {
                            nick_name: 'User',
                        };

                        const isUnread = item.is_read === false;

                        return (
                            <div
                                key={item.time}
                                className="notifications_page_item_wrapper"
                            >
                                <article
                                    className={`notifications_page_item app-transition ${
                                        isUnread
                                            ? 'notifications_page_item_unread'
                                            : ''
                                    }`}
                                >
                                    {isUnread && (
                                        <span className="notifications_page_item_dot notifications_page_item_dot_on" />
                                    )}

                                    <div className="notifications_page_item_body">
                                        <UserBadge
                                            data={actor}
                                            asLink={Boolean(userMap[item.user])}
                                        />

                                        <p className="notifications_page_item_message">
                                            <span>
                                                <NotificationMessage
                                                    item={item}
                                                />
                                            </span>
                                        </p>

                                        <Tooltip
                                            text={format_date_time(item.time)}
                                        >
                                            <p className="notifications_page_item_time">
                                                {format_back(item.time)}
                                            </p>
                                        </Tooltip>
                                    </div>
                                </article>
                            </div>
                        );
                    })
                ) : (
                    <p className="notifications_page_empty">
                        No notifications yet
                    </p>
                )}
            </div>
        </div>
    );
};

export default Notifications;
