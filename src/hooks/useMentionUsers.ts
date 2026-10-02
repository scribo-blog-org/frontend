import { useEffect, useMemo, useState } from 'react';

import { getUsersByIds } from '../api/users.api';
import { extractMentionUserIds } from '../content/mentions';

export function useMentionUserMap(userIds: any) {
    const idsKey = Array.isArray(userIds) ? userIds.join(',') : '';
    const ids = useMemo(
        () => [...new Set((userIds || []).map(String).filter(Boolean))],
        [idsKey, userIds],
    );
    const [userMap, setUserMap] = useState<any>({});

    useEffect(() => {
        let cancelled = false;

        if (!ids.length) {
            setUserMap({});
            return undefined;
        }

        getUsersByIds(ids).then((users: any) => {
            if (cancelled) {
                return;
            }

            const map: any = {};
            for (const user of users) {
                if (user?._id) {
                    map[String(user._id)] = user;
                }
            }
            setUserMap(map);
        });

        return () => {
            cancelled = true;
        };
    }, [ids]);

    return userMap;
}

export function useMentionUsers(text: any, extraUsers: any) {
    const ids = useMemo(() => extractMentionUserIds(text), [text]);
    const extraIds = useMemo(
        () =>
            (extraUsers || [])
                .map((user: any) => String(user?._id || ''))
                .filter(Boolean)
                .join(','),
        [extraUsers],
    );
    const [userMap, setUserMap] = useState<any>({});

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const map: any = {};

            if (!ids.length && !extraIds) {
                setUserMap({});
                return undefined;
            }

            for (const user of extraUsers || []) {
                if (user?._id) {
                    map[String(user._id)] = user;
                }
            }

            const missing = ids.filter((id: any) => !map[id]);
            if (missing.length) {
                const users = await getUsersByIds(missing);
                for (const user of users) {
                    if (user?._id) {
                        map[String(user._id)] = user;
                    }
                }
            }

            if (!cancelled) {
                setUserMap(map);
            }
        };

        if (!ids.length && !extraUsers?.length) {
            setUserMap({});
            return undefined;
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [extraIds, extraUsers, ids]);

    return userMap;
}
