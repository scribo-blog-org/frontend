'use client';

import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { AppContext } from '@/providers/AppProviders';
import { getAdminUsers, updateRole } from '../../api/users.api';

import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import PeoplesIcon from '../../assets/svg/peoples.svg';
import UserBadge from '../../components/UserBadge/index';
import RoleBadge from '../../components/RoleBadge/index';
import UserActivityStatus from '../../components/UserActivityStatus/index';
import DropDown from '../../components/Ui/DropDown';
import Popup from '../../components/Ui/Popup';
import Loading from '../../components/Ui/Loading';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';
import ModalFooter from '../../components/Ui/ModalFooter';
import SearchSelect from '../../components/Ui/SearchSelect';

import {
    ROLE_ORDER,
    canManageRoles,
    roleChoices,
    roleIcon,
    roleLabel,
} from './adminRoles';

import './Admins.scss';

const STAFF_LIMIT = 50;

const roleOptions = (roles: string[]) =>
    roles.map((role: string) => ({
        value: role,
        label: roleLabel(role),
        icon: roleIcon(role),
    }));

const GrantRoleForm = ({ profile, onGranted, onClose }: any) => {
    const { showToast } = useContext(AppContext);
    const [found, setFound] = useState<any[]>([]);
    const [searching, setSearching] = useState<any>(false);
    const [picked, setPicked] = useState<any>(null);
    const [role, setRole] = useState<any>('');
    const [saving, setSaving] = useState<any>(false);
    const requestId = useRef(0);

    const grantable = useMemo(
        () =>
            (profile?.role_management || []).filter(
                (item: string) => item !== 'user',
            ),
        [profile],
    );

    const search = useCallback(async (text: string) => {
        const query = text.trim();
        const current = ++requestId.current;
        if (query.length < 2) {
            setFound([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        const result = await getAdminUsers({
            search: query,
            limit: 8,
            roles: 'user',
        });
        if (current !== requestId.current) {
            return;
        }
        setFound(result?.status ? result.data.items : []);
        setSearching(false);
    }, []);

    const grant = async () => {
        if (!picked || !role || saving) {
            return;
        }
        setSaving(true);
        let result;
        try {
            result = await updateRole(picked._id, role);
        } finally {
            setSaving(false);
        }
        if (result?.status) {
            onGranted({ ...picked, role });
            showToast({
                type: 'success',
                message: `${picked.nick_name} is now ${roleLabel(role).toLowerCase()}`,
            });
            onClose();
        } else {
            showToast({
                type: 'error',
                message: result?.message || 'Could not change the role',
            });
        }
    };

    const options = found
        .filter((user: any) => roleChoices(profile, user).length > 0)
        .map((user: any) => ({
            value: user._id,
            label: user.nick_name,
            user,
        }));

    return (
        <div className="admin_staff_grant">
            <SearchSelect
                options={options}
                value={picked?._id ?? ''}
                placeholder="Nickname or email"
                emptyLabel="No users found"
                loading={searching}
                disabled={saving}
                minSearchLength={2}
                onInput={search}
                onSelect={(option: any) => setPicked(option.user)}
                onChange={(value: any) => {
                    if (!value) {
                        setPicked(null);
                    }
                }}
            />
            <DropDown
                options={roleOptions(grantable)}
                value={role}
                onChange={setRole}
                placeholder="Role"
                disabled={saving}
            />
            <ModalFooter>
                <ActionButton onClick={onClose} disabled={saving}>
                    Cancel
                </ActionButton>
                <PrimaryButton
                    onClick={grant}
                    isLoading={saving}
                    disabled={!picked || !role}
                >
                    Save
                </PrimaryButton>
            </ModalFooter>
        </div>
    );
};

const AdminsPage = () => {
    const { profile, showToast, showModalWindow, requestCloseModal } =
        useContext(AppContext);
    const [staff, setStaff] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<any>(true);

    const loadStaff = useCallback(async () => {
        const result = await getAdminUsers({
            roles: 'staff',
            limit: STAFF_LIMIT,
            sort: 'activity',
        });
        if (result?.status) {
            setStaff(result.data.items);
        } else {
            showToast({
                type: 'error',
                message: result?.message || 'Could not load administrators',
            });
        }
        setIsLoading(false);
    }, [showToast]);

    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    const sortedStaff = useMemo(
        () =>
            [...staff].sort(
                (a: any, b: any) =>
                    ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
            ),
        [staff],
    );

    const changeRole = async (user: any, role: string) => {
        if (role === user.role) {
            return;
        }
        const index = staff.findIndex((item: any) => item._id === user._id);
        setStaff((previous: any[]) =>
            role === 'user'
                ? previous.filter((item: any) => item._id !== user._id)
                : previous.map((item: any) =>
                      item._id === user._id ? { ...item, role } : item,
                  ),
        );
        const result = await updateRole(user._id, role);
        if (!result?.status) {
            setStaff((previous: any[]) => {
                if (previous.some((item: any) => item._id === user._id)) {
                    return previous.map((item: any) =>
                        item._id === user._id ? user : item,
                    );
                }
                const next = [...previous];
                next.splice(
                    index < 0 ? next.length : Math.min(index, next.length),
                    0,
                    user,
                );
                return next;
            });
            showToast({
                type: 'error',
                message: result?.message || 'Could not change the role',
            });
            return;
        }
        showToast({
            type: 'success',
            message:
                role === 'user'
                    ? `${user.nick_name} is a regular user again`
                    : `${user.nick_name} is now ${roleLabel(role).toLowerCase()}`,
        });
    };

    const handleGranted = (user: any) =>
        setStaff((previous: any[]) => [
            user,
            ...previous.filter((item: any) => item._id !== user._id),
        ]);

    const canGrant = (profile?.role_management || []).some(
        (item: string) => item !== 'user',
    );

    const openGrantModal = () =>
        showModalWindow({
            title: 'Add administrator',
            subtitle: 'Find a user by nickname or email and choose a role',
            icon: <PeoplesIcon />,
            size: 'small',
            showCloseButton: true,
            closeFunc: () => {},
            content: (
                <GrantRoleForm
                    profile={profile}
                    onGranted={handleGranted}
                    onClose={requestCloseModal}
                />
            ),
        });

    const manageable = canManageRoles(profile);

    return (
        <div className="admin_staff">
            {canGrant ? (
                <div className="admin_staff_toolbar">
                    <PrimaryButton onClick={openGrantModal}>
                        Add administrator
                    </PrimaryButton>
                </div>
            ) : null}

            {isLoading ? (
                <Loading size={40} />
            ) : sortedStaff.length ? (
                <div className="admin_staff_list">
                    {sortedStaff.map((user: any) => {
                        const choices = roleChoices(profile, user);
                        const badge = (
                            <RoleBadge user={user} withUser tooltip={false} />
                        );
                        return (
                            <div
                                className="admin_staff_item app-transition"
                                key={user._id}
                            >
                                <div className="admin_staff_item_user">
                                    <UserBadge data={user} />
                                    <UserActivityStatus
                                        user={{
                                            ...user,
                                            is_last_activity_public: true,
                                        }}
                                        viewerId={profile?._id}
                                    />
                                </div>
                                <div className="admin_staff_item_role">
                                    {manageable && choices.length ? (
                                        <Popup
                                            body={[
                                                choices.map((role: string) => ({
                                                    title: (
                                                        <RoleBadge
                                                            user={{ role }}
                                                            withUser
                                                            tooltip={false}
                                                        />
                                                    ),
                                                    isActive:
                                                        role === user.role,
                                                    onClick: () =>
                                                        changeRole(user, role),
                                                })),
                                            ]}
                                        >
                                            <div className="admin_staff_item_role_trigger app-transition">
                                                {badge}
                                                <ChevronDownIcon />
                                            </div>
                                        </Popup>
                                    ) : (
                                        badge
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="admin_staff_empty">
                    Nobody has a special role yet
                </p>
            )}
        </div>
    );
};

export default AdminsPage;
