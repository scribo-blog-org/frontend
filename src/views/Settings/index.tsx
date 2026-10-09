'use client';

import { useNavigate } from '@/navigation';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/providers/AppProviders';

import { editProfile, changePassword } from '../../api/profile.api';
import {
    logout as logoutRequest,
    getSessions,
    deleteSession,
} from '../../api/auth.api';
import {
    disablePush,
    enablePush,
    isDeviceSubscribed,
    pushSupport,
} from '../../utils/push';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { format_back, format_date_time } from '../../utils/format';

import InputField from '../../components/Ui/InputField/index';
import DropFile from '../../components/Ui/DropFile/index';
import Toggle from '../../components/Ui/Toggle/index';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';
import DangerButton from '../../components/Ui/DangerButton';
import Field from '../../components/Ui/Field';
import { Banner, Panel, PanelRow, Pill } from '../../components/Ui/Panel';
import Tooltip from '../../components/Ui/Tooltip';

import './Settings.scss';

import AvatarIcon from '../../assets/svg/avatar-icon.svg';
import LogoutIcon from '../../assets/svg/logout.svg';
import SecurityIcon from '../../assets/svg/security.svg';
import NotificationIcon from '../../assets/svg/notification.svg';
import WarningIcon from '../../assets/svg/warning-icon.svg';
import MoonIcon from '../../assets/svg/moon.svg';
import GlobalIcon from '../../assets/svg/global.svg';

