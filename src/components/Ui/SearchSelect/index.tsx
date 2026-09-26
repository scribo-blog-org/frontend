'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./SearchSelect.scss";
import { useOverlayEnter } from "../useOverlayEnter";

import InputField from "../InputField";

import ArrowDownUpIcon from "../../../assets/svg/chevron-down-up.svg";
import  CloseIcon from "../../../assets/svg/cross-icon.svg";


const optionLabel = (option: any) => option?.label ?? option?.name ?? "";

const optionKey = (option: any, index: any) =>
    option?.id ?? option?._id ?? (typeof option?.value === "object" ? index : option?.value) ?? index;

const SearchSelect = ({
    options = [],
    value = "",
    onChange,
    onSetValue,
    error,
    className = "",
    onFocus,
    placeholder = "Выбрать",
    emptyLabel = "Ничего не найдено",
}: any) => {
    const setValue = onChange ?? onSetValue;

    const [isOpen, setIsOpen] = useState<any>(false);
    const [inputValue, setInputValue] = useState<any>("");
    const [isSearching, setIsSearching] = useState<any>(false);
    const [highlightedIndex, setHighlightedIndex] = useState<any>(-1);

    const wrapperRef = useRef<any>(null);
    const optionRefs = useRef<any[]>([]);
    const inputRef = useRef<any>(null);
    const listVisible = useOverlayEnter(isOpen);

    const selectedOption = useMemo(() => {
        return options.find((option: any) => option.value === value);
    }, [options, value]);

    const filteredOptions = useMemo(() => {

        const search = inputValue.trim().toLowerCase();

        if (!search)
            return options;

        return options.filter((option: any) =>
            optionLabel(option).toLowerCase().includes(search)
        );

    }, [options, inputValue]);

    const resetValue = useCallback(() => {
        const search = inputValue.trim().toLowerCase();

        const exactOption = options.find(
            (option: any) => optionLabel(option).trim().toLowerCase() === search
        );

        if (!exactOption) {
            if (value !== "" && value != null) {
                setValue?.("");
            }
            setInputValue("");
        } else if (exactOption.value !== value) {
            setValue?.(exactOption.value);
            setInputValue(optionLabel(exactOption));
        } else {
            setInputValue(optionLabel(exactOption));
        }

        setIsSearching(false);
        setHighlightedIndex(-1);
    }, [inputValue, options, setValue, value]);

    const closeSelect = useCallback(() => {
        setIsOpen(false);
        inputRef.current?.blur();
        resetValue();
    }, [resetValue]);

    useEffect(() => {
        const option = options.find((o: any) => o.value === value);
        setInputValue(optionLabel(option));
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (e: any) => {
            if (!wrapperRef.current?.contains(e.target)) {
                closeSelect();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [closeSelect]);

    useEffect(() => {

        if (!isOpen) {
            setHighlightedIndex(-1);
            return;
        }

        setHighlightedIndex(filteredOptions.length ? 0 : -1);

    }, [isOpen, filteredOptions]);

    useEffect(() => {

        if (highlightedIndex < 0) return;

        optionRefs.current[highlightedIndex]?.scrollIntoView({
            block: "nearest"
        });

    }, [highlightedIndex]);

    const handleChange = (e: any) => {
        setInputValue(e.target.value);
        setIsSearching(true);

        if (!isOpen)
            setIsOpen(true);
    };

    const handleSelect = (option: any) => {
        setValue?.(option.value);
        setInputValue(optionLabel(option));
        setIsSearching(false);
        setHighlightedIndex(-1);
        setIsOpen(false);
    };

    const handleKeyDown = (e: any) => {

        switch (e.key) {

            case "ArrowDown":
                e.preventDefault();

                if (!isOpen) {
                    setIsOpen(true);
                    return;
                }

                setHighlightedIndex((prev: any) =>
                    prev >= filteredOptions.length - 1 ? 0 : prev + 1
                );

                break;

            case "ArrowUp":
                e.preventDefault();

                if (!isOpen) {
                    setIsOpen(true);
                    return;
                }

                setHighlightedIndex((prev: any) =>
                    prev <= 0 ? filteredOptions.length - 1 : prev - 1
                );

                break;

            case "Enter":

                if (
                    isOpen &&
                    highlightedIndex >= 0 &&
                    filteredOptions[highlightedIndex]
                ) {
                    e.preventDefault();
                    handleSelect(filteredOptions[highlightedIndex]);
                }

                break;

            case "Escape":
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
            className={`search_select ${className} app-transition`}
        >
            <div className={`search_select_input ${error ? "incorrect_field" : ""} app-transition`}>
                {showCategoryDot ? (
                    <span className={`category_dot ${ShowSelected.className}`} aria-hidden="true" />
                ) : Icon ? (
                    <div className={`search_select_icon ${className}`}>
                        <Icon/>
                    </div>
                ) : null}

                <InputField
                    ref={inputRef}
                    value={inputValue}
                    placeholder={placeholder}
                    onFocus={() => {
                        setIsOpen(true)
                        onFocus?.()
                    }}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                />

                <button
                    type="button"
                    className={`search_select_right_icon ${isOpen ? 'search_select_right_icon_close' : ''} app-transition`}
                    onMouseDown={(e: any) => {
                        e.preventDefault();

                        if (isOpen) {
                            setValue?.("");
                            setInputValue("");
                            setIsSearching(false);
                        } else {
                            setIsOpen(true);
                        }
                    }}
                >
                    {isOpen ? <CloseIcon/> : <ArrowDownUpIcon />}
                </button>

            </div>

            {isOpen && (
                <div className={`search_select_list blurred float_section${listVisible ? " search_select_list_visible" : ""}`}>

                    {filteredOptions.length ? (

                        filteredOptions.map((option: any, index: any) => (

                            <button
                                key={optionKey(option, index)}
                                ref={(el: any) => optionRefs.current[index] = el}
                                type="button"
                                className={`search_select_item ${option.className ?? ""} ${highlightedIndex === index ? "search_select_item_selected" : ""} app-transition`}
                                onMouseDown={() => handleSelect(option)}
                            >
                                {
                                    option.render?.() ?? (
                                        <>
                                            {option.className ? (
                                                <span className={`category_dot ${option.className}`} aria-hidden="true" />
                                            ) : option.iconObject ? (
                                                <div className={`search_select_icon ${option.className ?? ""}`}>
                                                    <option.iconObject />
                                                </div>
                                            ) : null}
                                            <p>{optionLabel(option)}</p>
                                        </>
                                    )
                                }
                            </button>

                        ))

                    ) : (

                        <div className="search_select_empty">
                            <p>
                                {emptyLabel}
                            </p>
                        </div>

                    )}

                </div>
            )}

        </div>
    );
};

export default SearchSelect;