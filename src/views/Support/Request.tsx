'use client';

import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import {
    getPublicSupportRequest,
    replyPublicSupportRequest,
    updateSupportRequestStatus,
} from '../../api/support.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { SUPPORT_STATUSES, kindLabel, statusLabel } from './constants';
import { format_date_time } from '../../utils/format';

import Field from '../../components/Ui/Field/index';
import RichInputField from '../../components/RichInputField';
import RichText from '../../components/RichText';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';
import DropDown from '../../components/Ui/DropDown';
import Loading from '../../components/Ui/Loading';
import UserBadge from '../../components/UserBadge/index';

import ArrowLeftIcon from '../../assets/svg/arrow-left.svg';

import '../AdminPanel/Requests.scss';
import '../AdminPanel/RequestDetail.scss';

const canManageSupport = (profile: any) =>
    ['admin', 'tech_admin'].includes(profile?.role);

const SupportRequestPage = () => {
    const { key } = useParams();
    const navigate = useNavigate();
    const { profile, showToast } = useContext(AppContext);
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState<any>(true);
    const [reply, setReply] = useState<any>('');
    const [error, setError] = useState<any>(null);
    const [sending, setSending] = useState<any>(false);
    const [statusSaving, setStatusSaving] = useState<any>(false);

    const isStaff = canManageSupport(profile);
    const canReply = Boolean(item?.can_reply);
    const showStatus = item?.status != null;

    useEffect(() => {
        let cancelled = false;

        const fetchItem = async () => {
            const result = await getPublicSupportRequest(key);

            if (cancelled) {
                return;
            }

            if (!result.status) {
                showToast({ type: 'error', message: result.message });
                setItem(null);
                setLoading(false);
                return;
            }

            setItem(result.data);
            setLoading(false);
        };

        fetchItem();

        return () => {
            cancelled = true;
        };
    }, [key, showToast, profile?.role]);

    const handleReply = async () => {
        if (!reply.trim()) {
            setError('Write a message');
            return;
        }
        if (reply.length > FIELD_LIMITS.supportReply.max) {
            setError(
                `Message must be at most ${FIELD_LIMITS.supportReply.max} characters`,
            );
            return;
        }

        setSending(true);
        try {
            const result = await replyPublicSupportRequest(key, reply.trim());

            if (!result.status) {
                showToast({
                    type: 'error',
                    message: result.message || 'Could not send the message',
                });
                if (result?.errors?.body?.replyText?.message) {
                    setError(result.errors.body.replyText.message);
                }
                return;
            }

            setItem(result.data);
            setReply('');
            setError(null);
            showToast({
                type: 'success',
                message: isStaff ? 'Reply sent' : 'Message added',
            });
        } catch {
            showToast({
                type: 'error',
                message: 'Could not send the message',
            });
        } finally {
            setSending(false);
        }
    };

    const handleStatus = async (status: any) => {
        if (!item?._id || status === item.status || statusSaving) {
            return;
        }

        setStatusSaving(true);
        try {
            const result = await updateSupportRequestStatus(item._id, status);

            if (!result.status) {
                showToast({
                    type: 'error',
                    message: result.message || 'Could not update the status',
                });
                return;
            }

            setItem(result.data);
            showToast({ type: 'success', message: 'Status updated' });
        } catch {
            showToast({ type: 'error', message: 'Could not update the status' });
        } finally {
            setStatusSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="support_request_detail">
                <Loading size={40} />
            </div>
        );
    }

    if (!item) {
        navigate('/404');
    }

    return (
        <div className="support_request_detail">
            <div className="support_request_detail_card app-transition">
                <div className="support_request_detail_top">
                    <ActionButton
                        disabled={sending || statusSaving}
                        onClick={() =>
                            navigate(
                                isStaff
                                    ? '/admin-panel?tab=requests'
                                    : item.is_owner
                                      ? '/support/mine'
                                      : '/support',
                            )
                        }
                    >
                        <ArrowLeftIcon />
                        {isStaff ? 'To requests' : 'Support'}
                    </ActionButton>
                    <div className="support_request_detail_tags">
                        {showStatus ? (
                            <span
                                className={`support_status support_status_${item.status}`}
                            >
                                {statusLabel(item.status)}
                            </span>
                        ) : null}
                        <span className="support_kind">
                            {kindLabel(item.kind)}
                        </span>
                    </div>
                </div>
                {isStaff ? (
                    <p className="support_request_detail_email">{item.email}</p>
                ) : null}
                <p className="support_request_detail_date">
                    {format_date_time(item.created_date)}
                </p>
                <div className="support_request_detail_message">
                    <RichText text={item.message} />
                </div>
                {isStaff ? (
                    <Field title="Status">
                        <DropDown
                            options={SUPPORT_STATUSES}
                            value={item.status}
                            onChange={handleStatus}
                        />
                    </Field>
                ) : null}
            </div>

            <div className="support_request_detail_card app-transition">
                <h1 className="kicker">Conversation</h1>
                {item.replies?.length ? (
                    <div className="support_request_detail_replies">
                        {item.replies.map((entry: any) => (
                            <div
                                key={entry._id}
                                className={`support_request_detail_reply app-transition ${entry.author_type === 'requester' ? 'support_request_detail_reply_requester' : ''}`}
                            >
                                <div className="support_request_detail_reply_head">
                                    {entry.author_type === 'staff' &&
                                    entry.admin ? (
                                        <UserBadge data={entry.admin} />
                                    ) : (
                                        <p className="support_request_detail_reply_author">
                                            Request author
                                        </p>
                                    )}
                                    <p>
                                        {format_date_time(entry.created_date)}
                                    </p>
                                </div>
                                <RichText
                                    className="support_request_detail_reply_text"
                                    text={entry.text}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="support_request_detail_empty">
                        No replies yet
                    </p>
                )}
                {canReply ? (
                    <form
                        className="support_request_detail_form"
                        onSubmit={(event: any) => {
                            event.preventDefault();
                            handleReply();
                        }}
                    >
                        <Field
                            title={isStaff ? 'Reply' : 'Message'}
                            error={error}
                        >
                            <RichInputField
                                preset="social"
                                isMultiline={true}
                                multilineRows={6}
                                length={FIELD_LIMITS.supportReply.max}
                                value={reply}
                                placeholder={
                                    isStaff
                                        ? 'Reply text'
                                        : 'Add to the request'
                                }
                                onChange={(event: any) =>
                                    setReply(event.target.value)
                                }
                                onFocus={() => setError(null)}
                                error={error}
                            />
                        </Field>
                        <PrimaryButton
                            type="submit"
                            isLoading={sending}
                            disabled={statusSaving}
                        >
                            Send
                        </PrimaryButton>
                    </form>
                ) : (
                    <p className="support_request_detail_empty">
                        {item.closed
                            ? 'The request is reviewed and new replies are closed.'
                            : 'Only administrators can reply. To write in the thread, send a request from your account.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default SupportRequestPage;
