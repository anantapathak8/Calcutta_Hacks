import React, { useEffect, useState } from 'react';
import { Usb, Unlock, Lock, AlertOctagon } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const HardwareStatus = () => {
    const [status, setStatus] = useState("CHECKING");
    const [isTrusted, setIsTrusted] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get('http://localhost:5001/api/hardware/status');
                if (res.data.status === "TRUSTED") {
                    setIsTrusted(true);
                    setStatus("SECURED");
                } else {
                    setIsTrusted(false);
                    setStatus("UNTRUSTED");
                }
            } catch (error) {
                setStatus("OFFLINE");
                setIsTrusted(false);
            }
        };

        const interval = setInterval(checkStatus, 1000); // Fast poll for responsiveness
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`h-full glass-panel rounded-xl p-4 border relative overflow-hidden flex flex-col items-center justify-center gap-4 transition-colors duration-500 ${isTrusted ? 'border-emerald-500/30' : 'border-red-500/40'}`}>
            {/* Ambient Background Glow */}
            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${isTrusted ? 'from-emerald-500/20 to-transparent' : 'from-red-600/30 to-transparent'}`} />

            <AnimatePresence mode="wait">
                <motion.div
                    key={isTrusted ? "trusted" : "untrusted"}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 ${isTrusted ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10'}`}
                >
                    {isTrusted ? (
                        <Unlock size={32} className="text-emerald-400" />
                    ) : (
                        <Lock size={32} className="text-red-500" />
                    )}

                    {/* Ripple Effect */}
                    <motion.div
                        className={`absolute inset-0 rounded-full border ${isTrusted ? 'border-emerald-500' : 'border-red-500'}`}
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </motion.div>
            </AnimatePresence>

            <div className="z-10 text-center">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">HARDWARE SECURITY MODULE</h3>
                <div className={`text-2xl font-mono font-bold tracking-tighter ${isTrusted ? 'text-emerald-400 text-glow' : 'text-red-500 text-glow'}`}>
                    {status}
                </div>
                {!isTrusted && (
                    <div className="mt-2 text-[10px] text-red-400 bg-red-900/40 px-2 py-1 rounded border border-red-500/30 animate-pulse flex items-center gap-1 justify-center">
                        <AlertOctagon size={10} /> KEY REMOVED
                    </div>
                )}
            </div>

            {/* Visual USB Icon */}
            <div className="absolute top-3 right-3 opacity-50">
                <Usb size={16} className="text-gray-600" />
            </div>
        </div>
    );
};

export default HardwareStatus;
