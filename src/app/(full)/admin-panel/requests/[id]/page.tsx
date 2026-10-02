import RequestDetailPage from '@/views/AdminPanel/RequestDetail';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Request', '/admin-panel');

export default function AdminRequestDetailPage() {
    return <RequestDetailPage />;
}
