import Register from '@/views/Register';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Sign up', '/auth/register');

export default function RegisterPage() {
    return <Register />;
}
