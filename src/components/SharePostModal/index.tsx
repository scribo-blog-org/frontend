'use client';

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getConversations, sendMessage } from '../../api/chat.api';
import ActionButton from '../Ui/ActionButton';
import PrimaryButton from '../Ui/PrimaryButton';
import Loading from '../Ui/Loading';
import UserBadge from '../UserBadge';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { absoluteUrl } from '../../seo/site';
import { imageSrc } from '../../utils/image';
import {
    canUseNativeShare,
    copyText,
    sharePostNative,
} from '../../utils/share';

import ArrowLeftIcon from '../../assets/svg/arrow-left.svg';
import RedirectIcon from '../../assets/svg/redirect.svg';
import CopyIcon from '../../assets/svg/copy.svg';
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
    const [copied, setCopied] = useState<any>(false);
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState<any>(Boolean(profile));
    const [sendingId, setSendingId] = useState<any>(null);
    const shareUrl = absoluteUrl(sharePath || `/posts/${postId}`);
    const chats = conversations.filter(
        (item) => String(item._id) !== String(excludeConversationId || ''),
    );
    const nativeShareAvailable = canUseNativeShare();

    useEffect(() => {
        const field = document.getElementById('share_post_modal_link');
        if (!field) {
            return;
        }

        const input = field as HTMLInputElement;
        input.focus();
        input.select();
    }, [shareUrl]);

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
        try {
            await copyText(shareUrl);
            setCopied(true);
            showToast?.({ message: 'Link copied', type: 'success' });
            window.setTimeout(() => setCopied(false), 2000);
        } catch (error: any) {
            console.error(error);
            showToast?.({
                message: 'Could not copy the link',
                type: 'error',
            });
        }
    };

    const handleNativeShare = async () => {
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
        }
    };

    const handleShareToChat = async (conversationId: any) => {
        if (!profile || sendingId) {
            return;
        }

        setSendingId(conversationId);

        const result = await sendMessage(conversationId, {
            text: shareUrl,
        });

        setSendingId(null);

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
                    className="share_post_modal_back app-transition app-transition-color"
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
                    <input
                        id="share_post_modal_link"
                        className="share_post_modal_link input_field app-transition"
                        type="text"
                        readOnly
                        value={shareUrl}
                        onFocus={(event: any) => event.target.select()}
                        onClick={(event: any) => event.target.select()}
                    />
                    <PrimaryButton type="button" onClick={handleCopy}>
                        <CopyIcon />
                        {copied ? 'Copied' : 'Copy'}
                    </PrimaryButton>
                </div>
            </div>

            <div className="share_post_modal_group">
                <p className="share_post_modal_kicker">Send to chat</p>
                {!profile ? (
                    <>
                        <p className="share_post_modal_hint">{loginHint}</p>
                        <PrimaryButton
                            type="button"
                            className="share_post_modal_login"
                            onClick={() => {
                                requestCloseModal?.();
                                navigate('/auth/login');
                            }}
                        >
                            <RedirectIcon />
                            Log in
                        </PrimaryButton>
                    </>
                ) : isLoadingChats ? (
                    <div className="share_post_modal_loader">
                        <Loading size={24} />
                    </div>
                ) : chats.length ? (
                    <div className="share_post_modal_chats">
                        {chats.map((item: any) => (
                            <button
                                key={item._id}
                                type="button"
                                className="share_post_modal_chat_item app-transition"
                                disabled={Boolean(sendingId)}
                                onClick={() => handleShareToChat(item._id)}
                            >
                                {item.kind === 'group' ? (
                                    <span className="share_post_modal_chat_face">
                                        <img
                                            src={imageSrc(
                                                item.photo,
                                                DefaultProfileAvatar,
                                            )}
                                            alt=""
                                        />
                                        <span>{item.title || 'Group'}</span>
                                    </span>
                                ) : (
                                    <UserBadge
                                        data={item.participant}
                                        asLink={false}
                                    />
                                )}
                                {sendingId === item._id ? (
                                    <span className="share_post_modal_chat_status">
                                        Sending…
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="share_post_modal_hint">
                        {conversations.length
                            ? 'No other chats to send this to.'
                            : 'No chats yet. Write to someone from their profile — the conversation will show up here.'}
                    </p>
                )}
            </div>

            {nativeShareAvailable ? (
                <ActionButton
                    type="button"
                    className="share_post_modal_native"
                    onClick={handleNativeShare}
                >
                    <ShareIcon />
                    Share
                </ActionButton>
            ) : null}
        </div>
    );
};

export default SharePostModal;
