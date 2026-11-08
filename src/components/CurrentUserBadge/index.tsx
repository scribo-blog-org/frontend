'use client';

import UserBadge from '../UserBadge/index';
import './CurrentUserBadge.scss';
import { useContext } from 'react';
import { AppContext } from '@/providers/AppProviders';
import { Link } from '@/navigation';
import UserAvatar from '../UserBadge/UserAvatar';
import ProfileIcon from '../../assets/svg/profile.svg';

const guestIcon = (useIcon: any) =>
    useIcon ? (
        <ProfileIcon className="user_badge_guest_icon" aria-hidden="true" />
    ) : (
        <UserAvatar data={null} />
    );

const CurrentUserBadge = ({
    className,
    asLink = true,
    guestAsIcon = false,
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
            {guestIcon(guestAsIcon)}
        </Link>
    ) : (
        <div className={`user_badge ${className ?? ''} app-transition`}>
            {guestIcon(guestAsIcon)}
        </div>
    );
};

export default CurrentUserBadge;
