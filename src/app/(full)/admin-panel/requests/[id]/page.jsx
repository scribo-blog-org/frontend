import RequestDetailPage from "@/views/AdminPanel/RequestDetail";
import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Запрос", "/admin-panel");

export default function AdminRequestDetailPage() {
    return <RequestDetailPage />;
}
