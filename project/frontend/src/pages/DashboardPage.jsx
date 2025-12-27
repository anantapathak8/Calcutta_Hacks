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
            {/* HEADER SECTION - Enhanced */}
            <motion.div
                variants={itemVars}
                className="flex justify-between items-center bg-black/40 backdrop-blur-md border-2 border-[#00f3ff]/30 rounded-xl p-6 shadow-[0_0_40px_rgba(0,243,255,0.2)]"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-8 h-8 text-[#00f3ff] animate-pulse" />
                        <h1 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#00a8ff]">
                            OPS DASHBOARD
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-pulse shadow-[0_0_10px_#00f3ff]" />
                            <p className="text-sm text-[#00f3ff] font-mono uppercase tracking-wider">
                                Live Threat Monitoring Active
                            </p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">System Uptime</div>
                    <div className="text-2xl font-bold text-[#00f3ff] font-mono tabular-nums">
                        {Math.floor(performance.now() / 1000)}s
                    </div>
                </div>
            </motion.div>

            {/* TOP ROW - Redesigned with better spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {/* RISK GAUGE - Larger */}
                <motion.div variants={itemVars} className="lg:col-span-4 h-full">
                    <div className="h-full min-h-[300px]">
                        <RiskGauge score={risk_score || 0} />
                    </div>
                </motion.div>

                {/* SECURITY METRICS - Enhanced Cards */}
                <motion.div variants={itemVars} className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* ARP MONITOR CARD - Redesigned */}
                    <div className={`
                        relative overflow-hidden rounded-2xl p-6
                        bg-gradient-to-br ${mitm.status === 'DANGER'
                            ? 'from-red-900/20 to-red-950/40 border-red-500/50'
                            : 'from-green-900/20 to-green-950/40 border-green-500/50'}
                        border-2 backdrop-blur-md
                        shadow-[0_0_30px_rgba(0,243,255,0.15)]
                        transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(0,243,255,0.3)]
                        min-h-[200px] flex flex-col justify-between
                    `}>
                        {/* Animated Background */}
                        <div className={`absolute inset-0 opacity-5 ${mitm.status === 'DANGER' ? 'bg-red-500' : 'bg-green-500'}`} />

                        {/* Glow Effect */}
                        {mitm.status === 'DANGER' && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-start z-10 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-3 rounded-xl
                                    ${mitm.status === 'DANGER'
                                        ? 'bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                        : 'bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]'}
                                `}>
                                    <Activity size={24} className={mitm.status === 'DANGER' ? 'text-red-400' : 'text-green-400'} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">ARP Monitor</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Network Integrity</p>
                                </div>
                            </div>
                            {mitm.status === 'DANGER' && (
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-red-400 animate-pulse" />
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="z-10">
                            <div className={`
                                text-4xl font-black tracking-tight mb-2
                                ${mitm.status === 'DANGER'
                                    ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                                    : 'text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]'}
                            `}>
                                {mitm.status === 'DANGER' ? 'COMPROMISED' : 'SECURE'}
                            </div>
                            <p className="text-sm text-gray-400 uppercase tracking-wide">
                                {mitm.status === 'DANGER' ? '⚠️ ARP Spoofing Detected' : '✓ No Anomalies Detected'}
                            </p>
                        </div>
                    </div>

                    {/* WIFI SECURITY CARD - Redesigned */}
                    <div className={`
                        relative overflow-hidden rounded-2xl p-6
                        bg-gradient-to-br ${encryption.status === 'UNSECURE'
                            ? 'from-yellow-900/20 to-yellow-950/40 border-yellow-500/50'
                            : 'from-blue-900/20 to-blue-950/40 border-blue-500/50'}
                        border-2 backdrop-blur-md
                        shadow-[0_0_30px_rgba(0,243,255,0.15)]
                        transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(0,243,255,0.3)]
                        min-h-[200px] flex flex-col justify-between
                    `}>
                        {/* Animated Background */}
                        <div className={`absolute inset-0 opacity-5 ${encryption.status === 'UNSECURE' ? 'bg-yellow-500' : 'bg-blue-500'}`} />

                        {/* Glow Effect */}
                        {encryption.status === 'UNSECURE' && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-start z-10 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-3 rounded-xl
                                    ${encryption.status === 'UNSECURE'
                                        ? 'bg-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                                        : 'bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}
                                `}>
                                    <Wifi size={24} className={encryption.status === 'UNSECURE' ? 'text-yellow-400' : 'text-blue-400'} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">WiFi Security</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Encryption Status</p>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="z-10">
                            <div className={`
                                text-4xl font-black tracking-tight mb-2
                                ${encryption.status === 'UNSECURE'
                                    ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]'
                                    : 'text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]'}
                            `}>
                                {encryption.status === 'UNSECURE' ? 'OPEN' : 'WPA2/3'}
                            </div>
                            <p className="text-sm text-gray-400 uppercase tracking-wide">
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

                {/* LIVE THREAT FEED - Enhanced */}
                <motion.div variants={itemVars} className="lg:col-span-1">
                    <div className="glass-panel rounded-2xl flex flex-col overflow-hidden border-2 border-[#00f3ff]/30 shadow-[0_0_40px_rgba(0,243,255,0.2)] h-full min-h-[350px]">
                        <div className="p-4 border-b border-[#00f3ff]/20 bg-black/60 backdrop-blur-md">
                            <h2 className="text-[#00f3ff] font-bold text-base flex items-center gap-3 uppercase tracking-widest">
                                <div className="p-2 bg-[#00f3ff]/10 rounded-lg">
                                    <ShieldCheck size={20} />
                                </div>
                                Live Threat Feed
                                <div className="ml-auto flex items-center gap-2">
                                    <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-pulse shadow-[0_0_10px_#00f3ff]" />
                                    <span className="text-xs text-gray-400">ACTIVE</span>
                                </div>
                            </h2>
                        </div>
                        <div className="p-4 bg-black/40 backdrop-blur-sm overflow-auto flex-1">
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
