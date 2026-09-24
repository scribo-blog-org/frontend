import AdminPanel from "@/views/AdminPanel";
import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Админ-панель", "/admin-panel");

export default function AdminPanelPage() {
    return <AdminPanel />;
}
