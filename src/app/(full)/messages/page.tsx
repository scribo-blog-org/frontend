import Messages from '@/views/Messages';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Сообщения', '/messages');

export default function MessagesPage() {
    return <Messages />;
}
