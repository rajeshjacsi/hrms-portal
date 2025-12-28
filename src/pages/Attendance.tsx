import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMsal } from "@azure/msal-react";
import {
    FaFingerprint,
    FaHistory,
    FaCoffee,
    FaBed,
    FaCalendarAlt,
    FaExclamationTriangle,
    FaSearch,
    FaFilePdf,
    FaUmbrellaBeach,
    FaPlane,
    FaUserSlash,
    FaClock,
    FaTimes
} from 'react-icons/fa';
import type { AttendanceRecord, Shift, Employee } from '../types/attendance';
import { SharePointService } from '../services/sharePointService';
import type { SPRegularizationItem } from '../services/sharePointService';
import { getAttendanceState } from '../utils/timeUtils';
import { NotificationModal } from '../components/NotificationModal';
import { DashboardCalendar } from '../components/DashboardCalendar';
import { ATTENDANCE_CONFIG } from '../config/attendanceConfig';

// Helper function to check if attendance window is closed for a given date
const isAttendanceWindowClosed = (dateStr: string, shift: Shift | null): boolean => {
    if (!shift) return false;

    try {
        // Parse the date string (DD/MM/YYYY)
        const [day, month, year] = dateStr.split('/');
        const recordDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        // Get shift end time
        const [endHours, endMinutes] = shift.endTime.split(':').map(Number);
        const shiftEnd = new Date(recordDate);
        shiftEnd.setHours(endHours, endMinutes, 0, 0);

        // Add checkout window (2 hours)
        const attendanceWindowClose = new Date(shiftEnd.getTime() + ATTENDANCE_CONFIG.CHECK_OUT_WINDOW_MINS * 60 * 1000);

        // Check if current time is past the attendance window
        const now = new Date();
        return now > attendanceWindowClose;
    } catch (e) {
        console.error('Error checking attendance window:', e);
        return false;
    }
};

