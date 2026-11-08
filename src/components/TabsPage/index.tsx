'use client';

import './TabsPage.scss';

import { useSearchParams } from '@/navigation';

import Tabs from '../Ui/Tabs';

// aside: something that stays at the right end of the tab row on every tab.
const TabsPage = ({ pages, label, aside = null, className = '' }: any) => {
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
            <div className="tabs_page_head">
                <Tabs
                    label={label}
                    items={pages}
                    activeKey={active.key}
                    onChange={(key: string) =>
                        setSearchParams({ tab: key }, { replace: true })
                    }
                />
                {aside ? <div className="tabs_page_aside">{aside}</div> : null}
            </div>

            <div key={active.key} className="tabs_page_content" role="tabpanel">
                {active.content}
            </div>
        </div>
    );
};

export default TabsPage;
