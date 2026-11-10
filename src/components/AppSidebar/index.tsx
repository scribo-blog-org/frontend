'use client';

import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { useAdminAttention } from '../../hooks/useAdminAttention';
import { socketService } from '../../sockets/socket.service';
import { isAdminRole } from '../AccountMenu/getAccountMenuBody';
import { handleSameRouteClick, isPathActive } from '../../utils/navigation';

import SideNav, { SideNavList, SideNavItem } from '../SideNav';
import PrimaryButton from '../Ui/PrimaryButton/index';
import UserAvatar from '../UserBadge/UserAvatar';

import MainLogo from '../../assets/svg/full-logo-icon.svg';
import HomeIcon from '../../assets/svg/home-icon.svg';
import SearchIcon from '../../assets/svg/search.svg';
import MessageIcon from '../../assets/svg/message.svg';
import NotificationIcon from '../../assets/svg/notification.svg';
import PlusIcon from '../../assets/svg/plus-icon.svg';
import DashboardIcon from '../../assets/svg/dashboard.svg';
import SettingsIcon from '../../assets/svg/settings.svg';
import SupportIcon from '../../assets/svg/support.svg';
import LoginIcon from '../../assets/svg/login.svg';

import './AppSidebar.scss';

function AppSidebar() {
    const { profile } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();
    const unreadMessages = useUnreadMessages(profile);

    const hasUnreadNotifications = Boolean(
        profile?.notifications?.some((item: any) => item.is_read === false),
    );
    const canCreate = Boolean(profile?.permissions?.includes('create_post'));
    const isAdmin = isAdminRole(profile?.role);
    const adminAttention = useAdminAttention(profile);

    const link = (
        key: string,
        label: string,
        href: string,
        extra: Partial<SideNavItem> & { path?: string } = {},
    ): SideNavItem => {
        const { path = href, ...rest } = extra;

        return {
            key,
            label,
            href,
            active: isPathActive(location.pathname, path),
            onClick: (event: any) =>
                handleSameRouteClick(event, location.pathname, path),
            ...rest,
        };
    };

    const mainItems: SideNavItem[] = [
        link('home', 'Home', '/', { icon: HomeIcon }),
        link('search', 'Search', '/search', { icon: SearchIcon }),
        ...(profile
            ? [
                  link('messages', 'Messages', '/messages', {
                      icon: MessageIcon,
                      badge: unreadMessages,
                  }),
                  link('notifications', 'Notifications', '/notifications', {
                      icon: NotificationIcon,
                      dot: hasUnreadNotifications,
                  }),
                  link('support', 'Support', '/support/mine', {
                      icon: SupportIcon,
                  }),
              ]
            : []),
    ];

    const footerItems: SideNavItem[] = [
        ...(profile
            ? [
                  link('profile', 'Profile', `/users/${profile.nick_name}`, {
                      avatar: (
                          <UserAvatar
                              data={profile}
                              className="side_nav_avatar"
                          />
                      ),
                  }),
              ]
            : []),
        ...(isAdmin
            ? [
                  link('admin', 'Admin panel', '/admin-panel?tab=dashboard', {
                      path: '/admin-panel',
                      icon: DashboardIcon,
                      dot: adminAttention.any,
                  }),
              ]
            : []),
        ...(profile
            ? [
                  link('settings', 'Settings', '/settings', {
                      icon: SettingsIcon,
                  }),
              ]
            : []),
    ];

    return (
        <SideNav
            variant="app"
            className="app-sidebar"
            label="Navigation"
            header={
                <Link
                    href="/"
                    className="app-sidebar_logo"
                    onClick={(event: any) =>
                        handleSameRouteClick(event, location.pathname, '/')
                    }
                >
                    <MainLogo className="app-sidebar_logo_icon" />
                </Link>
            }
            footer={
                <>
                    <SideNavList items={footerItems} />
                    {profile ? null : (
                        <PrimaryButton
                            className="app-sidebar_login"
                            onClick={() => navigate('/auth/login')}
                        >
                            <LoginIcon />
                            Log in
                        </PrimaryButton>
                    )}
                </>
            }
        >
            <SideNavList items={mainItems} />

            {canCreate ? (
                <PrimaryButton
                    className="app-sidebar_create"
                    onClick={() => navigate('/create-post')}
                >
                    <PlusIcon />
                    Create post
                </PrimaryButton>
            ) : null}
        </SideNav>
    );
}

export default AppSidebar;
