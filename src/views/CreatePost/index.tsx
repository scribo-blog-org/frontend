'use client';

import { useNavigate } from '@/navigation';
import { useContext, useEffect, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';

import PostComposer from '../../components/PostComposer';
import { createPost } from '../../api/posts.api';
import { postErrorMessage } from '../../utils/postErrors';

const CreatePost = () => {
    const navigate = useNavigate();
    const { profile, profileLoading, showToast } = useContext(AppContext);
    const [initialized, setInitialized] = useState<any>(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (initialized) {
            if (
                !profileLoading &&
                (!profile || !profile.permissions.includes('create_post'))
            ) {
                navigate('/');
            }
        } else {
            setInitialized(true);
        }
    }, [profileLoading, initialized, profile, navigate]);

    const handleSubmit = async ({ formData, onProgress, signal }: any) => {
        if (submitting) {
            return;
        }

        setSubmitting(true);
        try {
            const result = await createPost(formData, { onProgress, signal });

            if (result?.status === true) {
                navigate('/');
                showToast({ message: 'Published!', type: 'success' });
                return;
            }

            if (result?.aborted) {
                return;
            }

            showToast({
                message: postErrorMessage(result, 'Could not create the post!'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PostComposer
            mode="create"
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/')}
        />
    );
};

export default CreatePost;
