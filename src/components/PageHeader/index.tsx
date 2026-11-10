import './PageHeader.scss';

const PageHeader = ({ title, description, actions, className = '' }: any) => (
    <header className={`page_header ${className}`}>
        <div className="page_header_copy">
            <h1 className="page_header_title">{title}</h1>
            {description ? (
                <p className="page_header_description">{description}</p>
            ) : null}
        </div>
        {actions ? <div className="page_header_actions">{actions}</div> : null}
    </header>
);

export default PageHeader;
