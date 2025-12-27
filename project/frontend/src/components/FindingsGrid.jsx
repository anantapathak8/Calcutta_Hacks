import { AlertTriangle, Lock, Globe, ShieldCheck } from 'lucide-react';

const FindingsGrid = ({ findings }) => {
    // Flatten findings for display or show categories
    const ports = findings.scans?.ports || [];
    const encryption = findings.scans?.encryption || {};
    const mitm = findings.scans?.mitm || {};
    const deauth = findings.scans?.deauth_prediction || {};
    const router = findings.scans?.router || {};

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ports Card */}
            <div className="bg-cyber-gray p-4 rounded border border-gray-800">
                <h4 className="flex items-center text-cyber-neon mb-2 font-mono">
                    <Globe className="w-4 h-4 mr-2" /> PORT SCAN
                </h4>
                {ports.length === 0 ? (
                    <p className="text-gray-500 text-sm">No exposed ports detected.</p>
                ) : (
                    <ul className="space-y-1">
                        {ports.map((p, i) => (
                            <li key={i} className="text-sm font-mono text-cyber-warning">
                                {p.port} ({p.service}) - {p.state.toUpperCase()}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Network & Router */}
            <div className="bg-cyber-gray p-4 rounded border border-gray-800">
                <h4 className="flex items-center text-cyber-neon mb-2 font-mono">
                    <ShieldCheck className="w-4 h-4 mr-2" /> NETWORK HYGIENE
                </h4>
                <div className="text-sm space-y-1">
                    <p className={encryption.status === 'UNSECURE' ? 'text-cyber-danger' : 'text-cyber-success'}>
                        Protocol: {encryption.status}
                    </p>
                    <p className="text-gray-400">Gateway: {router.gateway || 'N/A'}</p>
                    {router.issues && router.issues.map((iss, i) => (
                        <p key={i} className="text-cyber-danger text-xs">&gt; {iss}</p>
                    ))}
                </div>
            </div>

            {/* MITM */}
            <div className="bg-cyber-gray p-4 rounded border border-gray-800 relative overflow-hidden">
                <h4 className="flex items-center text-cyber-neon mb-2 font-mono">
                    <AlertTriangle className="w-4 h-4 mr-2" /> ARP MONITOR
                </h4>
                <div className={`text-xl font-bold tracking-widest ${mitm.status === 'DANGER' ? 'text-cyber-danger animate-pulse' : 'text-cyber-success'}`}>
                    {mitm.status || 'SAFE'}
                </div>
                {mitm.evidence && (
                    <div className="text-xs text-cyber-danger mt-2">
                        Duplicate MACs detected!
                    </div>
                )}
            </div>

            {/* Deauth */}
            <div className="bg-cyber-gray p-4 rounded border border-gray-800">
                <h4 className="flex items-center text-cyber-neon mb-2 font-mono">
                    <Lock className="w-4 h-4 mr-2" /> SIGNAL INTEGRITY
                </h4>
                <p className="text-sm text-gray-300">
                    Probability of Deauth Attack:
                    <span className={`block text-lg font-bold ${deauth.status === 'HIGH_RISK' ? 'text-cyber-danger' :
                        deauth.status === 'WARNING' ? 'text-cyber-warning' : 'text-cyber-success'
                        }`}>
                        {deauth.probability || 'Low'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default FindingsGrid;
