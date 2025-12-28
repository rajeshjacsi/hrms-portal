import React, { useEffect, useState } from 'react';
import { FaFileInvoiceDollar, FaDownload, FaSpinner, FaTimes, FaCalculator } from 'react-icons/fa';
// import { useMsal } from "@azure/msal-react"; // Removed unused hook
import { SharePointService } from '../services/sharePointService';
import type { Employee } from '../types/attendance';
import { generatePayslipPDF } from '../utils/payslipPDF';

// Type extensions for jspdf-autotable
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: {
            finalY: number;
        };
    }
}

export const Payroll: React.FC = () => {
    // const { accounts } = useMsal(); // Removed unused
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Payslip State
    const [month, setMonth] = useState(new Date().getMonth()); // 0-11
    const [year, setYear] = useState(new Date().getFullYear());
    const [daysPayable, setDaysPayable] = useState(0);
    const [calculatingAttendance, setCalculatingAttendance] = useState(false);

    // Earnings
    const [basic, setBasic] = useState(5000);
    const [hra, setHra] = useState(2000);
    const [specialAllowance, setSpecialAllowance] = useState(1000);
    const [bonus, setBonus] = useState(0);

    // Deductions
    const [pf, setPf] = useState(1800);
    const [profTax, setProfTax] = useState(200);
    const [tds, setTds] = useState(0);

    // Totals
    const [grossApp, setGrossApp] = useState(0);
    const [totalDeductions, setTotalDeductions] = useState(0);
    const [netPay, setNetPay] = useState(0);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = [2024, 2025, 2026];

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const data = await SharePointService.getAllEmployees();
                setEmployees(data);
            } catch (error) {
                console.error("Error fetching employees:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    // Auto-calculate Totals
    useEffect(() => {
        const gross = Number(basic) + Number(hra) + Number(specialAllowance) + Number(bonus);
        const deductions = Number(pf) + Number(profTax) + Number(tds);
        setGrossApp(gross);
        setTotalDeductions(deductions);
        setNetPay(gross - deductions);
    }, [basic, hra, specialAllowance, bonus, pf, profTax, tds]);

    // Fetch Attendance when Employee or Month/Year changes
    useEffect(() => {
        if (!selectedEmployee) return;

        const fetchAttendance = async () => {
            setCalculatingAttendance(true);
            try {
                // Calculate start and end date of the selected month
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0);

                // Format dates for SharePoint query YYYY-MM-DD
                const startStr = startDate.toISOString().split('T')[0];
                const endStr = endDate.toISOString().split('T')[0];

                const records = await SharePointService.getAttendanceHistory(
                    selectedEmployee.email, // Assuming email is the user ID/Login Name
                    startStr,
                    endStr
                );

                // Count days present (Status = Present, Half-Day, Late)
                // Adjust logic as per company policy. Here assume 'Absent' is the only non-payable.
                const payableDays = records.filter(r => r.status !== 'Absent').length;

                // Also add weekends if company policy dictates (not implemented here, strictly based on attendance records)
                setDaysPayable(payableDays);

            } catch (error) {
                console.error("Error calculating attendance:", error);
                setDaysPayable(0);
            } finally {
                setCalculatingAttendance(false);
            }
        };

        if (showModal) {
            fetchAttendance();
        }
    }, [selectedEmployee, month, year, showModal]);


    const handleGenerateClick = (emp: Employee) => {
        setSelectedEmployee(emp);
        setShowModal(true);
        // Reset figures to defaults or fetch from stored profile if available
    };

    const generatePDF = () => {
        if (!selectedEmployee) return;

        generatePayslipPDF(
            selectedEmployee,
            month,
            year,
            daysPayable,
            basic,
            hra,
            specialAllowance,
            bonus,
            pf,
            profTax,
            tds,
            grossApp,
            totalDeductions,
            netPay
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <FaSpinner className="animate-spin text-4xl text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-green-100 p-3 rounded-xl">
                    <FaFileInvoiceDollar className="text-2xl text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
                    <p className="text-sm text-gray-500">Generate payslips and manage employee salaries</p>
                </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ID</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Department</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {employees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{emp.employeeId || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                        {emp.department || 'General'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleGenerateClick(emp)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                    >
                                        <FaCalculator /> Generate Slip
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Payslip Modal */}
            {showModal && selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Generate Payslip</h3>
                                <p className="text-sm text-gray-500">for <span className="font-semibold text-blue-600">{selectedEmployee.name}</span></p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes className="text-xl" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">

                            {/* Period Selection */}
                            <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
                                    <select
                                        value={month}
                                        onChange={(e) => setMonth(Number(e.target.value))}
                                        className="px-3 py-2 border rounded-lg text-sm bg-white"
                                    >
                                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                                    <select
                                        value={year}
                                        onChange={(e) => setYear(Number(e.target.value))}
                                        className="px-3 py-2 border rounded-lg text-sm bg-white"
                                    >
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Days Payable</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={daysPayable}
                                            onChange={(e) => setDaysPayable(Number(e.target.value))}
                                            className="px-3 py-2 border rounded-lg text-sm w-32 pl-8 font-bold text-gray-800"
                                        />
                                        <div className="absolute left-2.5 top-2.5 text-gray-400 text-xs">📅</div>
                                        {calculatingAttendance && (
                                            <div className="absolute right-2 top-2">
                                                <FaSpinner className="animate-spin text-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Financials Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Earnings */}
                                <div>
                                    <h4 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-4 border-b border-green-100 pb-2">Earnings</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-600">Basic Salary</label>
                                            <input type="number" value={basic} onChange={(e) => setBasic(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-right" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-600">HRA</label>
                                            <input type="number" value={hra} onChange={(e) => setHra(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-right" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-600">Special Allowance</label>
                                            <input type="number" value={specialAllowance} onChange={(e) => setSpecialAllowance(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-right" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-600">Bonus / Incentives</label>
                                            <input type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-right" />
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 font-bold text-gray-900">
                                            <span>Gross Earnings</span>
                                            <span>{grossApp.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div>
                                    <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-4 border-b border-red-100 pb-2">Deductions</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-600">Provident Fund (PF)</label>
                                            <input type="number" value={pf} onChange={(e) => setPf(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-right" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-600">Professional Tax</label>
                                            <input type="number" value={profTax} onChange={(e) => setProfTax(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-right" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-600">TDS (Tax)</label>
                                            <input type="number" value={tds} onChange={(e) => setTds(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-right" />
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 font-bold text-gray-900">
                                            <span>Total Deductions</span>
                                            <span>{totalDeductions.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Pay Summary */}
                            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white flex justify-between items-center shadow-lg">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Net Payable Amount</p>
                                    <h2 className="text-3xl font-bold">₹{netPay.toFixed(2)}</h2>
                                </div>
                                <button
                                    onClick={generatePDF}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-green-900/20 shadow-lg transition-transform hover:scale-105 active:scale-95"
                                >
                                    <FaDownload /> Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
