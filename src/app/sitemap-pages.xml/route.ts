import { connection } from 'next/server';

import { allEntries } from '@/seo/sitemap-entries';
import type { SitemapEntry } from '@/seo/sitemap-entries';

export const dynamic = 'force-dynamic';

function escapeXml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function renderEntry(entry: SitemapEntry) {
    const lines = [`    <loc>${escapeXml(entry.url)}</loc>`];

    if (entry.lastModified) {
        lines.push(
            `    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`,
        );
    }

    if (entry.changeFrequency) {
        lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
    }

    if (typeof entry.priority === 'number') {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }

    for (const image of entry.images || []) {
        lines.push(
            `    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`,
        );
    }

    return `  <url>\n${lines.join('\n')}\n  </url>`;
}

export async function GET() {
    await connection();

    const entries = await allEntries();
    const body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...entries.map(renderEntry),
        '</urlset>',
    ].join('\n');

    return new Response(body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=3600',
        },
    });
}
