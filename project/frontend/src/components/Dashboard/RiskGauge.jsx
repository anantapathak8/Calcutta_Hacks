import { motion } from 'framer-motion';

const RiskGauge = ({ score }) => {
    // 100 max.
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const color = score > 75 ? '#ff003c' : score > 30 ? '#fcee0a' : '#0aff60';
    const glowShadow = `0 0 20px ${color}`;

    return (
        <div className="flex flex-col items-center justify-center p-4 glass-panel rounded-xl cyber-border h-full relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />

            <div className="relative w-36 h-36 z-10">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
                    {/* Background Track */}
                    <circle
                        cx="72" cy="72" r={radius}
                        fill="transparent"
                        stroke="#1a1a1a"
                        strokeWidth="8"
                    />
                    {/* Animated Progress */}
                    <motion.circle
                        cx="72" cy="72" r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                    />
                </svg>

                {/* Score Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        className="text-4xl font-bold font-mono tracking-tighter"
                        style={{ color: color, textShadow: `0 0 10px ${color}` }}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={score}
                    >
                        {score}
                    </motion.span>
                    <span className="text-[10px] text-gray-500 tracking-widest mt-1">RISK LEVEL</span>
                </div>
            </div>

            {/* Pulsing Status Text */}
            <motion.div
                className="mt-4 px-3 py-1 rounded-full text-xs font-bold border"
                style={{ borderColor: `${color}40`, color: color, backgroundColor: `${color}10` }}
                animate={{ boxShadow: [null, `0 0 10px ${color}20`, null] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                {score > 75 ? "CRITICAL THREAT" : score > 30 ? "MODERATE RISK" : "SYSTEM SECURE"}
            </motion.div>
        </div>
    );
};

export default RiskGauge;
