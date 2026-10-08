import { useEffect, useState } from 'react';

import {
    captureInstallPrompt,
    installMode,
    promptInstall,
    subscribeInstall,
    type InstallMode,
} from '../utils/install';

export function useInstallPrompt(): {
    mode: InstallMode;
    install: () => Promise<boolean>;
} {
    const [mode, setMode] = useState<InstallMode>('none');

    useEffect(() => {
        captureInstallPrompt();
        setMode(installMode());

        return subscribeInstall(() => setMode(installMode()));
    }, []);

    return { mode, install: promptInstall };
}
