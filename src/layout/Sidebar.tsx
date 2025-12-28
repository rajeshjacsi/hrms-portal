import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    FaHome,
    FaUserClock,
    FaUserTie,
    FaCalendarCheck,
    FaFileInvoiceDollar,
    FaUsers,
    FaUmbrellaBeach,
    FaClipboardList,
    FaCog,
    FaChartBar,
    FaUserCheck,
    FaUserFriends,
    FaCheckCircle
} from 'react-icons/fa';
import { hasAccess } from '../utils/permissions';

interface SidebarProps {
    permissionLevel: 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts';
    department?: string;
    designation?: string;
    isMobileOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ permissionLevel, department, designation, isMobileOnly }) => {
    const allMenuItems = [
        { icon: FaHome, label: 'Dashboard', path: '/dashboard' },
        { icon: FaUserClock, label: 'Attendance', path: '/attendance' },
        { icon: FaUserTie, label: 'Employee Profile', path: '/employee-profile' },
        { icon: FaCheckCircle, label: 'Approval', path: '/approvals' },
        { icon: FaCalendarCheck, label: 'Leave Management', path: '/leave' },
        { icon: FaUserCheck, label: 'Permission Management', path: '/permission' },
        { icon: FaClipboardList, label: 'Monthly Attendance', path: '/monthly-attendance' },
        { icon: FaUserFriends, label: 'My Team', path: '/my-team' },
        { icon: FaChartBar, label: 'Reports', path: '/reports' },
        { icon: FaFileInvoiceDollar, label: 'Payroll', path: '/payroll' },
        { icon: FaUmbrellaBeach, label: 'Holiday Calendar', path: '/holiday' },
        { icon: FaUsers, label: 'Employees', path: '/employees' },
        { icon: FaCog, label: 'Settings', path: '/settings', roles: ['Admin'] },
    ];

    const menuItems = allMenuItems.filter(item => {
        // Mobile Check
        if (isMobileOnly) {
            return item.label === 'Leave Management';
        }

        // Map Sidebar Labels to Permission Features
        const featureMap: Record<string, string> = {
            'Dashboard': 'Dashboard',
            'Attendance': 'Attendance',
            'Employee Profile': 'EmployeeProfile',
            'Leave Management': 'Leave',
            'Permission Management': 'Permission',
            'Approval': 'Approvals',
            'Monthly Attendance': 'MonthlyAttendance',
            'My Team': 'MyTeam',
            'Reports': 'Reports',
            'Payroll': 'Payroll',
            'Holiday Calendar': 'Holiday',
            'Employees': 'Employees',
            'Settings': 'Settings'
        };

        const featureKey = featureMap[item.label];
        // @ts-expect-error - Dynamic check against Feature type
        return hasAccess(permissionLevel, featureKey, department, designation);
    });

    return (
        <aside
            className="w-64 bg-blue-50 h-full border-r border-blue-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
        >
            {/* Brand Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-blue-100 bg-blue-50">
                <img src="/logo.png" alt="Company Logo" className="h-10 w-auto mr-3 object-contain" />
                <div>
                    <h1 className="font-bold text-gray-900 text-lg leading-tight">HRMS Portal</h1>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">JM Group Inc.</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {menuItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 group
                        ${isActive
                                ? 'bg-brand-50 text-brand-900 border-l-4 border-brand-900 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                            }`}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    className={`text-lg transition-colors 
                            ${isActive ? 'text-brand-900' : 'text-gray-400 group-hover:text-gray-600'}`}
                                />
                                {item.label}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};
