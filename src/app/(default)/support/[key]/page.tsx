import SupportRequestPage from '@/views/Support/Request';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Request', '/support');

export default function SupportRequestRoute() {
    return <SupportRequestPage />;
}
