'use client';

import { createContext, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { publicEnv } from "../config/publicEnv";

import DefaultContainer from "../layouts/DefaultContainer";
import FullContainer from "../layouts/FullContainer";
import AppLayout from "../layouts/AppLayout";
import AppShell from "../layouts/AppShell";
import PageLayout from "../layouts/PageLayout";

import ModalWindow from "../components/Ui/ModalWindow";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Toast from "../components/Ui/Toast";
import MobileNavigationBar from "../components/MobileNavigationBar";
import ScrollToTop from "../components/ScrollToTop";
import RouteSeo from "../components/Seo/RouteSeo";

import { ACCENT_COLOR, CATEGORY_COLORS } from "../styles/constants";
import { getAccessToken, setAccessToken, subscribeAccessToken } from "../api/http";
import SessionBootstrap from "../session/SessionBootstrap";

export const AppContext = createContext();

const FULL_PATHS = ["/messages", "/settings", "/admin-panel"];

function isFullContainerPath(pathname) {
    return FULL_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function AppModals({ modalWindow, showModalWindow, modalCloseRequest }) {
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
    const pathname = usePathname() || "";

    if (pathname.startsWith("/messages")) {
        return null;
    }

    return <Footer />;
}

function AppChrome({ children, modalWindow, showModalWindow, modalCloseRequest, toast, showToast }) {
    const pathname = usePathname() || "";
    const Container = isFullContainerPath(pathname) ? FullContainer : DefaultContainer;

    return (
        <div className="App" id="app-root">
            <AppLayout>
                <AppModals
                    modalWindow={modalWindow}
                    showModalWindow={showModalWindow}
                    modalCloseRequest={modalCloseRequest}
                />
                <SessionBootstrap>
                    <AppShell>
                        <Header />
                        <div className="app-shell_content">
                            <PageLayout>
                                <Container>
                                    {children}
                                </Container>
                            </PageLayout>
                            <AppFooter />
                        </div>
                        <MobileNavigationBar />
                        <Toast toast={toast} showToast={showToast} />
                    </AppShell>
                </SessionBootstrap>
            </AppLayout>
        </div>
    );
}

export default function AppProviders({ children }) {
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [toast, showToast] = useState(false);
    const [modalWindow, showModalWindow] = useState(false);
    const [modalCloseRequest, setModalCloseRequest] = useState(0);
    const [accessToken, setAccessTokenState] = useState(getAccessToken());
    const requestCloseModal = () => setModalCloseRequest((count) => count + 1);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("theme");

            if (stored !== null) {
                setIsDarkTheme(JSON.parse(stored));
            }
        } catch {
            // keep default dark theme
        }
    }, []);

    useEffect(() => {
        return subscribeAccessToken(setAccessTokenState);
    }, []);

    useEffect(() => {
        localStorage.setItem("theme", JSON.stringify(isDarkTheme));
        document.body.classList.toggle("dark-theme", isDarkTheme);
        document.documentElement.classList.toggle("dark-theme", isDarkTheme);

        const metaThemeColor = document.querySelector('meta[name="theme-color"]');

        metaThemeColor?.setAttribute(
            "content",
            isDarkTheme ? "#1e1e1e" : "#ffffff",
        );
    }, [isDarkTheme]);

    useEffect(() => {
        Object.values(CATEGORY_COLORS).forEach((color) => {
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
            <GoogleOAuthProvider clientId={publicEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")}>
                <Suspense fallback={null}>
                    <ScrollToTop />
                    <RouteSeo />
                    <AppChrome
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
