'use client';

import './DangerButton.scss';
import Loader from '../Loading';

const buttonSize = (size: any) =>
    size === 'sm' || size === 'lg' ? size : 'md';

const loaderSize = (size: any) =>
    size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

export default function DangerButton({
    children,
    onClick,
    type = 'button',
    className = '',
    size = 'md',
    isActive = false,
    isLoading = false,
    disabled = false,
}: any) {
    const isDisabled = disabled || isLoading;
    const resolvedSize = buttonSize(size);

    return (
        <button
            className={`danger_button ui_button_${resolvedSize} app-transition ${className} ${isActive ? 'danger_button_active' : ''} ${isLoading ? 'danger_button_loading' : ''} ${isDisabled && !isLoading ? 'danger_button_disabled' : ''}`}
            onClick={isDisabled ? undefined : onClick}
            type={type}
            disabled={isDisabled}
        >
            <Loader size={loaderSize(resolvedSize)} />
            {children}
        </button>
    );
}
