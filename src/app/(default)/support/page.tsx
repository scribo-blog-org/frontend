import Support from '@/views/Support';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
    title: 'Support',
    description: 'Contact the Scribo team.',
    path: '/support',
});

export default function SupportPage() {
    return <Support />;
}
