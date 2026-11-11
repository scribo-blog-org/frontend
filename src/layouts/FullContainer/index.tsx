import './FullContainer.scss';

import PageTransition from '../PageTransition';

export default function FullContainer({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="full-container">
            <PageTransition>{children}</PageTransition>
        </div>
    );
}
