import { Suspense } from "react";
import "@fontsource/geist";

import AppProviders from "@/providers/AppProviders";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, getSiteOrigin } from "@/seo/site";

import "@/styles/common.scss";

const THEME_BOOT_SCRIPT = `(function(){var isDark=true;try{var stored=localStorage.getItem("theme");if(stored!==null)isDark=JSON.parse(stored);}catch(e){}var html=document.documentElement;html.style.backgroundColor=isDark?"#161616":"#f1f1f1";html.style.colorScheme=isDark?"dark":"light";html.classList.toggle("dark-theme",isDark);if(document.body){document.body.classList.toggle("dark-theme",isDark);}})();`;

export const metadata = {
    metadataBase: new URL(getSiteOrigin()),
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    icons: {
        icon: "/favicon.ico",
        apple: "/logo192.png",
    },
    manifest: "/manifest.json",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
        },
    },
    openGraph: {
        type: "website",
        siteName: SITE_NAME,
        locale: "ru_RU",
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: absoluteUrl("/"),
    },
    twitter: {
        card: "summary",
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
    },
    verification: {
        google: "DTQfYT7mIYFPFnKk3UInD6ltH9cjE3S7aNtQ1oOZdJI",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#1e1e1e",
};

export default function RootLayout({ children }) {
    return (
        <html lang="ru" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
                <Suspense fallback={null}>
                    <AppProviders>{children}</AppProviders>
                </Suspense>
            </body>
        </html>
    );
}
