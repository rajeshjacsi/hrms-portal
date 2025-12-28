import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { UserProvider, useUser } from './context/UserContext';
import { Layout } from './layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Attendance } from './pages/Attendance';
import { MonthlyAttendance } from './pages/MonthlyAttendance';
import { MyTeam } from './pages/MyTeam';
import { EmployeeProfile } from './pages/EmployeeProfile';
import { Leave } from './pages/Leave';
import { LeaveRequest } from './pages/LeaveRequest';
import { Permission } from './pages/Permission';
import { PermissionRequest } from './pages/PermissionRequest';
import { Payroll } from './pages/Payroll';
import { Employees } from './pages/Employees';
import { Holiday } from './pages/Holiday';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Approvals } from './pages/Approvals';
import { ReportsTodaysAttendance } from './pages/reports/ReportsTodaysAttendance';
import { ReportsFilterByName } from './pages/reports/ReportsFilterByName';
import { ReportsUpdateLeaveBalance } from './pages/reports/ReportsUpdateLeaveBalance';
import { ReportsUpdateEmployeeLeave } from './pages/reports/ReportsUpdateEmployeeLeave';
import { ReportsEmployeeLeaveCalendar } from './pages/reports/ReportsEmployeeLeaveCalendar';
import { ReportsDownloadReport } from './pages/reports/ReportsDownloadReport';
import { ReportsLeaveReport } from './pages/reports/ReportsLeaveReport';
import { ReportsPermissionReport } from './pages/reports/ReportsPermissionReport';
import { ReportsPreviousMonth } from './pages/reports/ReportsPreviousMonth';
import { ReportsEmployeeEvents } from './pages/reports/ReportsEmployeeEvents';
import { ReportsEmployeeDB } from './pages/reports/ReportsEmployeeDB';
import { ReportsUpcomingLeaves } from './pages/reports/ReportsUpcomingLeaves';
import { LoginPage } from './pages/LoginPage';

import { hasAccess } from './utils/permissions';

const AppContent = () => {
  const { permissionLevel, employee, loading, isAccessDenied } = useUser();
  const { instance } = useMsal();

  // Robust Mobile Detection (Catches phones even in "Desktop Mode")
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  if (isAccessDenied) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6 max-w-md">
          Your account is not registered in the HRMS Employee database.
          Please contact the HR department to verify your profile settings.
        </p>
        <button
          onClick={() => instance.logoutPopup()}
          className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Layout
      permissionLevel={permissionLevel || 'Employee'}
      department={employee?.department}
      designation={employee?.designation}
      isMobileOnly={isMobile}
    >
      <Routes>
        <Route path="/" element={<Navigate to={isMobile ? "/leave" : "/dashboard"} replace />} />

        {/* On mobile, only allow Leave routes. Redirect others to /leave */}
        {isMobile ? (
          <>
            <Route path="/leave" element={<Leave />} />
            <Route path="/leave/new" element={<LeaveRequest />} />
            <Route path="*" element={<Navigate to="/leave" replace />} />
          </>
        ) : (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            {hasAccess(permissionLevel || 'Employee', 'Approvals', employee?.department, employee?.designation) && (
              <Route path="/approvals" element={<Approvals />} />
            )}
            <Route path="/monthly-attendance" element={<MonthlyAttendance />} />
            <Route path="/my-team" element={<MyTeam />} />
            <Route path="/employee-profile" element={<EmployeeProfile />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/leave/new" element={<LeaveRequest />} />
            <Route path="/permission" element={<Permission />} />
            <Route path="/permission/new" element={<PermissionRequest />} />
            <Route path="/holiday" element={<Holiday />} />

            {hasAccess(permissionLevel || 'Employee', 'Reports', employee?.department, employee?.designation) && (
              <>
                {/* Reports & Protected Pages */}
                {hasAccess(permissionLevel || 'Employee', 'Payroll') && <Route path="/payroll" element={<Payroll />} />}
                {hasAccess(permissionLevel || 'Employee', 'Employees') && <Route path="/employees" element={<Employees />} />}

                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/todays-attendance" element={<ReportsTodaysAttendance />} />
                <Route path="/reports/filter-by-name" element={<ReportsFilterByName />} />
                <Route path="/reports/update-leave-balance" element={<ReportsUpdateLeaveBalance />} />
                <Route path="/reports/update-employee-leave" element={<ReportsUpdateEmployeeLeave />} />
                <Route path="/reports/employee-leave-calendar" element={<ReportsEmployeeLeaveCalendar />} />
                <Route path="/reports/download-report" element={<ReportsDownloadReport />} />
                <Route path="/reports/leave-report" element={<ReportsLeaveReport />} />
                <Route path="/reports/permission-report" element={<ReportsPermissionReport />} />
                <Route path="/reports/previous-month" element={<ReportsPreviousMonth />} />
                <Route path="/reports/employee-events" element={<ReportsEmployeeEvents />} />
                <Route path="/reports/employee-db" element={<ReportsEmployeeDB />} />
                <Route path="/reports/upcoming-leaves" element={<ReportsUpcomingLeaves />} />
              </>
            )}

            {hasAccess(permissionLevel || 'Employee', 'Settings') && (
              <Route path="/settings" element={<Settings />} />
            )}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

function App() {
  const { instance } = useMsal();

  return (
    <BrowserRouter>
      <AuthenticatedTemplate>
        <UserProvider>
          <Toaster position="top-right" />
          <AppContent />
        </UserProvider>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <LoginPage onSignIn={() => instance.loginPopup({ scopes: ["Sites.ReadWrite.All"] })} />
      </UnauthenticatedTemplate>
    </BrowserRouter>
  );
}

export default App;
