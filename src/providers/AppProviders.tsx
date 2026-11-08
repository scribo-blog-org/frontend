'use client';

import {
    createContext,
    Suspense,
    useCallback,
    useEffect,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import { usePathname } from 'next/navigation';
import { GoogleOAuthProvider } from '@react-oauth/google';

import AppLayout from '../layouts/AppLayout';
import AppShell from '../layouts/AppShell';
import PageLayout from '../layouts/PageLayout';

import ModalWindow from '../components/Ui/ModalWindow';
import Footer from '../components/Footer';
import Toast from '../components/Ui/Toast';
import MobileNavigationBar from '../components/MobileNavigationBar';
import ScrollToTop from '../components/ScrollToTop';

import { publicEnv } from '../config/publicEnv';
import { ACCENT_COLOR, CATEGORY_COLORS } from '../styles/constants';
import {
    getAccessToken,
    setAccessToken,
    subscribeAccessToken,
} from '../api/http';
import SessionBootstrap from '../session/SessionBootstrap';
import PushNotifications from '../components/PushNotifications';
import {
    SYSTEM_DARK_FALLBACK,
    getSystemDarkQuery,
    readStoredThemeMode,
    resolveIsDark,
    storeThemeMode,
    type ThemeMode,
} from '../theme/themeMode';

export type AppContextValue = {
    profile: any;
    setProfile: Dispatch<SetStateAction<any>>;
    // What is on screen right now, after resolving "system".
    isDarkTheme: boolean;
    // What the viewer chose: follow the device, or force light or dark.
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    profileLoading: boolean;
    setProfileLoading: Dispatch<SetStateAction<boolean>>;
    toast: any;
    showToast: Dispatch<SetStateAction<any>>;
    modalWindow: any;
    showModalWindow: Dispatch<SetStateAction<any>>;
    requestCloseModal: () => void;
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
};

export const AppContext = createContext<AppContextValue>(
    null as unknown as AppContextValue,
);

function AppModals({
    modalWindow,
    showModalWindow,
    modalCloseRequest,
}: {
    modalWindow: unknown;
    showModalWindow: Dispatch<SetStateAction<unknown>>;
    modalCloseRequest: number;
}) {
    const pathname = usePathname();

    return (
        <ModalWindow
            modalWindow={modalWindow}
            showModalWindow={showModalWindow}
            modalCloseRequest={modalCloseRequest}
            dismissKey={pathname}
        />
    );
}

function AppFooter() {
    const pathname = usePathname() || '';

    if (
        pathname.startsWith('/messages') ||
        pathname.startsWith('/admin-panel')
    ) {
        return null;
    }

    return <Footer />;
}

function AppChrome({
    children,
    hasSession,
    modalWindow,
    showModalWindow,
    modalCloseRequest,
    toast,
    showToast,
}: {
    children: React.ReactNode;
    hasSession: boolean;
    modalWindow: unknown;
    showModalWindow: Dispatch<SetStateAction<unknown>>;
    modalCloseRequest: number;
    toast: unknown;
    showToast: Dispatch<SetStateAction<unknown>>;
}) {
    return (
        <div className="App" id="app-root">
            <AppLayout>
                <AppModals
                    modalWindow={modalWindow}
                    showModalWindow={showModalWindow}
                    modalCloseRequest={modalCloseRequest}
                />
                <SessionBootstrap hasSession={hasSession}>
                    <AppShell>
                        <div className="app-shell_content">
                            <div className="app-shell_body">
                                <PageLayout>{children}</PageLayout>
                                <AppFooter />
                            </div>
                        </div>
                        <MobileNavigationBar />
                        <PushNotifications />
                    </AppShell>
                </SessionBootstrap>
                <Toast toast={toast} showToast={showToast} />
            </AppLayout>
        </div>
    );
}

export default function AppProviders({
    children,
    hasSession = false,
}: {
    children: React.ReactNode;
    hasSession?: boolean;
}) {
    const [profile, setProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState<any>(true);
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [systemDark, setSystemDark] = useState<boolean>(SYSTEM_DARK_FALLBACK);
    const [themeReady, setThemeReady] = useState<boolean>(false);
    const [toast, showToast] = useState<any>(false);
    const [modalWindow, showModalWindow] = useState<any>(false);
    const [modalCloseRequest, setModalCloseRequest] = useState<any>(0);
    const [accessToken, setAccessTokenState] = useState<any>(getAccessToken());
    const requestCloseModal = () =>
        setModalCloseRequest((count: any) => count + 1);

    const isDarkTheme = resolveIsDark(themeMode, systemDark);

    // The choice is saved only when the viewer makes it, never as a side
    // effect of the device switching, so "system" keeps following the device.
    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        storeThemeMode(mode);
    }, []);

    useEffect(() => {
        const query = getSystemDarkQuery();

        setThemeModeState(readStoredThemeMode());
        setSystemDark(query ? query.matches : SYSTEM_DARK_FALLBACK);
        setThemeReady(true);

        if (!query) {
            return;
        }

        const onChange = (event: MediaQueryListEvent) =>
            setSystemDark(event.matches);

        query.addEventListener('change', onChange);

        return () => query.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        return subscribeAccessToken(setAccessTokenState);
    }, []);

    useEffect(() => {
        if (!themeReady) {
            return;
        }

        const body = document.body;
        const changed = body.classList.contains('dark-theme') !== isDarkTheme;

        if (changed) {
            // Transitions stay off until the new theme has been painted.
            body.classList.add('theme-switching');
            body.classList.toggle('dark-theme', isDarkTheme);
            requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                    body.classList.remove('theme-switching'),
                ),
            );
        }

        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', isDarkTheme ? '#1e1e1e' : '#ffffff');
    }, [isDarkTheme, themeReady]);

    useEffect(() => {
        Object.values(CATEGORY_COLORS).forEach((color: any) => {
            document.body.style.setProperty(
                color.variable,
                isDarkTheme ? color.dark : color.light,
            );
        });

        document.body.style.setProperty(
            ACCENT_COLOR.variable,
            isDarkTheme ? ACCENT_COLOR.dark : ACCENT_COLOR.light,
        );
    }, [isDarkTheme]);

    return (
        <AppContext.Provider
            value={{
                profile,
                setProfile,
                isDarkTheme,
                themeMode,
                setThemeMode,
                profileLoading,
                setProfileLoading,
                toast,
                showToast,
                modalWindow,
                showModalWindow,
                requestCloseModal,
                accessToken,
                setAccessToken,
            }}
        >
            <GoogleOAuthProvider
                clientId={publicEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID')}
            >
                <Suspense fallback={null}>
                    <ScrollToTop />
                    <AppChrome
                        hasSession={hasSession}
                        modalWindow={modalWindow}
                        showModalWindow={showModalWindow}
                        modalCloseRequest={modalCloseRequest}
                        toast={toast}
                        showToast={showToast}
                    >
                        {children}
                    </AppChrome>
                </Suspense>
            </GoogleOAuthProvider>
        </AppContext.Provider>
    );
}
