# HRMS Portal

A comprehensive Human Resource Management System built with React, TypeScript, and SharePoint integration.

## 🚀 Features

- **Attendance Management**: Check-in/Check-out system with real-time tracking
- **Leave Management**: Request and approve leaves (Casual, Sick, Privilege)
- **Permission Requests**: Request and manage work permissions
- **Employee Directory**: Complete employee database with profiles
- **Reports & Analytics**:
  - Download Attendance Reports (Excel)
  - Monthly Attendance Reports
  - Leave History Reports
  - Permission Reports
  - Employee Leave Calendar
- **Dashboard**: Real-time attendance overview with location-based filtering
- **Holiday Management**: Track holidays by location (USA, Canada, APAC)
- **Approvals Workflow**: Manager/HR approval system for leaves and permissions
- **Regularization**: Request attendance regularization for missed check-ins/outs
- **Role-based Access Control**: Different permissions for Employee, Manager, HR, Admin, Accounts

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS
- **Authentication**: Azure AD (MSAL)
- **Backend**: SharePoint Online (REST API)
- **Hosting**: Firebase Hosting
- **Libraries**:
  - React Icons
  - xlsx-js-style (Excel generation)
  - jsPDF (PDF generation)
  - PnPjs (SharePoint integration)

## 📋 Prerequisites

- Node.js 18+ and npm
- Azure AD tenant with app registration
- SharePoint Online site with required lists
- Firebase account (for hosting)

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hrmsgit
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Azure AD**
   - Create an app registration in Azure Portal
   - Update `src/config/authConfig.ts` with your credentials:

     ```typescript
     export const msalConfig = {
       auth: {
         clientId: "YOUR_CLIENT_ID",
         authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
         redirectUri: "http://localhost:5173"
       }
     };
     ```

4. **Configure SharePoint**
   - Update `src/config/pnpConfig.ts` with your SharePoint site URL
   - Ensure required SharePoint lists are created (see SharePoint Setup below)

5. **Run development server**

   ```bash
   npm run dev
   ```

## 📦 SharePoint Lists Required

Create the following lists in your SharePoint site:

1. **Employees** - Employee directory
2. **Shifts** - Shift timings
3. **Attendance** - Daily attendance records
4. **Leave Requests** - Leave applications
5. **Permission Requests** - Permission applications
6. **Holidays** - Holiday calendar
7. **USA Holidays** - US-specific holidays
8. **Canada Holidays** - Canada-specific holidays
9. **APAC Holidays** - APAC-specific holidays
10. **Regularization Requests** - Attendance regularization
11. **Employee DOB and Work Anniversary** - Employee events
12. **Leave Balance** - Employee leave balances

## 🚀 Deployment

### Firebase Hosting

1. **Build the project**

   ```bash
   npm run build
   ```

2. **Deploy to Firebase**

   ```bash
   firebase deploy --only hosting
   ```

## 📱 Usage

### For Employees

- Check-in/Check-out daily
- View attendance history
- Request leaves and permissions
- View holiday calendar
- Download attendance reports

### For Managers

- Approve/Reject leave requests
- Approve/Reject permission requests
- View team attendance
- Access reports

### For HR/Admin

- Manage employee directory
- Update leave balances
- Generate comprehensive reports
- Manage holidays
- Override attendance records

## 🔐 Permissions

| Role | Access Level |
|------|-------------|
| **Employee** | Dashboard, Attendance, Leave, Permission, Holiday, Profile |
| **Manager** | + My Team, Approvals, Reports (if CEO dept) |
| **HR** | + Employees, All Reports |
| **Accounts** | + Payroll, Reports |
| **Admin** | Full Access + Settings |

## 📊 Configuration

### Attendance Timing

Edit `src/config/attendanceConfig.ts`:

```typescript
export const ATTENDANCE_CONFIG = {
  CHECK_IN_WINDOW_MINS: 60,      // Check-in opens 1 hour before shift
  CHECK_OUT_WINDOW_MINS: 120,    // Check-out closes 2 hours after shift
  MIN_WORK_DURATION_MINS: 240,   // Minimum 4 hours to check-out
};
```

### Status Calculation

- **Present**: 6.5+ hours worked
- **Half Day**: 4-6.5 hours worked
- **Absent**: Less than 4 hours worked

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Support

For support, email your IT administrator or create an issue in the repository.

## 🔄 Version History

- **v1.0.0** (2025-12-28)
  - Initial release
  - Core attendance management
  - Leave and permission workflows
  - Comprehensive reporting
  - Role-based access control

## 🙏 Acknowledgments

- React Team for the amazing framework
- Microsoft for Azure AD and SharePoint
- Firebase for reliable hosting
- All contributors and testers
