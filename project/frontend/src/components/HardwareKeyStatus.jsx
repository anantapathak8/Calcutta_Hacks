import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Key, Shield, ShieldOff, Usb, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const HardwareKeyStatus = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/hardware-key/status');
            setStatus(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching hardware key status:', error);
            setStatus({
                status: 'ERROR',
                message: 'Failed to fetch status',
                unlocked: false
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000); // Poll every 2 seconds for signature validation
        return () => clearInterval(interval);
    }, []);

    const isTrusted = status?.status === 'TRUSTED';
    const isDetected = status?.status === 'DETECTED';
    const isTampered = status?.status === 'TAMPERED';
    const isUnknown = status?.status === 'UNKNOWN';

    if (loading) {
        return (
            <div className="glass-panel rounded-2xl p-6 border-2 border-purple-500/40 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl" />
                    <div className="h-4 w-32 bg-purple-500/20 rounded" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`
                group relative overflow-hidden rounded-2xl p-4 xl:p-6
                bg-gradient-to-br ${isTrusted
                    ? 'from-emerald-900/40 via-green-950/30 to-black/70 border-emerald-500/60'
                    : isDetected
                        ? 'from-amber-900/40 via-yellow-950/30 to-black/70 border-amber-500/60'
                        : 'from-red-900/40 via-rose-950/30 to-black/70 border-red-500/60'}
                border-2 backdrop-blur-xl
                shadow-neon-purple
                transition-all duration-500 ease-out
                hover:scale-[1.02] hover:shadow-neon-pink
                hover:border-purple-500/60
                min-h-[180px] flex flex-col justify-between
                cursor-pointer
            `}
        >
            {/* Animated Gradient Overlay */}
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-tr ${isTrusted
                ? 'from-emerald-500 via-green-500 to-emerald-600'
                : isDetected
                    ? 'from-amber-500 via-yellow-500 to-amber-600'
                    : 'from-red-500 via-rose-500 to-red-600'
                } animate-gradient-flow`} />

            {/* Shimmer Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            {/* Glow Effect */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 ${isTrusted
                ? 'bg-emerald-500'
                : isDetected
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                } rounded-full filter blur-3xl opacity-15 animate-pulse`} />

            {/* Header */}
            <div className="flex justify-between items-start z-10 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`
                        p-3 rounded-xl transform transition-all duration-300
                        group-hover:scale-110 group-hover:rotate-6
                        ${isTrusted
                            ? 'bg-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                            : isDetected
                                ? 'bg-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                                : 'bg-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.5)]'}
                    `}>
                        {isTrusted ? (
                            <Shield size={24} className="text-emerald-400 drop-shadow-[0_0_10px_currentColor]" />
                        ) : isDetected ? (
                            <Key size={24} className="text-amber-400 drop-shadow-[0_0_10px_currentColor]" />
                        ) : (
                            <ShieldOff size={24} className="text-red-400 drop-shadow-[0_0_10px_currentColor]" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xs xl:text-sm font-bold text-gray-100 uppercase tracking-wider xl:tracking-widest transition-colors group-hover:text-purple-300">
                            Hardware Key
                        </h3>
                        <p className="text-[10px] xl:text-xs text-gray-500 mt-0.5 transition-colors group-hover:text-purple-400/70 font-medium">
                            USB Security
                        </p>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className={`w-3 h-3 ${isTrusted
                            ? 'bg-emerald-400'
                            : isDetected
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            } rounded-full animate-ping absolute`} />
                        <div className={`w-3 h-3 ${isTrusted
                            ? 'bg-emerald-400'
                            : isDetected
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            } rounded-full`} />
                    </div>
                </div>
            </div>

            {/* Status Display */}
            <div className="z-10 relative flex-1 flex flex-col justify-center">
                <div className={`
                    text-2xl xl:text-3xl font-black tracking-tight mb-2
                    transition-all duration-300
                    group-hover:scale-105
                    ${isTrusted
                        ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,1)]'
                        : isDetected
                            ? 'text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,1)]'
                            : 'text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,1)]'}
                `}>
                    {status?.status || 'UNKNOWN'}
                </div>
                <p className="text-xs xl:text-sm text-gray-300 transition-colors group-hover:text-purple-200 font-medium">
                    {status?.message || 'Checking status...'}
                </p>
            </div>

            {/* Footer with Drive Info or Setup Link */}
            <div className="z-10 mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                {status?.drive_info ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Usb size={14} />
                        <span>{status.drive_info.name}</span>
                    </div>
                ) : (
                    <Link
                        to="/hardware-key-setup"
                        className="flex items-center gap-2 text-xs text-purple-400 hover:text-pink-400 transition-colors"
                    >
                        <span>Setup Key</span>
                        <ExternalLink size={12} />
                    </Link>
                )}

                {status?.last_check && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>
                            {new Date(status.last_check).toLocaleTimeString()}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default HardwareKeyStatus;
