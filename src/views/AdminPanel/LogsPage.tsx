'use client';

import SwitchBar from '../../components/Ui/SwitchBar';

import EventLogs from './Logs';
import RuntimeLogs from './RuntimeLogs';
import {
    LOG_VIEWS,
    LogsToolbarProvider,
    useLogsToolbarState,
} from './logsToolbar';

import './RuntimeLogs.scss';

const VIEW_LABELS = ['Events', 'Runtime'];

const LogsPage = () => {
    const toolbar = useLogsToolbarState();
    const { view, setView } = toolbar;

    return (
        <LogsToolbarProvider value={toolbar}>
            <div className="logs_root">
                <SwitchBar
                    className="logs_root_tabs"
                    items={VIEW_LABELS}
                    activeIndex={Math.max(LOG_VIEWS.indexOf(view), 0)}
                    onChange={(index: number) => setView(LOG_VIEWS[index])}
                />
                {view === 'events' ? <EventLogs /> : <RuntimeLogs />}
            </div>
        </LogsToolbarProvider>
    );
};

export default LogsPage;
