'use client';

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from '@/navigation';
import { AppContext } from '@/providers/AppProviders';

import { captureInstallPrompt, installMode } from '../../utils/install';
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
const INSTALL_DISMISSED_KEY = 'install_prompt_dismissed';

const markDismissed = (userId: string) => {
    try {
        localStorage.setItem(`${DISMISSED_KEY}:${userId}`, '1');
    } catch {
        // The prompt simply shows again next visit.
    }
};

const markInstallDismissed = (userId: string) => {
    try {
        localStorage.setItem(`${INSTALL_DISMISSED_KEY}:${userId}`, '1');
    } catch {
        // The hint simply shows again next visit.
    }
};

const readInstallDismissed = (userId: string) => {
    try {
        return (
            localStorage.getItem(`${INSTALL_DISMISSED_KEY}:${userId}`) === '1'
        );
    } catch {
        return false;
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
        if (loading) return;
        setLoading(true);
        let result: any;
        try {
            result = await enablePush(userId);
        } finally {
            setLoading(false);
        }

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
                <CancelButton disabled={loading} onClick={requestCloseModal}>
                    Not now
                </CancelButton>
                <PrimaryButton onClick={accept} isLoading={loading}>
                    Enable
                </PrimaryButton>
            </div>
        </div>
    );
};

// Safari on iPhone only offers notifications to a site opened from the Home
// Screen, and there is no API to install it, so all we can do is explain.
const InstallHintContent = ({
    requestCloseModal,
}: {
    requestCloseModal: () => void;
}) => (
    <div className="push_prompt">
        <div className="push_prompt_icon">
            <NotificationIcon />
        </div>
        <p className="push_prompt_text">
            To get notifications on iPhone, add Scribo to your Home Screen.
        </p>
        <ol className="push_prompt_list">
            <li>Tap Share in Safari</li>
            <li>Choose Add to Home Screen</li>
            <li>Open Scribo from the new icon and turn on notifications</li>
        </ol>
        <div className="push_prompt_actions">
            <PrimaryButton onClick={requestCloseModal}>Got it</PrimaryButton>
        </div>
    </div>
);

const PushNotifications = () => {
    const { profile, showModalWindow, requestCloseModal, showToast } =
        useContext(AppContext);
    const navigate = useNavigate();
    const userId = profile?._id;

    useEffect(() => {
        captureInstallPrompt();
        void registerServiceWorker();

        if (pushSupport() !== 'supported') {
            return;
        }

        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === 'push:navigate') {
                navigate(event.data.url);
            }

            // The service worker asks before showing a push, because it cannot
            // tell which page this window is on after in-app navigation.
            if (event.data?.type === 'push:where') {
                event.ports[0]?.postMessage({
                    path: window.location.pathname,
                    // A window left behind with Alt+Tab is still "visible",
                    // so focus is what tells that the user is looking at it.
                    visible:
                        document.visibilityState === 'visible' &&
                        document.hasFocus(),
                });
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);
        return () =>
            navigator.serviceWorker.removeEventListener('message', onMessage);
    }, [navigate]);

    useEffect(() => {
        if (
            userId &&
            pushSupport() === 'needs-install' &&
            installMode() === 'ios' &&
            !readInstallDismissed(userId)
        ) {
            showModalWindow({
                title: 'Install Scribo',
                size: 'small',
                content: (
                    <InstallHintContent requestCloseModal={requestCloseModal} />
                ),
                closeFunc: () => markInstallDismissed(userId),
            });
            return;
        }

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
