import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, MonitorRoute } from './components/ProtectedRoute';
import AgentHome from './components/AgentHome';
import BackendDashboard from './components/BackendDashboard';
import WizardPage from './pages/WizardPage';
import MonitorApp from './components/monitor/MonitorApp';
import MonitorDashboard from './components/monitor/MonitorDashboard';
import MonitorRecords from './components/monitor/MonitorRecords';
import MonitorUsers from './components/monitor/MonitorUsers';

const App = () => {
    const { postLoginRedirect, setPostLoginRedirect } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (postLoginRedirect) {
            setPostLoginRedirect(null);
            navigate(postLoginRedirect, { replace: true });
        }
    }, [postLoginRedirect]);

    return (
        <Routes>
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<AgentHome />} />
                <Route path="/agent/:agentId/*" element={<BackendDashboard />} />
                <Route path="/wizard/new" element={<WizardPage />} />
                <Route path="/wizard/:agentId" element={<WizardPage />} />
            </Route>
            <Route element={<MonitorRoute />}>
                <Route path="/monitor" element={<MonitorApp />}>
                    <Route index element={<MonitorDashboard />} />
                    <Route path="records" element={<MonitorRecords />} />
                    <Route path="users" element={<MonitorUsers />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default App;
