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

import './PushNotifications.scss';

const DISMISSED_KEY = 'push_prompt_dismissed';

const readDismissed = (userId: string) => {
    try {
        return localStorage.getItem(`${DISMISSED_KEY}:${userId}`) === '1';
    } catch {
        return false;
    }
};

const PushNotifications = () => {
    const { profile } = useContext(AppContext);
    const navigate = useNavigate();
    const [showPrompt, setShowPrompt] = useState(false);
    const [loading, setLoading] = useState(false);
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
                !readDismissed(userId)
            ) {
                if (!cancelled) {
                    setShowPrompt(true);
                }
            }
        };

        void sync();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    const dismiss = () => {
        try {
            localStorage.setItem(`${DISMISSED_KEY}:${userId}`, '1');
        } catch {
            // The prompt simply shows again next visit.
        }
        setShowPrompt(false);
    };

    const accept = async () => {
        if (!userId) return;
        setLoading(true);
        await enablePush(userId);
        setLoading(false);
        dismiss();
    };

    if (!showPrompt) {
        return null;
    }

    return (
        <div className="push_prompt app-transition" role="dialog">
            <div className="push_prompt_copy">
                <p className="push_prompt_title">Turn on notifications?</p>
                <p className="push_prompt_hint">
                    Get new messages and activity even when Scribo is closed.
                    You can change this any time in Settings.
                </p>
            </div>
            <div className="push_prompt_actions">
                <CancelButton onClick={dismiss}>Not now</CancelButton>
                <PrimaryButton onClick={accept} isLoading={loading}>
                    Enable
                </PrimaryButton>
            </div>
        </div>
    );
};

export default PushNotifications;
