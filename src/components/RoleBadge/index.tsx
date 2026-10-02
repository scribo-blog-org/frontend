'use client';

import './RoleBadge.scss';

import AdminIcon from '../../assets/svg/protected-icon.svg';
import AuthorIcon from '../../assets/svg/author.svg';
import ModeratorIcon from '../../assets/svg/shield-security.svg';
import TechAdminIcon from '../../assets/svg/tech-admin.svg';

import Tooltip from '../../components/Ui/Tooltip/index';

const RoleBadge = ({ user }: any) => {
    switch (user?.role) {
        case 'author':
            return (
                <Tooltip text={'Author'}>
                    <div className="role_badge role_author app-transition">
                        <>
                            <AuthorIcon />
                            <p>Author</p>
                        </>
                    </div>
                </Tooltip>
            );
        case 'moderator':
            return (
                <Tooltip text={'Moderator'}>
                    <div className="role_badge role_moderator app-transition">
                        <>
                            <ModeratorIcon />
                            <p>Moderator</p>
                        </>
                    </div>
                </Tooltip>
            );
        case 'admin':
            return (
                <Tooltip text={'Administrator'}>
                    <div className="role_badge role_admin app-transition">
                        <>
                            <AdminIcon />
                            <p>Administrator</p>
                        </>
                    </div>
                </Tooltip>
            );
        case 'tech_admin':
            return (
                <Tooltip text={'Technical administrator'}>
                    <div className="role_badge role_tech_admin app-transition">
                        <>
                            <TechAdminIcon />
                            <p>Technical administrator</p>
                        </>
                    </div>
                </Tooltip>
            );
        default:
            return <></>;
    }
};

export default RoleBadge;
