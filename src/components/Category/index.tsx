'use client';

import { memo } from 'react';
import ChipButton from '../Ui/ChipButton';
import './Category.scss';
import { useNavigate } from '@/navigation';

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
import CategoryIcon18 from '../../assets/svg/categories/18.svg';
import CategoryIcon19 from '../../assets/svg/categories/19.svg';
import CategoryIcon20 from '../../assets/svg/categories/20.svg';
import CategoryIcon21 from '../../assets/svg/categories/21.svg';
import CategoryIcon22 from '../../assets/svg/categories/22.svg';
import CategoryIcon23 from '../../assets/svg/categories/23.svg';
import CategoryIcon24 from '../../assets/svg/categories/24.svg';
import CategoryIcon25 from '../../assets/svg/categories/25.svg';
import CategoryIcon26 from '../../assets/svg/categories/26.svg';

import { CATEGORY_COLORS } from '../../styles/constants';

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

const Category = memo(
    ({
        category,
        isActive,
        onClick,
        className,
        quiet = false,
        tag = false,
    }: any) => {
        const navigate = useNavigate();

        const Icon = categoryIcons[category?.icon];
        const colorClass = CATEGORY_COLORS[category?.color]?.className ?? '';
        const isQuiet = quiet || tag;

        return (
            <ChipButton
                variant={isQuiet ? 'quiet' : 'default'}
                isActive={isActive}
                onClick={
                    onClick ??
                    (() => {
                        navigate('/?filter=' + category?._id);
                    })
                }
                className={`category_content ${isQuiet ? 'category_content_quiet' : ''} ${tag ? 'category_content_tag' : ''} ${colorClass} ${className || ''}`}
            >
                {isQuiet && category?.color != null ? (
                    <span className="category_dot" aria-hidden="true" />
                ) : null}
                {!isQuiet && Icon ? (
                    <Icon className="category_svg_icon" />
                ) : null}
                <p>{category?.name}</p>
            </ChipButton>
        );
    },
);

Category.displayName = 'Category';

export default Category;
