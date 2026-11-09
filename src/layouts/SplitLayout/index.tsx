'use client';

import './SplitLayout.scss';

type SplitProps = {
    children: any;
    className?: string;
    mobile?: 'stack' | 'slide';
    open?: boolean;
    leaving?: boolean;
};

const SplitLayout = ({
    children,
    className = '',
    mobile = 'stack',
    open = false,
    leaving = false,
}: SplitProps) => (
    <div
        className={`split split_${mobile}${open ? ' split_open' : ''}${leaving ? ' split_leaving' : ''} ${className}`}
    >
        {children}
    </div>
);

const Aside = ({ children, className = '' }: any) => (
    <aside className={`split_aside ${className}`}>{children}</aside>
);

const Main = ({ children, className = '' }: any) => (
    <section className={`split_main ${className}`}>{children}</section>
);

SplitLayout.Aside = Aside;
SplitLayout.Main = Main;

export default SplitLayout;
