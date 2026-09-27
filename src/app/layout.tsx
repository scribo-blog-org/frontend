import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import "@fontsource/geist";

import { publicEnvBootScript } from "@/config/publicEnv";
import AppProviders from "@/providers/AppProviders";
import { JsonLd } from "@/seo/json-ld";
import { RouteJsonLd } from "@/seo/route-json-ld";
import {
    BRAND_LOGO,
    SITE_DESCRIPTION,
    SITE_NAME,
    absoluteUrl,
    getSiteOrigin,
} from "@/seo/site";

import "@/styles/common.scss";

const THEME_BOOT_SCRIPT = `(function(){var isDark=true;try{var stored=localStorage.getItem("theme");if(stored!==null)isDark=JSON.parse(stored);}catch(e){}var html=document.documentElement;html.style.backgroundColor=isDark?"#161616":"#f1f1f1";html.style.colorScheme=isDark?"dark":"light";html.classList.toggle("dark-theme",isDark);if(document.body){document.body.classList.toggle("dark-theme",isDark);}})();`;

export async function generateMetadata(): Promise<Metadata> {
    await connection();
    const origin = getSiteOrigin();
    const ogImage = absoluteUrl("/og.png");

    return {
        metadataBase: new URL(origin),
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        applicationName: SITE_NAME,
        icons: {
            icon: [
                { url: "/favicon.ico", sizes: "48x48" },
                { url: "/icon.svg", type: "image/svg+xml" },
            ],
            apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
            url: absoluteUrl("/posts"),
            images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
        },
        twitter: {
            card: "summary_large_image",
            title: SITE_NAME,
            description: SITE_DESCRIPTION,
            images: [ogImage],
        },
        verification: {
            google: "0AOL3OU8f4tNR79qSyuUsyz8GSd0T1kAtNeGo7GKnnY",
        },
    };
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#1e1e1e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    await connection();
    const origin = getSiteOrigin();
    const hasSession = Boolean((await cookies()).get("refresh_token")?.value);

    return (
        <html lang="ru" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <JsonLd
                    data={{
                        "@context": "https://schema.org",
                        "@graph": [
                            {
                                "@type": "WebSite",
                                name: SITE_NAME,
                                url: origin,
                                description: SITE_DESCRIPTION,
                                inLanguage: "ru",
                                potentialAction: {
                                    "@type": "SearchAction",
                                    target: `${origin}/search?q={search_term_string}`,
                                    "query-input": "required name=search_term_string",
                                },
                            },
                            {
                                "@type": "Organization",
                                name: SITE_NAME,
                                url: origin,
                                logo: absoluteUrl(BRAND_LOGO),
                            },
                        ],
                    }}
                />
                <RouteJsonLd />
                <script dangerouslySetInnerHTML={{ __html: publicEnvBootScript() }} />
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
                <Suspense fallback={null}>
                    <AppProviders hasSession={hasSession}>{children}</AppProviders>
                </Suspense>
            </body>
        </html>
    );
}
