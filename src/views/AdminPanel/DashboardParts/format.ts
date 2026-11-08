export const formatNumber = (value: any) =>
    new Intl.NumberFormat('ru-RU').format(value || 0);

export const formatMs = (value: any) => {
    const ms = Number(value || 0);
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1)} s`;
    }
    return `${Math.round(ms)} ms`;
};

export const formatPercent = (share: any) => {
    const percent = Number(share || 0) * 100;
    if (percent > 0 && percent < 1) {
        return '<1%';
    }
    return `${Math.round(percent)}%`;
};

// Days on the dashboard are UTC days, so they are written in UTC too.
export const formatDay = (iso: any) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    });

export const formatHour = (iso: any) =>
    new Date(`${iso}:00:00Z`).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });

export const routeLabel = (route: string) => route.replace(' /api', ' ');

// "26 Oct — 8 Nov" for a window of whole UTC days. `to` is exclusive.
export const formatDayRange = (from: any, to: any) => {
    const first = new Date(from);
    const last = new Date(new Date(to).getTime() - 1);
    const a = formatDay(first.toISOString().slice(0, 10));
    const b = formatDay(last.toISOString().slice(0, 10));
    return a === b ? a : `${a} — ${b}`;
};

export const toDayKey = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (key: string, days: number) => {
    const date = new Date(`${key}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return toDayKey(date);
};

// How a number moved against the previous period. Nothing is said when both
// are zero, and a missing previous value means there is no comparison.
export const deltaLabel = (current: any, previous: any) => {
    if (previous === null || previous === undefined) {
        return null;
    }

    const curr = Number(current || 0);
    const prev = Number(previous || 0);

    if (!prev && !curr) {
        return null;
    }

    if (!prev) {
        return { text: 'Nothing in the previous period', tone: 'up' };
    }

    const abs = curr - prev;
    if (abs === 0) {
        return { text: 'Same as the previous period', tone: 'flat' };
    }

    const percent = Math.round((Math.abs(abs) / prev) * 100);
    const sign = abs > 0 ? '+' : '−';

    return {
        text: `${sign}${formatNumber(Math.abs(abs))} (${percent}%) vs previous period`,
        tone: abs > 0 ? 'up' : 'down',
    };
};
