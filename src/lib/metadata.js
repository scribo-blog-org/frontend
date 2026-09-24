import {
    SITE_NAME,
    SITE_DESCRIPTION,
    DEFAULT_OG_IMAGE,
    absoluteUrl,
    pageTitle,
} from "@/seo/site";

export function buildMetadata({
    title,
    description = SITE_DESCRIPTION,
    path = "/",
    image,
    noindex = false,
    type = "website",
} = {}) {
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
            type: type === "article" ? "article" : "website",
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

export function privatePageMetadata(title, path) {
    return buildMetadata({ title, path, noindex: true });
}
