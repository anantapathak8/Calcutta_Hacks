import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import RiskGauge from '../components/Dashboard/RiskGauge';
import HardwareStatus from '../components/Dashboard/HardwareStatus';
import ScanFeed from '../components/Dashboard/ScanFeed';
import TerminalLog from '../components/Dashboard/TerminalLog';
import DeauthDetection from '../components/DeauthDetection';
import { Activity, Wifi, ShieldCheck, Zap } from 'lucide-react';

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
            <div className="text-[#00f3ff] font-mono text-xl animate-pulse">
                INITIALIZING SENTINEL SYSTEMS...
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
                staggerChildren: 0.1
            }
        }
    };

    const itemVars = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            className="p-6 pt-20 lg:pt-6 min-h-screen flex flex-col gap-6"
            variants={containerVars}
            initial="hidden"
            animate="show"
        >
            {/* HEADER SECTION */}
            <motion.div variants={itemVars} className="flex justify-between items-end border-b border-gray-800 pb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-wider text-white">OPS DASHBOARD</h1>
                    <p className="text-xs text-[#00f3ff] font-mono">LIVE THREAT MONITORING ACTIVE</p>
                </div>
                <div className="text-xs font-mono text-gray-500">
                    UPTIME: {Math.floor(performance.now() / 1000)}s
                </div>
            </motion.div>

            {/* TOP ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 shrink-0 z-0 relative">
                {/* RISK GAUGE */}
                <motion.div variants={itemVars} className="lg:col-span-3 h-64 lg:h-56">
                    <RiskGauge score={risk_score || 0} />
                </motion.div>

                {/* METRICS */}
                <motion.div variants={itemVars} className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 h-auto lg:h-56">
                    {/* ARP CARD */}
                    <div className={`glass-panel rounded-xl p-4 flex flex-col justify-between cyber-border relative overflow-hidden group min-h-[160px]`}>
                        <div className={`absolute inset-0 opacity-10 ${mitm.status === 'DANGER' ? 'bg-red-500' : 'bg-green-500'}`} />

                        <div className="flex justify-between items-start z-10">
                            <div className="flex items-center gap-2">
                                <Activity size={18} className={mitm.status === 'DANGER' ? 'text-red-500' : 'text-green-500'} />
                                <h3 className="text-xs font-bold text-gray-400">ARP MONITOR</h3>
                            </div>
                            {mitm.status === 'DANGER' && <div className="animate-ping w-2 h-2 bg-red-500 rounded-full" />}
                        </div>

                        <div className="z-10 mt-2">
                            <div className={`text-2xl font-mono font-bold tracking-tighter ${mitm.status === 'DANGER' ? 'text-red-500 text-glow' : 'text-green-400'}`}>
                                {mitm.status === 'DANGER' ? 'COMPROMISED' : 'SECURE'}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">
                                {mitm.status === 'DANGER' ? 'Spoofing Detected' : 'No Anomalies'}
                            </p>
                        </div>
                    </div>

                    {/* WIFI CARD */}
                    <div className={`glass-panel rounded-xl p-4 flex flex-col justify-between cyber-border relative overflow-hidden min-h-[160px]`}>
                        <div className={`absolute inset-0 opacity-10 ${encryption.status === 'UNSECURE' ? 'bg-yellow-500' : 'bg-blue-500'}`} />

                        <div className="flex justify-between items-start z-10">
                            <div className="flex items-center gap-2">
                                <Wifi size={18} className={encryption.status === 'UNSECURE' ? 'text-yellow-500' : 'text-blue-500'} />
                                <h3 className="text-xs font-bold text-gray-400">WIFI SECURITY</h3>
                            </div>
                        </div>

                        <div className="z-10 mt-2">
                            <div className={`text-2xl font-mono font-bold tracking-tighter truncate ${encryption.status === 'UNSECURE' ? 'text-yellow-500' : 'text-blue-400'}`}>
                                {encryption.status === 'UNSECURE' ? 'OPEN' : 'WPA2/3'}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">
                                {encryption.status === 'UNSECURE' ? 'Traffic Visible' : 'Encrypted'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* HARDWARE TRUST */}
                <motion.div variants={itemVars} className="lg:col-span-3 h-64 lg:h-56">
                    <HardwareStatus />
                </motion.div>
            </div>

            {/* MID ROW: DEAUTH DETECTION & FEED */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Deauth Detection Widget */}
                <motion.div variants={itemVars} className="lg:col-span-1">
                    <DeauthDetection />
                </motion.div>

                {/* Live Threat Feed */}
                <motion.div variants={itemVars} className="lg:col-span-2 glass-panel rounded-xl flex flex-col overflow-hidden cyber-border min-h-[400px]">
                    <div className="p-3 border-b border-white/5 bg-black/40 flex justify-between items-center">
                        <h2 className="text-[#00f3ff] font-bold text-sm flex items-center gap-2 shadow-neon-blue">
                            <ShieldCheck size={16} /> LIVE THREAT FEED
                        </h2>
                        <div className="flex gap-2">
                            <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div className="p-4 bg-black/20 overflow-auto flex-1">
                        <ScanFeed findings={data} />
                    </div>
                </motion.div>
            </div>

            {/* BOTTOM ROW: TERMINAL */}
            <motion.div variants={itemVars} className="h-48 shrink-0">
                <TerminalLog logs={data.logs || []} />
            </motion.div>
        </motion.div>
    );
};

export default DashboardPage;
