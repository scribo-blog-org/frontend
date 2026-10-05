'use client';

import { useContext } from 'react';
import { Link } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import LinkToProfile from '../LinkToProfile';

import '../../layouts/DefaultContainer/DefaultContainer.scss';
import './Footer.scss';

import GhIcon from '../../assets/svg/github-icon.svg';
import InstagramIcon from '../../assets/svg/instagram-icon.svg';
import TelegramIcon from '../../assets/svg/telegram-icon.svg';
import TWitterIcon from '../../assets/svg/twitter-icon.svg';
import MainLogo from '../../assets/svg/full-logo-icon.svg';

function Footer() {
    const { profile } = useContext(AppContext);

    return (
        <footer className="blurred app-transition">
            <div className="default-container">
                <div className="footer_top_content">
                    <div className="footer_links">
                        <Link href={'/'}>
                            <p>Home</p>
                        </Link>
                    </div>
                    <div className="footer_links">
                        <LinkToProfile href={'/profile'}>
                            <p>Profile</p>
                        </LinkToProfile>
                    </div>
                    <div className="footer_links">
                        <Link href={'/users/Dev'}>
                            <p>Dev blog</p>
                        </Link>
                    </div>
                    <div className="footer_links">
                        <Link href={'/api'}>
                            <p>Api</p>
                        </Link>
                    </div>
                    <div className="footer_links">
                        {profile ? (
                            <Link href={'/support/mine'}>
                                <p>Support</p>
                            </Link>
                        ) : (
                            <Link href={'/support'}>
                                <p>Support</p>
                            </Link>
                        )}
                    </div>
                </div>
                <div className="footer_bottom_content app-transition">
                    <div className="footer_column footer_socials">
                        <a
                            className="footer_socials_item"
                            href="https://github.com/scribo-blog-org"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <GhIcon className="app-transition" />
                        </a>
                        <a
                            className="footer_socials_item"
                            href="https://www.instagram.com/maks_kos/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <InstagramIcon className="app-transition" />
                        </a>
                        <a
                            className="footer_socials_item"
                            href="https://t.me/maks_k0s"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <TelegramIcon className="app-transition" />
                        </a>
                        <a
                            className="footer_socials_item"
                            href="https://twitter.com/maks_k0s"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <TWitterIcon className="app-transition" />
                        </a>
                    </div>
                    <div className="footer_column footer_main_logo">
                        <MainLogo className="app-transition" />
                    </div>
                    <div className="footer_column footer_copyright">
                        <p>© All rights reserved</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
