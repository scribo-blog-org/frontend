import Settings from '@/views/Settings';
import { privatePageMetadata } from '@/lib/metadata';

export const metadata = privatePageMetadata('Settings', '/settings');

export default function SettingsPage() {
    return <Settings />;
}
