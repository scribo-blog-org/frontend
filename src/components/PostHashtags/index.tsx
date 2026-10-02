'use client';

import { Link } from '@/navigation';

import {
    extractHashtagsFromPost,
    hashtagSearchPath,
} from '../../utils/hashtags';

import './PostHashtags.scss';

const PostHashtags = ({ post, className = '' }: any) => {
    const tags = extractHashtagsFromPost(post);
    if (!tags.length) {
        return null;
    }

    return (
        <ul className={`post_hashtags ${className}`.trim()}>
            {tags.map((tag: any) => (
                <li key={tag.toLowerCase()}>
                    <Link
                        className="hashtag post_hashtags_item"
                        href={hashtagSearchPath(tag)}
                    >
                        {tag}
                    </Link>
                </li>
            ))}
        </ul>
    );
};

export default PostHashtags;
