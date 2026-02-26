import React, { createContext, useContext, useState, useEffect } from 'react';
import liff from '@line/liff';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isMonitorAllowed, setIsMonitorAllowed] = useState(false);
    const [lineUserId, setLineUserId] = useState(null);
    const [lineUserName, setLineUserName] = useState(null);
    const [postLoginRedirect, setPostLoginRedirect] = useState(null);

    useEffect(() => {
        const initLIFF = async () => {
            try {
                await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
                if (!liff.isLoggedIn()) {
                    sessionStorage.setItem('intended_path', window.location.pathname);
                    liff.login();
                    return;
                }

                const intendedPath = sessionStorage.getItem('intended_path');
                if (intendedPath) {
                    sessionStorage.removeItem('intended_path');
                    if (intendedPath !== window.location.pathname) {
                        setPostLoginRedirect(intendedPath);
                    }
                }

                const profile = await liff.getProfile();
                const userId = profile.userId;

                Cookies.set('line_user_id', userId, { expires: 7 });
                Cookies.set('line_user_name', profile.displayName, { expires: 7 });

                const response = await axios.post(`${config.API_URL}/api/admin/login`, {
                    userId: profile.userId,
                    name: profile.displayName
                });

                if (response.data.isAdmin) {
                    setIsAuthorized(true);
                    setLineUserId(userId);
                    setLineUserName(profile.displayName);
                    setIsMonitorAllowed(response.data.isMonitor === true);
                } else {
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error('LIFF 初始化失敗:', error);
                setIsAuthorized(false);
            } finally {
                setIsVerifying(false);
            }
        };
        initLIFF();
    }, []);

    return (
        <AuthContext.Provider value={{
            isVerifying,
            isAuthorized,
            lineUserId,
            lineUserName,
            isMonitorAllowed,
            postLoginRedirect,
            setPostLoginRedirect
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