export const Attendance: React.FC = () => {
    const { accounts } = useMsal();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [shift, setShift] = useState<Shift | null>(null);
    const [currentUser, setCurrentUser] = useState<Employee | null>(null);
    const [attendanceState, setAttendanceState] = useState<string>('LOADING');
    const [stateMessage, setStateMessage] = useState<string>('');

    // User State
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkoutSuccessful, setCheckoutSuccessful] = useState(false);

    // Attendance History State
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Regularization State
    const [regularizationCount, setRegularizationCount] = useState(0);
    const [missedCheckouts, setMissedCheckouts] = useState<AttendanceRecord[]>([]);

    // Notification State
    const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Regularization Modal State
    const [showRegularizationModal, setShowRegularizationModal] = useState(false);
    const [regularizationReason, setRegularizationReason] = useState('');
    const [showRegularizationStatusModal, setShowRegularizationStatusModal] = useState(false);
    const [regularizationHistoryList, setRegularizationHistoryList] = useState<SPRegularizationItem[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // Initialize
    useEffect(() => {
        const init = async () => {
            if (!accounts || accounts.length === 0) return;
            const email = accounts[0].username;

            try {
                // 1. Get Employee Profile
                const allEmps = await SharePointService.getAllEmployees();
                const me = allEmps.find(e => e.email?.toLowerCase() === email.toLowerCase());

                if (me) {
                    setCurrentUser(me);

                    // 2. Get Shift
                    if (me.shiftId) {
                        const allShifts = await SharePointService.getAllShifts();
                        const myShift = allShifts.find(s => s.id === me.shiftId);
                        if (myShift) {
                            setShift(myShift);
                        }
                    }

                    // 3. Get Attendance Record (Single Source of Truth)
                    const record = await SharePointService.getTodayAttendance(me.id);

                    // 4. Initial Baseline: Check if it's a weekend (even if no record yet)
                    const today = new Date();
                    const dayOfWeek = today.getDay();
                    const isWeekendToday = dayOfWeek === 0 || dayOfWeek === 6;

                    // Priority Logic: Single Source of Truth
                    if (record && !record.checkOutTime && (record.status?.trim().toUpperCase() === 'IN' || record.status?.toLowerCase().includes('checked in'))) {
                        // If ALREADY checked in, show ACTIVE state (allow Check Out)
                        setIsCheckedIn(true);
                        setCurrentRecord(record);
                        setAttendanceState('ACTIVE');
                    } else if (record && record.status?.trim().toLowerCase() === 'holiday') {
                        // If marked as Holiday and NOT checked in -> Hide Check In
                        setAttendanceState('HOLIDAY');
                        setStateMessage('Holiday');
                    } else if (record && record.status && (record.status.toLowerCase().includes('leave'))) {
                        // If marked as Leave and NOT checked in -> Hide Check In
                        setAttendanceState('ON_LEAVE');
                    } else if (record && record.status?.trim().toLowerCase() === 'absent') {
                        // If marked as Absent and NOT checked in -> Hide Check In
                        setAttendanceState('ABSENT');
                    } else if (record && record.checkOutTime) {
                        // If checked out -> Show COMPLETED
                        setAttendanceState('COMPLETED');
                        setCurrentRecord(record);
                    } else if (isWeekendToday && !record) {
                        // If weekend and no record -> Hide Check In
                        setAttendanceState('WEEKEND');
                    }
                }
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        };
        init();
    }, [accounts]);

    // Load attendance history and regularization data
    useEffect(() => {
        if (!currentUser) return;

        const loadHistoryAndRegularization = async () => {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            // Set default date range to FULL MONTH for the calendar
            const firstDay = `01/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            const lastDayOfCurrentMonthStr = `${daysInMonth.toString().padStart(2, '0')}/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;

            setDateFrom(firstDay);

            const todayDate = new Date();
            const todayDay = todayDate.getDate();
            const todayStr = `${todayDay.toString().padStart(2, '0')}/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;

            setDateTo(todayStr);

            // Load history
            await loadAttendanceHistory(currentUser.id, firstDay, lastDayOfCurrentMonthStr);

            // Load regularization count
            const count = await SharePointService.getRegularizationCount(currentUser.id, currentMonth, currentYear);
            setRegularizationCount(count);

            // Load missed checkouts
            const history = await SharePointService.getAttendanceHistory(currentUser.id, firstDay, todayStr);
            const todayDateStr = `${new Date().getDate().toString().padStart(2, '0')}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`;

            const missed = history.filter(record =>
                record.checkInTime &&
                !record.checkOutTime &&
                record.date !== todayDateStr
            );

            // Sort missed checkouts by date
            const sortedMissed = missed.sort((a, b) => {
                const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                const [dayB, monthB, yearB] = b.date.split('/').map(Number);
                const dateA = new Date(yearA, monthA - 1, dayA);
                const dateB = new Date(yearB, monthB - 1, dayB);
                return dateA.getTime() - dateB.getTime();
            });

            setMissedCheckouts(sortedMissed);
        };

        loadHistoryAndRegularization();
    }, [currentUser]);

    const loadAttendanceHistory = async (userId: string, startDate: string, endDate: string) => {
        setHistoryLoading(true);
        try {
            const history = await SharePointService.getAttendanceHistory(userId, startDate, endDate);

            // Sort by date in ascending order
            const sortedHistory = history.sort((a, b) => {
                const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                const [dayB, monthB, yearB] = b.date.split('/').map(Number);
                const dateA = new Date(yearA, monthA - 1, dayA);
                const dateB = new Date(yearB, monthB - 1, dayB);
                return dateA.getTime() - dateB.getTime();
            });

            setAttendanceHistory(sortedHistory);
        } catch (error) {
            console.error("Failed to load attendance history", error);
        } finally {
            setHistoryLoading(false);
        }
    };


    const handleDateRangeSearch = async () => {
        if (!currentUser || !dateFrom || !dateTo) return;
        await loadAttendanceHistory(currentUser.id, dateFrom, dateTo);
    };

    const handleGeneratePDF = () => {
        if (!currentUser || attendanceHistory.length === 0) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Add rounded border around entire page
        doc.setDrawColor(200, 200, 200); // Light gray border
        doc.setLineWidth(0.5);
        doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 3, 3, 'S');

        // Blue header background with rounded corners at top
        doc.setFillColor(41, 128, 185); // Blue color
        doc.roundedRect(10, 10, pageWidth - 20, 60, 3, 3, 'F');

        // Add logo
        const logo = new Image();
        logo.src = '/jm-logo.png';
        logo.onload = () => {
            // Center the logo
            const logoWidth = 30;
            const logoHeight = 20;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.addImage(logo, 'PNG', logoX, 18, logoWidth, logoHeight);

            // Company name
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('J&M GROUP INC', pageWidth / 2, 48, { align: 'center' });

            // Attendance Report subtitle
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Attendance Report', pageWidth / 2, 58, { align: 'center' });

            // Reset text color for body
            doc.setTextColor(0, 0, 0);

            // Employee and Period info
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Employee: ${currentUser.name}`, 20, 83);
            doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth - 20, 83, { align: 'right' });

            // Prepare table data
            const tableData = attendanceHistory.map(record => [
                record.date,
                currentUser.name,
                record.checkInTime || '-',
                record.checkOutTime || '-',
                record.status || 'Pending'
            ]);

            // Generate table
            autoTable(doc, {
                startY: 93,
                head: [['Date', 'Employee', 'Check In', 'Check Out', 'Status']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    halign: 'center'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { left: 20, right: 20 }
            });

            // Footer
            const docWithTable = doc as { lastAutoTable?: { finalY: number } };
            const finalY = docWithTable.lastAutoTable?.finalY || 150;
            doc.setFontSize(9);
            doc.setTextColor(128, 128, 128);
            doc.text('© 2025 J&M Group Inc.', pageWidth / 2, finalY + 20, { align: 'center' });

            // Download PDF
            const fileName = `Attendance_Report_${currentUser.name}_${dateFrom.replace(/\//g, '-')}_to_${dateTo.replace(/\//g, '-')}.pdf`;
            doc.save(fileName);
        };

        // Fallback if logo doesn't load
        logo.onerror = () => {
            // Generate PDF without logo
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('J&M GROUP INC', pageWidth / 2, 40, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Attendance Report', pageWidth / 2, 52, { align: 'center' });

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Employee: ${currentUser.name}`, 20, 75);
            doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth - 20, 75, { align: 'right' });

            const tableData = attendanceHistory.map(record => [
                record.date,
                currentUser.name,
                record.checkInTime || '-',
                record.checkOutTime || '-',
                record.status || 'Pending'
            ]);

            autoTable(doc, {
                startY: 85,
                head: [['Date', 'Employee', 'Check In', 'Check Out', 'Status']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    halign: 'center'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { left: 20, right: 20 }
            });

            const docWithTable = doc as { lastAutoTable?: { finalY: number } };
            const finalY = docWithTable.lastAutoTable?.finalY || 150;
            doc.setFontSize(9);
            doc.setTextColor(128, 128, 128);
            doc.text('© 2025 J&M Group Inc.', pageWidth / 2, finalY + 20, { align: 'center' });

            const fileName = `Attendance_Report_${currentUser.name}_${dateFrom.replace(/\//g, '-')}_to_${dateTo.replace(/\//g, '-')}.pdf`;
            doc.save(fileName);
        };
    };

    const handleRegularize = async (record: AttendanceRecord) => {
        if (!currentUser) return;

        try {
            await SharePointService.requestRegularization(
                record.id!
            );

            // Reload data
            const now = new Date();
            const count = await SharePointService.getRegularizationCount(
                currentUser.id,
                now.getMonth() + 1,
                now.getFullYear()
            );
            setRegularizationCount(count);

            // Reload history and missed checkouts
            if (dateFrom && dateTo) {
                await loadAttendanceHistory(currentUser.id, dateFrom, dateTo);
                const history = await SharePointService.getAttendanceHistory(currentUser.id, dateFrom, dateTo);
                const missed = history.filter(rec => rec.checkInTime && !rec.checkOutTime);
                setMissedCheckouts(missed);
            }

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Regularization Successful',
                message: 'Your attendance has been regularized successfully.'
            });
        } catch (error: unknown) {
            const err = error as Error;
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Regularization Failed',
                message: err.message || 'Failed to process regularization request.'
            });
        }
    };

    const handleViewRegularizationStatus = async () => {
        if (!accounts || accounts.length === 0) return;
        setIsHistoryLoading(true);
        setShowRegularizationStatusModal(true);
        try {
            const history = await SharePointService.getRegularizationHistory(accounts[0].username);
            setRegularizationHistoryList(history);
        } catch (error) {
            console.error('Error fetching history:', error);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to fetch regularization history.'
            });
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleSubmitRegularization = async () => {
        if (!currentUser) return;

        try {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

            await SharePointService.submitCheckInRegularization({
                employeeName: currentUser.name,
                mailID: currentUser.email,
                date: dateStr,
                manager: currentUser.reportingManager || 'Not Assigned',
                reason: regularizationReason
            });

            setShowRegularizationModal(false);
            setRegularizationReason('');

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Request Submitted',
                message: 'Your check-in regularization request has been submitted successfully.'
            });
        } catch (error: unknown) {
            const err = error as Error;
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Submission Failed',
                message: err.message || 'Failed to submit regularization request.'
            });
        }
    };

    // Timer & frequent checks
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            // Weekend Check (Independent of shift)
            const dayOfWeek = now.getDay();
            const isWeekendToday = dayOfWeek === 0 || dayOfWeek === 6;

            if (attendanceState === 'HOLIDAY' || attendanceState === 'ON_LEAVE' || attendanceState === 'ABSENT') {
                // Do not override Holiday or Leave states
            } else if (currentRecord && currentRecord.checkOutTime) {
                // Already checked out - keep COMPLETED state
                if (attendanceState !== 'COMPLETED') {
                    setAttendanceState('COMPLETED');
                }
            } else if (isWeekendToday && !isCheckedIn) {
                // Hide button on weekends if not checked in
                if (attendanceState !== 'WEEKEND') {
                    setAttendanceState('WEEKEND');
                }
            } else if (shift && !isCheckedIn) {
                // Not checked in and not checked out - evaluate based on time
                const { state, message } = getAttendanceState(shift, now);

                if (state !== attendanceState) {
                    setAttendanceState(state);
                    setStateMessage(message || '');
                }
            }

            // Update Elapsed Time if checked in
            if (isCheckedIn && currentRecord?.checkInTime && currentRecord?.date) {
                try {
                    // Parse Check-In Time from the record
                    const [ciTime, ciModifier] = currentRecord.checkInTime.split(' ');
                    const [ciHoursStr, ciMinutesStr] = ciTime.split(':');
                    let ciHours = parseInt(ciHoursStr);
                    const ciMinutes = parseInt(ciMinutesStr);
                    if (ciModifier === 'PM' && ciHours < 12) ciHours += 12;
                    if (ciModifier === 'AM' && ciHours === 12) ciHours = 0;

                    // Parse the date (DD/MM/YYYY)
                    const [day, month, year] = currentRecord.date.split('/').map(Number);

                    // Create check-in datetime
                    const checkInTime = new Date(year, month - 1, day, ciHours, ciMinutes, 0, 0);

                    // Calculate elapsed time from check-in
                    let diff = now.getTime() - checkInTime.getTime();
                    if (diff < 0) diff = 0; // Safety check

                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    setElapsedTime(
                        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                    );
                } catch (error) {
                    console.error('Error calculating elapsed time:', error);
                    setElapsedTime('00:00:00');
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [shift, isCheckedIn, currentRecord, attendanceState]);

    const handleCheckIn = async () => {
        if (!shift || !currentUser || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const record = await SharePointService.checkIn(currentUser.id, shift.id, currentUser.name, currentUser.place, currentUser.email);
            setCurrentRecord(record);
            setIsCheckedIn(true);
            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Check-In Successful',
                message: `You have checked in at ${record.checkInTime}.`
            });
        } catch (error: unknown) {
            const err = error as Error;
            console.error(err);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Check-In Failed',
                message: err.message || 'An unexpected error occurred.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckOut = async () => {
        if (!currentRecord || !currentUser || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await SharePointService.checkOut(
                currentRecord.id!,
                currentRecord.checkInTime || "",
                currentRecord.date || "",
                shift?.startTime,
                shift?.endTime
            );

            // Refetch the attendance record to get the updated checkout data
            const updatedRecord = await SharePointService.getTodayAttendance(currentUser.id);

            setIsCheckedIn(false);
            setCurrentRecord(updatedRecord);
            setElapsedTime('00:00:00');
            setAttendanceState('COMPLETED'); // Immediately show completion screen
            setCheckoutSuccessful(true); // Mark checkout as successful
            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Shift Completed',
                message: 'You have successfully checked out. Good job!'
            });
        } catch (error: unknown) {
            const err = error as Error;
            console.error(err);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Check-Out Failed',
                message: err.message || 'Please check that the "WorkingHours" column exists in the SharePoint list.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalClose = async () => {
        setNotification({ ...notification, isOpen: false });

        // If checkout was successful, reload attendance data to ensure UI is in sync
        if (checkoutSuccessful && currentUser) {
            const updatedRecord = await SharePointService.getTodayAttendance(currentUser.id);
            if (updatedRecord && updatedRecord.checkOutTime) {
                setCurrentRecord(updatedRecord);
                setAttendanceState('COMPLETED');
                setIsCheckedIn(false);
            }
            setCheckoutSuccessful(false);
        }

        // Reload attendance history after check-in or checkout to show updated data
        if (currentUser) {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const firstDay = `01/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;
            const todayDay = now.getDate();
            const todayStr = `${todayDay.toString().padStart(2, '0')}/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;
            await loadAttendanceHistory(currentUser.id, firstDay, todayStr);
        }
    };


    const getEffectiveWorkMins = () => {
        if (!shift) return 0;

        try {
            // Parse Shift Start Time
            const [timeStr, modifier] = shift.startTime.split(' ');
            const [hoursStr, minutesStr] = timeStr.split(':');
            let hours = parseInt(hoursStr);
            const minutes = parseInt(minutesStr);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;

            // Create shift start datetime for today
            const now = new Date();
            const shiftStart = new Date(now);
            shiftStart.setHours(hours, minutes, 0, 0);

            // Calculate time elapsed since shift start
            let diff = now.getTime() - shiftStart.getTime();
            if (diff < 0) diff = 0; // If before shift start, return 0

            return Math.floor(diff / (60 * 1000)); // Return minutes
        } catch (e) {
            console.error('Error calculating effective work mins:', e);
            return 0;
        }
    };

    const renderMainContent = () => {
        if (!currentUser) {
            return <div className="text-gray-400">Loading Profile...</div>;
        }

        if (attendanceState === 'LOADING') {
            return (
                <div className="flex flex-col items-center animate-pulse">
                    <p className="text-gray-400">Loading Shift...</p>
                    {!shift && <p className="text-xs text-red-300 mt-2">If this persists, verify you have a Shift assigned in Directory.</p>}
                </div>
            );
        }

        if (attendanceState === 'WEEKEND') {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                    <FaCoffee className="text-6xl mb-4 text-brand-300" />
                    <h2 className="text-2xl font-bold text-gray-700">It's the Weekend!</h2>
                    <p>No check-ins required. Enjoy your time off.</p>
                </div>
            );
        }

        if (attendanceState === 'CLOSED') {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <FaBed className="text-4xl text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Attendance Closed</h2>
                    <p className="text-gray-500 max-w-md">{stateMessage}</p>
                </div>
            );
        }

        if (attendanceState === 'HOLIDAY') {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                    <FaUmbrellaBeach className="text-6xl mb-4 text-blue-400" />
                    <h2 className="text-2xl font-bold text-gray-700">It's a Holiday!</h2>
                    <p className="text-lg font-medium text-blue-600 mb-2">{stateMessage}</p>
                    <p>Enjoy your day off.</p>
                </div>
            );
        }

        if (attendanceState === 'ON_LEAVE') {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                    <FaPlane className="text-6xl mb-4 text-purple-400" />
                    <h2 className="text-2xl font-bold text-gray-700">You are on Leave</h2>
                    <p>Relax and enjoy your time off.</p>
                </div>
            );
        }

        if (attendanceState === 'ABSENT') {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                    <FaUserSlash className="text-6xl mb-4 text-red-400" />
                    <h2 className="text-2xl font-bold text-gray-700">Marked as Absent</h2>
                    <p>You have been marked absent for today.</p>
                </div>
            );
        }

        if (attendanceState === 'COMPLETED') {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                        <FaHistory className="text-4xl text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Shift Completed</h2>
                    <p className="text-gray-500 max-w-md">Great job today! You have checked out.</p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg w-full max-w-xs">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Login</span>
                            <span className="font-bold text-gray-800">{currentRecord?.checkInTime || '--'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Logout</span>
                            <span className="font-bold text-gray-800">{currentRecord?.checkOutTime || '--'}</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (attendanceState === 'ACTIVE' || attendanceState === 'UPCOMING' || isCheckedIn) {
            let showButton = false;

            if (isCheckedIn) {
                showButton = true;
            } else if (shift) {
                const now = new Date();
                const [timeStr, modifier] = shift.startTime.split(' ');
                const [hoursStr, minutesStr] = timeStr.split(':');
                let hours = parseInt(hoursStr);
                const minutes = parseInt(minutesStr);
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;

                const shiftStartDate = new Date();
                shiftStartDate.setHours(hours, minutes, 0, 0);

                const oneHourBefore = new Date(shiftStartDate.getTime() - 60 * 60 * 1000);

                if (now >= oneHourBefore) {
                    showButton = true;
                }
            }

            if (!showButton) {
                const openMins = ATTENDANCE_CONFIG.CHECK_IN_WINDOW_MINS;
                const openText = openMins >= 60
                    ? `${Math.floor(openMins / 60)} hour${openMins >= 120 ? 's' : ''}`
                    : `${openMins} minutes`;

                return (
                    <div className="text-center text-gray-500">
                        <p>Attendance is not yet open for your shift.</p>
                        <p className="text-sm">Opens {openText} before {shift?.startTime}</p>
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-center">
                    {/* Status Pill */}
                    <div className={`mb-8 px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${isCheckedIn
                        ? 'bg-green-100 text-green-700 shadow-inner'
                        : 'bg-blue-100 text-blue-700'
                        }`}>
                        {isCheckedIn ? '● ON DUTY' : '○ READY TO START'}
                    </div>

                    {/* Interactive Button */}
                    <button
                        onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                        disabled={isCheckedIn && getEffectiveWorkMins() < ATTENDANCE_CONFIG.MIN_WORK_DURATION_MINS}
                        className={`group relative flex items-center justify-center w-64 h-64 rounded-full transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-2xl ${isCheckedIn
                            ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed'
                            : 'bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand-200'
                            }`}
                    >
                        {/* Ripple Effect */}
                        {!isCheckedIn && <span className={`absolute w-full h-full rounded-full opacity-0 group-hover:opacity-20 animate-ping bg-white`}></span>}
                        {isCheckedIn && getEffectiveWorkMins() >= ATTENDANCE_CONFIG.MIN_WORK_DURATION_MINS && (
                            <span className={`absolute w-full h-full rounded-full opacity-0 group-hover:opacity-20 animate-ping bg-white`}></span>
                        )}

                        <div className="flex flex-col items-center text-white">
                            <div className="text-5xl mb-3 filter drop-shadow-md">
                                {isCheckedIn ?
                                    <FaCoffee className="transform group-hover:rotate-12 transition-transform duration-300" /> :
                                    <FaFingerprint className="transform group-hover:scale-110 transition-transform duration-300" />
                                }
                            </div>
                            <span className="text-2xl font-bold tracking-tight">
                                {isCheckedIn ? 'Check Out' : 'Check In'}
                            </span>
                            {isCheckedIn && (() => {
                                const diff = getEffectiveWorkMins();
                                if (diff < ATTENDANCE_CONFIG.MIN_WORK_DURATION_MINS) {
                                    const remaining = Math.ceil(ATTENDANCE_CONFIG.MIN_WORK_DURATION_MINS - diff);
                                    if (remaining > 60) {
                                        const h = Math.floor(remaining / 60);
                                        const m = remaining % 60;
                                        return <span className="text-xs mt-1 text-white/80 italic">Enabled in {h}h {m}m</span>;
                                    }
                                    return <span className="text-xs mt-1 text-white/80 italic">Enabled in {remaining} min{remaining > 1 ? 's' : ''}</span>;
                                }
                                return null;
                            })()}
                            {isCheckedIn && (
                                <div className="flex flex-col items-center mt-2">
                                    <span className="font-mono text-lg opacity-90 font-medium tracking-wider" title="Working Hours">
                                        {elapsedTime}
                                    </span>
                                    {currentRecord?.checkInTime && (
                                        <span className="text-xs opacity-75 mt-1 font-mono">
                                            Login: {currentRecord.checkInTime}
                                        </span>
                                    )}
                                </div>
                            )}
                            {!isCheckedIn && shift && (
                                <span className="mt-2 text-xs opacity-70">
                                    Shift: {shift.startTime} - {shift.endTime}
                                </span>
                            )}
                        </div>
                    </button>
                    {!isCheckedIn && (
                        <p className="mt-4 text-sm text-gray-500">Check-In available</p>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-full bg-gray-50/50 p-4 md:p-8 relative">
            <div className="absolute top-0 left-0 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

            <div className="relative z-10 max-w-[1600px] mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end pb-8 border-b border-gray-200">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            {getGreeting()}, <span className="text-indigo-600">{currentUser?.name?.split(' ')[0] || accounts[0]?.name?.split(' ')[0] || 'Employee'}</span>
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Welcome back to your dashboard.</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Current Time</div>
                        <div className="text-3xl font-mono font-bold text-gray-800 tabular-nums tracking-tighter">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-sm text-indigo-600 font-medium mt-1">
                            {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Top Section: Split Layout 2/3 + 1/3 */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-stretch">

                    {/* LEFT: Main Check-In/Out Area (Takes 2 columns) */}
                    <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col justify-center">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
                            {/* Check-In/Out Button */}
                            <div className="flex flex-col items-center justify-center min-h-[350px]">
                                {renderMainContent()}
                            </div>

                            {/* Shift Information */}
                            <div className="flex flex-col justify-center h-full border-l border-gray-100 pl-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-lg text-gray-900 flex items-center">
                                        <FaHistory className="mr-3 text-indigo-500" /> Shift Information
                                    </h3>
                                    <div className="flex flex-col gap-1 items-end">
                                        <button
                                            onClick={() => setShowRegularizationModal(true)}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                            title="Submit check-in regularization request"
                                        >
                                            <FaClock className="text-sm" />
                                            Missed Check-in?
                                        </button>
                                        <button
                                            onClick={handleViewRegularizationStatus}
                                            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors mr-1"
                                        >
                                            View Status
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-100 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Assigned Shift</div>
                                            {shift && (
                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">Active</span>
                                            )}
                                        </div>
                                        <div className="font-bold text-2xl text-gray-900 mb-1">{shift?.name || 'Loading / Not Assigned'}</div>
                                        <div className="text-indigo-600 font-mono text-lg font-medium bg-indigo-50 inline-block px-3 py-1 rounded">
                                            {shift ? `${shift.startTime} - ${shift.endTime}` : '--:--'}
                                        </div>
                                    </div>
                                    <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                        <div className="text-xs text-blue-600 uppercase tracking-wider mb-3 font-bold">Attendance Guidelines</div>
                                        <ul className="text-sm text-gray-600 space-y-3 pl-1">
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></span>
                                                Check-in is available {ATTENDANCE_CONFIG.CHECK_IN_WINDOW_MINS / 60} hour{ATTENDANCE_CONFIG.CHECK_IN_WINDOW_MINS >= 120 ? 's' : ''} before your shift starts.
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></span>
                                                Attendance window closes {ATTENDANCE_CONFIG.CHECK_OUT_WINDOW_MINS / 60} hour{ATTENDANCE_CONFIG.CHECK_OUT_WINDOW_MINS >= 120 ? 's' : ''} after shift end.
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Dashboard Calendar (Takes 1 column) */}
                    <div className="xl:col-span-1 h-full">
                        <DashboardCalendar
                            records={[
                                ...attendanceHistory,
                                ...(currentRecord ? [currentRecord] : [])
                            ]}
                        />
                    </div>
                </div>

                {/* Grid Container for Attendance History and Self-Regularization */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Attendance History Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-base text-gray-700">
                                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={dateFrom.split('/').reverse().join('-')}
                                    onChange={(e) => {
                                        const [year, month, day] = e.target.value.split('-');
                                        setDateFrom(`${day}/${month}/${year}`);
                                    }}
                                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="text-gray-400 text-xs">to</span>
                                <input
                                    type="date"
                                    value={dateTo.split('/').reverse().join('-')}
                                    onChange={(e) => {
                                        const [year, month, day] = e.target.value.split('-');
                                        setDateTo(`${day}/${month}/${year}`);
                                    }}
                                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                    onClick={handleDateRangeSearch}
                                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    title="Search"
                                >
                                    <FaSearch className="text-sm" />
                                </button>
                                <button
                                    onClick={handleGeneratePDF}
                                    className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                    title="Download PDF Report"
                                    disabled={attendanceHistory.length === 0}
                                >
                                    <FaFilePdf className="text-sm" />
                                </button>
                            </div>
                        </div>

                        {historyLoading ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <p className="mt-2 text-xs text-gray-500">Loading...</p>
                            </div>
                        ) : attendanceHistory.length === 0 ? (
                            <div className="text-center py-8">
                                <FaCalendarAlt className="mx-auto text-3xl text-gray-300 mb-2" />
                                <p className="text-xs text-gray-500">No attendance records found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Check-In</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Check-Out</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Regularized</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attendanceHistory.map((record, index) => (
                                            <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-3 py-2 text-xs text-gray-800 font-medium">{record.date}</td>
                                                <td className="px-3 py-2 text-xs text-gray-600">{record.checkInTime || '-'}</td>
                                                <td className="px-3 py-2 text-xs text-gray-600">
                                                    {record.checkOutTime ? (
                                                        record.checkOutTime
                                                    ) : isAttendanceWindowClosed(record.date, shift) ? (
                                                        <span className="text-red-500 font-medium">Missed</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-medium">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-600 font-mono">{record.workingHours || '-'}</td>
                                                <td className="px-3 py-2 text-xs">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${(() => {
                                                        const s = record.status?.trim().toLowerCase() || '';
                                                        if (s === 'present' || s === 'on time') return 'bg-green-100 text-green-700';
                                                        if (s === 'half-day' || s === 'half day' || s === 'in' || s === 'checked in') return 'bg-yellow-100 text-yellow-700';
                                                        if (s === 'absent') return 'bg-red-100 text-red-700';
                                                        if (s === 'holiday') return 'bg-blue-100 text-blue-700';
                                                        if (s.includes('leave')) return 'bg-purple-100 text-purple-700';
                                                        if (s === 'late') return 'bg-orange-100 text-orange-700';
                                                        return 'bg-gray-100 text-gray-700';
                                                    })()}`}>
                                                        {(() => {
                                                            const s = record.status?.trim().toLowerCase() || '';
                                                            if (s === 'in' || s === 'checked in' || s === 'half-day' || s === 'half day') return 'Half Day';
                                                            return record.status || 'Pending';
                                                        })()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-600">
                                                    {record.regularized ? (
                                                        <span className="text-blue-600 font-semibold">YES</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Self-Regularization Section */}
                    {missedCheckouts.length > 0 && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-6 gap-4">
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 flex items-center">
                                        <FaExclamationTriangle className="mr-3 text-orange-500" /> Self-Regularization
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Regularize missed checkouts (up to 3 times per month)
                                    </p>
                                </div>
                                <div className="bg-white px-5 py-3 rounded-xl border-2 border-orange-200 shadow-sm">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Used this month</span>
                                    <div className="text-3xl font-bold text-orange-600 mt-1">
                                        {regularizationCount} / 3
                                    </div>
                                </div>
                            </div>

                            {regularizationCount >= 3 ? (
                                <div className="bg-white border-2 border-orange-200 rounded-xl p-8 text-center shadow-sm">
                                    <FaExclamationTriangle className="mx-auto text-4xl text-orange-500 mb-4" />
                                    <p className="text-gray-700 font-semibold text-lg">You have used all 3 regularizations for this month</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {missedCheckouts.slice(0, 4).map((record) => (
                                        <div
                                            key={record.id}
                                            className="bg-white border-2 border-orange-200 rounded-xl p-5 hover:border-orange-400 hover:shadow-md transition-all"
                                        >
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs text-gray-500 font-medium">Date</span>
                                                        <p className="font-bold text-gray-900 text-lg">{record.date}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs text-gray-500 font-medium">Check-In</span>
                                                        <p className="font-mono text-gray-700">{record.checkInTime}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-3 border-t border-orange-100">
                                                    <div>
                                                        <span className="text-xs text-gray-500 font-medium">Check-Out</span>
                                                        <p className="font-semibold text-red-600">Missed</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRegularize(record)}
                                                        className="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-sm hover:shadow-md"
                                                    >
                                                        Regularize
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Regularization Modal */}
                {showRegularizationModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Check-in Regularization Request</h2>

                            {/* Policy Notice */}
                            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <FaExclamationTriangle className="text-red-500 text-lg" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2">Important Policy Rules</h3>
                                        <ul className="text-[11px] text-red-700 space-y-2 list-disc ml-4 font-medium leading-relaxed">
                                            <li>Regularization Request Should Be Submitted On The Same Day For Missed Check-In</li>
                                            <li>Request Should Be Approved Within 1 Day Of Submission. Follow-Up With Your Reporting Manager To Get It Approved</li>
                                            <li>Request May Get Rejected Even If Approved By Reporting Manager, If All 3 Regularization Options Already Utilized Or More Than 1 Day On Approval</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Employee Information (Non-editable) */}
                            <div className="space-y-3 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Employee Name</label>
                                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-800 font-medium">
                                            {currentUser?.name || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Mail ID</label>
                                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-800 font-medium text-sm">
                                            {currentUser?.email || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-800 font-medium">
                                        {new Date().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Reason (Editable) */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason for Missed Check-in
                                </label>
                                <textarea
                                    value={regularizationReason}
                                    onChange={(e) => setRegularizationReason(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={4}
                                    placeholder="Please explain why you missed the check-in..."
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowRegularizationModal(false);
                                        setRegularizationReason('');
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitRegularization}
                                    disabled={!regularizationReason.trim()}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Notification Modal */}
            {/* Regularization Status Modal */}
            {showRegularizationStatusModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <FaHistory className="text-indigo-200" />
                                    Regularization Status
                                </h2>
                                <p className="text-indigo-100 text-sm mt-1">History of your missed check-in requests</p>
                            </div>
                            <button
                                onClick={() => setShowRegularizationStatusModal(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                            >
                                <FaTimes className="text-xl" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto bg-gray-50/50">
                            {isHistoryLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                    <p className="text-gray-500 font-medium italic">Fetching your requests...</p>
                                </div>
                            ) : regularizationHistoryList.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FaHistory className="text-2xl text-gray-400" />
                                    </div>
                                    <h3 className="text-gray-900 font-semibold text-lg">No records found</h3>
                                    <p className="text-gray-500 mt-1">You haven't submitted any regularization requests yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {regularizationHistoryList.map((item, index) => (
                                        <div
                                            key={item.Id || index}
                                            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${item.Status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' :
                                                            item.Status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            {item.Status || 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                                        Regularization for {new Date(item.Date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Submitted On</div>
                                                    <div className="text-xs font-medium text-gray-700">{new Date(item.Created).toLocaleDateString()}</div>
                                                </div>
                                            </div>

                                            {item.ApproverComments && (
                                                <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-sm italic text-gray-600">
                                                    <span className="font-bold text-blue-700 not-italic block mb-1">Approver Comments:</span>
                                                    "{item.ApproverComments}"
                                                </div>
                                            )}

                                            <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employee Name</div>
                                                        <div className="text-xs font-medium text-gray-900">{item.EmployeeName || item.Title}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowRegularizationStatusModal(false)}
                                className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NotificationModal
                isOpen={notification.isOpen}
                onClose={handleModalClose}
                type={notification.type}
                title={notification.title}
                message={notification.message}
            />
        </div>
    );
};
