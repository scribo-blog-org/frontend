'use client';

import { PanelRow } from '../Ui';
import UserBadge from '../UserBadge';
import UserActivityStatus from '../UserActivityStatus';

import './UserRow.scss';

type UserRowProps = {
    user: any;
    viewerId?: string;
    status?: boolean;
    description?: any;
    trailing?: any;
    asLink?: boolean;
    onClick?: () => void;
    className?: string;
};

const UserRow = ({
    user,
    viewerId,
    status = true,
    description,
    trailing,
    asLink = true,
    onClick,
    className = '',
}: UserRowProps) => (
    <PanelRow
        className={`user_row ${className}`.trim()}
        title={
            <span className="user_row_line">
                <UserBadge data={user} asLink={asLink && !onClick} />
                {description ??
                    (status ? (
                        <UserActivityStatus
                            user={user}
                            viewerId={viewerId}
                            className="user_row_status"
                        />
                    ) : null)}
            </span>
        }
        trailing={trailing}
        onClick={onClick}
    />
);

export default UserRow;
