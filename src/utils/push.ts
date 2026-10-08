import { isIos } from './install';
import {
    deletePushSubscription,
    getPushKey,
    hasPushSubscription,
    savePushSubscription,
} from '../api/push.api';

const PREFERENCE_KEY = 'push_enabled';

// The choice belongs to the account, not the browser: signing in as another
// user on the same device must not inherit it.
export const getPushPreference = (userId: string): boolean | null => {
    try {
        const value = localStorage.getItem(`${PREFERENCE_KEY}:${userId}`);
        return value === null ? null : value === '1';
    } catch {
        return null;
    }
};

const setPushPreference = (userId: string, enabled: boolean) => {
    try {
        localStorage.setItem(
            `${PREFERENCE_KEY}:${userId}`,
            enabled ? '1' : '0',
        );
    } catch {
        // The preference falls back to the browser permission alone.
    }
};

export type PushSupport = 'supported' | 'needs-install' | 'unsupported';

export const pushSupport = (): PushSupport => {
    if (typeof window === 'undefined') {
        return 'unsupported';
    }

    if (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    ) {
        return 'supported';
    }

    return isIos() ? 'needs-install' : 'unsupported';
};

const urlBase64ToUint8Array = (base64: string) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

export const registerServiceWorker = async () => {
    if (pushSupport() !== 'supported') {
        return null;
    }

    try {
        return await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
        console.error('Service worker registration failed', error);
        return null;
    }
};

const currentSubscription = async () => {
    const registration = await registerServiceWorker();
    if (!registration) {
        return null;
    }
    await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
};

export const isDeviceSubscribed = async () => {
    if (
        pushSupport() !== 'supported' ||
        Notification.permission !== 'granted'
    ) {
        return false;
    }

    const subscription = await currentSubscription();
    return subscription ? hasPushSubscription(subscription.endpoint) : false;
};

export const enablePush = async (
    userId: string,
): Promise<'enabled' | 'denied' | 'unavailable'> => {
    if (pushSupport() !== 'supported') {
        return 'unavailable';
    }

    const permission =
        Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;

    if (permission !== 'granted') {
        return 'denied';
    }

    const key = await getPushKey();
    const registration = await registerServiceWorker();
    if (!key || !registration) {
        return 'unavailable';
    }
    await navigator.serviceWorker.ready;

    const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key),
        }));

    const saved = await savePushSubscription(subscription.toJSON());
    if (saved) {
        setPushPreference(userId, true);
    }
    return saved ? 'enabled' : 'unavailable';
};

// Detaches this device from the account without recording a choice, so the
// next sign-in can offer or restore notifications again.
export const releasePush = async () => {
    const subscription = await currentSubscription();
    if (!subscription) {
        return;
    }

    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
};

export const disablePush = async (userId: string) => {
    setPushPreference(userId, false);
    await releasePush();
};
