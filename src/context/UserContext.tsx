import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { SharePointService } from '../services/sharePointService';
import { getSP } from '../config/pnpConfig';
import type { Employee } from '../types/attendance';

interface UserContextType {
    employee: Employee | null;
    permissionLevel: 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts' | null;
    loading: boolean;
    isAccessDenied: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { instance, accounts } = useMsal();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [permissionLevel, setPermissionLevel] = useState<'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts' | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAccessDenied, setIsAccessDenied] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (instance && accounts.length > 0) {
                // Initialize PnP
                getSP(instance);
                const account = accounts[0];
                const email = account.username;

                try {
                    const emp = await SharePointService.getEmployeeByEmail(email);
                    if (emp) {
                        console.log("UserContext: Fetched Employee", emp);
                        console.log("UserContext: Permission Level", emp.permissionLevel);
                        // REVERT: Removed "Fail Closed" block.
                        setEmployee(emp);
                        setPermissionLevel(emp.permissionLevel || 'Employee');
                    } else {
                        console.warn("User not found in Employee list");
                        setIsAccessDenied(true);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };

        if (accounts.length > 0) {
            init();
        } else {
            setLoading(false);
        }
    }, [instance, accounts]);

    return (
        <UserContext.Provider value={{ employee, permissionLevel, loading, isAccessDenied }}>
            {children}
        </UserContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
