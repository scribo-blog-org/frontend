'use client';

import './ActionButton.scss';
import Loader from '../Loading';

const buttonSize = (size: any) =>
    size === 'sm' || size === 'lg' ? size : 'md';

const loaderSize = (size: any) =>
    size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

export default function ActionButton({
    children,
    onClick,
    type = 'button',
    className = '',
    size = 'md',
    disabled = false,
    isLoading = false,
}: any) {
    const isDisabled = disabled || isLoading;
    const resolvedSize = buttonSize(size);
    return (
        <button
            className={`action_button ui_button_${resolvedSize} app-transition app-transition-color ${className} ${isLoading ? 'action_button_loading' : ''} ${isDisabled && !isLoading ? 'action_button_disabled' : ''}`}
            onClick={isDisabled ? undefined : onClick}
            type={type}
            disabled={isDisabled}
        >
            <Loader size={loaderSize(resolvedSize)} />
            {children}
        </button>
    );
}
