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
                <Tooltip text={'Автор'}>
                    <div className="role_badge role_author app-transition">
                        <>
                            <AuthorIcon />
                            <p>Автор</p>
                        </>
                    </div>
                </Tooltip>
            );
        case 'moderator':
            return (
                <Tooltip text={'Модератор'}>
                    <div className="role_badge role_moderator app-transition">
                        <>
                            <ModeratorIcon />
                            <p>Модератор</p>
                        </>
                    </div>
                </Tooltip>
            );
        case 'admin':
            return (
                <Tooltip text={'Администратор'}>
                    <div className="role_badge role_admin app-transition">
                        <>
                            <AdminIcon />
                            <p>Администратор</p>
                        </>
                    </div>
                </Tooltip>
            );
        case 'tech_admin':
            return (
                <Tooltip text={'Технический администратор'}>
                    <div className="role_badge role_tech_admin app-transition">
                        <>
                            <TechAdminIcon />
                            <p>Технический администратор</p>
                        </>
                    </div>
                </Tooltip>
            );
        default:
            return <></>;
    }
};

export default RoleBadge;
