'use client';

import EventLogs from './Logs';
import RuntimeLogs from './RuntimeLogs';
import { LogsToolbarProvider, useLogsToolbarState } from './logsToolbar';

import './RuntimeLogs.scss';

const LogsPage = () => {
    const toolbar = useLogsToolbarState();
    const { view } = toolbar;

    return (
        <LogsToolbarProvider value={toolbar}>
            <div className="logs_root">
                {view === 'events' ? <EventLogs /> : <RuntimeLogs />}
            </div>
        </LogsToolbarProvider>
    );
};

export default LogsPage;
