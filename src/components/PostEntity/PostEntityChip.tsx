'use client';

import PostIcon from "../../assets/svg/post.svg";

import "./PostEntity.scss";

const PostEntityChip = ({ title, deleted = false, className = "" }: any) => (
    <div
        className={`post_entity_chip${deleted ? " post_entity_chip_deleted" : ""} ${className}`.trim()}
    >
        <PostIcon aria-hidden="true" />
        {deleted ? (
            <span className="post_entity_chip_deleted_label">No longer exists</span>
        ) : (
            <span className="post_entity_chip_title">{title}</span>
        )}
    </div>
);

export default PostEntityChip;
