'use client';

import './PostsFilters.scss';
import Tabs from '../Ui/Tabs';

const PostsFilters = ({ filters, onSelect }: any) => {
    if (filters.length < 2) {
        return null;
    }

    const active = filters.find((filter: any) => filter.isActive);

    return (
        <div className="posts_filters">
            <Tabs
                label="Feed"
                items={filters.map((filter: any) => ({
                    key: filter._id,
                    title: filter.name,
                }))}
                activeKey={active?._id}
                onChange={onSelect}
            />
        </div>
    );
};

export default PostsFilters;
