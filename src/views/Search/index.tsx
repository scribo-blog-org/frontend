'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from '@/navigation';

import { searchSite } from '../../api/search.api';
import InputField from '../../components/Ui/InputField';
import { Panel, PanelRow } from '../../components/Ui';
import { CATEGORY_COLORS } from '../../styles/constants';

import PostPreview from '../../components/PostPreview';
import UserRow from '../../components/UserRow';
import ChevronRightIcon from '../../assets/svg/chevron-right.svg';
import CrossIcon from '../../assets/svg/cross-icon.svg';

import './Search.scss';

const emptyResults = { posts: [], users: [], categories: [] };

const Count = ({ value }: any) => (
    <span className="search_page_group_count">{value}</span>
);

const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlQuery = searchParams.get('q') || '';
    const [value, setValue] = useState<any>(urlQuery);
    const [results, setResults] = useState<any>(emptyResults);
    const [isLoading, setIsLoading] = useState<any>(false);
    const inputRef = useRef<any>(null);
    const requestId = useRef(0);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (document.activeElement === inputRef.current) {
            return;
        }
        setValue(urlQuery);
    }, [urlQuery]);

    useEffect(() => {
        const trimmed = value.trim();
        const handle = window.setTimeout(() => {
            const next = trimmed ? { q: trimmed } : {};
            const current = searchParams.get('q') || '';
            if (current !== trimmed) {
                setSearchParams(next, { replace: true });
            }
        }, 200);

        return () => window.clearTimeout(handle);
    }, [value, searchParams, setSearchParams]);

    useEffect(() => {
        const trimmed = urlQuery.trim();

        if (trimmed.length < 2) {
            setResults(emptyResults);
            setIsLoading(false);
            return;
        }

        const id = ++requestId.current;
        setIsLoading(true);

        const handle = window.setTimeout(async () => {
            const response = await searchSite(trimmed);
            if (id !== requestId.current) {
                return;
            }
            setResults(response?.data || emptyResults);
            setIsLoading(false);
        }, 180);

        return () => window.clearTimeout(handle);
    }, [urlQuery]);

    const hasQuery = urlQuery.trim().length >= 2;
    const people = results.users || [];
    const categories = results.categories || [];
    const posts = results.posts || [];
    const total = people.length + categories.length + posts.length;

    return (
        <div className="search_page">
            <h1>Search</h1>
            <div className="search_page_field">
                <InputField
                    ref={inputRef}
                    type="search"
                    className={value ? 'search_page_input' : ''}
                    value={value}
                    placeholder="Posts, people, categories"
                    length={80}
                    onChange={(event: any) => setValue(event.target.value)}
                    aria-label="Search"
                />
                {value ? (
                    <button
                        type="button"
                        className="search_page_clear app-transition"
                        aria-label="Clear"
                        onClick={() => {
                            setValue('');
                            setSearchParams({}, { replace: true });
                            inputRef.current?.focus();
                        }}
                    >
                        <CrossIcon />
                    </button>
                ) : null}
            </div>
            {!hasQuery ? (
                <p className="search_page_hint">
                    At least two letters — then posts, people, and categories
                    will show up.
                </p>
            ) : isLoading ? (
                <p className="search_page_hint">Searching…</p>
            ) : total === 0 ? (
                <p className="search_page_hint">Nothing found.</p>
            ) : (
                <div className="search_page_groups">
                    {people.length ? (
                        <section className="search_page_group">
                            <Panel
                                title="People"
                                action={<Count value={people.length} />}
                            >
                                {people.map((user: any) => (
                                    <UserRow
                                        key={user._id}
                                        user={user}
                                        status={false}
                                        onClick={() =>
                                            navigate(`/users/${user.nick_name}`)
                                        }
                                        description={
                                            user.description ||
                                            'Profile on the site'
                                        }
                                        trailing={
                                            <ChevronRightIcon
                                                className="search_page_chevron"
                                                aria-hidden="true"
                                            />
                                        }
                                    />
                                ))}
                            </Panel>
                        </section>
                    ) : null}

                    {categories.length ? (
                        <section className="search_page_group">
                            <Panel
                                title="Categories"
                                action={<Count value={categories.length} />}
                            >
                                {categories.map((category: any) => (
                                    <Link
                                        key={category._id}
                                        className="search_page_link"
                                        href={`/posts?filter=${category._id}`}
                                    >
                                        <PanelRow
                                            className="search_page_cat"
                                            title={
                                                <span
                                                    className={`search_page_cat_mark ${CATEGORY_COLORS[category.color]?.className ?? ''}`}
                                                >
                                                    <span
                                                        className="search_page_cat_dot"
                                                        aria-hidden="true"
                                                    />
                                                    {category.name}
                                                </span>
                                            }
                                            trailing={
                                                <>
                                                    <span className="search_page_cat_hint">
                                                        In the feed
                                                    </span>
                                                    <ChevronRightIcon
                                                        className="search_page_chevron"
                                                        aria-hidden="true"
                                                    />
                                                </>
                                            }
                                        />
                                    </Link>
                                ))}
                            </Panel>
                        </section>
                    ) : null}

                    {posts.length ? (
                        <section className="search_page_group">
                            <Panel
                                title="Posts"
                                action={<Count value={posts.length} />}
                            >
                                {posts.map((post: any) => (
                                    <PostPreview
                                        key={post._id}
                                        post={post}
                                        href={`/posts/${post._id}`}
                                        media="side"
                                        showDate
                                    />
                                ))}
                            </Panel>
                        </section>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default SearchPage;
