'use client';

import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { imageSrc } from '../../utils/image';

// The round picture of a user; without an uploaded avatar it falls back to the
// default one, so every place that shows a person looks the same.
const UserAvatar = ({ data, className = '' }: any) => (
    <div className={`user_badge_avatar ${className}`.trim()}>
        <img
            src={imageSrc(data?.avatar, DefaultProfileAvatar)}
            alt="user_badge_avatar"
        />
    </div>
);

export default UserAvatar;
