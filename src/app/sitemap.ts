import type { MetadataRoute } from 'next';
import { connection } from 'next/server';

import { allEntries } from '@/seo/sitemap-entries';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    await connection();

    return allEntries();
}
