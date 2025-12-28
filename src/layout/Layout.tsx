import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
    permissionLevel: 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts';
    department?: string;
    designation?: string;
    isMobileOnly?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, permissionLevel, department, designation, isMobileOnly = false }) => {
    const location = useLocation();
    const isMonthlyAttendance = location.pathname === '/monthly-attendance';

    return (
        <div className="flex bg-gray-50 h-screen overflow-hidden font-sans text-gray-900">
            {/* Sticky Sidebar */}
            <div className="flex-none hidden md:block z-20">
                <Sidebar permissionLevel={permissionLevel} department={department} designation={designation} isMobileOnly={isMobileOnly} />
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full">
                <Header />

                {/* Content Area - Scrollable with fixed header/footer */}
                <main
                    className={`flex-1 w-full max-w-[1800px] mx-auto overflow-y-auto custom-scrollbar ${isMonthlyAttendance ? 'p-0' : 'p-6 md:p-8'
                        }`}
                >
                    {children}
                </main>

                <footer className="flex-none py-2 text-center text-[10px] text-gray-400 border-t border-gray-100 bg-white">
                    &copy; 2025 JM Group Inc. | HRMS Portal v4.73
                </footer>
            </div>
        </div >
    );
};
