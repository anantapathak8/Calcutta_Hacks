import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading, graceCountdown } = useAuth();
    const location = useLocation();

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0015] to-[#050505]">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                    <p className="text-purple-300 font-mono">Verifying authentication...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Authenticated - show content with grace period overlay if needed
    return (
        <>
            {children}

            {/* Grace Period Warning Overlay */}
            <AnimatePresence>
                {graceCountdown !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="bg-gradient-to-br from-red-900/90 to-black/90 border-2 border-red-500/60 rounded-2xl p-8 max-w-md text-center shadow-[0_0_50px_rgba(239,68,68,0.5)]"
                        >
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-red-500 rounded-full blur-[40px] opacity-30 animate-pulse" />
                                <AlertTriangle className="w-20 h-20 text-red-400 mx-auto relative z-10 animate-bounce" />
                            </div>

                            <h2 className="text-2xl font-bold text-red-400 mb-2">
                                USB KEY REMOVED
                            </h2>

                            <p className="text-gray-300 mb-6">
                                Reconnect your USB security key to continue
                            </p>

                            <div className="relative w-32 h-32 mx-auto mb-4">
                                {/* Circular countdown */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="58"
                                        fill="none"
                                        stroke="rgba(239,68,68,0.2)"
                                        strokeWidth="8"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="58"
                                        fill="none"
                                        stroke="rgb(239,68,68)"
                                        strokeWidth="8"
                                        strokeDasharray={`${(graceCountdown / 5) * 364} 364`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-5xl font-bold text-red-400">
                                        {graceCountdown}
                                    </span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500">
                                Auto-logout in {graceCountdown} seconds
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ProtectedRoute;
