'use client';

import DefaultProfileIcon from '../../assets/svg/profile.svg';
import SettingsIcon from '../../assets/svg/settings.svg';
import SupportIcon from '../../assets/svg/support.svg';
import HomeIcon from '../../assets/svg/home-icon.svg';
import DashboardIcon from '../../assets/svg/dashboard.svg';
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
                icon: <SupportIcon />,
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
                      icon: location.pathname.startsWith('/admin-panel') ? (
                          <HomeIcon />
                      ) : (
                          <DashboardIcon />
                      ),
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
