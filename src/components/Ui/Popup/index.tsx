'use client';

import {
    createContext,
    Fragment,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {
    useFloating,
    offset,
    flip,
    shift,
    size,
    autoUpdate,
    FloatingPortal,
} from '@floating-ui/react';
import './Popup.scss';

import ChevronRightIcon from '../../../assets/svg/chevron-right.svg';
import ChevronLeftIcon from '../../../assets/svg/chevron-left.svg';
import { useOverlayPresence } from '../useOverlayEnter';

const MENU_ROOT_DEFAULT = 'app-layout';

function resolveLayer(explicitLayer: any, anchorEl: any) {
    if (
        explicitLayer === 'header' ||
        explicitLayer === 'content' ||
        explicitLayer === 'modal'
    ) {
        return explicitLayer;
    }

    if (anchorEl?.closest('.modal_window')) {
        return 'modal';
    }

    return anchorEl?.closest('.header') ? 'header' : 'content';
}

function popupLayerClass(layer: any) {
    const classes = ['popup_menu'];

    if (layer === 'header') {
        classes.push('popup_menu_header');
    }

    if (layer === 'modal') {
        classes.push('popup_menu_modal');
    }

    return classes.join(' ');
}

function popupMenuShellProps({ layer, placement }: any) {
    return {
        className: popupLayerClass(layer),
        'data-popup-placement': placement,
    };
}

function PopupMenuSurface({ visible, children }: any) {
    return (
        <div
            className={`popup_menu_surface float_section blurred${visible ? ' popup_menu_surface_visible' : ''}`}
        >
            {children}
        </div>
    );
}

function normalizeSections(body: any) {
    if (!Array.isArray(body) || body.length === 0) {
        return [];
    }

    const sections = Array.isArray(body[0]) ? body : [body];

    return sections
        .map((section: any) =>
            Array.isArray(section) ? section.filter(Boolean) : [],
        )
        .filter((section: any) => section.length > 0);
}

function findActiveItem(sections: any) {
    for (const section of sections) {
        for (const item of section) {
            if (item.isActive) {
                return item;
            }
        }
    }

    return null;
}

function useFloatingPosition(refs: any, x: any, y: any) {
    useLayoutEffect(() => {
        setPopupPosition(refs.floating.current, x, y);
    }, [refs, x, y]);
}

const MENU_SLIDE_MS = 300;

const MenuNavContext = createContext<any>(null);

function MenuItem({ item, onItemSelect }: any) {
    const nav = useContext(MenuNavContext);

    if (item.type === 'submenu' || item.type === 'dropdown') {
        const isDropdown = item.type === 'dropdown';
        const valueLabel =
            item.valueLabel ??
            findActiveItem(normalizeSections(item.items))?.title;

        return (
            <button
                type="button"
                className={`popup_menu_item popup_menu_item_flyout app-transition ${isDropdown ? 'popup_menu_item_dropdown' : ''} ${item.className ?? ''}`}
                onClick={(event: any) => {
                    event.preventDefault();
                    event.stopPropagation();
                    nav.push(item);
                }}
            >
                {item.icon}
                <p className="popup_menu_item_title">{item.title}</p>
                {isDropdown && valueLabel ? (
                    <p className="popup_menu_item_value">{valueLabel}</p>
                ) : null}
                <ChevronRightIcon className="popup_menu_item_chevron" />
            </button>
        );
    }

    return (
        <button
            type="button"
            className={`popup_menu_item app-transition ${item.className ?? ''} ${item.type === 'danger' ? 'popup_menu_item_danger' : ''} ${item.isActive ? 'popup_menu_item_active' : ''} ${item.disabled ? 'popup_menu_item_disabled' : ''}`}
            disabled={item.disabled}
            onClick={() => {
                if (!item.isActive) {
                    item.onClick?.();
                }
                onItemSelect();
            }}
        >
            {item.icon}
            <p className="popup_menu_item_title">{item.title}</p>
        </button>
    );
}

function MenuBody({ sections, onItemSelect }: any) {
    return sections.map((section: any, sectionIndex: any) => (
        <Fragment key={sectionIndex}>
            {sectionIndex > 0 && (
                <div className="popup_menu_separator" role="separator" />
            )}
            <div className="popup_menu_section">
                {section.map((item: any, itemIndex: any) => (
                    <MenuItem
                        key={item.id ?? `${sectionIndex}-${itemIndex}`}
                        item={item}
                        onItemSelect={onItemSelect}
                    />
                ))}
            </div>
        </Fragment>
    ));
}

// A submenu does not open beside the menu: its items replace the current ones
// and slide in from the right, with a back row that returns to the previous
// level. Every visited level stays mounted next to the active one so both can
// slide at once, and the stack height follows the active level.
function MenuStack({ sections, onItemSelect }: any) {
    const [trail, setTrail] = useState<any[]>([]);
    const [depth, setDepth] = useState<any>(0);
    const [height, setHeight] = useState<any>(null);
    const panels = useRef<any[]>([]);
    const timer = useRef<any>(0);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    useLayoutEffect(() => {
        const node = panels.current[depth];

        if (!node) {
            return;
        }

        const measure = () => setHeight(node.offsetHeight);
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
    }, [depth, trail.length]);

    const nav = {
        push: (item: any) => {
            window.clearTimeout(timer.current);
            setTrail((current: any) => [...current.slice(0, depth), item]);
            // The new level is first mounted off to the right, then the next
            // frame moves it in, so it slides instead of appearing in place.
            const target = depth + 1;
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setDepth(target)),
            );
        },
        back: () => {
            window.clearTimeout(timer.current);
            const target = depth - 1;
            setDepth(target);
            timer.current = window.setTimeout(
                () => setTrail((current: any) => current.slice(0, target)),
                MENU_SLIDE_MS,
            );
        },
    };

    const levels = [
        { sections },
        ...trail.map((item: any) => ({
            item,
            sections: normalizeSections(item.items),
        })),
    ];

    return (
        <MenuNavContext.Provider value={nav}>
            <div
                className="popup_menu_stack"
                style={height == null ? undefined : { height }}
            >
                {levels.map((level: any, index: any) => (
                    <div
                        key={index}
                        ref={(node: any) => {
                            panels.current[index] = node;
                        }}
                        className="popup_menu_panel"
                        style={{
                            transform: `translateX(${(index - depth) * 100}%)`,
                        }}
                        aria-hidden={index !== depth}
                        inert={index !== depth}
                    >
                        {level.item ? (
                            <button
                                type="button"
                                className="popup_menu_item popup_menu_back app-transition"
                                onClick={nav.back}
                            >
                                <ChevronLeftIcon className="popup_menu_item_chevron" />
                                <p className="popup_menu_item_title">
                                    {level.item.title}
                                </p>
                            </button>
                        ) : null}
                        {level.item ? (
                            <div
                                className="popup_menu_separator"
                                role="separator"
                            />
                        ) : null}
                        <MenuBody
                            sections={level.sections}
                            onItemSelect={onItemSelect}
                        />
                    </div>
                ))}
            </div>
        </MenuNavContext.Provider>
    );
}

