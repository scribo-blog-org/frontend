'use client';

import './PrimaryButton.scss';
import Loader from '../Loading';

const buttonSize = (size: any) =>
    size === 'sm' || size === 'lg' ? size : 'md';

const loaderSize = (size: any) =>
    size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

export default function PrimaryButton({
    children,
    onClick,
    type = 'button',
    className = '',
    size = 'md',
    isLoading = false,
    disabled = false,
    id,
    onMouseDown,
    onTouchStart,
    onTouchEnd,
    'aria-label': ariaLabel,
}: any) {
    const isDisabled = disabled || isLoading;
    const resolvedSize = buttonSize(size);

    return (
        <button
            id={id}
            className={`primary_button ui_button_${resolvedSize} app-transition app-transition-color ${className} ${isLoading ? 'primary_button_loading' : ''} ${isDisabled && !isLoading ? 'primary_button_disabled' : ''}`}
            onClick={isDisabled ? undefined : onClick}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            type={type}
            disabled={isDisabled}
            aria-label={ariaLabel}
        >
            <Loader size={loaderSize(resolvedSize)} />
            {children}
        </button>
    );
}
