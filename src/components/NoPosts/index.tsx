'use client';

import ActionButton from '../Ui/ActionButton';

import './NoPosts.scss';

type NoPostsProps = {
    title?: string;
    hint?: string;
    action?: { label: string; onClick: () => void } | null;
};

// Empty list of posts: a short title, one line of help and, when there is
// something the viewer can do about it, a single action.
const NoPosts = ({
    title = 'No posts yet',
    hint,
    action = null,
}: NoPostsProps) => (
    <div className="no_posts">
        <p className="no_posts_title">{title}</p>
        {hint ? <p className="no_posts_hint">{hint}</p> : null}
        {action ? (
            <ActionButton onClick={action.onClick}>{action.label}</ActionButton>
        ) : null}
    </div>
);

export default NoPosts;
