import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import RiskGauge from '../components/Dashboard/RiskGauge';
import ScanFeed from '../components/Dashboard/ScanFeed';
import TerminalLog from '../components/Dashboard/TerminalLog';
import DeauthDetection from '../components/DeauthDetection';
import { Activity, Wifi, ShieldCheck, Shield, AlertTriangle } from 'lucide-react';

const DashboardPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/findings');
            setData(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Fetch error", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) return (
        <div className="flex h-full items-center justify-center bg-[#020202]">
            <div className="text-center">
                <Shield className="w-16 h-16 text-[#00f3ff] mx-auto mb-4 animate-pulse" />
                <div className="text-[#00f3ff] font-mono text-xl animate-pulse">
                    INITIALIZING SENTINEL SYSTEMS...
                </div>
            </div>
        </div>
    );

    const { risk_score, scans } = data;
    const encryption = scans?.encryption || {};
    const mitm = scans?.mitm || {};

    // Animation variants
    const containerVars = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const itemVars = {
        hidden: { y: 30, opacity: 0 },
        show: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        <motion.div
            className="p-6 pt-20 lg:pt-6 min-h-screen flex flex-col gap-6 bg-gradient-to-br from-[#0a0a0a] via-[#000000] to-[#0a0a0a]"
            variants={containerVars}
            initial="hidden"
            animate="show"
        >
            {/* HEADER SECTION - Enhanced with Premium Animations */}
            <motion.div
                variants={itemVars}
                className="group relative flex justify-between items-center bg-black/50 backdrop-blur-xl border-2 border-[#00f3ff]/40 rounded-xl p-6 shadow-[0_0_50px_rgba(0,243,255,0.25)] transition-all duration-500 hover:shadow-[0_0_70px_rgba(0,243,255,0.4)] hover:border-[#00f3ff]/60 overflow-hidden"
            >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00f3ff]/10 via-transparent to-[#00f3ff]/10 animate-pulse" />
                </div>

                {/* Floating Orbs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f3ff] rounded-full filter blur-3xl opacity-10 animate-pulse" />
                <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-[#00a8ff] rounded-full filter blur-2xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#00f3ff]/10 rounded-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-[#00f3ff]/20 group-hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]">
                            <Shield className="w-8 h-8 text-[#00f3ff] animate-pulse transition-transform duration-300 group-hover:rotate-12" />
                        </div>
                        <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] via-[#00d4ff] to-[#00a8ff] animate-pulse transition-all duration-300 group-hover:scale-105">
                            OPS DASHBOARD
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-ping absolute shadow-[0_0_10px_#00f3ff]" />
                                <div className="w-2 h-2 bg-[#00f3ff] rounded-full shadow-[0_0_10px_#00f3ff]" />
                            </div>
                            <p className="text-sm text-[#00f3ff] font-mono uppercase tracking-wider transition-all duration-300 group-hover:text-white group-hover:tracking-widest">
                                Live Threat Monitoring Active
                            </p>
                        </div>
                    </div>
                </div>
                <div className="text-right relative z-10">
                    <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1 transition-colors group-hover:text-gray-400">System Uptime</div>
                    <div className="text-2xl font-bold text-[#00f3ff] font-mono tabular-nums transition-all duration-300 group-hover:scale-110 group-hover:text-white">
                        {Math.floor(performance.now() / 1000)}s
                    </div>
                </div>
            </motion.div>

            {/* TOP ROW - Enhanced with Animations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {/* RISK GAUGE - Enhanced with Animations */}
                <motion.div variants={itemVars} className="lg:col-span-4 h-full">
                    <div className="group h-full min-h-[300px] relative rounded-2xl border-2 border-[#00f3ff]/40 shadow-[0_0_50px_rgba(0,243,255,0.25)] transition-all duration-500 hover:shadow-[0_0_70px_rgba(0,243,255,0.4)] hover:border-[#00f3ff]/60 hover:scale-[1.02] overflow-hidden">
                        {/* Animated Border Glow */}
                        <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(0,243,255,0.2)] animate-pulse pointer-events-none" />

                        {/* Shimmer Effect on Hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        <RiskGauge score={risk_score || 0} />
                    </div>
                </motion.div>

                {/* SECURITY METRICS - Enhanced Cards */}
                <motion.div variants={itemVars} className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* ARP MONITOR CARD - Enhanced with Animations */}
                    <div className={`
                        group relative overflow-hidden rounded-2xl p-6
                        bg-gradient-to-br ${mitm.status === 'DANGER'
                            ? 'from-red-900/30 via-red-950/40 to-black/60 border-red-500/60'
                            : 'from-green-900/30 via-green-950/40 to-black/60 border-green-500/60'}
                        border-2 backdrop-blur-xl
                        shadow-[0_0_40px_rgba(0,243,255,0.2)]
                        transition-all duration-500 ease-out
                        hover:scale-[1.03] hover:shadow-[0_0_60px_rgba(0,243,255,0.4)]
                        hover:border-[#00f3ff]/60
                        min-h-[200px] flex flex-col justify-between
                        cursor-pointer
                    `}>
                        {/* Animated Gradient Overlay */}
                        <div className={`absolute inset-0 opacity-10 bg-gradient-to-tr ${mitm.status === 'DANGER' ? 'from-red-500 via-red-600 to-red-700' : 'from-green-500 via-green-600 to-green-700'} animate-pulse`} />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        {/* Animated Border Glow */}
                        <div className={`absolute inset-0 rounded-2xl ${mitm.status === 'DANGER' ? 'shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'shadow-[0_0_30px_rgba(34,197,94,0.3)]'} animate-pulse`} />

                        {/* Multiple Glow Effects */}
                        {mitm.status === 'DANGER' && (
                            <>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full filter blur-3xl opacity-30 animate-pulse" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-600 rounded-full filter blur-2xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </>
                        )}
                        {mitm.status !== 'DANGER' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-green-500 rounded-full filter blur-3xl opacity-10 animate-pulse" />
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-start z-10 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-3 rounded-xl transform transition-all duration-300
                                    group-hover:scale-110 group-hover:rotate-3
                                    ${mitm.status === 'DANGER'
                                        ? 'bg-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.4)] group-hover:shadow-[0_0_35px_rgba(239,68,68,0.6)]'
                                        : 'bg-green-500/30 shadow-[0_0_25px_rgba(34,197,94,0.4)] group-hover:shadow-[0_0_35px_rgba(34,197,94,0.6)]'}
                                `}>
                                    <Activity size={24} className={`${mitm.status === 'DANGER' ? 'text-red-400' : 'text-green-400'} transition-transform duration-300 group-hover:scale-110`} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest transition-colors group-hover:text-[#00f3ff]">ARP Monitor</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 transition-colors group-hover:text-gray-400">Network Integrity</p>
                                </div>
                            </div>
                            {mitm.status === 'DANGER' && (
                                <div className="flex items-center gap-2 animate-bounce">
                                    <AlertTriangle size={16} className="text-red-400 animate-pulse" />
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute" />
                                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="z-10">
                            <div className={`
                                text-4xl font-black tracking-tight mb-2
                                transition-all duration-300
                                group-hover:scale-105
                                ${mitm.status === 'DANGER'
                                    ? 'text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,1)] group-hover:drop-shadow-[0_0_30px_rgba(239,68,68,1)]'
                                    : 'text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,1)] group-hover:drop-shadow-[0_0_30px_rgba(34,197,94,1)]'}
                            `}>
                                {mitm.status === 'DANGER' ? 'COMPROMISED' : 'SECURE'}
                            </div>
                            <p className="text-sm text-gray-400 uppercase tracking-wide transition-colors group-hover:text-gray-300">
                                {mitm.status === 'DANGER' ? '⚠️ ARP Spoofing Detected' : '✓ No Anomalies Detected'}
                            </p>
                        </div>
                    </div>

                    {/* WIFI SECURITY CARD - Enhanced with Animations */}
                    <div className={`
                        group relative overflow-hidden rounded-2xl p-6
                        bg-gradient-to-br ${encryption.status === 'UNSECURE'
                            ? 'from-yellow-900/30 via-yellow-950/40 to-black/60 border-yellow-500/60'
                            : 'from-blue-900/30 via-blue-950/40 to-black/60 border-blue-500/60'}
                        border-2 backdrop-blur-xl
                        shadow-[0_0_40px_rgba(0,243,255,0.2)]
                        transition-all duration-500 ease-out
                        hover:scale-[1.03] hover:shadow-[0_0_60px_rgba(0,243,255,0.4)]
                        hover:border-[#00f3ff]/60
                        min-h-[200px] flex flex-col justify-between
                        cursor-pointer
                    `}>
                        {/* Animated Gradient Overlay */}
                        <div className={`absolute inset-0 opacity-10 bg-gradient-to-tr ${encryption.status === 'UNSECURE' ? 'from-yellow-500 via-yellow-600 to-yellow-700' : 'from-blue-500 via-blue-600 to-blue-700'} animate-pulse`} />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        {/* Animated Border Glow */}
                        <div className={`absolute inset-0 rounded-2xl ${encryption.status === 'UNSECURE' ? 'shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'shadow-[0_0_30px_rgba(59,130,246,0.3)]'} animate-pulse`} />

                        {/* Multiple Glow Effects */}
                        {encryption.status === 'UNSECURE' && (
                            <>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 rounded-full filter blur-3xl opacity-30 animate-pulse" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-600 rounded-full filter blur-2xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </>
                        )}
                        {encryption.status !== 'UNSECURE' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500 rounded-full filter blur-3xl opacity-10 animate-pulse" />
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-start z-10 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-3 rounded-xl transform transition-all duration-300
                                    group-hover:scale-110 group-hover:rotate-3
                                    ${encryption.status === 'UNSECURE'
                                        ? 'bg-yellow-500/30 shadow-[0_0_25px_rgba(234,179,8,0.4)] group-hover:shadow-[0_0_35px_rgba(234,179,8,0.6)]'
                                        : 'bg-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.4)] group-hover:shadow-[0_0_35px_rgba(59,130,246,0.6)]'}
                                `}>
                                    <Wifi size={24} className={`${encryption.status === 'UNSECURE' ? 'text-yellow-400' : 'text-blue-400'} transition-transform duration-300 group-hover:scale-110`} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest transition-colors group-hover:text-[#00f3ff]">WiFi Security</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 transition-colors group-hover:text-gray-400">Encryption Status</p>
                                </div>
                            </div>
                            {encryption.status === 'UNSECURE' && (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-ping absolute" />
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="z-10">
                            <div className={`
                                text-4xl font-black tracking-tight mb-2
                                transition-all duration-300
                                group-hover:scale-105
                                ${encryption.status === 'UNSECURE'
                                    ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,1)] group-hover:drop-shadow-[0_0_30px_rgba(234,179,8,1)]'
                                    : 'text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,1)] group-hover:drop-shadow-[0_0_30px_rgba(59,130,246,1)]'}
                            `}>
                                {encryption.status === 'UNSECURE' ? 'OPEN' : 'WPA2/3'}
                            </div>
                            <p className="text-sm text-gray-400 uppercase tracking-wide transition-colors group-hover:text-gray-300">
                                {encryption.status === 'UNSECURE' ? '⚠️ Traffic Visible' : '✓ Encrypted Connection'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* MID ROW: FUL WIDTH CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DEAUTH DETECTION - Enhanced */}
                <motion.div variants={itemVars} className="lg:col-span-1">
                    <div className="h-full min-h-[350px]">
                        <DeauthDetection />
                    </div>
                </motion.div>

                {/* LIVE THREAT FEED - Enhanced with Animations */}
                <motion.div variants={itemVars} className="lg:col-span-1">
                    <div className="group glass-panel rounded-2xl flex flex-col overflow-hidden border-2 border-[#00f3ff]/40 shadow-[0_0_50px_rgba(0,243,255,0.25)] h-full min-h-[350px] transition-all duration-500 hover:shadow-[0_0_70px_rgba(0,243,255,0.4)] hover:border-[#00f3ff]/60 hover:scale-[1.02] relative">
                        {/* Animated Border Glow */}
                        <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(0,243,255,0.2)] animate-pulse pointer-events-none" />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        {/* Floating Orb */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#00f3ff] rounded-full filter blur-3xl opacity-5 animate-pulse pointer-events-none" />

                        <div className="p-4 border-b border-[#00f3ff]/20 bg-black/60 backdrop-blur-md relative z-10">
                            <h2 className="text-[#00f3ff] font-bold text-base flex items-center gap-3 uppercase tracking-widest transition-all duration-300 group-hover:text-white group-hover:tracking-wider">
                                <div className="p-2 bg-[#00f3ff]/10 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-[#00f3ff]/20 group-hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]">
                                    <ShieldCheck size={20} className="transition-transform duration-300 group-hover:rotate-12" />
                                </div>
                                Live Threat Feed
                                <div className="ml-auto flex items-center gap-2">
                                    <div className="relative">
                                        <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-ping absolute shadow-[0_0_10px_#00f3ff]" />
                                        <div className="w-2 h-2 bg-[#00f3ff] rounded-full shadow-[0_0_10px_#00f3ff]" />
                                    </div>
                                    <span className="text-xs text-gray-400 transition-colors group-hover:text-gray-300">ACTIVE</span>
                                </div>
                            </h2>
                        </div>
                        <div className="p-4 bg-black/40 backdrop-blur-sm overflow-auto flex-1 relative z-10">
                            <ScanFeed findings={data} />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* BOTTOM ROW: TERMINAL LOG - Enhanced */}
            <motion.div variants={itemVars} className="h-64">
                <TerminalLog logs={data.logs || []} />
            </motion.div>
        </motion.div>
    );
};

export default DashboardPage;
