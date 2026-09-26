'use client';

import "./MobileNavigationBar.scss";

import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "@/navigation";

import { AppContext } from "@/providers/AppProviders";
import { getUnreadCount } from "../../api/chat.api";
import { socketService } from "../../sockets/socket.service";

import HomeIcon from "../../assets/svg/home-icon.svg";
import SearchIcon from "../../assets/svg/search.svg";
import NotificationsIcon from "../../assets/svg/notification.svg";
import CommentIcon from "../../assets/svg/comment.svg";
import PlusIcon from "../../assets/svg/plus-icon.svg";
import RedirectIcon from "../../assets/svg/redirect.svg";

import SwitchBar from "../Ui/SwitchBar";
import CurrentUserBadge from "../CurrentUserBadge/index";
import { isAdminRole } from "../AccountMenu/getAccountMenuBody";
import { isPathActive, navigateOrScrollTop } from "../../utils/navigation";

const MobileNavigationBar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile } = useContext(AppContext);

    const [unreadMessages, setUnreadMessages] = useState<any>(0);
    const hasUnread = Boolean(profile?.notifications?.some((item: any) => item.is_read === false));

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

    const canCreate = Boolean(profile?.permissions?.includes("create_post"));
    const isAdmin = isAdminRole(profile?.role);
    const onAdminPanel = location.pathname.startsWith("/admin-panel");

    const slots = useMemo(() => {
        const home = {
            id: "home",
            path: "/posts",
            node: <HomeIcon />,
            onClick: () => navigateOrScrollTop(navigate, location.pathname, "/posts"),
        };

        const search = {
            id: "search",
            path: "/search",
            node: <SearchIcon />,
            onClick: () => navigateOrScrollTop(navigate, location.pathname, "/search"),
        };

        const notifications = {
            id: "notifications",
            path: "/notifications",
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
            onClick: () => navigateOrScrollTop(navigate, location.pathname, "/notifications"),
        };

        const messages = {
            id: "messages",
            path: "/messages",
            node: (
                <>
                    {unreadMessages > 0 ? (
                        <span className="navigation_bar_count_badge">
                            {unreadMessages > 99 ? "99+" : unreadMessages}
                        </span>
                    ) : null}
                    <CommentIcon />
                </>
            ),
            onClick: () => navigateOrScrollTop(navigate, location.pathname, "/messages"),
        };

        const create = {
            id: "create",
            path: "/create-post",
            node: <PlusIcon />,
            onClick: () => navigate("/create-post"),
        };

        const admin = {
            id: "admin",
            path: "/admin-panel",
            node: <RedirectIcon />,
            onClick: () => {
                if (onAdminPanel) {
                    navigateOrScrollTop(navigate, location.pathname, "/posts");
                    return;
                }

                navigate("/admin-panel?tab=dashboard");
            },
        };

        const profileSlot = profile
            ? {
                id: "profile",
                path: `/users/${profile.nick_name}`,
                extraPaths: ["/settings", "/support/mine"],
                node: <CurrentUserBadge asLink={false} avatarOnly />,
                onClick: () =>
                    navigateOrScrollTop(navigate, location.pathname, `/users/${profile.nick_name}`),
            }
            : {
                id: "login",
                path: "/auth/login",
                extraPaths: ["/auth/register"],
                node: <CurrentUserBadge asLink={false} avatarOnly />,
                onClick: () => navigate("/auth/login"),
            };

        const left = [home, search];

        if (profile) {
            left.push(notifications, messages);
        }

        const right: any[] = [];

        if (canCreate) {
            right.push(create);
        }

        if (isAdmin) {
            right.push(admin);
        }

        right.push(profileSlot);

        return [...left, ...right];
    }, [
        profile,
        navigate,
        hasUnread,
        unreadMessages,
        canCreate,
        isAdmin,
        onAdminPanel,
        location,
    ]);

    const isSlotActive = (item: any) => {
        if (isPathActive(location.pathname, item.path)) {
            return true;
        }

        return Boolean(item.extraPaths?.some((path: any) => isPathActive(location.pathname, path)));
    };

    const activeIndex = slots.findIndex((item: any) => isSlotActive(item));

    return (
        <nav className={`navigation_bar ${slots.length >= 5 ? "navigation_bar_compact" : ""}`}>
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
}

export default MobileNavigationBar;
