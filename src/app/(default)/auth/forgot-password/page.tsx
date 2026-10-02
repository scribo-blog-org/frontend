import ForgotPassword from '@/views/ForgotPassword';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata(
    'Password reset',
    '/auth/forgot-password',
);

export default function ForgotPasswordPage() {
    return <ForgotPassword />;
}
