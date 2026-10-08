'use client';

import {
    createContext,
    Suspense,
    useEffect,
    useRef,
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

export type AppContextValue = {
    profile: any;
    setProfile: Dispatch<SetStateAction<any>>;
    isDarkTheme: boolean;
    setIsDarkTheme: Dispatch<SetStateAction<boolean>>;
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
    const [isDarkTheme, setIsDarkTheme] = useState<any>(true);
    const [toast, showToast] = useState<any>(false);
    const [modalWindow, showModalWindow] = useState<any>(false);
    const [modalCloseRequest, setModalCloseRequest] = useState<any>(0);
    const [accessToken, setAccessTokenState] = useState<any>(getAccessToken());
    const requestCloseModal = () =>
        setModalCloseRequest((count: any) => count + 1);
    const skipThemePersist = useRef(true);

    useEffect(() => {
        let dark = true;

        try {
            const stored = localStorage.getItem('theme');

            if (stored !== null) {
                dark = JSON.parse(stored);
            }
        } catch {}

        setIsDarkTheme(dark);
        document.body.classList.toggle('dark-theme', dark);
    }, []);

    useEffect(() => {
        return subscribeAccessToken(setAccessTokenState);
    }, []);

    useEffect(() => {
        if (skipThemePersist.current) {
            skipThemePersist.current = false;
            return;
        }

        localStorage.setItem('theme', JSON.stringify(isDarkTheme));

        // Transitions stay off until the new theme has been painted.
        document.body.classList.add('theme-switching');
        document.body.classList.toggle('dark-theme', isDarkTheme);
        requestAnimationFrame(() =>
            requestAnimationFrame(() =>
                document.body.classList.remove('theme-switching'),
            ),
        );

        const metaThemeColor = document.querySelector(
            'meta[name="theme-color"]',
        );

        metaThemeColor?.setAttribute(
            'content',
            isDarkTheme ? '#1e1e1e' : '#ffffff',
        );
    }, [isDarkTheme]);

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
                setIsDarkTheme,
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
