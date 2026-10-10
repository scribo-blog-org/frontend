export const SUPPORT_KINDS = [
    { value: 'complaint', name: 'Complaint' },
    { value: 'request', name: 'Question' },
    { value: 'help', name: 'Help' },
];

export const SUPPORT_STATUSES = [
    { value: 'new', name: 'New' },
    { value: 'in_review', name: 'In review' },
    { value: 'reviewed', name: 'Reviewed' },
];

export const kindLabel = (kind: any) =>
    SUPPORT_KINDS.find((item: any) => item.value === kind)?.name ?? kind;

export const statusLabel = (status: any) =>
    SUPPORT_STATUSES.find((item: any) => item.value === status)?.name ?? status;

const STATUS_TONES: Record<string, any> = {
    new: 'info',
    in_review: 'warning',
    reviewed: 'success',
};

export const statusTone = (status: any) => STATUS_TONES[status] ?? 'neutral';
