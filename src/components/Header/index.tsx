'use client';

import { useContext } from "react";
import { Link } from "@/navigation";

import { AppContext } from "@/providers/AppProviders";

import "./Header.scss";

import SunIcon from "../../assets/svg/sun.svg";
import MoonIcon from "../../assets/svg/moon.svg";
import MainLogo from "../../assets/svg/full-logo-icon.svg";

function Header() {
	const { setIsDarkTheme, isDarkTheme } = useContext(AppContext);

	return (
		<header className="header blurred app-transition">
			<div className="header_content">
				<div className="header_side header_left_side header_mobile_logo">
					<Link href="/posts" className="header_main_logo">
						<MainLogo className="header_icon app-transition" />
					</Link>
				</div>
				<div className="header_side header_right_side">
					<button
						type="button"
						onClick={() => setIsDarkTheme(!isDarkTheme)}
						className="header_item app-transition"
						aria-label={isDarkTheme ? "Светлая тема" : "Тёмная тема"}
					>
						{isDarkTheme ? (
							<MoonIcon className="header_item_icon app-transition" />
						) : (
							<SunIcon className="header_item_icon app-transition" />
						)}
					</button>
				</div>
			</div>
		</header>
	);
}

export default Header;
