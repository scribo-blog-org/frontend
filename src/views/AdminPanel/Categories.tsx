'use client';

import './Categories.scss';

import { useEffect, useState, useContext } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';

import { CATEGORY_COLORS } from '../../styles/constants';

import CategoryIcon1 from '../../assets/svg/categories/1.svg';
import CategoryIcon2 from '../../assets/svg/categories/2.svg';
import CategoryIcon3 from '../../assets/svg/categories/3.svg';
import CategoryIcon4 from '../../assets/svg/categories/4.svg';
import CategoryIcon5 from '../../assets/svg/categories/5.svg';
import CategoryIcon6 from '../../assets/svg/categories/6.svg';
import CategoryIcon7 from '../../assets/svg/categories/7.svg';
import CategoryIcon8 from '../../assets/svg/categories/8.svg';
import CategoryIcon9 from '../../assets/svg/categories/9.svg';
import CategoryIcon10 from '../../assets/svg/categories/10.svg';
import CategoryIcon11 from '../../assets/svg/categories/11.svg';
import CategoryIcon12 from '../../assets/svg/categories/12.svg';
import CategoryIcon13 from '../../assets/svg/categories/13.svg';
import CategoryIcon14 from '../../assets/svg/categories/14.svg';
import CategoryIcon15 from '../../assets/svg/categories/15.svg';
import CategoryIcon16 from '../../assets/svg/categories/16.svg';
import CategoryIcon17 from '../../assets/svg/categories/17.svg';
import CategoryIcon18 from '../..//assets/svg/categories/18.svg';
import CategoryIcon19 from '../../assets/svg/categories/19.svg';
import CategoryIcon20 from '../../assets/svg/categories/20.svg';
import CategoryIcon21 from '../../assets/svg/categories/21.svg';
import CategoryIcon22 from '../../assets/svg/categories/22.svg';
import CategoryIcon23 from '../../assets/svg/categories/23.svg';
import CategoryIcon24 from '../../assets/svg/categories/24.svg';
import CategoryIcon25 from '../../assets/svg/categories/25.svg';
import CategoryIcon26 from '../../assets/svg/categories/26.svg';

import RectRoundedIcon from '../../assets/svg/rect-rounded.svg';

import EditIcon from '../../assets/svg/edit.svg';
import DeleteIcon from '../../assets/svg/delete.svg';
import ThreeDotsIcon from '../../assets/svg/three-dots.svg';
import PlusIcon from '../../assets/svg/plus-icon.svg';
import Redirect from '../../assets/svg/redirect.svg';
import ArrowLeftIcon from '../../assets/svg/arrow-left.svg';

import {
    getCategories,
    editCategory,
    deleteCategory,
    createCategory,
} from '../../api/categories.api';
import { FIELD_LIMITS } from '../../constants/fieldLimits';

import DangerButton from '../../components/Ui/DangerButton/index';
import Popup from '../../components/Ui/Popup/index';
import Loading from '../../components/Ui/Loading/index';
import SearchSelect from '../../components/Ui/SearchSelect/index';
import Category from '../../components/Category/index';
import InputField from '../../components/Ui/InputField/index';
import PrimaryButton from '../../components/Ui/PrimaryButton/index';
import ActionButton from '../../components/Ui/ActionButton/index';
import Field from '../../components/Ui/Field/index';

const DeleteCategoryActions = ({
    category,
    closeModal,
    requestCloseModal,
    removeCategory,
    showToast,
}: any) => {
    const requestDelete = async () => {
        // The row leaves the list as the dialog closes; it comes back at its
        // place if the server refuses.
        requestCloseModal();
        const restore = removeCategory(category);

        try {
            const result = await deleteCategory(category._id);

            if (result.status) {
                showToast({
                    type: 'success',
                    message: 'Category deleted!',
                });
            } else {
                restore();
                showToast({
                    type: 'error',
                    message: result.message,
                });
            }
        } catch {
            restore();
            showToast({
                type: 'error',
                message: 'Could not delete the category',
            });
        }
    };

    return (
        <div className="admin_panel_content_categories_page_modal_window_bottom">
            <ActionButton onClick={closeModal}>Cancel</ActionButton>
            <DangerButton onClick={requestDelete} isActive={true}>
                Delete
            </DangerButton>
        </div>
    );
};

