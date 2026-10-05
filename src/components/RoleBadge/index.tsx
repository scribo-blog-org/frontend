'use client';

import './RoleBadge.scss';

import UserIcon from '../../assets/svg/profile.svg';
import AdminIcon from '../../assets/svg/protected-icon.svg';
import AuthorIcon from '../../assets/svg/author.svg';
import ModeratorIcon from '../../assets/svg/shield-security.svg';
import TechAdminIcon from '../../assets/svg/tech-admin.svg';

import Tooltip from '../../components/Ui/Tooltip/index';

const BADGES: Record<string, { label: string; Icon: any }> = {
    user: { label: 'User', Icon: UserIcon },
    author: { label: 'Author', Icon: AuthorIcon },
    moderator: { label: 'Moderator', Icon: ModeratorIcon },
    admin: { label: 'Administrator', Icon: AdminIcon },
    tech_admin: { label: 'Technical administrator', Icon: TechAdminIcon },
};

/**
 * Plain users get no badge on profiles and posts, so `withUser` is opt-in
 * for screens that need to show every role, such as the admin panel.
 */
const RoleBadge = ({
    user,
    withUser = false,
    tooltip = true,
    children,
}: any) => {
    const badge = BADGES[user?.role];

    if (!badge || (user.role === 'user' && !withUser)) {
        return <></>;
    }

    const { Icon, label } = badge;
    const content = (
        <span className={`role_badge role_${user.role} app-transition`}>
            <Icon />
            <span className="role_badge_label">{label}</span>
            {children}
        </span>
    );

    return tooltip ? <Tooltip text={label}>{content}</Tooltip> : content;
};

export default RoleBadge;
