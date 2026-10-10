'use client';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import CrossIcon from '../../../assets/svg/cross-icon.svg';

import './ModalWindow.scss';

const SWAP_MS = 180;

const ModalWindow = ({
    modalWindow,
    showModalWindow,
    modalCloseRequest,
    dismissKey,
}: any) => {
    const [isVisible, setIsVisible] = useState<any>(false);
    const [activeModal, setActiveModal] = useState<any>(modalWindow || null);
    const [isSwapping, setIsSwapping] = useState<any>(false);
    const [contentHeight, setContentHeight] = useState<any>(null);
    const closeTimeoutRef = useRef<any>(null);
    const contentRef = useRef<any>(null);

    const closeModalWindow = useCallback(() => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }

        setIsVisible(false);

        const closeFunc = modalWindow?.closeFunc;

        closeTimeoutRef.current = setTimeout(() => {
            document.body.classList.remove('no-scroll');

            if (closeFunc) {
                try {
                    closeFunc();
                } catch (e: any) {
                    console.error(e);
                }
            }

            showModalWindow(false);
            setActiveModal(null);
            setIsSwapping(false);
            setContentHeight(null);
            closeTimeoutRef.current = null;
        }, 300);
    }, [modalWindow, showModalWindow]);

    const openModalWindow = useCallback(() => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }

        document.body.classList.add('no-scroll');
        setIsVisible(true);
    }, []);

    useEffect(() => {
        if (dismissKey == null) {
            return;
        }
        closeModalWindow();
    }, [dismissKey, closeModalWindow]);

    useEffect(() => {
        if (modalWindow) {
            openModalWindow();
        } else {
            closeModalWindow();
        }
    }, [modalWindow, openModalWindow, closeModalWindow]);

    const prevCloseReqRef = useRef(modalCloseRequest);

    useEffect(() => {
        if (modalCloseRequest !== prevCloseReqRef.current) {
            prevCloseReqRef.current = modalCloseRequest;

            if (modalWindow) {
                closeModalWindow();
            }
        }
    }, [modalCloseRequest, modalWindow, closeModalWindow]);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!modalWindow || modalWindow === activeModal) {
            return;
        }

        if (!activeModal) {
            setActiveModal(modalWindow);
            return;
        }

        setIsSwapping(true);

        const timer = setTimeout(() => {
            setActiveModal(modalWindow);
            setIsSwapping(false);
        }, SWAP_MS);

        return () => clearTimeout(timer);
    }, [modalWindow, activeModal]);

    useLayoutEffect(() => {
        const node = contentRef.current;

        if (!activeModal || !node || typeof ResizeObserver === 'undefined') {
            setContentHeight(null);
            return;
        }

        const measure = () => setContentHeight(node.scrollHeight);

        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
    }, [activeModal]);

    return (
        <div
            className={`modal_window ${isVisible && activeModal ? 'visible' : ''}`}
        >
            <button
                type="button"
                onClick={closeModalWindow}
                className="modal_window_background"
            />

            <div
                className={`modal_window_body blurred ${
                    activeModal?.size === 'small'
                        ? 'modal_window_body_small'
                        : activeModal?.size === 'large'
                          ? 'modal_window_body_large'
                          : ''
                }${isSwapping ? ' modal_window_body_swapping' : ''}`}
            >
                {activeModal?.hideHeader ? (
                    activeModal?.showCloseButton === false ? null : (
                        <button
                            type="button"
                            onClick={closeModalWindow}
                            aria-label="Close"
                            className="modal_window_body_title_close_button modal_window_body_floating_close app-transition"
                        >
                            <CrossIcon />
                        </button>
                    )
                ) : (
                    <div className="modal_window_body_title">
                        {activeModal?.icon ? (
                            <span className="modal_window_body_title_icon">
                                {activeModal.icon}
                            </span>
                        ) : null}

                        <div className="modal_window_body_title_copy">
                            <p className="modal_window_body_title_text">
                                {activeModal?.title ?? ''}
                            </p>
                            {activeModal?.subtitle ? (
                                <p className="modal_window_body_title_subtitle">
                                    {activeModal.subtitle}
                                </p>
                            ) : null}
                        </div>

                        {activeModal?.showCloseButton === false ? null : (
                            <button
                                type="button"
                                onClick={closeModalWindow}
                                aria-label="Close"
                                className="modal_window_body_title_close_button app-transition"
                            >
                                <CrossIcon />
                            </button>
                        )}
                    </div>
                )}

                <div
                    className="modal_window_body_content"
                    style={
                        contentHeight == null
                            ? undefined
                            : { height: `${contentHeight}px` }
                    }
                >
                    <div
                        className="modal_window_body_content_inner"
                        ref={contentRef}
                    >
                        {activeModal?.content ?? null}
                    </div>
                </div>

                {activeModal?.footer ? (
                    <div className="modal_window_body_footer">
                        {activeModal.footer}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ModalWindow;
