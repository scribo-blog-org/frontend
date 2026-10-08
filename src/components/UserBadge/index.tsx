'use client';

import { Link } from '@/navigation';

import './UserBadge.scss';

import Verified from '../../assets/svg/verified.svg';
import Tooltip from '../Ui/Tooltip/index';
import UserAvatar from './UserAvatar';

const UserBadge = ({
    data,
    className,
    asLink = true,
    avatarOnly = false,
}: any) => {
    if (!data) return <></>;

    const content = (
        <>
            <UserAvatar data={data} />
            {avatarOnly ? null : (
                <div className="user_badge_info">
                    <p className="user_badge_info_name">{data.nick_name}</p>
                    {data?.is_verified ? (
                        <Tooltip text="Verified user" position="bottom">
                            <Verified
                                key={`verified-${data._id}`}
                                className="user_badge_info_verified verified-icon"
                            />
                        </Tooltip>
                    ) : (
                        <></>
                    )}
                </div>
            )}
        </>
    );

    if (!asLink) {
        return (
            <div
                className={`user_badge app-transition ${avatarOnly ? 'user_badge_avatar_only' : ''} ${className ?? ''}`}
            >
                {content}
            </div>
        );
    }

    return (
        <Link
            className={`user_badge app-transition ${avatarOnly ? 'user_badge_avatar_only' : ''} ${className ?? ''}`}
            href={`/users/${data.nick_name}`}
        >
            {content}
        </Link>
    );
};

export default UserBadge;
