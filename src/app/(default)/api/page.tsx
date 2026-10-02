import ApiDocs from '@/views/Api';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
    title: 'API',
    description: 'Scribo API documentation.',
    path: '/api',
    noindex: true,
});

export default function ApiDocsPage() {
    return <ApiDocs />;
}
