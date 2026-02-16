import React from 'react';
import Sidebar, { getMenuForRole } from './Sidebar';
import { useLocation } from 'react-router-dom';

const DashboardLayout = ({ children, user }) => {
    const location = useLocation();
    const role = user?.role || 'upps';
    const menuItems = getMenuForRole(role);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar user={user} menuItems={menuItems} activePath={location.pathname} />
            <div className="flex-1 flex flex-col overflow-hidden w-full ml-64">
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
