const isPathActive = (pathname: any, path: any) => {
    if (!path) {
        return false;
    }

    if (path === '/') {
        return pathname === '/';
    }

    return pathname === path || pathname.startsWith(`${path}/`);
};

const scrollToTop = () => {
    const opts = { top: 0, left: 0, behavior: 'auto' as const };

    document.querySelector('.app-shell_content')?.scrollTo(opts);
};

const scrollTo = (object: any, block: any = 'center') => {
    document.getElementById(object)?.scrollIntoView({
        behavior: 'smooth',
        block,
    });
};

const handleSameRouteClick = (event: any, pathname: any, path: any) => {
    if (!isPathActive(pathname, path)) {
        return;
    }

    event.preventDefault();
    scrollToTop();
};

const navigateOrScrollTop = (navigate: any, pathname: any, path: any) => {
    if (isPathActive(pathname, path)) {
        scrollToTop();
        return;
    }

    navigate(path);
};

export {
    scrollTo,
    scrollToTop,
    isPathActive,
    handleSameRouteClick,
    navigateOrScrollTop,
};