function setPopupPosition(node: any, x: any, y: any) {
    if (!node) {
        return;
    }

    node.style.setProperty('--popup-x', `${Math.round(x ?? 0)}px`);
    node.style.setProperty('--popup-y', `${Math.round(y ?? 0)}px`);
}

function PopupMenu({
    anchorRef,
    children,
    onClose,
    portalRootId,
    layer,
    open,
}: any) {
    const { mounted, visible } = useOverlayPresence(open);
    // The side is chosen once, when the menu opens. Flipping on every resize
    // made the menu jump to the other side as soon as an inline submenu
    // expanded; instead it slides along the screen to stay fully visible and
    // only scrolls when taller than the viewport.
    const [lockedPlacement, setLockedPlacement] = useState<any>(null);
    const { refs, x, y, placement, isPositioned } = useFloating({
        elements: {
            reference: anchorRef.current,
        },
        placement: lockedPlacement ?? 'bottom-start',
        strategy: 'fixed',
        middleware: [
            offset(8),
            lockedPlacement ? null : flip(),
            size({
                apply({ elements }: any) {
                    elements.floating.style.setProperty(
                        '--popup-max-height',
                        `${Math.max(0, window.innerHeight - 16)}px`,
                    );
                },
            }),
            shift({ padding: 8, crossAxis: true }),
        ],
        whileElementsMounted: autoUpdate,
    });

    useEffect(() => {
        if (!mounted) {
            setLockedPlacement(null);
        } else if (isPositioned && !lockedPlacement) {
            setLockedPlacement(placement);
        }
    }, [mounted, isPositioned, placement, lockedPlacement]);

    useFloatingPosition(refs, x, y);

    useEffect(() => {
        if (!mounted) {
            return;
        }

        function handleClick(event: any) {
            if (
                event.target.closest('.popup_menu') ||
                anchorRef.current?.contains(event.target)
            ) {
                return;
            }
            onClose();
        }

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [mounted, onClose, anchorRef]);

    if (!mounted) {
        return null;
    }

    return (
        <FloatingPortal root={document.getElementById(portalRootId)}>
            <div
                ref={(node: any) => {
                    refs.setFloating(node);
                    setPopupPosition(node, x, y);
                }}
                {...popupMenuShellProps({ layer, placement })}
            >
                <PopupMenuSurface visible={visible}>
                    {children}
                </PopupMenuSurface>
            </div>
        </FloatingPortal>
    );
}

function Popup({
    children,
    body,
    className,
    portalRootId = MENU_ROOT_DEFAULT,
    layer,
}: any) {
    const buttonRef = useRef<any>(null);
    const [open, setOpen] = useState<any>(false);
    const [activeLayer, setActiveLayer] = useState<any>('content');
    const sections = normalizeSections(body);

    const handleToggle = () => {
        setOpen((current: any) => {
            if (!current) {
                setActiveLayer(resolveLayer(layer, buttonRef.current));
            }

            return !current;
        });
    };

    return (
        <div className="popup">
            <div
                className={`popup_trigger ${className || ''}`}
                ref={buttonRef}
                onClick={handleToggle}
            >
                {children}
            </div>

            {sections.length > 0 && (
                <PopupMenu
                    open={open}
                    anchorRef={buttonRef}
                    onClose={() => setOpen(false)}
                    portalRootId={portalRootId}
                    layer={activeLayer}
                >
                    <MenuStack
                        sections={sections}
                        onItemSelect={() => setOpen(false)}
                    />
                </PopupMenu>
            )}
        </div>
    );
}

export default Popup;
