'use client';

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from '@/navigation';
import { AppContext } from '@/providers/AppProviders';

import {
    enablePush,
    getPushPreference,
    isDeviceSubscribed,
    pushSupport,
    registerServiceWorker,
} from '../../utils/push';

import PrimaryButton from '../Ui/PrimaryButton';
import CancelButton from '../Ui/CancelButton';

import NotificationIcon from '../../assets/svg/notification.svg';

import './PushNotifications.scss';

const DISMISSED_KEY = 'push_prompt_dismissed';

const markDismissed = (userId: string) => {
    try {
        localStorage.setItem(`${DISMISSED_KEY}:${userId}`, '1');
    } catch {
        // The prompt simply shows again next visit.
    }
};

const readDismissed = (userId: string) => {
    try {
        return localStorage.getItem(`${DISMISSED_KEY}:${userId}`) === '1';
    } catch {
        return false;
    }
};

const PromptContent = ({
    userId,
    requestCloseModal,
    showToast,
}: {
    userId: string;
    requestCloseModal: () => void;
    showToast: any;
}) => {
    const [loading, setLoading] = useState(false);

    const accept = async () => {
        setLoading(true);
        const result = await enablePush(userId);
        setLoading(false);

        if (result === 'unavailable') {
            showToast({
                type: 'error',
                message: 'Could not turn on notifications',
            });
        }
        requestCloseModal();
    };

    return (
        <div className="push_prompt">
            <div className="push_prompt_icon">
                <NotificationIcon />
            </div>
            <p className="push_prompt_text">
                Know right away when someone writes to you or something new
                happens on your account.
            </p>
            <ul className="push_prompt_list">
                <li>New messages in your chats</li>
                <li>
                    Notifications: likes, comments, replies, mentions, follows
                    and answers to your support requests
                </li>
            </ul>
            <p className="push_prompt_hint">
                Only these two, nothing else. You can turn it off any time in
                Settings.
            </p>
            <div className="push_prompt_actions">
                <CancelButton onClick={requestCloseModal}>Not now</CancelButton>
                <PrimaryButton onClick={accept} isLoading={loading}>
                    Enable
                </PrimaryButton>
            </div>
        </div>
    );
};

const PushNotifications = () => {
    const { profile, showModalWindow, requestCloseModal, showToast } =
        useContext(AppContext);
    const navigate = useNavigate();
    const userId = profile?._id;

    useEffect(() => {
        void registerServiceWorker();

        if (pushSupport() !== 'supported') {
            return;
        }

        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === 'push:navigate') {
                navigate(event.data.url);
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);
        return () =>
            navigator.serviceWorker.removeEventListener('message', onMessage);
    }, [navigate]);

    useEffect(() => {
        if (!userId || pushSupport() !== 'supported') {
            return;
        }

        let cancelled = false;

        const sync = async () => {
            if (getPushPreference(userId) === false) {
                return;
            }

            if (Notification.permission === 'granted') {
                // Re-attach this device to the current account, e.g. after
                // signing in as another user in the same browser.
                if (!(await isDeviceSubscribed())) {
                    await enablePush(userId);
                }
                return;
            }

            if (
                Notification.permission === 'default' &&
                !readDismissed(userId) &&
                !cancelled
            ) {
                showModalWindow({
                    title: 'Turn on notifications?',
                    size: 'small',
                    content: (
                        <PromptContent
                            userId={userId}
                            requestCloseModal={requestCloseModal}
                            showToast={showToast}
                        />
                    ),
                    closeFunc: () => markDismissed(userId),
                });
            }
        };

        void sync();

        return () => {
            cancelled = true;
        };
        // The prompt belongs to the sign-in, not to later context updates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    return null;
};

export default PushNotifications;
