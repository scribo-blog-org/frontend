'use client';

import { usePathname } from 'next/navigation';

import './PageTransition.scss';

const sectionOf = (pathname: string | null) =>
    (pathname || '/').split('/').filter(Boolean)[0] || '';

export default function PageTransition({
    children,
}: {
    children: React.ReactNode;
}) {
    const section = sectionOf(usePathname());

    return (
        <div key={section} className="page_transition">
            {children}
        </div>
    );
}
