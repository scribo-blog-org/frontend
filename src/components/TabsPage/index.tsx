'use client';

import './TabsPage.scss';

import { useSearchParams } from '@/navigation';

/**
 * Страница с вкладками сверху. Ничего не знает о том, что в вкладках:
 * получает список `pages` ({ key, title, icon, content, aliases }) и рисует
 * активную. Вкладка хранится в адресе (`?tab=...`), поэтому ссылки на неё работают.
 * Страница под панелью занимает всю оставшуюся высоту и сама не прокручивается:
 * вкладка решает, что прокручивать внутри себя, а если не решает, прокручивается
 * область под панелью, и сама панель остаётся на месте.
 */
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
            <div className="tabs_page_bar" role="tablist" aria-label={label}>
                {pages.map((page: any) => (
                    <button
                        key={page.key}
                        type="button"
                        role="tab"
                        aria-selected={page.key === active.key}
                        className={`tabs_page_tab${
                            page.key === active.key
                                ? ' tabs_page_tab_active'
                                : ''
                        }`}
                        onClick={() =>
                            setSearchParams(
                                { tab: page.key },
                                { replace: true },
                            )
                        }
                    >
                        {page.icon}
                        <span>{page.title}</span>
                    </button>
                ))}
            </div>

            <div key={active.key} className="tabs_page_content" role="tabpanel">
                {active.content}
            </div>
        </div>
    );
};

export default TabsPage;
