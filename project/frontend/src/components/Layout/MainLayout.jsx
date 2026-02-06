import React from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Shield, ShieldOff, LogOut, Usb } from 'lucide-react';

const MainLayout = ({ children }) => {
    let auth = null;
    try {
        auth = useAuth();
    } catch (e) {
        // Not wrapped in AuthProvider
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#050505] via-[#0a0015] to-[#050505] text-white overflow-hidden selection:bg-purple-500/30 selection:text-white">
            <Sidebar />
            <main className="flex-1 relative overflow-auto">
                {/* Animated Grid Background with Purple Theme */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]" />

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 animate-gradient-flow" />

                    {/* Floating Orbs */}
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-[120px] opacity-10 animate-float" />
                    <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-500 rounded-full filter blur-[100px] opacity-10 animate-float" style={{ animationDelay: '2s' }} />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500 rounded-full filter blur-[80px] opacity-5 animate-pulse" />
                </div>

                {/* Session Status Bar */}
                {auth && (
                    <div className="fixed top-0 right-0 z-50 p-3 flex items-center gap-3">
                        {/* USB Status Indicator */}
                        <div className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-md
                            ${auth.usbStatus?.status === 'TRUSTED' || auth.usbStatus?.status === 'DETECTED'
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/40 text-red-400'}
                        `}>
                            {auth.usbStatus?.status === 'TRUSTED' || auth.usbStatus?.status === 'DETECTED' ? (
                                <>
                                    <Shield size={14} />
                                    <span className="text-xs font-mono">
                                        {auth.usbStatus?.drive_info?.name || 'USB Connected'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <ShieldOff size={14} />
                                    <span className="text-xs font-mono">No USB</span>
                                </>
                            )}
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={() => auth.logout('manual')}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all backdrop-blur-md"
                            title="Logout"
                        >
                            <LogOut size={14} />
                            <span className="text-xs font-mono hidden sm:inline">Logout</span>
                        </button>
                    </div>
                )}

                <div className="relative z-10 h-full mt-12">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
