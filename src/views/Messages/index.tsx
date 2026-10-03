'use client';

import {
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Link, useNavigate, useParams } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import {
    createConversation,
    deleteConversation,
    deleteMessage,
    deleteMessages,
    editMessage,
    getConversation,
    getConversations,
    getMessages,
    markConversationRead,
    sendMessage,
} from '../../api/chat.api';
import { socketEvents } from '../../sockets/socket.events';
import { socketService } from '../../sockets/socket.service';
import {
    format_date_time,
    format_message_date_label,
    format_time,
    is_same_calendar_day,
} from '../../utils/format';
import UserBadge from '../../components/UserBadge';
import UserActivityStatus from '../../components/UserActivityStatus';
import {
    loadOnlineStatusForUsers,
    subscribePresenceChanges,
} from '../../sockets/presence';
import {
    loadTyping,
    notifyTyping,
    notifyTypingStop,
} from '../../sockets/typing';
import MessageStatus from '../../components/MessageStatus';
import ActionButton from '../../components/Ui/ActionButton';
import DangerButton from '../../components/Ui/DangerButton';
import Popup from '../../components/Ui/Popup';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import RichInputField from '../../components/RichInputField';
import MessageContent from '../../components/MessageContent';
import Loading from '../../components/Ui/Loading';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { messagePreviewText, quotePreviewText } from '../../utils/chatMessage';

import CopyIcon from '../../assets/svg/copy.svg';
import ReplyIcon from '../../assets/svg/reply.svg';
import DeleteIcon from '../../assets/svg/delete.svg';
import EditIcon from '../../assets/svg/edit.svg';
import CrossIcon from '../../assets/svg/cross-icon.svg';
import ArrowLeftIcon from '../../assets/svg/arrow-left.svg';
import SendIcon from '../../assets/svg/send.svg';
import ThreeDotsIcon from '../../assets/svg/three-dots.svg';
import TickIcon from '../../assets/svg/tick.svg';
import TickCircleIcon from '../../assets/svg/tick-circle.svg';
import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import NewMessageIllustration from '../../assets/svg/illustrations/new-message.svg';

import MessageContextMenu from './MessageContextMenu';
import { getMessageActions } from './messageActions';
import './Messages.scss';

const COMPOSER_LINE_HEIGHT = 20;
const COMPOSER_PAD_Y = 10;
const COMPOSER_MAX_LINES = 5;
const COMPOSER_MAX_HEIGHT =
    COMPOSER_LINE_HEIGHT * COMPOSER_MAX_LINES + COMPOSER_PAD_Y * 2;

const getQuoteContent = (preview: any) => {
    const deleted = Boolean(preview?.deleted || preview?.deleted_at);

    return {
        deleted,
        author: preview?.sender?.nick_name || 'User',
        text: deleted ? 'Message deleted' : quotePreviewText(preview),
    };
};

const resolveReplyQuote = (message: any, messageById: any) => {
    const parentId = message.reply_to || message.reply_preview?._id;
    if (!parentId) {
        return null;
    }

    const parent = messageById.get(String(parentId));
    const source = parent || message.reply_preview;

    if (!source) {
        return null;
    }

    return getQuoteContent(
        parent
            ? {
                  _id: parent._id,
                  text: parent.text,
                  deleted_at: parent.deleted_at,
                  sender: parent.sender,
              }
            : source,
    );
};

const normalizeIncomingMessage = (message: any, userId: any) => ({
    ...message,
    is_own: String(message.sender?._id) === String(userId),
});

const mergeMessage = (list: any, message: any) => {
    const index = list.findIndex((item: any) => item._id === message._id);

    if (index === -1) {
        return [...list, message];
    }

    const next = [...list];
    next[index] = { ...next[index], ...message };
    return next;
};

const mergeIncomingMessage = (list: any, message: any, profileId: any) => {
    if (String(message.sender?._id) === String(profileId)) {
        const pendingIndex = list.findIndex(
            (item: any) =>
                typeof item._id === 'string' &&
                item._id.startsWith('pending-') &&
                item.status === 'sending' &&
                item.text === message.text &&
                String(item.reply_to || '') === String(message.reply_to || ''),
        );

        if (pendingIndex !== -1) {
            const pending = list[pendingIndex];
            const next = [...list];
            next[pendingIndex] = {
                ...message,
                local_key: pending.local_key || pending._id,
            };

            return mergeMessage(next, message);
        }
    }

    return mergeMessage(list, message);
};

const sortConversations = (list: any) =>
    [...list].sort((a: any, b: any) => {
        const aTime = a.last_message_at
            ? new Date(a.last_message_at).getTime()
            : 0;
        const bTime = b.last_message_at
            ? new Date(b.last_message_at).getTime()
            : 0;
        return bTime - aTime;
    });

const buildMessageDayGroups = (list: any) => {
    const groups: any[] = [];
    let current: any = null;

    list.forEach((message: any, index: any) => {
        const previous = list[index - 1];

        if (
            !previous ||
            !is_same_calendar_day(previous.created_at, message.created_at)
        ) {
            current = {
                key: `day-${message.created_at}-${index}`,
                label: format_message_date_label(message.created_at),
                messages: [],
            };
            groups.push(current);
        }

        current.messages.push(message);
    });

    return groups;
};

const upsertConversationInList = (list: any, conversation: any) => {
    const index = list.findIndex((item: any) => item._id === conversation._id);
    let next: any;

    if (index === -1) {
        next = [conversation, ...list];
    } else {
        next = [...list];
        next[index] = { ...next[index], ...conversation };
    }

    return sortConversations(next);
};

