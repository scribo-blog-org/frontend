'use client';

import { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/providers/AppProviders';
import { useNavigate, Link } from '@/navigation';

import InputField from '../../components/Ui/InputField/index';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import Field from '../../components/Ui/Field/index';

import {
    verificationGoogle,
    loginGoogle,
    loginUsername,
} from '../../api/auth.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';

import '../Auth/Auth.scss';

import GoogleAuthButton from '../../components/GoogleAuthButton/index';

const Login = () => {
    const navigate = useNavigate();
    const [googleToken, setGoogleToken] = useState<any>(null);
    const [pendingAuth, setPendingAuth] = useState<any>(null);
    const [fields, setFields] = useState<any>({
        userName: '',
        userPassword: '',
    });
    const [errors, setErrors] = useState<any>({});
    const { showToast } = useContext(AppContext);

    useEffect(() => {
        const do_login = async () => {
            setPendingAuth('google');
            try {
                const result = await verificationGoogle(googleToken);

                if (
                    result?.status === true &&
                    result.data?.is_registered === false
                ) {
                    navigate('/auth/register', {
                        state: {
                            google_token: googleToken,
                            email: result.data.email,
                        },
                    });
                    return;
                }

                if (
                    result?.status === true &&
                    result.data?.is_registered === true
                ) {
                    await loginGoogle(googleToken);
                    navigate('/');
                    showToast({
                        message: 'You are signed in!',
                        type: 'success',
                    });
                    return;
                }

                showToast({
                    message: 'Could not sign in with Google',
                    type: 'error',
                });
                setPendingAuth(null);
            } catch {
                showToast({
                    message: 'Could not sign in with Google',
                    type: 'error',
                });
                setPendingAuth(null);
            }
        };

        if (googleToken) {
            do_login();
        }
    }, [googleToken, navigate, showToast]);

    const handleFocus = (fieldName: any) => {
        const other = { ...errors };
        delete other[fieldName];
        setErrors(other);
    };

    const field_validation = () => {
        let is_error = false;
        if (fields.userName.length < FIELD_LIMITS.login.min) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userName: `Login must be at least ${FIELD_LIMITS.login.min} characters`,
            }));
            is_error = true;
        }
        if (fields.userName.length > FIELD_LIMITS.login.max) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userName: `Login must be at most ${FIELD_LIMITS.login.max} characters`,
            }));
            is_error = true;
        }
        if (fields.userPassword.length < FIELD_LIMITS.password.min) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userPassword: `Password must be at least ${FIELD_LIMITS.password.min} characters`,
            }));
            is_error = true;
        }
        if (fields.userPassword.length > FIELD_LIMITS.password.max) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userPassword: `Password must be at most ${FIELD_LIMITS.password.max} characters`,
            }));
            is_error = true;
        }
        return !is_error;
    };

    const handleLogin = async () => {
        if (!field_validation()) {
            return;
        }

        setPendingAuth('password');
        let result;
        try {
            result = await loginUsername(fields.userName, fields.userPassword);
        } finally {
            setPendingAuth(null);
        }

        if (result.status === true) {
            navigate('/');
            showToast({ message: 'You are signed in!', type: 'success' });
            return result;
        } else {
            showToast({ message: 'Incorrect!', type: 'error' });
            if (result?.errors?.body) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(result.errors.body).map(
                            ([field, obj]: any) => [field, obj.message],
                        ),
                    ),
                );
            }

            return result;
        }
    };

    return (
        <div className="auth_page">
            <form
                className="form_input"
                onSubmit={(e: any) => {
                    e.preventDefault();
                    handleLogin();
                }}
            >
                <div className="auth_page_stack">
                    <h1 className="auth_page_title">Sign-in</h1>
                    <div className="auth_page_group section app-transition">
                        <Field title="Login" error={errors?.userName ?? null}>
                            <InputField
                                className={`userName`}
                                type="text"
                                onChange={(e: any) =>
                                    setFields({
                                        ...fields,
                                        userName: e.target.value,
                                    })
                                }
                                onFocus={() => handleFocus('userName')}
                                placeholder="Username or email"
                                value={fields.userName}
                                error={errors?.userName ?? null}
                                length={FIELD_LIMITS.login.max}
                            />
                        </Field>
                        <Field
                            title="Password"
                            error={errors?.userPassword ?? null}
                        >
                            <InputField
                                className={`userPassword`}
                                type="password"
                                onChange={(e: any) =>
                                    setFields({
                                        ...fields,
                                        userPassword: e.target.value,
                                    })
                                }
                                onFocus={() => handleFocus('userPassword')}
                                placeholder="Enter a password"
                                value={fields.userPassword}
                                error={errors?.userPassword ?? null}
                                length={FIELD_LIMITS.password.max}
                            />
                        </Field>
                        <div className="auth_page_forgot">
                            <Link href="/auth/forgot-password">
                                Forgot password?
                            </Link>
                        </div>
                        <PrimaryButton
                            type="submit"
                            isLoading={pendingAuth === 'password'}
                            disabled={Boolean(pendingAuth)}
                        >
                            Log in
                        </PrimaryButton>
                    </div>
                </div>
                <p className="auth_page_or">or</p>
                <GoogleAuthButton
                    setGoogleToken={setGoogleToken}
                    isLoading={pendingAuth === 'google'}
                    disabled={pendingAuth === 'password'}
                    onClickStart={() => setPendingAuth('google')}
                    onAuthEnd={() => setPendingAuth(null)}
                />
                <p className="redirect_object">
                    No account?
                    <Link href={'/auth/register'}>Sign up</Link>
                </p>
            </form>
        </div>
    );
};

export default Login;
