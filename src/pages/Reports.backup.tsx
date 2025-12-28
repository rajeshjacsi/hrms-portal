import { useNavigate } from 'react-router-dom';
import {
    FaClipboardList,
    FaSearch,
    FaBalanceScale,
    FaUsersCog,
    FaCalendarDay,
    FaDownload,
    FaFileAlt,
    FaUserCheck,
    FaHistory,
    FaCalendarAlt,
    FaUsers
} from 'react-icons/fa';
import { useUser } from '../context/UserContext';

export const Reports = () => {
    const navigate = useNavigate();
    const { employee } = useUser();
    const isAdmin = employee?.permissionLevel?.toLowerCase() === 'admin';

    console.log('Current User Permission:', employee?.permissionLevel, 'Is Admin:', isAdmin);

    const reportCards = [
        {
            title: "Today's Attendance",
            icon: FaClipboardList,
            path: '/reports/todays-attendance',
            color: 'bg-indigo-500',
            description: 'View real-time attendance for all employees',
            restricted: false
        },
        {
            title: 'Filter Records',
            icon: FaSearch,
            path: '/reports/filter-by-name',
            color: 'bg-blue-500',
            description: 'Search and filter attendance records',
            restricted: false
        },

        {
            title: 'Update Leave Balance',
            icon: FaBalanceScale,
            path: '/reports/update-leave-balance',
            color: 'bg-green-500',
            description: 'Manage employee leave quotas'
        },
        {
            title: 'Update Employees Leave',
            icon: FaUsersCog,
            path: '/reports/update-employee-leave',
            color: 'bg-orange-500',
            description: 'Adjust leave records for employees'
        },
        {
            title: 'Employee Leave Calendar',
            icon: FaCalendarDay,
            path: '/reports/employee-leave-calendar',
            color: 'bg-purple-500',
            description: 'View leave schedule in calendar view'
        },
        {
            title: 'Download Attendance Report',
            icon: FaDownload,
            path: '/reports/download-report',
            color: 'bg-teal-500',
            description: 'Export attendance data to Excel/CSV'
        },
        {
            title: 'Leave Report',
            icon: FaFileAlt,
            path: '/reports/leave-report',
            color: 'bg-red-500',
            description: 'Detailed analysis of employee leaves'
        },
        {
            title: 'Permission Report',
            icon: FaUserCheck,
            path: '/reports/permission-report',
            color: 'bg-yellow-600',
            description: 'Track employee permissions and exceptions'
        },
        {
            title: 'Previous Month Report',
            icon: FaHistory,
            path: '/reports/previous-month',
            color: 'bg-gray-600',
            description: 'View archive of past month data'
        },
        {
            title: 'Employees Events',
            icon: FaCalendarAlt,
            path: '/reports/employee-events',
            color: 'bg-indigo-600',
            description: 'Manage employee birthdays and work anniversaries',
            restricted: true
        },
        {
            title: 'Upcoming Leaves',
            icon: FaCalendarAlt,
            path: '/reports/upcoming-leaves',
            color: 'bg-orange-500', // Changed color from bg-orange-600
            description: 'Manage projected leave schedules', // Changed description
            restricted: true // Access restricted to Admins
        },
        {
            title: 'Employee Database',
            icon: FaUsers, // Changed icon from FaUsersCog to FaUsers
            path: '/reports/employee-db',
            color: 'bg-emerald-600',
            description: 'Complete directory of all employees across locations',
            restricted: true // Added restricted property
        }
    ];

    const visibleCards = reportCards.filter(card => !card.restricted || isAdmin);
    console.log('All Cards:', reportCards);
    console.log('Visible Cards:', visibleCards);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <h1 className="text-xl font-bold text-gray-800 mb-4 shrink-0">Reports Dashboard</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-2">
                {visibleCards.map((card, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(card.path)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all duration-200 group flex flex-col"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                                <card.icon className="text-white text-lg" />
                            </div>
                        </div>

                        <h3 className="text-base font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {card.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">
                            {card.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
