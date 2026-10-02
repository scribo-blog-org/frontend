import AdminPanel from '@/views/AdminPanel';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Admin panel', '/admin-panel');

export default function AdminPanelPage() {
    return <AdminPanel />;
}
