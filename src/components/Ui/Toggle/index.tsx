'use client';

import './Toggle.scss';

const Toggle = ({ checked, onChange, disabled = false }: any) => {
    return (
        <label className={`toggle${disabled ? ' toggle_disabled' : ''}`}>
            <input
                type="checkbox"
                checked={checked ?? false}
                disabled={disabled}
                onChange={(e: any) => onChange(e.target.checked)}
            />
            <span className="track">
                <span className="thumb"></span>
            </span>
        </label>
    );
};

export default Toggle;
