'use client';

import { useEffect, useState } from 'react';

import Clock from '../../assets/svg/clock.svg';
import RelativeTime from '../RelativeTime/index';
import Tooltip from '../Ui/Tooltip/index';
import { format_date_time } from '../../utils/format';
import { subscribeUserActivity } from '../../sockets/presence';

import './UserActivityStatus.scss';

const UserActivityStatus = ({
    user,
    viewerId,
    isOnline: isOnlineProp,
    activityAt: activityAtProp,
    isTyping = false,
    className = '',
}: any) => {
    const userId = user?._id;
    const [isOnlineLocal, setIsOnlineLocal] = useState<any>(false);
    const [activityAtLocal, setActivityAtLocal] = useState<any>(
        user?.last_activity_at,
    );

    const isOwn = viewerId && userId && String(viewerId) === String(userId);
    const isActivityPublic = user?.is_last_activity_public !== false;
    const canShow = Boolean(userId) && (isOwn || isActivityPublic);

    const isOnline = isOnlineProp ?? isOnlineLocal;
    const activityAt = activityAtProp || activityAtLocal;

    useEffect(() => {
        setActivityAtLocal(user?.last_activity_at);
    }, [user?.last_activity_at]);

    useEffect(() => {
        if (!canShow || isOnlineProp !== undefined) {
            return;
        }

        let cancelled = false;

        const unsubscribe = subscribeUserActivity(
            userId,
            (online: any, at: any) => {
                if (cancelled) {
                    return;
                }
                setIsOnlineLocal(online);
                if (at) {
                    setActivityAtLocal(at);
                }
            },
        );

        return () => {
            cancelled = true;
            void unsubscribe();
        };
    }, [userId, canShow, isOnlineProp]);

    if (isTyping) {
        return (
            <div
                className={`user_activity_status user_activity_status--typing ${className}`.trim()}
            >
                <p>
                    Typing
                    <span
                        className="user_activity_status_dots"
                        aria-hidden="true"
                    >
                        <span />
                        <span />
                        <span />
                    </span>
                </p>
            </div>
        );
    }

    if (!canShow) {
        return null;
    }

    if (isOnline) {
        return (
            <div
                className={`user_activity_status user_activity_status--online ${className}`.trim()}
            >
                <span className="user_activity_status_dot" aria-hidden="true" />
                <p>Online</p>
            </div>
        );
    }

    if (activityAt) {
        return (
            <div className={`user_activity_status ${className}`.trim()}>
                <Clock />
                <Tooltip text={format_date_time(activityAt)}>
                    <p>
                        <RelativeTime date={activityAt} />
                    </p>
                </Tooltip>
            </div>
        );
    }

    return null;
};

export default UserActivityStatus;
