'use client';

import { useNavigate, useParams } from '@/navigation';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/providers/AppProviders';

import PostComposer from '../../components/PostComposer';
import Loading from '../../components/Ui/Loading';
import { getPostById, editPost } from '../../api/posts.api';
import { normalizePostMedia } from '../../utils/postMedia';
import { postErrorMessage } from '../../utils/postErrors';

const EditPost = () => {
    const navigate = useNavigate();
    const { profile, profileLoading, showToast } = useContext(AppContext);
    const { id } = useParams();

    const [post, setPost] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadPost = async () => {
            if (!id) return;

            const result = await getPostById(id);
            if (result?.status === true && result?.data) {
                setPost(result.data);
            }
        };

        loadPost();
    }, [id]);

    useEffect(() => {
        if (profileLoading || !profile || !post?.author) {
            return;
        }

        const authorId = post.author?._id ?? post.author;
        const canEdit =
            profile.permissions?.includes('edit_any_post') ||
            profile._id.toString() === String(authorId);

        if (!canEdit) {
            navigate('/');
        }
    }, [profileLoading, profile, post, navigate]);

    const handleSubmit = async ({ formData, onProgress, signal }: any) => {
        if (submitting) {
            return;
        }

        setSubmitting(true);
        try {
            const result = await editPost(id, formData, { onProgress, signal });

            if (result?.status === true) {
                navigate(`/posts/${id}`);
                showToast({ message: 'Post updated!', type: 'success' });
                return;
            }

            if (result?.aborted) {
                return;
            }

            showToast({
                message: postErrorMessage(result, 'Could not update the post!'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!post) {
        return <Loading size={48} />;
    }

    return (
        <PostComposer
            key={post._id}
            mode="edit"
            initialHtml={post.content_text ?? ''}
            initialMedia={normalizePostMedia(post)}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/posts/${id}`)}
        />
    );
};

export default EditPost;
