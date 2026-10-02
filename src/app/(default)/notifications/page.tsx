import Notifications from '@/views/Notifications';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Notifications', '/notifications');

export default function NotificationsPage() {
    return <Notifications />;
}