const categoryIcons = {
    1: CategoryIcon1,
    2: CategoryIcon2,
    3: CategoryIcon3,
    4: CategoryIcon4,
    5: CategoryIcon5,
    6: CategoryIcon6,
    7: CategoryIcon7,
    8: CategoryIcon8,
    9: CategoryIcon9,
    10: CategoryIcon10,
    11: CategoryIcon11,
    12: CategoryIcon12,
    13: CategoryIcon13,
    14: CategoryIcon14,
    15: CategoryIcon15,
    16: CategoryIcon16,
    17: CategoryIcon17,
    18: CategoryIcon18,
    19: CategoryIcon19,
    20: CategoryIcon20,
    21: CategoryIcon21,
    22: CategoryIcon22,
    23: CategoryIcon23,
    24: CategoryIcon24,
    25: CategoryIcon25,
    26: CategoryIcon26,
} as any;

const EditCategoryPage = ({ active_category, setActivePage }: any) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<any>(true);
    const { showToast } = useContext(AppContext);
    const [initialized, setInitialized] = useState<any>(false);
    const [fetching, setFetching] = useState<any>(false);
    const [errors, setErrors] = useState<any>({});

    const [category, setCategory] = useState<any>({
        name: '',
        icon: '',
        color: '',
        _id: '',
    });

    const [fields, setFields] = useState<any>({
        categoryName: '',
        categoryIcon: null,
        categoryColor: null,
        _id: '',
    });

    const fetchCategories = async () => {
        setIsLoading(true);

        const result = await getCategories();

        setIsLoading(false);

        if (result.status) {
            const preparedCategories = result.data.map((category: any) => {
                category.className =
                    CATEGORY_COLORS[category.color]?.className ?? '';
                category.value = category._id;

                category.iconObject = categoryIcons[category.icon];

                return category;
            });

            setCategories(preparedCategories);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (initialized) return;
        if (!active_category || categories.length === 0) return;

        const selectedCategory = categories.find(
            (category: any) => category._id === active_category,
        );

        if (selectedCategory) {
            setCategory(selectedCategory);
            setInitialized(true);
        }
    }, [active_category, categories, initialized]);

    useEffect(() => {
        setFields({
            categoryName: category?.name ?? '',
            categoryIcon: category?.icon ?? null,
            categoryColor: category?.color ?? null,
            _id: category?._id ?? '',
        });
    }, [category]);

    const doSave = async () => {
        if (fetching) return;
        const name = (fields.categoryName || '').trim();
        if (!name || name.length > FIELD_LIMITS.categoryName.max) {
            setErrors((prev: any) => ({
                ...prev,
                categoryName: !name
                    ? 'Enter a name'
                    : `Name must be at most ${FIELD_LIMITS.categoryName.max} characters`,
            }));
            return;
        }
        setFetching(true);
        let result;
        try {
            result = await editCategory(category._id, {
                categoryName: fields.categoryName,
                categoryIcon: fields.categoryIcon,
                categoryColor: fields.categoryColor,
            });
        } finally {
            setFetching(false);
        }
        if (result.status) {
            const updatedCategory = {
                ...result.data,
                className: CATEGORY_COLORS[result.data.color]?.className ?? '',
                value: result.data._id,
            };

            updatedCategory.iconObject = categoryIcons[updatedCategory.icon];

            setCategory(updatedCategory);

            setCategories((prev: any) =>
                prev.map((category: any) =>
                    category._id === updatedCategory._id
                        ? updatedCategory
                        : category,
                ),
            );

            showToast({
                type: 'success',
                message: 'Category updated!',
            });
        } else {
            if (result?.errors?.body) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(result.errors.body).map(
                            ([field, obj]: any) => [field, obj.message],
                        ),
                    ),
                );
            }

            showToast({
                type: 'error',
                message: 'Could not update the category!',
            });
        }
    };

    const popupColorBody = Object.values(CATEGORY_COLORS).map((color: any) => ({
        title: color.name,
        id: color.id,
        onClick: () => setFields({ ...fields, categoryColor: color.id }),
        className: `${CATEGORY_COLORS[color.id].className}`,
        icon: <RectRoundedIcon className="..." />,
    }));

    popupColorBody.push({
        title: 'No color',
        id: null,
        onClick: () => setFields({ ...fields, categoryColor: null }),
        className: 'category_color_none',
        icon: <RectRoundedIcon className="..." />,
    });

    return (
        <>
            <ActionButton
                disabled={fetching}
                size="sm"
                className="admin_panel_content_categories_page_back"
                onClick={() => setActivePage('')}
            >
                <ArrowLeftIcon className="app-transition" /> Back
            </ActionButton>
            {isLoading ? (
                <Loading size={40} />
            ) : (
                <div className="admin_panel_content_edit_categories_page">
                    <SearchSelect
                        input_label={'Category'}
                        disabled={fetching}
                        value={category?._id}
                        onSetValue={(value: any) => {
                            setCategory(
                                categories.find(
                                    (category: any) => category._id === value,
                                ),
                            );
                        }}
                        options={categories}
                        className={CATEGORY_COLORS[category?.color]?.className}
                    />
                    {!category?.name && !category?.icon && !category?.color ? (
                        <></>
                    ) : (
                        <div
                            className={`admin_panel_content_edit_categories_page_settings ${fetching ? 'admin_panel_content_edit_categories_page_settings_locked' : ''} app-transition`}
                        >
                            <Field error={errors?.categoryName} title={'Name'}>
                                <InputField
                                    disabled={fetching}
                                    placeholder={'Enter a category name'}
                                    value={fields?.categoryName}
                                    error={errors?.categoryName}
                                    length={FIELD_LIMITS.categoryName.max}
                                    onMouseDown={() =>
                                        setErrors((prev: any) => {
                                            const next = { ...prev };
                                            delete next.categoryName;
                                            return next;
                                        })
                                    }
                                    onChange={(e: any) =>
                                        setFields({
                                            ...fields,
                                            categoryName: e.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <div className="admin_panel_content_edit_categories_page_settings_color">
                                <Popup body={fetching ? [] : popupColorBody}>
                                    <div
                                        className={`admin_panel_content_edit_categories_page_settings_color`}
                                    >
                                        <Field
                                            title={'Color'}
                                            error={errors?.categoryColor}
                                        >
                                            <div className="admin_panel_content_edit_categories_page_settings_color_content app-transition">
                                                <div
                                                    className={`admin_panel_content_edit_categories_page_settings_color_content_rect ${CATEGORY_COLORS[fields.categoryColor]?.className} app-transition`}
                                                >
                                                    <RectRoundedIcon />
                                                </div>
                                                <p>
                                                    {
                                                        popupColorBody.find(
                                                            (c: any) =>
                                                                c.id ===
                                                                fields.categoryColor,
                                                        )?.title
                                                    }
                                                </p>
                                            </div>
                                        </Field>
                                    </div>
                                </Popup>
                            </div>
                            <div
                                className={`admin_panel_content_edit_categories_page_settings_icon`}
                            >
                                <p>Icon</p>
                                <div
                                    className={`admin_panel_content_edit_categories_page_settings_icon_content app-transition`}
                                >
                                    {Object.entries(categoryIcons).map(
                                        ([id]: any) => {
                                            id = Number(id);

                                            return (
                                                <div
                                                    key={id}
                                                    className={`admin_panel_content_edit_categories_page_settings_icon_content_item ${
                                                        fields.categoryIcon ===
                                                        id
                                                            ? 'admin_panel_content_edit_categories_page_settings_icon_content_item_active'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        !fetching &&
                                                        setFields(
                                                            (prev: any) => ({
                                                                ...prev,
                                                                categoryIcon:
                                                                    prev.categoryIcon ===
                                                                    id
                                                                        ? null
                                                                        : id,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <Category
                                                        category={{ icon: id }}
                                                        onClick={() => {}}
                                                    />
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                            <PrimaryButton
                                isLoading={fetching}
                                onClick={() => {
                                    doSave();
                                }}
                            >
                                Save
                            </PrimaryButton>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

const CreateCategoryPage = ({ setActivePage }: any) => {
    const { showToast } = useContext(AppContext);
    const [fetching, setFetching] = useState<any>(false);
    const [errors, setErrors] = useState<any>({});

    const [fields, setFields] = useState<any>({
        categoryName: '',
        categoryIcon: null,
        categoryColor: null,
    });

    const popupColorBody = [
        ...Object.values(CATEGORY_COLORS).map((color: any) => ({
            id: color.id,
            title: color.name,
            className: color.className,
            icon: <RectRoundedIcon />,
            onClick: () =>
                setFields((prev: any) => ({
                    ...prev,
                    categoryColor: color.id,
                })),
        })),
        {
            id: null,
            title: 'No color',
            className: 'category_color_none',
            icon: <RectRoundedIcon />,
            onClick: () =>
                setFields((prev: any) => ({
                    ...prev,
                    categoryColor: null,
                })),
        },
    ];

    const doCreate = async () => {
        if (fetching) return;
        const name = (fields.categoryName || '').trim();
        if (!name || name.length > FIELD_LIMITS.categoryName.max) {
            setErrors((prev: any) => ({
                ...prev,
                categoryName: !name
                    ? 'Enter a name'
                    : `Name must be at most ${FIELD_LIMITS.categoryName.max} characters`,
            }));
            return;
        }
        setFetching(true);

        let result;
        try {
            result = await createCategory(fields);
        } finally {
            setFetching(false);
        }

        if (result.status) {
            showToast({
                type: 'success',
                message: 'Category created!',
            });

            setActivePage('');
        } else {
            if (result?.errors?.body) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(result.errors.body).map(
                            ([field, obj]: any) => [field, obj.message],
                        ),
                    ),
                );
            }
            showToast({
                type: 'error',
                message: 'Could not create the category!',
            });
        }
    };

    return (
        <>
            <ActionButton
                disabled={fetching}
                size="sm"
                className="admin_panel_content_categories_page_back"
                onClick={() => setActivePage('')}
            >
                <ArrowLeftIcon className="app-transition" />
                Back
            </ActionButton>

            <div className="admin_panel_content_edit_categories_page">
                <div
                    className={`admin_panel_content_edit_categories_page_settings ${fetching ? 'admin_panel_content_edit_categories_page_settings_locked' : ''} app-transition`}
                >
                    <Field error={errors?.categoryName} title={'Name'}>
                        <InputField
                            disabled={fetching}
                            placeholder="Enter a category name"
                            length={FIELD_LIMITS.categoryName.max}
                            onMouseDown={() =>
                                setErrors((prev: any) => {
                                    const next = { ...prev };
                                    delete next.categoryName;
                                    return next;
                                })
                            }
                            value={fields.categoryName}
                            error={errors?.categoryName}
                            onChange={(e: any) =>
                                setFields((prev: any) => ({
                                    ...prev,
                                    categoryName: e.target.value,
                                }))
                            }
                        />
                    </Field>

                    <Popup body={fetching ? [] : popupColorBody}>
                        <div className="admin_panel_content_edit_categories_page_settings_color">
                            <Field
                                error={errors?.categoryColor}
                                title={'Color'}
                            >
                                <div className="admin_panel_content_edit_categories_page_settings_color_content app-transition">
                                    <div
                                        className={`admin_panel_content_edit_categories_page_settings_color_content_rect ${CATEGORY_COLORS[fields.categoryColor]?.className ?? ''}`}
                                    >
                                        <RectRoundedIcon />
                                    </div>

                                    <p>
                                        {
                                            popupColorBody.find(
                                                (c: any) =>
                                                    c.id ===
                                                    fields.categoryColor,
                                            )?.title
                                        }
                                    </p>
                                </div>
                            </Field>
                        </div>
                    </Popup>

                    <div className="admin_panel_content_edit_categories_page_settings_icon">
                        <p>Icon</p>

                        <div className="admin_panel_content_edit_categories_page_settings_icon_content app-transition">
                            {Object.entries(categoryIcons).map(([id]: any) => {
                                id = Number(id);

                                return (
                                    <div
                                        key={id}
                                        className={`admin_panel_content_edit_categories_page_settings_icon_content_item ${
                                            fields.categoryIcon === id
                                                ? 'admin_panel_content_edit_categories_page_settings_icon_content_item_active'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            !fetching &&
                                            setFields((prev: any) => ({
                                                ...prev,
                                                categoryIcon:
                                                    prev.categoryIcon === id
                                                        ? null
                                                        : id,
                                            }))
                                        }
                                    >
                                        <Category
                                            category={{ icon: id }}
                                            onClick={() => {}}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <PrimaryButton isLoading={fetching} onClick={doCreate}>
                        Create
                    </PrimaryButton>
                </div>
            </div>
        </>
    );
};

const HomeCategoryPage = ({ setActivePage, setActiveCategory }: any) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<any>(true);
    const { showToast, showModalWindow, requestCloseModal } =
        useContext(AppContext);
    const navigate = useNavigate();

    const fetchCategories = async () => {
        setIsLoading(true);
        const result = await getCategories();
        setIsLoading(false);
        if (result.status) {
            setCategories(result.data);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const removeCategory = (category: any) => {
        let index = -1;
        setCategories((prev: any[]) => {
            index = prev.findIndex((item: any) => item._id === category._id);
            return prev.filter((item: any) => item._id !== category._id);
        });

        return () =>
            setCategories((prev: any[]) => {
                if (prev.some((item: any) => item._id === category._id)) {
                    return prev;
                }
                const next = [...prev];
                next.splice(
                    index < 0 ? next.length : Math.min(index, next.length),
                    0,
                    category,
                );
                return next;
            });
    };

    const appRoot =
        document.getElementById('app-root') ?? document.documentElement;

    const getCategoryColor = (color: any) => {
        const variable = getComputedStyle(appRoot)
            .getPropertyValue(`--category-color-${color}`)
            .trim();
        if (variable === '') return 'No color';

        return variable;
    };

    const getDeleleteCategoryModalContent = (
        category: any,
        closeModal: any,
    ) => {
        return (
            <div className="admin_panel_content_categories_page_modal_window">
                <Category category={category} isActive={true} />
                <DeleteCategoryActions
                    category={category}
                    closeModal={closeModal}
                    requestCloseModal={requestCloseModal}
                    removeCategory={removeCategory}
                    showToast={showToast}
                />
            </div>
        );
    };

    const doDeleteCategory = async (category: any) => {
        showModalWindow({
            title: 'Are you sure you want to delete this category?',
            content: getDeleleteCategoryModalContent(
                category,
                requestCloseModal,
            ),
            showCloseButton: false,
            closeFunc: () => {},
        });
    };

    return (
        <>
            <div className="admin_panel_content_categories_page">
                <PrimaryButton
                    size="sm"
                    className="admin_panel_content_categories_page_create"
                    onClick={() => setActivePage('create')}
                >
                    <PlusIcon className="app-transition" />
                    Create category
                </PrimaryButton>
                {isLoading ? (
                    <Loading size={40} />
                ) : (
                    categories?.map((category: any) => {
                        return (
                            <div
                                className="admin_panel_content_categories_page_category app-transition"
                                key={category._id}
                            >
                                <div className="admin_panel_content_categories_page_category_data">
                                    <Category
                                        onClick={() => {}}
                                        className="admin_panel_content_categories_page_category_data_icon"
                                        category={category}
                                        isActive={true}
                                    />
                                    <div className="admin_panel_content_categories_page_category_data_content">
                                        <p className="admin_panel_content_categories_page_category_data_content_name">
                                            {category?.name}
                                        </p>
                                        <div className="admin_panel_content_categories_page_category_data_content_color">
                                            <div
                                                className={`admin_panel_content_categories_page_category_data_content_color_circle ${CATEGORY_COLORS[category?.color]?.className} app-transition `}
                                            ></div>
                                            <p>
                                                {getCategoryColor(
                                                    category?.color,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p className="admin_panel_content_categories_page_category_posts_count">
                                    Posts: {category.posts_count}
                                </p>
                                <div className="admin_panel_content_categories_page_category_actions">
                                    <Popup
                                        body={[
                                            [
                                                {
                                                    title: 'Go to posts',
                                                    icon: <Redirect />,
                                                    onClick: () => {
                                                        navigate(
                                                            `/posts?filter=${category._id}`,
                                                        );
                                                    },
                                                },
                                                {
                                                    title: 'Edit',
                                                    icon: <EditIcon />,
                                                    onClick: () => {
                                                        setActiveCategory(
                                                            category._id,
                                                        );
                                                        setActivePage('edit');
                                                    },
                                                },
                                            ],
                                            [
                                                {
                                                    title: 'Delete',
                                                    icon: <DeleteIcon />,
                                                    type: 'danger',
                                                    onClick: () => {
                                                        doDeleteCategory(
                                                            categories.find(
                                                                (c: any) =>
                                                                    c._id ===
                                                                    category._id,
                                                            ),
                                                        );
                                                    },
                                                },
                                            ],
                                        ]}
                                    >
                                        <ThreeDotsIcon className="app-transition" />
                                    </Popup>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
};

const CategoriesPage = () => {
    const [activePage, setActivePage] = useState<any>('');
    const [activeCategory, setActiveCategory] = useState<any>('');

    return (() => {
        switch (activePage) {
            case 'edit':
                return (
                    <EditCategoryPage
                        active_category={activeCategory}
                        setActivePage={setActivePage}
                    />
                );
            case 'create':
                return <CreateCategoryPage setActivePage={setActivePage} />;
            default:
                return (
                    <HomeCategoryPage
                        setActivePage={setActivePage}
                        setActiveCategory={setActiveCategory}
                    />
                );
        }
    })();
};

export default CategoriesPage;