const DeleteChatModalActions = ({
    conversationId,
    profile,
    requestCloseModal,
    showToast,
    onDeleted,
    disabled,
}: any) => {
    const [isDeleting, setIsDeleting] = useState<any>(false);

    const handleDelete = async () => {
        if (!conversationId || isDeleting || disabled) {
            return;
        }

        setIsDeleting(true);

        try {
            const result = await deleteConversation(conversationId);

            if (!result?.status) {
                showToast?.({
                    type: 'error',
                    message: result?.message || 'Could not delete the chat',
                });
                return;
            }

            socketEvents.unsubscribeConversation(profile._id, conversationId);
            onDeleted(conversationId);
            showToast?.({
                type: 'success',
                message: 'Chat deleted',
            });
            requestCloseModal();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="modal_delete_post_content_bottom">
            <ActionButton
                type="button"
                disabled={isDeleting}
                onClick={requestCloseModal}
                className="modal_delete_post_content_button"
            >
                Cancel
            </ActionButton>
            <DangerButton
                type="button"
                isActive
                isLoading={isDeleting}
                disabled={disabled || isDeleting}
                onClick={handleDelete}
                className="modal_delete_post_content_button"
            >
                Delete
            </DangerButton>
        </div>
    );
};

const JUMP_MOTION_MS = 320;

function JumpToLatestButton({ visible, onClick }: any) {
    const [present, setPresent] = useState(visible);
    const [shown, setShown] = useState(false);

    if (visible && !present) {
        setPresent(true);
    }

    useEffect(() => {
        if (!visible) {
            setShown(false);
            const timeout = window.setTimeout(
                () => setPresent(false),
                JUMP_MOTION_MS,
            );
            return () => window.clearTimeout(timeout);
        }

        const frame = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(frame);
    }, [visible]);

    if (!present) {
        return null;
    }

    return (
        <button
            type="button"
            className={`messages_jump${shown ? ' messages_jump_visible' : ''}`}
            onClick={onClick}
            aria-label="Scroll to latest messages"
            tabIndex={shown ? 0 : -1}
        >
            <ChevronDownIcon />
        </button>
    );
}

const getDeleteChatModalContent = ({
    participant,
    conversationId,
    profile,
    requestCloseModal,
    showToast,
    onDeleted,
    disabled,
}: any) => (
    <div className="messages_delete_modal">
        <p className="messages_delete_modal_text">
            Conversation with {participant?.nick_name || 'user'} and all
            messages will be deleted permanently. This cannot be undone.
        </p>
        <DeleteChatModalActions
            conversationId={conversationId}
            profile={profile}
            requestCloseModal={requestCloseModal}
            showToast={showToast}
            onDeleted={onDeleted}
            disabled={disabled}
        />
    </div>
);

const MessagesPage = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { profile, showToast, showModalWindow, requestCloseModal } =
        useContext(AppContext);

    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [draft, setDraft] = useState<any>('');
    const [replyTo, setReplyTo] = useState<any>(null);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [isListLoading, setIsListLoading] = useState<any>(true);
    const [isChatLoading, setIsChatLoading] = useState<any>(false);
    const [isSending, setIsSending] = useState<any>(false);
    const [messageMenu, setMessageMenu] = useState<any>(null);
    const [onlineByUserId, setOnlineByUserId] = useState<any>({});
    const [typingByConversationId, setTypingByConversationId] = useState<any>(
        {},
    );
    const [leavingHeights, setLeavingHeights] = useState<any>({});
    const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);
    const [selectionIds, setSelectionIds] = useState<any>(null);
    const [isDeletingSelection, setIsDeletingSelection] = useState(false);
    const [messageMotion, setMessageMotion] = useState<
        Record<string, 'from' | 'to'>
    >({});

    const listRef = useRef<any>(null);
    const composerDockRef = useRef<any>(null);
    const composerInputRef = useRef<any>(null);
    const stickToBottomRef = useRef(true);
    const jumpingToBottomRef = useRef(false);
    const jumpScrollEndRef = useRef<any>(null);
    const ignoreScrollRef = useRef(false);
    const settlingScrollRef = useRef(true);
    const userScrollingRef = useRef(false);
    const userBrokeHoldRef = useRef(false);
    const touchingListRef = useRef(false);
    const userGestureRef = useRef(false);
    const userMovedListRef = useRef(false);
    const pendingBottomScrollRef = useRef(false);
    const gestureStartTopRef = useRef(0);
    const gestureEndTimerRef = useRef<any>(null);
    const messagesConversationIdRef = useRef<any>(null);
    const seenConversationIdRef = useRef<any>(conversationId);
    const leavingIdsRef = useRef<any>(new Set());
    const deletedMessageIdsRef = useRef<any>(new Set());
    const settledMessageIdsRef = useRef<any>(null);
    const smoothEnterScrollRef = useRef(false);
    const beginMessageLeaveRef = useRef<any>(() => {});
    const lastReplyGestureRef = useRef(0);
    const sendLockRef = useRef(false);
    const typingConversationRef = useRef<any>(null);
    const longPressRef = useRef<any>(null);
    const suppressMessageClickRef = useRef(false);
    const enterFollowRef = useRef(false);
    const pendingScrollAnchorRef = useRef<any>(null);
    const restoringScrollRef = useRef(false);

    const captureListAnchor = useCallback(() => {
        const el = listRef.current;
        if (!el) {
            return;
        }

        userBrokeHoldRef.current = false;

        const listTop = el.getBoundingClientRect().top;
        let anchor = null;

        for (const node of el.querySelectorAll('article[id^="message_"]')) {
            const rect = node.getBoundingClientRect();
            if (rect.bottom > listTop + 1) {
                anchor = {
                    id: node.id,
                    offset: rect.top - listTop,
                };
                break;
            }
        }

        pendingScrollAnchorRef.current = {
            stick: stickToBottomRef.current,
            scrollTop: el.scrollTop,
            anchor,
        };
    }, []);

    const forceBottomUntilRef = useRef(0);

    const scrollMessagesToBottom = useCallback(() => {
        const el = listRef.current;
        if (!el || jumpingToBottomRef.current) {
            return;
        }

        const forcing = Date.now() < forceBottomUntilRef.current;

        if (userGestureRef.current && !forcing) {
            if (!userMovedListRef.current) {
                pendingBottomScrollRef.current = true;
            }
            return;
        }

        pendingBottomScrollRef.current = false;
        ignoreScrollRef.current = true;
        el.scrollTop = el.scrollHeight;
        ignoreScrollRef.current = false;
    }, []);

    const pinMessagesToBottom = useCallback(() => {
        stickToBottomRef.current = true;
        userGestureRef.current = false;
        userMovedListRef.current = false;
        userScrollingRef.current = false;
        pendingBottomScrollRef.current = false;
        forceBottomUntilRef.current = Date.now() + 500;
        scrollMessagesToBottom();
        requestAnimationFrame(() => {
            scrollMessagesToBottom();
            requestAnimationFrame(scrollMessagesToBottom);
        });
        window.setTimeout(scrollMessagesToBottom, 50);
        window.setTimeout(scrollMessagesToBottom, 180);
        window.setTimeout(scrollMessagesToBottom, 400);
    }, [scrollMessagesToBottom]);

    const scrollIfPinned = useCallback(() => {
        if (!stickToBottomRef.current) {
            return;
        }

        requestAnimationFrame(() => {
            scrollMessagesToBottom();
            requestAnimationFrame(scrollMessagesToBottom);
        });
    }, [scrollMessagesToBottom]);

    useLayoutEffect(() => {
        const dock = composerDockRef.current;
        const chat = dock?.parentElement;

        if (!dock || !chat) {
            return;
        }

        const applySpace = () => {
            const marginBottom =
                parseFloat(getComputedStyle(dock).marginBottom) || 0;
            const space = Math.ceil(
                dock.getBoundingClientRect().height + marginBottom,
            );
            chat.style.setProperty('--messages-composer-space', `${space}px`);

            if (stickToBottomRef.current && !userGestureRef.current) {
                scrollMessagesToBottom();
            }
        };

        applySpace();

        const observer = new ResizeObserver(applySpace);
        observer.observe(dock);

        return () => {
            observer.disconnect();
            chat.style.removeProperty('--messages-composer-space');
        };
    }, [conversationId, scrollMessagesToBottom]);

    const clearJumpScrollEnd = () => {
        const el = listRef.current;
        if (el && jumpScrollEndRef.current) {
            el.removeEventListener('scrollend', jumpScrollEndRef.current);
        }
        jumpScrollEndRef.current = null;
    };

    const finishUserGesture = () => {
        window.clearTimeout(gestureEndTimerRef.current);
        gestureEndTimerRef.current = null;
        const moved = userMovedListRef.current;
        userGestureRef.current = false;
        userScrollingRef.current = false;
        userMovedListRef.current = false;

        const el = listRef.current;
        if (!el) {
            pendingBottomScrollRef.current = false;
            return;
        }

        if (!moved && pendingBottomScrollRef.current) {
            pendingBottomScrollRef.current = false;
            stickToBottomRef.current = true;
            scrollMessagesToBottom();
            setIsAwayFromBottom(false);
            return;
        }

        pendingBottomScrollRef.current = false;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        const atBottom = distance <= 2;
        stickToBottomRef.current = atBottom;
        setIsAwayFromBottom(distance >= 80);
    };

    const armGestureEnd = () => {
        window.clearTimeout(gestureEndTimerRef.current);
        gestureEndTimerRef.current = window.setTimeout(finishUserGesture, 160);
    };

    const beginUserGesture = () => {
        const el = listRef.current;
        window.clearTimeout(gestureEndTimerRef.current);
        userGestureRef.current = true;
        userScrollingRef.current = true;
        userBrokeHoldRef.current = true;
        settlingScrollRef.current = false;
        if (el) {
            gestureStartTopRef.current = el.scrollTop;
        }
    };

    const handleListScroll = () => {
        if (
            restoringScrollRef.current ||
            ignoreScrollRef.current ||
            isChatLoading ||
            messagesConversationIdRef.current !== conversationId
        ) {
            return;
        }

        const el = listRef.current;
        if (!el) {
            return;
        }

        if (Date.now() < forceBottomUntilRef.current) {
            stickToBottomRef.current = true;
            if (el.scrollHeight - el.scrollTop - el.clientHeight > 1) {
                scrollMessagesToBottom();
            }
            setIsAwayFromBottom(false);
            return;
        }

        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        const away = distance >= 80;
        const fromUser = userGestureRef.current || userScrollingRef.current;
        userScrollingRef.current = false;

        if (fromUser) {
            settlingScrollRef.current = false;
            if (el.scrollTop < gestureStartTopRef.current - 8) {
                stickToBottomRef.current = false;
                userMovedListRef.current = true;
                pendingBottomScrollRef.current = false;
            }
            if (distance <= 2) {
                stickToBottomRef.current = true;
                userMovedListRef.current = false;
                gestureStartTopRef.current = el.scrollTop;
            }
            if (jumpingToBottomRef.current) {
                jumpingToBottomRef.current = false;
                clearJumpScrollEnd();
            }
            setIsAwayFromBottom((current: any) =>
                current === away ? current : away,
            );
            if (!touchingListRef.current) {
                armGestureEnd();
            }
            return;
        }

        if (settlingScrollRef.current) {
            return;
        }

        if (jumpingToBottomRef.current) {
            if (fromUser) {
                jumpingToBottomRef.current = false;
                clearJumpScrollEnd();
                stickToBottomRef.current = !away;
                setIsAwayFromBottom((current: any) =>
                    current === away ? current : away,
                );
                return;
            }

            if (distance <= 1) {
                jumpingToBottomRef.current = false;
                stickToBottomRef.current = true;
            }

            setIsAwayFromBottom((current: any) => (current ? false : current));
            return;
        }

        if (stickToBottomRef.current && !fromUser) {
            if (away) {
                scrollMessagesToBottom();
            }
            setIsAwayFromBottom(false);
            return;
        }

        stickToBottomRef.current = !away;
        setIsAwayFromBottom((current: any) =>
            current === away ? current : away,
        );
    };

    const jumpToBottom = () => {
        const el = listRef.current;
        clearJumpScrollEnd();
        jumpingToBottomRef.current = true;
        stickToBottomRef.current = true;
        setIsAwayFromBottom(false);

        if (!el) {
            jumpingToBottomRef.current = false;
            return;
        }

        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (distance <= 1 || reduceMotion) {
            jumpingToBottomRef.current = false;
            scrollMessagesToBottom();
            return;
        }

        let passes = 0;
        const onScrollEnd = () => {
            const node = listRef.current;
            if (!node || !jumpingToBottomRef.current) {
                clearJumpScrollEnd();
                return;
            }

            const left = node.scrollHeight - node.scrollTop - node.clientHeight;
            if (left > 1 && passes < 4) {
                passes += 1;
                node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
                return;
            }

            jumpingToBottomRef.current = false;
            stickToBottomRef.current = true;
            clearJumpScrollEnd();

            if (left > 1) {
                ignoreScrollRef.current = true;
                node.scrollTop = node.scrollHeight;
                ignoreScrollRef.current = false;
            }
        };

        jumpScrollEndRef.current = onScrollEnd;
        el.addEventListener('scrollend', onScrollEnd);
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    };

    const upsertMessage = useCallback(
        (message: any) => {
            if (!profile) {
                return;
            }

            const normalized = normalizeIncomingMessage(message, profile._id);
            setMessages((current: any) => {
                if (deletedMessageIdsRef.current.has(String(normalized._id))) {
                    return current.filter(
                        (item: any) =>
                            String(item._id) !== String(normalized._id),
                    );
                }

                return mergeMessage(current, normalized);
            });
        },
        [profile],
    );

    const clearConversationUnread = useCallback((id: any) => {
        setConversations((current: any) =>
            current.map((item: any) =>
                item._id === id ? { ...item, unread: 0 } : item,
            ),
        );
    }, []);

    const removeConversationFromState = useCallback(
        (id: any) => {
            setConversations((current: any) =>
                current.filter((item: any) => item._id !== id),
            );

            if (String(conversationId) === String(id)) {
                setActiveConversation(null);
                setMessages([]);
                setDraft('');
                setReplyTo(null);
                setEditingMessage(null);
                navigate('/messages');
            }
        },
        [conversationId, navigate],
    );

    const markChatAsRead = useCallback(
        async (id: any) => {
            const result = await markConversationRead(id);
            if (result?.status) {
                clearConversationUnread(id);
            }
            return result;
        },
        [clearConversationUnread],
    );

    const loadConversations = useCallback(
        async (silent: any = false) => {
            if (!silent) {
                setIsListLoading(true);
            }

            const result = await getConversations();
            if (result?.status) {
                setConversations(result.data || []);
            } else if (!silent) {
                showToast?.({
                    type: 'error',
                    message: result?.message || 'Could not load conversations',
                });
            }

            if (!silent) {
                setIsListLoading(false);
            }
        },
        [showToast],
    );

    useEffect(() => {
        if (!profile?._id) {
            return;
        }

        loadConversations();
    }, [profile?._id, loadConversations]);

    useEffect(() => {
        if (!profile?._id) {
            return;
        }

        const unsubscribe = socketService.on(
            'chat:conversation',
            (conversation: any) => {
                setConversations((current: any) =>
                    upsertConversationInList(current, conversation),
                );
            },
        );

        return unsubscribe;
    }, [profile?._id]);

    useEffect(() => {
        if (!profile) {
            return;
        }

        const unsubscribe = socketService.on(
            'chat:conversation-deleted',
            (deletedConversationId: any) => {
                if (profile?._id && deletedConversationId) {
                    socketEvents.unsubscribeConversation(
                        profile._id,
                        deletedConversationId,
                    );
                }

                removeConversationFromState(deletedConversationId);
            },
        );

        return unsubscribe;
    }, [profile, removeConversationFromState]);

    useEffect(() => {
        if (!profile?._id) {
            return;
        }

        let cancelled = false;
        const timers: Record<string, number> = {};

        const clearTyping = (conversationId: string) => {
            if (timers[conversationId]) {
                clearTimeout(timers[conversationId]);
                delete timers[conversationId];
            }
            setTypingByConversationId((current: any) => {
                if (!current[conversationId]) {
                    return current;
                }
                const next = { ...current };
                delete next[conversationId];
                return next;
            });
        };

        const showTyping = (conversationId: string) => {
            if (timers[conversationId]) {
                clearTimeout(timers[conversationId]);
            }
            setTypingByConversationId((current: any) =>
                current[conversationId]
                    ? current
                    : { ...current, [conversationId]: true },
            );
            timers[conversationId] = window.setTimeout(() => {
                delete timers[conversationId];
                setTypingByConversationId((current: any) => {
                    if (!current[conversationId]) {
                        return current;
                    }
                    const next = { ...current };
                    delete next[conversationId];
                    return next;
                });
            }, 2500);
        };

        const applyTyping = (payload: any) => {
            if (cancelled || !payload?.conversation_id || !payload?.user_id) {
                return;
            }
            if (String(payload.user_id) === String(profile._id)) {
                return;
            }
            const id = String(payload.conversation_id);
            if (payload.typing === false) {
                clearTyping(id);
                return;
            }
            showTyping(id);
        };

        const unsubscribe = socketService.on('chat:typing', applyTyping);
        void loadTyping().then((items: any) => {
            if (cancelled || !Array.isArray(items)) {
                return;
            }
            items.forEach((item: any) =>
                applyTyping({ ...item, typing: true }),
            );
        });

        return () => {
            cancelled = true;
            unsubscribe();
            Object.values(timers).forEach((timer) => clearTimeout(timer));
        };
    }, [profile?._id]);

    useEffect(() => {
        return () => {
            const id = typingConversationRef.current;
            if (!id) {
                return;
            }
            typingConversationRef.current = null;
            notifyTypingStop(id);
        };
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId || !profile) {
            setActiveConversation(null);
            setMessages([]);
            setDraft('');
            setReplyTo(null);
            setEditingMessage(null);
            return;
        }

        let cancelled = false;

        const loadChat = async () => {
            setIsChatLoading(true);
            setDraft('');
            setReplyTo(null);
            setEditingMessage(null);

            const [conversationResult, messagesResult] = await Promise.all([
                getConversation(conversationId),
                getMessages(conversationId),
            ]);

            if (cancelled) {
                return;
            }

            if (!conversationResult?.status) {
                showToast?.({
                    type: 'error',
                    message:
                        conversationResult?.message || 'Conversation not found',
                });
                navigate('/messages');
                setIsChatLoading(false);
                return;
            }

            stickToBottomRef.current = true;
            setIsAwayFromBottom(false);
            leavingIdsRef.current = new Set();
            setLeavingHeights({});
            setActiveConversation(conversationResult.data);
            setMessages(
                (messagesResult?.data?.items || []).filter(
                    (item: any) => !item.deleted_at,
                ),
            );
            clearConversationUnread(conversationId);
            await markChatAsRead(conversationId);
            if (cancelled) {
                return;
            }
            messagesConversationIdRef.current = conversationId;
            setIsChatLoading(false);
        };

        loadChat();

        socketEvents.subscribeConversation(profile._id, conversationId, {
            onMessage: (message: any) => {
                if (
                    message.deleted_at ||
                    deletedMessageIdsRef.current.has(String(message._id))
                ) {
                    beginMessageLeaveRef.current(message._id);
                    setReplyTo((current: any) => {
                        if (
                            !current ||
                            String(current._id) !== String(message._id)
                        ) {
                            return current;
                        }

                        return null;
                    });
                    return;
                }

                const normalized = normalizeIncomingMessage(
                    message,
                    profile._id,
                );
                setMessages((current: any) => {
                    if (
                        deletedMessageIdsRef.current.has(String(normalized._id))
                    ) {
                        return current.filter(
                            (item: any) =>
                                String(item._id) !== String(normalized._id),
                        );
                    }

                    const pending = current.find(
                        (item: any) =>
                            typeof item._id === 'string' &&
                            item._id.startsWith('pending-') &&
                            item.text === normalized.text,
                    );
                    if (pending) {
                        settledMessageIdsRef.current?.add(
                            String(normalized._id),
                        );
                        settledMessageIdsRef.current?.add(
                            String(pending.local_key || pending._id),
                        );
                    }

                    return mergeIncomingMessage(
                        current,
                        normalized,
                        profile._id,
                    );
                });

                setReplyTo((current: any) => {
                    if (
                        !current ||
                        String(current._id) !== String(message._id)
                    ) {
                        return current;
                    }

                    if (message.deleted_at) {
                        return null;
                    }

                    return {
                        ...current,
                        text: message.text,
                        edited_at: message.edited_at || null,
                    };
                });

                if (
                    !message.deleted_at &&
                    String(message.sender?._id) !== String(profile._id)
                ) {
                    markChatAsRead(conversationId);
                }
            },
            onMessagesDeleted: (ids: any) => {
                ids.forEach((id: any) => beginMessageLeaveRef.current(id));
            },
            onRead: (payload: any) => {
                if (
                    !payload?.user_id ||
                    String(payload.user_id) === String(profile._id)
                ) {
                    return;
                }

                setMessages((current: any) =>
                    current.map((item: any) =>
                        item.is_own ? { ...item, status: 'read' } : item,
                    ),
                );
            },
        });

        return () => {
            cancelled = true;
            socketEvents.unsubscribeConversation(profile._id, conversationId);
        };
    }, [
        conversationId,
        profile,
        navigate,
        showToast,
        markChatAsRead,
        clearConversationUnread,
    ]);

    if (seenConversationIdRef.current !== conversationId) {
        seenConversationIdRef.current = conversationId;
        stickToBottomRef.current = true;
        settlingScrollRef.current = true;
        if (isAwayFromBottom) {
            setIsAwayFromBottom(false);
        }
    }

    useEffect(() => {
        const previous = history.scrollRestoration;
        history.scrollRestoration = 'manual';
        return () => {
            history.scrollRestoration = previous;
        };
    }, []);

    useEffect(() => {
        const el = listRef.current;
        if (!el) {
            return;
        }

        const markUserScroll = (event: WheelEvent) => {
            forceBottomUntilRef.current = 0;
            if (!userGestureRef.current) {
                beginUserGesture();
            }
            if (event.deltaY < 0) {
                stickToBottomRef.current = false;
                settlingScrollRef.current = false;
                userMovedListRef.current = true;
                pendingBottomScrollRef.current = false;
            }
            armGestureEnd();
        };
        const markTouchStart = () => {
            forceBottomUntilRef.current = 0;
            touchingListRef.current = true;
            beginUserGesture();
        };
        const markTouchEnd = () => {
            touchingListRef.current = false;
            armGestureEnd();
        };
        const markScrollbar = (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                return;
            }
            if (event.target === el) {
                beginUserGesture();
            }
        };
        const markPointerUp = (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                return;
            }
            if (userGestureRef.current) {
                armGestureEnd();
            }
        };
        const markKeyScroll = (event: KeyboardEvent) => {
            if (
                event.key === 'ArrowUp' ||
                event.key === 'ArrowDown' ||
                event.key === 'PageUp' ||
                event.key === 'PageDown' ||
                event.key === 'Home' ||
                event.key === 'End' ||
                event.key === ' '
            ) {
                userScrollingRef.current = true;
                userBrokeHoldRef.current = true;
            }
        };

        el.addEventListener('wheel', markUserScroll, { passive: true });
        el.addEventListener('touchstart', markTouchStart, { passive: true });
        el.addEventListener('touchend', markTouchEnd, { passive: true });
        el.addEventListener('touchcancel', markTouchEnd, { passive: true });
        el.addEventListener('pointerdown', markScrollbar);
        el.addEventListener('keydown', markKeyScroll);
        window.addEventListener('pointerup', markPointerUp);
        window.addEventListener('pointercancel', markPointerUp);

        return () => {
            el.removeEventListener('wheel', markUserScroll);
            el.removeEventListener('touchstart', markTouchStart);
            el.removeEventListener('touchend', markTouchEnd);
            el.removeEventListener('touchcancel', markTouchEnd);
            el.removeEventListener('pointerdown', markScrollbar);
            el.removeEventListener('keydown', markKeyScroll);
            window.removeEventListener('pointerup', markPointerUp);
            window.removeEventListener('pointercancel', markPointerUp);
            window.clearTimeout(gestureEndTimerRef.current);
        };
    }, [conversationId, isChatLoading]);

    useEffect(() => {
        stickToBottomRef.current = true;
        jumpingToBottomRef.current = false;
        clearJumpScrollEnd();
        setMessageMenu(null);
        setSelectionIds(null);
        settledMessageIdsRef.current = null;
        deletedMessageIdsRef.current = new Set();
        setMessageMotion({});
    }, [conversationId]);

    useLayoutEffect(() => {
        if (
            isChatLoading ||
            messagesConversationIdRef.current !== conversationId
        ) {
            return;
        }

        const motionKeyOf = (message: any) =>
            String(message.local_key || message._id);
        const keys = messages.map(motionKeyOf);

        if (!settledMessageIdsRef.current) {
            settledMessageIdsRef.current = new Set(keys);
            return;
        }

        const fresh = keys.filter(
            (id: any) => !settledMessageIdsRef.current.has(id),
        );

        if (!fresh.length) {
            return;
        }

        fresh.forEach((id: any) => settledMessageIdsRef.current.add(id));

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (reduceMotion) {
            return;
        }

        fresh.forEach((id: any) => {
            document
                .querySelector(`[data-motion-key="${CSS.escape(id)}"]`)
                ?.classList.add('messages_item_enter');
        });

        setMessageMotion((current) => {
            const next = { ...current };
            fresh.forEach((id: any) => {
                next[id] = 'from';
            });
            return next;
        });
    }, [messages, isChatLoading, conversationId]);

    useLayoutEffect(() => {
        const fromIds = Object.keys(messageMotion).filter(
            (id) => messageMotion[id] === 'from',
        );

        if (fromIds.length) {
            fromIds.forEach((id) => {
                const element = document.querySelector(
                    `[data-motion-key="${CSS.escape(id)}"]`,
                );
                if (element) {
                    void (element as HTMLElement).offsetHeight;
                }
            });

            if (stickToBottomRef.current) {
                enterFollowRef.current = true;
            }

            setMessageMotion((current) => {
                const next = { ...current };
                let changed = false;
                fromIds.forEach((id) => {
                    if (next[id] === 'from') {
                        next[id] = 'to';
                        changed = true;
                    }
                });
                return changed ? next : current;
            });
            return;
        }

        if (!enterFollowRef.current) {
            return;
        }

        enterFollowRef.current = false;
        let following = true;
        const follow = () => {
            if (!following || !stickToBottomRef.current) {
                return;
            }

            scrollMessagesToBottom();
            requestAnimationFrame(follow);
        };
        const stop = window.setTimeout(() => {
            following = false;
        }, 420);
        requestAnimationFrame(follow);

        return () => {
            following = false;
            window.clearTimeout(stop);
        };
    }, [messageMotion, scrollMessagesToBottom]);

    useEffect(() => {
        const ids = Object.keys(messageMotion).filter(
            (id) => messageMotion[id] === 'to',
        );

        if (!ids.length) {
            return;
        }

        const timer = window.setTimeout(() => {
            setMessageMotion((current) => {
                const next = { ...current };
                let changed = false;
                ids.forEach((id) => {
                    if (next[id] === 'to') {
                        delete next[id];
                        changed = true;
                    }
                });
                return changed ? next : current;
            });
        }, 420);

        return () => window.clearTimeout(timer);
    }, [messageMotion]);

    useEffect(() => {
        if (!Array.isArray(selectionIds)) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                captureListAnchor();
                setSelectionIds(null);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectionIds, captureListAnchor]);

    useEffect(() => {
        if (!replyTo && !editingMessage) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            if (editingMessage) {
                setEditingMessage(null);
                setDraft('');
                return;
            }

            setReplyTo(null);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [replyTo, editingMessage]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) {
            return;
        }

        const closeMenu = () => setMessageMenu(null);
        el.addEventListener('scroll', closeMenu, { passive: true });

        return () => el.removeEventListener('scroll', closeMenu);
    }, [conversationId]);

    const isSelecting = Array.isArray(selectionIds);

    useLayoutEffect(() => {
        const pending = pendingScrollAnchorRef.current;
        if (!pending) {
            return;
        }

        pendingScrollAnchorRef.current = null;
        const el = listRef.current;
        if (!el) {
            return;
        }

        const hold = pending;
        restoringScrollRef.current = true;
        stickToBottomRef.current = hold.stick;
        if (hold.stick) {
            setIsAwayFromBottom(false);
        }

        const apply = () => {
            if (userBrokeHoldRef.current || jumpingToBottomRef.current) {
                restoringScrollRef.current = false;
                return;
            }

            const max = Math.max(0, el.scrollHeight - el.clientHeight);
            let next = hold.stick ? max : Math.min(hold.scrollTop, max);

            if (!hold.stick && hold.anchor) {
                const node = document.getElementById(hold.anchor.id);
                if (node) {
                    const delta =
                        node.getBoundingClientRect().top -
                        el.getBoundingClientRect().top -
                        hold.anchor.offset;
                    next = Math.min(max, Math.max(0, el.scrollTop + delta));
                }
            }

            if (Math.abs(el.scrollTop - next) <= 1) {
                return;
            }

            ignoreScrollRef.current = true;
            el.scrollTop = next;
            ignoreScrollRef.current = false;
        };

        const observer = new ResizeObserver(() => apply());
        observer.observe(el);
        for (const node of el.querySelectorAll('article[id^="message_"]')) {
            observer.observe(node);
        }

        apply();
        el.addEventListener('scroll', apply);

        const timer = window.setTimeout(() => {
            observer.disconnect();
            el.removeEventListener('scroll', apply);
            restoringScrollRef.current = false;
        }, 400);

        return () => {
            observer.disconnect();
            window.clearTimeout(timer);
            el.removeEventListener('scroll', apply);
            restoringScrollRef.current = false;
        };
    }, [isSelecting]);

    const openMessageMenu = (event: any, items: any) => {
        if (isSelecting) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (!items.length) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setMessageMenu({
            x: event.clientX,
            y: event.clientY,
            items,
        });
    };

    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el || isChatLoading) {
            return;
        }

        if (messagesConversationIdRef.current !== conversationId) {
            return;
        }

        const heights = new Map<Element, number>();
        const observer = new ResizeObserver((entries) => {
            if (restoringScrollRef.current) {
                for (const entry of entries) {
                    const next =
                        entry.borderBoxSize?.[0]?.blockSize ??
                        entry.contentRect.height;
                    heights.set(entry.target, next);
                }
                return;
            }

            let deltaAbove = 0;

            for (const entry of entries) {
                const next =
                    entry.borderBoxSize?.[0]?.blockSize ??
                    entry.contentRect.height;
                const prev = heights.get(entry.target);
                heights.set(entry.target, next);

                if (prev == null) {
                    continue;
                }

                const delta = next - prev;
                if (!delta) {
                    continue;
                }

                const listTop = el.getBoundingClientRect().top;
                const bottom = entry.target.getBoundingClientRect().bottom;
                if (bottom - delta <= listTop + 1) {
                    deltaAbove += delta;
                }
            }

            if (stickToBottomRef.current && !userGestureRef.current) {
                scrollMessagesToBottom();
                return;
            }

            if (deltaAbove) {
                ignoreScrollRef.current = true;
                el.scrollTop += deltaAbove;
                ignoreScrollRef.current = false;
            }
        });

        for (const child of el.querySelectorAll('article[id^="message_"]')) {
            observer.observe(child);
        }

        return () => observer.disconnect();
    }, [conversationId, isChatLoading, messages, scrollMessagesToBottom]);

    useLayoutEffect(() => {
        if (isChatLoading) {
            return;
        }

        if (messagesConversationIdRef.current !== conversationId) {
            return;
        }

        if (userGestureRef.current) {
            settlingScrollRef.current = false;
            return;
        }

        if (!stickToBottomRef.current) {
            settlingScrollRef.current = false;
            return;
        }

        if (smoothEnterScrollRef.current) {
            smoothEnterScrollRef.current = false;
            settlingScrollRef.current = false;
            return;
        }

        scrollMessagesToBottom();
        setIsAwayFromBottom(false);
        const frame = requestAnimationFrame(() => {
            scrollMessagesToBottom();
            settlingScrollRef.current = false;
        });
        return () => cancelAnimationFrame(frame);
    }, [messages, isChatLoading, conversationId, scrollMessagesToBottom]);

    const handleStartReply = (message: any) => {
        setEditingMessage(null);
        setReplyTo(message);
    };

    const scrollListToNode = (
        node: HTMLElement | null,
        block: 'center' | 'start',
    ) => {
        const el = listRef.current;

        if (!el || !node) {
            return;
        }

        const listRect = el.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        let top = el.scrollTop + (nodeRect.top - listRect.top);

        if (block === 'center') {
            top -= (el.clientHeight - nodeRect.height) / 2;
        }

        const max = Math.max(0, el.scrollHeight - el.clientHeight);
        top = Math.min(max, Math.max(0, top));
        stickToBottomRef.current = false;
        jumpingToBottomRef.current = false;
        clearJumpScrollEnd();
        setIsAwayFromBottom(true);
        ignoreScrollRef.current = true;

        let finished = false;
        const finish = () => {
            if (finished) {
                return;
            }

            finished = true;
            window.clearTimeout(timer);
            el.removeEventListener('scrollend', finish);
            ignoreScrollRef.current = false;
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
            const away = distance >= 80;
            stickToBottomRef.current = !away;
            setIsAwayFromBottom(away);
        };

        el.addEventListener('scrollend', finish);
        const timer = window.setTimeout(finish, 800);
        el.scrollTo({ top, behavior: 'smooth' });
    };

    const scrollToMessageDay = (groupKey: any) => {
        scrollListToNode(
            document.getElementById(`messages_day_${groupKey}`),
            'start',
        );
    };

    useEffect(() => {
        if (!replyTo || isChatLoading) {
            return;
        }

        const frame = requestAnimationFrame(() => {
            composerInputRef.current?.focus();
        });

        return () => cancelAnimationFrame(frame);
    }, [replyTo, isChatLoading]);

    const clearSelection = () => {
        captureListAnchor();
        const active = document.activeElement;
        if (
            active instanceof HTMLElement &&
            active.closest('.messages_selection_bar')
        ) {
            active.blur();
        }
        setSelectionIds(null);
    };

    const startSelection = (message: any) => {
        if (!message || message.deleted_at) {
            return;
        }

        captureListAnchor();
        setMessageMenu(null);
        setSelectionIds([String(message._id)]);
    };

    const toggleMessageSelection = (message: any) => {
        if (!message || message.deleted_at) {
            return;
        }

        const id = String(message._id);
        setSelectionIds((current: any) => {
            if (!Array.isArray(current)) {
                return current;
            }

            if (current.includes(id)) {
                return current.filter((item: any) => item !== id);
            }

            return [...current, id];
        });
    };

    const clearTextSelection = () => {
        window.getSelection()?.removeAllRanges();
        requestAnimationFrame(() => window.getSelection()?.removeAllRanges());
    };

    const preventRepeatedClickSelection = (event: any) => {
        if (event.detail > 1) {
            event.preventDefault();
            clearTextSelection();
        }
    };

    const handleMessageDoubleClick = (event: any, message: any) => {
        event.preventDefault();
        clearTextSelection();

        if (isSelecting || !message || message.deleted_at || isChatLoading) {
            return;
        }

        if (
            event.target.closest(
                "a, button, input, textarea, [contenteditable='true']",
            )
        ) {
            return;
        }

        const stamp = event.timeStamp;
        if (stamp - lastReplyGestureRef.current < 500) {
            return;
        }

        lastReplyGestureRef.current = stamp;
        handleStartReply(message);
    };

    const handleStartEdit = (message: any) => {
        setReplyTo(null);
        setEditingMessage(message);
        setDraft(message.text || '');
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setDraft('');
    };

    const composerContext = editingMessage
        ? {
              message: editingMessage,
              title: 'Editing',
              ...getQuoteContent(editingMessage),
              onClose: handleCancelEdit,
              closeLabel: 'Cancel editing',
          }
        : replyTo
          ? {
                message: replyTo,
                title: `Reply to ${getQuoteContent(replyTo).author}`,
                ...getQuoteContent(replyTo),
                onClose: () => setReplyTo(null),
                closeLabel: 'Cancel reply',
            }
          : null;
    const composerContextRef = useRef<any>(null);
    composerContextRef.current = composerContext;
    const contextSignature = editingMessage
        ? `edit:${editingMessage._id}:${editingMessage.text || ''}`
        : replyTo
          ? `reply:${replyTo._id}:${replyTo.text || ''}:${replyTo.deleted_at || ''}`
          : '';
    const [contextFrame, setContextFrame] = useState<any>(null);
    const [contextOpen, setContextOpen] = useState(false);

    useLayoutEffect(() => {
        if (contextSignature) {
            setContextFrame(composerContextRef.current);
            return;
        }

        setContextOpen(false);
    }, [contextSignature]);

    useEffect(() => {
        if (!contextSignature) {
            const timer = window.setTimeout(() => setContextFrame(null), 320);
            return () => window.clearTimeout(timer);
        }

        const frame = window.requestAnimationFrame(() => setContextOpen(true));
        return () => window.cancelAnimationFrame(frame);
    }, [contextSignature]);

    const handleReplyPreviewClick = (preview: any) => {
        if (!preview || preview.deleted || preview.deleted_at) {
            return;
        }

        const element = document.getElementById(`message_${preview._id}`);
        scrollListToNode(element, 'center');
        element?.classList.add('messages_item_highlight');
        setTimeout(() => {
            element?.classList.remove('messages_item_highlight');
        }, 1600);
    };

    const focusComposer = () => {
        const field = composerInputRef.current;
        if (!field || document.activeElement === field) {
            return;
        }

        field.focus({ preventScroll: true });
    };

    const holdComposerFocus = () => {
        focusComposer();
        requestAnimationFrame(() => {
            focusComposer();
            requestAnimationFrame(focusComposer);
        });
    };

    const clearLongPress = () => {
        const current = longPressRef.current;
        if (!current) {
            return;
        }

        window.clearTimeout(current.timer);
        longPressRef.current = null;
    };

    const handleMessageTouchStart = (event: any, actionItems: any) => {
        if (isSelecting || messageMenu || event.touches?.length !== 1) {
            return;
        }

        if (event.target.closest('button, input, textarea')) {
            return;
        }

        const touch = event.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        const timer = window.setTimeout(() => {
            longPressRef.current = null;
            suppressMessageClickRef.current = true;
            clearTextSelection();
            openMessageMenu(
                {
                    preventDefault() {},
                    stopPropagation() {},
                    clientX: startX,
                    clientY: startY,
                },
                actionItems,
            );
        }, 480);

        longPressRef.current = { timer, startX, startY };
    };

    const handleMessageTouchMove = (event: any) => {
        const current = longPressRef.current;
        const touch = event.touches?.[0];
        if (!current || !touch) {
            return;
        }

        if (
            Math.hypot(
                touch.clientX - current.startX,
                touch.clientY - current.startY,
            ) > 10
        ) {
            clearLongPress();
        }
    };

    const handleMessageTouchEnd = (event: any) => {
        clearLongPress();
        if (!suppressMessageClickRef.current) {
            return;
        }

        event.preventDefault();
        window.setTimeout(() => {
            suppressMessageClickRef.current = false;
        }, 400);
    };

    const finishMessageEnter = (motionKey: string) => {
        setMessageMotion((current) => {
            if (!(motionKey in current)) {
                return current;
            }

            const next = { ...current };
            delete next[motionKey];
            return next;
        });
    };

    const handleSend = async () => {
        const text = draft.trim();
        if (
            !text ||
            !conversationId ||
            isSending ||
            isChatLoading ||
            sendLockRef.current
        ) {
            return;
        }

        sendLockRef.current = true;
        holdComposerFocus();
        if (typingConversationRef.current === conversationId) {
            typingConversationRef.current = null;
        }
        notifyTypingStop(conversationId);

        try {
            if (editingMessage) {
                setIsSending(true);
                const result = await editMessage(editingMessage._id, { text });
                setIsSending(false);

                if (!result?.status) {
                    showToast?.({
                        type: 'error',
                        message:
                            result?.message || 'Could not edit the message',
                    });
                    return;
                }

                upsertMessage(result.data);
                setEditingMessage(null);
                setDraft('');
                setConversations((current: any) => {
                    const existing = current.find(
                        (item: any) => item._id === conversationId,
                    );
                    if (!existing) {
                        return current;
                    }

                    return upsertConversationInList(current, {
                        ...existing,
                        last_message_text: messagePreviewText(result.data),
                        last_message_at: result.data.created_at,
                    });
                });
                return;
            }

            const pendingId = `pending-${crypto.randomUUID()}`;
            const optimistic = {
                _id: pendingId,
                local_key: pendingId,
                conversation_id: conversationId,
                sender: {
                    _id: profile._id,
                    nick_name: profile.nick_name,
                    avatar: profile.avatar,
                },
                text,
                reply_to: replyTo?._id || null,
                reply_preview: replyTo
                    ? {
                          _id: replyTo._id,
                          text: replyTo.deleted_at ? '' : replyTo.text,
                          deleted: Boolean(replyTo.deleted_at),
                          sender: replyTo.sender,
                      }
                    : null,
                deleted_at: null,
                created_at: new Date().toISOString(),
                is_own: true,
                status: 'sending',
            };

            stickToBottomRef.current = true;
            setMessages((current: any) => [...current, optimistic]);
            setDraft('');
            setReplyTo(null);
            setIsSending(true);
            pinMessagesToBottom();

            const result = await sendMessage(conversationId, {
                text,
                replyTo: replyTo?._id,
            });

            setIsSending(false);

            if (!result?.status) {
                setMessages((current: any) =>
                    current.filter((item: any) => item._id !== pendingId),
                );
                showToast?.({
                    type: 'error',
                    message: result?.message || 'Could not send the message',
                });
                return;
            }

            settledMessageIdsRef.current?.add(String(result.data._id));
            settledMessageIdsRef.current?.add(pendingId);

            setMessages((current: any) => {
                const filtered = current.filter(
                    (item: any) => item._id !== pendingId,
                );

                if (deletedMessageIdsRef.current.has(String(result.data._id))) {
                    return filtered;
                }
                const exists = filtered.some(
                    (item: any) => item._id === result.data._id,
                );

                if (exists) {
                    return filtered.map((item: any) =>
                        item._id === result.data._id
                            ? {
                                  ...item,
                                  ...result.data,
                                  status: 'sent',
                                  local_key: item.local_key || pendingId,
                              }
                            : item,
                    );
                }

                return [
                    ...filtered,
                    { ...result.data, status: 'sent', local_key: pendingId },
                ];
            });

            setConversations((current: any) => {
                const existing = current.find(
                    (item: any) => item._id === conversationId,
                );
                if (!existing) {
                    return current;
                }

                return upsertConversationInList(current, {
                    ...existing,
                    last_message_text: messagePreviewText(result.data),
                    last_message_at: result.data.created_at,
                    unread: 0,
                });
            });
        } finally {
            sendLockRef.current = false;
        }
    };

    const resizeComposerInput = useCallback(() => {
        const field = composerInputRef.current;

        if (!field) {
            return;
        }

        field.style.maxHeight = 'none';
        field.style.minHeight = '0px';
        field.style.height = '0px';
        const contentHeight = field.scrollHeight;
        const lines = Math.min(
            COMPOSER_MAX_LINES,
            Math.max(
                1,
                Math.ceil(
                    (contentHeight - COMPOSER_PAD_Y * 2) /
                        COMPOSER_LINE_HEIGHT -
                        0.15,
                ),
            ),
        );
        field.style.maxHeight = '';
        field.style.minHeight = '';
        field.style.height = `${lines * COMPOSER_LINE_HEIGHT + COMPOSER_PAD_Y * 2}px`;
        field.style.overflowY =
            contentHeight > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
    }, []);

    useLayoutEffect(() => {
        const field = composerInputRef.current;
        const wasFocused = field != null && document.activeElement === field;
        resizeComposerInput();
        if (wasFocused && document.activeElement !== field) {
            field.focus({ preventScroll: true });
        }
    }, [draft, resizeComposerInput, conversationId]);

    const handleComposerKeyDown = (event: any) => {
        if (event.key === 'Escape') {
            if (editingMessage) {
                event.preventDefault();
                handleCancelEdit();
            } else if (replyTo) {
                event.preventDefault();
                setReplyTo(null);
            }
            return;
        }

        if (
            event.key !== 'Enter' ||
            event.shiftKey ||
            event.nativeEvent.isComposing
        ) {
            return;
        }

        event.preventDefault();
        handleSend();
    };

    const finishMessageLeave = (messageId: any) => {
        const id = String(messageId);
        leavingIdsRef.current.delete(id);
        setSelectionIds((current: any) => {
            if (!Array.isArray(current) || !current.includes(id)) {
                return current;
            }

            return current.filter((item: any) => item !== id);
        });
        setLeavingHeights((current: any) => {
            if (!(id in current)) {
                return current;
            }

            const next = { ...current };
            delete next[id];
            return next;
        });
        setMessages((current: any) =>
            current.filter((item: any) => String(item._id) !== id),
        );
    };

    const beginMessageLeave = (messageId: any) => {
        const id = String(messageId);
        deletedMessageIdsRef.current.add(id);

        if (leavingIdsRef.current.has(id)) {
            return;
        }

        const element = document.getElementById(`message_${id}`);

        if (!element) {
            finishMessageLeave(id);
            return;
        }

        leavingIdsRef.current.add(id);
        setLeavingHeights((current: any) => ({
            ...current,
            [id]: element.offsetHeight,
        }));
        window.setTimeout(() => {
            if (leavingIdsRef.current.has(id)) {
                finishMessageLeave(id);
            }
        }, 420);
        setReplyTo((current: any) =>
            current && String(current._id) === id ? null : current,
        );

        if (editingMessage && String(editingMessage._id) === id) {
            setEditingMessage(null);
            setDraft('');
        }
    };

    beginMessageLeaveRef.current = beginMessageLeave;

    const handleDelete = async (messageId: any) => {
        const result = await deleteMessage(messageId);
        if (!result?.status) {
            showToast?.({
                type: 'error',
                message: result?.message || 'Could not delete the message',
            });
            return;
        }

        beginMessageLeave(messageId);
    };

    const copyText = async (text: any) => {
        try {
            await navigator.clipboard.writeText(String(text ?? ''));
            showToast?.({ type: 'success', message: 'Copied' });
        } catch {
            showToast?.({ type: 'error', message: 'Could not copy' });
        }
    };

    const messageAuthorName = (message: any) =>
        message?.is_own
            ? profile?.nick_name || 'You'
            : message?.sender?.nick_name || 'User';

    const handleCopyMessage = (message: any) => {
        if (!message || message.deleted_at) {
            return;
        }

        void copyText(message.text || '');
    };

    const selectedMessages = isSelecting
        ? messages
              .filter(
                  (item: any) =>
                      selectionIds.includes(String(item._id)) &&
                      !item.deleted_at,
              )
              .sort(
                  (a: any, b: any) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime(),
              )
        : [];

    const handleCopySelection = () => {
        if (!selectedMessages.length) {
            return;
        }

        const text = selectedMessages
            .map(
                (item: any) =>
                    `${messageAuthorName(item)}:\n${item.text || ''}`,
            )
            .join('\n\n');

        void copyText(text);
        clearSelection();
    };

    const handleDeleteSelection = async () => {
        if (!selectedMessages.length || isDeletingSelection) {
            return;
        }

        const pendingIds = selectedMessages
            .map((item: any) => String(item._id))
            .filter((id: any) => id.startsWith('pending-'));
        const ids = selectedMessages
            .map((item: any) => String(item._id))
            .filter((id: any) => !id.startsWith('pending-'));

        pendingIds.forEach((id: any) => beginMessageLeave(id));

        if (!ids.length) {
            clearSelection();
            return;
        }

        setIsDeletingSelection(true);
        const result = await deleteMessages(ids);
        setIsDeletingSelection(false);

        if (!result?.status) {
            showToast?.({
                type: 'error',
                message: result?.message || 'Could not delete the messages',
            });
            return;
        }

        ids.forEach((id: any) => beginMessageLeave(id));
        clearSelection();
    };

    const messageActionHandlers = {
        onReply: handleStartReply,
        onEdit: handleStartEdit,
        onDelete: handleDelete,
        onCopy: handleCopyMessage,
        onSelect: startSelection,
        icons: {
            reply: ReplyIcon,
            copy: CopyIcon,
            edit: EditIcon,
            delete: DeleteIcon,
            select: TickCircleIcon,
        },
    };

    const activeListItem = useMemo(
        () => conversations.find((item: any) => item._id === conversationId),
        [conversations, conversationId],
    );

    const participant =
        activeConversation?.participant || activeListItem?.participant;

    const watchedUserIds = useMemo(() => {
        const ids = conversations
            .map((item: any) => item.participant?._id)
            .filter(Boolean)
            .map(String);

        if (participant?._id) {
            ids.push(String(participant._id));
        }

        return [...new Set(ids)];
    }, [conversations, participant?._id]);

    useEffect(() => {
        if (!watchedUserIds.length) {
            return;
        }

        let cancelled = false;

        void loadOnlineStatusForUsers(watchedUserIds).then((statusMap: any) => {
            if (!cancelled) {
                setOnlineByUserId(statusMap);
            }
        });

        const unsubscribe = subscribePresenceChanges(
            (userId: any, online: any) => {
                if (!cancelled) {
                    setOnlineByUserId((current: any) => ({
                        ...current,
                        [userId]: online,
                    }));
                }
            },
        );

        return () => {
            cancelled = true;
            void unsubscribe();
        };
    }, [watchedUserIds]);

    const messageDayGroups = useMemo(
        () => buildMessageDayGroups(messages),
        [messages],
    );

    const messageById = useMemo(
        () => new Map(messages.map((item: any) => [String(item._id), item])),
        [messages],
    );

    const openDeleteChatModal = useCallback(() => {
        if (!conversationId || !profile) {
            return;
        }

        showModalWindow({
            title: 'Delete chat?',
            size: 'small',
            showCloseButton: false,
            closeFunc: () => {},
            content: getDeleteChatModalContent({
                participant,
                conversationId,
                profile,
                requestCloseModal,
                showToast,
                onDeleted: removeConversationFromState,
                disabled: isChatLoading,
            }),
        });
    }, [
        conversationId,
        profile,
        participant,
        showModalWindow,
        requestCloseModal,
        showToast,
        removeConversationFromState,
        isChatLoading,
    ]);

    if (!profile) {
        return (
            <div className="messages_page">
                <h1 className="messages_title">Messages</h1>
                <div className="messages_empty_state">
                    <p>Log in to open messages.</p>
                    <ActionButton onClick={() => navigate('/auth/login')}>
                        Log in
                    </ActionButton>
                </div>
            </div>
        );
    }

    return (
        <div className="messages_page">
            <div
                className={`messages_layout${conversationId ? ' messages_layout_chat' : ''}`}
            >
                <aside className="messages_sidebar">
                    {isListLoading ? (
                        <Loading size={32} />
                    ) : conversations.length ? (
                        <ul className="messages_conversation_list">
                            {conversations.map((item: any) => (
                                <li key={item._id}>
                                    <Link
                                        href={`/messages/${item._id}`}
                                        className={`messages_conversation_item app-transition${
                                            item._id === conversationId
                                                ? ' messages_conversation_item_active'
                                                : ''
                                        }`}
                                    >
                                        <div className="messages_conversation_data">
                                            <UserBadge
                                                data={item.participant}
                                                asLink={false}
                                            />
                                            <UserActivityStatus
                                                user={item.participant}
                                                viewerId={profile._id}
                                                isOnline={
                                                    onlineByUserId[
                                                        String(
                                                            item.participant
                                                                ?._id,
                                                        )
                                                    ] ?? false
                                                }
                                                isTyping={Boolean(
                                                    typingByConversationId[
                                                        String(item._id)
                                                    ],
                                                )}
                                                className="messages_activity_status"
                                            />
                                        </div>
                                        <div className="messages_conversation_copy">
                                            <p className="messages_conversation_preview">
                                                {item.last_message_text ||
                                                    'No messages'}
                                            </p>
                                            <div className="messages_conversation_row">
                                                {item.last_message_at ? (
                                                    <span className="messages_conversation_time">
                                                        {format_date_time(
                                                            item.last_message_at,
                                                        )}
                                                    </span>
                                                ) : null}
                                                {item.unread > 0 ? (
                                                    <span className="messages_conversation_unread">
                                                        {item.unread}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="messages_empty_hint">
                            No conversations yet. Start one from a the user
                            profile.
                        </p>
                    )}
                </aside>

                <section className="messages_chat">
                    {!conversationId ? (
                        <div className="messages_blank">
                            <div
                                className="messages_blank_sheet"
                                aria-hidden="true"
                            >
                                <NewMessageIllustration className="app-transition-color" />
                            </div>
                            <div className="messages_blank_copy">
                                <h1>This conversation is still empty</h1>
                                <p className="messages_blank_lead">
                                    Choose a chat on the left. Or open a profile
                                    and click “Start a conversation”.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <header className="messages_chat_head">
                                <div className="messages_chat_head_main">
                                    <button
                                        type="button"
                                        className="messages_back app-transition"
                                        onClick={() => navigate('/messages')}
                                        aria-label="Back"
                                    >
                                        <ArrowLeftIcon />
                                    </button>
                                    {participant ? (
                                        <div className="messages_chat_head_user">
                                            <UserBadge data={participant} />
                                            <UserActivityStatus
                                                user={participant}
                                                viewerId={profile._id}
                                                isOnline={
                                                    onlineByUserId[
                                                        String(participant._id)
                                                    ] ?? false
                                                }
                                                isTyping={Boolean(
                                                    typingByConversationId[
                                                        String(conversationId)
                                                    ],
                                                )}
                                                className="messages_activity_status"
                                            />
                                        </div>
                                    ) : (
                                        <h1 className="messages_title">
                                            Messages
                                        </h1>
                                    )}
                                </div>
                                <Popup
                                    body={[
                                        [
                                            {
                                                title: 'Delete chat',
                                                icon: <DeleteIcon />,
                                                type: 'danger',
                                                onClick: openDeleteChatModal,
                                            },
                                        ],
                                    ]}
                                >
                                    <div
                                        className={`messages_chat_menu app-transition${
                                            isChatLoading
                                                ? ' messages_chat_menu_disabled'
                                                : ''
                                        }`}
                                        aria-label="Chat actions"
                                        onClick={(event: any) => {
                                            if (isChatLoading) {
                                                event.stopPropagation();
                                            }
                                        }}
                                    >
                                        <ThreeDotsIcon />
                                    </div>
                                </Popup>
                            </header>

                            <div className="messages_thread">
                                <div className="messages_thread_inner">
                                    <div
                                        className={`messages_list${
                                            isSelecting
                                                ? ' messages_list_selecting'
                                                : ''
                                        }${
                                            messageMenu
                                                ? ' messages_list_menu_open'
                                                : ''
                                        }`}
                                        ref={listRef}
                                        onScroll={handleListScroll}
                                    >
                                        {isChatLoading ||
                                        messagesConversationIdRef.current !==
                                            conversationId ? null : (
                                            <div
                                                className="messages_list_spacer"
                                                aria-hidden="true"
                                            />
                                        )}
                                        {isChatLoading ||
                                        messagesConversationIdRef.current !==
                                            conversationId ? (
                                            <div className="messages_list_loader">
                                                <Loading size={36} />
                                            </div>
                                        ) : (
                                            messageDayGroups.map(
                                                (
                                                    group: any,
                                                    groupIndex: any,
                                                ) => (
                                                    <section
                                                        key={group.key}
                                                        id={`messages_day_${group.key}`}
                                                        className="messages_day_group"
                                                    >
                                                        <div
                                                            className="messages_date_divider"
                                                            style={{
                                                                zIndex:
                                                                    messageDayGroups.length -
                                                                    groupIndex,
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="messages_date_label app-transition"
                                                                onClick={() =>
                                                                    scrollToMessageDay(
                                                                        group.key,
                                                                    )
                                                                }
                                                            >
                                                                {group.label}
                                                            </button>
                                                        </div>

                                                        {group.messages.map(
                                                            (message: any) => {
                                                                const isLeaving =
                                                                    message._id in
                                                                    leavingHeights;
                                                                const isOwn =
                                                                    message.is_own;
                                                                const isDeleted =
                                                                    Boolean(
                                                                        message.deleted_at,
                                                                    );

                                                                if (
                                                                    isDeleted &&
                                                                    !isLeaving
                                                                ) {
                                                                    return null;
                                                                }
                                                                const hasEmbeds =
                                                                    !isDeleted &&
                                                                    /https?:\/\//.test(
                                                                        message.text ||
                                                                            '',
                                                                    );
                                                                const replyQuote =
                                                                    resolveReplyQuote(
                                                                        message,
                                                                        messageById,
                                                                    );
                                                                const replyTargetId =
                                                                    message.reply_to ||
                                                                    message
                                                                        .reply_preview
                                                                        ?._id;

                                                                const isSelected =
                                                                    isSelecting &&
                                                                    selectionIds.includes(
                                                                        String(
                                                                            message._id,
                                                                        ),
                                                                    );
                                                                const motionKey =
                                                                    String(
                                                                        message.local_key ||
                                                                            message._id,
                                                                    );
                                                                const motion =
                                                                    messageMotion[
                                                                        motionKey
                                                                    ];

                                                                const actionItems =
                                                                    getMessageActions(
                                                                        {
                                                                            message,
                                                                            isOwn,
                                                                            isChatLoading,
                                                                            editingMessage,
                                                                            handlers:
                                                                                messageActionHandlers,
                                                                        },
                                                                    );

                                                                return (
                                                                    <article
                                                                        key={
                                                                            motionKey
                                                                        }
                                                                        id={`message_${message._id}`}
                                                                        data-motion-key={
                                                                            motionKey
                                                                        }
                                                                        className={`messages_item app-transition${
                                                                            isOwn
                                                                                ? ' messages_item_own'
                                                                                : ''
                                                                        }${
                                                                            isLeaving
                                                                                ? ' messages_item_leaving'
                                                                                : ''
                                                                        }${
                                                                            motion
                                                                                ? ' messages_item_enter'
                                                                                : ''
                                                                        }${
                                                                            motion ===
                                                                            'to'
                                                                                ? ' messages_item_enter_open'
                                                                                : ''
                                                                        }`}
                                                                        style={
                                                                            isLeaving
                                                                                ? ({
                                                                                      '--leave-height': `${leavingHeights[message._id]}px`,
                                                                                  } as React.CSSProperties)
                                                                                : undefined
                                                                        }
                                                                        onAnimationEnd={(
                                                                            event: any,
                                                                        ) => {
                                                                            if (
                                                                                event.target !==
                                                                                event.currentTarget
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            if (
                                                                                event.animationName !==
                                                                                'messages_item_leave'
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            finishMessageLeave(
                                                                                message._id,
                                                                            );
                                                                        }}
                                                                        onTransitionEnd={(
                                                                            event: any,
                                                                        ) => {
                                                                            if (
                                                                                event.target !==
                                                                                    event.currentTarget ||
                                                                                event.propertyName !==
                                                                                    'grid-template-rows'
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            finishMessageEnter(
                                                                                motionKey,
                                                                            );
                                                                        }}
                                                                        onMouseDown={
                                                                            preventRepeatedClickSelection
                                                                        }
                                                                        onTouchStart={(
                                                                            event: any,
                                                                        ) =>
                                                                            handleMessageTouchStart(
                                                                                event,
                                                                                actionItems,
                                                                            )
                                                                        }
                                                                        onTouchMove={
                                                                            handleMessageTouchMove
                                                                        }
                                                                        onTouchEnd={
                                                                            handleMessageTouchEnd
                                                                        }
                                                                        onTouchCancel={
                                                                            clearLongPress
                                                                        }
                                                                        onMouseUp={(
                                                                            event: any,
                                                                        ) => {
                                                                            if (
                                                                                event.detail >
                                                                                1
                                                                            ) {
                                                                                handleMessageDoubleClick(
                                                                                    event,
                                                                                    message,
                                                                                );
                                                                            }
                                                                        }}
                                                                        onClickCapture={(
                                                                            event: any,
                                                                        ) => {
                                                                            if (
                                                                                !suppressMessageClickRef.current
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            event.preventDefault();
                                                                            event.stopPropagation();
                                                                        }}
                                                                        onClick={(
                                                                            event: any,
                                                                        ) => {
                                                                            if (
                                                                                suppressMessageClickRef.current
                                                                            ) {
                                                                                suppressMessageClickRef.current = false;
                                                                                event.preventDefault();
                                                                                event.stopPropagation();
                                                                                return;
                                                                            }

                                                                            if (
                                                                                !isSelecting ||
                                                                                event.detail >
                                                                                    1
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            toggleMessageSelection(
                                                                                message,
                                                                            );
                                                                        }}
                                                                        onDoubleClick={(
                                                                            event: any,
                                                                        ) =>
                                                                            handleMessageDoubleClick(
                                                                                event,
                                                                                message,
                                                                            )
                                                                        }
                                                                        onContextMenu={(
                                                                            event: any,
                                                                        ) => {
                                                                            if (
                                                                                messageMenu
                                                                            ) {
                                                                                event.preventDefault();
                                                                                return;
                                                                            }

                                                                            openMessageMenu(
                                                                                event,
                                                                                actionItems,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <div className="messages_item_motion">
                                                                            {!isDeleted ? (
                                                                                <span
                                                                                    className="messages_select_slot"
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    <span
                                                                                        className={`messages_select${
                                                                                            isSelected
                                                                                                ? ' messages_select_on'
                                                                                                : ''
                                                                                        }`}
                                                                                    >
                                                                                        <TickIcon />
                                                                                    </span>
                                                                                </span>
                                                                            ) : null}
                                                                            <div className="messages_bubble_wrap">
                                                                                <div className="messages_bubble">
                                                                                    {replyQuote
                                                                                        ? (() => {
                                                                                              if (
                                                                                                  replyQuote.deleted
                                                                                              ) {
                                                                                                  return (
                                                                                                      <div className="messages_quote messages_quote_deleted app-transition">
                                                                                                          <span className="messages_quote_author">
                                                                                                              {
                                                                                                                  replyQuote.author
                                                                                                              }
                                                                                                          </span>
                                                                                                          <span className="messages_quote_text">
                                                                                                              {
                                                                                                                  replyQuote.text
                                                                                                              }
                                                                                                          </span>
                                                                                                      </div>
                                                                                                  );
                                                                                              }

                                                                                              return (
                                                                                                  <button
                                                                                                      type="button"
                                                                                                      className="messages_quote app-transition"
                                                                                                      onClick={() =>
                                                                                                          handleReplyPreviewClick(
                                                                                                              {
                                                                                                                  _id: replyTargetId,
                                                                                                                  deleted:
                                                                                                                      replyQuote.deleted,
                                                                                                              },
                                                                                                          )
                                                                                                      }
                                                                                                  >
                                                                                                      <span className="messages_quote_author">
                                                                                                          {
                                                                                                              replyQuote.author
                                                                                                          }
                                                                                                      </span>
                                                                                                      <span className="messages_quote_text">
                                                                                                          {
                                                                                                              replyQuote.text
                                                                                                          }
                                                                                                      </span>
                                                                                                  </button>
                                                                                              );
                                                                                          })()
                                                                                        : null}

                                                                                    <div
                                                                                        className={`messages_body${
                                                                                            hasEmbeds
                                                                                                ? ' messages_body_with_post'
                                                                                                : ''
                                                                                        }`}
                                                                                    >
                                                                                        <MessageContent
                                                                                            text={
                                                                                                message.text
                                                                                            }
                                                                                            className="messages_text"
                                                                                            deleted={
                                                                                                isDeleted
                                                                                            }
                                                                                            onLayoutChange={
                                                                                                scrollIfPinned
                                                                                            }
                                                                                        />

                                                                                        <div className="messages_meta">
                                                                                            <span className="messages_time">
                                                                                                {format_time(
                                                                                                    message.created_at,
                                                                                                )}
                                                                                            </span>
                                                                                            {message.edited_at ? (
                                                                                                <span className="messages_edited">
                                                                                                    updated
                                                                                                </span>
                                                                                            ) : null}
                                                                                            {isOwn ? (
                                                                                                <MessageStatus
                                                                                                    status={
                                                                                                        message.status
                                                                                                    }
                                                                                                />
                                                                                            ) : null}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </article>
                                                                );
                                                            },
                                                        )}
                                                    </section>
                                                ),
                                            )
                                        )}
                                    </div>

                                    <JumpToLatestButton
                                        visible={
                                            isAwayFromBottom &&
                                            !isChatLoading &&
                                            messagesConversationIdRef.current ===
                                                conversationId
                                        }
                                        onClick={jumpToBottom}
                                    />

                                    <div
                                        className="messages_composer_dock"
                                        ref={composerDockRef}
                                    >
                                        {isSelecting ? (
                                            <div
                                                className="messages_selection_bar app-transition"
                                                role="status"
                                            >
                                                <button
                                                    type="button"
                                                    className="messages_selection_close app-transition app-transition-color"
                                                    onClick={clearSelection}
                                                    aria-label="Cancel selection"
                                                >
                                                    <CrossIcon />
                                                </button>
                                                <p className="messages_selection_count">
                                                    {selectionIds.length === 1
                                                        ? '1 message selected'
                                                        : `${selectionIds.length} messages selected`}
                                                </p>
                                                <div className="messages_selection_actions">
                                                    <button
                                                        type="button"
                                                        className="messages_selection_action app-transition app-transition-color"
                                                        aria-label="Copy selected messages"
                                                        disabled={
                                                            !selectedMessages.length
                                                        }
                                                        onClick={
                                                            handleCopySelection
                                                        }
                                                    >
                                                        <CopyIcon />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="messages_selection_action messages_selection_action_danger app-transition"
                                                        aria-label="Delete selected messages"
                                                        disabled={
                                                            !selectedMessages.length ||
                                                            isDeletingSelection
                                                        }
                                                        onClick={
                                                            handleDeleteSelection
                                                        }
                                                    >
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <form
                                                className={`messages_composer${
                                                    replyTo
                                                        ? ' messages_composer_replying'
                                                        : ''
                                                }${
                                                    editingMessage
                                                        ? ' messages_composer_editing'
                                                        : ''
                                                }${isChatLoading ? ' messages_composer_loading' : ''}`}
                                                onSubmit={(event: any) => {
                                                    event.preventDefault();
                                                    handleSend();
                                                }}
                                            >
                                                <div
                                                    className={`messages_composer_context_slot${
                                                        contextOpen
                                                            ? ' messages_composer_context_slot_open'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="messages_composer_context_clip">
                                                        {contextFrame ? (
                                                            <div
                                                                className={`messages_composer_context${
                                                                    contextFrame.deleted
                                                                        ? ' messages_composer_context_deleted'
                                                                        : ''
                                                                }`}
                                                                onClick={() =>
                                                                    handleReplyPreviewClick(
                                                                        contextFrame.message,
                                                                    )
                                                                }
                                                                role="button"
                                                                tabIndex={
                                                                    contextFrame.deleted
                                                                        ? -1
                                                                        : 0
                                                                }
                                                            >
                                                                <div className="messages_composer_context_body">
                                                                    <span className="messages_composer_context_title">
                                                                        {
                                                                            contextFrame.title
                                                                        }
                                                                    </span>
                                                                    <span className="messages_composer_context_text">
                                                                        {
                                                                            contextFrame.text
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="messages_composer_reply_close app-transition"
                                                                    onClick={(
                                                                        event: any,
                                                                    ) => {
                                                                        event.stopPropagation();
                                                                        contextFrame.onClose();
                                                                    }}
                                                                    aria-label={
                                                                        contextFrame.closeLabel
                                                                    }
                                                                    disabled={
                                                                        isChatLoading
                                                                    }
                                                                >
                                                                    <CrossIcon />
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="messages_composer_body">
                                                    <RichInputField
                                                        preset="social"
                                                        isMultiline
                                                        multilineRows={1}
                                                        length={
                                                            FIELD_LIMITS
                                                                .chatMessage.max
                                                        }
                                                        className="messages_composer_input"
                                                        inputRef={
                                                            composerInputRef
                                                        }
                                                        value={draft}
                                                        onChange={(
                                                            event: any,
                                                        ) => {
                                                            const value =
                                                                event.target
                                                                    .value;
                                                            setDraft(value);
                                                            if (
                                                                !conversationId
                                                            ) {
                                                                return;
                                                            }
                                                            if (
                                                                value.length > 0
                                                            ) {
                                                                typingConversationRef.current =
                                                                    conversationId;
                                                                notifyTyping(
                                                                    conversationId,
                                                                );
                                                                return;
                                                            }
                                                            if (
                                                                typingConversationRef.current ===
                                                                conversationId
                                                            ) {
                                                                typingConversationRef.current =
                                                                    null;
                                                            }
                                                            notifyTypingStop(
                                                                conversationId,
                                                            );
                                                        }}
                                                        onKeyDown={
                                                            handleComposerKeyDown
                                                        }
                                                        placeholder="Message"
                                                        blocked={isChatLoading}
                                                    />
                                                    <PrimaryButton
                                                        type="submit"
                                                        className="messages_composer_send"
                                                        aria-label={
                                                            editingMessage
                                                                ? 'Save'
                                                                : 'Send'
                                                        }
                                                        disabled={
                                                            !draft.trim() ||
                                                            isChatLoading
                                                        }
                                                        isLoading={isSending}
                                                        onMouseDown={(
                                                            event: any,
                                                        ) => {
                                                            event.preventDefault();
                                                        }}
                                                        onTouchStart={(
                                                            event: any,
                                                        ) => {
                                                            event.preventDefault();
                                                        }}
                                                        onTouchEnd={(
                                                            event: any,
                                                        ) => {
                                                            event.preventDefault();
                                                            handleSend();
                                                        }}
                                                    >
                                                        {editingMessage ? (
                                                            <TickIcon />
                                                        ) : (
                                                            <SendIcon />
                                                        )}
                                                    </PrimaryButton>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
            {messageMenu ? (
                <MessageContextMenu
                    x={messageMenu.x}
                    y={messageMenu.y}
                    items={messageMenu.items}
                    onClose={() => setMessageMenu(null)}
                />
            ) : null}
        </div>
    );
};

export const startConversationWithUser = async (
    userId: any,
    navigate: any,
    showToast: any,
) => {
    const result = await createConversation(userId);

    if (!result?.status) {
        showToast?.({
            type: 'error',
            message: result?.message || 'Could not create the conversation',
        });
        return;
    }

    navigate(`/messages/${result.data._id}`);
};

export default MessagesPage;
