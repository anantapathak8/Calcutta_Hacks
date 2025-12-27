import { motion } from 'framer-motion';

const NetworkPulse = ({ status }) => {
    const color = status === 'HIGH' ? '#ff003c' : status === 'MEDIUM' ? '#fcee0a' : '#0aff60';

    return (
        <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-lg bg-cyber-dark border border-gray-800">
            <div className="absolute inset-0 bg-black/50 z-0"></div>

            {/* Radar Line */}
            <motion.div
                className="absolute w-1 h-32 bg-gradient-to-b from-transparent via-white to-transparent opacity-50 z-10"
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* Central Pulse */}
            <motion.div
                className="w-12 h-12 rounded-full z-20"
                style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.4, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
            </motion.div>

            <div className="absolute top-2 left-2 text-xs font-mono text-cyber-text z-30">
                NETWORK STATUS: <span style={{ color }}>{status}</span>
            </div>
        </div>
    );
};

export default NetworkPulse;
