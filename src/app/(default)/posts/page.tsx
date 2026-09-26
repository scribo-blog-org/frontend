import type { Metadata } from "next";

import HomePage from "@/views/HomePage";
import { buildMetadata } from "@/lib/metadata";
import { SITE_DESCRIPTION } from "@/seo/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
    title: "Главная",
    description: SITE_DESCRIPTION,
    path: "/posts",
});

export default function PostsPage() {
    return <HomePage />;
}
