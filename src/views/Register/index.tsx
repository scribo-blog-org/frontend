'use client';

import { useNavigate, useLocation, Link } from '@/navigation';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/providers/AppProviders';

import {
    emailRegister,
    googleRegister,
    veriticationEmailConfirm,
    verificationGoogle,
    loginGoogle,
    verificationEmail,
} from '../../api/auth.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';

import InputField from '../../components/Ui/InputField/index';
import DropFile from '../../components/Ui/DropFile/index';
import GoogleAuthButton from '../../components/GoogleAuthButton/index';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import Field from '../../components/Ui/Field/index';
import OtpInput from '../../components/Ui/OtpInput/index';

import '../Auth/Auth.scss';

import AvatarIcon from '../../assets/svg/avatar-icon.svg';

const RegisterForm = ({
    email = null,
    google_token = null,
    gmail_code = null,
}: any) => {
    const navigate = useNavigate();

    const [fields, setFields] = useState<any>({
        userNickName: '',
        userPassword: '',
        userDescription: '',
        userAvatar: null,
    });
    const [errors, setErrors] = useState<any>({});
    const { showToast } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState<any>(false);

    if (!(google_token || (email && gmail_code))) {
        return <></>;
    }

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
        if (fields.userDescription.length > FIELD_LIMITS.description.max) {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                userDescription: `Description must be at most ${FIELD_LIMITS.description.max} characters`,
            }));
            is_error = true;
        }
        return !is_error;
    };

    const handleRegister = async () => {
        setIsLoading(true);
        if (!field_validation()) {
            setIsLoading(false);
            return;
        }

        const formData = new FormData();

        for (let field in fields) {
            formData.append(field, fields[field]);
        }

        formData.append('userEmail', email);
        var result;

        if (google_token) {
            formData.append('googleToken', google_token);
            result = await googleRegister(formData);
        } else {
            formData.append('emailCode', gmail_code);
            result = await emailRegister(formData);
        }

        if (result.status === true) {
            navigate('/auth/login');
            showToast({ message: 'Signed up!', type: 'success' });
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
            setIsLoading(false);
            return result;
        }
    };

    const handleClick = () => {
        const other = { ...errors };
        delete other.userAvatar;

        setErrors(other);
    };

    return (
        <div className="auth_page">
            <form
                className="form_input"
                onSubmit={(e: any) => {
                    e.preventDefault();
                    handleRegister();
                }}
            >
                <div className="auth_page_stack">
                    <h1 className="auth_page_title">Sign up</h1>
                    <div className="auth_page_group section app-transition">
                        <div className="top_side">
                            <DropFile
                                value={fields.userAvatar}
                                setValue={(file: any) =>
                                    setFields({ ...fields, userAvatar: file })
                                }
                                background={
                                    <AvatarIcon className="drop_file_info_avatar_icon app-transition" />
                                }
                                dropFileType="image/*"
                                fileTypes="SVG, PNG, JPEG, JPG, and others"
                                errors={errors?.userAvatar}
                                addNewErrors={add_errors_to_image}
                                clearErrors={clear_errors_from_image}
                                onRemove={handleClick}
                            />
                        </div>
                        <Field title="Email">
                            <InputField
                                className={`email`}
                                type="text"
                                onChange={() => {}}
                                placeholder="Email"
                                value={email ?? fields.email}
                                error={errors?.userEmail ?? null}
                                confirmed={Boolean(email)}
                                length={FIELD_LIMITS.email.max}
                            />
                        </Field>
                        <Field
                            title="Username"
                            error={errors?.userNickName ?? null}
                        >
                            <InputField
                                className={`user_name`}
                                type="text"
                                onChange={(e: any) =>
                                    setFields({
                                        ...fields,
                                        userNickName: e.target.value,
                                    })
                                }
                                onFocus={() => handleFocus('userNickName')}
                                placeholder="User Name"
                                value={fields.userNickName}
                                error={errors?.userNickName ?? null}
                                length={FIELD_LIMITS.nick.max}
                            />
                        </Field>
                        <Field
                            title="Description"
                            error={errors?.userDescription ?? null}
                        >
                            <InputField
                                className={`description`}
                                type="text"
                                isMultiline={true}
                                length={FIELD_LIMITS.description.max}
                                onChange={(e: any) =>
                                    setFields({
                                        ...fields,
                                        userDescription: e.target.value,
                                    })
                                }
                                onFocus={() => handleFocus('userDescription')}
                                placeholder="Description of profile"
                                value={fields.userDescription}
                                error={errors?.userDescription ?? null}
                            />
                        </Field>
                    </div>
                </div>
                <div className="auth_page_stack">
                    <h1 className="auth_page_title">Password</h1>
                    <div className="auth_page_group section app-transition">
                        <Field
                            title="Password"
                            error={errors?.userPassword ?? null}
                        >
                            <InputField
                                className={`password`}
                                type="password"
                                onChange={(e: any) =>
                                    setFields({
                                        ...fields,
                                        userPassword: e.target.value,
                                    })
                                }
                                onFocus={() => handleFocus('userPassword')}
                                placeholder="Password123"
                                value={fields.userPassword}
                                error={errors?.userPassword ?? null}
                                length={FIELD_LIMITS.password.max}
                            />
                        </Field>
                        <PrimaryButton type="submit" isLoading={isLoading}>
                            Sign up
                        </PrimaryButton>
                    </div>
                </div>
                <p className="redirect_object">
                    Already have an account?
                    <Link href={'/auth/login'}>Log in</Link>
                </p>
            </form>
        </div>
    );
};

