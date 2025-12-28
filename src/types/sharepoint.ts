export interface RawEmployeeDBItem {
    Id: number;
    Title: string;
    field_1: string; // Location
    field_2: string; // EmployeeId
    field_3: string; // DateOfJoining
    field_4: string; // DateOfBirth
    field_5: string; // Department
    field_6: string; // Designation
    field_7: string; // ReportingManager
    field_8: string; // ContactNumber
    field_9: string; // EmergencyContact
    field_10: string; // DeskNumber
    field_11: string; // ProfessionalEmail
    field_12: string; // PersonalEmail
    field_13: string; // CurrentAddress
    field_14: string; // PermanentAddress
}

export interface EmployeeDBPayload {
    __metadata: { type: string };
    Title?: string;
    field_1?: string;
    field_2?: string;
    field_3?: string;
    field_4?: string;
    field_5?: string;
    field_6?: string;
    field_7?: string;
    field_8?: string;
    field_9?: string;
    field_10?: string;
    field_11?: string;
    field_12?: string;
    field_13?: string;
    field_14?: string;
    AccountStatus?: string;
}

export interface RawUpcomingLeaveItem {
    Id: number;
    Title: string;
    field_1?: string; // Potential Date field
    Date?: string;    // Potential Date field
    Dates?: string;   // Potential Date field
    Date_x0020_Range?: string; // Potential Date field
    UpcomingDate?: string; // Potential Date field
}

export interface UpcomingLeavePayload {
    __metadata: { type: string };
    Title?: string;
    Date?: string;
}

export interface EmployeeEventPayload {
    __metadata: { type: string };
    Title?: string;
    Raghunatahn?: string; // DOB
    WorkAnniversary?: string;
    MailID?: string;
    Personalid?: string;
}
