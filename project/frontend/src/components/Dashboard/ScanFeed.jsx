import { Globe, ShieldCheck, AlertTriangle, Lock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ScanFeed = ({ findings }) => {
    const ports = findings.scans?.ports || [];
    const deauth = findings.scans?.deauth_prediction || {};
    const router = findings.scans?.router || {};

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* PORT SCAN SECTION - Enhanced */}
            <motion.div
                className="bg-gradient-to-br from-red-900/10 to-red-950/20 rounded-xl p-5 border-2 border-red-500/30 relative overflow-hidden backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Animated Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full filter blur-3xl opacity-10 animate-pulse" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h4 className="flex items-center text-[#00f3ff] font-bold text-sm tracking-widest uppercase">
                        <div className="p-2 bg-[#00f3ff]/10 rounded-lg mr-3">
                            <Globe className="w-4 h-4" />
                        </div>
                        Port Vulnerabilities
                    </h4>
                    {ports.length > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs text-red-400 font-bold">{ports.length} OPEN</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                    {ports.length === 0 ? (
                        <div className="text-center py-8">
                            <ShieldCheck className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                            <div className="text-green-400 text-sm font-bold">System Hardened</div>
                            <div className="text-gray-500 text-xs mt-1">No open ports detected</div>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {ports.map((p, i) => (
                                <motion.div
                                    key={`${p.port}-${i}`}
                                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                    transition={{
                                        delay: i * 0.05,
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 20
                                    }}
                                    className="group relative bg-black/40 backdrop-blur-sm border-2 border-red-500/50 rounded-xl p-5 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all duration-300"
                                >
                                    {/* Port Number - LARGE and PROMINENT */}
                                    <div className="flex items-center justify-between gap-4 mb-2">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="bg-red-500/20 px-5 py-2.5 rounded-xl border border-red-500/50 flex-shrink-0">
                                                <span className="text-4xl font-black text-red-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                                                    {p.port}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-base font-bold text-gray-300 uppercase tracking-wide truncate">
                                                    {p.service || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-gray-500 whitespace-nowrap">Service Protocol</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                            <div className="px-4 py-1.5 bg-red-500/20 border border-red-500 rounded-lg whitespace-nowrap">
                                                <span className="text-red-400 font-black text-base uppercase">OPEN</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                <Activity size={14} className="text-red-400 animate-pulse flex-shrink-0" />
                                                <span className="text-xs text-red-400 font-bold">ACTIVE</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Animated pulse effect */}
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50 animate-pulse" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>

            {/* AI INSIGHTS / DEAUTH - Enhanced */}
            <div className="grid grid-cols-1 gap-4 flex-1">
                {/* Signal Integrity AI */}
                <motion.div
                    className={`bg-gradient-to-br ${deauth.status === 'HIGH_RISK'
                        ? 'from-red-900/10 to-red-950/20 border-red-500/30'
                        : 'from-purple-900/10 to-purple-950/20 border-purple-500/30'
                        } rounded-xl p-5 border-2 relative overflow-hidden backdrop-blur-sm`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <h4 className="flex items-center text-purple-400 font-bold text-sm tracking-widest uppercase">
                            <div className="p-2 bg-purple-500/10 rounded-lg mr-3">
                                <Lock className="w-4 h-4" />
                            </div>
                            Signal Integrity AI
                        </h4>
                    </div>

                    <div className="flex items-baseline justify-between mb-4 relative z-10">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">Prediction Probability</div>
                        <motion.div
                            className={`text-5xl font-black font-mono ${deauth.status === 'HIGH_RISK' ? 'text-red-400' : 'text-green-400'
                                } drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]`}
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                        >
                            {deauth.probability || 'Low'}
                        </motion.div>
                    </div>

                    {/* Enhanced Waveform with better animation */}
                    <div className="mt-4 flex items-end gap-1 h-16 w-full relative z-10">
                        {[...Array(25)].map((_, i) => (
                            <motion.div
                                key={i}
                                className={`w-full rounded-t ${deauth.status === 'HIGH_RISK'
                                    ? 'bg-red-500/50'
                                    : 'bg-green-500/50'
                                    }`}
                                animate={{
                                    height: [
                                        `${20 + Math.random() * 60}%`,
                                        `${20 + Math.random() * 60}%`,
                                        `${20 + Math.random() * 60}%`
                                    ]
                                }}
                                transition={{
                                    duration: 1 + Math.random(),
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Gateway Security - Enhanced */}
                <motion.div
                    className="bg-gradient-to-br from-yellow-900/10 to-yellow-950/20 rounded-xl p-5 border-2 border-yellow-500/30 relative overflow-hidden backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <h4 className="flex items-center text-yellow-400 font-bold text-sm tracking-widest uppercase">
                            <div className="p-2 bg-yellow-500/10 rounded-lg mr-3">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            Gateway Security
                        </h4>
                    </div>

                    <div className="space-y-3 relative z-10">
                        <div className="bg-black/40 rounded-lg p-3 border border-yellow-500/30">
                            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Gateway IP</div>
                            <div className="text-xl font-bold text-white font-mono">
                                {router.gateway || 'Scanning...'}
                            </div>
                        </div>

                        {router.issues?.length > 0 ? (
                            <div className="space-y-2">
                                {router.issues.map((iss, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30"
                                    >
                                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                        <span className="text-sm break-words">{iss}</span>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/30">
                                <ShieldCheck size={16} />
                                <span className="text-sm">No vulnerabilities detected</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ScanFeed;
