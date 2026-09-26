'use client';

import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@/navigation";

import { AppContext } from "@/providers/AppProviders";
import { getUnreadCount } from "../../api/chat.api";
import { socketService } from "../../sockets/socket.service";
import { isAdminRole } from "../AccountMenu/getAccountMenuBody";
import { handleSameRouteClick, isPathActive } from "../../utils/navigation";

import PrimaryButton from "../Ui/PrimaryButton/index";

import MainLogo from "../../assets/svg/full-logo-icon.svg";
import HomeIcon from "../../assets/svg/home-icon.svg";
import SearchIcon from "../../assets/svg/search.svg";
import ProfileIcon from "../../assets/svg/profile.svg";
import CommentIcon from "../../assets/svg/comment.svg";
import NotificationIcon from "../../assets/svg/notification.svg";
import PlusIcon from "../../assets/svg/plus-icon.svg";
import RedirectIcon from "../../assets/svg/redirect.svg";
import SettingsIcon from "../../assets/svg/settings.svg";
import InfoIcon from "../../assets/svg/info.svg";

import "./AppSidebar.scss";

function AppSidebar() {
    const { profile } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [unreadMessages, setUnreadMessages] = useState<any>(0);

    const hasUnreadNotifications = Boolean(
        profile?.notifications?.some((item: any) => item.is_read === false)
    );
    const canCreate = Boolean(profile?.permissions?.includes("create_post"));
    const isAdmin = isAdminRole(profile?.role);
    const onAdminPanel = location.pathname.startsWith("/admin-panel");

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

        const unsubscribe = socketService.on("chat:unread", (unread: any) => {
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
            extraPaths.some((item: any) => isPathActive(location.pathname, item));

        return `app-sidebar_item app-transition${active ? " app-sidebar_item_active" : ""}`;
    };

    return (
        <aside className="app-sidebar" aria-label="Навигация">
            <Link
                href="/posts"
                className="app-sidebar_logo app-transition-color"
                onClick={(event: any) => handleSameRouteClick(event, location.pathname, "/posts")}
            >
                <MainLogo className="app-sidebar_logo_icon" />
            </Link>

            <nav className="app-sidebar_nav">
                <Link
                    href="/posts"
                    className={navClass("/posts")}
                    onClick={(event: any) => handleSameRouteClick(event, location.pathname, "/posts")}
                >
                    <HomeIcon className="app-sidebar_item_icon" />
                    <span>Главная</span>
                </Link>

                <Link
                    href="/search"
                    className={navClass("/search")}
                    onClick={(event: any) => handleSameRouteClick(event, location.pathname, "/search")}
                >
                    <SearchIcon className="app-sidebar_item_icon" />
                    <span>Поиск</span>
                </Link>

                {profile ? (
                    <>
                        <Link
                            href={`/users/${profile.nick_name}`}
                            className={navClass(`/users/${profile.nick_name}`)}
                            onClick={(event: any) =>
                                handleSameRouteClick(event, location.pathname, `/users/${profile.nick_name}`)
                            }
                        >
                            <ProfileIcon className="app-sidebar_item_icon" />
                            <span>Профиль</span>
                        </Link>

                        <Link
                            href="/messages"
                            className={navClass("/messages")}
                            onClick={(event: any) => handleSameRouteClick(event, location.pathname, "/messages")}
                        >
                            {unreadMessages > 0 ? (
                                <span className="app-sidebar_badge">
                                    {unreadMessages > 99 ? "99+" : unreadMessages}
                                </span>
                            ) : null}
                            <CommentIcon className="app-sidebar_item_icon" />
                            <span>Сообщения</span>
                        </Link>

                        <Link
                            href="/notifications"
                            className={navClass("/notifications")}
                            onClick={(event: any) =>
                                handleSameRouteClick(event, location.pathname, "/notifications")
                            }
                        >
                            {hasUnreadNotifications ? (
                                <span className="app-sidebar_dot" aria-hidden="true" />
                            ) : null}
                            <NotificationIcon className="app-sidebar_item_icon" />
                            <span>Уведомления</span>
                        </Link>

                        <Link
                            href="/support/mine"
                            className={navClass("/support/mine")}
                            onClick={(event: any) =>
                                handleSameRouteClick(event, location.pathname, "/support/mine")
                            }
                        >
                            <InfoIcon className="app-sidebar_item_icon" />
                            <span>Поддержка</span>
                        </Link>
                    </>
                ) : null}

                {canCreate ? (
                    <PrimaryButton
                        className="app-sidebar_create"
                        onClick={() => navigate("/create-post")}
                    >
                        <PlusIcon />
                        Создать пост
                    </PrimaryButton>
                ) : null}
            </nav>

            <div className="app-sidebar_footer">
                {isAdmin ? (
                    <button
                        type="button"
                        className={navClass(onAdminPanel ? "/posts" : "/admin-panel")}
                        onClick={() =>
                            navigate(
                                onAdminPanel ? "/posts" : "/admin-panel?tab=dashboard"
                            )
                        }
                    >
                        <RedirectIcon className="app-sidebar_item_icon" />
                        <span>{onAdminPanel ? "Домой" : "В админ панель"}</span>
                    </button>
                ) : null}

                {profile ? (
                    <Link
                        href="/settings"
                        className={navClass("/settings")}
                        onClick={(event: any) => handleSameRouteClick(event, location.pathname, "/settings")}
                    >
                        <SettingsIcon className="app-sidebar_item_icon" />
                        <span>Настройки</span>
                    </Link>
                ) : (
                    <PrimaryButton
                        className="app-sidebar_login"
                        onClick={() => navigate("/auth/login")}
                    >
                        Войти
                    </PrimaryButton>
                )}
            </div>
        </aside>
    );
}

export default AppSidebar;
