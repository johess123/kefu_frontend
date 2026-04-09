import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';

const AuthContext = createContext(null);

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
        }
        if (savedUserEmail) setUserEmail(savedUserEmail);
        if (savedUserPicture) setUserPicture(savedUserPicture);
        setIsVerifying(false);
    }, []);

    const logout = () => {
        Cookies.remove('google_user_id');
        Cookies.remove('google_user_name');
        Cookies.remove('google_user_email');
        Cookies.remove('google_user_picture');
        Cookies.remove('is_monitor');
        setIsAuthorized(false);
        setUserId(null);
        setUserName(null);
        setUserEmail(null);
        setUserPicture(null);
        setIsMonitorAllowed(false);
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
            const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
            const email = payload.email;
            const picture = payload.picture;

            const response = await axios.post(`${config.API_URL}/api/admin/login`, {
                credential: credentialResponse.credential
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

                Cookies.set('google_user_id', googleId, { expires: 7 });
                Cookies.set('google_user_name', name, { expires: 7 });
                Cookies.set('google_user_email', email, { expires: 7 });
                Cookies.set('google_user_picture', picture, { expires: 7 });
                Cookies.set('is_monitor', String(isMonitor === true), { expires: 7 });
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
