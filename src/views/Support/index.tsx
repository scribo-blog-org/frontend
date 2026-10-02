'use client';

import { useContext, useState } from 'react';
import { Link, Navigate, useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { createSupportRequest } from '../../api/support.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { SUPPORT_KINDS } from './constants';

import Field from '../../components/Ui/Field/index';
import InputField from '../../components/Ui/InputField';
import RichInputField from '../../components/RichInputField';
import DropDown from '../../components/Ui/DropDown';
import PrimaryButton from '../../components/Ui/PrimaryButton';

import './Support.scss';

const Support = () => {
    const navigate = useNavigate();
    const { showToast, profile, profileLoading } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState<any>(false);
    const [fields, setFields] = useState<any>({
        userEmail: '',
        supportKind: 'request',
        supportMessage: '',
    });
    const [errors, setErrors] = useState<any>({});

    const handleFocus = (fieldName: any) => {
        const next = { ...errors };
        delete next[fieldName];
        setErrors(next);
    };

    const validate = () => {
        const next: any = {};

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.userEmail.trim())) {
            next.userEmail = 'Enter a valid email';
        }

        if (!fields.supportKind) {
            next.supportKind = 'Choose a subject';
        }

        if (!fields.supportMessage.trim()) {
            next.supportMessage = 'Write a message';
        } else if (
            fields.supportMessage.trim().length <
            FIELD_LIMITS.supportMessage.min
        ) {
            next.supportMessage = `Message must be at least ${FIELD_LIMITS.supportMessage.min} characters`;
        } else if (
            fields.supportMessage.length > FIELD_LIMITS.supportMessage.max
        ) {
            next.supportMessage = `Message must be at most ${FIELD_LIMITS.supportMessage.max} characters`;
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await createSupportRequest({
                userEmail: fields.userEmail.trim(),
                supportKind: fields.supportKind,
                supportMessage: fields.supportMessage.trim(),
            });

            if (result.status === true && result.data?.access_key) {
                showToast({
                    message:
                        'Message sent. We will write to the email you provided.',
                    type: 'success',
                });
                navigate(`/support/${result.data.access_key}`);
                return;
            }

            showToast({
                message: result.message || 'Could not send the message',
                type: 'error',
            });

            if (result?.errors?.body) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(result.errors.body).map(
                            ([field, obj]: any) => [field, obj.message],
                        ),
                    ),
                );
            }
        } catch {
            showToast({
                message: 'Could not send the message',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!profileLoading && profile) {
        return <Navigate href="/support/mine" replace />;
    }

    return (
        <div className="support_page">
            <div className="support_page_intro">
                <h1>Support</h1>
                <p>
                    Leave an email and a message. The reply will come by email. You cannot reply from
                    this page.
                </p>
            </div>
            <form
                className="form_input app-transition"
                onSubmit={(event: any) => {
                    event.preventDefault();
                    handleSubmit();
                }}
            >
                <Field title="Email" error={errors?.userEmail ?? null}>
                    <InputField
                        type="email"
                        value={fields.userEmail}
                        placeholder="you@example.com"
                        onChange={(event: any) =>
                            setFields({
                                ...fields,
                                userEmail: event.target.value,
                            })
                        }
                        onFocus={() => handleFocus('userEmail')}
                        error={errors?.userEmail ?? null}
                        length={FIELD_LIMITS.email.max}
                    />
                </Field>
                <Field title="Subject" error={errors?.supportKind ?? null}>
                    <DropDown
                        options={SUPPORT_KINDS}
                        value={fields.supportKind}
                        placeholder="Choose a subject"
                        error={Boolean(errors?.supportKind)}
                        onChange={(value: any) => {
                            handleFocus('supportKind');
                            setFields({ ...fields, supportKind: value });
                        }}
                    />
                </Field>
                <Field title="Message" error={errors?.supportMessage ?? null}>
                    <RichInputField
                        preset="social"
                        isMultiline={true}
                        multilineRows={8}
                        length={FIELD_LIMITS.supportMessage.max}
                        value={fields.supportMessage}
                        placeholder="Describe the situation"
                        onChange={(event: any) =>
                            setFields({
                                ...fields,
                                supportMessage: event.target.value,
                            })
                        }
                        onFocus={() => handleFocus('supportMessage')}
                        error={errors?.supportMessage ?? null}
                    />
                </Field>
                <PrimaryButton type="submit" isLoading={isLoading}>
                    Send
                </PrimaryButton>
                <p className="support_page_note">
                    If you <Link href="/auth/login">log in</Link>, replies
                    will arrive on the site, and you will be able to write in the thread yourself.
                </p>
            </form>
        </div>
    );
};

export default Support;
