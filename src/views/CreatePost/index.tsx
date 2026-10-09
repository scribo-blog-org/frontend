'use client';

import { useNavigate } from '@/navigation';
import { useContext, useEffect, useState, useMemo } from 'react';

import { AppContext } from '@/providers/AppProviders';

import DropFile from '../../components/Ui/DropFile/index';
import InputFiled from '../../components/Ui/InputField';
import TextEditorField from '../../components/Ui/TextEditorField';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import DangerButton from '../../components/Ui/DangerButton';
import SearchSelect from '../../components/Ui/SearchSelect/index';
import Field from '../../components/Ui/Field/index';

import { CATEGORY_COLORS } from '../../styles/constants';

import { getCategories } from '../../api/categories.api';
import { createPost } from '../../api/posts.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';

import './CreatePost.scss';

const CreatePost = () => {
    const navigate = useNavigate();
    const { profile, profileLoading, showToast } = useContext(AppContext);
    const [initialized, setInitialized] = useState<any>(false);
    const [createResult, setCreateResult] = useState<any>({});
    const [errors, setErrors] = useState<any>({});
    const [allCategories, setAllCategories] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState<any>(false);

    const [fields, setFields] = useState<any>({
        postTitle: '',
        postContent: '',
        featuredImage: null,
        categoryId: '',
    });

    const titlePlaceholder = useMemo(() => {
        const titleExamples = [
            'A sudden gasoline shortage',
            'Five ways money moves through crypto',
            'Another look at Mars found nothing, and everyone was fine with that',
            'A report from the front line',
            'A committee cancelled itself',
            'Toxis got so well known that even his own parents started to recognize him',
            'Researchers found a correlation between a bread run and a new baby in young families',
            'A plan replaced the previous plan',
            'They found someone to blame. It was the previous person they blamed',
            'At the bottom of the Mariana Trench they finally found the bottom, and then something knocked from below',
            'A poll says 90% agree with something they were never asked about',
        ];

        return titleExamples[Math.floor(Math.random() * titleExamples.length)];
    }, []);

    const add_errors_to_image = (new_errors: any) => {
        const updated_errors = { ...errors };

        if (!updated_errors.featuredImage) {
            updated_errors.featuredImage = [];
        }

        for (const new_error of new_errors) {
            updated_errors.featuredImage.push(new_error);
        }
        setErrors(updated_errors);
    };

    const clear_errors_from_image = () => {
        const updated_errors = { ...errors };

        if (updated_errors.featuredImage) {
            delete updated_errors.featuredImage;
        }

        setErrors(updated_errors);
    };

    useEffect(() => {
        const load = async () => {
            if (initialized) {
                if (
                    !profileLoading &&
                    (!profile || !profile.permissions.includes('create_post'))
                ) {
                    navigate('/');
                }
            } else {
                setInitialized(true);

                const categories_result = await getCategories();

                if (categories_result?.status === true) {
                    for (const category of categories_result.data) {
                        category.className =
                            CATEGORY_COLORS[category.color]?.className;
                        category.value = category._id;
                    }
                    setAllCategories(categories_result.data);
                }
            }
        };

        load();
    }, [profileLoading, initialized, profile, navigate]);

    const handleClick = () => {
        const other = { ...errors };
        delete other.featuredImage;
        setErrors(other);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (isLoading) {
            return;
        }
        const next: any = {};
        const title = (fields.postTitle || '').trim();
        if (title.length < FIELD_LIMITS.postTitle.min) {
            next.postTitle = 'Enter a title';
        } else if (title.length > FIELD_LIMITS.postTitle.max) {
            next.postTitle = `Title must be at most ${FIELD_LIMITS.postTitle.max} characters`;
        }
        if (!(fields.postContent || '').trim()) {
            next.postContent = 'Enter the post text';
        } else if (fields.postContent.length > FIELD_LIMITS.postContent.max) {
            next.postContent = `Text must be at most ${FIELD_LIMITS.postContent.max} characters`;
        }
        if (Object.keys(next).length) {
            setErrors((prev: any) => ({ ...prev, ...next }));
            return;
        }
        setIsLoading(true);
        let result;
        try {
            result = await create_post(fields.postTitle);
        } finally {
            setIsLoading(false);
        }
        setCreateResult(result);
    };

    const handleFocus = (fieldName: any) => {
        const other = { ...errors };
        delete other[fieldName];
        setErrors(other);
    };

    const create_post = async (title: any) => {
        const formData = new FormData();
        formData.append('postTitle', title);
        formData.append('postContent', fields.postContent);
        formData.append('featuredImage', fields.featuredImage);
        formData.append('categoryId', fields.categoryId);

        const result = await createPost(formData);

        if (result.status === true) {
            navigate('/');
            showToast({ message: 'Published!', type: 'success' });
            return result;
        } else {
            showToast({ message: 'Could not create the post!', type: 'error' });
            if (result?.errors?.body) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(result.errors.body).map(
                            ([field, obj]: any) => [field, obj.message],
                        ),
                    ),
                );
            }
            console.log(result);
            return result;
        }
    };

    return (
        <form className="create_post" onSubmit={handleSubmit}>
            <Field error={errors?.postTitle} title={'Title'}>
                <InputFiled
                    placeholder={titlePlaceholder}
                    className={
                        'create_post_title' +
                        (createResult.status === 'error' &&
                        createResult.message === "Incorrect 'title'"
                            ? ' incorrect_field'
                            : '')
                    }
                    isMultiline={true}
                    multilineRows={1}
                    onChange={(e: any) =>
                        setFields({ ...fields, postTitle: e.target.value })
                    }
                    onFocus={() => handleFocus('postTitle')}
                    length={FIELD_LIMITS.postTitle.max}
                    error={errors?.postTitle}
                    disabled={isLoading}
                />
            </Field>
            <Field error={errors?.categoryId} title={'Category'}>
                <SearchSelect
                    value={fields.categoryId}
                    onSetValue={(value: any) =>
                        setFields((prev: any) => ({
                            ...prev,
                            categoryId: value,
                        }))
                    }
                    onFocus={() => handleFocus('categoryId')}
                    error={errors?.categoryId}
                    placeholder={'Choose a category'}
                    options={allCategories}
                    disabled={isLoading}
                />
            </Field>
            <DropFile
                value={fields.featuredImage}
                setValue={(file: any) =>
                    setFields({ ...fields, featuredImage: file })
                }
                dropFileType={'image/*'}
                fileTypes={'SVG, PNG, JPEG, JPG, and others'}
                errors={errors?.featuredImage}
                addNewErrors={add_errors_to_image}
                clearErrors={clear_errors_from_image}
                onRemove={handleClick}
                disabled={isLoading}
            />
            <Field error={errors?.postContent} title={'Post text'}>
                <TextEditorField
                    onFocus={() => handleFocus('postContent')}
                    onChange={(html: any) =>
                        setFields({ ...fields, postContent: html })
                    }
                    error={errors?.postContent}
                    disabled={isLoading}
                />
            </Field>
            <div className="create_post_buttons">
                <PrimaryButton onClick={handleSubmit} isLoading={isLoading}>
                    Create post
                </PrimaryButton>
                <DangerButton
                    disabled={isLoading}
                    onClick={() => navigate('/')}
                >
                    Cancel
                </DangerButton>
            </div>
        </form>
    );
};

export default CreatePost;
