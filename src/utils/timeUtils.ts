import type { Shift } from '../types/attendance';
import { ATTENDANCE_CONFIG } from '../config/attendanceConfig';

export const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

export const parseTime = (timeStr: string, now: Date): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    return date;
};

// Helper to handle shifts that might cross midnight
export const getShiftWindow = (shift: Shift, referenceDate: Date) => {
    // If timezone is provided, convert "now" to that timezone text, then parse back to get relative separate components
    // But easier: The shift StartTime "09:00" is strictly in THAT timezone.
    // Use Intl.DateTimeFormat to get the current time in the SHIFT'S timezone.

    const timeZone = shift.timeZone || 'Asia/Kolkata'; // Default to IST if not set, or Local

    // Get "Local Time" in the target TimeZone
    let targetTimeStr;
    try {
        targetTimeStr = referenceDate.toLocaleString("en-US", { timeZone: timeZone });
    } catch (e) {
        console.error(`Invalid timezone: ${timeZone}, falling back to UTC`);
        targetTimeStr = referenceDate.toLocaleString("en-US", { timeZone: 'UTC' });
    }
    const targetDate = new Date(targetTimeStr);

    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);

    const shiftStart = new Date(targetDate);
    shiftStart.setHours(startH, startM, 0, 0);

    const shiftEnd = new Date(targetDate);
    shiftEnd.setHours(endH, endM, 0, 0);

    // If End is smaller than Start, it means it crosses midnight
    if (shiftEnd <= shiftStart) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    // Window: Start - 1hr  TO  End + 1hr
    // We compare these strictly against the "targetDate" (which represents 'now' in that timezone)

    // BUT checking logic requires converting everything to timestamps.
    // Simpler approach: Compare ISO strings or use a library like date-fns-tz.
    // Since we don't have libraries, we'll return the dates constructed in Local System Time that REPRESENT the Target Time.
    // And we will compare "targetDate" against them.

    // Window: Start - X mins  TO  End + X mins
    const checkInOpen = new Date(shiftStart.getTime() - ATTENDANCE_CONFIG.CHECK_IN_WINDOW_MINS * 60 * 1000);
    const checkOutClose = new Date(shiftEnd.getTime() + ATTENDANCE_CONFIG.CHECK_OUT_WINDOW_MINS * 60 * 1000);

    return { checkInOpen, checkOutClose, shiftStart, shiftEnd, currentTargetTime: targetDate };
};

export const getAttendanceState = (shift: Shift, globalNow: Date) => {
    // 1. Get the "Current Time" in the Shift's Timezone
    // We use getShiftWindow's internal logic which converts globalNow to target time
    // But we need to call it with globalNow.

    const timeZone = shift.timeZone || 'Asia/Kolkata';

    // Sanity check: is it weekend in THAT timezone?
    let targetTimeStr;
    try {
        targetTimeStr = globalNow.toLocaleString("en-US", { timeZone: timeZone });
    } catch (e) {
        targetTimeStr = globalNow.toLocaleString("en-US", { timeZone: 'UTC' });
    }
    const targetNow = new Date(targetTimeStr);

    if (isWeekend(targetNow)) {
        return { state: 'WEEKEND', message: 'Weekend - Enjoy your break!' };
    }

    // Check "Yesterday's" shift first (relative to target time)
    const yesterday = new Date(targetNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevShiftWindow = getShiftWindow(shift, yesterday); // this will recalc targetNow internally but using 'yesterday' base
    // Actually getShiftWindow(shift, yesterday) will treat 'yesterday' as the reference point for hours.

    // We strictly compare: The "Date" object returned by getShiftWindow is a "Local Representation" of that timezone time.
    // targetNow is also a "Local Representation".
    // So we can compare them directly.

    if (targetNow >= prevShiftWindow.checkInOpen && targetNow <= prevShiftWindow.checkOutClose) {
        return { state: 'ACTIVE', window: prevShiftWindow, timeZone };
    }

    // Check "Today's" shift
    const todayShiftWindow = getShiftWindow(shift, targetNow);
    if (targetNow >= todayShiftWindow.checkInOpen && targetNow <= todayShiftWindow.checkOutClose) {
        return { state: 'ACTIVE', window: todayShiftWindow, timeZone };
    }

    // If not active, is it too early for today?
    if (targetNow < todayShiftWindow.checkInOpen) {
        const diffMins = Math.ceil((todayShiftWindow.shiftStart.getTime() - targetNow.getTime()) / (60 * 1000));
        let timeMsg = `Shift starts at ${shift.startTime}`;

        if (diffMins <= ATTENDANCE_CONFIG.CHECK_IN_WINDOW_MINS) {
            timeMsg = `Check-in opens in ${diffMins} minutes`;
        } else if (diffMins > 60) {
            const diffHours = Math.floor(diffMins / 60);
            timeMsg = `Check-in opens in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        }

        return { state: 'UPCOMING', message: timeMsg, timeZone };
    }

    // If we passed today's window
    // if (targetNow > todayShiftWindow.checkOutClose) { ... }

    return { state: 'CLOSED', message: 'Attendance Closed for the day', timeZone };
};
