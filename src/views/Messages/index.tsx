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
    getGroupInvite,
    getMessages,
    joinGroup,
    removeGroupMember,
    markConversationRead,
    sendMessage,
} from '../../api/chat.api';
import { getUsersByIds } from '../../api/users.api';
import { searchUsers } from '../../api/search.api';
import { socketEvents } from '../../sockets/socket.events';
import { socketService } from '../../sockets/socket.service';
import {
    format_list_date,
    format_message_date_label,
    format_time,
    is_same_calendar_day,
} from '../../utils/format';
import { ModalFooter } from '../../components/Ui';
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
import { Banner } from '../../components/Ui/Panel';
import DangerButton from '../../components/Ui/DangerButton';
import Popup from '../../components/Ui/Popup';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import InputField from '../../components/Ui/InputField';
import RichInputField from '../../components/RichInputField';
import MessageContent from '../../components/MessageContent';
import Loading from '../../components/Ui/Loading';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { messagePreviewText, quotePreviewText } from '../../utils/chatMessage';

import CopyIcon from '../../assets/svg/copy.svg';
import ShareIcon from '../../assets/svg/share.svg';
import ReplyIcon from '../../assets/svg/reply.svg';
import PeoplesIcon from '../../assets/svg/peoples.svg';
import DeleteIcon from '../../assets/svg/delete.svg';
import EditIcon from '../../assets/svg/edit.svg';
import CrossIcon from '../../assets/svg/cross-icon.svg';
import ArrowLeftIcon from '../../assets/svg/arrow-left.svg';
import PlusIcon from '../../assets/svg/plus-icon.svg';
import SendIcon from '../../assets/svg/send.svg';
import ThreeDotsIcon from '../../assets/svg/three-dots.svg';
import InfoIcon from '../../assets/svg/info.svg';
import MessageIcon from '../../assets/svg/message.svg';
import LogoutIcon from '../../assets/svg/logout.svg';
import TickIcon from '../../assets/svg/tick.svg';
import TickCircleIcon from '../../assets/svg/tick-circle.svg';
import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import NewMessageIllustration from '../../assets/svg/illustrations/new-message.svg';

import MessageContextMenu from './MessageContextMenu';
import { getMessageActions } from './messageActions';
import {
    CreateGroupForm,
    GroupFace,
    GroupSettings,
    openGroupShareModal,
    JoinGroupPrompt,
    ModalAvatar,
    TypingDots,
    groupListPatch,
    isGroupChat,
} from './groupChat';
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
    is_own:
        !message.system_event && String(message.sender?._id) === String(userId),
});

const mergeMessage = (list: any, message: any) => {
    const index = list.findIndex((item: any) => item._id === message._id);

    if (index === -1) {
        return [...list, message];
    }

    const next = [...list];
    next[index] = {
        ...next[index],
        ...message,
        ...(next[index].status === 'read' ? { status: 'read' } : {}),
    };
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

const SENDER_COLORS = [
    '#e36a6a',
    '#6aa6e3',
    '#5cbf8a',
    '#e3a15a',
    '#b07ae0',
    '#e07ab0',
    '#6ec4c4',
];

const senderColor = (id: any) => {
    const value = String(id || '');
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash + value.charCodeAt(index)) % SENDER_COLORS.length;
    }
    return SENDER_COLORS[hash];
};

const conversationPreview = (item: any) => {
    const text = String(item?.last_message_text || '').trim();
    if (!text) {
        return 'No messages';
    }
    const name = String(item?.last_message_sender_name || '').trim();
    return name ? `${name}: ${text}` : text;
};

