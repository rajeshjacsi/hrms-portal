export type Role = 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts';
export type Feature =
    | 'Dashboard'
    | 'Attendance'
    | 'MonthlyAttendance'
    | 'EmployeeProfile'
    | 'Leave'
    | 'Permission'
    | 'Holiday'
    | 'MyTeam'
    | 'Reports'
    | 'Employees'
    | 'Payroll'
    | 'Settings'
    | 'Approvals';

export const PERMISSION_MATRIX: Record<Role, Feature[]> = {
    'Admin': [
        'Dashboard', 'Attendance', 'MonthlyAttendance', 'EmployeeProfile',
        'Leave', 'Permission', 'Holiday', 'MyTeam', 'Reports',
        'Employees', 'Payroll', 'Settings', 'Approvals'
    ],
    'HR': [
        'Dashboard', 'Attendance', 'MonthlyAttendance', 'EmployeeProfile',
        'Leave', 'Permission', 'Holiday', 'Reports',
        'Employees'
        // HR does NOT have Payroll or Settings or My Team
    ],
    'Accounts': [
        'Dashboard', 'Attendance', 'MonthlyAttendance', 'EmployeeProfile',
        'Leave', 'Permission', 'Holiday', 'Reports',
        'Payroll'
        // Accounts does NOT have Employees or Settings or My Team
    ],
    'Manager': [
        'Dashboard', 'Attendance', 'MonthlyAttendance', 'EmployeeProfile',
        'Leave', 'Permission', 'Holiday', 'MyTeam', 'Approvals'
        // Manager gets Reports ONLY if CEO Department (handled in logic)
    ],
    'Employee': [
        'Dashboard', 'Attendance', 'MonthlyAttendance', 'EmployeeProfile',
        'Leave', 'Permission', 'Holiday'
    ]
};

export const hasAccess = (role: Role, feature: Feature, department?: string, designation?: string): boolean => {
    if (!role) return false;

    // CEO/Specific Designations Exception for Approvals
    if (feature === 'Approvals') {
        const d = designation?.toLowerCase() || '';
        const dept = department?.toLowerCase() || '';
        if (
            d.includes('lead hr') ||
            d.includes('account manager') ||
            d.includes('operation manager') ||
            d.includes('ceo') ||
            dept === 'ceo'
        ) {
            return true;
        }
    }

    // CEO Manager Exception for Reports
    if (role === 'Manager' && department === 'CEO' && feature === 'Reports') {
        return true;
    }

    return PERMISSION_MATRIX[role]?.includes(feature) || false;
};
