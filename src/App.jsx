import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, MonitorRoute } from './components/ProtectedRoute';
import AgentHome from './components/AgentHome';
import BackendDashboard from './components/BackendDashboard';
import WizardPage from './pages/WizardPage';
import MonitorApp from './components/monitor/MonitorApp';
import MonitorDashboard from './components/monitor/MonitorDashboard';
import MonitorRecords from './components/monitor/MonitorRecords';
import MonitorUsers from './components/monitor/MonitorUsers';
import CatalogPage from './components/CatalogPage';

const App = () => {
    return (
        <Routes>
            <Route path="/catalog/:agentId" element={<CatalogPage />} />
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
