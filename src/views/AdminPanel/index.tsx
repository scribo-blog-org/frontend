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

import SidebarPage from '../../components/SidebarPage/index';

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
            title: 'Дашборд',
            key: 'dashboard',
            icon: <ChartIcon />,
            content: <DashboardPage />,
        },
        {
            title: 'Категории',
            key: 'categories',
            icon: <TagIcon />,
            content: <CategoriesPage />,
        },
        {
            title: 'Администраторы',
            key: 'admins',
            icon: <PeoplesIcon />,
            content: <AdminsPage />,
        },
        {
            title: 'Логи',
            key: 'logs',
            icon: <LogIcon />,
            content: <LogsPage />,
        },
        {
            title: 'Запросы',
            key: 'requests',
            icon: <CommentIcon />,
            content: <RequestsPage />,
        },
        // В дампе вся база, поэтому вкладка только у tech_admin, как и API.
        ...(profile?.role === 'tech_admin'
            ? [
                  {
                      title: 'Бекапы',
                      key: 'backups',
                      icon: <ShieldIcon />,
                      content: <BackupsPage />,
                  },
              ]
            : []),
    ];

    return (
        <div className="admin_panel_page">
            <SidebarPage pageTitle={'Панель администратора'} pages={pages} />
        </div>
    );
};

export default AdminPanel;
