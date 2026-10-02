import Login from '@/views/Login';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Вход', '/auth/login');

export default function LoginPage() {
    return <Login />;
}
