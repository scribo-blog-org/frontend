'use client';

import './SidebarPage.scss';

import { useSearchParams } from '@/navigation';

import DropDown from '../Ui/DropDown';

const SidebarPage = ({ pages, pageTitle }: any) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const activeKey = searchParams.get('tab') ?? pages[0].key;

    const pageMatchesTab = (page: any, key: any) =>
        page.key === key || (page.aliases || []).includes(key);

    let activePage = pages.findIndex((page: any) =>
        pageMatchesTab(page, activeKey),
    );

    if (activePage === -1) {
        activePage = 0;
    }

    const setPage = (key: any) => {
        setSearchParams({ tab: key }, { replace: true });
    };

    return (
        <div className="sidebar_page">
            <div
                className="sidebar_page_navigation app-transition"
                aria-label={pageTitle}
            >
                <div className="sidebar_page_navigation_list">
                    {pages.map((page: any, index: any) => (
                        <button
                            key={page.key}
                            className={`sidebar_page_navigation_list_item app-transition ${
                                activePage === index
                                    ? 'sidebar_page_navigation_list_item_active'
                                    : ''
                            }`}
                            onClick={() => setPage(page.key)}
                        >
                            {page.icon}
                            <p>{page.title}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="sidebar_page_content app-transition">
                <div className="sidebar_page_content_item app-transition">
                    <div className="sidebar_page_content_item_menu app-transition">
                        <DropDown
                            options={pages.map((page: any) => ({
                                value: page.key,
                                name: page.title,
                                icon: page.icon,
                            }))}
                            value={pages[activePage].key}
                            onChange={setPage}
                        />
                    </div>

                    <h1>{pages[activePage].title}</h1>

                    {pages[activePage].content}
                </div>
            </div>
        </div>
    );
};

export default SidebarPage;
