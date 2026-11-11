import { notFound } from 'next/navigation';

import Profile from '@/views/Profile';
import { buildMetadata } from '@/lib/metadata';
import { isClientNavigation, loadPublicProfile } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

type ProfileRouteProps = {
    params: Promise<{ id: string }>;
};

function asString(value: unknown) {
    return typeof value === 'string' ? value : '';
}

export async function generateMetadata({ params }: ProfileRouteProps) {
    if (await isClientNavigation()) {
        return {};
    }

    const { id } = await params;
    const result = await loadPublicProfile(id);
    const user = result.status ? result.data?.[0] : null;

    if (!user) {
        return buildMetadata({
            title: 'Profile not found',
            path: `/users/${id}`,
            noindex: true,
        });
    }

    const name = asString(user.nick_name) || asString(user.login) || 'Profile';
    const nick = asString(user.nick_name) || id;

    return buildMetadata({
        title: name,
        description: asString(user.description) || `Profile ${name} on Scribo`,
        path: `/users/${encodeURIComponent(nick)}`,
        image: asString(user.avatar) || undefined,
    });
}

export default async function ProfilePage({ params }: ProfileRouteProps) {
    if (await isClientNavigation()) {
        return <Profile initialUser={null} />;
    }

    const { id } = await params;
    const result = await loadPublicProfile(id);
    const user = result.status ? result.data?.[0] : null;

    if (!user) {
        notFound();
    }

    return <Profile initialUser={user} />;
}
