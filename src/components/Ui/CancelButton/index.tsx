'use client';

import CrossIcon from '../../../assets/svg/cross-icon.svg';
import Loader from '../Loading';

import './CancelButton.scss';

export default function CancelButton({
    children,
    onClick,
    type = 'button',
    className = '',
    isActive = false,
    isLoading = false,
    disabled = false,
}: any) {
    const isDisabled = disabled || isLoading;

    return (
        <button
            className={`cancel_button ${isActive ? 'cancel_button_active' : ''} ${isLoading ? 'cancel_button_loading' : ''} ${isDisabled ? 'cancel_button_disabled' : ''} app-transition ${className}`}
            onClick={isDisabled ? undefined : onClick}
            type={type}
            disabled={isDisabled}
        >
            {isLoading ? (
                <Loader size={16} />
            ) : (
                <CrossIcon className="cancel_button_icon" />
            )}
            {children}
        </button>
    );
}
