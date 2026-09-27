import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { absoluteUrl, getSiteOrigin } from "@/seo/site";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
    await connection();

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/admin-panel",
                "/settings",
                "/messages",
                "/notifications",
                "/create-post",
                "/posts/*/edit",
                "/auth/",
                "/support/mine",
                "/support/",
                "/api",
                "/health",
                "/status",
                "/404",
            ],
        },
        sitemap: absoluteUrl("/sitemap.xml"),
        host: getSiteOrigin(),
    };
}
