export function syncBodyThemeClass(isDarkTheme: any) {
    const hasDarkClass = document.body.classList.contains('dark-theme');

    if (hasDarkClass === isDarkTheme) {
        return;
    }

    document.body.classList.toggle('dark-theme', isDarkTheme);
}

export function syncMetaThemeColor(isDarkTheme: any) {
    const next = isDarkTheme ? '#1e1e1e' : '#ffffff';
    const meta = document.querySelector('meta[name="theme-color"]');

    if (meta && meta.getAttribute('content') !== next) {
        meta.setAttribute('content', next);
    }
}

export function syncAccentAndCategoryVars(
    isDarkTheme: any,
    categoryColors: any,
    accentColor: any,
) {
    Object.values(categoryColors).forEach((color: any) => {
        document.body.style.setProperty(
            color.variable,
            isDarkTheme ? color.dark : color.light,
        );
    });

    document.body.style.setProperty(
        accentColor.variable,
        isDarkTheme ? accentColor.dark : accentColor.light,
    );
}
