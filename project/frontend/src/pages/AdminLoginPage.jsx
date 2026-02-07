import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
    Usb,
    Shield,
    ShieldCheck,
    Fingerprint,
    Loader,
    AlertCircle,
    CheckCircle,
    Lock,
    Unlock,
    HardDrive,
    Scan
} from 'lucide-react';

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, login, checkUsbStatus, usbStatus } = useAuth();

    const [scanning, setScanning] = useState(true);
    const [error, setError] = useState(null);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [scanPhase, setScanPhase] = useState(0); // 0: scanning, 1: detected, 2: verifying, 3: success

    const from = location.state?.from?.pathname || '/';

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // Continuous USB scanning with auto-login
    useEffect(() => {
        let scanInterval;

        const scanForUsb = async () => {
            const status = await checkUsbStatus();

            // Check for tampered signature - show error
            if (status?.status === 'TAMPERED') {
                setError('Hardware key signature has been tampered! Access denied.');
                setScanPhase(0);
                return;
            }

            // If TRUSTED (valid signature), auto-login
            if (status?.status === 'TRUSTED') {
                setScanPhase(1); // detected
                setScanning(false);
                setError(null);

                // Start verification animation
                setTimeout(() => setScanPhase(2), 800);
                
                setTimeout(async () => {
                    const success = await login();
                    if (success) {
                        setScanPhase(3);
                        setLoginSuccess(true);
                        setTimeout(() => {
                            navigate(from, { replace: true });
                        }, 1500);
                    } else {
                        setError('Authentication failed. Signature may be invalid.');
                        setScanPhase(0);
                        setScanning(true);
                    }
                }, 2000);
            } else if (status?.status === 'DETECTED') {
                // USB detected, waiting for signature verification
                setScanPhase(1);
                setError(null);
            }
        };

        if (scanning && !loginSuccess) {
            scanInterval = setInterval(scanForUsb, 2000);
            scanForUsb(); // Initial scan
        }

        return () => {
            if (scanInterval) clearInterval(scanInterval);
        };
    }, [scanning, loginSuccess, checkUsbStatus, login, navigate, from]);

    // Animation variants
    const containerVars = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVars = {
        hidden: { y: 30, opacity: 0 },
        show: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    const renderScanningPhase = () => (
        <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
        >
            {/* Animated USB Icon with Scan Effect */}
            <div className="relative w-48 h-48 mx-auto mb-8">
                {/* Outer scanning rings */}
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-4 rounded-full border-2 border-purple-500/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                <div className="absolute inset-8 rounded-full border-2 border-purple-500/50 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.6s' }} />

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
                        <div className="relative p-6 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-2xl border-2 border-purple-500/50">
                            <Usb size={48} className="text-purple-400" />
                        </div>
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Scanning for USB Key</h2>
            <p className="text-gray-400 mb-6">Please insert your hardware security key</p>

            <div className="flex items-center justify-center gap-2 text-purple-400">
                <Loader size={18} className="animate-spin" />
                <span className="font-mono text-sm">Waiting for device...</span>
            </div>
        </motion.div>
    );

    const renderDetectedPhase = () => (
        <motion.div
            key="detected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
        >
            <div className="relative w-48 h-48 mx-auto mb-8">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[60px] opacity-30 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="p-6 bg-gradient-to-br from-emerald-600/30 to-green-600/30 rounded-2xl border-2 border-emerald-500/50"
                    >
                        <HardDrive size={48} className="text-emerald-400" />
                    </motion.div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-emerald-400 mb-2">USB Key Detected!</h2>
            <p className="text-gray-400 mb-6">
                {usbStatus?.drive_info?.name || 'Hardware Security Key'}
            </p>

            <div className="flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle size={18} />
                <span className="font-mono text-sm">Device recognized</span>
            </div>
        </motion.div>
    );

    const renderVerifyingPhase = () => (
        <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
        >
            <div className="relative w-48 h-48 mx-auto mb-8">
                {/* Fingerprint scan animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500 rounded-full blur-xl opacity-40" />
                        <motion.div
                            animate={{
                                boxShadow: [
                                    '0 0 0 0 rgba(6, 182, 212, 0.5)',
                                    '0 0 0 30px rgba(6, 182, 212, 0)',
                                ]
                            }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="relative p-6 bg-gradient-to-br from-cyan-600/30 to-blue-600/30 rounded-2xl border-2 border-cyan-500/50"
                        >
                            <Fingerprint size={48} className="text-cyan-400" />
                        </motion.div>
                    </div>
                </div>

                {/* Scan line effect */}
                <motion.div
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    initial={{ top: '20%' }}
                    animate={{ top: ['20%', '80%', '20%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                />
            </div>

            <h2 className="text-2xl font-bold text-cyan-400 mb-2">Verifying Identity</h2>
            <p className="text-gray-400 mb-6">Authenticating hardware key...</p>

            <div className="w-64 mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2 }}
                />
            </div>
        </motion.div>
    );

    const renderSuccessPhase = () => (
        <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
        >
            <div className="relative w-48 h-48 mx-auto mb-8">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[60px] opacity-40 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="p-6 bg-gradient-to-br from-emerald-600/30 to-green-600/30 rounded-2xl border-2 border-emerald-500/50"
                    >
                        <ShieldCheck size={48} className="text-emerald-400" />
                    </motion.div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-emerald-400 mb-2">Access Granted!</h2>
            <p className="text-gray-400 mb-6">Welcome to SentinelAI</p>

            <div className="flex items-center justify-center gap-2 text-emerald-400">
                <Unlock size={18} />
                <span className="font-mono text-sm">Redirecting to dashboard...</span>
            </div>
        </motion.div>
    );

    return (
        <motion.div
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0015] via-[#0d0010] to-[#050505] overflow-hidden"
            variants={containerVars}
            initial="hidden"
            animate="show"
        >
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-[150px] opacity-10 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-[150px] opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>

            <motion.div
                variants={itemVars}
                className="relative z-10 w-full max-w-lg"
            >
                {/* Logo/Header */}
                <motion.div variants={itemVars} className="text-center mb-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mb-4 border border-purple-500/30">
                        <Shield size={48} className="text-purple-400" />
                    </div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-2">
                        SENTINEL<span className="text-white">AI</span>
                    </h1>
                    <p className="text-purple-300/70 font-mono text-sm">HARDWARE AUTHENTICATION REQUIRED</p>
                </motion.div>

                {/* Main Card */}
                <motion.div
                    variants={itemVars}
                    className="glass-panel rounded-2xl p-8 border-2 border-purple-500/40 shadow-neon-purple relative overflow-hidden"
                >
                    {/* Animated border glow */}
                    <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-pulse pointer-events-none" />

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                        />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                        <AnimatePresence mode="wait">
                            {scanPhase === 0 && renderScanningPhase()}
                            {scanPhase === 1 && renderDetectedPhase()}
                            {scanPhase === 2 && renderVerifyingPhase()}
                            {scanPhase === 3 && renderSuccessPhase()}
                        </AnimatePresence>

                        {/* Error message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex items-center gap-3"
                                >
                                    <AlertCircle className="text-red-400 flex-shrink-0" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Footer info */}
                <motion.div variants={itemVars} className="text-center mt-6">
                    <p className="text-gray-500 text-sm">
                        <Lock size={14} className="inline mr-1" />
                        Hardware-based authentication for maximum security
                    </p>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default AdminLoginPage;
