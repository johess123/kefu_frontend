import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FoundingPartnerLanding from './FoundingPartnerLanding';

export const ProtectedRoute = () => {
    const { isVerifying, isAuthorized, handleGoogleSuccess } = useAuth();

    if (!isAuthorized) {
        return (
            <FoundingPartnerLanding
                isVerifying={isVerifying}
                onGoogleSuccess={handleGoogleSuccess}
            />
        );
    }

    return <Outlet />;
};

export const MonitorRoute = () => {
    const { isVerifying, isMonitorAllowed } = useAuth();

    if (isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            </div>
        );
    }

    if (!isMonitorAllowed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layout size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">權限不足</h2>
                    <p className="text-slate-600">您沒有權限訪問監控系統。</p>
                    <p className="text-slate-400 text-sm mt-4">請聯繫管理員協助。</p>
                </div>
            </div>
        );
    }

    return <Outlet />;
};
