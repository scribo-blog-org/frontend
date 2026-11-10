'use client';

import './PostsFilters.scss';
import ChipButton from '../Ui/ChipButton';

const PostsFilters = ({ filters, onSelect }: any) => {
    if (filters.length < 2) {
        return null;
    }

    return (
        <div className="posts_filters">
            {filters.map((filter: any) => (
                <ChipButton
                    key={filter._id}
                    variant="quiet"
                    isActive={filter.isActive}
                    onClick={() => onSelect(filter._id)}
                >
                    {filter.name}
                </ChipButton>
            ))}
        </div>
    );
};

export default PostsFilters;
