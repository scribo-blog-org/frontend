'use client';

import PrimaryButton from '../components/Ui/PrimaryButton';
import ErrorIllustration from '../assets/svg/illustrations/scribo-server-error.svg';
import RetryIcon from '../assets/svg/illustrations/retry.svg';
import AppStatusScreen from './AppStatusScreen';

const AppUnavailableScreen = ({ onRetry, isRetrying = false }: any) => (
    <AppStatusScreen
        illustration={<ErrorIllustration />}
        title="Something went wrong"
        role="alert"
        live="assertive"
        label="Server unavailable"
        actions={
            <PrimaryButton
                type="button"
                onClick={onRetry}
                isLoading={isRetrying}
            >
                <RetryIcon width={16} height={16} />
                Try again
            </PrimaryButton>
        }
    >
        <p className="app-status_lead">
            Something went wrong on the server.
            <br />
            We are already looking into it.
        </p>
    </AppStatusScreen>
);

export default AppUnavailableScreen;
