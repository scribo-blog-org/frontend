import './DefaultContainer.scss';

import PageTransition from '../PageTransition';

export default function DefaultContainer({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="default-container">
            <PageTransition>{children}</PageTransition>
        </div>
    );
}
