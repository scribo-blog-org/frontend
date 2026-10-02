'use client';

import { useState, useEffect, useContext } from 'react';
import { AppContext } from '@/providers/AppProviders';
import { Link } from '@/navigation';
import './LinkToProfile.scss';

const LinkToProfile = ({ children, className }: any) => {
    const [link, setLink] = useState<any>('/auth/login');

    const { profile } = useContext(AppContext);

    useEffect(() => {
        if (profile) {
            setLink(`/users/${profile.nick_name}`);
        } else {
            setLink('/auth/login');
        }
    }, [profile]);

    return (
        <Link href={link} className={`profile_link ${className ?? ''}`}>
            {children}
        </Link>
    );
};

export default LinkToProfile;
