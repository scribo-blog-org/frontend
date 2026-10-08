export type InstallMode = 'installed' | 'prompt' | 'ios' | 'none';

type InstallEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: InstallEvent | null = null;
let installed = false;
let listening = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const isIos = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    // iPadOS reports a desktop Safari user agent, only the touch points give
    // it away.
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
};

export const isStandalone = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
};

// The browser fires `beforeinstallprompt` once, early in the page load, so the
// listener has to exist before any screen that offers the install.
export const captureInstallPrompt = () => {
    if (listening || typeof window === 'undefined') {
        return;
    }
    listening = true;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferred = event as InstallEvent;
        notify();
    });

    window.addEventListener('appinstalled', () => {
        deferred = null;
        installed = true;
        notify();
    });
};

export const subscribeInstall = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const installMode = (): InstallMode => {
    if (installed || isStandalone()) {
        return 'installed';
    }

    if (deferred) {
        return 'prompt';
    }

    return isIos() ? 'ios' : 'none';
};

export const promptInstall = async () => {
    if (!deferred) {
        return false;
    }

    const event = deferred;
    deferred = null;
    notify();

    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === 'accepted';
};
