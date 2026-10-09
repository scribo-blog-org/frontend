'use client';

import { useContext, useState } from 'react';
import { AppContext } from '@/providers/AppProviders';
import { Link, useNavigate } from '@/navigation';

import InputField from '../../components/Ui/InputField/index';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';
import Field from '../../components/Ui/Field/index';
import OtpInput from '../../components/Ui/OtpInput/index';

import {
    requestPasswordReset,
    confirmPasswordReset,
    resetPassword,
} from '../../api/auth.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { setAccessToken } from '../../api/http';

import '../Auth/Auth.scss';

const CODE_LENGTH = 6;

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { showToast, setProfile } = useContext(AppContext);
    const [step, setStep] = useState<any>('email');
    const [pendingAction, setPendingAction] = useState<any>(null);
    const [email, setEmail] = useState<any>('');
    const [code, setCode] = useState<any>(Array(CODE_LENGTH).fill(''));
    const [passwords, setPasswords] = useState<any>({
        newPassword: '',
        newPasswordConfirm: '',
    });
    const [errors, setErrors] = useState<any>({});

    const locked = Boolean(pendingAction);
    const guardLink = (e: any) => {
        if (locked) {
            e.preventDefault();
        }
    };

    const handleFocus = (fieldName: any) => {
        const other = { ...errors };
        delete other[fieldName];
        setErrors(other);
    };

    const applyBodyErrors = (result: any) => {
        if (result?.errors?.body) {
            setErrors(
                Object.fromEntries(
                    Object.entries(result.errors.body).map(
                        ([field, obj]: any) => [field, obj.message],
                    ),
                ),
            );
        }
    };

    const sendCode = async (fromResend: any = false) => {
        if (locked) {
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setErrors({ userEmail: 'Invalid email' });
            return;
        }

        setPendingAction(fromResend ? 'resend' : 'submit');
        let result;
        try {
            result = await requestPasswordReset(email.trim());
        } finally {
            setPendingAction(null);
        }

        if (result?.statusCode === 429) {
            showToast({
                message: 'Too many requests. Please wait a moment.',
                type: 'error',
            });
            return;
        }

        if (result?.status === true) {
            setCode(Array(CODE_LENGTH).fill(''));
            setStep('code');
            showToast({
                message: 'If the account exists, we sent a code to the email',
                type: 'success',
            });
            return;
        }

        applyBodyErrors(result);
        showToast({ message: 'Error!', type: 'error' });
    };

    const confirmCode = async () => {
        if (locked) {
            return;
        }
        const emailCode = code.join('');

        if (emailCode.length !== CODE_LENGTH) {
            setErrors({ emailCode: ' ' });
            return;
        }

        setPendingAction('submit');
        let result;
        try {
            result = await confirmPasswordReset(email.trim(), emailCode);
        } finally {
            setPendingAction(null);
        }

        if (result?.statusCode === 429) {
            showToast({
                message: 'Too many attempts. Please wait a moment.',
                type: 'error',
            });
            return;
        }

        if (result?.status === true) {
            setPasswords({ newPassword: '', newPasswordConfirm: '' });
            setErrors({});
            setStep('password');
            return;
        }

        setErrors({
            emailCode: result?.errors?.body?.emailCode?.message || ' ',
        });
        showToast({ message: 'Invalid code', type: 'error' });
    };

    const submitPassword = async () => {
        if (locked) {
            return;
        }
        const next: any = {};
        if (
            passwords.newPassword.length < FIELD_LIMITS.password.min ||
            passwords.newPassword.length > FIELD_LIMITS.password.max
        ) {
            next.newPassword = `Password must be from ${FIELD_LIMITS.password.min} to ${FIELD_LIMITS.password.max} characters`;
        }
        if (
            passwords.newPasswordConfirm.length < FIELD_LIMITS.password.min ||
            passwords.newPasswordConfirm.length > FIELD_LIMITS.password.max
        ) {
            next.newPasswordConfirm = `Password must be from ${FIELD_LIMITS.password.min} to ${FIELD_LIMITS.password.max} characters`;
        }
        if (
            !next.newPassword &&
            !next.newPasswordConfirm &&
            passwords.newPassword !== passwords.newPasswordConfirm
        ) {
            next.newPasswordConfirm = 'Passwords do not match';
        }
        if (Object.keys(next).length) {
            setErrors(next);
            return;
        }

        setPendingAction('submit');
        let result;
        try {
            result = await resetPassword({
                email: email.trim(),
                emailCode: code.join(''),
                newPassword: passwords.newPassword,
                newPasswordConfirm: passwords.newPasswordConfirm,
            });
        } finally {
            setPendingAction(null);
        }

        if (result?.statusCode === 429) {
            showToast({
                message: 'Too many attempts. Please wait a moment.',
                type: 'error',
            });
            return;
        }

        if (result?.status === true) {
            setAccessToken(null);
            setProfile(null);
            showToast({
                message: 'Password changed. Log in with the new password.',
                type: 'success',
            });
            navigate('/auth/login');
            return;
        }

        applyBodyErrors(result);
        showToast({ message: 'Error!', type: 'error' });
    };

    return (
        <div className="auth_page">
            {step === 'email' ? (
                <form
                    className="form_input"
                    onSubmit={(event: any) => {
                        event.preventDefault();
                        sendCode();
                    }}
                >
                    <div className="auth_page_stack">
                        <h1 className="auth_page_title">Password reset</h1>
                        <div className="auth_page_group section app-transition">
                            <Field
                                title="Email"
                                error={errors?.userEmail ?? null}
                            >
                                <InputField
                                    type="email"
                                    autoComplete="email"
                                    onChange={(e: any) =>
                                        setEmail(e.target.value)
                                    }
                                    onFocus={() => handleFocus('userEmail')}
                                    placeholder="Email"
                                    value={email}
                                    error={errors?.userEmail ?? null}
                                    length={FIELD_LIMITS.email.max}
                                    disabled={locked}
                                />
                            </Field>
                            <PrimaryButton
                                type="submit"
                                isLoading={pendingAction === 'submit'}
                                disabled={locked}
                            >
                                Send code
                            </PrimaryButton>
                        </div>
                    </div>
                    <p className="redirect_object">
                        Remembered your password?
                        <Link
                            href="/auth/login"
                            aria-disabled={locked}
                            onClick={guardLink}
                        >
                            Log in
                        </Link>
                    </p>
                </form>
            ) : null}

            {step === 'code' ? (
                <form
                    className="form_input"
                    onSubmit={(event: any) => {
                        event.preventDefault();
                        confirmCode();
                    }}
                >
                    <div className="auth_page_stack">
                        <h1 className="auth_page_title">Code from the email</h1>
                        <div className="auth_page_group section app-transition">
                            <div className="otp_container">
                                <div className="otp_container_content">
                                    <OtpInput
                                        length={CODE_LENGTH}
                                        value={code}
                                        onChange={setCode}
                                        error={errors?.emailCode}
                                        onFocus={() => handleFocus('emailCode')}
                                        disabled={locked}
                                    />
                                </div>
                            </div>
                            <PrimaryButton
                                type="submit"
                                isLoading={pendingAction === 'submit'}
                                disabled={locked}
                            >
                                Continue
                            </PrimaryButton>
                            <ActionButton
                                type="button"
                                onClick={() => sendCode(true)}
                                isLoading={pendingAction === 'resend'}
                                disabled={locked}
                            >
                                Send the code again
                            </ActionButton>
                        </div>
                    </div>
                    <p className="redirect_object">
                        <button
                            type="button"
                            className="auth_text_button"
                            disabled={locked}
                            onClick={() => setStep('email')}
                        >
                            Change email
                        </button>
                    </p>
                </form>
            ) : null}

            {step === 'password' ? (
                <form
                    className="form_input"
                    onSubmit={(event: any) => {
                        event.preventDefault();
                        submitPassword();
                    }}
                >
                    <div className="auth_page_stack">
                        <h1 className="auth_page_title">New password</h1>
                        <div className="auth_page_group section app-transition">
                            <Field
                                title="New password"
                                error={errors?.newPassword ?? null}
                            >
                                <InputField
                                    type="password"
                                    autoComplete="new-password"
                                    length={FIELD_LIMITS.password.max}
                                    onChange={(e: any) =>
                                        setPasswords({
                                            ...passwords,
                                            newPassword: e.target.value,
                                        })
                                    }
                                    onFocus={() => handleFocus('newPassword')}
                                    placeholder="New password"
                                    value={passwords.newPassword}
                                    error={errors?.newPassword ?? null}
                                    disabled={locked}
                                />
                            </Field>
                            <Field
                                title="Repeat the password"
                                error={errors?.newPasswordConfirm ?? null}
                            >
                                <InputField
                                    type="password"
                                    autoComplete="new-password"
                                    length={FIELD_LIMITS.password.max}
                                    onChange={(e: any) =>
                                        setPasswords({
                                            ...passwords,
                                            newPasswordConfirm: e.target.value,
                                        })
                                    }
                                    onFocus={() =>
                                        handleFocus('newPasswordConfirm')
                                    }
                                    placeholder="Repeat the password"
                                    value={passwords.newPasswordConfirm}
                                    error={errors?.newPasswordConfirm ?? null}
                                    disabled={locked}
                                />
                            </Field>
                            <PrimaryButton
                                type="submit"
                                isLoading={pendingAction === 'submit'}
                                disabled={locked}
                            >
                                Change password
                            </PrimaryButton>
                        </div>
                    </div>
                    <p className="redirect_object">
                        <Link
                            href="/auth/login"
                            aria-disabled={locked}
                            onClick={guardLink}
                        >
                            Back to sign-in
                        </Link>
                    </p>
                </form>
            ) : null}
        </div>
    );
};

export default ForgotPassword;
