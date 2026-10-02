'use client';

import './PostsFilters.scss';
import React from 'react';
import Category from '../Category';

import Sceleton from '../Ui/Sceleton/Sceleton';

const PostsFilters = ({ filters, setFilters, isLoading = false }: any) => {
    const handleClick = (categoryId: any) => {
        setFilters((prev: any) => {
            if (categoryId === 'all') {
                const isAllActive = prev.find(
                    (f: any) => f._id === 'all',
                )?.isActive;

                return prev.map((filter: any) => {
                    if (filter._id === 'subscription') {
                        return filter;
                    }

                    if (filter._id === 'all') {
                        return {
                            ...filter,
                            isActive: !isAllActive,
                        };
                    }

                    return {
                        ...filter,
                        isActive: !isAllActive,
                    };
                });
            }

            if (categoryId === 'subscription') {
                return prev.map((filter: any) =>
                    filter._id === 'subscription'
                        ? {
                              ...filter,
                              isActive: !filter.isActive,
                          }
                        : filter,
                );
            }

            const allOn = prev.find((f: any) => f._id === 'all')?.isActive;

            if (allOn) {
                return prev.map((filter: any) => {
                    if (filter._id === 'subscription') {
                        return filter;
                    }

                    if (filter._id === 'all') {
                        return {
                            ...filter,
                            isActive: false,
                        };
                    }

                    return {
                        ...filter,
                        isActive: filter._id === categoryId,
                    };
                });
            }

            let updated = prev.map((filter: any) => {
                if (filter._id === categoryId) {
                    return {
                        ...filter,
                        isActive: !filter.isActive,
                    };
                }

                if (filter._id === 'all') {
                    return {
                        ...filter,
                        isActive: false,
                    };
                }

                return filter;
            });

            const allCategoriesActive = updated
                .filter((f: any) => !['all', 'subscription'].includes(f._id))
                .every((f: any) => f.isActive);

            updated = updated.map((filter: any) =>
                filter._id === 'all'
                    ? {
                          ...filter,
                          isActive: allCategoriesActive,
                      }
                    : filter,
            );

            return updated;
        });
    };

    return (
        <Sceleton
            isLoading={isLoading}
            className="posts_filters"
            rounded={true}
            section={false}
        >
            <div className="posts_filters">
                {filters.map((category: any, index: any) => {
                    const allActive = filters.find(
                        (f: any) => f._id === 'all',
                    )?.isActive;
                    const visuallyActive =
                        category._id === 'all' ||
                        category._id === 'subscription'
                            ? category.isActive
                            : allActive
                              ? false
                              : category.isActive;

                    return (
                        <React.Fragment key={category._id ?? category.name}>
                            <Category
                                quiet
                                isActive={visuallyActive}
                                onClick={() => handleClick(category._id)}
                                category={category}
                            />

                            {index === 0 && (
                                <div className="post_filter post_filter_separator app-transition" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </Sceleton>
    );
};

export default PostsFilters;
