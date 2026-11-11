'use client';

import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import { imageSrc } from '../../utils/image';
import FadeImage from '../Ui/FadeImage';

const UserAvatar = ({ data, className = '' }: any) => (
    <div className={`user_badge_avatar ${className}`.trim()}>
        <FadeImage
            src={imageSrc(data?.avatar, DefaultProfileAvatar)}
            alt="user_badge_avatar"
        />
    </div>
);

export default UserAvatar;
