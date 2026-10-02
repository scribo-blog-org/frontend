import SupportMine from '@/views/Support/Mine';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Мои обращения', '/support/mine');

export default function SupportMinePage() {
    return <SupportMine />;
}
