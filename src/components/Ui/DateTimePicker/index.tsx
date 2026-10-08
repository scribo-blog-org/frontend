'use client';

import { forwardRef } from 'react';

import './DateTimePicker.scss';

import CrossIcon from '../../../assets/svg/cross-icon.svg';

// value is a local "YYYY-MM-DDTHH:mm" string, '' when nothing is picked.
const DateTimePicker = forwardRef(
    (
        {
            label,
            value = '',
            onChange,
            min,
            max,
            disabled = false,
            clearable = true,
            className = '',
        }: any,
        ref: any,
    ) => (
        <label
            className={`date_time_picker app-transition${
                value ? ' date_time_picker_filled' : ''
            }${disabled ? ' date_time_picker_disabled' : ''} ${className}`}
        >
            {label ? (
                <span className="date_time_picker_label">{label}</span>
            ) : null}
            <input
                ref={ref}
                className="date_time_picker_input"
                type="datetime-local"
                value={value}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(event: any) => onChange?.(event.target.value)}
            />
            {clearable && value && !disabled ? (
                <button
                    type="button"
                    className="date_time_picker_clear"
                    aria-label="Clear"
                    onClick={(event: any) => {
                        event.preventDefault();
                        onChange?.('');
                    }}
                >
                    <CrossIcon />
                </button>
            ) : null}
        </label>
    ),
);

DateTimePicker.displayName = 'DateTimePicker';

export default DateTimePicker;
