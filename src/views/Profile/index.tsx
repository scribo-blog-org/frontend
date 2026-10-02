'use client';

import { useParams, useNavigate } from '@/navigation';
import { useState, useEffect, useContext, useMemo } from 'react';

import { AppContext } from '@/providers/AppProviders';

import './Profile.scss';

import { getUsers } from '../../api/users.api';
import {
    getPosts,
    unwrapPostsResponse,
    POSTS_PAGE_LIMIT,
} from '../../api/posts.api';
import { format_date_time, format_back } from '../../utils/format';

import { scrollTo } from '../../utils/navigation';
import { decodeRouteParam } from '../../utils/routeParam';

import Verified from '../../assets/svg/verified.svg';
import Calendar from '../../assets/svg/calendar-icon.svg';
import PostIcon from '../../assets/svg/post.svg';
import BookmarkOutline from '../../assets/svg/bookmark-outline.svg';
import SettingsIcon from '../../assets/svg/settings.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import { startConversationWithUser } from '../Messages/index';

import Sceleton from '../../components/Ui/Sceleton/Sceleton';

import Posts from '../../components/Posts/index';
import UserBadge from '../../components/UserBadge/index';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { imageSrc } from '../../utils/image';
import FollowButton from '../../components/FollowButton';
import ActionButton from '../../components/Ui/ActionButton';
import SwitchBar from '../../components/Ui/SwitchBar';
import Tooltip from '../../components/Ui/Tooltip/index';
import RoleBadge from '../../components/RoleBadge/index';
import PageSeo from '../../components/Seo/index';
import UserActivityStatus from '../../components/UserActivityStatus/index';

