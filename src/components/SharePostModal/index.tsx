'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getConversations, sendMessage } from '../../api/chat.api';
import Loading from '../Ui/Loading';
import {
    ActionButton,
    Banner,
    InputField,
    ModalFooter,
    Panel,
    PanelRow,
    PrimaryButton,
} from '../Ui';
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

            <div className="share_post_modal_group">
                <label
                    className="share_post_modal_label"
                    htmlFor="share_post_modal_link"
                >
                    {linkLabel}
                </label>
                <div className="share_post_modal_link_row">
                    <InputField
                        id="share_post_modal_link"
                        className="share_post_modal_link"
                        type="text"
                        readOnly
                        length={1000}
                        value={shareUrl}
                        onClick={(event: any) => event.target.select()}
                    />
                    <PrimaryButton
                        className="share_post_modal_copy"
                        disabled={Boolean(sendingId)}
                        isLoading={isCopying}
                        onClick={handleCopy}
                    >
                        {isCopied ? <CheckIcon /> : <LinkIcon />}
                        {isCopied ? 'Copied' : 'Copy'}
                    </PrimaryButton>
                </div>
            </div>

            <Panel title="Send to chat">
                {!profile ? (
                    <PanelRow
                        title="Log in to send"
                        description={loginHint}
                        trailing={
                            <ActionButton
                                size="sm"
                                onClick={() => {
                                    requestCloseModal?.();
                                    navigate('/auth/login');
                                }}
                            >
                                Log in
                            </ActionButton>
                        }
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
                                        <ActionButton
                                            size="sm"
                                            isLoading={isSending}
                                            disabled={Boolean(sendingId)}
                                            onClick={() =>
                                                handleShareToChat(item._id)
                                            }
                                        >
                                            Send
                                        </ActionButton>
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
                <ModalFooter hint="Use the share menu of your device">
                    <ActionButton
                        isLoading={isSharing}
                        disabled={Boolean(sendingId)}
                        onClick={handleNativeShare}
                    >
                        <ShareIcon />
                        Share via…
                    </ActionButton>
                </ModalFooter>
            ) : null}
        </div>
    );
};

export default SharePostModal;
