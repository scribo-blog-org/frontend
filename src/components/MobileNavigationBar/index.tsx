'use client';

import './MobileNavigationBar.scss';

import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getUnreadCount } from '../../api/chat.api';
import { socketService } from '../../sockets/socket.service';

import HomeIcon from '../../assets/svg/home-icon.svg';
import SearchIcon from '../../assets/svg/search.svg';
import NotificationsIcon from '../../assets/svg/notification.svg';
import MessageIcon from '../../assets/svg/message.svg';
import PlusIcon from '../../assets/svg/plus-icon.svg';
import DashboardIcon from '../../assets/svg/dashboard.svg';

import SwitchBar from '../Ui/SwitchBar';
import CurrentUserBadge from '../CurrentUserBadge/index';
import { useAdminAttention } from '../../hooks/useAdminAttention';
import { isAdminRole } from '../AccountMenu/getAccountMenuBody';
import { isPathActive, navigateOrScrollTop } from '../../utils/navigation';

const MobileNavigationBar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile } = useContext(AppContext);

    const [unreadMessages, setUnreadMessages] = useState<any>(0);
    const hasUnread = Boolean(
        profile?.notifications?.some((item: any) => item.is_read === false),
    );

    useEffect(() => {
        if (!profile) {
            setUnreadMessages(0);
            return;
        }

        let cancelled = false;

        getUnreadCount().then((result: any) => {
            if (!cancelled && result?.status) {
                setUnreadMessages(result.data?.unread || 0);
            }
        });

        const unsubscribe = socketService.on('chat:unread', (unread: any) => {
            setUnreadMessages(Number(unread) || 0);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [profile?._id]);

    const canCreate = Boolean(profile?.permissions?.includes('create_post'));
    const isAdmin = isAdminRole(profile?.role);
    const adminAttention = useAdminAttention(profile);
    const onAdminPanel = location.pathname.startsWith('/admin-panel');
    const isOpenChat = /^\/messages\/[^/]+/.test(location.pathname);

    const { slots, floating } = useMemo(() => {
        const home = {
            id: 'home',
            path: '/',
            node: <HomeIcon />,
            onClick: () =>
                navigateOrScrollTop(navigate, location.pathname, '/'),
        };

        const search = {
            id: 'search',
            path: '/search',
            node: <SearchIcon />,
            onClick: () =>
                navigateOrScrollTop(navigate, location.pathname, '/search'),
        };

        const notifications = {
            id: 'notifications',
            path: '/notifications',
            node: (
                <>
                    {hasUnread ? (
                        <span className="navigation_bar_badge">
                            <span className="navigation_bar_badge_dot" />
                        </span>
                    ) : null}
                    <NotificationsIcon />
                </>
            ),
            onClick: () =>
                navigateOrScrollTop(
                    navigate,
                    location.pathname,
                    '/notifications',
                ),
        };

        const messages = {
            id: 'messages',
            path: '/messages',
            node: (
                <>
                    {unreadMessages > 0 ? (
                        <span className="navigation_bar_count_badge">
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                    ) : null}
                    <MessageIcon />
                </>
            ),
            onClick: () =>
                navigateOrScrollTop(navigate, location.pathname, '/messages'),
        };

        const create = {
            id: 'create',
            path: '/create-post',
            node: <PlusIcon />,
            onClick: () => navigate('/create-post'),
        };

        const admin = {
            id: 'admin',
            path: '/admin-panel',
            node: (
                <>
                    {adminAttention.any ? (
                        <span className="navigation_bar_badge">
                            <span className="navigation_bar_badge_dot" />
                        </span>
                    ) : null}
                    {onAdminPanel ? <HomeIcon /> : <DashboardIcon />}
                </>
            ),
            onClick: () => {
                if (onAdminPanel) {
                    navigateOrScrollTop(navigate, location.pathname, '/');
                    return;
                }

                navigate('/admin-panel?tab=dashboard');
            },
        };

        const profileSlot = profile
            ? {
                  id: 'profile',
                  path: `/users/${profile.nick_name}`,
                  extraPaths: ['/settings', '/support/mine'],
                  node: <CurrentUserBadge asLink={false} avatarOnly />,
                  onClick: () =>
                      navigateOrScrollTop(
                          navigate,
                          location.pathname,
                          `/users/${profile.nick_name}`,
                      ),
              }
            : {
                  id: 'login',
                  path: '/auth/login',
                  extraPaths: ['/auth/register'],
                  node: (
                      <CurrentUserBadge asLink={false} avatarOnly guestAsIcon />
                  ),
                  onClick: () => navigate('/auth/login'),
              };

        const slots = [home, search];

        if (profile) {
            slots.push(messages, notifications);
        }

        slots.push(profileSlot);

        return {
            slots,
            // The admin panel already has Home in the bar, so no floating
            // buttons are drawn over its content.
            floating: onAdminPanel
                ? []
                : [
                      ...(canCreate ? [create] : []),
                      ...(isAdmin ? [admin] : []),
                  ],
        };
    }, [
        profile,
        navigate,
        hasUnread,
        unreadMessages,
        canCreate,
        isAdmin,
        adminAttention.any,
        onAdminPanel,
        location,
    ]);

    const isSlotActive = (item: any) => {
        if (isPathActive(location.pathname, item.path)) {
            return true;
        }

        return Boolean(
            item.extraPaths?.some((path: any) =>
                isPathActive(location.pathname, path),
            ),
        );
    };

    const activeIndex = slots.findIndex((item: any) => isSlotActive(item));

    if (isOpenChat) {
        return null;
    }

    return (
        <nav
            className={`navigation_bar ${slots.length >= 5 ? 'navigation_bar_compact' : ''}`}
        >
            {floating.length ? (
                <div className="navigation_bar_floating">
                    {floating.map((item: any) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`navigation_bar_fab float_section blurred app-transition${isSlotActive(item) ? ' navigation_bar_fab_active' : ''}`}
                            aria-label={item.id}
                            onClick={item.onClick}
                        >
                            {item.node}
                        </button>
                    ))}
                </div>
            ) : null}
            <SwitchBar
                className="float_section blurred"
                items={slots.map((item: any) => item.node)}
                activeIndex={activeIndex}
                setActiveIndex={(index: any) => {
                    slots[index]?.onClick?.();
                }}
            />
        </nav>
    );
};

export default MobileNavigationBar;