const VerifyGmailCode = ({ email }: any) => {
    const CODE_LENGTH = 6;

    const [code, setCode] = useState<any>(Array(CODE_LENGTH).fill(''));
    const [errors, setErrors] = useState<any>({});
    const [redigrectToForm, setRedigrectToForm] = useState<any>(false);
    const [isLoading, setIsLoading] = useState<any>(false);

    if (!email) return null;

    const handleSubmit = async () => {
        setIsLoading(true);
        const fullCode = code.join('');

        if (fullCode.length !== CODE_LENGTH) {
            setErrors({ emailCode: ' ' });
            setIsLoading(false);
            return;
        }

        try {
            const result = await veriticationEmailConfirm(email, fullCode);

            if (result.statusCode === 200) {
                setRedigrectToForm(true);
                return;
            }
            if (result?.errors?.body) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(result.errors.body).map(
                            ([field, obj]: any) => [field, obj.message],
                        ),
                    ),
                );
                return;
            }
            if (result.statusCode === 401 || result.statusCode === 400) {
                setErrors({ emailCode: ' ' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return redigrectToForm ? (
        <RegisterForm email={email} gmail_code={code.join('')} />
    ) : (
        <div className="auth_page">
            <form
                className="form_input"
                onSubmit={(e: any) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="auth_page_stack">
                    <h1 className="auth_page_title">Sign up</h1>
                    <div className="auth_page_group section app-transition">
                        <div className="otp_container">
                            <div className="otp_container_content">
                                <OtpInput
                                    length={CODE_LENGTH}
                                    value={code}
                                    onChange={setCode}
                                    error={errors?.emailCode}
                                    onFocus={() => setErrors({})}
                                />
                            </div>
                        </div>
                        <PrimaryButton type="submit" isLoading={isLoading}>
                            Continue
                        </PrimaryButton>
                    </div>
                </div>
            </form>
        </div>
    );
};

const Register = () => {
    const locationState = useLocation().state || {};
    const [oauthDraft, setOauthDraft] = useState<any>(null);
    const email = oauthDraft?.email ?? locationState.email;
    const google_token = oauthDraft?.google_token ?? locationState.google_token;
    const gmail_code = locationState.gmail_code;
    const navigate = useNavigate();

    const [fields, setFields] = useState<any>({ email: '' });
    const [errors, setErrors] = useState<any>({});
    const { showToast } = useContext(AppContext);
    const [googleToken, setGoogleToken] = useState<any>();
    const [gmailCodeSedned, setGmailCodeSedned] = useState<any>(false);
    const [pendingAuth, setPendingAuth] = useState<any>(null);

    useEffect(() => {
        const do_login = async () => {
            setPendingAuth('google');
            try {
                const result = await verificationGoogle(googleToken);

                if (result?.status !== true) {
                    showToast({
                        message: 'Could not sign in with Google',
                        type: 'error',
                    });
                    setPendingAuth(null);
                    return;
                }

                if (result.data?.is_registered) {
                    const loginResult = await loginGoogle(googleToken);

                    if (loginResult?.status === true) {
                        navigate('/');
                        showToast({
                            message: 'Signed in!',
                            type: 'success',
                        });
                    } else {
                        setPendingAuth(null);
                    }
                    return;
                }

                setOauthDraft({
                    google_token: googleToken,
                    email: result.data?.email,
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

    if (google_token) {
        return <RegisterForm google_token={google_token} email={email} />;
    }

    if (email && gmail_code) {
        return <RegisterForm email={email} gmail_code={gmail_code} />;
    }

    const handleFocus = (fieldName: any) => {
        const other = { ...errors };
        delete other[fieldName];
        setErrors(other);
    };

    const field_validation = () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
            setErrors({
                userEmail: 'Incorrect email!',
            });
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!field_validation()) {
            return;
        }

        setPendingAuth('email');
        let result;
        try {
            result = await verificationEmail(fields.email);
        } finally {
            setPendingAuth(null);
        }

        if (result.statusCode === 200) {
            setGmailCodeSedned(true);
            return;
        }
        if (result?.errors?.body) {
            setErrors(
                Object.fromEntries(
                    Object.entries(result.errors.body).map(
                        ([field, obj]: any) => [field, obj.message],
                    ),
                ),
            );
            return;
        }
        if (result.statusCode === 409) {
            setErrors({
                userEmail: result.message,
            });
        }
    };

    return gmailCodeSedned ? (
        <VerifyGmailCode email={fields.email} />
    ) : (
        <div className="auth_page">
            <form
                className="form_input"
                onSubmit={(e: any) => {
                    e.preventDefault();
                    handleRegister();
                }}
            >
                <div className="auth_page_stack">
                    <h1 className="auth_page_title">Sign up</h1>
                    <div className="auth_page_group section app-transition">
                        <Field title="Email" error={errors?.userEmail ?? null}>
                            <InputField
                                className={`email`}
                                type="text"
                                onChange={(e: any) =>
                                    setFields({
                                        ...fields,
                                        email: e.target.value,
                                    })
                                }
                                onFocus={() => handleFocus('userEmail')}
                                placeholder="Email"
                                value={email ?? fields.email}
                                error={errors?.userEmail ?? null}
                                confirmed={Boolean(email)}
                                length={FIELD_LIMITS.email.max}
                            />
                        </Field>
                        <PrimaryButton
                            isLoading={pendingAuth === 'email'}
                            disabled={Boolean(pendingAuth)}
                            type="submit"
                        >
                            Continue
                        </PrimaryButton>
                    </div>
                </div>
                <p className="auth_page_or">or</p>
                <GoogleAuthButton
                    setGoogleToken={setGoogleToken}
                    isLoading={pendingAuth === 'google'}
                    disabled={pendingAuth === 'email'}
                    onClickStart={() => setPendingAuth('google')}
                    onAuthEnd={() => setPendingAuth(null)}
                />
                <p className="redirect_object">
                    Already have an account?
                    <Link href={'/auth/login'}>Log in</Link>
                </p>
            </form>
        </div>
    );
};

export default Register;
