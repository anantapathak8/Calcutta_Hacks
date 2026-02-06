import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import RiskGauge from '../components/Dashboard/RiskGauge';
import ScanFeed from '../components/Dashboard/ScanFeed';
import TerminalLog from '../components/Dashboard/TerminalLog';
import DeauthDetection from '../components/DeauthDetection';
import HardwareKeyStatus from '../components/HardwareKeyStatus';
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
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0a0015] to-[#050505]">
            <div className="text-center relative">
                <div className="absolute inset-0 bg-purple-500 blur-[100px] opacity-20 animate-pulse" />
                <Shield className="w-20 h-20 text-purple-400 mx-auto mb-6 animate-pulse drop-shadow-[0_0_20px_rgba(168,85,247,0.8)] relative z-10" />
                <div className="text-gradient-animate font-mono text-2xl font-bold relative z-10">
                    INITIALIZING SENTINEL SYSTEMS...
                </div>
                <div className="mt-3 text-purple-400/60 text-sm relative z-10">Please wait...</div>
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
            className="p-6 pt-20 lg:pt-6 min-h-screen flex flex-col gap-6"
            variants={containerVars}
            initial="hidden"
            animate="show"
        >
            {/* HEADER SECTION - Premium Purple Theme */}
            <motion.div
                variants={itemVars}
                className="group relative flex justify-between items-center glass-panel rounded-2xl p-6 border-2 border-purple-500/40 shadow-neon-purple transition-all duration-500 hover:shadow-neon-pink hover:border-pink-500/60 overflow-hidden"
            >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 animate-gradient-flow" />

                {/* Floating Orbs */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500 rounded-full filter blur-[80px] opacity-20 animate-pulse" />
                <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-pink-500 rounded-full filter blur-[60px] opacity-15 animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Main Content */}
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-neon-purple border border-purple-500/20">
                            <Shield className="w-8 h-8 text-purple-400 animate-pulse transition-transform duration-300 group-hover:rotate-12 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-gradient-animate transition-all duration-300 group-hover:scale-105">
                            OPS DASHBOARD
                        </h1>
                    </div>
                    <div className="flex items-center gap-3 ml-1">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping absolute shadow-[0_0_15px_rgba(168,85,247,1)]" />
                                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full shadow-[0_0_15px_rgba(168,85,247,1)]" />
                            </div>
                            <p className="text-sm text-purple-300 font-mono uppercase tracking-wide transition-all duration-300 group-hover:text-pink-300 group-hover:tracking-wider font-medium">
                                Live Threat Monitoring Active
                            </p>
                        </div>
                    </div>
                </div>

                {/* Uptime Display */}
                <div className="text-right relative z-10">
                    <div className="text-xs font-mono text-purple-400/70 uppercase tracking-widest mb-1.5 transition-colors group-hover:text-pink-400/70 font-semibold">System Uptime</div>
                    <div className="text-3xl font-bold text-gradient font-mono tabular-nums transition-all duration-300 group-hover:scale-110">
                        {Math.floor(performance.now() / 1000)}s
                    </div>
                </div>
            </motion.div>

            {/* TOP ROW - Enhanced with Purple Theme */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {/* RISK GAUGE - Purple Themed */}
                <motion.div variants={itemVars} className="lg:col-span-4 h-full">
                    <div className="group h-full min-h-[300px] relative rounded-2xl border-2 border-purple-500/40 shadow-neon-purple transition-all duration-500 hover:shadow-neon-pink hover:border-pink-500/60 hover:scale-[1.02] overflow-hidden glass-card">
                        {/* Animated Border Glow */}
                        <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-glow-pulse pointer-events-none" />

                        {/* Shimmer Effect on Hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        <RiskGauge score={risk_score || 0} />
                    </div>
                </motion.div>

                {/* SECURITY METRICS - Purple Themed Cards */}
                <motion.div variants={itemVars} className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* HARDWARE KEY STATUS */}
                    <HardwareKeyStatus />
                    {/* ARP MONITOR CARD - Purple Theme */}
                    <div className={`
                        group relative overflow-hidden rounded-2xl p-6
                        bg-gradient-to-br ${mitm.status === 'DANGER'
                            ? 'from-red-900/40 via-orange-950/30 to-black/70 border-red-500/60'
                            : 'from-emerald-900/40 via-green-950/30 to-black/70 border-emerald-500/60'}
                        border-2 backdrop-blur-xl
                        shadow-neon-purple
                        transition-all duration-500 ease-out
                        hover:scale-[1.03] hover:shadow-neon-pink
                        hover:border-purple-500/60
                        min-h-[200px] flex flex-col justify-between
                        cursor-pointer
                    `}>
                        {/* Animated Gradient Overlay */}
                        <div className={`absolute inset-0 opacity-10 bg-gradient-to-tr ${mitm.status === 'DANGER' ? 'from-red-500 via-orange-500 to-red-600' : 'from-emerald-500 via-green-500 to-emerald-600'} animate-gradient-flow`} />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        {/* Animated Border Glow */}
                        <div className={`absolute inset-0 rounded-2xl ${mitm.status === 'DANGER' ? 'shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'shadow-[0_0_30px_rgba(16,185,129,0.4)]'} animate-pulse`} />

                        {/* Multiple Glow Effects */}
                        {mitm.status === 'DANGER' && (
                            <>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full filter blur-3xl opacity-30 animate-pulse" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500 rounded-full filter blur-2xl opacity-25 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </>
                        )}
                        {mitm.status !== 'DANGER' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-500 rounded-full filter blur-3xl opacity-15 animate-pulse" />
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-start z-10 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-3 rounded-xl transform transition-all duration-300
                                    group-hover:scale-110 group-hover:rotate-6
                                    ${mitm.status === 'DANGER'
                                        ? 'bg-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.5)] group-hover:shadow-[0_0_35px_rgba(239,68,68,0.7)]'
                                        : 'bg-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_35px_rgba(16,185,129,0.7)]'}
                                `}>
                                    <Activity size={24} className={`${mitm.status === 'DANGER' ? 'text-red-400' : 'text-emerald-400'} transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_currentColor]`} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest transition-colors group-hover:text-purple-300">ARP Monitor</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 transition-colors group-hover:text-purple-400/70 font-medium">Network Integrity</p>
                                </div>
                            </div>
                            {mitm.status === 'DANGER' && (
                                <div className="flex items-center gap-2 animate-bounce">
                                    <AlertTriangle size={16} className="text-red-400 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute shadow-[0_0_15px_rgba(239,68,68,1)]" />
                                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)]" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="z-10 relative">
                            <div className={`
                                text-4xl font-black tracking-tight mb-2
                                transition-all duration-300
                                group-hover:scale-105
                                ${mitm.status === 'DANGER'
                                    ? 'text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,1)] group-hover:drop-shadow-[0_0_35px_rgba(239,68,68,1)]'
                                    : 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,1)] group-hover:drop-shadow-[0_0_35px_rgba(16,185,129,1)]'}
                            `}>
                                {mitm.status === 'DANGER' ? 'COMPROMISED' : 'SECURE'}
                            </div>
                            <p className="text-sm text-gray-300 uppercase tracking-wide transition-colors group-hover:text-purple-200 font-medium">
                                {mitm.status === 'DANGER' ? '⚠️ ARP Spoofing Detected' : '✓ No Anomalies Detected'}
                            </p>
                        </div>
                    </div>

                    {/* WIFI SECURITY CARD - Purple Theme */}
                    <div className={`
                        group relative overflow-hidden rounded-2xl p-6
                        bg-gradient-to-br ${encryption.status === 'UNSECURE'
                            ? 'from-amber-900/40 via-yellow-950/30 to-black/70 border-amber-500/60'
                            : 'from-cyan-900/40 via-blue-950/30 to-black/70 border-cyan-500/60'}
                        border-2 backdrop-blur-xl
                        shadow-neon-purple
                        transition-all duration-500 ease-out
                        hover:scale-[1.03] hover:shadow-neon-pink
                        hover:border-purple-500/60
                        min-h-[200px] flex flex-col justify-between
                        cursor-pointer
                    `}>
                        {/* Animated Gradient Overlay */}
                        <div className={`absolute inset-0 opacity-10 bg-gradient-to-tr ${encryption.status === 'UNSECURE' ? 'from-amber-500 via-yellow-500 to-amber-600' : 'from-cyan-500 via-blue-500 to-cyan-600'} animate-gradient-flow`} />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        {/* Animated Border Glow */}
                        <div className={`absolute inset-0 rounded-2xl ${encryption.status === 'UNSECURE' ? 'shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'shadow-[0_0_30px_rgba(6,182,212,0.4)]'} animate-pulse`} />

                        {/* Multiple Glow Effects */}
                        {encryption.status === 'UNSECURE' && (
                            <>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full filter blur-3xl opacity-30 animate-pulse" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500 rounded-full filter blur-2xl opacity-25 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </>
                        )}
                        {encryption.status !== 'UNSECURE' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-cyan-500 rounded-full filter blur-3xl opacity-15 animate-pulse" />
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-start z-10 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-3 rounded-xl transform transition-all duration-300
                                    group-hover:scale-110 group-hover:rotate-6
                                    ${encryption.status === 'UNSECURE'
                                        ? 'bg-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.5)] group-hover:shadow-[0_0_35px_rgba(245,158,11,0.7)]'
                                        : 'bg-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.5)] group-hover:shadow-[0_0_35px_rgba(6,182,212,0.7)]'}
                                `}>
                                    <Wifi size={24} className={`${encryption.status === 'UNSECURE' ? 'text-amber-400' : 'text-cyan-400'} transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_currentColor]`} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest transition-colors group-hover:text-purple-300">WiFi Security</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 transition-colors group-hover:text-purple-400/70 font-medium">Encryption Status</p>
                                </div>
                            </div>
                            {encryption.status === 'UNSECURE' && (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping absolute shadow-[0_0_15px_rgba(245,158,11,1)]" />
                                        <div className="w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,1)]" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="z-10 relative">
                            <div className={`
                                text-4xl font-black tracking-tight mb-2
                                transition-all duration-300
                                group-hover:scale-105
                                ${encryption.status === 'UNSECURE'
                                    ? 'text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,1)] group-hover:drop-shadow-[0_0_35px_rgba(245,158,11,1)]'
                                    : 'text-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,1)] group-hover:drop-shadow-[0_0_35px_rgba(6,182,212,1)]'}
                            `}>
                                {encryption.status === 'UNSECURE' ? 'OPEN' : 'WPA2/3'}
                            </div>
                            <p className="text-sm text-gray-300 uppercase tracking-wide transition-colors group-hover:text-purple-200 font-medium">
                                {encryption.status === 'UNSECURE' ? '⚠️ Traffic Visible' : '✓ Encrypted Connection'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* MID ROW: FULL WIDTH CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DEAUTH DETECTION - Enhanced */}
                <motion.div variants={itemVars} className="lg:col-span-1">
                    <div className="h-full min-h-[350px]">
                        <DeauthDetection />
                    </div>
                </motion.div>

                {/* LIVE THREAT FEED - Purple Theme */}
                <motion.div variants={itemVars} className="lg:col-span-1">
                    <div className="group glass-panel rounded-2xl flex flex-col overflow-hidden border-2 border-purple-500/40 shadow-neon-purple h-full min-h-[350px] transition-all duration-500 hover:shadow-neon-pink hover:border-pink-500/60 hover:scale-[1.02] relative">
                        {/* Animated Border Glow */}
                        <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-glow-pulse pointer-events-none" />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        {/* Floating Orb */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500 rounded-full filter blur-3xl opacity-10 animate-pulse pointer-events-none" />

                        <div className="p-4 border-b border-purple-500/30 bg-black/60 backdrop-blur-md relative z-10">
                            <h2 className="text-purple-300 font-bold text-base flex items-center gap-3 uppercase tracking-widest transition-all duration-300 group-hover:text-pink-300 group-hover:tracking-wider">
                                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-neon-purple border border-purple-500/20">
                                    <ShieldCheck size={20} className="transition-transform duration-300 group-hover:rotate-12 drop-shadow-[0_0_10px_currentColor]" />
                                </div>
                                Live Threat Feed
                                <div className="ml-auto flex items-center gap-2">
                                    <div className="relative">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping absolute shadow-[0_0_10px_rgba(168,85,247,1)]" />
                                        <div className="w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,1)]" />
                                    </div>
                                    <span className="text-xs text-purple-400/80 transition-colors group-hover:text-pink-400/80 font-medium">ACTIVE</span>
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
