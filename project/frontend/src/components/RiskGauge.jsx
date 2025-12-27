import { motion } from 'framer-motion';

const RiskGauge = ({ score }) => {
    // 100 max.
    const radius = 40;
    const circumference = 2 * Math.PI * radius; // ~251
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const color = score > 75 ? '#ff003c' : score > 30 ? '#fcee0a' : '#0aff60';

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-cyber-dark rounded-xl border border-gray-800 shadow-lg">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64" cy="64" r={radius}
                        fill="transparent"
                        stroke="#1a1a1a"
                        strokeWidth="8"
                    />
                    <motion.circle
                        cx="64" cy="64" r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1 }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold font-mono text-white">{score}</span>
                </div>
            </div>
            <h3 className="mt-2 text-cyber-dim text-sm uppercase tracking-widest">Risk Score</h3>
        </div>
    );
};

export default RiskGauge;
