'use client';

import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

import GoogleIcon from "../../assets/svg/google-icon.svg"

import "./GoogleAuthButton.scss";

import ActionButton from '../Ui/ActionButton/index';
import { publicEnv } from "../../config/publicEnv";

const GoogleAuthButton = (props) => {
    if (!publicEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")) {
        return (
            <ActionButton disabled className="google_auth_button">
                <GoogleIcon />
                {props.children || "Продолжить с Google"}
            </ActionButton>
        );
    }

    return <GoogleAuthButtonReady {...props} />;
};

const GoogleAuthButtonReady = ({
    setGoogleToken,
    isLoading = false,
    disabled = false,
    onClickStart,
    onAuthEnd,
    children = "Продолжить с Google",
}: any) => {
  const [popupLoading, setPopupLoading] = useState<any>(false);
  const loading = isLoading || popupLoading;

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse: any) => {
      setPopupLoading(false);
      setGoogleToken(tokenResponse.access_token)
    },
    onError: () => {
      setPopupLoading(false);
      onAuthEnd?.();
    },
    onNonOAuthError: () => {
      setPopupLoading(false);
      onAuthEnd?.();
    }
  });

  const login = () => {
    setPopupLoading(true);
    onClickStart?.();
    googleLogin();
  }

  return (
    <ActionButton isLoading={loading} disabled={disabled || loading} onClick={login} className="google_auth_button">
      <GoogleIcon/>
        {children}
    </ActionButton>
  );
};

export default GoogleAuthButton;
