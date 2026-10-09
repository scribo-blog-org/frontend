'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import './SearchSelect.scss';
import { useOverlayPresence } from '../useOverlayEnter';

import InputField from '../InputField';

import ArrowDownUpIcon from '../../../assets/svg/chevron-down-up.svg';
import CloseIcon from '../../../assets/svg/cross-icon.svg';

const optionLabel = (option: any) => option?.label ?? option?.name ?? '';

const optionKey = (option: any, index: any) =>
    option?.id ??
    option?._id ??
    (typeof option?.value === 'object' ? index : option?.value) ??
    index;

const SearchSelect = ({
    options = [],
    value = '',
    onChange,
    onSetValue,
    error,
    className = '',
    onFocus,
    placeholder = 'Choose',
    emptyLabel = 'Nothing found',
    onInput,
    loading = false,
    hasMore = false,
    onLoadMore,
    minSearchLength = 0,
    clearOnSelect = false,
    onSelect,
    disabled = false,
}: any) => {
    const setValue = onChange ?? onSetValue;
    const external = typeof onInput === 'function';

    const [isOpen, setIsOpen] = useState<any>(false);
    const [inputValue, setInputValue] = useState<any>('');
    const [isSearching, setIsSearching] = useState<any>(false);
    const [highlightedIndex, setHighlightedIndex] = useState<any>(-1);

    const wrapperRef = useRef<any>(null);
    const optionRefs = useRef<any[]>([]);
    const inputRef = useRef<any>(null);
    const { mounted: listMounted, visible: listVisible } =
        useOverlayPresence(isOpen);

    const selectedOption = useMemo(() => {
        return options.find((option: any) => option.value === value);
    }, [options, value]);

    const filteredOptions = useMemo(() => {
        // The field shows the chosen option's name until the user types, and
        // that name must not hide the other options when the list opens.
        const search = isSearching ? inputValue.trim().toLowerCase() : '';

        if (external || !search) return options;

        return options.filter((option: any) =>
            optionLabel(option).toLowerCase().includes(search),
        );
    }, [options, inputValue, external, isSearching]);

    const resetValue = useCallback(() => {
        const search = inputValue.trim().toLowerCase();

        if (clearOnSelect) {
            setInputValue('');
            if (external && search) onInput('');
            setIsSearching(false);
            setHighlightedIndex(-1);
            return;
        }

        const exactOption = options.find(
            (option: any) =>
                optionLabel(option).trim().toLowerCase() === search,
        );

        if (!exactOption) {
            if (value !== '' && value != null) {
                setValue?.('');
            }
            setInputValue('');
            if (external && search) onInput('');
        } else if (exactOption.value !== value) {
            setValue?.(exactOption.value);
            setInputValue(optionLabel(exactOption));
        } else {
            setInputValue(optionLabel(exactOption));
        }

        setIsSearching(false);
        setHighlightedIndex(-1);
    }, [
        inputValue,
        options,
        setValue,
        value,
        external,
        onInput,
        clearOnSelect,
    ]);

    const closeSelect = useCallback(() => {
        setIsOpen(false);
        inputRef.current?.blur();
        resetValue();
    }, [resetValue]);

    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        if (external || clearOnSelect) return;
        const option = options.find((o: any) => o.value === value);
        setInputValue(optionLabel(option));
    }, [external, clearOnSelect, options, value]);

    useEffect(() => {
        if (!external || clearOnSelect) return;
        const option = optionsRef.current.find((o: any) => o.value === value);
        setInputValue(optionLabel(option));
    }, [external, clearOnSelect, value]);

    useEffect(() => {
        const handleClickOutside = (e: any) => {
            if (!wrapperRef.current?.contains(e.target)) {
                closeSelect();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [closeSelect]);

    const filteredOptionsRef = useRef(filteredOptions);
    filteredOptionsRef.current = filteredOptions;

    useEffect(() => {
        if (!isOpen) {
            setHighlightedIndex(-1);
            return;
        }
        if (external) return;
        setHighlightedIndex(filteredOptions.length ? 0 : -1);
    }, [external, filteredOptions, isOpen]);

    useEffect(() => {
        if (!isOpen || !external) return;
        setHighlightedIndex(filteredOptionsRef.current.length ? 0 : -1);
    }, [external, inputValue, isOpen]);

    useEffect(() => {
        if (highlightedIndex < 0) return;

        optionRefs.current[highlightedIndex]?.scrollIntoView({
            block: 'nearest',
        });
    }, [highlightedIndex]);

    const queryReady = (text: any) =>
        !external || String(text || '').trim().length >= minSearchLength;

    const handleChange = (e: any) => {
        const next = e.target.value;
        setInputValue(next);
        setIsSearching(true);
        onInput?.(next);

        if (!queryReady(next)) {
            setIsOpen(false);
            return;
        }

        if (!isOpen) setIsOpen(true);
    };

    const handleSelect = (option: any) => {
        if (clearOnSelect) {
            setInputValue('');
        } else {
            setValue?.(option.value);
            setInputValue(optionLabel(option));
        }
        setIsSearching(false);
        setHighlightedIndex(-1);
        setIsOpen(false);
        onSelect?.(option);
    };

    const handleKeyDown = (e: any) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();

                if (!isOpen) {
                    if (queryReady(inputValue)) {
                        setIsOpen(true);
                    }
                    return;
                }

                setHighlightedIndex((prev: any) =>
                    prev >= filteredOptions.length - 1 ? 0 : prev + 1,
                );

                break;

            case 'ArrowUp':
                e.preventDefault();

                if (!isOpen) {
                    if (queryReady(inputValue)) {
                        setIsOpen(true);
                    }
                    return;
                }

                setHighlightedIndex((prev: any) =>
                    prev <= 0 ? filteredOptions.length - 1 : prev - 1,
                );

                break;

            case 'Enter':
                if (
                    isOpen &&
                    highlightedIndex >= 0 &&
                    filteredOptions[highlightedIndex]
                ) {
                    e.preventDefault();
                    handleSelect(filteredOptions[highlightedIndex]);
                }

                break;

            case 'Escape':
                closeSelect();
                break;

            default:
                break;
        }
    };

    const ShowSelected = !isSearching && selectedOption;
    const Icon = ShowSelected?.iconObject;
    const showCategoryDot = Boolean(ShowSelected?.className);

    return (
        <div
            ref={wrapperRef}
            className={`search_select ${className} app-transition${disabled ? ' search_select_disabled' : ''}`}
        >
            <div
                className={`search_select_input ${error ? 'incorrect_field' : ''} app-transition`}
            >
                {showCategoryDot ? (
                    <span
                        className={`category_dot ${ShowSelected.className}`}
                        aria-hidden="true"
                    />
                ) : Icon ? (
                    <div className={`search_select_icon ${className}`}>
                        <Icon />
                    </div>
                ) : null}

                <InputField
                    ref={inputRef}
                    value={inputValue}
                    placeholder={placeholder}
                    disabled={disabled}
                    onFocus={() => {
                        if (queryReady(inputValue)) {
                            setIsOpen(true);
                        }
                        onFocus?.();
                    }}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                />

                <button
                    type="button"
                    disabled={disabled}
                    className={`search_select_right_icon ${isOpen ? 'search_select_right_icon_close' : ''} app-transition`}
                    onMouseDown={(e: any) => {
                        e.preventDefault();

                        if (isOpen) {
                            setValue?.('');
                            setInputValue('');
                            setIsSearching(false);
                        } else {
                            setIsOpen(true);
                        }
                    }}
                >
                    {isOpen ? <CloseIcon /> : <ArrowDownUpIcon />}
                </button>
            </div>

            {listMounted && !disabled && (
                <div
                    className={`search_select_list blurred float_section${listVisible ? ' search_select_list_visible' : ''}`}
                    onScroll={(e: any) => {
                        const el = e.currentTarget;

                        if (
                            hasMore &&
                            !loading &&
                            el.scrollTop + el.clientHeight >=
                                el.scrollHeight - 24
                        ) {
                            onLoadMore?.();
                        }
                    }}
                >
                    {filteredOptions.length ? (
                        filteredOptions.map((option: any, index: any) => (
                            <button
                                key={optionKey(option, index)}
                                ref={(el: any) =>
                                    (optionRefs.current[index] = el)
                                }
                                type="button"
                                className={`search_select_item ${option.className ?? ''} ${highlightedIndex === index ? 'search_select_item_selected' : ''} app-transition`}
                                onMouseDown={() => handleSelect(option)}
                            >
                                {option.render?.() ?? (
                                    <>
                                        {option.className ? (
                                            <span
                                                className={`category_dot ${option.className}`}
                                                aria-hidden="true"
                                            />
                                        ) : option.iconObject ? (
                                            <div
                                                className={`search_select_icon ${option.className ?? ''}`}
                                            >
                                                <option.iconObject />
                                            </div>
                                        ) : null}
                                        <p>{optionLabel(option)}</p>
                                    </>
                                )}
                            </button>
                        ))
                    ) : loading ? null : (
                        <div className="search_select_empty">
                            <p>{emptyLabel}</p>
                        </div>
                    )}
                    {loading && !filteredOptions.length ? (
                        <div className="search_select_empty">
                            <p>Loading…</p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default SearchSelect;
