import PageNotFound from '@/views/PageNotFound';
import DefaultContainer from '@/layouts/DefaultContainer';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
    title: 'Page not found',
    path: '/404',
    noindex: true,
});

export default function NotFound() {
    return (
        <DefaultContainer>
            <PageNotFound />
        </DefaultContainer>
    );
}
