import { getAccessToken, getSP } from "../config/pnpConfig";
import type { Employee, Shift, AttendanceRecord, Asset, LeaveBalance, LeaveRequest, EmployeeEvent, AppNotification, PermissionRequest, Holiday, EmployeeEventRecord, EmployeeDBRecord, UpcomingLeaveRecord } from "../types/attendance";
import type { RawEmployeeDBItem, EmployeeDBPayload, RawUpcomingLeaveItem, UpcomingLeavePayload, EmployeeEventPayload } from '../types/sharepoint';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/fields";

interface SPResult<T> {
    d: {
        results: T[];
        __next?: string;
    }
}

interface SPEmployeeItem {
    Id: number;
    Title: string;
    Role?: string;
    Department?: string;
    Email?: string;
    ShiftId?: string;
    Place?: string;
    AvatarUrl?: string;
    PermissionLevel?: string;
    field_1?: string; field_2?: string; field_3?: string; field_4?: string;
    field_5?: string; field_6?: string; field_7?: string; field_8?: string;
    field_9?: string; field_10?: string; field_11?: string; field_12?: string;
    field_13?: string; field_14?: string;
    AccountStatus?: string;
}

interface SPShiftItem {
    Id: number;
    Title: string;
    StartTime: string;
    EndTime: string;
    TimeZone?: string;
}

interface SPAttendanceItem {
    Id: number;
    EmployeeId: string;
    Title: string;
    Date: string;
    CheckInTime?: string;
    CheckOutTime?: string;
    Status?: string;
    ShiftId?: string;
    WorkingHours?: string;
    Place?: string;
    Regularized?: string | null;
    StaffMail?: string;
    FieldValuesAsText?: Record<string, string>;
    Author?: { Title: string };
    AuthorId?: number;
}

interface SPAssetItem {
    Id: number;
    Title: string;
    EmployeeName?: string;
    Employee_x0020_Name?: string;
    EmployeeId?: string;
    EmployeeID?: string;
    Employee_x0020_ID?: string;
    EmpId?: string;
    AssetType?: string;
    Type?: string;
    Asset_x0020_Type?: string;
    Category?: string;
    Manufacturer?: string;
    Brand?: string;
    Make?: string;
    Model?: string;
    ModelNumber?: string;
    SerialNumber?: string;
    Serial?: string;
    SerialNo?: string;
    SN?: string;
    PurchaseDate?: string;
    DatePurchased?: string;
    Purchase_x0020_Date?: string;
    Status?: string;
    AssetStatus?: string;
    AssignedDate?: string;
    DateAssigned?: string;
    Assigned_x0020_Date?: string;
    Processor?: string;
    CPU?: string;
    Processer?: string;
    RAM?: string;
    Memory?: string;
    Ram?: string;
    HDD?: string;
    Storage?: string;
    Hard_x0020_Disk?: string;
    Hdd?: string;
    StaffMail?: string;
    Staff_x0020_Mail?: string;
    EmployeeEmail?: string;
    Employee_x0020_Email?: string;
    Email?: string;
    MailID?: string;
    Mail_x0020_ID?: string;
    OfficialEmail?: string;
    Official_x0020_Email?: string;
}

interface SPLeaveBalanceItem {
    Id: number;
    EmpName?: string;
    Title?: string;
    CL?: number;
    EL?: number;
    Balance?: number;
    LOP?: number;
    [key: string]: string | number | undefined;
}

interface SPLeaveRequestItem {
    Id: number;
    ID?: number;
    Title: string;
    From?: string;
    To?: string;
    StartDate?: string;
    EndDate?: string;
    EventDate?: string;
    Start?: string;
    End?: string;
    LeaveType?: string;
    Leave_x0020_Type?: string;
    Type?: string;
    Category?: string;
    Leave?: string;
    LeaveDuration?: string;
    Duration?: string;
    Days?: string;
    Detail?: string;
    Reason?: string;
    Description?: string;
    Status?: string;
    status?: string;
    State?: string;
    ApprovalStatus?: string;
    Manager?: { Title: string; EMail?: string };
    manager?: { Title: string; EMail?: string };
    Author?: { Title: string; EMail: string };
    AuthorId?: number;
    Created: string;
    FieldValuesAsText?: Record<string, string>;
    ApprovalComments?: string;
    ApproverComments?: string;
    AdminComments?: string;
    Details?: string;
    Comments?: string;
}

interface SPNotificationItem {
    Id: number;
    Title: string;
    RecipientEmail: string;
    SenderName: string;
    Status: string;
    Notifications: string; // The message body
    Created: string;
}

// interface SPHolidayItem {
//     Id: number;
//     ID?: number;
//     Title: string;
//     EventDate?: string;
//     StartDate?: string; // Added for flexibility
//     Date?: string;
//     HolidayDate?: string;
//     Location?: string;
//     Place?: string;
//     Name?: string;
//     EmployeeName?: string;
// }

interface SPPermissionItem {
    Id: number;
    ID?: number;
    Title: string;
    Date: string;
    Hours: string;
    Detail: string;
    Status: string;
    Manager?: { Title: string; EMail?: string };
    Author?: { Title: string; EMail?: string };
    ApproverComments?: string;
    Created: string;
    Reason?: string;
}

export interface SPRegularizationItem {
    Id: number;
    Title: string;
    EmployeeName?: string;
    MailID: string;
    Date: string;
    Manager: string;
    Reason: string;
    Status?: string;
    ApproverComments?: string;
    Created: string;
}

export class SharePointService {

    // List Names - configurable
    private static EMPLOYEES_LIST = "Employees";
    private static SHIFTS_LIST = "Shifts";
    private static ATTENDANCE_LIST = "Attendance";
    private static DOB_ANNIVERSARY_LIST = "Employee DOB and Work Anniversary";
    private static NOTIFICATIONS_LIST = "Notifications";

    // Expose for diagnostics
    static getSP() {
        return getSP();
    }

    private static getAttendanceListName(year: number): string {
        return `${this.ATTENDANCE_LIST} ${year}`;
    }

