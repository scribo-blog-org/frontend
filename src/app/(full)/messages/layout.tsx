import Messages from '@/views/Messages';

export default function MessagesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Messages />
            {children}
        </>
    );
}
