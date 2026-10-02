'use client';

import { Link } from '@/navigation';

import GhIcon from '../../assets/svg/github-icon.svg';
import ProfileIcon from '../../assets/svg/profile-icon.svg';
import ChevronRightIcon from '../../assets/svg/chevron-right.svg';

import './Banner.scss';

const Banner = () => (
    <aside className="banner">
        <p className="banner_kicker">Personal project</p>
        <p className="banner_lead">
            I write when I have something to say, without an editor.
        </p>
        <div className="banner_links">
            <a
                className="banner_link"
                href="https://github.com/MaksimKosyanchuk"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub MaksimKosyanchuk"
            >
                <GhIcon
                    className="banner_link_icon app-transition-color"
                    aria-hidden="true"
                />
                <span className="banner_link_copy">
                    <span className="banner_link_label">GitHub</span>
                    <span className="banner_link_hint">MaksimKosyanchuk</span>
                </span>
                <ChevronRightIcon
                    className="banner_link_chevron"
                    aria-hidden="true"
                />
            </a>
            <Link
                className="banner_link"
                href="/users/Maks"
                aria-label="Profile on this site"
            >
                <ProfileIcon
                    className="banner_link_icon app-transition-color"
                    aria-hidden="true"
                />
                <span className="banner_link_copy">
                    <span className="banner_link_label">My profile</span>
                    <span className="banner_link_hint">on Scribo</span>
                </span>
                <ChevronRightIcon
                    className="banner_link_chevron"
                    aria-hidden="true"
                />
            </Link>
        </div>
    </aside>
);

export default Banner;
