'use client';

import { useLayoutEffect, useState } from 'react';
import {
    autoUpdate,
    flip,
    FloatingPortal,
    offset,
    shift,
    useDismiss,
    useFloating,
    useHover,
    useInteractions,
    useRole,
    useTransitionStyles,
    safePolygon,
} from '@floating-ui/react';

import './Flyout.scss';

const PORTAL_ROOT = 'app-layout';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Flyout = ({
    children,
    content,
    open: openProp,
    onOpenChange,
    placement = 'top-start',
    virtualAnchor,
    className,
}: any) => {
    const isControlled = openProp !== undefined;
    const [uncontrolledOpen, setUncontrolledOpen] = useState<any>(false);
    const open = isControlled ? openProp : uncontrolledOpen;
    const setOpen = (next: any) => {
        if (!isControlled) {
            setUncontrolledOpen(next);
        }
        onOpenChange?.(next);
    };

    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement,
        strategy: 'fixed',
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    useLayoutEffect(() => {
        if (!virtualAnchor) {
            return;
        }
        refs.setReference({
            getBoundingClientRect: () => virtualAnchor.getBoundingClientRect(),
            contextElement: virtualAnchor.contextElement,
        });
    }, [refs, virtualAnchor]);

    const { isMounted, styles: transitionStyles } = useTransitionStyles(
        context,
        {
            duration: prefersReducedMotion() ? 0 : 200,
            initial: { opacity: 0, transform: 'scale(0.97)' },
        },
    );

    const hover = useHover(context, {
        enabled: !isControlled && !virtualAnchor,
        handleClose: safePolygon({ buffer: 6 }),
        delay: { open: 80, close: 120 },
    });
    const dismiss = useDismiss(context, {
        enabled: Boolean(virtualAnchor) || isControlled,
        outsidePress: !virtualAnchor,
    });
    const role = useRole(context, { role: 'tooltip' });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        dismiss,
        role,
    ]);

    if (!content) {
        return children || null;
    }

    const portalRoot =
        typeof document === 'undefined'
            ? null
            : document.getElementById(PORTAL_ROOT);

    return (
        <>
            {children ? (
                <span
                    className={`flyout_trigger ${className || ''}`}
                    ref={virtualAnchor ? undefined : refs.setReference}
                    {...(virtualAnchor ? {} : getReferenceProps())}
                >
                    {children}
                </span>
            ) : null}
            {isMounted ? (
                <FloatingPortal root={virtualAnchor ? undefined : portalRoot}>
                    <div
                        ref={refs.setFloating}
                        style={floatingStyles}
                        className="flyout_shell"
                        {...getFloatingProps()}
                    >
                        <div
                            className="flyout float_section blurred"
                            style={transitionStyles}
                        >
                            {content}
                        </div>
                    </div>
                </FloatingPortal>
            ) : null}
        </>
    );
};

export default Flyout;
