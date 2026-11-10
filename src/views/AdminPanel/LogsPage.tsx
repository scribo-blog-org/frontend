'use client';

import EventLogs from './Logs';
import { LogsAside } from './LogsFilters';
import RuntimeLogs from './RuntimeLogs';
import { LogsToolbarProvider, useLogsToolbarState } from './logsToolbar';

import './RuntimeLogs.scss';

const LogsPage = () => {
    const toolbar = useLogsToolbarState();
    const { view } = toolbar;

    return (
        <LogsToolbarProvider value={toolbar}>
            <div className="logs_root">
                <div className="logs_page">
                    <LogsAside />
                    {view === 'events' ? <EventLogs /> : <RuntimeLogs />}
                </div>
            </div>
        </LogsToolbarProvider>
    );
};

export default LogsPage;
