'use client';

import { useContext, useEffect, useState } from 'react';
import { Navigate, useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import {
    createSupportRequest,
    getMySupportRequests,
} from '../../api/support.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { SUPPORT_KINDS, kindLabel, statusLabel, statusTone } from './constants';
import { format_back, format_date_time } from '../../utils/format';

import { Pill } from '../../components/Ui/Panel';
import Field from '../../components/Ui/Field/index';
import RichInputField from '../../components/RichInputField';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import Pagination from '../../components/Ui/Pagination';
import Loading from '../../components/Ui/Loading';
import Tooltip from '../../components/Ui/Tooltip';
import DropDown from '../../components/Ui/DropDown';

import './Support.scss';
import '../AdminPanel/Requests.scss';

const SupportMine = () => {
    const navigate = useNavigate();
    const { showToast, profile, profileLoading } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState<any>(false);
    const [fields, setFields] = useState<any>({
        supportKind: 'request',
        supportMessage: '',
    });
    const [errors, setErrors] = useState<any>({});
    const [items, setItems] = useState<any[]>([]);
    const [listLoading, setListLoading] = useState<any>(true);
    const [page, setPage] = useState<any>(1);
    const [pagesCount, setPagesCount] = useState<any>(0);

    useEffect(() => {
        let cancelled = false;

        const fetchMine = async () => {
            const result = await getMySupportRequests({ page, limit: 9 });

            if (cancelled) {
                return;
            }

            if (!result.status) {
                showToast({ type: 'error', message: result.message });
                setItems([]);
                setPagesCount(0);
                setListLoading(false);
                return;
            }

            setItems(result.data?.items || []);
            setPagesCount(result.data?.pagination?.pages || 0);
            setListLoading(false);
        };

        if (profile) {
            fetchMine();
        }

        return () => {
            cancelled = true;
        };
    }, [page, profile, showToast]);

    const handleFocus = (fieldName: any) => {
        const next = { ...errors };
        delete next[fieldName];
        setErrors(next);
    };

    const validate = () => {
        const next: any = {};

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
                supportKind: fields.supportKind,
                supportMessage: fields.supportMessage.trim(),
            });

            if (result.status === true && result.data?.access_key) {
                showToast({ message: 'Message sent', type: 'success' });
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

    if (profileLoading) {
        return <Loading size={40} />;
    }

    if (!profile) {
        return <Navigate href="/auth/login" replace />;
    }

    return (
        <div className="support_page support_page_mine">
            <div className="support_page_intro">
                <h1>Support</h1>
                <p>
                    Requests from your account. Replies and statuses arrive in
                    notifications on the site.
                </p>
            </div>
            <form
                className="form_input app-transition"
                onSubmit={(event: any) => {
                    event.preventDefault();
                    handleSubmit();
                }}
            >
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
                        multilineRows={6}
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
            </form>

            <div className="support_page_list">
                <h1 className="kicker">History</h1>
                {listLoading ? (
                    <Loading size={40} />
                ) : (
                    <Pagination
                        content={items}
                        page={page - 1}
                        pagesCount={pagesCount}
                        onPageChange={(index: any) => setPage(index + 1)}
                    >
                        {(visibleContent: any) =>
                            visibleContent.length ? (
                                visibleContent.map((item: any) => (
                                    <button
                                        type="button"
                                        key={item._id}
                                        className="admin_panel_content_requests_page_item app-transition"
                                        onClick={() =>
                                            navigate(
                                                `/support/${item.access_key}`,
                                            )
                                        }
                                    >
                                        <div className="admin_panel_content_requests_page_item_meta">
                                            <Pill
                                                tone={statusTone(item.status)}
                                            >
                                                {statusLabel(item.status)}
                                            </Pill>
                                            <Pill>{kindLabel(item.kind)}</Pill>
                                        </div>
                                        <p className="admin_panel_content_requests_page_item_preview">
                                            {item.message_preview}
                                        </p>
                                        <Tooltip
                                            text={format_date_time(
                                                item.created_date,
                                            )}
                                        >
                                            <p className="admin_panel_content_requests_page_item_time">
                                                {format_back(item.created_date)}
                                            </p>
                                        </Tooltip>
                                    </button>
                                ))
                            ) : (
                                <p className="admin_panel_content_requests_page_empty">
                                    No requests yet
                                </p>
                            )
                        }
                    </Pagination>
                )}
            </div>
        </div>
    );
};

export default SupportMine;