const Settings = () => {
    const {
        profile,
        setProfile,
        profileLoading,
        showToast,
        isDarkTheme,
        setIsDarkTheme,
    } = useContext(AppContext);
    const [initialized, setInitialized] = useState<any>(false);
    const [pushOn, setPushOn] = useState<boolean>(false);
    const [pushBusy, setPushBusy] = useState<boolean>(false);
    const [pushSupportState, setPushSupportState] =
        useState<string>('supported');
    const [pushDenied, setPushDenied] = useState<boolean>(false);
    const { mode: installMode, install } = useInstallPrompt();
    const navigate = useNavigate();

    const refreshPush = async () => {
        setPushDenied(Notification.permission === 'denied');
        setPushOn(await isDeviceSubscribed());
    };

    useEffect(() => {
        const support = pushSupport();
        setPushSupportState(support);
        if (support !== 'supported') {
            return;
        }
        void refreshPush();

        // Picks up the user allowing notifications in the browser settings
        // without reloading the page.
        let status: PermissionStatus | null = null;
        const onChange = () => void refreshPush();
        navigator.permissions
            ?.query({ name: 'notifications' })
            .then((result) => {
                status = result;
                result.addEventListener('change', onChange);
            })
            .catch(() => undefined);
        window.addEventListener('focus', onChange);

        return () => {
            status?.removeEventListener('change', onChange);
            window.removeEventListener('focus', onChange);
        };
    }, []);

    const togglePush = async (next: boolean) => {
        // The switch follows the click immediately; it goes back if the device
        // could not be (un)subscribed.
        setPushBusy(true);
        setPushOn(next);
        try {
            if (next) {
                const result = await enablePush(String(profile?._id));
                setPushOn(result === 'enabled');
                setPushDenied(Notification.permission === 'denied');
                if (result === 'unavailable') {
                    showToast({
                        type: 'error',
                        message: 'Could not turn on notifications',
                    });
                }
            } else {
                await disablePush(String(profile?._id));
                setPushOn(false);
            }
        } catch {
            setPushOn(!next);
            showToast({
                type: 'error',
                message: next
                    ? 'Could not turn on notifications'
                    : 'Could not turn off notifications',
            });
        } finally {
            setPushBusy(false);
        }
    };

    // Browsers cannot open a site's permission settings from a page, so the
    // button re-reads the permission and turns notifications on as soon as the
    // user has allowed them there.
    const retryPush = async () => {
        if (Notification.permission === 'denied') {
            setPushDenied(true);
            showToast({
                type: 'error',
                message:
                    'Still blocked, allow notifications in the site settings first',
            });
            return;
        }
        await togglePush(true);
    };
    const [errors, setErrors] = useState<any>({});
    const [isLoading, setIsLoading] = useState<any>(false);
    const [passwordLoading, setPasswordLoading] = useState<any>(false);
    const [changingPassword, setChangingPassword] = useState<any>(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState<any>(false);
    const [logoutLoading, setLogoutLoading] = useState<any>(false);
    const [endingSessionId, setEndingSessionId] = useState<any>(null);
    const [passwordFields, setPasswordFields] = useState<any>({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: '',
    });

    const [fields, setFields] = useState<any>({
        userNickName: '',
        userDescription: '',
        isEmailPublic: false,
        isSavedPostsPublic: false,
        isLastActivityPublic: true,
        userAvatar: null,
    });

    const set_email_visibility = (visibility: any) => {
        setFields((prev: any) => ({
            ...prev,
            isEmailPublic: visibility,
        }));
    };

    const set_saved_posts_visibility = (visibility: any) => {
        setFields((prev: any) => ({
            ...prev,
            isSavedPostsPublic: visibility,
        }));
    };

    const set_last_activity_visibility = (visibility: any) => {
        setFields((prev: any) => ({
            ...prev,
            isLastActivityPublic: visibility,
        }));
    };

    useEffect(() => {
        if (!initialized) {
            setInitialized(true);
            return;
        }

        if (!profileLoading && !profile) {
            navigate('/');
            return;
        }

        const setProfileData = async () => {
            if (!profile) return;

            setFields((prev: any) => ({
                ...prev,
                userNickName: profile.nick_name ?? '',
                userDescription: profile.description ?? '',
                userAvatar: profile.avatar,
                isEmailPublic: profile.is_email_public,
                isSavedPostsPublic: profile.is_saved_posts_public,
                isLastActivityPublic: profile.is_last_activity_public !== false,
            }));
        };

        setProfileData();
    }, [profileLoading, profile, initialized, navigate]);

    useEffect(() => {
        let cancelled = false;

        const loadSessions = async () => {
            setSessionsLoading(true);
            const result = await getSessions();
            if (!cancelled && result?.status) {
                const list = Array.isArray(result.data)
                    ? result.data
                    : Array.isArray(result.data?.sessions)
                      ? result.data.sessions
                      : [];
                setSessions(list);
            }
            if (!cancelled) {
                setSessionsLoading(false);
            }
        };

        loadSessions();

        return () => {
            cancelled = true;
        };
    }, []);

    const add_errors_to_image = (new_errors: any) => {
        const updated_errors = { ...errors };

        if (!updated_errors.userAvatar) {
            updated_errors.userAvatar = [];
        }

        for (const new_error of new_errors) {
            updated_errors.userAvatar.push(new_error);
        }
        setErrors(updated_errors);
    };

    const clear_errors_from_image = () => {
        const updated_errors = { ...errors };

        if (updated_errors.userAvatar) {
            delete updated_errors.userAvatar;
        }

        setErrors(updated_errors);
    };

    const handleFocus = (fieldName: any) => {
        const other = { ...errors };
        delete other[fieldName];
        setErrors(other);
    };

    const field_validation = () => {
        let is_error = false;
        if (fields.userNickName.length < FIELD_LIMITS.nick.min) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userNickName: `Name must be at least ${FIELD_LIMITS.nick.min} characters`,
            }));
            is_error = true;
        }
        if (fields.userNickName.length > FIELD_LIMITS.nick.max) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userNickName: `Name must be at most ${FIELD_LIMITS.nick.max} characters`,
            }));
            is_error = true;
        }
        if (fields.userDescription.length > FIELD_LIMITS.description.max) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userDescription: `Description must be at most ${FIELD_LIMITS.description.max} characters`,
            }));
            is_error = true;
        }
        return !is_error;
    };

    const password_field_validation = () => {
        let is_error = false;
        const next: any = {};

        if (
            passwordFields.currentPassword.length < FIELD_LIMITS.password.min ||
            passwordFields.currentPassword.length > FIELD_LIMITS.password.max
        ) {
            next.currentPassword = `Password must be from ${FIELD_LIMITS.password.min} to ${FIELD_LIMITS.password.max} characters`;
            is_error = true;
        }
        if (
            passwordFields.newPassword.length < FIELD_LIMITS.password.min ||
            passwordFields.newPassword.length > FIELD_LIMITS.password.max
        ) {
            next.newPassword = `Password must be from ${FIELD_LIMITS.password.min} to ${FIELD_LIMITS.password.max} characters`;
            is_error = true;
        }
        if (
            passwordFields.newPasswordConfirm.length <
                FIELD_LIMITS.password.min ||
            passwordFields.newPasswordConfirm.length > FIELD_LIMITS.password.max
        ) {
            next.newPasswordConfirm = `Password must be from ${FIELD_LIMITS.password.min} to ${FIELD_LIMITS.password.max} characters`;
            is_error = true;
        }
        if (
            !is_error &&
            passwordFields.newPassword !== passwordFields.newPasswordConfirm
        ) {
            next.newPasswordConfirm = 'Passwords do not match';
            is_error = true;
        }
        if (
            !is_error &&
            passwordFields.currentPassword === passwordFields.newPassword
        ) {
            next.newPassword =
                'The new password must be different from the current one';
            is_error = true;
        }

        if (is_error) {
            setErrors((prev: any) => {
                const other = { ...prev };
                delete other.currentPassword;
                delete other.newPassword;
                delete other.newPasswordConfirm;
                return { ...other, ...next };
            });
        }

        return !is_error;
    };

    const save_password = async () => {
        if (passwordLoading) {
            return;
        }
        setPasswordLoading(true);
        if (!password_field_validation()) {
            setPasswordLoading(false);
            return;
        }

        try {
            const result = await changePassword(passwordFields);

            if (result.status === true) {
                setPasswordFields({
                    currentPassword: '',
                    newPassword: '',
                    newPasswordConfirm: '',
                });
                setErrors((prev: any) => {
                    const next = { ...prev };
                    delete next.currentPassword;
                    delete next.newPassword;
                    delete next.newPasswordConfirm;
                    return next;
                });
                setChangingPassword(false);
                showToast({ message: 'Password changed', type: 'success' });
            } else {
                if (result?.errors?.body) {
                    const formattedErrors = Object.fromEntries(
                        Object.entries(result.errors.body).map(
                            ([field, obj]: any) => [field, obj.message],
                        ),
                    );

                    setErrors((prev: any) => ({ ...prev, ...formattedErrors }));
                }
                showToast({ message: 'Error!', type: 'error' });
            }
        } catch (error: any) {
            console.log(error);
            showToast({ message: 'Error!', type: 'error' });
        } finally {
            setPasswordLoading(false);
        }
    };

    const save_settings = async () => {
        if (isLoading) {
            return;
        }
        setIsLoading(true);
        if (!field_validation()) {
            setIsLoading(false);
            return;
        }

        const formData = new FormData();

        const avatarChanged =
            fields.userAvatar instanceof File ||
            fields.userAvatar !== (profile?.avatar ?? null);

        const profileCompare: any = {
            userNickName: profile.nick_name ?? '',
            userDescription: profile.description ?? '',
            isEmailPublic: profile.is_email_public,
            isSavedPostsPublic: profile.is_saved_posts_public,
            isLastActivityPublic: profile.is_last_activity_public !== false,
        };

        for (let field in fields) {
            if (field === 'userAvatar') {
                continue;
            }

            if (fields[field] === profileCompare[field]) continue;
            formData.append(field, fields[field]);
        }

        if (avatarChanged) {
            formData.append('userAvatar', fields.userAvatar ?? '');
        }

        try {
            const result = await editProfile(formData);

            if (result.status === true) {
                setProfile((prev: any) => ({
                    ...prev,
                    ...result.data,
                }));
                navigate(
                    result.data.nick_name
                        ? `/users/${result.data.nick_name}`
                        : `/users/${profile.nick_name}`,
                );
                showToast({ message: 'Saved!', type: 'success' });
            } else {
                if (result?.errors?.body) {
                    setErrors(
                        Object.fromEntries(
                            Object.entries(result.errors.body).map(
                                ([field, obj]: any) => [field, obj.message],
                            ),
                        ),
                    );
                }
                showToast({ message: 'Error!', type: 'error' });
                return result;
            }
        } catch (error: any) {
            console.log(error);
            if (
                error instanceof TypeError &&
                error.message === 'Failed to fetch'
            ) {
                setErrors({
                    userAvatar: ['Max size of image is 5 mb'],
                });
            }
            return { status: 'error', message: 'server not found' };
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await logoutRequest();
            setProfile(null);
            showToast({ message: 'You have logged out!', type: 'success' });
            navigate('/');
        } finally {
            setLogoutLoading(false);
        }
    };

    const handleDeleteSession = async (session: any) => {
        setEndingSessionId(session._id);

        // Another device's session leaves the list at once and comes back at
        // its place if the server refuses. Ending the current one signs the
        // user out, so that row stays until the server answers.
        const index = sessions.findIndex(
            (item: any) => item._id === session._id,
        );
        const optimistic = !session.isCurrent && index !== -1;

        if (optimistic) {
            setSessions((prev: any) =>
                prev.filter((item: any) => item._id !== session._id),
            );
        }

        const restore = () => {
            if (!optimistic) {
                return;
            }
            setSessions((prev: any) => {
                if (prev.some((item: any) => item._id === session._id)) {
                    return prev;
                }
                const next = [...prev];
                next.splice(Math.min(index, next.length), 0, session);
                return next;
            });
        };

        try {
            const result = await deleteSession(session._id);

            if (!result?.status) {
                restore();
                showToast({
                    message: 'Could not end the session',
                    type: 'error',
                });
                return;
            }

            if (result.data?.wasCurrent) {
                setProfile(null);
                showToast({
                    message: 'Current session ended',
                    type: 'success',
                });
                navigate('/');
                return;
            }

            setSessions((prev: any) =>
                prev.filter((item: any) => item._id !== session._id),
            );
            showToast({ message: 'Session ended', type: 'success' });
        } catch {
            restore();
            showToast({
                message: 'Could not end the session',
                type: 'error',
            });
        } finally {
            setEndingSessionId(null);
        }
    };

    const handleAvatarRemove = () => {
        setFields((prev: any) => ({
            ...prev,
            userAvatar: null,
        }));
    };

    const openPasswordForm = () => {
        setPasswordFields({
            currentPassword: '',
            newPassword: '',
            newPasswordConfirm: '',
        });
        setErrors((prev: any) => {
            const next = { ...prev };
            delete next.currentPassword;
            delete next.newPassword;
            delete next.newPasswordConfirm;
            return next;
        });
        setChangingPassword(true);
    };

    const closePasswordForm = () => {
        setPasswordFields({
            currentPassword: '',
            newPassword: '',
            newPasswordConfirm: '',
        });
        setErrors((prev: any) => {
            const next = { ...prev };
            delete next.currentPassword;
            delete next.newPassword;
            delete next.newPasswordConfirm;
            return next;
        });
        setChangingPassword(false);
    };

    return (
        <div className="settings">
            <div className="settings_sections">
                {[
                    {
                        title: 'Profile',
                        key: 'profile',
                        content: (
                            <form
                                className="settings_panel settings_panel_profile"
                                onSubmit={(event: any) => {
                                    event.preventDefault();
                                    save_settings();
                                }}
                            >
                                <div className="settings_stack">
                                    <div className="settings_group">
                                        <p className="kicker">Account</p>
                                        <div className="settings_avatar">
                                            <DropFile
                                                value={fields.userAvatar}
                                                setValue={(file: any) =>
                                                    setFields((prev: any) => ({
                                                        ...prev,
                                                        userAvatar: file,
                                                    }))
                                                }
                                                background={
                                                    <AvatarIcon className="drop_file_info_avatar_icon app-transition" />
                                                }
                                                dropFileType={'image/*'}
                                                fileTypes={
                                                    'SVG, PNG, JPEG, JPG, and others'
                                                }
                                                errors={errors?.userAvatar}
                                                addNewErrors={
                                                    add_errors_to_image
                                                }
                                                clearErrors={
                                                    clear_errors_from_image
                                                }
                                                onRemove={handleAvatarRemove}
                                                previewUrl={profile?.avatar}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        {profile?.email ? (
                                            <Field title="Email">
                                                <InputField
                                                    type="email"
                                                    value={profile.email}
                                                    confirmed={Boolean(
                                                        profile.is_verified,
                                                    )}
                                                    onChange={() => {}}
                                                    disabled={isLoading}
                                                />
                                            </Field>
                                        ) : null}
                                        <Field
                                            error={errors?.userNickName ?? null}
                                            title={'Username'}
                                        >
                                            <InputField
                                                className={`user_name`}
                                                type="text"
                                                onChange={(e: any) =>
                                                    setFields({
                                                        ...fields,
                                                        userNickName:
                                                            e.target.value,
                                                    })
                                                }
                                                onFocus={() =>
                                                    handleFocus('userNickName')
                                                }
                                                placeholder="User Name"
                                                value={fields?.userNickName}
                                                error={
                                                    errors?.userNickName ?? null
                                                }
                                                length={FIELD_LIMITS.nick.max}
                                                disabled={isLoading}
                                            />
                                        </Field>
                                        <Field
                                            error={
                                                errors?.userDescription ?? null
                                            }
                                            title={'Description'}
                                        >
                                            <InputField
                                                className={`description`}
                                                type="text"
                                                isMultiline={true}
                                                length={
                                                    FIELD_LIMITS.description.max
                                                }
                                                rows={3}
                                                onChange={(e: any) =>
                                                    setFields({
                                                        ...fields,
                                                        userDescription:
                                                            e.target.value,
                                                    })
                                                }
                                                onFocus={() =>
                                                    handleFocus(
                                                        'userDescription',
                                                    )
                                                }
                                                placeholder="Description of profile"
                                                value={fields?.userDescription}
                                                error={
                                                    errors?.userDescription ??
                                                    null
                                                }
                                                disabled={isLoading}
                                            />
                                        </Field>
                                    </div>
                                    <Panel title="Privacy">
                                        <PanelRow
                                            title="Show email"
                                            description="The address will be visible on the profile page"
                                            trailing={
                                                <Toggle
                                                    checked={
                                                        fields.isEmailPublic
                                                    }
                                                    onChange={
                                                        set_email_visibility
                                                    }
                                                    disabled={isLoading}
                                                />
                                            }
                                        />
                                        <PanelRow
                                            title="Public saved posts"
                                            description="Visitors of the profile will see saved posts"
                                            trailing={
                                                <Toggle
                                                    checked={
                                                        fields.isSavedPostsPublic
                                                    }
                                                    onChange={
                                                        set_saved_posts_visibility
                                                    }
                                                    disabled={isLoading}
                                                />
                                            }
                                        />
                                        <PanelRow
                                            title="Show last activity"
                                            description="The date and time will be visible on the profile page"
                                            trailing={
                                                <Toggle
                                                    checked={
                                                        fields.isLastActivityPublic
                                                    }
                                                    onChange={
                                                        set_last_activity_visibility
                                                    }
                                                    disabled={isLoading}
                                                />
                                            }
                                        />
                                    </Panel>
                                    <div className="settings_panel_actions">
                                        <PrimaryButton
                                            type="submit"
                                            isLoading={isLoading}
                                        >
                                            Save
                                        </PrimaryButton>
                                    </div>
                                </div>
                            </form>
                        ),
                    },
                    {
                        title: 'Security',
                        key: 'security',
                        content: (
                            <div className="settings_panel">
                                <div className="settings_stack">
                                    <Panel title="Password">
                                        {changingPassword ? (
                                            <form
                                                className="settings_password"
                                                onSubmit={(event: any) => {
                                                    event.preventDefault();
                                                    save_password();
                                                }}
                                            >
                                                <Field
                                                    error={
                                                        errors?.currentPassword ??
                                                        null
                                                    }
                                                    title={'Current password'}
                                                >
                                                    <InputField
                                                        type="password"
                                                        autoComplete="current-password"
                                                        length={
                                                            FIELD_LIMITS
                                                                .password.max
                                                        }
                                                        onChange={(e: any) =>
                                                            setPasswordFields({
                                                                ...passwordFields,
                                                                currentPassword:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        onFocus={() =>
                                                            handleFocus(
                                                                'currentPassword',
                                                            )
                                                        }
                                                        placeholder="Current password"
                                                        value={
                                                            passwordFields.currentPassword
                                                        }
                                                        error={
                                                            errors?.currentPassword ??
                                                            null
                                                        }
                                                        disabled={
                                                            passwordLoading
                                                        }
                                                    />
                                                </Field>
                                                <Field
                                                    error={
                                                        errors?.newPassword ??
                                                        null
                                                    }
                                                    title={'New password'}
                                                >
                                                    <InputField
                                                        type="password"
                                                        autoComplete="new-password"
                                                        length={
                                                            FIELD_LIMITS
                                                                .password.max
                                                        }
                                                        onChange={(e: any) =>
                                                            setPasswordFields({
                                                                ...passwordFields,
                                                                newPassword:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        onFocus={() =>
                                                            handleFocus(
                                                                'newPassword',
                                                            )
                                                        }
                                                        placeholder="New password"
                                                        value={
                                                            passwordFields.newPassword
                                                        }
                                                        error={
                                                            errors?.newPassword ??
                                                            null
                                                        }
                                                        disabled={
                                                            passwordLoading
                                                        }
                                                    />
                                                </Field>
                                                <Field
                                                    error={
                                                        errors?.newPasswordConfirm ??
                                                        null
                                                    }
                                                    title={
                                                        'Repeat the new password'
                                                    }
                                                >
                                                    <InputField
                                                        type="password"
                                                        autoComplete="new-password"
                                                        length={
                                                            FIELD_LIMITS
                                                                .password.max
                                                        }
                                                        onChange={(e: any) =>
                                                            setPasswordFields({
                                                                ...passwordFields,
                                                                newPasswordConfirm:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        onFocus={() =>
                                                            handleFocus(
                                                                'newPasswordConfirm',
                                                            )
                                                        }
                                                        placeholder="Repeat the new password"
                                                        value={
                                                            passwordFields.newPasswordConfirm
                                                        }
                                                        error={
                                                            errors?.newPasswordConfirm ??
                                                            null
                                                        }
                                                        disabled={
                                                            passwordLoading
                                                        }
                                                    />
                                                </Field>
                                                <div className="settings_panel_actions">
                                                    <PrimaryButton
                                                        type="submit"
                                                        isLoading={
                                                            passwordLoading
                                                        }
                                                    >
                                                        Change password
                                                    </PrimaryButton>
                                                    <ActionButton
                                                        type="button"
                                                        disabled={
                                                            passwordLoading
                                                        }
                                                        onClick={
                                                            closePasswordForm
                                                        }
                                                    >
                                                        Cancel
                                                    </ActionButton>
                                                </div>
                                            </form>
                                        ) : (
                                            <PanelRow
                                                icon={<SecurityIcon />}
                                                title="Password"
                                                description="••••••••"
                                                trailing={
                                                    <ActionButton
                                                        type="button"
                                                        onClick={
                                                            openPasswordForm
                                                        }
                                                    >
                                                        Change password
                                                    </ActionButton>
                                                }
                                            />
                                        )}
                                    </Panel>
                                </div>
                            </div>
                        ),
                    },
                    {
                        title: 'Notifications',
                        key: 'notifications',
                        content: (
                            <div className="settings_panel">
                                <div className="settings_stack">
                                    <Panel>
                                        <PanelRow
                                            icon={<NotificationIcon />}
                                            title="Push notifications"
                                            description={
                                                pushSupportState ===
                                                'needs-install'
                                                    ? 'On iPhone, add Scribo to the Home Screen first, then open it from there'
                                                    : pushSupportState ===
                                                        'unsupported'
                                                      ? 'This browser does not support notifications'
                                                      : pushDenied
                                                        ? 'Blocked in the browser, allow notifications for this site in its settings'
                                                        : 'New messages and activity on this device, even when Scribo is closed'
                                            }
                                            trailing={
                                                <Toggle
                                                    checked={pushOn}
                                                    onChange={
                                                        pushSupportState ===
                                                            'supported' &&
                                                        !pushDenied &&
                                                        !pushBusy
                                                            ? togglePush
                                                            : () => undefined
                                                    }
                                                />
                                            }
                                        />
                                    </Panel>
                                    {pushSupportState === 'supported' &&
                                        pushDenied && (
                                            <div className="settings_push_blocked">
                                                <Banner
                                                    tone="warning"
                                                    icon={<WarningIcon />}
                                                    action={
                                                        <ActionButton
                                                            type="button"
                                                            isLoading={pushBusy}
                                                            onClick={() =>
                                                                void retryPush()
                                                            }
                                                        >
                                                            Enable
                                                        </ActionButton>
                                                    }
                                                >
                                                    Notifications are blocked
                                                    for this site
                                                </Banner>
                                                <ol className="settings_push_blocked_steps">
                                                    <li>
                                                        Click the icon left of
                                                        the address bar (lock or
                                                        settings)
                                                    </li>
                                                    <li>
                                                        Set Notifications to
                                                        Allow
                                                    </li>
                                                    <li>
                                                        Come back here, this
                                                        page updates on its own
                                                    </li>
                                                </ol>
                                            </div>
                                        )}
                                </div>
                            </div>
                        ),
                    },
                    {
                        title: 'App',
                        key: 'app',
                        content: (
                            <div className="settings_panel">
                                <div className="settings_stack">
                                    {installMode === 'prompt' ||
                                    installMode === 'ios' ? (
                                        <Panel>
                                            <PanelRow
                                                title="Install the app"
                                                description={
                                                    installMode === 'ios'
                                                        ? 'Tap Share in Safari, choose Add to Home Screen, then open Scribo from the new icon. iPhone only offers notifications to an installed app'
                                                        : 'Open Scribo in its own window, right from your home screen or desktop'
                                                }
                                                trailing={
                                                    installMode === 'prompt' ? (
                                                        <ActionButton
                                                            type="button"
                                                            onClick={() =>
                                                                void install()
                                                            }
                                                        >
                                                            Install
                                                        </ActionButton>
                                                    ) : null
                                                }
                                            />
                                        </Panel>
                                    ) : null}
                                </div>
                            </div>
                        ),
                    },
                    {
                        title: 'Appearance',
                        key: 'appearance',
                        content: (
                            <div className="settings_panel">
                                <div className="settings_stack">
                                    <Panel>
                                        <PanelRow
                                            icon={<MoonIcon />}
                                            title="Dark theme"
                                            trailing={
                                                <Toggle
                                                    checked={isDarkTheme}
                                                    onChange={setIsDarkTheme}
                                                />
                                            }
                                        />
                                    </Panel>
                                </div>
                            </div>
                        ),
                    },
                    {
                        title: 'Sessions',
                        key: 'sessions',
                        content: (
                            <div className="settings_panel">
                                <div className="settings_stack">
                                    <Panel>
                                        {sessionsLoading ? (
                                            <p className="settings_sessions_empty">
                                                Loading…
                                            </p>
                                        ) : sessions.length === 0 ? (
                                            <p className="settings_sessions_empty">
                                                No active sessions
                                            </p>
                                        ) : (
                                            sessions.map((session: any) => (
                                                <PanelRow
                                                    className="settings_sessions_item"
                                                    key={session._id}
                                                    icon={<GlobalIcon />}
                                                    title={
                                                        <span className="settings_sessions_item_head">
                                                            {session.device}
                                                            {session.isCurrent ? (
                                                                <Pill tone="success">
                                                                    Current
                                                                </Pill>
                                                            ) : null}
                                                        </span>
                                                    }
                                                    description={
                                                        <span className="settings_sessions_item_meta">
                                                            <span>
                                                                {session.location ||
                                                                    '—'}
                                                            </span>
                                                            <span aria-hidden="true">
                                                                ·
                                                            </span>
                                                            <Tooltip
                                                                text={format_date_time(
                                                                    session.lastSeen,
                                                                )}
                                                            >
                                                                <span>
                                                                    {format_back(
                                                                        session.lastSeen,
                                                                    ) ||
                                                                        format_date_time(
                                                                            session.lastSeen,
                                                                        )}
                                                                </span>
                                                            </Tooltip>
                                                        </span>
                                                    }
                                                    trailing={
                                                        <DangerButton
                                                            type="button"
                                                            isLoading={
                                                                endingSessionId ===
                                                                session._id
                                                            }
                                                            disabled={
                                                                Boolean(
                                                                    endingSessionId,
                                                                ) ||
                                                                logoutLoading
                                                            }
                                                            onClick={() =>
                                                                handleDeleteSession(
                                                                    session,
                                                                )
                                                            }
                                                        >
                                                            Sign out
                                                        </DangerButton>
                                                    }
                                                />
                                            ))
                                        )}
                                    </Panel>
                                    <div className="settings_logout app-transition">
                                        <DangerButton
                                            className="logout_button"
                                            type="button"
                                            isLoading={logoutLoading}
                                            disabled={Boolean(endingSessionId)}
                                            onClick={handleLogout}
                                        >
                                            <LogoutIcon />
                                            Log out
                                        </DangerButton>
                                    </div>
                                </div>
                            </div>
                        ),
                    },
                ]
                    .filter(
                        (section: any) =>
                            section.key !== 'app' ||
                            installMode === 'prompt' ||
                            installMode === 'ios',
                    )
                    .map((section: any) => (
                        <section key={section.key} className="settings_section">
                            <h1>{section.title}</h1>
                            {section.content}
                        </section>
                    ))}
            </div>
        </div>
    );
};

export default Settings;
