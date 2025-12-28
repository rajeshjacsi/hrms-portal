import type { AttendanceRecord, Shift } from '../types/attendance';

const SHIFTS: Shift[] = [
    { id: '1', name: 'Morning Shift', startTime: '08:00', endTime: '17:00' },
    { id: '2', name: 'Afternoon Shift', startTime: '14:00', endTime: '23:00' },
    { id: '3', name: 'Night Shift', startTime: '22:00', endTime: '07:00' },
];

export class MockSharePointService {
    // Mock Delay to simulate network
    private static async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async getMyShift(_userId: string): Promise<Shift> {
        await this.delay(500);
        // For demo purposes, we can toggle shifts based on a mock user ID
        // Default to Morning
        return SHIFTS[0];
    }

    static async getAllShifts(): Promise<Shift[]> {
        return SHIFTS;
    }

    static async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
        await this.delay(300);
        const stored = localStorage.getItem(`attendance_${userId}_${new Date().toDateString()}`);
        return stored ? JSON.parse(stored) : null;
    }

    static async checkIn(userId: string, shiftId: string): Promise<AttendanceRecord> {
        await this.delay(800);
        const record: AttendanceRecord = {
            id: Date.now().toString(),
            employeeId: userId,
            date: new Date().toISOString(),
            checkInTime: new Date().toISOString(),
            status: 'Present',
            shiftId: shiftId
        };
        // Save using just the date string as key for simple "Today" lookup
        localStorage.setItem(`attendance_${userId}_${new Date().toDateString()}`, JSON.stringify(record));
        return record;
    }

    static async checkOut(userId: string, _recordId: string): Promise<AttendanceRecord> {
        await this.delay(800);
        // Find existing
        const key = `attendance_${userId}_${new Date().toDateString()}`;
        const stored = localStorage.getItem(key);
        if (!stored) throw new Error("No check-in found");

        const record: AttendanceRecord = JSON.parse(stored);
        record.checkOutTime = new Date().toISOString();

        localStorage.setItem(key, JSON.stringify(record));
        // Also save to a history log
        const history = JSON.parse(localStorage.getItem('attendance_history') || '[]');
        history.unshift(record);
        localStorage.setItem('attendance_history', JSON.stringify(history));

        return record;
    }

    // --- Employee Directory Features ---

    static async getAllEmployees(): Promise<import('../types/attendance').Employee[]> {
        await this.delay(600);
        // In a real app, this would be: await sp.web.lists.getByTitle('Employees').items.get()
        return [
            { id: 'emp-001', name: 'John Doe', role: 'Software Engineer', department: 'IT', email: 'john@example.com', shiftId: '1' }, // Morning
            { id: 'emp-002', name: 'Jane Smith', role: 'HR Manager', department: 'HR', email: 'jane@example.com', shiftId: '1' }, // Morning
            { id: 'emp-003', name: 'Mike Johnson', role: 'Support Lead', department: 'Support', email: 'mike@example.com', shiftId: '3' }, // Night
            { id: 'emp-004', name: 'Alice Brown', role: 'Sales Exec', department: 'Sales', email: 'alice@example.com', shiftId: '2' }, // Afternoon
            { id: 'user-demo-1', name: 'Current User', role: 'Admin', department: 'IT', email: 'admin@example.com', shiftId: '1' },
        ];
    }
}
