'use client';

import DefaultProfileIcon from '../../assets/svg/profile.svg';
import SettingsIcon from '../../assets/svg/settings.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import RedirectIcon from '../../assets/svg/redirect.svg';
import LogoutIcon from '../../assets/svg/logout.svg';

export const isAdminRole = (role: any) =>
    ['admin', 'tech_admin'].includes(role);

export function getAccountMenuBody({
    profile,
    location,
    navigate,
    setProfile,
    showToast,
    logout,
}: any) {
    return [
        [
            {
                title: 'To profile',
                icon: <DefaultProfileIcon />,
                onClick: () => {
                    navigate(`/users/${profile.nick_name}`);
                },
            },
            {
                title: 'Settings',
                icon: <SettingsIcon />,
                onClick: () => {
                    navigate(`/settings`);
                },
            },
            {
                title: 'Support',
                icon: <CommentIcon />,
                onClick: () => {
                    navigate('/support/mine');
                },
            },
        ],
        isAdminRole(profile?.role)
            ? [
                  {
                      title: location.pathname.startsWith('/admin-panel')
                          ? 'Home'
                          : 'To the admin panel',
                      icon: <RedirectIcon />,
                      onClick: () =>
                          navigate(
                              location.pathname.startsWith('/admin-panel')
                                  ? '/'
                                  : '/admin-panel?tab=dashboard',
                          ),
                  },
              ]
            : [],
        [
            {
                title: 'Log out',
                icon: <LogoutIcon />,
                type: 'danger',
                onClick: () => {
                    setProfile(null);
                    logout().then(() => {
                        showToast({
                            type: 'success',
                            message: 'You have logged out!',
                        });
                        navigate('/');
                    });
                },
            },
        ],
    ];
}
