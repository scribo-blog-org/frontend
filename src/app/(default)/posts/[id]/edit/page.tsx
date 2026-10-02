import EditPost from '@/views/EditPost';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Editing', '/');

export default function EditPostPage() {
    return <EditPost />;
}
