import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import NetworkPulse from '../components/NetworkPulse';
import RiskGauge from '../components/RiskGauge';
import FindingsGrid from '../components/FindingsGrid';
import AIExplanation from '../components/AIExplanation';
import MCPConsole from '../components/MCPConsole';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            // In real scenario this points to localhost:5001/api/findings
            // We need to proxy or use full URL
            const res = await axios.get('http://localhost:5001/api/findings');
            setData(res.data);

            // Synthesize logs for demo (or fetch from backend if endpoint exists)
            // For now we just append a "Scan complete" log locally if data refreshes
            const newLog = {
                timestamp: new Date().toLocaleTimeString(),
                message: `Scan cycle completed. Risk: ${res.data.risk_score}`,
                type: 'INFO'
            };

            // If MCP executed something
            if (res.data.mcp_results && res.data.mcp_results.length > 0) {
                res.data.mcp_results.forEach(m => {
                    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `MCP: ${m.command}`, type: 'ACTION' }]);
                });
            } else {
                setLogs(prev => [...prev.slice(-50), newLog]);
            }

        } catch (err) {
            console.error(err);
            setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: "Connection to backend failed", type: 'CRITICAL' }]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s (scans are 60s, but we want to catch it when it writes)
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) return <div className="h-screen bg-cyber-black flex items-center justify-center text-cyber-neon">INITIALIZING SENTINEL...</div>;

    return (
        <div className="min-h-screen bg-cyber-black text-gray-200 p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
            <div className="animate-scanline"></div>

            <header className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold font-mono text-white tracking-tighter">
                        SENTINEL<span className="text-cyber-neon">AI</span>
                    </h1>
                    <p className="text-xs text-cyber-dim uppercase tracking-widest">Autonomous Network Security Dashboard</p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500">SYSTEM TIME</div>
                    <div className="font-mono text-cyber-neon">{new Date().toLocaleTimeString()}</div>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Status & AI */}
                <div className="space-y-6">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                        <NetworkPulse status={data?.risk_level || 'UNKNOWN'} />
                    </motion.div>

                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                        <div className="bg-cyber-gray rounded-lg p-6 border border-gray-800 flex flex-col items-center">
                            <RiskGauge score={data?.risk_score || 0} />
                        </div>
                    </motion.div>

                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                        <AIExplanation text={data?.ai_explanation} />
                    </motion.div>
                </div>

                {/* Middle Col: Findings */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                        <h2 className="text-cyber-neon font-mono mb-4 text-sm border-l-2 border-cyber-neon pl-2">REAL-TIME FINDINGS</h2>
                        <FindingsGrid findings={data?.findings || data || {}} />
                    </motion.div>

                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                        <h2 className="text-cyber-success font-mono mb-4 text-sm border-l-2 border-cyber-success pl-2">MCP LIVE EXECUTION LOG</h2>
                        <MCPConsole logs={logs} />
                    </motion.div>
                </div>

            </main>
        </div>
    );
};

export default Dashboard;
