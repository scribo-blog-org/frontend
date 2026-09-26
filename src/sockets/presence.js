import { socketClient } from "./socket.client";

const isUserOnline = async (userId) => {
    const status = await loadOnlineStatusForUsers([userId]);
    return Boolean(status[String(userId)]);
};

const loadOnlineStatusForUsers = async (userIds) => {
    return socketClient.queryPresence(userIds);
};

const subscribeUserActivity = (userId, onChange) => {
    let active = true;
    const unsubscribe = socketClient.onPresence((changedUserId, online) => {
        if (String(changedUserId) === String(userId)) {
            onChange(online);
        }
    });

    void isUserOnline(userId).then((online) => {
        if (active) {
            onChange(online);
        }
    });

    return async () => {
        active = false;
        unsubscribe();
    };
};

const subscribePresenceChanges = (onUserChange) => {
    return socketClient.onPresence(onUserChange);
};

const userActivityRoom = (userId) => `user:${userId}`;

export {
    isUserOnline,
    loadOnlineStatusForUsers,
    subscribePresenceChanges,
    subscribeUserActivity,
    userActivityRoom,
};
