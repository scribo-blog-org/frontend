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
    follow?: boolean;
    type?: "website" | "article";
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
};

export function buildMetadata({
    title,
    description = SITE_DESCRIPTION,
    path = "/",
    image,
    noindex = false,
    follow = !noindex,
    type = "website",
    publishedTime,
    modifiedTime,
    authors,
}: MetadataInput = {}): Metadata {
    const canonical = absoluteUrl(path);
    const fullTitle = pageTitle(title);
    const ogImage = image || absoluteUrl(DEFAULT_OG_IMAGE);
    const usingBrandImage = !image;

    return {
        title: fullTitle,
        description,
        alternates: noindex ? undefined : { canonical },
        robots: noindex
            ? { index: false, follow }
            : {
                  index: true,
                  follow: true,
                  googleBot: {
                      index: true,
                      follow: true,
                      "max-image-preview": "large",
                      "max-snippet": -1,
                      "max-video-preview": -1,
                  },
              },
        openGraph: {
            title: fullTitle,
            description,
            url: canonical,
            siteName: SITE_NAME,
            locale: "ru_RU",
            type,
            images: [
                {
                    url: ogImage,
                    alt: fullTitle,
                    ...(usingBrandImage ? { width: 1200, height: 630 } : {}),
                },
            ],
            ...(type === "article"
                ? {
                      publishedTime,
                      modifiedTime,
                      authors,
                  }
                : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            images: [ogImage],
        },
    };
}

export function privatePageMetadata(title: string, path: string) {
    return buildMetadata({ title, path, noindex: true });
}
