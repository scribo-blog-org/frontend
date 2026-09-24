import { notFound } from "next/navigation";

import Profile from "@/views/Profile";
import { buildMetadata } from "@/lib/metadata";
import { fetchUserByNick } from "@/lib/server-api";

export async function generateMetadata({ params }) {
    const { id } = await params;
    const result = await fetchUserByNick(id);
    const user = result?.status ? result.data?.[0] : null;

    if (!user) {
        return buildMetadata({
            title: "Профиль не найден",
            path: `/users/${id}`,
            noindex: true,
        });
    }

    const name = user.nick_name || user.login || "Профиль";

    return buildMetadata({
        title: name,
        description: user.about || `Профиль ${name} на Scribo`,
        path: `/users/${user.nick_name || id}`,
        image: user.avatar || undefined,
    });
}

export default async function ProfilePage({ params }) {
    const { id } = await params;
    const result = await fetchUserByNick(id);
    const user = result?.status ? result.data?.[0] : null;

    if (!user) {
        notFound();
    }

    return <Profile initialUser={user} />;
}
