'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    FloatingPortal,
    autoUpdate,
    flip,
    offset,
    shift,
    useFloating,
} from '@floating-ui/react';

import { useOverlayPresence } from '../../components/Ui/useOverlayEnter';

import '../../components/Ui/Popup/Popup.scss';

const PORTAL_ROOT = 'app-layout';
const MENU_GAP = 8;
const VIEWPORT_PAD = 12;

const estimateMenuHeight = (count: number) => {
    if (!count) {
        return 0;
    }

    return 10 + count * 34 + Math.max(0, count - 1) * 2;
};

const placeTouchMenu = (anchor: any, menuWidth: number, menuHeight: number) => {
    const overflow =
        anchor.top +
        anchor.height +
        MENU_GAP +
        menuHeight +
        VIEWPORT_PAD -
        window.innerHeight;
    const maxShift = Math.max(
        0,
        anchor.top + anchor.height - 72 - VIEWPORT_PAD,
    );
    const lift = Math.max(0, Math.min(overflow, maxShift));
    const rawLeft = anchor.own
        ? anchor.left + anchor.width - menuWidth
        : anchor.left;
    const left = Math.max(
        VIEWPORT_PAD,
        Math.min(rawLeft, window.innerWidth - VIEWPORT_PAD - menuWidth),
    );

    return {
        lift,
        left,
        top: anchor.top + anchor.height - lift + MENU_GAP,
    };
};

const MessageContextMenu = ({
    x,
    y,
    items,
    onClose,
    source = 'mouse',
    messageId,
    anchor,
    visible = false,
}: any) => {
    const openedAtRef = useRef(Date.now());
    const [bubbleHtml, setBubbleHtml] = useState('');
    const [touchPlace, setTouchPlace] = useState<any>(null);
    const isTouch = source === 'touch' && anchor;

    useLayoutEffect(() => {
        openedAtRef.current = Date.now();
    }, [messageId]);

    const virtualAnchor = useMemo(
        () => ({
            getBoundingClientRect: () => ({
                x,
                y,
                top: y,
                left: x,
                bottom: y,
                right: x,
                width: 0,
                height: 0,
            }),
        }),
        [x, y],
    );

    const { refs, floatingStyles } = useFloating({
        open: true,
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(4), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    useEffect(() => {
        if (isTouch) {
            return;
        }

        refs.setPositionReference(virtualAnchor);
    }, [refs, virtualAnchor, isTouch]);

    useLayoutEffect(() => {
        if (!anchor || !messageId) {
            return;
        }

        const article = document.getElementById(`message_${messageId}`);
        const wrap = article?.querySelector('.messages_bubble_wrap');
        if (wrap) {
            setBubbleHtml(wrap.outerHTML);
        }

        if (!isTouch) {
            return;
        }

        const menuEl = refs.floating.current;
        const next = placeTouchMenu(
            anchor,
            menuEl?.offsetWidth || 188,
            menuEl?.offsetHeight || estimateMenuHeight(items.length),
        );
        setTouchPlace((current: any) => {
            if (
                current &&
                Math.abs(current.lift - next.lift) < 0.5 &&
                Math.abs(current.left - next.left) < 0.5 &&
                Math.abs(current.top - next.top) < 0.5
            ) {
                return current;
            }

            return next;
        });
    }, [isTouch, anchor, messageId, items.length, refs]);

    const touchLayout = isTouch
        ? touchPlace ||
          placeTouchMenu(anchor, 188, estimateMenuHeight(items.length))
        : null;

    useEffect(() => {
        const onKeyDown = (event: any) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const onPointerDown = (event: any) => {
            if (isTouch && Date.now() - openedAtRef.current < 450) {
                return;
            }

            if (
                event.pointerType === 'mouse' &&
                event.sourceCapabilities?.firesTouchEvents
            ) {
                return;
            }

            if (event.target.closest('.popup_menu, .messages_menu_lift')) {
                return;
            }

            if (
                !isTouch &&
                event.target.closest('.messages_text, .messages_bubble')
            ) {
                return;
            }

            onClose();
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('pointerdown', onPointerDown, true);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [onClose, isTouch]);

    const portalRoot =
        typeof document === 'undefined'
            ? null
            : document.getElementById(PORTAL_ROOT);

    if (!items.length) {
        return null;
    }

    const menu = (
        <div
            ref={refs.setFloating}
            className="popup_menu"
            style={
                touchLayout
                    ? {
                          top: touchLayout.top,
                          left: touchLayout.left,
                          transform: 'none',
                          ['--lift-from' as any]: `${touchLayout.lift}px`,
                      }
                    : floatingStyles
            }
            data-popup-placement="bottom-start"
        >
            <div
                className={`popup_menu_surface float_section blurred${
                    visible ? ' popup_menu_surface_visible' : ''
                }`}
            >
                <div className="popup_menu_section">
                    {items.map((item: any) => {
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                disabled={item.disabled}
                                className={`popup_menu_item app-transition${
                                    item.type === 'danger'
                                        ? ' popup_menu_item_danger'
                                        : ''
                                }`}
                                onClick={() => {
                                    if (item.disabled) {
                                        return;
                                    }

                                    item.onClick?.();
                                    onClose();
                                }}
                            >
                                <Icon />
                                <p className="popup_menu_item_title">
                                    {item.title}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <FloatingPortal root={portalRoot || undefined}>
            <div
                className={`messages_menu_layer${
                    isTouch ? ' messages_menu_layer_touch' : ''
                }`}
            >
                <button
                    type="button"
                    className={`messages_menu_scrim${
                        visible ? ' messages_menu_scrim_visible' : ''
                    }`}
                    aria-label="Close message menu"
                    onClick={() => {
                        if (isTouch && Date.now() - openedAtRef.current < 450) {
                            return;
                        }

                        onClose();
                    }}
                />
                {anchor && bubbleHtml ? (
                    <div
                        className={`messages_menu_lift messages_item${
                            anchor.own ? ' messages_item_own' : ''
                        }${
                            isTouch ? '' : ' messages_item_menu_target'
                        }${visible ? ' messages_menu_lift_visible' : ''}`}
                        style={{
                            top: anchor.top - (touchLayout?.lift || 0),
                            left: anchor.left,
                            width: anchor.width,
                            ['--lift-from' as any]: `${touchLayout?.lift || 0}px`,
                        }}
                        dangerouslySetInnerHTML={{ __html: bubbleHtml }}
                    />
                ) : null}
                {menu}
            </div>
        </FloatingPortal>
    );
};

export default function MessageContextMenuSlot({ menu, onClose }: any) {
    const { mounted, visible } = useOverlayPresence(Boolean(menu));
    const retainedRef = useRef<any>(menu);

    if (menu) {
        retainedRef.current = menu;
    }

    if (!mounted || !retainedRef.current) {
        return null;
    }

    const current = retainedRef.current;

    return (
        <MessageContextMenu
            x={current.x}
            y={current.y}
            items={current.items}
            source={current.source}
            messageId={current.messageId}
            anchor={current.anchor}
            visible={visible}
            onClose={onClose}
        />
    );
}
