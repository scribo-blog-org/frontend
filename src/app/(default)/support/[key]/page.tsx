import SupportRequestPage from "@/views/Support/Request";
import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Обращение", "/support");

export default function SupportRequestRoute() {
    return <SupportRequestPage />;
}
