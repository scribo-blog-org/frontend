'use client';

import { useContext, useState } from 'react';
import { useNavigate } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { joinGroup } from '../../api/chat.api';
import PrimaryButton from '../Ui/PrimaryButton';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { imageSrc } from '../../utils/image';

import './GroupInviteCard.scss';

const GroupInviteCard = ({ invite, className = '' }: any) => {
    const { profile, showToast } = useContext(AppContext);
    const navigate = useNavigate();
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(Boolean(invite?.joined));

    const count = Number(invite?.member_count) || 0;
    const people = `${count} ${count === 1 ? 'person' : 'people'}`;

    const handleClick = async () => {
        if (!profile) {
            navigate('/auth/login');
            return;
        }

        if (joined) {
            navigate(`/messages/${invite._id}`);
            return;
        }

        if (joining) return;
        setJoining(true);
        let result: any;
        try {
            result = await joinGroup(invite._id);
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

        setJoined(true);
        navigate(`/messages/${invite._id}`);
    };

    return (
        <div className={`group_invite_card ${className}`.trim()}>
            <img
                className="group_invite_card_photo"
                src={imageSrc(invite?.photo, DefaultProfileAvatar)}
                alt=""
            />
            <div className="group_invite_card_info">
                <span className="group_invite_card_title">
                    {invite?.title || 'Group'}
                </span>
                <span className="group_invite_card_muted">{people}</span>
            </div>
            <PrimaryButton size="sm" isLoading={joining} onClick={handleClick}>
                {!profile ? 'Log in to join' : joined ? 'Open' : 'Join'}
            </PrimaryButton>
        </div>
    );
};

export default GroupInviteCard;