const Profile = ({
    initialUser = null,
}: {
    initialUser?: Record<string, any> | null;
}) => {
    const params = useParams();
    const id = decodeRouteParam(params.id);
    const navigate = useNavigate();
    const { profile, setProfile, showModalWindow, showToast } =
        useContext(AppContext);
    const [isProfileLoading, setIsProfileLoading] = useState<any>(!initialUser);
    const [activeTab, setActiveTab] = useState<any>(0);
    const [user, setUser] = useState<Record<string, any> | null>(initialUser);
    const [posts, setPosts] = useState<any[]>([]);
    const [postsPage, setPostsPage] = useState<any>(1);
    const [postsPages, setPostsPages] = useState<any>(0);
    const [isPostsLoading, setIsPostsLoading] = useState<any>(true);
    const [followThisUser, setFollowThisUser] = useState<any>(null);
    const [followAnotherUser, setFollowAnotherUser] = useState<any>(null);

    useEffect(() => {
        if (!followThisUser) return;

        setProfile((prevProfile: any) => ({
            ...prevProfile,
            follows: followThisUser?.follower?.follows,
        }));

        setUser((prevUser: any) => {
            if (!prevUser) return prevUser;

            return {
                ...prevUser,
                followers: followThisUser?.followed?.followers,
                follows: followThisUser?.followed?.follows,
            };
        });
    }, [followThisUser, setProfile]);

    useEffect(() => {
        if (!followAnotherUser) return;

        setProfile((prevProfile: any) => ({
            ...prevProfile,
            follows: followAnotherUser?.follower?.follows,
        }));

        setUser((prevUser: any) => {
            if (!prevUser) return prevUser;

            if (prevUser._id !== profile?._id) {
                return prevUser;
            }

            return {
                ...prevUser,
                follows: followAnotherUser?.follower?.follows,
                followers: followAnotherUser?.follower?.followers,
            };
        });
    }, [followAnotherUser, profile?._id, setProfile]);

    useEffect(() => {
        let cancelled = false;

        const getUser = async () => {
            if (!initialUser) {
                setIsProfileLoading(true);
                setUser(null);
            }
            const findNeededUser = await getUsers([{ nick_name: id }]);

            if (cancelled) {
                return;
            }

            if (findNeededUser.status !== true || !findNeededUser.data?.[0]) {
                if (!initialUser) {
                    navigate('/404');
                }
                return;
            }

            setActiveTab(0);
            setUser(findNeededUser.data[0]);
            setIsProfileLoading(false);
        };
        getUser();

        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    const savedPostsIds = useMemo(() => {
        if (!user?._id) {
            return [];
        }

        const ids =
            user._id === profile?._id
                ? profile?.saved_posts
                : user?.saved_posts;

        return (ids || []).map((item: any) => String(item._id || item));
    }, [user?._id, user?.saved_posts, profile?._id, profile?.saved_posts]);

    useEffect(() => {
        setPostsPage(1);
        setPosts([]);
        setIsPostsLoading(true);
    }, [activeTab, user?._id]);

    useEffect(() => {
        if (!user?._id) {
            return;
        }

        let cancelled = false;

        const loadPosts = async () => {
            if (activeTab === 1 && savedPostsIds.length === 0) {
                setPosts([]);
                setPostsPages(0);
                setIsPostsLoading(false);
                return;
            }

            setIsPostsLoading(true);

            const query: any = {
                expand: 'author,category',
                page: postsPage,
                limit: POSTS_PAGE_LIMIT,
            };

            if (activeTab === 0) {
                query.author = user._id;
            } else {
                query._id = savedPostsIds;
            }

            const response = await getPosts(query);

            if (cancelled) {
                return;
            }

            const { items, pagination } = unwrapPostsResponse(response);

            if (response?.status === true) {
                setPosts(items);
                setPostsPages(pagination.pages || 0);
            } else {
                setPosts([]);
                setPostsPages(0);
            }

            setIsPostsLoading(false);
        };

        loadPosts();

        return () => {
            cancelled = true;
        };
    }, [user?._id, activeTab, postsPage, savedPostsIds]);

    const open_settings = () => {
        navigate('/settings');
    };

    const fetchUsers = async (query: any) => {
        const response = await getUsers(query);
        return response.status === true ? response.data : [];
    };

    const open_follows = async () => {
        const ids = (user?.follows || [])
            .map((item: any) => ({ _id: item }))
            .filter((item: any) => item._id);

        if (!ids.length) {
            showModalWindow({
                title: 'Following',
                content: <p className="profile_follow_empty">No one yet</p>,
            });
            return;
        }

        const result = await fetchUsers(ids);

        showModalWindow({
            title: `Following`,
            content: result.map((authorData: any) => (
                <div
                    key={authorData._id}
                    className="modal_window_body_content_user"
                >
                    <UserBadge data={authorData} />
                    {profile && profile._id === authorData._id ? (
                        <></>
                    ) : (
                        <FollowButton
                            setNewData={setFollowAnotherUser}
                            authorId={authorData._id}
                        />
                    )}
                </div>
            )),
        });
    };

    const open_followers = async () => {
        const ids = (user?.followers || [])
            .map((item: any) => ({ _id: item }))
            .filter((item: any) => item._id);

        if (!ids.length) {
            showModalWindow({
                title: 'Followers',
                content: <p className="profile_follow_empty">No one yet</p>,
            });
            return;
        }

        const result = await fetchUsers(ids);

        showModalWindow({
            title: `Followers`,
            content: result.map((authorData: any) => (
                <div
                    key={authorData?._id}
                    className="modal_window_body_content_user"
                >
                    <UserBadge data={authorData} />
                    {profile && profile._id === authorData._id ? (
                        <></>
                    ) : (
                        <FollowButton
                            setNewData={setFollowAnotherUser}
                            authorId={authorData._id}
                        />
                    )}
                </div>
            )),
        });
    };

    return (
        <div className="profile">
            {user ? (
                <PageSeo
                    title={user.nick_name}
                    description={
                        user.description ||
                        `Profile ${user.nick_name} on Scribo.`
                    }
                    path={`/users/${user.nick_name}`}
                    image={user.avatar || undefined}
                    type="website"
                />
            ) : null}
            <div className="profile_info app-transition">
                <div className="profile_info_main">
                    <Sceleton
                        isLoading={isProfileLoading}
                        circle={true}
                        className="profile_info_avatar"
                    >
                        <div className="profile_info_avatar">
                            <img
                                src={imageSrc(
                                    user?.avatar,
                                    DefaultProfileAvatar,
                                )}
                                alt="img"
                            />
                        </div>
                    </Sceleton>

                    <div className="profile_info_bio">
                        <Sceleton
                            isLoading={isProfileLoading}
                            rounded={true}
                            className="profile_info_nick"
                        >
                            <div className="profile_info_nick">
                                <h1 className="profile_info_nick_name">
                                    {user?.nick_name}
                                </h1>
                                {user?.is_verified && (
                                    <Tooltip text="Verified account">
                                        <Verified className="profile_info_nick_verified verified-icon" />
                                    </Tooltip>
                                )}
                                {isProfileLoading || user ? (
                                    <Sceleton
                                        isLoading={isProfileLoading}
                                        rounded={true}
                                        section={false}
                                        className="profile_info_activity"
                                    >
                                        <UserActivityStatus
                                            user={user}
                                            viewerId={profile?._id}
                                        />
                                    </Sceleton>
                                ) : null}
                            </div>
                        </Sceleton>
                        {user && !isProfileLoading && <RoleBadge user={user} />}
                        {user && user.email && (
                            <Sceleton
                                isLoading={isProfileLoading}
                                rounded={true}
                                className="profile_info_email"
                            >
                                <p className="profile_info_email">
                                    {user?.email}
                                </p>
                            </Sceleton>
                        )}
                        {isProfileLoading || user?.description ? (
                            <Sceleton
                                isLoading={isProfileLoading}
                                rounded={true}
                                className="profile_info_description"
                            >
                                <p className="profile_info_description">
                                    {user?.description}
                                </p>
                            </Sceleton>
                        ) : null}
                        <Sceleton
                            isLoading={isProfileLoading}
                            rounded={true}
                            className="profile_info_date"
                        >
                            <div className="profile_info_date">
                                <Calendar />
                                <Tooltip
                                    text={format_date_time(user?.created_date)}
                                >
                                    <p>
                                        Signed up:{' '}
                                        {format_back(user?.created_date)}
                                    </p>
                                </Tooltip>
                            </div>
                        </Sceleton>
                        <div className="profile_info_stats">
                            <Sceleton
                                isLoading={isProfileLoading}
                                section={false}
                                className="profile_info_stat"
                            >
                                <button
                                    type="button"
                                    className="profile_info_stat app-transition"
                                    onClick={() =>
                                        scrollTo('posts_column', 'start')
                                    }
                                >
                                    <span className="profile_info_stat_value">
                                        {posts?.length ?? '0'}
                                    </span>
                                    <span className="profile_info_stat_label">
                                        posts
                                    </span>
                                </button>
                            </Sceleton>
                            <Sceleton
                                isLoading={isProfileLoading}
                                section={false}
                                className="profile_info_stat"
                            >
                                <button
                                    type="button"
                                    className="profile_info_stat app-transition"
                                    onClick={open_followers}
                                >
                                    <span className="profile_info_stat_value">
                                        {user?.followers?.length ?? '0'}
                                    </span>
                                    <span className="profile_info_stat_label">
                                        followers
                                    </span>
                                </button>
                            </Sceleton>
                            <Sceleton
                                isLoading={isProfileLoading}
                                section={false}
                                className="profile_info_stat"
                            >
                                <button
                                    type="button"
                                    className="profile_info_stat app-transition"
                                    onClick={open_follows}
                                >
                                    <span className="profile_info_stat_value">
                                        {user?.follows?.length ?? '0'}
                                    </span>
                                    <span className="profile_info_stat_label">
                                        following
                                    </span>
                                </button>
                            </Sceleton>
                        </div>
                    </div>

                    <Sceleton
                        isLoading={isProfileLoading}
                        className="profile_info_action"
                    >
                        {profile && profile._id === user?._id ? (
                            <ActionButton
                                className="profile_info_action"
                                onClick={open_settings}
                            >
                                <SettingsIcon className="profile_info_action_icon" />
                                Settings
                            </ActionButton>
                        ) : (
                            <div className="profile_info_actions">
                                <FollowButton
                                    setNewData={setFollowThisUser}
                                    authorId={user?._id}
                                    className="profile_info_action"
                                />
                                {profile ? (
                                    <ActionButton
                                        className="profile_info_action"
                                        onClick={() =>
                                            startConversationWithUser(
                                                user?._id,
                                                navigate,
                                                showToast,
                                            )
                                        }
                                    >
                                        <CommentIcon className="profile_info_action_icon" />
                                        Start a conversation
                                    </ActionButton>
                                ) : null}
                            </div>
                        )}
                    </Sceleton>
                </div>
            </div>

            <div className="profile_feed">
                <Sceleton
                    isLoading={isProfileLoading}
                    rounded={true}
                    section={false}
                    className="profile_tab_list"
                >
                    <div className="profile_tab_list app-transition">
                        <SwitchBar
                            items={[
                                <>
                                    <PostIcon />
                                    Posts
                                </>,
                                <>
                                    <BookmarkOutline />
                                    Saved
                                </>,
                            ]}
                            activeIndex={activeTab}
                            setActiveIndex={setActiveTab}
                        />
                    </div>
                </Sceleton>
                <div className="profile_posts">
                    <Posts
                        posts={posts}
                        setPosts={setPosts}
                        isLoading={isProfileLoading || isPostsLoading}
                        page={postsPage}
                        pagesCount={postsPages}
                        onPageChange={setPostsPage}
                        showFilters={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default Profile;
