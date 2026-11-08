'use client';

import type { ThemeMode } from '../../theme/themeMode';

import './ThemePicker.scss';

const OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const Mini = ({ tone }: { tone: 'light' | 'dark' }) => (
    <span className={`theme_mini theme_mini_${tone}`} aria-hidden="true">
        <span className="theme_mini_side">
            <i />
            <i />
            <i />
            <i />
        </span>
        <span className="theme_mini_main">
            <i className="theme_mini_title" />
            <i className="theme_mini_line" />
            <i className="theme_mini_line theme_mini_line_short" />
            <span className="theme_mini_card">
                <i className="theme_mini_line" />
                <i className="theme_mini_pill" />
            </span>
            <i className="theme_mini_button" />
        </span>
    </span>
);

type ThemePickerProps = {
    value: ThemeMode;
    onChange: (mode: ThemeMode) => void;
};

const ThemePicker = ({ value, onChange }: ThemePickerProps) => (
    <div className="theme_picker" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((option) => (
            <label
                key={option.value}
                className={`theme_option${
                    value === option.value ? ' theme_option_active' : ''
                }`}
            >
                <input
                    type="radio"
                    name="theme-mode"
                    className="theme_option_input"
                    value={option.value}
                    checked={value === option.value}
                    onChange={() => onChange(option.value)}
                />
                <span className="theme_preview">
                    {option.value === 'system' ? (
                        <>
                            <Mini tone="light" />
                            <span className="theme_preview_half">
                                <Mini tone="dark" />
                            </span>
                        </>
                    ) : (
                        <Mini tone={option.value} />
                    )}
                </span>
                <span className="theme_option_label">{option.label}</span>
            </label>
        ))}
    </div>
);

export default ThemePicker;
