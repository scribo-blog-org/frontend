'use client';

import { useContext, useEffect, useState } from 'react';
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

const chatTitle = (item: any) =>
    item.kind === 'group'
        ? item.title || 'Group'
        : item.participant?.nick_name || 'User';

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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isCopying, setIsCopying] = useState<any>(false);
    const [isSharing, setIsSharing] = useState<any>(false);
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

    const handleCopy = async () => {
        if (isCopying) return;
        setIsCopying(true);
        try {
            await copyText(shareUrl);
            showToast?.({ message: 'Link copied', type: 'success' });
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

    const toggleChat = (id: string) =>
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );

    // Sends the link to every chosen chat, one after another, and reports the
    // outcome once. With a single chat the page goes to that chat, as before.
    const handleSend = async () => {
        if (!profile || isSending || !selectedIds.length) {
            return;
        }

        setIsSending(true);

        const sentTo: string[] = [];
        let lastMessage: string | undefined;

        try {
            for (const id of selectedIds) {
                const result: any = await sendMessage(id, { text: shareUrl });

                if (result?.status) {
                    sentTo.push(id);
                } else {
                    lastMessage = result?.message;
                }
            }
        } finally {
            setIsSending(false);
        }

        if (!sentTo.length) {
            showToast?.({ type: 'error', message: lastMessage || failLabel });
            return;
        }

        if (sentTo.length < selectedIds.length) {
            showToast?.({
                type: 'error',
                message: `Sent to ${sentTo.length} of ${selectedIds.length} chats`,
            });
        } else {
            showToast?.({
                type: 'success',
                message:
                    sentTo.length === 1
                        ? sentLabel
                        : `Sent to ${sentTo.length} chats`,
            });
        }

        requestCloseModal?.();

        if (selectedIds.length === 1) {
            navigate(`/messages/${sentTo[0]}`);
        }
    };

    const canSend = Boolean(profile) && chats.length > 0;

    return (
        <div className="share_post_modal">
            {onBack ? (
                <button
                    type="button"
                    className="share_post_modal_back app-transition"
                    disabled={isSending}
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
                        disabled={isSending}
                        isLoading={isCopying}
                        onClick={handleCopy}
                    >
                        <LinkIcon />
                        Copy
                    </PrimaryButton>
                </div>
            </div>

            <div className="share_post_modal_group">
                <p className="share_post_modal_label">Send to chat</p>

                {!profile ? (
                    <Panel>
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
                    </Panel>
                ) : isLoadingChats ? (
                    <div className="share_post_modal_loader">
                        <Loading size={24} />
                    </div>
                ) : chats.length ? (
                    // The only part of the dialog that scrolls.
                    <div className="share_post_modal_chats" role="group">
                        {chats.map((item: any) => {
                            const id = String(item._id);
                            const isGroup = item.kind === 'group';
                            const selected = selectedIds.includes(id);

                            return (
                                <button
                                    key={id}
                                    type="button"
                                    className={`share_post_modal_chat app-transition${
                                        selected
                                            ? ' share_post_modal_chat_active'
                                            : ''
                                    }`}
                                    aria-pressed={selected}
                                    disabled={isSending}
                                    onClick={() => toggleChat(id)}
                                >
                                    <span className="share_post_modal_chat_avatar">
                                        <img
                                            src={imageSrc(
                                                isGroup
                                                    ? item.photo
                                                    : item.participant?.avatar,
                                                DefaultProfileAvatar,
                                            )}
                                            alt=""
                                        />
                                        <span className="share_post_modal_chat_check">
                                            <CheckIcon />
                                        </span>
                                    </span>
                                    <span className="share_post_modal_chat_name">
                                        {chatTitle(item)}
                                    </span>
                                </button>
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
            </div>

            {canSend || nativeShareAvailable ? (
                <ModalFooter
                    hint={
                        nativeShareAvailable
                            ? 'Use the share menu of your device'
                            : undefined
                    }
                >
                    {nativeShareAvailable ? (
                        <ActionButton
                            isLoading={isSharing}
                            disabled={isSending}
                            onClick={handleNativeShare}
                        >
                            <ShareIcon />
                            Share via…
                        </ActionButton>
                    ) : null}
                    {canSend ? (
                        <PrimaryButton
                            isLoading={isSending}
                            disabled={!selectedIds.length}
                            onClick={handleSend}
                        >
                            {selectedIds.length > 1
                                ? `Send to ${selectedIds.length}`
                                : 'Send'}
                        </PrimaryButton>
                    ) : null}
                </ModalFooter>
            ) : null}
        </div>
    );
};

export default SharePostModal;
