import './FullContainer.scss';

export default function FullContainer({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="full-container">{children}</div>;
}
