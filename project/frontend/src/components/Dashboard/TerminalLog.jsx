import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const TerminalLog = ({ logs }) => {
    const bottomRef = useRef(null);

    // Auto-scroll disabled by user request
    // useEffect(() => {
    //     bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // }, [logs]);

    return (
        <div className="bg-black/80 border border-white/10 rounded-xl p-3 font-mono text-[10px] h-full overflow-hidden flex flex-col relative shadow-inner shadow-black/50">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                <div className="text-gray-500 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    &gt; SYSTEM_LOGS_V2.0
                </div>
                <div className="text-[9px] text-gray-600">AUTO-SCROLL: OFF</div>
            </div>

            {/* Log Content */}
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar px-1">
                {logs.length === 0 && <span className="text-gray-700 italic">Waiting for system events...</span>}
                {logs.map((log, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="break-all flex gap-2 hover:bg-white/5 p-0.5 rounded transition-colors"
                    >
                        <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                        <span
                            className={
                                log.type === 'CRITICAL' ? 'text-red-500 font-bold' :
                                    log.type === 'ACTION' ? 'text-green-400' :
                                        log.type === 'WARNING' ? 'text-yellow-400' :
                                            'text-[#00f3ff]' // Neon Cyan default
                            }
                        >
                            <span className="opacity-50 mr-1">&gt;</span>
                            {log.message}
                        </span>
                    </motion.div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-scanline opacity-5" />
        </div>
    );
};

export default TerminalLog;
