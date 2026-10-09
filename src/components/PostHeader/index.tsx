'use client';

import { useContext, memo, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';

import './PostHeader.scss';

import { deletePost } from '../../api/posts.api';

import ThreeDotsIcon from '../../assets/svg/three-dots.svg';
import EditIcon from '../../assets/svg/edit.svg';
import DeleteIcon from '../../assets/svg/delete.svg';
import WarningIcon from '../../assets/svg/warning-icon.svg';

import { format_back, format_date_time } from '../../utils/format';

import UserBadge from '../UserBadge';
import Popup from '../Ui/Popup';
import { Panel, Banner } from '../Ui';
import ActionButton from '../Ui/ActionButton';
import DangerButton from '../Ui/DangerButton';
import Tooltip from '../Ui/Tooltip/index';
import Category from '../Category';

import Sceleton from '../Ui/Sceleton/Sceleton';
import { mediaUrl } from '../../utils/image';

const DeletePostFooter = ({
    post,
    requestCloseModal,
    onDeletePost,
    showToast,
}: any) => {
    const [isDeleting, setIsDeleting] = useState<any>(false);

    const handleDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            const result = await deletePost(post._id);
            if (result.status) {
                onDeletePost(post._id);
            } else {
                showToast({
                    type: 'error',
                    message: result.message,
                });
            }
            requestCloseModal();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <span>Deleting is permanent</span>
            <div className="modal_window_body_footer_actions">
                <ActionButton disabled={isDeleting} onClick={requestCloseModal}>
                    Cancel
                </ActionButton>
                <DangerButton
                    onClick={handleDelete}
                    isActive={true}
                    isLoading={isDeleting}
                >
                    Delete
                </DangerButton>
            </div>
        </>
    );
};

const getDeleteModalContent = (post: any) => (
    <div className="modal_delete_post_content">
        <Banner tone="danger" icon={<WarningIcon />}>
            This post will be removed and cannot be restored.
        </Banner>
        <Panel>
            <div className="modal_delete_post_content_post">
                <div className="modal_delete_post_content_post_header">
                    <PostHeader post={post} />
                    <Category tag category={post.category} />
                </div>
                <h2 className="modal_delete_post_content_post_title">
                    {post.title}
                </h2>
                {post.featured_image && (
                    <img
                        className="modal_delete_post_content_post_image"
                        src={mediaUrl(post.featured_image)}
                        alt="post_image"
                    />
                )}
            </div>
        </Panel>
    </div>
);

const PostHeader = memo(
    ({
        post,
        onDeletePost,
        className,
        isLoading = false,
        showCategory = false,
    }: any) => {
        const { profile, showModalWindow, requestCloseModal, showToast } =
            useContext(AppContext);
        const navigate = useNavigate();

        const handleDeletePost = async () => {
            showModalWindow({
                title: 'Delete this post?',
                subtitle: 'This action cannot be undone',
                icon: <DeleteIcon />,
                size: 'small',
                content: getDeleteModalContent(post),
                footer: (
                    <DeletePostFooter
                        post={post}
                        requestCloseModal={requestCloseModal}
                        onDeletePost={onDeletePost}
                        showToast={showToast}
                    />
                ),
                showCloseButton: false,
                closeFunc: () => {},
            });
        };

        const popupBody = [
            [
                {
                    title: 'Edit',
                    icon: <EditIcon />,
                    onClick: () => navigate(`/posts/${post._id}/edit`),
                },
            ],
            [
                {
                    title: 'Delete',
                    icon: <DeleteIcon />,
                    type: 'danger',
                    onClick: () => handleDeletePost(),
                },
            ],
        ];

        return (
            <div className={`post_header ${className ?? ''}`}>
                <div className="post_header_left">
                    <Sceleton
                        isLoading={isLoading}
                        rounded={true}
                        className="user_badge"
                    >
                        <UserBadge data={post.author} />
                    </Sceleton>
                    <Sceleton
                        isLoading={isLoading}
                        rounded={true}
                        className="post_header_left_date"
                    >
                        <Tooltip
                            text={format_date_time(post.created_date)}
                            position="bottom"
                        >
                            <p className="post_header_left_date">
                                {format_back(post.created_date)}
                            </p>
                        </Tooltip>
                    </Sceleton>
                    {showCategory ? (
                        isLoading ? (
                            <Sceleton
                                isLoading
                                rounded={true}
                                className="post_header_category"
                            />
                        ) : post.category ? (
                            <Category
                                tag
                                className="post_header_category"
                                category={post.category}
                            />
                        ) : null
                    ) : null}
                </div>
                {!isLoading &&
                ((profile?.permissions.includes('delete_any_post') &&
                    profile?.permissions.includes('edit_any_post')) ||
                    profile?._id === post?.author?._id) ? (
                    <Popup body={popupBody}>
                        <div className="post_header_right app-transition">
                            <ThreeDotsIcon className="article_topic_three_dots" />
                        </div>
                    </Popup>
                ) : (
                    <></>
                )}
            </div>
        );
    },
);

PostHeader.displayName = 'PostHeader';

export default PostHeader;
