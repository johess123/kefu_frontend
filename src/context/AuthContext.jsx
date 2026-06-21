import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';
import { fetchPricing } from '../utils/pricing';

const AuthContext = createContext(null);

const decodeGoogleCredentialPayload = (credential) => {
    try {
        if (typeof credential !== 'string') return {};

        const [, payloadSegment] = credential.split('.');
        if (!payloadSegment) return {};

        const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(
            normalized.length + ((4 - (normalized.length % 4)) % 4),
            '='
        );
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

        return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
        console.warn('Failed to decode Google credential payload:', error);
        return {};
    }
};

export const AuthProvider = ({ children }) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isMonitorAllowed, setIsMonitorAllowed] = useState(false);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [userPicture, setUserPicture] = useState(null);
    const [userBalance, setUserBalance] = useState(0);
    const [postLoginRedirect, setPostLoginRedirect] = useState(null);

    useEffect(() => {
        const savedUserId = Cookies.get('google_user_id');
        const savedUserName = Cookies.get('google_user_name');
        const savedUserEmail = Cookies.get('google_user_email');
        const savedUserPicture = Cookies.get('google_user_picture');
        if (savedUserId) {
            setUserId(savedUserId);
            setUserName(savedUserName || '');
            setIsAuthorized(true);
            setIsMonitorAllowed(Cookies.get('is_monitor') === 'true');
            // 由 cookie 還原登入時，餘額不在 cookie 內，需主動向後端取得一次
            refreshUserBalance(savedUserId);
        }
        if (savedUserEmail) setUserEmail(savedUserEmail);
        if (savedUserPicture) setUserPicture(savedUserPicture);
        setIsVerifying(false);
        // 預先載入定價（套餐 + 各功能 coins），供 BillingView 與確認扣費 modal 使用
        fetchPricing();
    }, []);

    const logout = () => {
        Cookies.remove('google_user_id');
        Cookies.remove('google_user_name');
        Cookies.remove('google_user_email');
        Cookies.remove('google_user_picture');
        Cookies.remove('is_monitor');
        window.location.replace('/');
    };

    const refreshUserBalance = async (id = userId) => {
        if (!id) return;
        try {
            const response = await axios.get(`${config.API_URL}/api/admin/balance`, {
                params: { userId: id }
            });
            setUserBalance(response.data.balance || 0);
            return response.data.balance || 0;
        } catch (error) {
            console.error('Failed to refresh balance:', error);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const credential = credentialResponse?.credential;
            if (!credential) {
                throw new Error('Missing Google credential');
            }

            const payload = decodeGoogleCredentialPayload(credential);
            const email = payload.email || '';
            const picture = payload.picture || '';

            const response = await axios.post(`${config.API_URL}/api/admin/login`, {
                credential
            });

            const { isAdmin, isMonitor, googleId, name, balance } = response.data;

            if (isAdmin) {
                setIsAuthorized(true);
                setUserId(googleId);
                setUserName(name);
                setUserEmail(email);
                setUserPicture(picture);
                setUserBalance(balance || 0);
                setIsMonitorAllowed(isMonitor === true);

                const cookieOpts = { expires: 7, secure: true, sameSite: 'Strict' };
                Cookies.set('google_user_id', googleId, cookieOpts);
                Cookies.set('google_user_name', name, cookieOpts);
                Cookies.set('google_user_email', email, cookieOpts);
                Cookies.set('google_user_picture', picture, cookieOpts);
                Cookies.set('is_monitor', String(isMonitor === true), cookieOpts);
            }
        } catch (error) {
            console.error('Google login failed:', error);
        }
    };

    return (
        <AuthContext.Provider value={{
            isVerifying,
            isAuthorized,
            userId,
            userName,
            userEmail,
            userPicture,
            userBalance,
            setUserBalance,
            refreshUserBalance,
            isMonitorAllowed,
            postLoginRedirect,
            setPostLoginRedirect,
            handleGoogleSuccess,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
