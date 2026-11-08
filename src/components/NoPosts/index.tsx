'use client';

import './NoPosts.scss';

// Empty list of posts: just the big faint title, nothing under it.
const NoPosts = ({ title = 'No posts yet' }: { title?: string }) => (
    <div className="no_posts">
        <p className="no_posts_title">{title}</p>
    </div>
);

export default NoPosts;
