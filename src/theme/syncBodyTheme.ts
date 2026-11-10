export function syncBodyThemeClass(isDarkTheme: any) {
    const hasDarkClass = document.body.classList.contains('dark-theme');

    if (hasDarkClass === isDarkTheme) {
        return;
    }

    document.body.classList.toggle('dark-theme', isDarkTheme);
}

export function syncMetaThemeColor(isDarkTheme: any) {
    const next = isDarkTheme ? '#161616' : '#ffffff';
    const meta = document.querySelector('meta[name="theme-color"]');

    if (meta && meta.getAttribute('content') !== next) {
        meta.setAttribute('content', next);
    }
}
