import UserIcon from '../../assets/svg/profile.svg';
import AuthorIcon from '../../assets/svg/author.svg';
import ModeratorIcon from '../../assets/svg/shield-security.svg';
import AdminIcon from '../../assets/svg/protected-icon.svg';
import TechAdminIcon from '../../assets/svg/tech-admin.svg';

export const ROLE_ORDER = [
    'tech_admin',
    'admin',
    'moderator',
    'author',
    'user',
];

const ROLE_LABELS: Record<string, string> = {
    user: 'User',
    author: 'Author',
    moderator: 'Moderator',
    admin: 'Administrator',
    tech_admin: 'Technical administrator',
};

export const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

export const roleIcon = (role: string) => {
    switch (role) {
        case 'user':
            return <UserIcon />;
        case 'author':
            return <AuthorIcon />;
        case 'moderator':
            return <ModeratorIcon />;
        case 'admin':
            return <AdminIcon />;
        case 'tech_admin':
            return <TechAdminIcon />;
        default:
            return null;
    }
};

export const canManageRoles = (profile: any) =>
    (profile?.role_management || []).length > 0;

export const canGiveVerification = (profile: any) =>
    (profile?.permissions || []).includes('manage_verification');

/** Roles the viewer may switch this user between, current role included. */
export const roleChoices = (profile: any, user: any) => {
    const allowed = new Set<string>(profile?.role_management || []);
    if (!allowed.has(user.role)) {
        return [];
    }
    return ROLE_ORDER.filter((role) => allowed.has(role));
};
