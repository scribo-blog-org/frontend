import { socketClient } from "./socket.client";

const isUserOnline = async (userId: any) => {
    const status: any = await loadOnlineStatusForUsers([userId]);
    return Boolean(status[String(userId)]);
};

const loadOnlineStatusForUsers = async (userIds: any) => {
    return socketClient.queryPresence(userIds);
};

const subscribeUserActivity = (userId: any, onChange: any) => {
    let active = true;
    const unsubscribe = socketClient.onPresence((changedUserId: any, online: any) => {
        if (String(changedUserId) === String(userId)) {
            onChange(online);
        }
    });

    void isUserOnline(userId).then((online: any) => {
        if (active) {
            onChange(online);
        }
    });

    return async () => {
        active = false;
        unsubscribe();
    };
};

const subscribePresenceChanges = (onUserChange: any) => {
    return socketClient.onPresence(onUserChange);
};

const userActivityRoom = (userId: any) => `user:${userId}`;

export {
    isUserOnline,
    loadOnlineStatusForUsers,
    subscribePresenceChanges,
    subscribeUserActivity,
    userActivityRoom,
};
