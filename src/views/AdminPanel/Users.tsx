'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getAdminUsers, setVerified, updateRole } from '../../api/users.api';
import { format_date_time } from '../../utils/format';

import ThreeDotsIcon from '../../assets/svg/three-dots.svg';
import RedirectIcon from '../../assets/svg/redirect.svg';
import VerifiedIcon from '../../assets/svg/verified.svg';

import RoleBadge from '../../components/RoleBadge/index';
import UserBadge from '../../components/UserBadge/index';
import RelativeTime from '../../components/RelativeTime/index';
import Tabs from '../../components/Ui/Tabs';
import InputField from '../../components/Ui/InputField';
import Loading from '../../components/Ui/Loading';
import Pagination from '../../components/Ui/Pagination';
import Popup from '../../components/Ui/Popup';
import Tooltip from '../../components/Ui/Tooltip';

import {
    canGiveVerification,
    roleChoices,
    roleIcon,
    roleLabel,
} from './adminRoles';

import './Users.scss';

const PAGE_SIZE = 20;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const SORTS = [
    { value: 'activity', label: 'Last active' },
    { value: 'registered', label: 'Newest' },
];

const formatNumber = (value: any) =>
    new Intl.NumberFormat('ru-RU').format(value || 0);

const SummaryItem = ({ label, value }: any) => (
    <div className="admin_users_summary_item">
        <p className="admin_users_summary_label">{label}</p>
        <p className="admin_users_summary_value">{formatNumber(value)}</p>
    </div>
);

