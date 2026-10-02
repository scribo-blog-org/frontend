'use client';

import './AdminPanel.scss';

import TagIcon from '../../assets/svg/tag.svg';
import PeoplesIcon from '../../assets/svg/peoples.svg';
import LogIcon from '../../assets/svg/post.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import ChartIcon from '../../assets/svg/chart.svg';
import ShieldIcon from '../../assets/svg/shield-security.svg';

import { useNavigate } from '@/navigation';
import { useContext, useEffect } from 'react';

import { AppContext } from '@/providers/AppProviders';

import TabsPage from '../../components/TabsPage/index';

import CategoriesPage from './Categories';
import LogsPage from './Logs';
import AdminsPage from './Admins';
import RequestsPage from './Requests';
import DashboardPage from './Dashboard';
import BackupsPage from './Backups';

const AdminPanel = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useContext(AppContext);

    useEffect(() => {
        if (
            !profileLoading &&
            !['admin', 'tech_admin'].includes(profile?.role)
        ) {
            navigate('/');
        }
    }, [profile, profileLoading, navigate]);

    const pages = [
        {
            title: 'Dashboard',
            key: 'dashboard',
            icon: <ChartIcon />,
            content: <DashboardPage />,
        },
        {
            title: 'Categories',
            key: 'categories',
            icon: <TagIcon />,
            content: <CategoriesPage />,
        },
        {
            title: 'Administrators',
            key: 'admins',
            icon: <PeoplesIcon />,
            content: <AdminsPage />,
        },
        {
            title: 'Logs',
            key: 'logs',
            icon: <LogIcon />,
            content: <LogsPage />,
        },
        {
            title: 'Requests',
            key: 'requests',
            icon: <CommentIcon />,
            content: <RequestsPage />,
        },
        ...(profile?.role === 'tech_admin'
            ? [
                  {
                      title: 'Backups',
                      key: 'backups',
                      icon: <ShieldIcon />,
                      content: <BackupsPage />,
                  },
              ]
            : []),
    ];

    return (
        <div className="admin_panel_page">
            <TabsPage label="Admin panel" pages={pages} />
        </div>
    );
};

export default AdminPanel;
