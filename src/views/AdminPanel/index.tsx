'use client';

import './AdminPanel.scss';

import PeoplesIcon from '../../assets/svg/peoples.svg';
import LogsIcon from '../../assets/svg/logs.svg';
import SupportIcon from '../../assets/svg/support.svg';
import ChartIcon from '../../assets/svg/chart.svg';
import BackupIcon from '../../assets/svg/backup.svg';

import { useNavigate } from '@/navigation';
import { useContext, useEffect, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';
import { getAppInfo } from '../../api/analytics.api';
import { Pill } from '../../components/Ui';

import { useAdminAttention } from '../../hooks/useAdminAttention';
import TabsPage from '../../components/TabsPage/index';

import LogsPage from './Logs';
import AdminsPage from './Admins';
import UsersPage from './Users';
import RequestsPage from './Requests';
import DashboardPage from './Dashboard';
import BackupsPage from './Backups';

const AdminPanel = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useContext(AppContext);
    const adminAttention = useAdminAttention(profile);
    const [version, setVersion] = useState<string | null>(null);
    const isAdmin = ['admin', 'tech_admin'].includes(profile?.role);

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        let cancelled = false;

        getAppInfo().then((result: any) => {
            if (!cancelled && result?.status && result.data?.version) {
                setVersion(result.data.version);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

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
            title: 'Users',
            key: 'users',
            icon: <PeoplesIcon />,
            content: <UsersPage />,
        },
        {
            title: 'Administrators',
            key: 'admins',
            icon: <PeoplesIcon />,
            content: <AdminsPage />,
        },
        {
            title: 'Support',
            key: 'requests',
            icon: <SupportIcon />,
            dot: adminAttention.support,
            content: <RequestsPage />,
        },
        {
            title: 'Logs',
            key: 'logs',
            icon: <LogsIcon />,
            content: <LogsPage />,
        },
        ...(profile?.role === 'tech_admin'
            ? [
                  {
                      title: 'Backups',
                      key: 'backups',
                      icon: <BackupIcon />,
                      content: <BackupsPage />,
                  },
              ]
            : []),
    ];

    return (
        <div className="admin_panel_page">
            <TabsPage
                label="Admin panel"
                pages={pages}
                aside={version ? <Pill tone="neutral">v{version}</Pill> : null}
            />
        </div>
    );
};

export default AdminPanel;
