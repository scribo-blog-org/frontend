export function getMessageActions({
    message,
    isOwn,
    isChatLoading,
    editingMessage,
    handlers,
}: any) {
    if (!message || message.deleted_at) {
        return [];
    }

    const items: any[] = [
        {
            id: 'reply',
            title: 'Reply',
            icon: handlers.icons.reply,
            onClick: () => handlers.onReply(message),
            disabled: isChatLoading,
        },
        {
            id: 'select',
            title: 'Select',
            icon: handlers.icons.select,
            onClick: () => handlers.onSelect(message),
            disabled: isChatLoading,
        },
    ];

    if (isOwn) {
        items.push({
            id: 'edit',
            title: 'Edit',
            icon: handlers.icons.edit,
            onClick: () => handlers.onEdit(message),
            disabled: isChatLoading || Boolean(editingMessage),
        });
    }

    items.push({
        id: 'delete',
        title: 'Delete',
        icon: handlers.icons.delete,
        type: 'danger',
        onClick: () => handlers.onDelete(message._id),
        disabled: isChatLoading,
    });

    return items;
}
