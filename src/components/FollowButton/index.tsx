'use client';

import { useContext, useState } from 'react';
import { AppContext } from '@/providers/AppProviders';

import { follow } from '../../api/users.api';
import { hasId, sameId } from '../../utils/ids';

import './FollowButton.scss';

import ActionButton from '../Ui/ActionButton';

const FollowButton = ({ setNewData, authorId, className }: any) => {
    const { profile, showToast } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState<any>(false);

    const followUser = async () => {
        setIsLoading(true);
        try {
            const result = await follow({ method: 'POST', user_id: authorId });

            if (result.status === true) {
                await setNewData(result.data);
                showToast({
                    message: `Вы подписались на ${result.data.followed.nick_name}!`,
                    type: 'success',
                });
            } else {
                if (result.statusCode === 401) {
                    showToast({
                        type: 'warning',
                        message: 'Чтобы подписаться нужно войти в аккаунт!',
                    });
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const unfollowUser = async () => {
        setIsLoading(true);
        try {
            const result = await follow({
                method: 'DELETE',
                user_id: authorId,
            });

            if (result.status === true) {
                await setNewData(result.data);
                showToast({
                    message: `Вы отписались от ${result.data.followed.nick_name}!`,
                    type: 'success',
                });
            } else {
                if (result.statusCode === 401) {
                    showToast({
                        type: 'warning',
                        message: 'Чтобы отписаться нужно войти в аккаунт!',
                    });
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return profile?.follows?.some((item: any) => hasId([item], authorId)) ? (
        <ActionButton
            isLoading={isLoading}
            onClick={() => unfollowUser()}
            className={`follow_button app-transition ${className ?? ''} ${sameId(profile?._id, authorId) ? 'non_visible' : ''}`}
        >
            Отписаться
        </ActionButton>
    ) : (
        <ActionButton
            isLoading={isLoading}
            onClick={() => followUser()}
            className={`follow_button app-transition ${className ?? ''} ${sameId(profile?._id, authorId) ? 'non_visible' : ''}`}
        >
            Подписаться
        </ActionButton>
    );
};

export default FollowButton;
