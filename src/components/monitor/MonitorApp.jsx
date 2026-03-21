import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './monitor.css';

const MonitorApp = () => {
    const navigate = useNavigate();
    const { isAuthorized } = useAuth();

    return (
        <div className="monitor-root">
            <div className="sidebar">
                <div className="logo">Kefu ADK</div>
                <nav>
                    {isAuthorized && (
                        <button className="nav-item" onClick={() => navigate('/')} style={{ marginBottom: '1.5rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                            <span>返回主頁</span>
                        </button>
                    )}
                    <NavLink
                        to="/monitor"
                        end
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink
                        to="/monitor/records"
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path>
                            <line x1="16" y1="5" x2="16" y2="19"></line>
                            <line x1="2" y1="10" x2="22" y2="10"></line>
                        </svg>
                        <span>生成紀錄</span>
                    </NavLink>
                    <NavLink
                        to="/monitor/users"
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>使用者管理</span>
                    </NavLink>
                    <NavLink
                        to="/monitor/prompts"
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <span>Prompt 檢視</span>
                    </NavLink>
                </nav>
            </div>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default MonitorApp;
