import { Globe, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ScanFeed = ({ findings }) => {
    const ports = findings.scans?.ports || [];
    const deauth = findings.scans?.deauth_prediction || {};
    const router = findings.scans?.router || {};

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* PORT SCAN SECTION */}
            <div className="bg-black/40 rounded p-4 border border-white/5 relative group">
                <div className="absolute inset-0 bg-[#00f3ff]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <h4 className="flex items-center text-[#00f3ff] mb-3 font-mono text-xs tracking-wider border-b border-[#00f3ff]/20 pb-2">
                    <Globe className="w-3 h-3 mr-2" /> PORT VULNERABILITIES
                </h4>

                <div className="space-y-2 h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {ports.length === 0 ? (
                        <div className="text-gray-600 text-xs italic p-2">System hardened. No open ports detected.</div>
                    ) : (
                        <AnimatePresence>
                            {ports.map((p, i) => (
                                <motion.div
                                    key={`${p.port}-${i}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between text-xs bg-red-900/10 border-l-2 border-red-500 pl-3 py-2"
                                >
                                    <span className="font-mono text-red-400">PORT {p.port}</span>
                                    <span className="text-gray-400 uppercase text-[10px]">{p.service}</span>
                                    <span className="text-red-500 font-bold text-[10px]">OPEN</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* AI INSIGHTS / DEAUTH */}
            <div className="flex flex-col gap-4">
                {/* Deauth Monitor */}
                <div className="bg-black/40 rounded p-4 border border-white/5 flex-1 relative overflow-hidden">
                    <h4 className="flex items-center text-purple-400 mb-2 font-mono text-xs tracking-wider">
                        <Lock className="w-3 h-3 mr-2" /> SIGNAL INTEGRITY AI
                    </h4>

                    <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-400">Prediction Probability</div>
                        <div className={`text-xl font-bold ${deauth.status === 'HIGH_RISK' ? 'text-red-500' : 'text-green-400'}`}>
                            {deauth.probability || 'Calculating...'}
                        </div>
                    </div>
                    {/* Simulated Waveform */}
                    <div className="mt-4 flex items-end gap-1 h-12 w-full opacity-50">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className={`w-full bg-${deauth.status === 'HIGH_RISK' ? 'red' : 'green'}-500/50`}
                                animate={{ height: [`${Math.random() * 100}%`, `${Math.random() * 100}%`] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror" }}
                            />
                        ))}
                    </div>
                </div>

                {/* Router Info */}
                <div className="bg-black/40 rounded p-4 border border-white/5 flex-1">
                    <h4 className="flex items-center text-yellow-400 mb-2 font-mono text-xs tracking-wider">
                        <ShieldCheck className="w-3 h-3 mr-2" /> GATEWAY SECURITY
                    </h4>
                    <div className="text-xs font-mono space-y-1 text-gray-400">
                        <p>GATEWAY: <span className="text-white">{router.gateway || 'Scanning...'}</span></p>
                        {router.issues?.length > 0 ? (
                            router.issues.map((iss, i) => (
                                <p key={i} className="text-red-400 flex items-center gap-1">
                                    <AlertTriangle size={10} /> {iss}
                                </p>
                            ))
                        ) : (
                            <p className="text-green-500">No router vulnerabilities found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanFeed;
