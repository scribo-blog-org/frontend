'use client';

import PostPreview from '../PostPreview';

import PostEntityChip from './PostEntityChip';

const PostMessageCard = ({ post, className = '', onMediaLoad }: any) => {
    if (!post?._id) {
        return <PostEntityChip deleted className={className} />;
    }

    return (
        <PostPreview
            post={post}
            href={`/posts/${post._id}`}
            media="top"
            className={`post_message_card ${className}`.trim()}
            onMediaLoad={onMediaLoad}
        />
    );
};

export default PostMessageCard;
