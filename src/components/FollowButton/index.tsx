'use client';

import { useContext, useRef } from 'react';
import { AppContext } from '@/providers/AppProviders';

import { follow } from '../../api/users.api';
import { hasId, sameId, setIdPresent } from '../../utils/ids';

import './FollowButton.scss';

import ActionButton from '../Ui/ActionButton';

const FollowButton = ({
    setNewData,
    authorId,
    className,
    size = 'md',
    onOptimisticChange,
}: any) => {
    const { profile, setProfile, showToast } = useContext(AppContext);
    const pendingRef = useRef(false);

    const isFollowing = Boolean(
        profile?.follows?.some((item: any) => hasId([item], authorId)),
    );

    // The button flips immediately and is restored if the server rejects the
    // change, so a slow request never leaves the UI waiting.
    const toggleFollow = async () => {
        if (pendingRef.current) return;
        pendingRef.current = true;
        const willFollow = !isFollowing;
        const canPredict = Boolean(profile);

        if (canPredict) {
            setProfile((prev: any) =>
                prev
                    ? {
                          ...prev,
                          follows: setIdPresent(
                              prev.follows,
                              authorId,
                              willFollow,
                          ),
                      }
                    : prev,
            );
            onOptimisticChange?.(willFollow);
        }

        const rollback = () => {
            if (!canPredict) return;
            setProfile((prev: any) =>
                prev
                    ? {
                          ...prev,
                          follows: setIdPresent(
                              prev.follows,
                              authorId,
                              !willFollow,
                          ),
                      }
                    : prev,
            );
            onOptimisticChange?.(!willFollow);
        };

        try {
            const result = await follow({
                method: willFollow ? 'POST' : 'DELETE',
                user_id: authorId,
            });

            if (result?.status === true) {
                await setNewData(result.data);
                showToast({
                    message: `You ${willFollow ? 'followed' : 'unfollowed'} ${result.data.followed.nick_name}!`,
                    type: 'success',
                });
            } else {
                rollback();
                showToast(
                    result?.statusCode === 401
                        ? {
                              type: 'warning',
                              message: `Log in to ${willFollow ? 'follow' : 'unfollow'}!`,
                          }
                        : {
                              type: 'error',
                              message: `Could not ${willFollow ? 'follow' : 'unfollow'}. Try again.`,
                          },
                );
            }
        } catch {
            rollback();
            showToast({
                type: 'error',
                message: `Could not ${willFollow ? 'follow' : 'unfollow'}. Try again.`,
            });
        } finally {
            pendingRef.current = false;
        }
    };

    return (
        <ActionButton
            size={size}
            onClick={toggleFollow}
            className={`follow_button app-transition ${className ?? ''} ${sameId(profile?._id, authorId) ? 'non_visible' : ''}`}
        >
            {isFollowing ? 'Unfollow' : 'Follow'}
        </ActionButton>
    );
};

export default FollowButton;
