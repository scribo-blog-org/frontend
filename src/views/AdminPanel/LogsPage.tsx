'use client';

import ActionButton from '../../components/Ui/ActionButton';

import EventLogs from './Logs';
import RuntimeLogs from './RuntimeLogs';
import { LogsToolbarProvider, useLogsToolbarState } from './logsToolbar';

import './RuntimeLogs.scss';

const SOURCES = [
    { value: 'events', name: 'Events' },
    { value: 'backend', name: 'Backend' },
    { value: 'socket', name: 'Socket' },
    { value: 'frontend', name: 'Frontend' },
];

const LogsPage = () => {
    const toolbar = useLogsToolbarState();
    const { source, setSource } = toolbar;

    return (
        <LogsToolbarProvider value={toolbar}>
            <div className="logs_root">
                <div className="logs_root_sources">
                    {SOURCES.map((item) => (
                        <ActionButton
                            key={item.value}
                            size="lg"
                            className={
                                source === item.value
                                    ? 'logs_source_active'
                                    : ''
                            }
                            aria-pressed={source === item.value}
                            onClick={() => setSource(item.value)}
                        >
                            {item.name}
                        </ActionButton>
                    ))}
                </div>
                {source === 'events' ? (
                    <EventLogs />
                ) : (
                    <RuntimeLogs key={source} source={source} />
                )}
            </div>
        </LogsToolbarProvider>
    );
};

export default LogsPage;
