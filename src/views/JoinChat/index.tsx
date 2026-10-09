'use client';

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getGroupInvite, joinGroup } from '../../api/chat.api';
import Loading from '../../components/Ui/Loading';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { imageSrc } from '../../utils/image';

import './JoinChat.scss';

const JoinChat = ({ conversationId }: { conversationId: string }) => {
    const { profile, profileLoading, showToast } = useContext(AppContext);
    const navigate = useNavigate();
    const [invite, setInvite] = useState<any>(null);
    const [missing, setMissing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (profileLoading) {
            return;
        }

        let cancelled = false;
        setLoading(true);

        getGroupInvite(conversationId).then((result: any) => {
            if (cancelled) {
                return;
            }

            if (!result?.status || !result.data) {
                setInvite(null);
                setMissing(true);
            } else {
                setMissing(false);
                setInvite(result.data);
            }

            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [conversationId, profile?._id, profileLoading]);

    const handleJoin = async () => {
        if (!profile) {
            navigate('/auth/login');
            return;
        }

        if (invite?.joined) {
            navigate(`/messages/${conversationId}`);
            return;
        }

        if (joining) return;
        setJoining(true);
        let result;
        try {
            result = await joinGroup(conversationId);
        } finally {
            setJoining(false);
        }

        if (!result?.status) {
            showToast?.({
                type: 'error',
                message: result?.message || 'Could not join the chat',
            });
            return;
        }

        navigate(`/messages/${conversationId}`);
    };

    if (loading || profileLoading) {
        return (
            <div className="join_chat">
                <Loading size={32} />
            </div>
        );
    }

    if (missing || !invite) {
        return (
            <div className="join_chat">
                <h1>Chat not found</h1>
                <p className="join_chat_muted">
                    This invite link is invalid or the group was removed.
                </p>
            </div>
        );
    }

    const count = Number(invite.member_count) || 0;
    const people = `${count} ${count === 1 ? 'person' : 'people'}`;

    return (
        <div className="join_chat">
            <img
                className="join_chat_photo"
                src={imageSrc(invite.photo, DefaultProfileAvatar)}
                alt=""
            />
            <h1>{invite.title || 'Group'}</h1>
            <p className="join_chat_muted">{people}</p>
            {invite.description ? (
                <p className="join_chat_description">{invite.description}</p>
            ) : null}
            <PrimaryButton isLoading={joining} onClick={handleJoin}>
                {!profile
                    ? 'Log in to join'
                    : invite.joined
                      ? 'Open chat'
                      : 'Join chat'}
            </PrimaryButton>
        </div>
    );
};

export default JoinChat;
