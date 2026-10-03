'use client';

import './TabsPage.scss';

import { useSearchParams } from '@/navigation';

import Tabs from '../Ui/Tabs';

const TabsPage = ({ pages, label, className = '' }: any) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const requested = searchParams.get('tab') ?? pages[0]?.key;
    const found = pages.findIndex(
        (page: any) =>
            page.key === requested || (page.aliases || []).includes(requested),
    );
    const active = pages[found === -1 ? 0 : found];

    if (!active) {
        return null;
    }

    return (
        <div className={`tabs_page ${className}`.trim()}>
            <Tabs
                label={label}
                items={pages}
                activeKey={active.key}
                onChange={(key: string) =>
                    setSearchParams({ tab: key }, { replace: true })
                }
            />

            <div key={active.key} className="tabs_page_content" role="tabpanel">
                {active.content}
            </div>
        </div>
    );
};

export default TabsPage;
