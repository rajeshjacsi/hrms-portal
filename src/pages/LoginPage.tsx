import React from 'react';
import { FaLock } from 'react-icons/fa';

interface LoginPageProps {
    onSignIn: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSignIn }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url(/login-bg.jpg)' }}
            ></div>

            {/* Very Light Overlay - barely visible */}
            <div className="absolute inset-0 bg-gray-900/20"></div>

            {/* Compact Login Card with High Transparency */}
            <div className="relative z-10 w-full max-w-sm">
                <div className="bg-slate-800/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 text-center">

                    {/* Smaller Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/10 blur-xl rounded-full"></div>
                            <img
                                src="/jm-logo.png"
                                alt="JM Group Inc Logo"
                                className="relative w-24 h-24 object-contain drop-shadow-2xl"
                            />
                        </div>
                    </div>

                    {/* Compact Typography */}
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
                        JM Group Inc
                    </h1>

                    <h2 className="text-base text-gray-100 mb-2 font-medium">
                        HRMS Portal
                    </h2>

                    <p className="text-gray-200 text-xs mb-6">
                        Please sign in to continue
                    </p>

                    {/* Compact Button */}
                    <button
                        onClick={onSignIn}
                        className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-5 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group relative overflow-hidden text-sm"
                    >
                        {/* Glossy shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>

                        <FaLock className="text-orange-500 group-hover:text-orange-600 transition-colors relative z-10 text-sm" />
                        <span className="relative z-10">Sign In with Microsoft</span>
                    </button>

                    {/* Footer */}
                    <p className="mt-5 text-[10px] text-gray-300">
                        Powered by Microsoft Azure AD
                    </p>
                </div>
            </div>
        </div>
    );
};
