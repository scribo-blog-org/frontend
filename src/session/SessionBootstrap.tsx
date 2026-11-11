'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getProfile } from '../api/profile.api';
import { trackVisit } from '../api/analytics.api';
import {
    getAccessToken,
    probeBackend,
    refreshAccessToken,
    subscribeAccessToken,
    subscribeBackendAvailability,
} from '../api/http';
import { socketService } from '../sockets/socket.service';
import AppBootScreen from './AppBootScreen';
import AppUnavailableScreen from './AppUnavailableScreen';
import './AppStatusScreen.scss';

const SKIP_TRACKING = /^\/admin-panel/;
const SOCKET_WAIT_MS = 8000;

const SessionBootstrap = ({ children, hasSession = false }: any) => {
    const location = useLocation();
    const { profile, setProfile, setProfileLoading } = useContext(AppContext);
    const [sessionReady, setSessionReady] = useState<any>(!hasSession);
    const [backendDown, setBackendDown] = useState<any>(false);
    const [isRetrying, setIsRetrying] = useState<any>(false);
    const profileRef = useRef(profile);
    const requestIdRef = useRef(0);
    const bootstrappedRef = useRef(false);
    const backendDownRef = useRef(false);
    // socket connections run one after another and never hold up the app
    const socketChainRef = useRef<Promise<unknown>>(Promise.resolve());

    profileRef.current = profile;
    backendDownRef.current = backendDown;

    const loadSession = useCallback(
        async ({ blocking = false }: any = {}) => {
            const requestId = ++requestIdRef.current;

            if (!getAccessToken()) {
                setProfile(null);
                setProfileLoading(false);
                return;
            }

            const silent = Boolean(profileRef.current) && !blocking;

            if (!silent) {
                setProfileLoading(true);
            }

            try {
                const result = await getProfile();

                if (requestId !== requestIdRef.current || !getAccessToken()) {
                    return;
                }

                if (result.status) {
                    setProfile(result.data);
                    profileRef.current = result.data;

                    // The app does not need the socket to render, so connect
                    // in the background instead of keeping the boot screen
                    // until the room is subscribed.
                    const user = result.data;
                    const token = getAccessToken();

                    socketChainRef.current = socketChainRef.current
                        .then(() =>
                            // never let a stuck connection block the next one
                            Promise.race([
                                socketService.init(user, token),
                                new Promise((resolve) =>
                                    setTimeout(resolve, SOCKET_WAIT_MS),
                                ),
                            ]),
                        )
                        .catch(() => undefined);
                } else if (result.unauthorized) {
                    setProfile(null);
                    profileRef.current = null;
                }
            } finally {
                if (requestId === requestIdRef.current) {
                    setProfileLoading(false);
                }
            }
        },
        [setProfile, setProfileLoading],
    );

    const startSession = useCallback(async () => {
        // independent of each other: run them together, the token refresh
        // also reports an unreachable backend by itself
        const [reachable] = await Promise.all([
            probeBackend(),
            refreshAccessToken(),
        ]);

        if (!reachable) {
            bootstrappedRef.current = true;
            setBackendDown(true);
            setProfileLoading(false);
            return false;
        }

        setBackendDown(false);
        await loadSession({ blocking: true });
        bootstrappedRef.current = true;
        return true;
    }, [loadSession, setProfileLoading]);

    useEffect(() => {
        const unsubscribe = socketService.on(
            'notification',
            (notifications: any) => {
                setProfile((prevProfile: any) => ({
                    ...prevProfile,
                    notifications,
                }));
            },
        );

        return unsubscribe;
    }, [setProfile]);

    useEffect(() => {
        return subscribeBackendAvailability((available: any) => {
            setBackendDown(!available);

            if (!available) {
                setSessionReady(true);
                setProfileLoading(false);
            }
        });
    }, [setProfileLoading]);

    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            try {
                await startSession();
            } finally {
                if (!cancelled) {
                    bootstrappedRef.current = true;
                    setSessionReady(true);
                }
            }
        };

        bootstrap();

        return () => {
            cancelled = true;
        };
    }, [startSession]);

    useEffect(() => {
        return subscribeAccessToken((token: any) => {
            if (!bootstrappedRef.current || backendDownRef.current) {
                return;
            }

            if (!token) {
                requestIdRef.current += 1;
                profileRef.current = null;
                setProfile(null);
                setProfileLoading(false);
                socketService.disconnect();
                setSessionReady(true);
                return;
            }

            if (profileRef.current) {
                loadSession({ blocking: false });
                return;
            }

            setSessionReady(false);
            setProfileLoading(true);

            loadSession({ blocking: true }).finally(() => {
                if (bootstrappedRef.current && !backendDownRef.current) {
                    setSessionReady(true);
                }
            });
        });
    }, [loadSession, setProfile, setProfileLoading]);

    useEffect(() => {
        if (!sessionReady || backendDown) {
            return;
        }

        const path = location.pathname;

        if (!SKIP_TRACKING.test(path)) {
            trackVisit(path);
        }
    }, [sessionReady, backendDown, location.pathname]);

    const retry = async () => {
        setIsRetrying(true);
        setSessionReady(false);
        setProfileLoading(true);

        try {
            await startSession();
        } finally {
            setIsRetrying(false);
            setSessionReady(true);
        }
    };

    const statusScreen = !sessionReady ? (
        <AppBootScreen />
    ) : backendDown ? (
        <AppUnavailableScreen onRetry={retry} isRetrying={isRetrying} />
    ) : null;

    return <div className="session-gate">{statusScreen || children}</div>;
};

export default SessionBootstrap;
