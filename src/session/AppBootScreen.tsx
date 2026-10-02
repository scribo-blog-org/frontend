'use client';

import LoadingIllustration from '../assets/svg/illustrations/scribo-loading.svg';
import AppStatusScreen from './AppStatusScreen';

const AppBootScreen = () => (
    <AppStatusScreen
        illustration={
            <>
                <LoadingIllustration />
                <span className="app-boot-spinner" aria-hidden="true">
                    <span className="app-boot-spinner_ring" />
                </span>
            </>
        }
        title="Loading..."
        busy
        label="Loading the app"
    >
        <p className="app-status_lead">
            This can take a few seconds.
            <br />
            Thanks for your patience.
        </p>
    </AppStatusScreen>
);

export default AppBootScreen;