    static async getAllEmployees(): Promise<Employee[]> {
        console.log("SP Service: Fetching Employees (Comprehensive)...");
        const token = await getAccessToken();
        const baseSelect = "Id,Title,Role,Department,Email,ShiftId,Place,PermissionLevel";
        const extendedSelect = `${baseSelect},AccountStatus`;

        const fetchEmployees = async (selectClause: string) => {
            const response = await fetch(`${this.getEmployeesDOBBaseUrl()}/_api/web/lists/getByTitle('${this.EMPLOYEES_LIST}')/items?$select=${selectClause}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`SharePoint Error: ${response.status} - ${text}`);
            }
            return response.json();
        };

        try {
            try {
                // Try with AccountStatus first
                const data = await fetchEmployees(extendedSelect);
                const items = data.d.results;
                return items.map((item: SPEmployeeItem) => ({
                    id: item.Id.toString(),
                    name: item.Title,
                    role: item.Role || item.field_6 || 'Staff',
                    department: item.Department || item.field_5 || 'General',
                    email: item.Email || item.field_11 || '',
                    shiftId: item.ShiftId || '',
                    place: item.Place || item.field_1 || '',
                    avatarUrl: item.AvatarUrl,
                    permissionLevel: (item.PermissionLevel === 'User' ? 'Employee' : item.PermissionLevel) || 'Employee',
                    accountStatus: (item.AccountStatus as 'Active' | 'Disabled') || 'Active',
                    location: item.field_1 || '',
                    employeeId: item.field_2 || '',
                    dateOfJoining: item.field_3 || '',
                    dateOfBirth: item.field_4 || '',
                    designation: item.field_6 || '',
                    reportingManager: item.field_7 || '',
                    contactNumber: item.field_8 || '',
                    emergencyContact: item.field_9 || '',
                    professionalEmail: item.field_11 || '',
                    personalEmail: item.field_12 || ''
                })) as Employee[];

            } catch (err) {
                console.warn("SP Service: Failed to fetch with AccountStatus, retrying without...", err);
                // Fallback: Fetch without AccountStatus
                const data = await fetchEmployees(baseSelect);
                const items = data.d.results;
                return items.map((item: SPEmployeeItem) => ({
                    id: item.Id.toString(),
                    name: item.Title,
                    role: item.Role || item.field_6 || 'Staff',
                    department: item.Department || item.field_5 || 'General',
                    email: item.Email || item.field_11 || '',
                    shiftId: item.ShiftId || '',
                    place: item.Place || item.field_1 || '',
                    avatarUrl: item.AvatarUrl,
                    permissionLevel: (item.PermissionLevel === 'User' ? 'Employee' : item.PermissionLevel) || 'Employee',
                    accountStatus: 'Active', // Default to Active on fallback
                    location: item.field_1 || '',
                    employeeId: item.field_2 || '',
                    dateOfJoining: item.field_3 || '',
                    dateOfBirth: item.field_4 || '',
                    designation: item.field_6 || '',
                    reportingManager: item.field_7 || '',
                    contactNumber: item.field_8 || '',
                    emergencyContact: item.field_9 || '',
                    professionalEmail: item.field_11 || '',
                    personalEmail: item.field_12 || ''
                })) as Employee[];
            }
        } catch (e) {
            console.error("SP Service: Failed to fetch employees (Fallback failed)", e);
            throw e;
        }
    }

    static async getEmployeeByEmail(email: string): Promise<Employee | null> {
        try {
            const token = await getAccessToken();

            // 1. Fetch Basic Identity (Survival Fields) - Guaranteed to exist
            // We use a robust select that avoids potentially problematic fields initially
            const identitySelect = "Id,Title,Role,Department,Email,ShiftId,PermissionLevel,Place";

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.EMPLOYEES_LIST}')/items?$select=${identitySelect}&$filter=Email eq '${encodeURIComponent(email)}'`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                console.warn("SP Service: Identity fetch failed", response.status);
                return null;
            }

            const data = await response.json();
            const items = data.d.results;
            if (!items || items.length === 0) return null;
            const item = items[0];

            // 2. Fetch Additional Details (Best Effort)
            // We do this separately so it doesn't block login if it fails
            let place = item.Place || '';
            let avatarUrl = '';

            // REVERT: Default to 'Active' to restore prior behavior.
            let accountStatus: 'Active' | 'Disabled' = 'Active';

            try {
                // First try fetching Place from Employees list
                const detailResponse = await fetch(`${this.getEmployeesDOBBaseUrl()}/_api/web/lists/getByTitle('${this.EMPLOYEES_LIST}')/items(${item.Id})?$select=Place,AvatarUrl,AccountStatus`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                });

                if (detailResponse.ok) {
                    const detailData = await detailResponse.json();
                    const d = detailData.d;
                    place = d.Place || '';
                    avatarUrl = d.AvatarUrl || '';
                    if (d.AccountStatus) {
                        accountStatus = d.AccountStatus;
                    }
                }

                // If Place is still empty, try fetching from EmployeeDB (Source of Truth) using fetchEmployeeProfile logic
                if (!place) {
                    try {
                        // We use the same email to find them in EmployeeDB
                        const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
                        const empDBList = "EmployeeDB";
                        const profileResponse = await fetch(
                            `${siteUrl}/_api/web/lists/getByTitle('${empDBList}')/items?$select=field_1&$filter=field_11 eq '${encodeURIComponent(email)}'`,
                            {
                                headers: {
                                    "Authorization": `Bearer ${token}`,
                                    "Accept": "application/json;odata=verbose"
                                }
                            }
                        );

                        if (profileResponse.ok) {
                            const pData = await profileResponse.json();
                            if (pData.d.results && pData.d.results.length > 0) {
                                // field_1 is Location in EmployeeDB
                                place = pData.d.results[0].field_1 || '';
                                console.log("SP Service: Found location in EmployeeDB:", place);
                            }
                        }
                    } catch (dbErr) {
                        console.warn("SP Service: Failed to fallback fetch from EmployeeDB", dbErr);
                    }
                }

            } catch (e) {
                console.warn("SP Service: Detail fetch failed", e);
            }

            let perm = item.PermissionLevel || 'User';
            if (typeof perm === 'string') {
                perm = perm.split('-')[0].trim();
            }

            return {
                id: item.Id.toString(),
                name: item.Title,
                role: item.Role || 'Staff',
                department: item.Department || 'General',
                email: item.Email || '',
                shiftId: item.ShiftId || '',
                place: place,
                avatarUrl: avatarUrl,
                permissionLevel: (perm === 'User' ? 'Employee' : perm) as 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts',
                accountStatus: accountStatus
            };

        } catch (e) {
            console.error("SP Service: getEmployeeByEmail critical failure", e);
            return null;
        }
    }

    // Fetch complete employee profile from EmployeeDB list in JMGroupINC-All site
    static async getEmployeeProfileByEmail(email: string): Promise<Employee | null> {
        console.log("SP Service: Fetching complete employee profile for", email);
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmployeeDB";

            // Select all required fields using internal names identified from SharePoint
            const select = "Id,Title,field_1,field_2,field_3,field_4,field_5,field_6,field_7,field_8,field_9,field_10,field_11,field_12,field_13,field_14";

            // Filter by professional email (field_11)
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items?$select=${select}&$filter=field_11 eq '${encodeURIComponent(email)}'`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                console.warn("SP Service: Failed to fetch employee profile from EmployeeDB", response.status);
                return null;
            }

            const data = await response.json();
            const items = data.d.results;

            if (!items || items.length === 0) {
                console.warn("SP Service: No employee found in EmployeeDB with email", email);
                return null;
            }

            const item = items[0];

            return {
                id: item.Id.toString(),
                name: item.Title || '',
                location: item.field_1 || '',
                employeeId: item.field_2 || '',
                dateOfJoining: item.field_3 || '',
                dateOfBirth: item.field_4 || '',
                department: item.field_5 || '',
                designation: item.field_6 || '',
                reportingManager: item.field_7 || '',
                contactNumber: item.field_8 || '',
                emergencyContact: item.field_9 || '',
                deskNumber: item.field_10 || '',
                professionalEmail: item.field_11 || '',
                personalEmail: item.field_12 || '',
                currentAddress: item.field_13 || '',
                permanentAddress: item.field_14 || '',
                // Compatibility fields
                email: item.field_11 || '',
                role: item.field_6 || 'Staff',
                shiftId: '',
                permissionLevel: 'Employee'
            };
        } catch (e) {
            console.error("SP Service: Failed to fetch employee profile from EmployeeDB", e);
            return null;
        }
    }

    // Fetch all records from EmployeeDB for the report
    static async getAllEmployeesDB(): Promise<EmployeeDBRecord[]> {
        console.log("SP Service: Fetching all employees from EmployeeDB...");
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmployeeDB";
            const select = "Id,Title,field_1,field_2,field_3,field_4,field_5,field_6,field_7,field_8,field_9,field_10,field_11,field_12,field_13,field_14";

            // Fetch in batches if needed, but for now fetch top 5000
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items?$select=${select}&$top=5000`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to fetch EmployeeDB list: ${response.status} - ${err}`);
            }

            const data = await response.json();
            const results = data.d.results || [];

            return results.map((item: RawEmployeeDBItem) => ({
                id: item.Id.toString(),
                name: item.Title || '',
                location: item.field_1 || '',
                employeeId: item.field_2 || '',
                dateOfJoining: item.field_3 ? item.field_3 : '',
                dateOfBirth: item.field_4 ? item.field_4 : '',
                department: item.field_5 || '',
                designation: item.field_6 || '',
                reportingManager: item.field_7 || '',
                contactNumber: item.field_8 || '',
                emergencyContact: item.field_9 || '',
                deskNumber: item.field_10 || '',
                professionalEmail: item.field_11 || '',
                personalEmail: item.field_12 || '',
                currentAddress: item.field_13 || '',
                permanentAddress: item.field_14 || ''
            }));

        } catch (e) {
            console.error("SP Service: Failed to fetch all employees from EmployeeDB", e);
            throw e;
        }
    }

    static async addEmployeeDBRecord(record: Omit<EmployeeDBRecord, 'id'>): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmployeeDB";

            const payload = {
                __metadata: { type: "SP.Data.EmployeeDBListItem" },
                Title: record.name,
                field_1: record.location,
                field_2: record.employeeId,
                field_3: record.dateOfJoining,
                field_4: record.dateOfBirth,
                field_5: record.department,
                field_6: record.designation,
                field_7: record.reportingManager,
                field_8: record.contactNumber,
                field_9: record.emergencyContact,
                field_10: record.deskNumber,
                field_11: record.professionalEmail,
                field_12: record.personalEmail,
                field_13: record.currentAddress,
                field_14: record.permanentAddress
            };

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to add employee record: ${response.status} - ${err}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to add employee DB record", e);
            throw e;
        }
    }

    static async updateEmployeeDBRecord(id: string, record: Partial<EmployeeDBRecord>): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmployeeDB";

            const payload: EmployeeDBPayload = {
                __metadata: { type: "SP.Data.EmployeeDBListItem" }
            };

            if (record.name !== undefined) payload.Title = record.name;
            if (record.location !== undefined) payload.field_1 = record.location;
            if (record.employeeId !== undefined) payload.field_2 = record.employeeId;
            if (record.dateOfJoining !== undefined) payload.field_3 = record.dateOfJoining;
            if (record.dateOfBirth !== undefined) payload.field_4 = record.dateOfBirth;
            if (record.department !== undefined) payload.field_5 = record.department;
            if (record.designation !== undefined) payload.field_6 = record.designation;
            if (record.reportingManager !== undefined) payload.field_7 = record.reportingManager;
            if (record.contactNumber !== undefined) payload.field_8 = record.contactNumber;
            if (record.emergencyContact !== undefined) payload.field_9 = record.emergencyContact;
            if (record.deskNumber !== undefined) payload.field_10 = record.deskNumber;
            if (record.professionalEmail !== undefined) payload.field_11 = record.professionalEmail;
            if (record.personalEmail !== undefined) payload.field_12 = record.personalEmail;
            if (record.currentAddress !== undefined) payload.field_13 = record.currentAddress;
            if (record.permanentAddress !== undefined) payload.field_14 = record.permanentAddress;

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to update employee record: ${response.status} - ${err}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to update employee DB record", e);
            throw e;
        }
    }

    static async deleteEmployeeDBRecord(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmployeeDB";

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "DELETE",
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to delete employee record: ${response.status} - ${err}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to delete employee DB record", e);
            throw e;
        }
    }

    // Upcoming Leaves Methods
    static async getAllUpcomingLeaves(): Promise<UpcomingLeaveRecord[]> {
        try {
            const token = await getAccessToken();
            const listName = "Upcoming Leaves";
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";

            // Select all fields to ensure we find the correct Date column
            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return (data.d.results || []).map((item: RawUpcomingLeaveItem) => ({
                id: item.Id?.toString() || '',
                employeeName: item.Title || '',
                // Use field_1, Date, or DateRange as fallback
                date: item.field_1 || item.Date || item.Dates || item.Date_x0020_Range || item.UpcomingDate || ''
            }));
        } catch (error) {
            console.warn("SP Service: Failed to fetch upcoming leaves", error);
            return [];
        }
    }

    static async addUpcomingLeave(record: Omit<UpcomingLeaveRecord, 'id'>): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const listName = "Upcoming Leaves";
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";

            const payload = {
                '__metadata': { 'type': `SP.Data.${listName.replace(/\s/g, '_x0020_')}ListItem` },
                'Title': record.employeeName,
                'Date': record.date // Trying 'Date' as field_1 failed.
            };

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose",
                    "Content-Type": "application/json;odata=verbose",
                    "X-RequestDigest": digest
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to add upcoming leave: ${response.status} - ${err}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to add upcoming leave", e);
            throw e;
        }
    }

    static async updateUpcomingLeave(id: string, record: Partial<UpcomingLeaveRecord>): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const listName = "Upcoming Leaves";
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";

            const payload: UpcomingLeavePayload = {
                '__metadata': { 'type': `SP.Data.${listName.replace(/\s/g, '_x0020_')}ListItem` }
            };

            if (record.employeeName !== undefined) payload.Title = record.employeeName;
            if (record.date !== undefined) payload.Date = record.date;

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose",
                    "Content-Type": "application/json;odata=verbose",
                    "X-RequestDigest": digest,
                    "X-HTTP-Method": "MERGE",
                    "If-Match": "*"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Failed without status`);
            }
        } catch (e) {
            console.error("SP Service: Failed to update upcoming leave", e);
            throw e;
        }
    }

    static async deleteUpcomingLeave(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const listName = "Upcoming Leaves";
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "DELETE",
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to delete upcoming leave: ${response.status} - ${err}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to delete upcoming leave", e);
            throw e;
        }
    }

    static async addEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch("https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('" + this.EMPLOYEES_LIST + "')/items", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Data.EmployeesListItem" }, // Ensure List entity name is correct (usually ListName + 'ListItem')
                    "Title": employee.name,
                    "Role": employee.role,
                    "Department": employee.department,
                    "Email": employee.email,
                    "ShiftId": employee.shiftId || '',
                    "Place": employee.place || '', // Added Place
                    // "AvatarUrl": employee.avatarUrl || '', // Removed due to schema mismatch
                    "PermissionLevel": employee.permissionLevel || 'Employee'
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Add Employee Failed: ${response.status} - ${text}`);
            }

            const data = await response.json();
            const item = data.d;
            return {
                id: item.Id.toString(),
                name: item.Title,
                role: item.Role,
                department: item.Department,
                email: item.Email,
                shiftId: item.ShiftId,
                place: item.Place || '', // Added Place
                avatarUrl: '', // item.AvatarUrl,
                permissionLevel: item.PermissionLevel
            };
        } catch (e) {
            console.error("SP Service: Failed to add employee", e);
            throw e;
        }
    }
    private static async ensureAccountStatusField(token: string): Promise<void> {
        try {
            // Check if field exists
            const checkResponse = await fetch(`${this.getEmployeesDOBBaseUrl()}/_api/web/lists/getByTitle('${this.EMPLOYEES_LIST}')/fields/getByInternalNameOrTitle('AccountStatus')`, {
                headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json;odata=verbose" }
            });

            if (checkResponse.ok) return; // Field exists

            console.warn("SP Service: AccountStatus field missing. Creating...");
            const digest = await this.getFormDigest(token);

            // Create field
            await fetch(`${this.getEmployeesDOBBaseUrl()
                } / _api / web / lists / getByTitle('${this.EMPLOYEES_LIST}') / fields`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token} `,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Field" },
                    "Title": "AccountStatus",
                    "FieldTypeKind": 2, // Text
                    "Required": false,
                    "EnforceUniqueValues": false,
                    "StaticName": "AccountStatus"
                })
            });
            console.log("SP Service: AccountStatus field created.");
        } catch (e) {
            console.error("SP Service: Failed to ensure AccountStatus field", e);
        }
    }

    static async disableEmployee(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            await this.ensureAccountStatusField(token); // Ensure field exists before writing

            const digest = await this.getFormDigest(token);

            const response = await fetch(`${this.getEmployeesDOBBaseUrl()} /_api/web / lists / getByTitle('${this.EMPLOYEES_LIST}') / items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token} `,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Data.EmployeesListItem" },
                    "AccountStatus": "Disabled"
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Disable Employee Failed: ${response.status} - ${text} `);
            }
        } catch (e) {
            console.error("SP Service: Failed to disable employee", e);
            throw e;
        }
    }

    static async enableEmployee(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch(`${this.getEmployeesDOBBaseUrl()} /_api/web / lists / getByTitle('${this.EMPLOYEES_LIST}') / items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token} `,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Data.EmployeesListItem" },
                    "AccountStatus": "Active"
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Enable Employee Failed: ${response.status} - ${text} `);
            }
        } catch (e) {
            console.error("SP Service: Failed to enable employee", e);
            throw e;
        }
    }


    static async updateEmployee(id: string, employee: Partial<Employee>): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const body: Record<string, unknown> = {
                "__metadata": { "type": "SP.Data.EmployeesListItem" }
            };
            if (employee.name) body.Title = employee.name;
            if (employee.role) body.Role = employee.role;
            if (employee.department) body.Department = employee.department;
            if (employee.email) body.Email = employee.email;
            if (employee.shiftId) body.ShiftId = employee.shiftId;
            if (employee.place) body.Place = employee.place; // Added Place
            if (employee.permissionLevel) body.PermissionLevel = employee.permissionLevel;

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.EMPLOYEES_LIST}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Update Employee Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to update employee", e);
            throw e;
        }
    }

    static async deleteEmployee(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.EMPLOYEES_LIST}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "DELETE"
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Delete Employee Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to delete employee", e);
            throw e;
        }
    }

    static async getAllShifts(): Promise<Shift[]> {
        console.log("SP Service: Fetching Shifts (Raw Fetch)...");
        try {
            const token = await getAccessToken();
            const response = await fetch("https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('" + this.SHIFTS_LIST + "')/items", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                // Determine if 404
                if (response.status === 404) {
                    console.warn("Shifts list not found.");
                    return [];
                }
                const text = await response.text();
                throw new Error(`SharePoint Error: ${response.status} - ${text}`);
            }

            const data = await response.json();
            const items = data.d.results;

            console.log(`SP Service: Found ${items.length} shifts`);
            return items.map((item: SPShiftItem) => ({
                id: item.Id.toString(),
                name: item.Title,
                startTime: item.StartTime,
                endTime: item.EndTime,
                timeZone: item.TimeZone
            }));
        } catch (e) {
            console.error("SP Service: Failed to fetch shifts.", e);
            throw e;
        }
    }

    static async checkOut(recordId: string, checkInTimeStr: string, dateStr: string, shiftStartTime?: string, shiftEndTime?: string): Promise<AttendanceRecord> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const now = new Date();
            const timeStr = this.formatTimeAMPM(now);

            // Special case: If check-in time looks like midnight (00:00 or 12:00 AM) and checkout is also midnight
            // this usually means a manual record entry for Holiday/Leave.
            if ((checkInTimeStr === '00:00' || checkInTimeStr === '12:00 AM') && (timeStr === '00:00' || timeStr === '12:00 AM')) {
                const body: Record<string, unknown> = {
                    "__metadata": { "type": "SP.Data.AttendanceListItem" },
                    "CheckOutTime": timeStr,
                    "WorkingHours": "00:00"
                };

                const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${recordId})`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-RequestDigest": digest,
                        "Content-Type": "application/json;odata=verbose",
                        "Accept": "application/json;odata=verbose",
                        "IF-MATCH": "*",
                        "X-HTTP-Method": "MERGE"
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Manual Check-Out Failed: ${response.status} - ${text}`);
                }

                const updatedResponse = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${recordId})`, {
                    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json;odata=verbose" }
                });
                const data = await updatedResponse.json();
                const item = data.d;

                return {
                    id: item.Id.toString(),
                    employeeId: item.EmployeeId,
                    date: item.Date,
                    checkInTime: item.CheckInTime,
                    checkOutTime: item.CheckOutTime,
                    status: item.Status,
                    shiftId: item.ShiftId,
                    workingHours: item.WorkingHours
                };
            }

            // --- NORMAL CHECKOUT CALCULATION ---
            const actualStartTime = this.parseDateTime(dateStr, checkInTimeStr);
            const actualEndTime = now; // Use the Date object directly for max precision

            // Calculate ACTUAL working hours for display
            // Difference in milliseconds
            const actualDiffMs = Math.max(0, actualEndTime.getTime() - actualStartTime.getTime());

            // Format as HH:MM
            const h = Math.floor(actualDiffMs / 3600000);
            const m = Math.floor((actualDiffMs % 3600000) / 60000);
            const workingHoursStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

            // Calculate EFFECTIVE working hours for Status determination (Capped by Shift boundaries)
            let status = 'Present';
            let effectiveDiffMs = actualDiffMs;

            if (shiftStartTime && shiftEndTime) {
                const shiftStart = this.parseDateTime(dateStr, shiftStartTime);
                let shiftEnd = this.parseDateTime(dateStr, shiftEndTime);

                // Handle overnight shift definition (e.g. 10:00 PM to 06:00 AM)
                if (shiftEnd < shiftStart) {
                    shiftEnd = new Date(shiftEnd);
                    shiftEnd.setDate(shiftEnd.getDate() + 1);
                }

                // Intersection of [actualStart, actualEnd] and [shiftStart, shiftEnd]
                const effectiveStart = actualStartTime > shiftStart ? actualStartTime : shiftStart;
                const effectiveEnd = actualEndTime < shiftEnd ? actualEndTime : shiftEnd;

                // Duration within shift boundaries
                const intersectMs = Math.max(0, effectiveEnd.getTime() - effectiveStart.getTime());
                effectiveDiffMs = intersectMs;
            }

            const effectiveTotalHours = effectiveDiffMs / (1000 * 60 * 60);

            // Status Logic: 
            // < 4 hours = Absent
            // 4 to 6.5 hours = Half Day
            // >= 6.5 hours = Present
            if (effectiveTotalHours < 4) {
                status = 'Absent';
            } else if (effectiveTotalHours < 6.5) {
                status = 'Half Day';
            }

            // Dynamic Entity Type Fetch
            const listResponse = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')?$select=ListItemEntityTypeFullName`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            let entityType = "SP.Data.AttendanceListItem";
            if (listResponse.ok) {
                const listData = await listResponse.json();
                entityType = listData.d.ListItemEntityTypeFullName;
            }

            // Body for update
            const body: Record<string, unknown> = {
                "__metadata": { "type": entityType },
                "CheckOutTime": timeStr,
                "Status": status,
                "WorkingHours": workingHoursStr // Targeted field
            };

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${recordId})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const text = await response.text();
                // If it fails because of the field name, try the alternative
                if (text.includes("WorkingHours")) {
                    throw new Error("Field 'WorkingHours' not found in SharePoint list.");
                }
                throw new Error(`Check-Out Update Failed: ${response.status} - ${text.substring(0, 100)}`);
            }

            // Fetch the updated item to return to UI
            const updatedResponse = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${recordId})`, {
                headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json;odata=verbose" }
            });

            if (!updatedResponse.ok) {
                const text = await updatedResponse.text();
                throw new Error(`SharePoint Error fetching updated record: ${updatedResponse.status} - ${text}`);
            }

            const data = await updatedResponse.json();
            const item = data.d;

            return {
                id: item.Id.toString(),
                employeeId: item.EmployeeId,
                date: item.Date,
                checkInTime: item.CheckInTime,
                checkOutTime: item.CheckOutTime,
                status: item.Status,
                shiftId: item.ShiftId,
                workingHours: item.WorkingHours
            };
        } catch (e: unknown) {
            console.error("SP Service: Check-Out Error", e);
            throw e;
        }
    }

    static async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
        try {
            const token = await getAccessToken();
            const now = new Date();
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear();
            const dateStr = `${day}/${month}/${year}`;

            // Filter by EmployeeId ONLY, order by Created desc (latest first) to avoid OData "Date" reserved word issues
            const filter = `EmployeeId eq '${userId}'`;

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items?$filter=${encodeURIComponent(filter)}&$orderby=Created desc&$top=10`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                console.warn("SP Service: Failed to fetch attendance", response.status);
                return null;
            }

            const data = await response.json();
            const items = data.d.results;

            if (!items || items.length === 0) return null;

            // Find record for TODAY in JS
            const todayRecord = items.find((item: SPAttendanceItem) => item.Date === dateStr);

            if (!todayRecord) return null;

            return {
                id: todayRecord.Id.toString(),
                employeeId: todayRecord.EmployeeId,
                date: todayRecord.Date,
                checkInTime: todayRecord.CheckInTime,
                checkOutTime: todayRecord.CheckOutTime,
                status: todayRecord.Status || 'Present',
                shiftId: todayRecord.ShiftId
            };
        } catch (e) {
            console.error("SP Service: Attendance fetch error", e);
            return null;
        }
    }

    static async getAllAttendanceForDate(dateStr: string): Promise<AttendanceRecord[]> {
        try {
            const token = await getAccessToken();
            // Fetch all items (up to 500 for now to be safe, or implement paging if needed)
            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items?$orderby=Created desc&$top=500`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                console.warn("SP Service: Failed to fetch all attendance", response.status);
                return [];
            }

            const data = (await response.json()) as SPResult<SPAttendanceItem>;
            const items = data.d.results;

            if (!items || items.length === 0) return [];

            // Filter in JS for robustness
            return items.filter((item: SPAttendanceItem) => item.Date === dateStr).map((item: SPAttendanceItem) => ({
                id: item.Id.toString(),
                employeeId: item.EmployeeId,
                name: item.Title, // Assuming Title stores Employee Name based on previous checkIn logic
                date: item.Date,
                checkInTime: item.CheckInTime,
                checkOutTime: item.CheckOutTime,
                status: item.Status || 'Present',
                shiftId: item.ShiftId || '',
                workingHours: item.WorkingHours
            }));
        } catch (e) {
            console.error("SP Service: Failed to fetch daily attendance", e);
            return [];
        }
    }

    // Fetch attendance history for a user within a date range
    static async getAttendanceHistory(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
        console.log(`SP Service: Fetching attendance history for user ${userId} from ${startDate} to ${endDate}`);
        try {
            const token = await getAccessToken();

            // Fetch all items for the user (we'll filter by date in JS since SharePoint OData date filtering can be tricky)
            const filter = `EmployeeId eq '${userId}'`;
            const select = 'Id,EmployeeId,Title,Date,CheckInTime,CheckOutTime,Status,ShiftId,WorkingHours,Place,Regularized';

            // Start Recursive Fetching Strategy for History
            let allItems: SPAttendanceItem[] = [];
            let nextUrl: string | null = `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items?$select=${select}&$filter=${encodeURIComponent(filter)}&$orderby=Created desc&$top=5000`;

            while (nextUrl) {
                const response = await fetch(nextUrl, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                });

                if (!response.ok) {
                    console.warn("SP Service: Failed to fetch attendance history batch", response.status);
                    break;
                }

                const data = await response.json();
                const items = data.d.results;

                if (items && items.length > 0) {
                    allItems = allItems.concat(items);
                }

                nextUrl = data.d.__next || null;
            }

            if (allItems.length === 0) return [];

            const items = allItems; // Re-assign for existing logic compatibility

            if (!items || items.length === 0) return [];

            // Normalize startDate and endDate to YYYY-MM-DD
            const normalizeToISO = (dateStr: string) => {
                if (dateStr.includes('-')) return dateStr; // Already ISO
                const [d, m, y] = dateStr.split('/');
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            };

            const startISO = normalizeToISO(startDate);
            const endISO = normalizeToISO(endDate);

            // Filter by date range in JavaScript
            const filtered = items.filter((item: SPAttendanceItem) => {
                if (!item.Date) return false;

                // Compare dates (DD/MM/YYYY format)
                // Convert DD/MM/YYYY to YYYY-MM-DD for comparison
                const [d, m, y] = item.Date.split('/');
                const itemDateISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

                return itemDateISO >= startISO && itemDateISO <= endISO;
            });

            return filtered.map((item: SPAttendanceItem) => ({
                id: item.Id.toString(),
                employeeId: item.EmployeeId,
                name: item.Title,
                date: item.Date,
                checkInTime: item.CheckInTime,
                checkOutTime: item.CheckOutTime,
                status: item.Status || 'Present',
                shiftId: item.ShiftId || '',
                workingHours: item.WorkingHours,
                place: item.Place,
                regularized: item.Regularized || null
            }));
        } catch (e) {
            console.error("SP Service: Failed to fetch attendance history", e);
            return [];
        }
    }

    // Fetch all attendance for a specific employee for the entire year
    static async getEmployeeAttendanceForYear(employeeId: string, employeeName: string, year: number): Promise<AttendanceRecord[]> {
        console.log(`SP Service: Fetching attendance for ${employeeName} (${employeeId}) for year ${year}`);
        try {
            const token = await getAccessToken();
            // Filter by EmployeeId OR Name (since some older records might only have name)
            const filter = `(EmployeeId eq '${employeeId}' or Title eq '${employeeName.replace(/'/g, "''")}')`;
            const select = 'Id,EmployeeId,Title,Date,CheckInTime,CheckOutTime,Status,ShiftId,WorkingHours,Place,Regularized';

            const listName = this.getAttendanceListName(year);
            let allItems: SPAttendanceItem[] = [];
            let nextUrl: string | null = `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${listName}')/items?$select=${select}&$filter=${encodeURIComponent(filter)}&$orderby=Created desc&$top=5000`;

            while (nextUrl) {
                const response = await fetch(nextUrl, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                });

                if (!response.ok) break;

                const data = (await response.json()) as SPResult<SPAttendanceItem>;
                const items = data.d.results;

                if (items && items.length > 0) {
                    allItems = allItems.concat(items);
                }
                nextUrl = data.d.__next || null;
            }

            // Filter by year in JS for reliability
            return allItems
                .filter((item: SPAttendanceItem) => {
                    const datePart = item.Date || '';
                    return datePart.endsWith(`/${year}`);
                })
                .map((item: SPAttendanceItem) => ({
                    id: item.Id.toString(),
                    employeeId: item.EmployeeId || '',
                    name: item.Title || '',
                    date: item.Date || '',
                    checkInTime: item.CheckInTime || '-',
                    checkOutTime: item.CheckOutTime || '-',
                    workingHours: item.WorkingHours || '-',
                    status: item.Status || 'IN',
                    shiftId: item.ShiftId || '',
                    place: item.Place || '',
                    regularized: item.Regularized || null
                }));
        } catch (e) {
            console.error("SP Service: Failed to fetch year attendance", e);
            return [];
        }
    }

    // New Method: Fetch ALL attendance for ALL users within a range
    static async getAllAttendanceInRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
        console.log(`SP Service: Fetching ALL attendance from ${startDate} to ${endDate}`);
        try {
            const token = await getAccessToken();
            // Fetch top 5000 (limit) - filtering in JS
            // Expand to get details if needed, but standard fields are fine
            const select = 'Id,EmployeeId,Title,Date,CheckInTime,CheckOutTime,Status,ShiftId,WorkingHours,Place,Regularized,StaffMail';

            let allItems: SPAttendanceItem[] = [];
            let nextUrl: string | null = `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items?$select=${select}&$orderby=Created desc&$top=5000`;

            while (nextUrl) {
                console.log(`SP Service: Fetching batch... (${allItems.length} loaded so far)`);
                const response = await fetch(nextUrl, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                });

                if (!response.ok) {
                    console.warn("SP Service: Failed to fetch batch", response.status);
                    break;
                }

                const data = await response.json();
                const items = data.d.results;

                if (items && items.length > 0) {
                    allItems = allItems.concat(items);
                }

                nextUrl = data.d.__next || null;
            }

            if (allItems.length === 0) return [];

            // Filter in JS
            // Start/End date are expected in YYYY-MM-DD format for comparison
            return allItems.filter((item: SPAttendanceItem) => {
                if (!item.Date) return false;
                // Parse Item Date (DD/MM/YYYY)
                const [d, m, y] = item.Date.split('/');
                const itemDateISO = `${y}-${m}-${d}`;
                return itemDateISO >= startDate && itemDateISO <= endDate;
            }).map((item: SPAttendanceItem) => ({
                id: item.Id.toString(),
                employeeId: item.EmployeeId,
                name: item.Title,
                date: item.Date,
                checkInTime: item.CheckInTime,
                checkOutTime: item.CheckOutTime,
                status: item.Status || 'Present',
                shiftId: item.ShiftId,
                workingHours: item.WorkingHours,
                place: item.Place,
                email: item.StaffMail,
                regularized: item.Regularized || null
            })) as AttendanceRecord[];

        } catch (e) {
            console.error("SP Service: Failed to fetch global attendance", e);
            return [];
        }
    }

    // --- NOTIFICATIONS ---

    static async sendWish(recipientEmail: string, senderName: string, message: string, type: 'Birthday' | 'Anniversary'): Promise<void> {
        console.log(`SP Service: Sending ${type} wish to ${recipientEmail} from ${senderName}`);
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch(`${this.getEmployeesDOBBaseUrl()}/_api/web/lists/getByTitle('${this.NOTIFICATIONS_LIST}')/items`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Data.NotificationsListItem" },
                    "Title": type === 'Birthday' ? "Birthday Wish" : "Work Anniversary Wish",
                    "RecipientEmail": recipientEmail,
                    "SenderName": senderName,
                    "Status": "Unread",
                    "Notifications": message
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Send Wish Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to send wish", e);
            throw e;
        }
    }

    static async getNotifications(email: string): Promise<AppNotification[]> {
        try {
            const token = await getAccessToken();
            const response = await fetch(`${this.getEmployeesDOBBaseUrl()}/_api/web/lists/getByTitle('${this.NOTIFICATIONS_LIST}')/items?$filter=RecipientEmail eq '${encodeURIComponent(email)}' and Status eq 'Unread'&$orderby=Created desc`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) return [];

            const data = (await response.json()) as SPResult<SPNotificationItem>;
            const items = data.d.results;

            return items.map((item: SPNotificationItem) => ({
                id: item.Id.toString(),
                title: item.Title,
                message: item.Notifications, // Map the actual message content
                recipientEmail: item.RecipientEmail,
                senderName: item.SenderName,
                status: item.Status as 'Read' | 'Unread',
                category: 'Wish', // Defaulting to Wish as category field is missing
                timestamp: item.Created
            })) as AppNotification[];
        } catch (e) {
            console.error("SP Service: Failed to fetch notifications", e);
            return [];
        }
    }

    static async markNotificationAsRead(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch(`${this.getEmployeesDOBBaseUrl()}/_api/web/lists/getByTitle('${this.NOTIFICATIONS_LIST}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Data.NotificationsListItem" },
                    "Status": "Read"
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Mark Notification as Read Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to mark notification as read", e);
            throw e;
        }
    }

    private static getEmployeesDOBBaseUrl() {
        return "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";
    }


    // Request regularization for a missed checkout
    static async requestRegularization(recordId: string): Promise<void> {
        console.log(`SP Service: Requesting regularization for record ${recordId}`);
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            // Get the current record to calculate working hours based on shift end time
            const recordResponse = await fetch(
                `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${recordId})`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!recordResponse.ok) {
                throw new Error("Failed to fetch attendance record");
            }

            const recordData = await recordResponse.json();
            const record = recordData.d as SPAttendanceItem;

            // Get shift information to determine end time
            const allShifts = await this.getAllShifts();
            const shift = allShifts.find(s => s.id === record.ShiftId);

            if (!shift) {
                throw new Error("Shift information not found");
            }

            // Set checkout time to shift end time - ensure it's in 12-hour AM/PM format
            let checkOutTime = shift.endTime;

            // If shift end time is in 24-hour format, convert to 12-hour AM/PM
            if (checkOutTime.includes(':') && !checkOutTime.includes('AM') && !checkOutTime.includes('PM')) {
                const [hours, minutes] = checkOutTime.split(':').map(Number);
                const period = hours >= 12 ? 'PM' : 'AM';
                const hour12 = hours % 12 || 12;
                checkOutTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
            }

            // Calculate working hours
            const dateStr = record.Date;
            const checkInDateTime = this.parseDateTime(dateStr, record.CheckInTime || '');
            const checkOutDateTime = this.parseDateTime(dateStr, checkOutTime);

            const diffMs = Math.max(0, checkOutDateTime.getTime() - checkInDateTime.getTime());
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            const workingHoursStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

            // Determine status based on working hours
            const totalHours = diffMs / (1000 * 60 * 60);
            let status = 'Present';
            if (totalHours < 4) {
                status = 'Absent';
            } else if (totalHours < 8) {
                status = 'Half Day';
            }

            // Dynamic Entity Type Fetch
            const listResponse = await fetch(
                `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')?$select=ListItemEntityTypeFullName`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            let entityType = "SP.Data.AttendanceListItem";
            if (listResponse.ok) {
                const listData = await listResponse.json();
                entityType = listData.d.ListItemEntityTypeFullName;
            }

            // Update the record with regularized checkout
            const body: Record<string, unknown> = {
                "__metadata": { "type": entityType },
                "CheckOutTime": checkOutTime,
                "WorkingHours": workingHoursStr,
                "Status": status,
                "Regularized": "YES" // Mark as regularized
            };

            const response = await fetch(
                `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${recordId})`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-RequestDigest": digest,
                        "Content-Type": "application/json;odata=verbose",
                        "Accept": "application/json;odata=verbose",
                        "IF-MATCH": "*",
                        "X-HTTP-Method": "MERGE"
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Regularization failed: ${response.status} - ${text}`);
            }

            console.log("SP Service: Regularization request successful");
        } catch (e) {
            console.error("SP Service: Regularization error", e);
            throw e;
        }
    }

    // Count regularizations for current month
    static async getRegularizationCount(userId: string, month: number, year: number): Promise<number> {
        console.log(`SP Service: Counting regularizations for user ${userId} in ${month}/${year}`);
        try {
            const token = await getAccessToken();

            // Fetch all attendance records for the user
            const filter = `EmployeeId eq '${userId}'`;

            const response = await fetch(
                `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items?$filter=${encodeURIComponent(filter)}&$top=500`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                console.warn("SP Service: Failed to fetch attendance for regularization count");
                return 0;
            }

            const data = await response.json();
            const items = data.d.results;

            if (!items || items.length === 0) return 0;

            // Filter by month/year and check if regularized
            const count = items.filter((item: SPAttendanceItem) => {
                if (!item.Date || !item.Regularized) return false;

                // Parse date (DD/MM/YYYY format)
                const [, monthStr, yearStr] = item.Date.split('/');
                const itemMonth = parseInt(monthStr, 10);
                const itemYear = parseInt(yearStr, 10);

                // Check if it's the target month/year and is regularized (YES or Yes)
                const isRegularized = item.Regularized &&
                    (item.Regularized === 'YES' || item.Regularized.startsWith('Yes'));

                return itemMonth === month && itemYear === year && isRegularized;
            }).length;

            return count;
        } catch (e) {
            console.error("SP Service: Failed to count regularizations", e);
            return 0;
        }
    }

    // Helper to get Form Digest for Writes
    // Helper to get Form Digest for Writes
    private static async getFormDigest(token: string, siteUrl: string = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB"): Promise<string> {
        const response = await fetch(`${siteUrl}/_api/contextinfo`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json;odata=verbose"
            }
        });
        if (!response.ok) throw new Error("Failed to get Form Digest");
        const data = await response.json();
        return data.d.GetContextWebInformation.FormDigestValue;
    }

    static async addShift(shift: Omit<Shift, 'id'>): Promise<Shift> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch("https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('" + this.SHIFTS_LIST + "')/items", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Data.ShiftsListItem" },
                    "Title": shift.name,
                    "StartTime": shift.startTime,
                    "EndTime": shift.endTime,
                    "TimeZone": shift.timeZone
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Add Shift Failed: ${response.status} - ${text}`);
            }

            const data = await response.json();
            const item = data.d;
            return {
                id: item.Id.toString(),
                name: item.Title,
                startTime: item.StartTime,
                endTime: item.EndTime,
                timeZone: item.TimeZone
            };
        } catch (e) {
            console.error("SP Service: Failed to add shift", e);
            throw e;
        }
    }

    static async deleteShift(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.SHIFTS_LIST}')/items(${id})`, {
                method: "POST", // POST with DELETE method header is safer/standard in some SP configs, but DELETE method works too.
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "DELETE"
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Delete Shift Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to delete shift", e);
            throw e;
        }
    }

    private static formatTimeAMPM(date: Date): string {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const hoursStr = hours.toString().padStart(2, '0');
        const minutesStr = minutes.toString().padStart(2, '0');
        return `${hoursStr}:${minutesStr} ${ampm}`;
    }

    private static parseDateTime(dateStr: string, timeStr: string): Date {
        // Handle potentially missing timeStr or placeholders
        if (!timeStr || timeStr === '-' || timeStr === '00:00' || timeStr.includes('--')) {
            const dateParts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
            const day = parseInt(dateParts.length === 3 && dateStr.includes('/') ? dateParts[0] : (dateParts[2] || "0"), 10);
            const month = parseInt(dateParts.length === 3 && dateStr.includes('/') ? dateParts[1] : (dateParts[1] || "1"), 10) - 1;
            const year = parseInt(dateParts.length === 3 && dateStr.includes('/') ? dateParts[2] : (dateParts[0] || "2025"), 10);
            return new Date(year, month, day, 0, 0, 0);
        }

        // Parse Date Parts robustly
        const dateParts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        let day: number, month: number, year: number;

        if (dateStr.includes('/')) {
            // Assume DD/MM/YYYY
            day = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10) - 1;
            year = parseInt(dateParts[2], 10);
        } else {
            // Assume YYYY-MM-DD
            year = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10) - 1;
            day = parseInt(dateParts[2], 10);
        }

        // Robust time splitting: Handles "12:05 PM", "12:05PM", "12:05:00 PM", etc.
        // Also stripping any potential hidden characters like \u202F
        const cleanTime = timeStr.replace(/\u202F/g, ' ').trim();
        const timeMatch = cleanTime.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);

        if (!timeMatch) {
            return new Date(year, month, day, 0, 0, 0);
        }

        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const modifier = timeMatch[4]?.toUpperCase();

        if (modifier) {
            if (hours === 12 && modifier === 'AM') {
                hours = 0;
            } else if (hours < 12 && modifier === 'PM') {
                hours += 12;
            }
        }
        // If no modifier, treat as 24h format (0-23)

        const finalDate = new Date(year, month, day);
        finalDate.setHours(hours, minutes, 0, 0);
        return finalDate;
    }

    public static calculateDuration(dateStr: string, startStr: string, endStr: string): string {
        try {
            const start = this.parseDateTime(dateStr, startStr);
            let end = this.parseDateTime(dateStr, endStr);

            // Midnight rollover check (if end is earlier than start, assume next day)
            if (start > end) {
                end = new Date(end);
                end.setDate(end.getDate() + 1);
            }

            const diffMs = Math.max(0, end.getTime() - start.getTime());
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        } catch (e) {
            console.error("Duration calculation failed", e);
            return "00:00";
        }
    }

    static async checkIn(userId: string, shiftId: string, employeeName: string, employeePlace?: string, employeeEmail?: string): Promise<AttendanceRecord> {
        try {
            // Check if already checked in today to prevent duplicates
            const existingRecord = await this.getTodayAttendance(userId);
            if (existingRecord) {
                console.log("SP Service: Record already exists for today. Returning existing.", existingRecord);
                return existingRecord;
            }

            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const now = new Date();
            // Format Date as DD/MM/YYYY
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
            const year = now.getFullYear();
            const dateStr = `${day}/${month}/${year}`;

            const timeStr = this.formatTimeAMPM(now);

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify({
                    "__metadata": { "type": "SP.Data.AttendanceListItem" },
                    "Title": employeeName,
                    "EmployeeId": userId,
                    "Date": dateStr,
                    "CheckInTime": timeStr,
                    "Status": 'IN',
                    "ShiftId": shiftId,
                    "Place": employeePlace || '', // Save employee's place
                    "StaffMail": employeeEmail || '' // Save employee's email
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`CheckIn Failed: ${response.status} - ${text}`);
            }

            const data = await response.json();
            const item = data.d;

            return {
                id: item.Id.toString(),
                employeeId: item.EmployeeId,
                date: item.Date,
                checkInTime: item.CheckInTime,
                status: item.Status,
                shiftId: item.ShiftId,
                place: item.Place || '' // Return place in the record
            };
        } catch (e) {
            console.error("SP Service: CheckIn error", e);
            throw e;
        }
    }




    static async checkPermissionLevelColumn(): Promise<boolean> {
        try {
            const sp = getSP();
            const fields = await sp.web.lists.getByTitle(this.EMPLOYEES_LIST).fields.select("InternalName").filter("InternalName eq 'PermissionLevel'")();
            return fields.length > 0;
        } catch (e) {
            console.error("SP Service: Failed to check PermissionLevel field", e);
            return false;
        }
    }

    // Leave Management - New Site
    static async getLeaveRequests(userEmail: string): Promise<LeaveRequest[]> {
        console.log("SP Service: Fetching Leave Requests for", userEmail);
        try {
            const token = await getAccessToken();
            // Site: https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All
            // List: Leave Request

            // We'll fetch all items and filter client side first to be safe, or we can try OData filter if we are sure of the column 'Author/Email' or a specific 'EmployeeEmail' column.
            // Let's assume there is an 'Author' field we can expand, or we blindly fetch all and filter by current user if strict security isn't the concern (for UI filtering).
            // Better: Filter by Author/EMail if possible.

            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "Leave Request";

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items?$select=*,Author/Title,Author/EMail,Manager/Title,ApprovalComments&$expand=Author,Manager&$orderby=Created desc&$top=100`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                // Check if it's a 404 (List not found) or 403 (Access Denied)
                const text = await response.text();
                console.error(`Leave Fetch Error: ${response.status}`, text);
                // Fallback: Return empty if list missing to prevent crash
                if (response.status === 404) return [];
                throw new Error(`SharePoint Leave Error: ${response.status} - ${text}`);
            }

            const data = (await response.json()) as SPResult<SPLeaveRequestItem>;
            const items = data.d.results;

            const userLeaves = items.filter((item: SPLeaveRequestItem) => {
                const authorEmail = item.Author?.EMail || "";
                return authorEmail.toLowerCase() === userEmail.toLowerCase();
            });

            return userLeaves.map((item: SPLeaveRequestItem) => ({
                id: item.Id.toString(),
                employeeName: item.Author?.Title || "Unknown",
                leaveType: item.LeaveType || item.Title || "General",
                submittedOn: item.Created,
                fromDate: item.EventDate || item.From || item.StartDate || item.Created,
                toDate: item.EndDate || item.To || item.EventDate || item.Created,
                leaveDuration: item.LeaveDuration || item.Duration || "N/A",
                status: item.Status || "Pending",
                manager: item.Manager?.Title || "System (Auto)",
                reason: item.Detail || item.Details || item.Comments || item.Description || "",
                approvalComments: item.ApprovalComments || item.ApproverComments || item.AdminComments || "",
                created: item.Created
            } as LeaveRequest));

        } catch (e) {
            console.error("SP Service: Failed to fetch leave requests", e);
            throw e;
        }
    }

    static async submitLeaveRequest(request: {
        fromDate: string;
        toDate: string;
        leaveType: string;
        employeeName: string;
        comments: string;
        leaveCategory?: string;
    }): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "Leave Request";

            // Map UI fields to SharePoint fields
            // Title: Employee Name (who submitted the request)  
            // From: Start Date
            // To: End Date
            // LeaveType: Choice (Sick Leave, Vacation/Function, etc.)
            // Leave: Leave Category (Full Day Leave, Half Day Leave)
            // Detail: Comments/Reason
            // Status: Pending (default)
            // Note: The EmpName column in SharePoint likely has internal name "EmployeeName" or similar

            const payload = {
                "__metadata": { "type": "SP.Data.Leave_x0020_RequestListItem" },
                "Title": request.employeeName,
                "From": request.fromDate,
                "To": request.toDate,
                "LeaveType": request.leaveType,
                "Leave": request.leaveCategory || "Full Day Leave",
                "Detail": request.comments,
                "Status": "Pending"
            };

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Submit Leave Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to submit leave", e);
            throw e;
        }
    }

    // Generic Holiday Fetching
    static async getHolidays(listName: string): Promise<Holiday[]> {
        console.log(`SP Service: Fetching holidays from ${listName}`);
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";

            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                console.warn(`SP Service: Failed to fetch holidays from ${listName}`, response.status);
                return [];
            }

            const data = await response.json();
            // Define loose type for holiday items to handle various schema discrepancies
            interface SPHolidayVariant {
                Id?: number; ID?: number;
                Title?: string; Name?: string; EmployeeName?: string;
                EventDate?: string; Date?: string; HolidayDate?: string; StartDate?: string;
                Location?: string; Place?: string;
            }

            const items = (data.d.results || []) as SPHolidayVariant[];

            return items.map((item: SPHolidayVariant) => {
                // Determine date from common fields
                const rawDate = item.EventDate || item.Date || item.HolidayDate || item.StartDate || '';

                // Determine title from common fields
                const title = item.Title || item.Name || item.EmployeeName || 'Holiday';

                // Determine location
                const location = item.Location || item.Place || '';

                return {
                    id: (item.Id || item.ID || '').toString(),
                    title: title,
                    date: rawDate,
                    location: location
                };
            });
        } catch (e) {
            console.error(`SP Service: Failed to fetch holidays from ${listName}`, e);
            return [];
        }
    }

    static async getUSAHolidays(): Promise<Holiday[]> {
        return this.getHolidays("USA Holiday List");
    }

    static async getCanadaHolidays(): Promise<Holiday[]> {
        return this.getHolidays("Holiday List"); // Canada uses the generic "Holiday List" name
    }

    static async getAPACHolidays(): Promise<Holiday[]> {
        return this.getHolidays("APAC Holiday List");
    }

    // Upcoming Leaves
    static async getUpcomingLeaves(): Promise<Holiday[]> {
        // Re-using the now-robust getHolidays which handles StartDate, Name, etc.
        return this.getHolidays("Upcoming Leaves");
    }

    // Get Employee Assets
    static async getEmployeeAssets(employeeEmail: string): Promise<Asset[]> {
        console.log(`SP Service: Fetching assets for employee email ${employeeEmail}`);
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";
            const listName = "Asset";

            // Fetch all items first to see structure
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn("Asset list not found");
                    return [];
                }
                throw new Error(`SharePoint Asset Error: ${response.status}`);
            }

            const data = await response.json();
            const items = data.d.results;

            console.log("SP Service: All assets fetched:", items.length);
            if (items.length > 0) {
                console.log("SP Service: Sample asset item:", items[0]);
                console.log("SP Service: Sample asset keys:", Object.keys(items[0]));
            }

            // Filter by email in JavaScript (more flexible)
            const filtered = items.filter((item: SPAssetItem) => {
                // Try multiple email field name variations
                const assetEmail = item.StaffMail || item.Staff_x0020_Mail ||
                    item.EmployeeEmail || item.Employee_x0020_Email ||
                    item.Email || item.MailID || item.Mail_x0020_ID ||
                    item.OfficialEmail || item.Official_x0020_Email;

                if (!assetEmail) return false;

                // Normalize both emails for comparison (trim, case-insensitive)
                const normalizedAssetEmail = assetEmail.toString().trim().toLowerCase();
                const normalizedSearchEmail = employeeEmail.toString().trim().toLowerCase();

                console.log(`SP Service: Comparing asset email "${normalizedAssetEmail}" with search "${normalizedSearchEmail}"`);

                return normalizedAssetEmail === normalizedSearchEmail;
            });

            console.log(`SP Service: Found ${filtered.length} assets for employee ${employeeEmail}`);
            if (filtered.length > 0) {
                console.log("SP Service: Matched assets:", filtered);
            }

            return filtered.map((item: SPAssetItem) => ({
                id: item.Id.toString(),
                employeeName: item.Title || item.EmployeeName || item.Employee_x0020_Name || '',
                employeeId: item.EmployeeId || item.EmployeeID || item.Employee_x0020_ID || item.EmpId || '',
                assetType: item.AssetType || item.Type || item.Asset_x0020_Type || item.Category || 'N/A',
                manufacturer: item.Manufacturer || item.Brand || item.Make || '',
                model: item.Model || item.ModelNumber || '',
                serialNumber: item.SerialNumber || item.Serial || item.SerialNo || item.SN || '',
                purchaseDate: item.PurchaseDate || item.DatePurchased || item.Purchase_x0020_Date || '',
                status: item.Status || item.AssetStatus || 'Active',
                assignedDate: item.AssignedDate || item.DateAssigned || item.Assigned_x0020_Date || '',
                processor: item.Processor || item.CPU || item.Processer || '',
                ram: item.RAM || item.Memory || item.Ram || '',
                hdd: item.HDD || item.Storage || item.Hard_x0020_Disk || item.Hdd || ''
            }));
        } catch (e) {
            console.error("SP Service: Failed to fetch employee assets", e);
            return [];
        }
    }

    // Generic field discovery for robust list mapping
    private static async getListFieldMappings(siteUrl: string, listName: string, keys: Record<string, RegExp>): Promise<Record<string, string>> {
        try {
            const token = await getAccessToken();
            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/fields?$select=InternalName,Title`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) return {};

            const data = await response.json();
            const fields = data.d.results || [];

            const result: Record<string, string> = {};

            for (const [key, regex] of Object.entries(keys)) {
                const match = fields.find((f: { Title: string; InternalName: string }) =>
                    regex.test(f.Title) || regex.test(f.InternalName)
                );
                result[key] = match ? match.InternalName : key;
            }
            return result;
        } catch (e) {
            console.error("Discovery error", e);
            return {};
        }
    }

    // Get All Leave Balances
    static async getAllLeaveBalances(): Promise<LeaveBalance[]> {
        console.log("SP Service: Fetching all leave balances with discovery");
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmpLeaveBalance";

            // Discover internal names first
            const fieldMappings = await this.getListFieldMappings(siteUrl, listName, {
                clKey: /^CL$|^Casual/i,
                elKey: /^EL$|^Earned/i,
                balKey: /Balance/i,
                lopKey: /LOP|Loss/i,
                empKey: /Emp|Name|Title/i
            });

            const { clKey, elKey, balKey, lopKey, empKey } = fieldMappings;

            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error(`SharePoint Leave Balance Error: ${response.status}`);
            }

            const data = await response.json();
            const items = data.d.results;

            return items.map((item: SPLeaveBalanceItem) => {
                const getVal = (key: string) => {
                    const val = item[key];
                    if (val === null || val === undefined) return 0;
                    const parsed = parseFloat(val.toString());
                    return isNaN(parsed) ? 0 : parsed;
                };

                return {
                    id: item.Id.toString(),
                    empName: item[empKey] || item.Title || 'N/A',
                    cl: getVal(clKey),
                    el: getVal(elKey),
                    balance: getVal(balKey),
                    lop: getVal(lopKey)
                };
            });
        } catch (e) {
            console.error("SP Service: Failed to fetch leave balances", e);
            return [];
        }
    }

    // Update Leave Balance
    static async updateLeaveBalance(id: string, data: Partial<LeaveBalance>): Promise<void> {
        console.log(`SP Service: Updating leave balance for ID ${id}`);
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmpLeaveBalance";

            const fieldMappings = await this.getListFieldMappings(siteUrl, listName, {
                clKey: /^CL$|^Casual/i,
                elKey: /^EL$|^Earned/i,
                balKey: /Balance/i,
                lopKey: /LOP|Loss/i
            });

            const { clKey, elKey, balKey, lopKey } = fieldMappings;

            // Map UI fields back to SharePoint internal names
            const payload: Record<string, unknown> = {
                "__metadata": { "type": "SP.Data.EmpLeaveBalanceListItem" }
            };

            if (data.cl !== undefined) payload[clKey] = data.cl.toString();
            if (data.el !== undefined) payload[elKey] = data.el.toString();
            if (data.balance !== undefined) payload[balKey] = data.balance.toString();
            if (data.lop !== undefined) payload[lopKey] = data.lop.toString();

            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items(${id})`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-RequestDigest": digest,
                        "Content-Type": "application/json;odata=verbose",
                        "Accept": "application/json;odata=verbose",
                        "IF-MATCH": "*",
                        "X-HTTP-Method": "MERGE"
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Update Leave Balance Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to update leave balance", e);
            throw e;
        }
    }

    // Delete Leave Balance Record
    static async deleteLeaveBalance(id: string): Promise<void> {
        console.log(`SP Service: Deleting leave balance record ${id}`);
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "EmpLeaveBalance";

            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items(${id})`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-RequestDigest": digest,
                        "IF-MATCH": "*",
                        "X-HTTP-Method": "DELETE"
                    }
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Delete Leave Balance Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to delete leave balance", e);
            throw e;
        }
    }

    // Get Specific Employee Leave Balance
    static async getEmployeeLeaveBalance(employeeName: string): Promise<LeaveBalance | null> {
        console.log(`SP Service: Fetching leave balance for "${employeeName}"`);
        try {
            const allBalances = await this.getAllLeaveBalances();
            if (!allBalances || allBalances.length === 0) return null;

            const normalizedSearch = employeeName.toLowerCase().replace(/\s+/g, ' ').trim();
            const searchParts = normalizedSearch.split(' ').filter(p => p.length > 1);

            // 1. Exact match (case insensitive, space normalized)
            const exactMatch = allBalances.find(b =>
                b.empName.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedSearch
            );
            if (exactMatch) {
                console.log(`SP Service: Found exact match for ${employeeName}`);
                return exactMatch;
            }

            // 2. Partial match (if search name is contained in record name or vice versa)
            const partialMatch = allBalances.find(b => {
                const recordName = b.empName.toLowerCase().replace(/\s+/g, ' ').trim();
                return recordName.includes(normalizedSearch) || normalizedSearch.includes(recordName);
            });
            if (partialMatch) {
                console.log(`SP Service: Found partial match for ${employeeName}: ${partialMatch.empName}`);
                return partialMatch;
            }

            // 3. Word-based match (if all words in search name are in record name)
            if (searchParts.length > 0) {
                const wordMatch = allBalances.find(b => {
                    const recordName = b.empName.toLowerCase();
                    return searchParts.every(part => recordName.includes(part));
                });
                if (wordMatch) {
                    console.log(`SP Service: Found word-based match for ${employeeName}: ${wordMatch.empName}`);
                    return wordMatch;
                }
            }

            console.warn(`SP Service: No leave balance record found for "${employeeName}"`);
            return null;
        } catch (e) {
            console.error("SP Service: Failed to get employee leave balance", e);
            return null;
        }
    }

    // Get All Leave Requests for Reports
    static async getAllLeaveRequests(startDate?: string, endDate?: string): Promise<LeaveRequest[]> {
        console.log(`SP Service: Fetching leave requests from ${startDate || 'beginning'} to ${endDate || 'end'}`);
        try {
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "Leave Request";
            const fieldMappings = await this.getListFieldMappings(siteUrl, listName, {
                employeeName: /^(?!.*Editor)(?!.*Author)(?!.*Link)(?!.*Type)Title$|^Action$|^Emp/i,
                submittedOn: /^Created$|^Applied/i,
                fromDate: /^EventDate$|^(?!.*_)(?!.*Table)(?!.*Menu)(From|Start|Begin).*Date$|^From$/i, // Explicitly match EventDate
                toDate: /^EndDate$|^(?!.*_)(?!.*Table)(?!.*Menu)(To|End).*Date$|^To$/i,               // Explicitly match EndDate
                leaveDuration: /^Leave.*Duration$|^Duration$|^Days$/i,
                leaveType: /^Leave.*Type$|^Type$/i,
                reason: /^Reason|^Remarks|^Details/i,
                status: /^Status$|^State$/i,
                manager: /^Manager$|^Approver$/i
            });

            console.log("SP Service: Leave Request Field Mappings discovered:", fieldMappings);

            const token = await getAccessToken();







            // SHOTGUN STRATEGY: Try multiple column combinations until one works.
            // This bypasses the 400 Bad Request error caused by a single invalid column name.

            const strategies = [
                // 0. USER CONFIRMED STRATEGY (Highest Priority)
                { name: "UserConfirmed", fields: ["From", "To", "Leave", "LeaveType", "Detail", "Status", "Manager/Title", "Manager/EMail", "ApprovalComments"] },

                // 1. Prioritize Refined Strategies that include ALL metadata
                { name: "Refined_1", fields: ["From", "To", "LeaveType", "Status", "Manager/Title", "Manager/EMail", "Reason"] },
                { name: "Refined_2", fields: ["From", "To", "Type", "Status", "Manager/Title", "Manager/EMail", "Reason"] },
                { name: "Refined_3", fields: ["From", "To", "LeaveCategory", "Status", "Manager/Title", "Manager/EMail", "Description"] },

                // 2. Standard (Original)
                { name: "Standard", fields: ["From", "To", "Leave_x0020_Type", "Status", "Manager/Title", "Manager/EMail", "Detail", "Leave"] },

                // 3. Backups
                { name: "Legacy", fields: ["StartDate", "EndDate", "LeaveType", "Status", "Manager/Title", "Manager/EMail", "Reason"] },
                { name: "Strict", fields: ["From", "To", "Leave_x0020_Type", "Status", "Manager/Title", "Manager/EMail", "Detail"] },
                { name: "Simple", fields: ["FromDate", "ToDate", "Type", "Status", "Manager/EMail"] },
                { name: "Minimal", fields: ["From", "To"] }
            ];

            const baseFields = "Id,ID,Created,Title,Author/Title,AuthorId";
            const expand = "Author,Manager";

            for (const strat of strategies) {
                try {
                    console.log(`SP Service: Trying strategy '${strat.name}'...`);
                    const query = strat.fields.join(',');
                    const attemptUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$select=${baseFields},${query}&$expand=${expand}&$top=5000`;

                    const response = await fetch(attemptUrl, {
                        headers: { "Accept": "application/json; odata=verbose", "Authorization": `Bearer ${token}` }
                    });

                    if (response.ok) {
                        console.log(`SP Service: Strategy '${strat.name}' SUCCEEDED!`);
                        const data = (await response.json()) as SPResult<SPLeaveRequestItem>;
                        return this.mapLeaveRequestsV2(data.d.results);
                    } else {
                        console.warn(`SP Service: Strategy '${strat.name}' failed: ${response.status}`);
                    }
                } catch (e) {
                    console.warn(`SP Service: Strategy '${strat.name}' threw error`, e);
                }
            }

            // FINAL FALLBACK: If all specific strategies fail, fetch ONLY visible/safe fields to avoid empty screen
            console.error("SP Service: All explicit strategies failed. Falling back to Safe Mode.");
            const safeUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$select=${baseFields}&$expand=${expand}&$top=5000`;
            const safeRes = await fetch(safeUrl, {
                headers: { "Accept": "application/json; odata=verbose", "Authorization": `Bearer ${token}` }
            });
            const safeData = (await safeRes.json()) as SPResult<SPLeaveRequestItem>;
            return this.mapLeaveRequestsV2(safeData.d.results);

        } catch (e) {
            console.error("SP Service: Critical Failure in getAllLeaveRequests", e);
            throw e;
        }
    }

    // ========================================
    // PERMISSION REQUESTS
    // ========================================

    static async getAllPermissionRequests(): Promise<PermissionRequest[]> {
        const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
        const listName = "Permission";

        try {
            const token = await getAccessToken();

            // SHOTGUN STRATEGY: Try multiple column combinations
            const strategies = [
                // Corrected strategy based on browser diagnostics
                { name: "Corrected", fields: ["Date", "Hours", "Detail", "Status", "Manager/Title", "Manager/EMail"] },

                // Backup strategies
                { name: "WithManager", fields: ["Date", "Hours", "Detail", "Status", "Manager/Title", "Manager/EMail"] },
                { name: "Minimal", fields: ["Date", "Hours"] }
            ];

            const baseFields = "Id,ID,Created,Title,Author/Title,AuthorId";
            const expand = "Author,Manager";

            for (const strat of strategies) {
                try {
                    console.log(`SP Service (Permission): Trying strategy '${strat.name}'...`);
                    const query = strat.fields.join(',');
                    const attemptUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$select=${baseFields},${query}&$expand=${expand}&$top=5000`;

                    const response = await fetch(attemptUrl, {
                        headers: { "Accept": "application/json; odata=verbose", "Authorization": `Bearer ${token}` }
                    });

                    if (response.ok) {
                        console.log(`SP Service (Permission): Strategy '${strat.name}' SUCCEEDED!`);
                        const data = await response.json();
                        return this.mapPermissionRequests(data.d.results);
                    } else {
                        console.warn(`SP Service (Permission): Strategy '${strat.name}' failed: ${response.status}`);
                    }
                } catch (e) {
                    console.warn(`SP Service (Permission): Strategy '${strat.name}' threw error`, e);
                }
            }

            // FINAL FALLBACK
            console.error("SP Service (Permission): All strategies failed. Falling back to Safe Mode.");
            const safeUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$select=${baseFields}&$expand=${expand}&$top=5000`;
            const safeRes = await fetch(safeUrl, {
                headers: { "Accept": "application/json; odata=verbose", "Authorization": `Bearer ${token}` }
            });
            const safeData = await safeRes.json();
            return this.mapPermissionRequests(safeData.d.results);

        } catch (e) {
            console.error("SP Service (Permission): Critical Failure", e);
            throw e;
        }
    }

    private static mapPermissionRequests(items: SPPermissionItem[]): PermissionRequest[] {
        return items.map((item, index) => {
            // Normalize hours field (remove "Hrs" suffix if present)
            const normalizeHours = (hours: string | number | undefined) => {
                if (!hours) return 'N/A';
                const str = String(hours);
                return str.replace(/hrs?/i, '').trim();
            };

            // Extract employee name from Title field (SharePoint's internal name for employee name)
            const employeeName = item.Title || item.Author?.Title || 'N/A';

            // Extract manager name/email
            const manager = item.Manager?.EMail || item.Manager?.Title || item.ApproverComments || 'N/A';

            // Normalize date
            const normalizeDate = (dateStr: string | undefined) => {
                if (!dateStr) return 'N/A';
                try {
                    const d = new Date(dateStr);
                    return d.toISOString().split('T')[0]; // YYYY-MM-DD
                } catch {
                    return String(dateStr);
                }
            };

            return {
                id: (item.ID || item.Id || index).toString(),
                employeeName,
                permissionType: 'Permission',
                submittedOn: normalizeDate(item.Created),
                date: normalizeDate(item.Date),
                hours: normalizeHours(item.Hours),
                reason: item.Detail || item.Reason || 'N/A',
                status: item.Status || 'N/A',
                manager,
                approvalComments: item.ApproverComments || '',
                created: item.Created
            };
        });
    }


    // DEBUG: Fetch a single raw item to inspect schema
    static async getRawDebugItem(): Promise<Record<string, unknown>> {
        const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
        const listName = "Leave Request";
        let url = "";
        try {
            const token = await getAccessToken();
            // Fetch 1 item, NO select (get all fields), Simple query
            url = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$top=1`;

            const response = await fetch(url, {
                headers: { "Accept": "application/json; odata=verbose", "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) {
                const text = await response.text();
                return {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    errorDetails: text
                };
            }

            const data = await response.json();
            return data.d.results[0] || { message: "Success but No Items Found in List" };
        } catch (e: unknown) {
            console.error("Debug Fetch Failed", e);
            const error = e as Error;
            return {
                conversionError: "JS Exception",
                message: error.message,
                stack: error.stack,
                urlAttempted: url
            };
        }
    }

    // DEBUG: Multi-List Probe (Added to bypass replacement error)
    static async getRawDebugItemMulti(): Promise<Record<string, unknown>> {
        const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
        // Try multiple variations
        const listNames = ["Leave Request", "LeaveRequest", "LeaveRequests", "Leave Requests", "Leaves"];
        const logs: string[] = [];

        try {
            const token = await getAccessToken();

            for (const name of listNames) {
                const url = `${siteUrl}/_api/web/lists/getbytitle('${name}')/items?$top=1`;
                logs.push(`Trying list: '${name}'...`);

                try {
                    const response = await fetch(url, {
                        headers: { "Accept": "application/json; odata=verbose", "Authorization": `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return {
                            success: true,
                            usedListName: name,
                            logs: logs,
                            data: data.d.results[0] || "List found, but empty."
                        };
                    } else {
                        logs.push(`Failed '${name}': ${response.status} ${response.statusText}`);
                    }
                } catch (inner) {
                    logs.push(`Error '${name}': ${inner}`);
                }
            }
            return { success: false, message: "All list name variations failed.", logs: logs };
        } catch (e: unknown) {
            const error = e as Error;
            return { conversionError: "JS Exception", message: error.message, logs: logs };
        }
    }

    /* LEGACY - Replaced by mapLeaveRequestsV2
    private static mapLeaveRequests(items: any[], _fieldMappings: any): LeaveRequest[] {
        const requests: LeaveRequest[] = items.map((item: any) => {

            const normalizeDate = (dateStr: string) => {
                if (!dateStr || dateStr === 'N/A') return 'N/A';
                if (dateStr.includes('-')) return dateStr.split('T')[0];
                const parts = dateStr.split('/');
                if (parts.length === 3 && parts[2].length === 4) {
                    const p0 = parseInt(parts[0]);
                    const p1 = parseInt(parts[1]);

                    let day, month;
                    // Detect format:
                    if (p0 > 12) {
                        // First part > 12, MUST be DD/MM/YYYY (e.g. 30/11)
                        day = parts[0]; month = parts[1];
                    } else if (p1 > 12) {
                        // Second part > 12, MUST be MM/DD/YYYY (e.g. 11/30)
                        month = parts[0]; day = parts[1];
                    } else {
                        // Ambiguous (e.g. 05/01). Prefer DD/MM/YYYY for International/India
                        day = parts[0]; month = parts[1];
                    }

                    return `${parts[2]}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // YYYY-MM-DD
                }
                return dateStr;
            };

            const getVal = (keys: string[]) => {
                for (const k of keys) {
                    const val = item[k];
                    if (val && val !== 'N/A') return val;
                }
                return 'N/A';
            };

            const getManager = () => { const m = item.Manager; if (m && m.Title) return m.Title; if (typeof m === 'string') return m; return 'N/A'; };

            let empName = item.Title || item.Author?.Title || (item.AuthorId ? `Employee #${item.AuthorId}` : 'N/A');

            // Apply normalization
            const fromDate = normalizeDate(getVal(['From', 'OData_From', 'StartDate', 'EventDate', 'Start']));
            const toDate = normalizeDate(getVal(['To', 'OData_To', 'EndDate', 'End']));

            // DEBUG PROBE: If ANY critical field is missing, append available keys to name
            const isMissingData = fromDate === 'N/A' || getVal(['LeaveType', 'Leave_x0020_Type', 'Type']) === 'N/A' || getVal(['Status', 'State']) === 'N/A';

            if (isMissingData && item.FieldValuesAsText) {
                const ignore = ['__metadata', 'ID', 'Title', 'Created', 'Author', 'Modified', 'Editor', 'ItemChildCount', 'FolderChildCount', 'ComplianceAssetId', 'OData__UIVersionString', 'AppAuthor', 'OData__ColorTag'];
                // Get all keys, sorted
                const keys = Object.keys(item.FieldValuesAsText)
                    .filter(k => !ignore.includes(k) && !k.startsWith('OData__'))
                    .sort();

                // Also get direct item keys that usually contain data
                const itemKeys = Object.keys(item).filter(k => !ignore.includes(k) && !k.startsWith('OData_') && typeof item[k] !== 'object' && item[k] !== null).sort();

                empName += ` [MISSING FIELDS. Keys found: ${keys.concat(itemKeys).join(', ')}]`;
            }

            return {
                id: item.Id || item.ID,
                employeeName: empName,
                submittedOn: item.Created || 'N/A',
                fromDate: fromDate,
                toDate: toDate,
                leaveDuration: getVal(['Leave', 'LeaveDuration', 'Duration', 'Days']),
                leaveType: getVal(['LeaveType', 'Leave_x0020_Type', 'Type', 'Category']),
                reason: getVal(['Detail', 'Reason', 'Description']),
                status: getVal(['Status', 'State', 'ApprovalStatus']),
                manager: getManager()
            };
        });
        return requests;
    }
    */

    // NEW MAPPER: Prioritizing User-Confirmed Fields
    private static mapLeaveRequestsV2(items: SPLeaveRequestItem[]): LeaveRequest[] {
        const requests: LeaveRequest[] = items.map((item: SPLeaveRequestItem) => {

            const normalizeDate = (dateStr: string | undefined) => {
                if (!dateStr || dateStr === 'N/A') return 'N/A';
                // Handle ISO strings (e.g., 2025-12-27T05:00:00Z)
                if (dateStr.includes('T')) {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        const d = date.getDate().toString().padStart(2, '0');
                        const m = (date.getMonth() + 1).toString().padStart(2, '0');
                        const y = date.getFullYear();
                        return `${d}/${m}/${y}`;
                    }
                }
                if (dateStr.includes('-')) {
                    // YYYY-MM-DD
                    const parts = dateStr.split('T')[0].split('-');
                    if (parts.length === 3) {
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                }
                const parts = dateStr.split('/');
                if (parts.length === 3 && parts[2].length === 4) {
                    return dateStr; // Already in DD/MM/YYYY or MM/DD/YYYY
                }
                return dateStr;
            };

            const getVal = (keys: (keyof SPLeaveRequestItem)[]) => {
                for (const k of keys) {
                    const val = item[k];
                    if (val && val !== 'N/A' && typeof val === 'string') return val;
                }
                return 'N/A';
            };

            const getManager = () => {
                // Check both PascalCase and lowercase
                const m = item.Manager || item.manager;
                if (m && m.EMail) return m.EMail; // Returning Email for stricter matching
                if (m && m.Title) return m.Title;
                if (typeof m === 'string') return m;
                return 'N/A';
            };

            let empName = item.Title || item.Author?.Title || (item.AuthorId ? `Employee #${item.AuthorId}` : 'N/A');

            // Apply normalization
            const fromDate = normalizeDate(getVal(['From', 'StartDate', 'EventDate', 'Start']));
            const toDate = normalizeDate(getVal(['To', 'EndDate', 'End']));

            // DEBUG PROBE: Check V2 specific fields also
            const isMissingData = fromDate === 'N/A' ||
                getVal(['LeaveType', 'Type']) === 'N/A' ||
                getVal(['Status', 'status', 'State']) === 'N/A';

            if (isMissingData && item.FieldValuesAsText) {
                const ignore = ['__metadata', 'ID', 'Title', 'Created', 'Author', 'Modified', 'Editor', 'ItemChildCount', 'FolderChildCount', 'ComplianceAssetId', 'OData__UIVersionString', 'AppAuthor', 'OData__ColorTag'];
                const keys = Object.keys(item.FieldValuesAsText).filter(k => !ignore.includes(k) && !k.startsWith('OData__')).sort();
                const itemKeys = Object.keys(item).filter(k => !ignore.includes(k) && !k.startsWith('OData_') && typeof item[k as keyof SPLeaveRequestItem] !== 'object' && item[k as keyof SPLeaveRequestItem] !== null).sort();
                empName += ` [MISSING FIELDS. Keys found: ${keys.concat(itemKeys).join(', ')}]`;
            }

            return {
                id: (item.Id || item.ID || 0).toString(),
                employeeName: empName,
                submittedOn: item.Created || 'N/A',
                fromDate: fromDate,
                toDate: toDate,
                leaveDuration: getVal(['Leave', 'LeaveDuration', 'Duration']), // Confirmed
                leaveType: getVal(['LeaveType', 'Type']), // Confirmed
                reason: getVal(['Detail', 'Reason']), // Confirmed
                status: getVal(['status', 'Status', 'State']), // Confirmed lowercase
                manager: getManager() // Confirmed lowercase
            };
        });
        return requests;
    }

    /*
    private static oldMapRequests(items: any[], fieldMappings: any): LeaveRequest[] {
        const requests: LeaveRequest[] = items.map((item: any) => {
             // Helper to get string from potentially expanded field
            const getExpandedStr = (item: any, fieldName: string) => {
                const value = item[fieldName];
                if (value && typeof value === 'object' && value.Title) return value.Title;
                if (typeof value === 'string') return value;
                return 'N/A';
            };
    
            // Helper to try getting value from FieldValuesAsText if main field fails
            const getVal = (primaryKey: string, partialMatches: string[] = []) => {
                // 1. Try mapped field
                const primary = item[primaryKey];
                if (primary && primary !== 'N/A') return primary;
    
                // 2. Try Standard System mappings
                if (primaryKey === fieldMappings.fromDate && (item.EventDate || item.StartDate)) return item.EventDate || item.StartDate;
                if (primaryKey === fieldMappings.toDate && (item.EndDate)) return item.EndDate;
    
                // 3. Try FieldValuesAsText (The "Text Value" of the column)
                if (item.FieldValuesAsText) {
                    const fv = item.FieldValuesAsText;
                    // Try exact match on mapped key (sometimes mapping is correct but value is in FV)
                    if (fv[primaryKey]) return fv[primaryKey];
    
                    // Try heuristic matches
                    for (const match of partialMatches) {
                        const key = Object.keys(fv).find(k => k.toLowerCase().includes(match.toLowerCase()));
                        if (key && fv[key]) return fv[key];
                    }
                }
                return 'N/A';
            };
    
            return {
                id: item.Id || item.ID,
                employeeName: item.Author?.Title || getExpandedStr(item, fieldMappings.employeeName) || (item.AuthorId ? `Employee #${item.AuthorId}` : 'N/A'),
                submittedOn: item[fieldMappings.submittedOn] || item.Created || 'N/A',
                // Aggressively look for dates in FieldValuesAsText using "From", "Start", "To", "End"
                fromDate: getVal(fieldMappings.fromDate, ['From', 'Start', 'Begin']),
                toDate: getVal(fieldMappings.toDate, ['To', 'End']),
    
                // Use getVal for others to leverage FieldValuesAsText if standard mapping fails
                leaveDuration: getVal(fieldMappings.leaveDuration, ['Duration', 'Days']),
                leaveType: getVal(fieldMappings.leaveType, ['Type', 'Category']),
                reason: getVal(fieldMappings.reason, ['Reason', 'Detail', 'Comment']),
                status: getVal(fieldMappings.status, ['Status', 'State']),
    
                // Manager might be "Manager" or "Approver"
                manager: getVal(fieldMappings.manager, ['Manager', 'Approver'])
            };
        });
    
        return requests;
        } */

    // Diagnostic Method to help user identify list/field issues
    static async runDiagnostics(): Promise<{ logs: string[] }> {
        console.log("SP Service: Running Diagnostics...");
        const log = [] as string[];
        const addLog = (msg: string) => log.push(msg);

        try {
            const token = await getAccessToken();
            // Correct Target: EmployeesDOB Site
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";
            addLog(`Target Site: ${siteUrl}`);

            // 1. Check 'Notifications' List (Crucial for Wishes)
            const notifyList = "Notifications";
            addLog(`\nChecking for List: '${notifyList}'...`);

            const nRes = await fetch(`${siteUrl} /_api/web / lists / getByTitle('${notifyList}')`, {
                headers: { "Authorization": `Bearer ${token} `, "Accept": "application/json;odata=verbose" }
            });

            if (nRes.ok) {
                addLog("✅ NOTIFICATIONS LIST FOUND!");
                const nFields = await fetch(`${siteUrl} /_api/web / lists / getByTitle('${notifyList}') / fields ? $select = Title, InternalName, Hidden & $filter=Hidden eq false`, {
                    headers: { "Authorization": `Bearer ${token} `, "Accept": "application/json;odata=verbose" }
                });
                if (nFields.ok) {
                    const data = await nFields.json();
                    addLog("--- NOTIFICATIONS FIELDS ---");
                    data.d.results.forEach((f: { Title: string; InternalName: string }) => addLog(`[${f.Title}]-> ${f.InternalName} `));
                }
            } else {
                addLog(`❌ Notifications list NOT FOUND.Status: ${nRes.status} `);
            }

            // 2. Check 'Employees' List (To fix Directory crash)
            const empList = "Employees";
            addLog(`\nChecking for List: '${empList}'...`);

            const eRes = await fetch(`${siteUrl} /_api/web / lists / getByTitle('${empList}')`, {
                headers: { "Authorization": `Bearer ${token} `, "Accept": "application/json;odata=verbose" }
            });

            if (eRes.ok) {
                addLog("✅ EMPLOYEES LIST FOUND!");
                // Fetch one item to see REAL internal names
                const eItems = await fetch(`${siteUrl} /_api/web / lists / getByTitle('${empList}') / items ? $top = 1`, {
                    headers: { "Authorization": `Bearer ${token} `, "Accept": "application/json;odata=verbose" }
                });

                if (eItems.ok) {
                    const data = await eItems.json();
                    if (data.d.results.length > 0) {
                        const item = data.d.results[0];
                        addLog("\n--- REAL EMPLOYEE FIELD NAMES ---");
                        Object.keys(item).forEach(key => {
                            if (!key.startsWith('odata_') && !key.startsWith('__')) {
                                addLog(`${key}: ${JSON.stringify(item[key]).substring(0, 30)} `);
                            }
                        });
                    } else {
                        addLog("⚠️ Employees list is empty. Cannot verify fields.");
                    }
                }
            } else {
                addLog(`❌ Employees list NOT FOUND.Status: ${eRes.status} `);
            }

        } catch (e: unknown) {
            const err = e instanceof Error ? e.message : String(e);
            addLog(`CRITICAL ERROR: ${err} `);
        }

        return { logs: log };
    }

    // ==================== PERMISSION MANAGEMENT ====================

    // Get Permission Requests for a user
    static async getPermissionRequests(email: string): Promise<PermissionRequest[]> {
        console.log(`SP Service: Fetching permission requests for ${email}`);
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "Permission";

            // Get employee name from email to filter permissions
            const employeeData = await this.getEmployeeByEmail(email);
            if (!employeeData) {
                console.warn("SP Service: Employee not found for email", email);
                return [];
            }

            // Fetch permission requests filtered by employee name with Manager field expanded
            // Note: SharePoint requires $select when using $expand on Person/Group fields
            const filterQuery = `Title eq '${employeeData.name.replace(/'/g, "''")}'`;
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')/items?$select=*,Manager/Title&$expand=Manager&$filter=${filterQuery}&$orderby=Created desc&$top=500`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                console.warn("SP Service: Failed to fetch permission requests", response.status);
                return [];
            }

            const data = await response.json();
            const items = data.d.results;

            if (!items || items.length === 0) return [];

            // Map SharePoint fields to application interface
            // Note: SharePoint uses Title (employee name), Date, Hours, Detail, Status, Manager
            return items.map((item: SPPermissionItem) => ({
                id: item.Id.toString(),
                employeeName: item.Title || '',
                permissionType: 'Permission', // Not stored in SharePoint, derived from hours
                date: item.Date || '',
                timeFrom: '', // Not used in new design
                timeTo: '', // Not used in new design
                hours: item.Hours || '',
                status: item.Status || 'Pending',
                manager: item.Manager ? item.Manager.Title : '',
                reason: item.Detail || '',
                approvalComments: item.ApproverComments || '',
                created: item.Created
            } as PermissionRequest));
        } catch (e) {
            console.error("SP Service: Failed to fetch permission requests", e);
            return [];
        }
    }

    // Create new Permission Request
    static async createPermissionRequest(data: {
        employeeEmail: string;
        employeeName: string;
        permissionType: string;
        date: string;
        hours: string;
        reason: string;
    }): Promise<void> {
        console.log("SP Service: Creating permission request");
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listName = "Permission";

            // Get entity type
            const listResponse = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${listName}')?$select=ListItemEntityTypeFullName`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            let entityType = "SP.Data.PermissionListItem";
            if (listResponse.ok) {
                const listData = await listResponse.json();
                entityType = listData.d.ListItemEntityTypeFullName;
            }

            // Map to SharePoint column names
            // Note: SharePoint uses Title (not EmpName), Date, Hours, Detail
            const payload = {
                "__metadata": { "type": entityType },
                "Title": data.employeeName, // SharePoint's standard Title field
                "Date": data.date, // Permission date
                "Hours": data.hours, // Duration as text
                "Detail": data.reason, // Reason for permission
                "Status": "Pending Manager Approval"
            };

            const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/items`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Submit Permission Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to create permission request", e);
            throw e;
        }
    }

    static async createAttendanceRecord(data: AttendanceRecord & { name: string; email: string }): Promise<void> {
        try {
            const token = await getAccessToken();
            // Using EmployeesDOB site as requested
            const listUri = `https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items`;

            // Calculate WorkingHours based on check-in and checkout times
            // If both are 00:00 or 12:00 AM (manual entry for Holiday/Leave/Absent), set to 00:00
            let workingHours = "09:00"; // Default
            const checkIn = data.checkInTime || "09:00";
            const checkOut = data.checkOutTime || "18:00";

            // Check if both times are 00:00 or 12:00 AM (midnight)
            if ((checkIn === "00:00" && checkOut === "00:00") ||
                (checkIn === "12:00 AM" && checkOut === "12:00 AM")) {
                workingHours = "00:00";
            }

            const payload = {
                __metadata: { type: "SP.Data.AttendanceListItem" },
                Title: data.name,           // Staff Name mapped to Title
                StaffMail: data.email,      // Staff Mail mapped to StaffMail
                EmployeeId: data.employeeId,// EmployeeId mapped to EmployeeId (String)
                Date: data.date.split('-').reverse().join('/'), // Convert YYYY-MM-DD to DD/MM/YYYY
                Place: data.place,          // Place mapped to Place
                ShiftId: data.shiftId,      // ShiftId mapped to ShiftId
                Status: data.status || "Absent", // Use provided status or default
                WorkingHours: workingHours, // Calculated based on times
                CheckInTime: checkIn,       // User input or Default
                CheckOutTime: checkOut      // User input or Default
            };

            const response = await fetch(listUri, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose",
                    "Content-Type": "application/json;odata=verbose"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to create attendance record: ${response.status} - ${text}`);
            }
        } catch (error) {
            console.error("SP Service: Failed to create attendance record", error);
            throw error;
        }
    }

    static async deleteAttendanceRecord(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "DELETE"
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Delete Attendance Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to delete attendance record", e);
            throw e;
        }
    }

    static async updateAttendanceRecord(id: string, updates: Partial<SPAttendanceItem>): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);

            // Dynamic Entity Type Fetch
            const listResponse = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')?$select=ListItemEntityTypeFullName`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            let entityType = "SP.Data.AttendanceListItem";
            if (listResponse.ok) {
                const listData = await listResponse.json();
                entityType = listData.d.ListItemEntityTypeFullName;
            }

            // Special handling: If both CheckInTime and CheckOutTime are 00:00 or 12:00 AM (manual entry for Holiday/Leave/Absent),
            // automatically set WorkingHours to 00:00
            if ((updates.CheckInTime === '00:00' || updates.CheckInTime === '12:00 AM') &&
                (updates.CheckOutTime === '00:00' || updates.CheckOutTime === '12:00 AM')) {
                updates.WorkingHours = '00:00';
            }

            const body = {
                "__metadata": { "type": entityType },
                ...updates
            } as Record<string, unknown>;

            const response = await fetch(`https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('${this.ATTENDANCE_LIST}')/items(${id})`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Update Attendance Failed: ${response.status} - ${text}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to update attendance record", e);
            throw e;
        }
    }

    // Get Employee Birthdays and Anniversaries
    static async getUpcomingEvents(): Promise<EmployeeEvent[]> {
        console.log("SP Service: Fetching Birthdays and Anniversaries");
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";

            // Select Title (Name), Raghunatahn (DOB), WorkAnniversary, MailID
            const select = "Id,Title,Raghunatahn,WorkAnniversary,MailID,Personalid";
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${this.DOB_ANNIVERSARY_LIST}')/items?$select=${select}&$top=5000`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                console.warn("SP Service: Failed to fetch events", response.status);
                return [];
            }

            const data = await response.json();
            const items = data.d.results;

            const events: EmployeeEvent[] = [];
            const now = new Date();
            const currentMonth = now.getMonth();

            items.forEach((item: { Title: string; Raghunatahn?: string; WorkAnniversary?: string; MailID?: string; Personalid?: string; Id: number }) => {
                const name = item.Title;
                const dobVal = item.Raghunatahn;
                const annivVal = item.WorkAnniversary;
                const mailId = item.MailID;

                if (dobVal) {
                    const dob = new Date(dobVal);
                    if (!isNaN(dob.getTime()) && dob.getMonth() === currentMonth) {
                        events.push({
                            id: `${item.Id}-dob`,
                            employeeName: name,
                            type: 'Birthday',
                            date: dob,
                            mailId: mailId
                        });
                    }
                }

                if (annivVal) {
                    const anniv = new Date(annivVal);
                    if (!isNaN(anniv.getTime()) && anniv.getMonth() === currentMonth) {
                        events.push({
                            id: `${item.Id}-anniv`,
                            employeeName: name,
                            type: 'Anniversary',
                            date: anniv,
                            mailId: mailId
                        });
                    }
                }
            });

            // Sort by day of month
            return events.sort((a, b) => a.date.getDate() - b.date.getDate());

        } catch (e) {
            console.error("SP Service: Failed to fetch upcoming events", e);
            return [];
        }
    }

    static async getAllEmployeeEventRecords(): Promise<EmployeeEventRecord[]> {
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";

            const select = "Id,Title,Raghunatahn,WorkAnniversary,MailID,Personalid";
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${this.DOB_ANNIVERSARY_LIST}')/items?$select=${select}&$top=5000`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json;odata=verbose"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch event records: ${response.status}`);
            }

            const data = await response.json();
            const items = data.d.results;

            return items.map((item: { Id: number; Title: string; Raghunatahn?: string; WorkAnniversary?: string; MailID?: string; Personalid?: string }) => ({
                id: item.Id.toString(),
                name: item.Title,
                dob: item.Raghunatahn || '',
                workAnniversary: item.WorkAnniversary || '',
                email: item.MailID || '',
                personalId: item.Personalid || ''
            }));
        } catch (e) {
            console.error("SP Service: Failed to fetch all event records", e);
            throw e;
        }
    }

    static async addEmployeeEventRecord(data: Omit<EmployeeEventRecord, 'id'>): Promise<void> {
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";
            const digest = await this.getFormDigest(token, siteUrl);

            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${this.DOB_ANNIVERSARY_LIST}')/items`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-RequestDigest": digest,
                        "Accept": "application/json;odata=verbose",
                        "Content-Type": "application/json;odata=verbose"
                    },
                    body: JSON.stringify({
                        '__metadata': { 'type': `SP.Data.${this.DOB_ANNIVERSARY_LIST.replace(/\s/g, '_x0020_')}ListItem` },
                        Title: data.name,
                        Raghunatahn: data.dob,
                        WorkAnniversary: data.workAnniversary,
                        MailID: data.email,
                        Personalid: data.personalId
                    })
                }
            );

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to add event record: ${response.status} - ${err}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to add event record", e);
            throw e;
        }
    }

    static async updateEmployeeEventRecord(id: string, data: Partial<EmployeeEventRecord>): Promise<void> {
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token, "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB");
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";

            const payload: EmployeeEventPayload = {
                '__metadata': { 'type': `SP.Data.${this.DOB_ANNIVERSARY_LIST.replace(/\s/g, '_x0020_')}ListItem` }
            };

            if (data.name) payload.Title = data.name;
            if (data.dob !== undefined) payload.Raghunatahn = data.dob;
            if (data.workAnniversary !== undefined) payload.WorkAnniversary = data.workAnniversary;
            if (data.email) payload.MailID = data.email;
            if (data.personalId) payload.Personalid = data.personalId;

            console.log(`SP Service: Updating record ${id}...`, payload);
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${this.DOB_ANNIVERSARY_LIST}')/items(${id})`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-RequestDigest": digest,
                        "Accept": "application/json;odata=verbose",
                        "Content-Type": "application/json;odata=verbose",
                        "X-HTTP-Method": "MERGE",
                        "IF-MATCH": "*"
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to update event record: ${response.status} - ${err}`);
            }
        } catch (e) {
            console.error("SP Service: Failed to update event record", e);
            throw e;
        }
    }

    static async deleteEmployeeEventRecord(id: string): Promise<void> {
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";
            const digest = await this.getFormDigest(token, siteUrl);

            console.log(`SP Service: Deleting record ${id} from ${this.DOB_ANNIVERSARY_LIST} (V2)...`);
            const response = await fetch(
                `${siteUrl}/_api/web/lists/getByTitle('${this.DOB_ANNIVERSARY_LIST}')/items(${id})`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-RequestDigest": digest,
                        "Accept": "application/json;odata=verbose",
                        "X-HTTP-Method": "DELETE",
                        "IF-MATCH": "*"
                    }
                }
            );

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to delete record: ${response.status} - ${err}`);
            }
            console.log("SP Service: Delete successful");
        } catch (e) {
            console.error("SP Service: Failed to delete event record", e);
            throw e;
        }
    }

    /**
     * Submit a check-in regularization request to IntimeRegularize list
     */
    static async submitCheckInRegularization(data: {
        employeeName: string;
        mailID: string;
        date: string;
        manager: string;
        reason?: string;
    }): Promise<void> {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('No access token available');

            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listRelativeUrl = "/sites/JMGroupINC-All/Lists/IntimeRegularize";

            // Get the list entity type for necessary metadata
            const listResponse = await fetch(`${siteUrl}/_api/web/getList('${listRelativeUrl}')?$select=ListItemEntityTypeFullName`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`SharePoint List Error: ${listResponse.status} - ${errorText}`);
            }

            const listData = await listResponse.json();
            const entityType = listData.d.ListItemEntityTypeFullName;

            const payload = {
                '__metadata': { 'type': entityType },
                Title: data.employeeName,
                EmployeeName: data.employeeName,
                MailID: data.mailID,
                Date: data.date,
                Status: 'Pending Manager Approval'
            };

            const response = await fetch(`${siteUrl}/_api/web/getList('${listRelativeUrl}')/items`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose",
                    "Content-Type": "application/json;odata=verbose"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`SharePoint Error: ${response.status} - ${text}`);
            }
        } catch (error) {
            console.error('Error submitting regularization request:', error);
            throw error;
        }
    }

    /**
     * Fetch regularization requests for the current user from IntimeRegularize list
     */
    static async getRegularizationHistory(email: string): Promise<SPRegularizationItem[]> {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('No access token available');

            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listRelativeUrl = "/sites/JMGroupINC-All/Lists/IntimeRegularize";

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfMonthISO = startOfMonth.toISOString();

            const filter = `MailID eq '${encodeURIComponent(email)}' and Created ge datetime'${startOfMonthISO}'`;
            const url = `${siteUrl}/_api/web/getList('${listRelativeUrl}')/items?$filter=${filter}&$orderby=Created desc`;

            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`SharePoint Error: ${response.status} - ${text}`);
            }

            const data = await response.json();
            return data.d.results;
        } catch (error) {
            console.error('Error fetching regularization history:', error);
            throw error;
        }
    }
    /**
     * Fetch pending regularizations for a manager or admin
     */
    /**
     * Fetch pending regularizations for a manager
     */
    static async getPendingRegularizations(email: string, isAdmin: boolean = false): Promise<SPRegularizationItem[]> {
        try {
            const token = await getAccessToken();
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";
            const listRelativeUrl = "/sites/JMGroupINC-All/Lists/IntimeRegularize";

            let filter = "(Status eq 'Pending Manager Approval' or Status eq 'Pending')";

            // Add Current Month filter
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfMonthISO = startOfMonth.toISOString();
            filter += ` and Created ge datetime'${startOfMonthISO}'`;

            // Filtering based on role
            if (!isAdmin) {
                if (email) {
                    filter += ` and Manager/EMail eq '${encodeURIComponent(email)}'`;
                } else {
                    console.warn('SP Service: No manager email provided for non-admin filtering. Returning empty.');
                    return [];
                }
            } else {
                console.log('SP Service: Admin mode - Fetching all pending regularizations for the current month.');
            }

            const url = `${siteUrl}/_api/web/getList('${listRelativeUrl}')/items?$select=*,Manager/Title,Manager/EMail&$expand=Manager&$filter=${filter}&$orderby=Created desc`;

            console.log(`SP Service: Fetching Regularizations. isAdmin=${isAdmin}, filter=${filter}`);

            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json;odata=verbose" }
            });

            if (!response.ok) return [];
            const data = await response.json();
            return data.d.results || [];
        } catch (error) {
            console.error('Error fetching pending regularizations:', error);
            return [];
        }
    }

    /**
     * Generic method to update status and comments for any approval list
     */
    static async updateApprovalStatus(
        type: 'Regularization' | 'Leave' | 'Permission',
        id: string,
        status: 'Approved' | 'Rejected',
        comments: string
    ): Promise<void> {
        console.log(`SP Service: Updating ${type} #${id} to ${status}`);
        try {
            const token = await getAccessToken();
            const digest = await this.getFormDigest(token);
            const siteUrl = "https://jmtechtalent.sharepoint.com/sites/JMGroupINC-All";

            let listUrl = "";
            const possibleStatusFields = ["Status", "status", "ApprovalStatus"];
            const possibleCommentsFields = ["ApproverComments", "ApprovalComments", "Comments", "AdminComments"];

            if (type === 'Regularization') {
                listUrl = `${siteUrl}/_api/web/getList('/sites/JMGroupINC-All/Lists/IntimeRegularize')`;
            } else if (type === 'Leave') {
                listUrl = `${siteUrl}/_api/web/lists/getByTitle('Leave Request')`;
            } else if (type === 'Permission') {
                listUrl = `${siteUrl}/_api/web/lists/getByTitle('Permission')`;
            }

            // 1. Fetch dynamic metadata from the LIST
            const listResponse = await fetch(`${listUrl}?$select=ListItemEntityTypeFullName`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!listResponse.ok) {
                const errText = await listResponse.text();
                throw new Error(`Failed to fetch list metadata: ${listResponse.status} - ${errText}`);
            }

            const listData = await listResponse.json();
            const metadataType = listData.d.ListItemEntityTypeFullName;

            // 2. Fetch the item to identify which fields exist
            const itemResponse = await fetch(`${listUrl}/items(${id})?$select=*`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json;odata=verbose"
                }
            });

            if (!itemResponse.ok) {
                const errText = await itemResponse.text();
                throw new Error(`Failed to fetch item data: ${itemResponse.status} - ${errText}`);
            }

            const itemData = await itemResponse.json();
            const itemFields = Object.keys(itemData.d);

            // 3. Identify actual field names on THIS specific item
            const statusField = possibleStatusFields.find(f => itemFields.includes(f)) || "Status";
            const commentsField = possibleCommentsFields.find(f => itemFields.includes(f)) || (type === 'Leave' ? "ApprovalComments" : "ApproverComments");

            console.log(`SP Service: Fields found for ${type}: Status -> ${statusField}, Comments -> ${commentsField}`);

            const payload = {
                '__metadata': { 'type': metadataType },
                [statusField]: status,
                [commentsField]: comments
            };

            const response = await fetch(`${listUrl}/items(${id})`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-RequestDigest": digest,
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "MERGE"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`SP Service: Update failed for ${type} #${id}. Payload:`, payload, "Error:", text);
                throw new Error(`Failed to update status: ${response.status} - ${text}`);
            }
            console.log(`SP Service: ${type} #${id} updated successfully`);
        } catch (error) {
            console.error(`Error updating ${type} status:`, error);
            throw error;
        }
    }
}
