export interface Shift {
    id: string;
    name: string;
    startTime: string; // "HH:mm"
    endTime: string;   // "HH:mm"
    timeZone?: string; // "Asia/Kolkata" | "America/Toronto"
}

export interface AttendanceRecord {
    id?: string;
    employeeId: string;
    date: string; // ISO Date "YYYY-MM-DD"
    checkInTime?: string; // ISO Timestamp or "HH:mm"
    checkOutTime?: string;
    status: 'Present' | 'Late' | 'Half-Day' | 'Half Day' | 'Absent' | 'Holiday' | 'On Time' | 'Leave' | string;
    shiftId: string;
    place?: string; // Employee's place/location
    workingHours?: string;
    regularized?: string | null; // "YES" or null
    name?: string; // Mapped from Title
    email?: string;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    assignedShiftId: string;
}

export interface Employee {
    id: string;
    name: string;

    // Comprehensive Employee Information from EmployeeDB
    location?: string;                // field_1
    employeeId?: string;              // field_2
    dateOfJoining?: string;           // field_3
    dateOfBirth?: string;             // field_4
    department: string;               // field_5
    designation?: string;             // field_6
    reportingManager?: string;        // field_7
    contactNumber?: string;           // field_8 (Personal No)
    emergencyContact?: string;        // field_9
    deskNumber?: string;              // field_10
    professionalEmail?: string;       // field_11 (Official Mail ID)
    personalEmail?: string;           // field_12
    currentAddress?: string;          // field_13
    permanentAddress?: string;        // field_14

    // Legacy fields for backward compatibility
    role: string;
    email: string;
    shiftId: string;
    place?: string;
    avatarUrl?: string;
    permissionLevel?: 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts';
    accountStatus?: 'Active' | 'Disabled';
}

export interface Asset {
    id: string;
    employeeName: string;
    employeeId: string;
    assetType: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    status?: string;
    assignedDate?: string;
    processor?: string;
    ram?: string;
    hdd?: string;
}

export interface LeaveBalance {
    id: string;
    empName: string;
    cl: number;
    el: number;
    balance: number;
    lop: number;
}

export interface LeaveRequest {
    id: string;
    employeeName: string;
    submittedOn: string;
    fromDate: string;
    toDate: string;
    leaveDuration: string;
    leaveType: string;
    reason?: string;
    status: string;
    manager?: string;
    approvalComments?: string;
}

export interface EmployeeEvent {
    id: string;
    employeeName: string;
    type: 'Birthday' | 'Anniversary';
    date: Date;
    mailId?: string;
}

export interface AppNotification {
    id: string;
    title: string;
    message?: string; // Content of the notification
    recipientEmail: string;
    senderName: string;
    status: 'Read' | 'Unread';
    category: 'Wish' | 'System';
    timestamp: string;
}

export interface PermissionRequest {
    id: string;
    employeeName: string;
    permissionType: string;
    date: string;
    timeFrom?: string;
    timeTo?: string;
    hours: string;
    status: string;
    manager: string;
    reason: string;
    approvalComments?: string;
    submittedOn?: string;
    created?: string;
}

export interface Holiday {
    id: string;
    title: string;
    date: string;
    location?: string;
}

export interface UpcomingLeaveRecord {
    id: string;
    employeeName: string;
    date: string; // "field_1" - Single line of text
}

export interface AppNotification {
    id: string;
    title: string;
    message?: string;
    date: string;
    read: boolean;
    type: 'info' | 'warning' | 'success' | 'error';
}

export interface EmployeeEventRecord {
    id: string;
    name: string;
    dob: string;
    workAnniversary: string;
    email: string;
    personalId: string;
}

export interface EmployeeDBRecord {
    id: string;
    name: string;
    location: string;                // field_1
    employeeId: string;              // field_2
    dateOfJoining: string;           // field_3
    dateOfBirth: string;             // field_4
    department: string;              // field_5
    designation: string;             // field_6
    reportingManager: string;        // field_7
    contactNumber: string;           // field_8
    emergencyContact: string;        // field_9
    deskNumber: string;              // field_10
    professionalEmail: string;       // field_11
    personalEmail: string;           // field_12
    currentAddress: string;          // field_13
    permanentAddress: string;        // field_14
}
