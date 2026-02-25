import React, { useState } from 'react';
import './monitor.css';
import MonitorDashboard from './MonitorDashboard';
import MonitorRecords from './MonitorRecords';
import MonitorUsers from './MonitorUsers';

const MonitorApp = ({ lineUserId, lineUserName, onBack }) => {
    const [page, setPage] = useState('dashboard');

    return (
        <div className="monitor-root">
            <div className="sidebar">
                <div className="logo">Kefu ADK</div>
                <nav>
                    {onBack && (
                        <button className="nav-item" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                            <span>返回主頁</span>
                        </button>
                    )}
                    <button
                        className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setPage('dashboard')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span>Dashboard</span>
                    </button>
                    <button
                        className={`nav-item ${page === 'records' ? 'active' : ''}`}
                        onClick={() => setPage('records')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path>
                            <line x1="16" y1="5" x2="16" y2="19"></line>
                            <line x1="2" y1="10" x2="22" y2="10"></line>
                        </svg>
                        <span>生成紀錄</span>
                    </button>
                    <button
                        className={`nav-item ${page === 'users' ? 'active' : ''}`}
                        onClick={() => setPage('users')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>使用者管理</span>
                    </button>
                </nav>
            </div>

            <main className="main-content">
                {page === 'dashboard' && <MonitorDashboard />}
                {page === 'records' && <MonitorRecords />}
                {page === 'users' && <MonitorUsers />}
            </main>
        </div>
    );
};

export default MonitorApp;
