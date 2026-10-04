import { notFound } from 'next/navigation';

import JoinChat from '@/views/JoinChat';
import { buildMetadata } from '@/lib/metadata';
import { serverGet } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

type ChatInviteRouteProps = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ChatInviteRouteProps) {
    const { id } = await params;
    const result = await serverGet<{
        title?: string;
        description?: string;
        photo?: string | null;
    }>(`/api/chat/conversations/${id}/invite`);
    const group = result.status ? result.data : null;

    if (!group) {
        return buildMetadata({
            title: 'Chat not found',
            path: `/chats/${id}`,
            noindex: true,
        });
    }

    return buildMetadata({
        title: group.title || 'Group',
        description: group.description || `Join ${group.title || 'this group'}`,
        path: `/chats/${id}`,
        image: group.photo || undefined,
    });
}

export default async function ChatInvitePage({ params }: ChatInviteRouteProps) {
    const { id } = await params;
    const result = await serverGet(`/api/chat/conversations/${id}/invite`);

    if (!result.status || !result.data) {
        notFound();
    }

    return <JoinChat conversationId={id} />;
}
