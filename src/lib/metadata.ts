import type { Metadata } from "next";

import {
    SITE_NAME,
    SITE_DESCRIPTION,
    DEFAULT_OG_IMAGE,
    absoluteUrl,
    pageTitle,
} from "@/seo/site";

type MetadataInput = {
    title?: string;
    description?: string;
    path?: string;
    image?: string;
    noindex?: boolean;
    type?: "website" | "article";
};

export function buildMetadata({
    title,
    description = SITE_DESCRIPTION,
    path = "/",
    image,
    noindex = false,
    type = "website",
}: MetadataInput = {}): Metadata {
    const canonical = absoluteUrl(path);
    const fullTitle = pageTitle(title);
    const ogImage = image || absoluteUrl(DEFAULT_OG_IMAGE);

    return {
        title: fullTitle,
        description,
        alternates: { canonical },
        robots: noindex
            ? { index: false, follow: false }
            : { index: true, follow: true },
        openGraph: {
            title: fullTitle,
            description,
            url: canonical,
            siteName: SITE_NAME,
            locale: "ru_RU",
            type,
            images: [{ url: ogImage }],
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: fullTitle,
            description,
            images: [ogImage],
        },
    };
}

export function privatePageMetadata(title: string, path: string) {
    return buildMetadata({ title, path, noindex: true });
}
