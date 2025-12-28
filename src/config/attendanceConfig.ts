/**
 * Attendance timing configuration (in minutes)
 */
export const ATTENDANCE_CONFIG = {
    // How many minutes before shift start the check-in button appears
    CHECK_IN_WINDOW_MINS: 60,

    // How many minutes after shift end the attendance window closes
    CHECK_OUT_WINDOW_MINS: 120,

    // Minimum time required between check-in and check-out (to prevent accidental clicks)
    // Now set to 4 hours (240 minutes) as per requirements
    MIN_WORK_DURATION_MINS: 240,
};
