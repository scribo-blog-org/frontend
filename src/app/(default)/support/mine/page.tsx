import SupportMine from '@/views/Support/Mine';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('My requests', '/support/mine');

export default function SupportMinePage() {
    return <SupportMine />;
}
