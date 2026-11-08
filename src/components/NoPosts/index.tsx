'use client';

import './NoPosts.scss';

const NoPosts = ({ title = 'No posts yet' }: { title?: string }) => (
    <div className="no_posts">
        <p className="no_posts_title">{title}</p>
    </div>
);

export default NoPosts;
