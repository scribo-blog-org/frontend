export function messagePreviewText(message: any) {
    if (!message || message.deleted_at) {
        return '';
    }

    return String(message.text || '').trim();
}

export function quotePreviewText(preview: any) {
    if (!preview || preview.deleted || preview.deleted_at) {
        return 'Сообщение удалено';
    }

    return String(preview.text || '').trim() || 'Сообщение';
}
