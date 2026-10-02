import PageNotFound from '@/views/PageNotFound';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
    title: 'Страница не найдена',
    path: '/404',
    noindex: true,
});

export default function NotFoundPage() {
    return <PageNotFound />;
}
