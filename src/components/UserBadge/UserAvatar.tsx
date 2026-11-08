'use client';

import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { imageSrc } from '../../utils/image';

const UserAvatar = ({ data, className = '' }: any) => (
    <div className={`user_badge_avatar ${className}`.trim()}>
        <img
            src={imageSrc(data?.avatar, DefaultProfileAvatar)}
            alt="user_badge_avatar"
        />
    </div>
);

export default UserAvatar;
