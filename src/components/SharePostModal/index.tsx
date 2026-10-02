'use client';

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getConversations, sendMessage } from '../../api/chat.api';
import ActionButton from '../Ui/ActionButton';
import PrimaryButton from '../Ui/PrimaryButton';
import Loading from '../Ui/Loading';
import UserBadge from '../UserBadge';
import { absoluteUrl } from '../../seo/site';
import {
    canUseNativeShare,
    copyText,
    sharePostNative,
} from '../../utils/share';

import RedirectIcon from '../../assets/svg/redirect.svg';

import './SharePostModal.scss';

const SharePostModal = ({
    postId,
    postTitle,
    showToast,
    requestCloseModal,
}: any) => {
    const { profile } = useContext(AppContext);
    const navigate = useNavigate();
    const [copied, setCopied] = useState<any>(false);
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState<any>(Boolean(profile));
    const [sendingId, setSendingId] = useState<any>(null);
    const shareUrl = absoluteUrl(`/posts/${postId}`);
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
                message: result?.message || 'Could not send the post',
            });
            return;
        }

        showToast?.({ type: 'success', message: 'Post sent to the chat' });
        requestCloseModal?.();
        navigate(`/messages/${conversationId}`);
    };

    return (
        <div className="share_post_modal">
            <div className="share_post_modal_group">
                <label
                    className="share_post_modal_label"
                    htmlFor="share_post_modal_link"
                >
                    Link to the post
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
                        {copied ? 'Copied' : 'Copy'}
                    </PrimaryButton>
                </div>
            </div>

            <div className="share_post_modal_group">
                <p className="share_post_modal_kicker">Send to chat</p>
                {!profile ? (
                    <>
                        <p className="share_post_modal_hint">
                            Log in to send this post as a direct message.
                        </p>
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
                ) : conversations.length ? (
                    <div className="share_post_modal_chats">
                        {conversations.map((item: any) => (
                            <button
                                key={item._id}
                                type="button"
                                className="share_post_modal_chat_item app-transition"
                                disabled={Boolean(sendingId)}
                                onClick={() => handleShareToChat(item._id)}
                            >
                                <UserBadge
                                    data={item.participant}
                                    asLink={false}
                                />
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
                        No chats yet. Write to someone from their profile — the
                        conversation will show up here.
                    </p>
                )}
            </div>

            {nativeShareAvailable ? (
                <ActionButton
                    type="button"
                    className="share_post_modal_native"
                    onClick={handleNativeShare}
                >
                    Share…
                </ActionButton>
            ) : null}
        </div>
    );
};

export default SharePostModal;
