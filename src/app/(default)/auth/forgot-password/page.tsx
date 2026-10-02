import ForgotPassword from '@/views/ForgotPassword';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata(
    'Сброс пароля',
    '/auth/forgot-password',
);

export default function ForgotPasswordPage() {
    return <ForgotPassword />;
}
