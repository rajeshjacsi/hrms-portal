import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePayslipPDF = (
    selectedEmployee: any,
    month: number,
    year: number,
    daysPayable: number,
    basic: number,
    hra: number,
    specialAllowance: number,
    bonus: number,
    pf: number,
    profTax: number,
    tds: number,
    grossApp: number,
    totalDeductions: number,
    netPay: number
) => {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();


    // Company Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('JM TECH TALENT IT SERVICES PRIVATE LIMITED', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CIN No.U72900TN2016PTC111685', pageWidth / 2, 21, { align: 'center' });
    doc.text('Sidco Electronic Complex, T.V.K. Industrial Estate, Guindy, Chennai – 600 032', pageWidth / 2, 27, { align: 'center' });

    // Add logo (top right)
    try {
        const logoImg = new Image();
        logoImg.src = '/jm-logo.png';
        doc.addImage(logoImg, 'PNG', pageWidth - 35, 8, 25, 20);
    } catch {
        console.log('Logo not loaded');
    }

    // Salary Slip Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Salary Slip ${months[month]} ${year}`, pageWidth / 2, 35, { align: 'center' });

    // Employee Details Table (Left) and Attendance Details (Right)
    const leftDetails = [
        ['Employee Name:', selectedEmployee.name],
        ['Designation:', selectedEmployee.designation || selectedEmployee.role],
        ['Department:', selectedEmployee.department || 'IT'],
        ['Date of Joining:', selectedEmployee.dateOfJoining || ''],
        ['Salary slip for:', `${months[month].substring(0, 3)}-${year.toString().substring(2)}`],
        ['E mail:', selectedEmployee.email],
        ['UAN NO:', ''],
    ];

    const rightDetails = [
        ['Total Workings days', '30.00'],
        ['Present for', daysPayable.toString()],
        ['LOP', ''],
        ['Leave adjusted', ''],
        ['Earn leave b/f.', ''],
        ['Earn leave c/f.', ''],
        ['PF No.', ''],
    ];

    // Left table
    autoTable(doc, {
        startY: 42,
        body: leftDetails,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 55 }
        },
        margin: { left: 10, right: pageWidth / 2 + 5 },
    });

    // Right table
    autoTable(doc, {
        startY: 42,
        body: rightDetails,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 45, halign: 'right' }
        },
        margin: { left: pageWidth / 2 + 5, right: 10 },
    });

    const tableStartY = Math.max((doc as any).lastAutoTable.finalY, 95) + 5;

    // Main Earnings and Deductions Table
    const tableData: any[] = [
        // Header row
        [
            { content: 'Particulars', styles: { fontStyle: 'bold', halign: 'center' } },
            { content: 'Gross Salary (Rs.)', styles: { fontStyle: 'bold', halign: 'center' } },
            { content: 'Deductions', styles: { fontStyle: 'bold', halign: 'center' } },
            { content: 'Amount (Rs.)', styles: { fontStyle: 'bold', halign: 'center' } },
            { content: 'Net Salary (Rs.)', styles: { fontStyle: 'bold', halign: 'center' } }
        ],
        // Earnings rows
        ['Basic & DA', basic.toFixed(2), 'Provident Fund', pf.toFixed(2), ''],
        ['HRA', hra.toFixed(2), 'E.S.I.', '-', ''],
        ['Conveyance', '-', 'Loss of Pay', '-', ''],
        ['Special Allowance', specialAllowance.toFixed(2), 'Professional Tax', profTax.toFixed(2), ''],
        ['Medical Allowance', '-', 'TDS on Salary', tds.toFixed(2), ''],
        ['Salary Adjustment', bonus.toFixed(2), '', '', ''],
        // Total row
        [
            { content: 'Total', styles: { fontStyle: 'bold' } },
            { content: grossApp.toFixed(2), styles: { fontStyle: 'bold' } },
            { content: 'Total', styles: { fontStyle: 'bold' } },
            { content: totalDeductions.toFixed(2), styles: { fontStyle: 'bold' } },
            ''
        ],
        // Net Salary row
        [
            { content: '', colSpan: 3, styles: { fontStyle: 'bold' } },
            { content: 'Total Net Salary', styles: { fontStyle: 'bold' } },
            { content: netPay.toFixed(2), styles: { fontStyle: 'bold', fontSize: 11 } }
        ]
    ];

    // @ts-ignore - autoTable types are too strict for our styled cells
    autoTable(doc, {
        startY: tableStartY,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 40 },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: 10, right: 10 },
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a computer-generated document and does not require a signature.', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    // Save
    const fileName = `Payslip_${selectedEmployee.name.replace(/\s+/g, '_')}_${months[month]}_${year}.pdf`;
    doc.save(fileName);
};
