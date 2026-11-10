'use client';

import InputField from '../../components/Ui/InputField';
import CrossIcon from '../../assets/svg/cross-icon.svg';

type Props = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    length?: number;
};

const LogSearch = ({ value, onChange, placeholder, length = 100 }: Props) => (
    <div className="logs_search">
        <InputField
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(event: any) => onChange(event.target.value)}
            length={length}
        />
        {value ? (
            <button
                type="button"
                className="logs_search_clear"
                aria-label="Clear search"
                onClick={() => onChange('')}
            >
                <CrossIcon />
            </button>
        ) : null}
    </div>
);

export default LogSearch;
