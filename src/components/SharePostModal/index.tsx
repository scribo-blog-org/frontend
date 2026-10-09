'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getConversations, sendMessage } from '../../api/chat.api';
import Loading from '../Ui/Loading';
import { Banner, Panel, PanelRow } from '../Ui';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { absoluteUrl } from '../../seo/site';
import { imageSrc } from '../../utils/image';
import {
    canUseNativeShare,
    copyText,
    sharePostNative,
} from '../../utils/share';

import ArrowLeftIcon from '../../assets/svg/arrow-left.svg';
import LinkIcon from '../../assets/svg/link-icon.svg';
import CheckIcon from '../../assets/svg/tick.svg';
import ShareIcon from '../../assets/svg/share.svg';

import './SharePostModal.scss';

const SharePostModal = ({
    postId,
    postTitle,
    sharePath,
    linkLabel = 'Link to the post',
    excludeConversationId,
    sentLabel = 'Post sent to the chat',
    failLabel = 'Could not send the post',
    loginHint = 'Log in to send this post as a direct message.',
    showToast,
    requestCloseModal,
    onBack,
}: any) => {
    const { profile } = useContext(AppContext);
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState<any>(Boolean(profile));
    const [sendingId, setSendingId] = useState<any>(null);
    const [isCopying, setIsCopying] = useState<any>(false);
    const [isSharing, setIsSharing] = useState<any>(false);
    const [isCopied, setIsCopied] = useState<any>(false);
    const copiedTimer = useRef<any>(null);
    const shareUrl = absoluteUrl(sharePath || `/posts/${postId}`);
    const chats = conversations.filter(
        (item) => String(item._id) !== String(excludeConversationId || ''),
    );
    const nativeShareAvailable = canUseNativeShare();

    useEffect(() => {
        if (!profile) {
            setIsLoadingChats(false);
            return;
        }

        let cancelled = false;

        getConversations().then((result: any) => {
            if (cancelled) {
                return;
            }

            setConversations(result?.status ? result.data || [] : []);
            setIsLoadingChats(false);
        });

        return () => {
            cancelled = true;
        };
    }, [profile]);

    useEffect(() => () => clearTimeout(copiedTimer.current), []);

    const handleCopy = async () => {
        if (isCopying) return;
        setIsCopying(true);
        try {
            await copyText(shareUrl);
            showToast?.({ message: 'Link copied', type: 'success' });
            setIsCopied(true);
            clearTimeout(copiedTimer.current);
            copiedTimer.current = setTimeout(() => setIsCopied(false), 2000);
        } catch (error: any) {
            console.error(error);
            showToast?.({
                message: 'Could not copy the link',
                type: 'error',
            });
        } finally {
            setIsCopying(false);
        }
    };

    const handleNativeShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            await sharePostNative({ title: postTitle, url: shareUrl });
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                return;
            }

            console.error(error);
            showToast?.({
                message: 'Could not open the Share menu',
                type: 'error',
            });
        } finally {
            setIsSharing(false);
        }
    };

    const handleShareToChat = async (conversationId: any) => {
        if (!profile || sendingId) {
            return;
        }

        setSendingId(conversationId);

        let result: any;
        try {
            result = await sendMessage(conversationId, {
                text: shareUrl,
            });
        } finally {
            setSendingId(null);
        }

        if (!result?.status) {
            showToast?.({
                type: 'error',
                message: result?.message || failLabel,
            });
            return;
        }

        showToast?.({ type: 'success', message: sentLabel });
        requestCloseModal?.();
        navigate(`/messages/${conversationId}`);
    };

    return (
        <div className="share_post_modal">
            {onBack ? (
                <button
                    type="button"
                    className="share_post_modal_back app-transition"
                    disabled={Boolean(sendingId)}
                    onClick={onBack}
                >
                    <ArrowLeftIcon />
                    Back
                </button>
            ) : null}

            <Panel title={linkLabel}>
                <div className="panel_row share_post_modal_url">
                    <label
                        className="share_post_modal_sr"
                        htmlFor="share_post_modal_link"
                    >
                        {linkLabel}
                    </label>
                    <input
                        id="share_post_modal_link"
                        className="share_post_modal_link app-transition"
                        type="text"
                        readOnly
                        value={shareUrl}
                        onClick={(event: any) => event.target.select()}
                    />
                </div>
                <button
                    type="button"
                    className={`share_post_modal_copy app-transition${isCopied ? ' share_post_modal_copy_done' : ''}`}
                    disabled={isCopying || Boolean(sendingId)}
                    onClick={handleCopy}
                >
                    {isCopied ? <CheckIcon /> : <LinkIcon />}
                    {isCopied ? 'Copied' : 'Copy link'}
                </button>
            </Panel>

            <Panel title="Send to chat">
                {!profile ? (
                    <PanelRow
                        title="Log in to send"
                        description={loginHint}
                        trailing={
                            <span className="share_post_modal_action">
                                Log in
                            </span>
                        }
                        onClick={() => {
                            requestCloseModal?.();
                            navigate('/auth/login');
                        }}
                    />
                ) : isLoadingChats ? (
                    <div className="share_post_modal_loader panel_row">
                        <Loading size={24} />
                    </div>
                ) : chats.length ? (
                    <div className="share_post_modal_chats">
                        {chats.map((item: any) => {
                            const isGroup = item.kind === 'group';
                            const count =
                                item.member_count ?? item.members?.length;
                            const isSending = sendingId === item._id;

                            return (
                                <PanelRow
                                    key={item._id}
                                    className="share_post_modal_chat"
                                    disabled={Boolean(sendingId)}
                                    onClick={() => handleShareToChat(item._id)}
                                    icon={
                                        <img
                                            src={imageSrc(
                                                isGroup
                                                    ? item.photo
                                                    : item.participant?.avatar,
                                                DefaultProfileAvatar,
                                            )}
                                            alt=""
                                        />
                                    }
                                    title={
                                        isGroup
                                            ? item.title || 'Group'
                                            : item.participant?.nick_name
                                    }
                                    description={
                                        isGroup
                                            ? count
                                                ? `Group · ${count} members`
                                                : 'Group'
                                            : 'Direct message'
                                    }
                                    trailing={
                                        <span
                                            className={`share_post_modal_action${isSending ? ' share_post_modal_action_busy' : ''}`}
                                        >
                                            {isSending ? 'Sending…' : 'Send'}
                                        </span>
                                    }
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="share_post_modal_empty">
                        <Banner tone="info">
                            {conversations.length
                                ? 'No other chats to send this to.'
                                : 'No chats yet. Write to someone from their profile — the conversation will show up here.'}
                        </Banner>
                    </div>
                )}
            </Panel>

            {nativeShareAvailable ? (
                <Panel>
                    <PanelRow
                        icon={<ShareIcon />}
                        title="Share via…"
                        description="Use the share menu of your device"
                        disabled={isSharing || Boolean(sendingId)}
                        onClick={handleNativeShare}
                    />
                </Panel>
            ) : null}
        </div>
    );
};

export default SharePostModal;
