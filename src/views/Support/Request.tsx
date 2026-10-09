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
import Tooltip from '../../components/Ui/Tooltip';
import RelativeTime from '../../components/RelativeTime';
import Loading from '../../components/Ui/Loading';
import UserBadge from '../../components/UserBadge/index';

import ArrowLeftIcon from '../../assets/svg/arrow-left.svg';

import '../AdminPanel/Requests.scss';
import '../AdminPanel/RequestDetail.scss';

const canManageSupport = (profile: any) =>
    ['admin', 'tech_admin'].includes(profile?.role);

const StatusBadge = ({ status }: any) => (
    <span className={`support_status support_status_${status}`}>
        {statusLabel(status)}
    </span>
);

const EntryTime = ({ date }: any) => (
    <Tooltip text={format_date_time(date)}>
        <span className="support_request_detail_time">
            <RelativeTime date={date} intervalMs={30000} />
        </span>
    </Tooltip>
);

// A signed-in requester shows as a user badge; a guest shows as the email,
// which only staff receive from the API.
const RequesterName = ({ item, showEmail }: any) => {
    if (item.requester) {
        return <UserBadge data={item.requester} />;
    }

    return (
        <span className="support_request_detail_author">
            {showEmail && item.email ? item.email : 'Request author'}
        </span>
    );
};

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
        if (sending) {
            return;
        }
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

        // Show the new status right away; the server response replaces it, and
        // a failure restores the previous one.
        const previous = item;
        setItem({ ...item, status });
        setStatusSaving(true);
        try {
            const result = await updateSupportRequestStatus(item._id, status);

            if (!result.status) {
                setItem(previous);
                showToast({
                    type: 'error',
                    message: result.message || 'Could not update the status',
                });
                return;
            }

            setItem(result.data);
            showToast({ type: 'success', message: 'Status updated' });
        } catch {
            setItem(previous);
            showToast({
                type: 'error',
                message: 'Could not update the status',
            });
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

    const requesterName = <RequesterName item={item} showEmail={isStaff} />;

    return (
        <div className="support_request_detail">
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
                    Support
                </ActionButton>
                <div className="support_request_detail_tags">
                    <span className="support_kind">{kindLabel(item.kind)}</span>
                    {showStatus && isStaff ? (
                        <DropDown
                            className="support_request_detail_status"
                            options={SUPPORT_STATUSES}
                            value={item.status}
                            onChange={handleStatus}
                            disabled={sending || statusSaving}
                            renderOption={(option: any) => (
                                <StatusBadge status={option.value} />
                            )}
                        />
                    ) : showStatus ? (
                        <StatusBadge status={item.status} />
                    ) : null}
                </div>
            </div>

            <div className="support_request_detail_thread">
                <div className="support_request_detail_entry">
                    <div className="support_request_detail_entry_head">
                        {requesterName}
                        <EntryTime date={item.created_date} />
                    </div>
                    <RichText
                        className="support_request_detail_entry_text"
                        text={item.message}
                    />
                </div>
                {item.replies?.map((entry: any) => (
                    <div
                        key={entry._id}
                        className="support_request_detail_entry"
                    >
                        <div className="support_request_detail_entry_head">
                            {entry.author_type === 'staff' && entry.admin ? (
                                <UserBadge data={entry.admin} />
                            ) : entry.author_type === 'staff' ? (
                                <span className="support_request_detail_author">
                                    Scribo team
                                </span>
                            ) : (
                                requesterName
                            )}
                            <EntryTime date={entry.created_date} />
                        </div>
                        <RichText
                            className="support_request_detail_entry_text"
                            text={entry.text}
                        />
                    </div>
                ))}
            </div>

            {canReply ? (
                <form
                    className="support_request_detail_form"
                    onSubmit={(event: any) => {
                        event.preventDefault();
                        handleReply();
                    }}
                >
                    <Field title={isStaff ? 'Reply' : 'Message'} error={error}>
                        <RichInputField
                            preset="plain"
                            isMultiline={true}
                            multilineRows={5}
                            length={FIELD_LIMITS.supportReply.max}
                            value={reply}
                            placeholder={
                                isStaff ? 'Reply text' : 'Add to the request'
                            }
                            onChange={(event: any) =>
                                setReply(event.target.value)
                            }
                            onFocus={() => setError(null)}
                            error={error}
                            disabled={sending}
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
    );
};

export default SupportRequestPage;
