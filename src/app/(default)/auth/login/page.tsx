import Login from '@/views/Login';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Sign-in', '/auth/login');

export default function LoginPage() {
    return <Login />;
}
