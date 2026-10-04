function format_date_time(date: any) {
    date = new Date(date);

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${hours}:${minutes} - ${day}.${month}.${year}`;
}

function format_time(date: any) {
    date = new Date(date);

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
}

const MESSAGE_DATE_MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

function startOfDay(date: any) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

function format_list_date(date: any) {
    const value = new Date(date);
    const day = value.getDate().toString().padStart(2, '0');
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const year = value.getFullYear();

    return `${day}.${month}.${year}`;
}

function format_message_date_label(date: any) {
    const target = startOfDay(date);
    const today = startOfDay(new Date());
    const diffDays = Math.round(
        (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (diffDays === 0) {
        return 'Today';
    }

    if (diffDays === 1) {
        return 'Yesterday';
    }

    const day = target.getDate();
    const month = MESSAGE_DATE_MONTHS[target.getMonth()];
    const year = target.getFullYear();

    if (year === today.getFullYear()) {
        return `${month} ${day}`;
    }

    return `${month} ${day}, ${year}`;
}

function is_same_calendar_day(left: any, right: any) {
    const leftDate = new Date(left);
    const rightDate = new Date(right);

    return (
        leftDate.getFullYear() === rightDate.getFullYear() &&
        leftDate.getMonth() === rightDate.getMonth() &&
        leftDate.getDate() === rightDate.getDate()
    );
}

const format_back = (date_time: any) => {
    if (!date_time) return '';

    const now = new Date();
    const past = new Date(date_time);
    const diffInMs = now.getTime() - past.getTime();

    if (diffInMs < 0) return 'just now';

    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    const ago = (number: number, one: string, many: string) =>
        `${number} ${number === 1 ? one : many} ago`;

    if (diffInSeconds < 60) {
        if (diffInSeconds <= 0) return 'just now';
        return ago(diffInSeconds, 'second', 'seconds');
    }

    if (diffInMinutes < 60) {
        return ago(diffInMinutes, 'minute', 'minutes');
    }

    if (diffInHours < 24) {
        return ago(diffInHours, 'hour', 'hours');
    }

    if (diffInDays < 30) {
        return ago(diffInDays, 'day', 'days');
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return ago(diffInMonths, 'month', 'months');
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return ago(diffInYears, 'year', 'years');
};

function getCategoryColorType(categoryName: any) {
    switch (categoryName?.toLowerCase()) {
        case 'news':
        case 'новости':
            return 1;
        case 'politics':
        case 'политика':
            return 2;
        case 'dev':
            return 3;
        case 'other':
        case 'другое':
            return 4;
        default:
            return 0;
    }
}
export {
    format_date_time,
    format_time,
    format_list_date,
    format_message_date_label,
    is_same_calendar_day,
    format_back,
    getCategoryColorType,
};
