'use client';

import CrossIcon from '../../../assets/svg/cross-icon.svg';
import Loader from '../Loading';

import './CancelButton.scss';

const buttonSize = (size: any) =>
    size === 'sm' || size === 'lg' ? size : 'md';

const loaderSize = (size: any) =>
    size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

export default function CancelButton({
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
            className={`cancel_button ui_button_${resolvedSize} ${isActive ? 'cancel_button_active' : ''} ${isLoading ? 'cancel_button_loading' : ''} ${isDisabled && !isLoading ? 'cancel_button_disabled' : ''} app-transition ${className}`}
            onClick={isDisabled ? undefined : onClick}
            type={type}
            disabled={isDisabled}
        >
            {isLoading ? (
                <Loader size={loaderSize(resolvedSize)} />
            ) : (
                <CrossIcon className="cancel_button_icon" />
            )}
            {children}
        </button>
    );
}