const conversationStamp = (date: any) => {
    if (!date) {
        return '';
    }
    return is_same_calendar_day(date, new Date())
        ? format_time(date)
        : format_list_date(date);
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
        <ModalFooter hint="This cannot be undone">
            <ActionButton
                type="button"
                disabled={isDeleting}
                onClick={requestCloseModal}
            >
                Cancel
            </ActionButton>
            <DangerButton
                type="button"
                isActive
                isLoading={isDeleting}
                disabled={disabled}
                onClick={handleDelete}
            >
                Delete
            </DangerButton>
        </ModalFooter>
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
    <div className="messages_delete_modal messages_modal_body">
        <Banner tone="danger">
            {participant
                ? `Conversation with ${participant.nick_name || 'user'} and all messages will be deleted permanently.`
                : 'This group and all messages will be deleted permanently.'}
        </Banner>
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
    // Set while the chat slides out after Back, before the route changes.
    const [isLeavingChat, setIsLeavingChat] = useState<any>(false);
    const leaveTimer = useRef<any>(0);
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [draft, setDraft] = useState<any>('');
    const [replyTo, setReplyTo] = useState<any>(null);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [isListLoading, setIsListLoading] = useState<any>(true);
    const [isChatLoading, setIsChatLoading] = useState<any>(false);
    const [isSending, setIsSending] = useState<any>(false);
    const [startingChatId, setStartingChatId] = useState<any>(null);
    const [messageMenu, setMessageMenu] = useState<any>(null);
    const messageMenuRef = useRef<any>(null);
    messageMenuRef.current = messageMenu;
    const [onlineByUserId, setOnlineByUserId] = useState<any>({});
    const [activityAtByUserId, setActivityAtByUserId] = useState<any>({});
    const [typingByConversationId, setTypingByConversationId] = useState<any>(
        {},
    );
    const [fetchedNickByUserId, setFetchedNickByUserId] = useState<any>({});
    const [conversationFilter, setConversationFilter] = useState('');
    const [foundPeople, setFoundPeople] = useState<any>({
        needle: '',
        users: [],
    });
    const [chatReloadKey, setChatReloadKey] = useState(0);
    const [leavingHeights, setLeavingHeights] = useState<any>({});
    const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);
    const [selectionIds, setSelectionIds] = useState<any>(null);
    const [isDeletingSelection, setIsDeletingSelection] = useState(false);
    const [messageMotion, setMessageMotion] = useState<
        Record<string, 'from' | 'to'>
    >({});

    const conversationIdRef = useRef(conversationId);
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
    const openJoinPromptRef = useRef<any>(() => {});
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

        conversationIdRef.current = conversationId;

        const unsubscribe = socketService.on(
            'chat:conversation',
            (conversation: any) => {
                setConversations((current: any) =>
                    upsertConversationInList(current, conversation),
                );
                if (
                    isGroupChat(conversation) &&
                    String(conversation._id) ===
                        String(conversationIdRef.current)
                ) {
                    void getConversation(conversation._id).then(
                        (result: any) => {
                            if (
                                result?.status &&
                                result.data?.kind === 'group'
                            ) {
                                setActiveConversation(result.data);
                            }
                        },
                    );
                }
            },
        );

        return unsubscribe;
    }, [profile?._id, conversationId]);

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

        const clearTyping = (conversationId: string, userId: string) => {
            const timerKey = `${conversationId}:${userId}`;
            if (timers[timerKey]) {
                clearTimeout(timers[timerKey]);
                delete timers[timerKey];
            }
            setTypingByConversationId((current: any) => {
                const users = current[conversationId];
                if (!users?.[userId]) {
                    return current;
                }
                const nextUsers = { ...users };
                delete nextUsers[userId];
                const next = { ...current };
                if (Object.keys(nextUsers).length) {
                    next[conversationId] = nextUsers;
                } else {
                    delete next[conversationId];
                }
                return next;
            });
        };

        const showTyping = (conversationId: string, userId: string) => {
            const timerKey = `${conversationId}:${userId}`;
            if (timers[timerKey]) {
                clearTimeout(timers[timerKey]);
            }
            setTypingByConversationId((current: any) => {
                const users = current[conversationId] || {};
                if (users[userId]) {
                    return current;
                }
                return {
                    ...current,
                    [conversationId]: { ...users, [userId]: true },
                };
            });
            timers[timerKey] = window.setTimeout(() => {
                delete timers[timerKey];
                clearTyping(conversationId, userId);
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
            const userId = String(payload.user_id);
            if (payload.typing === false) {
                clearTyping(id, userId);
                return;
            }
            showTyping(id, userId);
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
                const inviteResult = await getGroupInvite(conversationId);

                if (cancelled) {
                    return;
                }

                setIsChatLoading(false);

                if (inviteResult?.status && inviteResult.data) {
                    openJoinPromptRef.current(inviteResult.data);
                    return;
                }

                showToast?.({
                    type: 'error',
                    message:
                        conversationResult?.message || 'Conversation not found',
                });
                navigate('/messages');
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
        chatReloadKey,
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

        const closeMenu = () => {
            if (messageMenuRef.current?.source === 'touch') {
                return;
            }

            setMessageMenu(null);
        };
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

    const openMessageMenu = (event: any, items: any, message: any) => {
        if (isSelecting) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (!items.length || !message) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const touch =
            event.source === 'touch' ||
            event.pointerType === 'touch' ||
            window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        const article = document.getElementById(`message_${message._id}`);
        const bubble = article?.querySelector('.messages_bubble');
        const rect = bubble?.getBoundingClientRect();
        const anchor =
            article && rect
                ? {
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                      own: article.classList.contains('messages_item_own'),
                  }
                : null;

        if (
            messageMenuRef.current &&
            String(messageMenuRef.current.messageId) === String(message._id)
        ) {
            return;
        }

        const nextMenu = {
            x: event.clientX,
            y: event.clientY,
            items,
            messageId: message._id,
            source: touch && anchor ? 'touch' : 'mouse',
            anchor,
        };
        messageMenuRef.current = nextMenu;
        setMessageMenu(nextMenu);
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

        // iOS only opens the keyboard when focus happens synchronously inside
        // the user gesture, so the post-render effect alone is not enough.
        composerInputRef.current?.focus({ preventScroll: true });
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

        const focusAtEnd = () => {
            const field = composerInputRef.current;
            if (!field) {
                return;
            }

            field.focus({ preventScroll: true });
            const end = field.value.length;
            field.setSelectionRange(end, end);
        };

        const frame = requestAnimationFrame(() => {
            focusAtEnd();
            requestAnimationFrame(focusAtEnd);
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
        const clear = () => {
            const field = composerInputRef.current;
            if (field && document.activeElement === field) {
                return;
            }

            window.getSelection()?.removeAllRanges();
        };

        clear();
        requestAnimationFrame(clear);
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

    const handleMessageTouchStart = (
        event: any,
        actionItems: any,
        message: any,
    ) => {
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
                    source: 'touch',
                },
                actionItems,
                message,
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
                // The text changes in the thread right away and goes back to the
                // original, with the draft restored, if the server refuses.
                const original = editingMessage;
                setMessages((current: any) =>
                    current.map((item: any) =>
                        item._id === original._id
                            ? {
                                  ...item,
                                  text,
                                  edited_at:
                                      item.edited_at ||
                                      new Date().toISOString(),
                              }
                            : item,
                    ),
                );
                setEditingMessage(null);
                setDraft('');
                setIsSending(true);
                let result;
                try {
                    result = await editMessage(original._id, { text });
                } finally {
                    setIsSending(false);
                }

                if (!result?.status) {
                    setMessages((current: any) =>
                        current.map((item: any) =>
                            item._id === original._id
                                ? {
                                      ...item,
                                      text: original.text,
                                      edited_at: original.edited_at ?? null,
                                  }
                                : item,
                        ),
                    );
                    setEditingMessage(original);
                    setDraft(text);
                    showToast?.({
                        type: 'error',
                        message:
                            result?.message || 'Could not edit the message',
                    });
                    return;
                }

                upsertMessage(result.data);
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
                        last_message_sender_name:
                            result.data?.sender?.nick_name ||
                            profile.nick_name ||
                            '',
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

            let result;
            try {
                result = await sendMessage(conversationId, {
                    text,
                    replyTo: replyTo?._id,
                });
            } finally {
                setIsSending(false);
            }

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
                                  status:
                                      item.status === 'read' ? 'read' : 'sent',
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
                    last_message_sender_name:
                        result.data?.sender?.nick_name ||
                        profile.nick_name ||
                        '',
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

    // Puts messages back after a refused delete: they were already animating
    // out, so cancel that and re-insert whatever has been removed meanwhile,
    // in time order.
    const restoreMessages = (restored: any[]) => {
        const ids = restored.map((item: any) => String(item._id));

        ids.forEach((id: any) => {
            deletedMessageIdsRef.current.delete(id);
            leavingIdsRef.current.delete(id);
        });
        setLeavingHeights((current: any) => {
            if (!ids.some((id: any) => id in current)) {
                return current;
            }

            const next = { ...current };
            ids.forEach((id: any) => delete next[id]);
            return next;
        });
        setMessages((current: any) => {
            const next = [...current];

            restored.forEach((message: any) => {
                if (next.some((item: any) => item._id === message._id)) {
                    return;
                }

                const at = new Date(message.created_at).getTime();
                const index = next.findIndex(
                    (item: any) => new Date(item.created_at).getTime() > at,
                );
                next.splice(index === -1 ? next.length : index, 0, message);
            });

            return next;
        });
    };

    // The message starts leaving at once; a failed request brings it back.
    const handleDelete = async (messageId: any) => {
        const message = messages.find(
            (item: any) => String(item._id) === String(messageId),
        );

        beginMessageLeave(messageId);

        const result = await deleteMessage(messageId);
        if (!result?.status) {
            if (message) {
                restoreMessages([message]);
            }
            showToast?.({
                type: 'error',
                message: result?.message || 'Could not delete the message',
            });
        }
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

        const removed = messages.filter((item: any) =>
            ids.includes(String(item._id)),
        );

        ids.forEach((id: any) => beginMessageLeave(id));
        clearSelection();

        setIsDeletingSelection(true);
        let result;
        try {
            result = await deleteMessages(ids);
        } finally {
            setIsDeletingSelection(false);
        }

        if (!result?.status) {
            restoreMessages(removed);
            showToast?.({
                type: 'error',
                message: result?.message || 'Could not delete the messages',
            });
        }
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
    const groupChat =
        isGroupChat(activeConversation) || isGroupChat(activeListItem);
    const groupItem = isGroupChat(activeConversation)
        ? activeConversation
        : activeListItem;
    const isGroupAdmin = groupItem?.my_role === 'admin';
    const groupMembers = Array.isArray(groupItem?.members)
        ? groupItem.members
        : [];
    const groupCount = groupMembers.length || groupItem?.member_count || 0;
    const groupOnline = groupMembers.filter(
        (member: any) => onlineByUserId[String(member._id)],
    ).length;
    const visibleConversations = useMemo(() => {
        const needle = conversationFilter
            .trim()
            .replace(/^@/, '')
            .toLowerCase();

        if (!needle) {
            return conversations;
        }

        return conversations.filter((item: any) =>
            (isGroupChat(item)
                ? item.title || 'Group'
                : item.participant?.nick_name || ''
            )
                .toLowerCase()
                .includes(needle),
        );
    }, [conversations, conversationFilter]);

    const peopleNeedle = conversationFilter.trim().replace(/^@/, '');

    useEffect(() => {
        if (peopleNeedle.length < 2) {
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            const users = await searchUsers(peopleNeedle);

            if (!cancelled) {
                setFoundPeople({
                    needle: peopleNeedle,
                    users: Array.isArray(users) ? users : [],
                });
            }
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [peopleNeedle]);

    const startChatWith = async (userId: any) => {
        if (startingChatId) {
            return;
        }

        setStartingChatId(userId);
        try {
            await startConversationWithUser(userId, navigate, showToast);
            setConversationFilter('');
        } finally {
            setStartingChatId(null);
        }
    };

    const peopleToStart = useMemo(() => {
        if (foundPeople.needle !== peopleNeedle) {
            return [];
        }

        const known = new Set(
            conversations
                .filter((item: any) => !isGroupChat(item))
                .map((item: any) => String(item.participant?._id)),
        );

        return foundPeople.users.filter(
            (user: any) =>
                user?._id &&
                String(user._id) !== String(profile?._id) &&
                !known.has(String(user._id)),
        );
    }, [foundPeople, peopleNeedle, conversations, profile?._id]);

    const knownNickByUserId = useMemo(() => {
        const map: Record<string, string> = {};

        conversations.forEach((item: any) => {
            const other = item.participant;
            if (other?._id && other?.nick_name) {
                map[String(other._id)] = other.nick_name;
            }
        });

        (activeConversation?.members || []).forEach((member: any) => {
            if (member?._id && member?.nick_name) {
                map[String(member._id)] = member.nick_name;
            }
        });

        return map;
    }, [conversations, activeConversation]);

    const typingUserIds = useMemo(() => {
        const ids = new Set<string>();

        Object.values(typingByConversationId).forEach((users: any) =>
            Object.keys(users || {}).forEach((id) => ids.add(id)),
        );

        return [...ids];
    }, [typingByConversationId]);

    useEffect(() => {
        const missing = typingUserIds.filter(
            (id) => !knownNickByUserId[id] && !fetchedNickByUserId[id],
        );

        if (!missing.length) {
            return;
        }

        let cancelled = false;

        void getUsersByIds(missing).then((users: any) => {
            if (cancelled || !Array.isArray(users) || !users.length) {
                return;
            }

            setFetchedNickByUserId((current: any) => {
                const next = { ...current };
                users.forEach((user: any) => {
                    if (user?._id) {
                        next[String(user._id)] = user.nick_name || 'Someone';
                    }
                });
                return next;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [typingUserIds, knownNickByUserId, fetchedNickByUserId]);

    const typingNamesFor = useCallback(
        (id: any) =>
            Object.keys(typingByConversationId[String(id)] || {})
                .map(
                    (userId) =>
                        knownNickByUserId[userId] ||
                        fetchedNickByUserId[userId] ||
                        'Someone',
                )
                .join(', '),
        [typingByConversationId, knownNickByUserId, fetchedNickByUserId],
    );

    const groupTypingNames = typingNamesFor(conversationId);

    const groupMemberIds = (activeConversation?.members || [])
        .map((member: any) => String(member._id))
        .join(',');

    const watchedUserIds = useMemo(() => {
        const ids = conversations
            .map((item: any) => item.participant?._id)
            .filter(Boolean)
            .map(String);

        if (participant?._id) {
            ids.push(String(participant._id));
        }

        groupMemberIds
            .split(',')
            .filter(Boolean)
            .forEach((id: string) => ids.push(id));

        return [...new Set(ids)];
    }, [conversations, participant?._id, groupMemberIds]);

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
            (userId: any, online: any, at: any) => {
                if (cancelled) {
                    return;
                }
                setOnlineByUserId((current: any) => ({
                    ...current,
                    [userId]: online,
                }));
                if (at) {
                    setActivityAtByUserId((current: any) => ({
                        ...current,
                        [userId]: at,
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

    const applyGroupUpdate = useCallback((detail: any) => {
        setActiveConversation(detail);
        setConversations((current: any) =>
            upsertConversationInList(
                current,
                groupListPatch(
                    detail,
                    current.find((item: any) => item._id === detail._id),
                ),
            ),
        );
    }, []);

    const openCreateGroup = useCallback(() => {
        showModalWindow({
            title: 'New group',
            subtitle: 'Add a name, a photo and people',
            icon: <PeoplesIcon />,
            size: 'small',
            showCloseButton: true,
            closeFunc: () => {},
            content: (
                <CreateGroupForm
                    profileId={profile?._id}
                    showToast={showToast}
                    onClose={requestCloseModal}
                    onCreated={(detail: any) => {
                        applyGroupUpdate(detail);
                        navigate(`/messages/${detail._id}`);
                    }}
                />
            ),
        });
    }, [
        showModalWindow,
        profile?._id,
        showToast,
        requestCloseModal,
        applyGroupUpdate,
        navigate,
    ]);

    const openGroupSettingsRef = useRef<any>(() => {});

    const openGroupSettings = useCallback(() => {
        const group = activeConversation;
        if (!isGroupChat(group)) {
            return;
        }

        showModalWindow({
            title: group.title || 'Group',
            hideHeader: true,
            size: 'small',
            showCloseButton: true,
            closeFunc: () => {},
            content: (
                <GroupSettings
                    conversation={group}
                    profileId={profile?._id}
                    showToast={showToast}
                    showModalWindow={showModalWindow}
                    onClose={requestCloseModal}
                    onUpdated={applyGroupUpdate}
                    onLeft={removeConversationFromState}
                    onBackToInfo={() => openGroupSettingsRef.current?.()}
                />
            ),
        });
    }, [
        activeConversation,
        showModalWindow,
        profile?._id,
        showToast,
        requestCloseModal,
        applyGroupUpdate,
        removeConversationFromState,
    ]);

    useEffect(() => {
        openGroupSettingsRef.current = openGroupSettings;
    }, [openGroupSettings]);

    const openJoinPrompt = useCallback(
        (invite: any) => {
            let accepted = false;

            showModalWindow({
                title: invite?.title || 'Join this chat?',
                subtitle: `Invitation · ${Number(invite?.member_count) || 0} people`,
                icon: <ModalAvatar src={invite?.photo} />,
                size: 'small',
                showCloseButton: false,
                closeFunc: () => {
                    if (!accepted) {
                        navigate('/messages');
                    }
                },
                content: (
                    <JoinGroupPrompt
                        invite={invite}
                        onDecline={requestCloseModal}
                        onAccept={async () => {
                            const result = await joinGroup(invite._id);

                            if (!result?.status) {
                                showToast?.({
                                    type: 'error',
                                    message:
                                        result?.message ||
                                        'Could not join the chat',
                                });
                                return;
                            }

                            accepted = true;
                            requestCloseModal();
                            applyGroupUpdate(result.data);
                            setChatReloadKey((current) => current + 1);
                        }}
                    />
                ),
            });
        },
        [
            showModalWindow,
            requestCloseModal,
            navigate,
            showToast,
            applyGroupUpdate,
        ],
    );

    useEffect(() => {
        openJoinPromptRef.current = openJoinPrompt;
    }, [openJoinPrompt]);

    const openDeleteChatModal = useCallback(() => {
        if (!conversationId || !profile) {
            return;
        }

        showModalWindow({
            title: 'Delete chat?',
            subtitle: participant
                ? `With ${participant.nick_name || 'user'}`
                : 'Group chat',
            icon: <DeleteIcon />,
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

    useEffect(() => {
        if (!conversationId) {
            window.clearTimeout(leaveTimer.current);
            setIsLeavingChat(false);
        }
    }, [conversationId]);

    useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

    // The chat slides out first; the route changes once it is off screen.
    const closeChat = () => {
        if (isLeavingChat) {
            return;
        }

        setIsLeavingChat(true);
        leaveTimer.current = window.setTimeout(
            () => navigate('/messages'),
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 0
                : 300,
        );
    };

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
                className={`messages_layout${conversationId ? ' messages_layout_chat' : ''}${isLeavingChat ? ' messages_layout_leaving' : ''}`}
            >
                <aside className="messages_sidebar">
                    <div className="messages_sidebar_head">
                        <h1 className="messages_title">Messages</h1>
                        <button
                            type="button"
                            className="messages_new_group app-transition"
                            onClick={openCreateGroup}
                            aria-label="New group"
                        >
                            <PlusIcon />
                        </button>
                    </div>
                    <InputField
                        className="messages_sidebar_search"
                        type="text"
                        placeholder="Search"
                        value={conversationFilter}
                        onChange={(event: any) =>
                            setConversationFilter(event.target.value)
                        }
                    />
                    {isListLoading ? (
                        <Loading size={32} />
                    ) : visibleConversations.length || peopleToStart.length ? (
                        <ul className="messages_conversation_list">
                            {visibleConversations.map((item: any) => (
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
                                            {isGroupChat(item) ? (
                                                <GroupFace item={item} />
                                            ) : (
                                                <UserBadge
                                                    data={item.participant}
                                                    asLink={false}
                                                />
                                            )}
                                            {isGroupChat(item) ? null : (
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
                                                    activityAt={
                                                        activityAtByUserId[
                                                            String(
                                                                item.participant
                                                                    ?._id,
                                                            )
                                                        ]
                                                    }
                                                    isTyping={Boolean(
                                                        typingByConversationId[
                                                            String(item._id)
                                                        ],
                                                    )}
                                                    typingNames={typingNamesFor(
                                                        item._id,
                                                    )}
                                                    className="messages_activity_status"
                                                />
                                            )}
                                        </div>
                                        <div className="messages_conversation_copy">
                                            {isGroupChat(item) &&
                                            typingByConversationId[
                                                String(item._id)
                                            ] ? (
                                                <p className="messages_conversation_preview messages_conversation_typing">
                                                    <TypingDots />
                                                    <span className="messages_conversation_typing_names">
                                                        {typingNamesFor(
                                                            item._id,
                                                        )}
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className="messages_conversation_preview">
                                                    {conversationPreview(item)}
                                                </p>
                                            )}
                                            <div className="messages_conversation_row">
                                                {item.last_message_at ? (
                                                    <span className="messages_conversation_time">
                                                        {conversationStamp(
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
                            {peopleToStart.length ? (
                                <li className="messages_people_head">
                                    <span
                                        className="messages_people_rule"
                                        aria-hidden="true"
                                    />
                                    <p>People</p>
                                </li>
                            ) : null}
                            {peopleToStart.map((user: any) => (
                                <li
                                    key={`person-${user._id}`}
                                    className="messages_people_item"
                                >
                                    <UserBadge data={user} asLink={false} />
                                    <button
                                        type="button"
                                        className="messages_people_start app-transition"
                                        disabled={Boolean(startingChatId)}
                                        onClick={() =>
                                            void startChatWith(user._id)
                                        }
                                    >
                                        <MessageIcon />
                                        <span>Start chat</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="messages_empty_hint">
                            {conversationFilter.trim()
                                ? 'Nothing found for this search.'
                                : 'No conversations yet. Start one from a the user profile.'}
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
                                <NewMessageIllustration className="app-transition" />
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
                                        onClick={closeChat}
                                        aria-label="Back"
                                    >
                                        <ArrowLeftIcon />
                                    </button>
                                    {groupChat ? (
                                        <button
                                            type="button"
                                            className="messages_chat_head_user messages_group_open"
                                            onClick={openGroupSettings}
                                        >
                                            <GroupFace
                                                item={groupItem}
                                                stats={`${groupCount} people, ${groupOnline} online`}
                                                typing={groupTypingNames}
                                            />
                                        </button>
                                    ) : participant ? (
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
                                                activityAt={
                                                    activityAtByUserId[
                                                        String(participant._id)
                                                    ]
                                                }
                                                isTyping={Boolean(
                                                    typingByConversationId[
                                                        String(conversationId)
                                                    ],
                                                )}
                                                typingNames={groupTypingNames}
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
                                    body={
                                        groupChat
                                            ? [
                                                  [
                                                      {
                                                          title: 'Group info',
                                                          icon: <InfoIcon />,
                                                          onClick:
                                                              openGroupSettings,
                                                      },
                                                      {
                                                          title: 'Share',
                                                          icon: <ShareIcon />,
                                                          onClick: () =>
                                                              openGroupShareModal(
                                                                  {
                                                                      group: activeConversation,
                                                                      showModalWindow,
                                                                      showToast,
                                                                      onClose:
                                                                          requestCloseModal,
                                                                      onBackToInfo:
                                                                          undefined,
                                                                  },
                                                              ),
                                                      },
                                                  ],
                                                  [
                                                      {
                                                          title: 'Leave group',
                                                          icon: <LogoutIcon />,
                                                          type: 'danger',
                                                          onClick: () => {
                                                              void (async () => {
                                                                  const result =
                                                                      await removeGroupMember(
                                                                          conversationId,
                                                                          profile._id,
                                                                      );
                                                                  if (
                                                                      !result?.status
                                                                  ) {
                                                                      showToast?.(
                                                                          {
                                                                              type: 'error',
                                                                              message:
                                                                                  result?.message ||
                                                                                  'Could not leave the group',
                                                                          },
                                                                      );
                                                                      return;
                                                                  }
                                                                  removeConversationFromState(
                                                                      conversationId,
                                                                  );
                                                              })();
                                                          },
                                                      },
                                                      ...(isGroupAdmin
                                                          ? [
                                                                {
                                                                    title: 'Delete group',
                                                                    icon: (
                                                                        <DeleteIcon />
                                                                    ),
                                                                    type: 'danger',
                                                                    onClick:
                                                                        openDeleteChatModal,
                                                                },
                                                            ]
                                                          : []),
                                                  ],
                                              ]
                                            : [
                                                  [
                                                      {
                                                          title: 'Delete chat',
                                                          icon: <DeleteIcon />,
                                                          type: 'danger',
                                                          onClick:
                                                              openDeleteChatModal,
                                                      },
                                                  ],
                                              ]
                                    }
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
                                        }${
                                            messageMenu?.source === 'touch'
                                                ? ' messages_list_menu_touch'
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
                                                                if (
                                                                    message.system_event
                                                                ) {
                                                                    return (
                                                                        <p
                                                                            key={
                                                                                message._id
                                                                            }
                                                                            id={`message_${message._id}`}
                                                                            className="messages_system"
                                                                        >
                                                                            {
                                                                                message.text
                                                                            }
                                                                        </p>
                                                                    );
                                                                }

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
                                                                        }${
                                                                            messageMenu?.source !==
                                                                                'touch' &&
                                                                            String(
                                                                                messageMenu?.messageId,
                                                                            ) ===
                                                                                String(
                                                                                    message._id,
                                                                                )
                                                                                ? ' messages_item_menu_target'
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
                                                                                message,
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
                                                                                message,
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
                                                                            <div
                                                                                className={`messages_bubble_wrap${
                                                                                    groupChat &&
                                                                                    !isOwn
                                                                                        ? ' messages_bubble_wrap_incoming'
                                                                                        : ''
                                                                                }`}
                                                                            >
                                                                                {groupChat &&
                                                                                !isOwn &&
                                                                                !isDeleted ? (
                                                                                    <UserBadge
                                                                                        data={
                                                                                            message.sender
                                                                                        }
                                                                                        avatarOnly
                                                                                        asLink={
                                                                                            false
                                                                                        }
                                                                                        className="messages_group_avatar"
                                                                                    />
                                                                                ) : null}
                                                                                <div className="messages_bubble_column">
                                                                                    {groupChat &&
                                                                                    !isOwn &&
                                                                                    !isDeleted ? (
                                                                                        <span
                                                                                            className="messages_sender"
                                                                                            style={{
                                                                                                color: senderColor(
                                                                                                    message
                                                                                                        .sender
                                                                                                        ?._id,
                                                                                                ),
                                                                                            }}
                                                                                        >
                                                                                            {message
                                                                                                .sender
                                                                                                ?.nick_name ||
                                                                                                'User'}
                                                                                        </span>
                                                                                    ) : null}
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
                                                    className="messages_selection_close app-transition"
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
                                                        className="messages_selection_action app-transition"
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
            <MessageContextMenu
                menu={messageMenu}
                onClose={() => setMessageMenu(null)}
            />
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
