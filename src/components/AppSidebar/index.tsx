'use client';

import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getUnreadCount } from '../../api/chat.api';
import { socketService } from '../../sockets/socket.service';
import { isAdminRole } from '../AccountMenu/getAccountMenuBody';
import { handleSameRouteClick, isPathActive } from '../../utils/navigation';

import PrimaryButton from '../Ui/PrimaryButton/index';

import MainLogo from '../../assets/svg/full-logo-icon.svg';
import HomeIcon from '../../assets/svg/home-icon.svg';
import SearchIcon from '../../assets/svg/search.svg';
import ProfileIcon from '../../assets/svg/profile.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import NotificationIcon from '../../assets/svg/notification.svg';
import PlusIcon from '../../assets/svg/plus-icon.svg';
import RedirectIcon from '../../assets/svg/redirect.svg';
import SettingsIcon from '../../assets/svg/settings.svg';
import InfoIcon from '../../assets/svg/info.svg';

import './AppSidebar.scss';

function AppSidebar() {
    const { profile } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [unreadMessages, setUnreadMessages] = useState<any>(0);

    const hasUnreadNotifications = Boolean(
        profile?.notifications?.some((item: any) => item.is_read === false),
    );
    const canCreate = Boolean(profile?.permissions?.includes('create_post'));
    const isAdmin = isAdminRole(profile?.role);
    const onAdminPanel = location.pathname.startsWith('/admin-panel');

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

    const navClass = (path: any, extraPaths: any = []) => {
        const active =
            isPathActive(location.pathname, path) ||
            extraPaths.some((item: any) =>
                isPathActive(location.pathname, item),
            );

        return `app-sidebar_item app-transition${active ? ' app-sidebar_item_active' : ''}`;
    };

    return (
        <aside className="app-sidebar" aria-label="Navigation">
            <Link
                href="/"
                className="app-sidebar_logo app-transition-color"
                onClick={(event: any) =>
                    handleSameRouteClick(event, location.pathname, '/')
                }
            >
                <MainLogo className="app-sidebar_logo_icon" />
            </Link>

            <nav className="app-sidebar_nav">
                <Link
                    href="/"
                    className={navClass('/')}
                    onClick={(event: any) =>
                        handleSameRouteClick(event, location.pathname, '/')
                    }
                >
                    <HomeIcon className="app-sidebar_item_icon" />
                    <span>Home</span>
                </Link>

                <Link
                    href="/search"
                    className={navClass('/search')}
                    onClick={(event: any) =>
                        handleSameRouteClick(
                            event,
                            location.pathname,
                            '/search',
                        )
                    }
                >
                    <SearchIcon className="app-sidebar_item_icon" />
                    <span>Search</span>
                </Link>

                {profile ? (
                    <>
                        <Link
                            href={`/users/${profile.nick_name}`}
                            className={navClass(`/users/${profile.nick_name}`)}
                            onClick={(event: any) =>
                                handleSameRouteClick(
                                    event,
                                    location.pathname,
                                    `/users/${profile.nick_name}`,
                                )
                            }
                        >
                            <ProfileIcon className="app-sidebar_item_icon" />
                            <span>Profile</span>
                        </Link>

                        <Link
                            href="/messages"
                            className={navClass('/messages')}
                            onClick={(event: any) =>
                                handleSameRouteClick(
                                    event,
                                    location.pathname,
                                    '/messages',
                                )
                            }
                        >
                            {unreadMessages > 0 ? (
                                <span className="app-sidebar_badge">
                                    {unreadMessages > 99
                                        ? '99+'
                                        : unreadMessages}
                                </span>
                            ) : null}
                            <CommentIcon className="app-sidebar_item_icon" />
                            <span>Messages</span>
                        </Link>

                        <Link
                            href="/notifications"
                            className={navClass('/notifications')}
                            onClick={(event: any) =>
                                handleSameRouteClick(
                                    event,
                                    location.pathname,
                                    '/notifications',
                                )
                            }
                        >
                            {hasUnreadNotifications ? (
                                <span
                                    className="app-sidebar_dot"
                                    aria-hidden="true"
                                />
                            ) : null}
                            <NotificationIcon className="app-sidebar_item_icon" />
                            <span>Notifications</span>
                        </Link>

                        <Link
                            href="/support/mine"
                            className={navClass('/support/mine')}
                            onClick={(event: any) =>
                                handleSameRouteClick(
                                    event,
                                    location.pathname,
                                    '/support/mine',
                                )
                            }
                        >
                            <InfoIcon className="app-sidebar_item_icon" />
                            <span>Support</span>
                        </Link>
                    </>
                ) : null}

                {canCreate ? (
                    <PrimaryButton
                        className="app-sidebar_create"
                        onClick={() => navigate('/create-post')}
                    >
                        <PlusIcon />
                        Create post
                    </PrimaryButton>
                ) : null}
            </nav>

            <div className="app-sidebar_footer">
                {isAdmin ? (
                    <button
                        type="button"
                        className={navClass(
                            onAdminPanel ? '/' : '/admin-panel',
                        )}
                        onClick={() =>
                            navigate(
                                onAdminPanel
                                    ? '/'
                                    : '/admin-panel?tab=dashboard',
                            )
                        }
                    >
                        <RedirectIcon className="app-sidebar_item_icon" />
                        <span>
                            {onAdminPanel ? 'Home' : 'To the admin panel'}
                        </span>
                    </button>
                ) : null}

                {profile ? (
                    <Link
                        href="/settings"
                        className={navClass('/settings')}
                        onClick={(event: any) =>
                            handleSameRouteClick(
                                event,
                                location.pathname,
                                '/settings',
                            )
                        }
                    >
                        <SettingsIcon className="app-sidebar_item_icon" />
                        <span>Settings</span>
                    </Link>
                ) : (
                    <PrimaryButton
                        className="app-sidebar_login"
                        onClick={() => navigate('/auth/login')}
                    >
                        Log in
                    </PrimaryButton>
                )}
            </div>
        </aside>
    );
}

export default AppSidebar;
