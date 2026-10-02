'use client';

import UserBadge from '../UserBadge/index';
import './CurrentUserBadge.scss';
import { useContext } from 'react';
import { AppContext } from '@/providers/AppProviders';
import { Link } from '@/navigation';
import ProfileIcon from '../../assets/svg/profile.svg';

const guestIcon = (defaultAvatar: any) =>
    defaultAvatar ?? (
        <ProfileIcon className="user_badge_guest_icon" aria-hidden="true" />
    );

const CurrentUserBadge = ({
    className,
    asLink = true,
    defaultAvatar,
    avatarOnly = false,
}: any) => {
    const { profile } = useContext(AppContext);

    return profile ? (
        <UserBadge
            data={profile}
            className={className}
            asLink={asLink}
            avatarOnly={avatarOnly}
        />
    ) : asLink ? (
        <Link
            href={'/auth/login'}
            className={`user_badge ${className ?? ''} app-transition`}
        >
            {guestIcon(defaultAvatar)}
        </Link>
    ) : (
        <div className={`user_badge ${className ?? ''} app-transition`}>
            {guestIcon(defaultAvatar)}
        </div>
    );
};

export default CurrentUserBadge;
