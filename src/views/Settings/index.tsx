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
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { format_back, format_date_time } from '../../utils/format';

import InputField from '../../components/Ui/InputField/index';
import DropFile from '../../components/Ui/DropFile/index';
import Toggle from '../../components/Ui/Toggle/index';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';
import DangerButton from '../../components/Ui/DangerButton';
import Field from '../../components/Ui/Field';
import Tooltip from '../../components/Ui/Tooltip';

import './Settings.scss';

import AvatarIcon from '../../assets/svg/avatar-icon.svg';
import LogoutIcon from '../../assets/svg/logout.svg';

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
    const navigate = useNavigate();
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
        setPasswordLoading(true);
        if (!password_field_validation()) {
            setPasswordLoading(false);
            return;
        }

        try {
            const result = await changePassword(passwordFields);

            setPasswordLoading(false);
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
            setPasswordLoading(false);
            showToast({ message: 'Error!', type: 'error' });
        }
    };

    const save_settings = async () => {
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

            setIsLoading(false);
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
        try {
            const result = await deleteSession(session._id);

            if (!result?.status) {
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
                                            />
                                        </Field>
                                    </div>
                                    <div className="settings_group">
                                        <p className="kicker">Privacy</p>
                                        <div className="settings_switch">
                                            <div className="settings_switch_copy">
                                                <p className="settings_switch_title">
                                                    Show email
                                                </p>
                                                <p className="settings_switch_hint">
                                                    The address will be visible
                                                    on the profile page
                                                </p>
                                            </div>
                                            <Toggle
                                                checked={fields.isEmailPublic}
                                                onChange={set_email_visibility}
                                            />
                                        </div>
                                        <div className="settings_switch">
                                            <div className="settings_switch_copy">
                                                <p className="settings_switch_title">
                                                    Public saved posts
                                                </p>
                                                <p className="settings_switch_hint">
                                                    Visitors of the profile will
                                                    see saved posts
                                                </p>
                                            </div>
                                            <Toggle
                                                checked={
                                                    fields.isSavedPostsPublic
                                                }
                                                onChange={
                                                    set_saved_posts_visibility
                                                }
                                            />
                                        </div>
                                        <div className="settings_switch">
                                            <div className="settings_switch_copy">
                                                <p className="settings_switch_title">
                                                    Show last activity
                                                </p>
                                                <p className="settings_switch_hint">
                                                    The date and time will be
                                                    visible on the profile page
                                                </p>
                                            </div>
                                            <Toggle
                                                checked={
                                                    fields.isLastActivityPublic
                                                }
                                                onChange={
                                                    set_last_activity_visibility
                                                }
                                            />
                                        </div>
                                    </div>
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
                                    <div className="settings_group">
                                        <p className="kicker">Password</p>
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
                                            <div className="settings_password_preview">
                                                <InputField
                                                    type="password"
                                                    value="********"
                                                    readOnly
                                                    tabIndex={-1}
                                                    onChange={() => {}}
                                                />
                                                <ActionButton
                                                    type="button"
                                                    onClick={openPasswordForm}
                                                >
                                                    Change password
                                                </ActionButton>
                                            </div>
                                        )}
                                    </div>
                                    <div className="settings_group">
                                        <p className="kicker">Sessions</p>
                                        <div className="settings_sessions">
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
                                                    <div
                                                        className="settings_sessions_item app-transition"
                                                        key={session._id}
                                                    >
                                                        <div className="settings_sessions_item_info">
                                                            <div className="settings_sessions_item_head">
                                                                <p className="settings_sessions_item_device">
                                                                    {
                                                                        session.device
                                                                    }
                                                                </p>
                                                                {session.isCurrent ? (
                                                                    <span className="settings_sessions_badge app-transition">
                                                                        This
                                                                        session
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <div className="settings_sessions_item_meta">
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
                                                                    <span className="settings_sessions_item_time">
                                                                        {format_back(
                                                                            session.lastSeen,
                                                                        ) ||
                                                                            format_date_time(
                                                                                session.lastSeen,
                                                                            )}
                                                                    </span>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
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
                                                            End
                                                        </DangerButton>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
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
                    {
                        title: 'Appearance',
                        key: 'appearance',
                        content: (
                            <div className="settings_panel">
                                <div className="settings_stack">
                                    <div className="settings_group settings_theme">
                                        <p>Dark theme</p>
                                        <Toggle
                                            checked={isDarkTheme}
                                            onChange={setIsDarkTheme}
                                        />
                                    </div>
                                </div>
                            </div>
                        ),
                    },
                ].map((section: any) => (
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
