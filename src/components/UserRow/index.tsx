'use client';

import { PanelRow } from '../Ui';
import UserBadge from '../UserBadge';
import UserActivityStatus from '../UserActivityStatus';

import './UserRow.scss';

type UserRowProps = {
    user: any;
    viewerId?: string;
    // The default line under the name is the activity status ("Online",
    // "3 hours ago"). Pass `description` to show something else, or
    // `status={false}` to show nothing.
    status?: boolean;
    description?: any;
    trailing?: any;
    asLink?: boolean;
    onClick?: () => void;
    className?: string;
};

// A person as a row of a Panel: avatar and name with the status next to it,
// and something on the right (a role, a button, a menu).
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
