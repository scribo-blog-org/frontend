'use client';

import './Toggle.scss';

const Toggle = ({ checked, onChange }: any) => {
    return (
        <label className="toggle">
            <input
                type="checkbox"
                checked={checked ?? false}
                onChange={(e: any) => onChange(e.target.checked)}
            />
            <span className="track">
                <span className="thumb"></span>
            </span>
        </label>
    );
};

export default Toggle;
