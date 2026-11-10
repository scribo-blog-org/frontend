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
    interactive = true,
    guestAsIcon = false,
    avatarOnly = false,
}: any) => {
    const { profile } = useContext(AppContext);
    const staticClass = interactive ? '' : ' user_badge_static';

    if (profile) {
        return (
            <UserBadge
                data={profile}
                className={className}
                asLink={asLink}
                interactive={interactive}
                avatarOnly={avatarOnly}
            />
        );
    }

    const classes = `user_badge${staticClass} ${className ?? ''} app-transition`;

    return asLink ? (
        <Link href={'/auth/login'} className={classes}>
            {guestIcon(guestAsIcon)}
        </Link>
    ) : (
        <div className={classes}>{guestIcon(guestAsIcon)}</div>
    );
};

export default CurrentUserBadge;