const UsersPage = () => {
    const navigate = useNavigate();
    const { profile, showToast } = useContext(AppContext);

    const [users, setUsers] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [pagesCount, setPagesCount] = useState<any>(0);
    const [page, setPage] = useState<any>(1);
    const [sort, setSort] = useState<any>('activity');
    const [searchText, setSearchText] = useState<any>('');
    const [search, setSearch] = useState<any>('');
    const [isLoading, setIsLoading] = useState<any>(true);
    const requestId = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchText.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchText]);

    const load = useCallback(async () => {
        const current = ++requestId.current;
        setIsLoading(true);
        const result = await getAdminUsers({
            page,
            limit: PAGE_SIZE,
            sort,
            search,
        });
        if (current !== requestId.current) {
            return;
        }
        if (result?.status) {
            setUsers(result.data.items);
            setSummary(result.data.summary);
            setPagesCount(result.data.pagination.pages);
        } else {
            showToast({
                type: 'error',
                message: result?.message || 'Could not load users',
            });
        }
        setIsLoading(false);
    }, [page, sort, search, showToast]);

    useEffect(() => {
        load();
    }, [load]);

    const patchUser = (id: any, fields: any) =>
        setUsers((previous: any[]) =>
            previous.map((user: any) =>
                user._id === id ? { ...user, ...fields } : user,
            ),
        );

    // The change shows at once and is rolled back to the previous value if the
    // server refuses.
    const changeRole = async (user: any, role: string) => {
        const previous = user.role;
        if (role === previous) {
            return;
        }
        patchUser(user._id, { role });
        const result = await updateRole(user._id, role);
        if (result?.status) {
            showToast({
                type: 'success',
                message: `${user.nick_name} is now ${roleLabel(role).toLowerCase()}`,
            });
        } else {
            patchUser(user._id, { role: previous });
            showToast({
                type: 'error',
                message: result?.message || 'Could not change the role',
            });
        }
    };

    const toggleVerified = async (user: any) => {
        const previous = Boolean(user.is_verified);
        const next = !previous;
        patchUser(user._id, { is_verified: next });
        const result = await setVerified(user._id, next);
        if (result?.status) {
            showToast({
                type: 'success',
                message: next
                    ? `${user.nick_name} is verified now`
                    : `Verification removed from ${user.nick_name}`,
            });
        } else {
            patchUser(user._id, { is_verified: previous });
            showToast({
                type: 'error',
                message: result?.message || 'Could not update verification',
            });
        }
    };

    const getPopupBody = (user: any) => {
        const sections: any[] = [
            [
                {
                    title: 'Go to profile',
                    icon: <RedirectIcon />,
                    onClick: () => navigate(`/users/${user.nick_name}`),
                },
            ],
        ];

        if (canGiveVerification(profile)) {
            sections.push([
                {
                    title: user.is_verified
                        ? 'Remove verified badge'
                        : 'Give verified badge',
                    icon: <VerifiedIcon />,
                    onClick: () => toggleVerified(user),
                },
            ]);
        }

        const choices = roleChoices(profile, user);
        if (choices.length) {
            sections.push([
                {
                    type: 'dropdown',
                    title: 'Assign role',
                    icon: roleIcon(user.role),
                    valueLabel: roleLabel(user.role),
                    items: choices.map((role: string) => ({
                        title: roleLabel(role),
                        icon: roleIcon(role),
                        isActive: role === user.role,
                        onClick: () => changeRole(user, role),
                    })),
                },
            ]);
        }

        return sections;
    };

    const isOnline = (user: any) =>
        Date.now() - new Date(user.last_activity_at).getTime() <
        ONLINE_WINDOW_MS;

    return (
        <div className="admin_users">
            {summary ? (
                <div className="admin_users_summary">
                    <SummaryItem label="All users" value={summary.total} />
                    <SummaryItem
                        label="Active in 24 hours"
                        value={summary.active_24h}
                    />
                    <SummaryItem
                        label="Active in 7 days"
                        value={summary.active_7d}
                    />
                    <SummaryItem
                        label="Joined in 7 days"
                        value={summary.new_7d}
                    />
                </div>
            ) : null}

            <div className="admin_users_toolbar">
                <InputField
                    type="text"
                    value={searchText}
                    placeholder="Search by nickname or email"
                    onChange={(event: any) => setSearchText(event.target.value)}
                    length={100}
                />
                <Tabs
                    label="Sort users"
                    items={SORTS.map((item: any) => ({
                        key: item.value,
                        title: item.label,
                    }))}
                    activeKey={sort}
                    onChange={(value: any) => {
                        setSort(value);
                        setPage(1);
                    }}
                />
            </div>

            {isLoading && !users.length ? (
                <Loading size={40} />
            ) : (
                <Pagination
                    content={users}
                    page={page - 1}
                    pagesCount={pagesCount}
                    onPageChange={(index: any) => setPage(index + 1)}
                >
                    {(visible: any) =>
                        visible.length ? (
                            <div
                                className={`admin_users_list${isLoading ? ' admin_users_list_loading' : ''}`}
                            >
                                {visible.map((user: any) => (
                                    <div
                                        className="admin_users_item app-transition"
                                        key={user._id}
                                    >
                                        <div className="admin_users_item_user">
                                            <UserBadge data={user} />
                                            <RoleBadge user={user} />
                                        </div>
                                        <div className="admin_users_item_activity">
                                            {isOnline(user) ? (
                                                <p className="admin_users_item_online">
                                                    Online
                                                </p>
                                            ) : (
                                                <Tooltip
                                                    text={format_date_time(
                                                        user.last_activity_at,
                                                    )}
                                                >
                                                    <p>
                                                        Active{' '}
                                                        <RelativeTime
                                                            date={
                                                                user.last_activity_at
                                                            }
                                                            intervalMs={30000}
                                                        />
                                                    </p>
                                                </Tooltip>
                                            )}
                                            <p className="admin_users_item_meta">
                                                {formatNumber(user.posts_count)}{' '}
                                                posts ·{' '}
                                                {formatNumber(
                                                    user.comments_count,
                                                )}{' '}
                                                comments ·{' '}
                                                {formatNumber(
                                                    user.followers_count,
                                                )}{' '}
                                                followers
                                            </p>
                                            <p className="admin_users_item_meta">
                                                Joined{' '}
                                                {format_date_time(
                                                    user.created_date,
                                                )}
                                            </p>
                                        </div>
                                        <div className="admin_users_item_actions">
                                            <Tooltip text="More actions">
                                                <Popup
                                                    body={getPopupBody(user)}
                                                >
                                                    <ThreeDotsIcon className="app-transition" />
                                                </Popup>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="admin_users_empty">No users found</p>
                        )
                    }
                </Pagination>
            )}
        </div>
    );
};

export default UsersPage;
