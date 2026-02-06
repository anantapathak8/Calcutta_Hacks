import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Key,
    Usb,
    Shield,
    ShieldCheck,
    Lock,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    RefreshCw,
    HardDrive,
    AlertTriangle,
    ArrowRight,
    ArrowLeft,
    Loader
} from 'lucide-react';

const HardwareKeySetupPage = () => {
    const [step, setStep] = useState(1);
    const [drives, setDrives] = useState([]);
    const [selectedDrive, setSelectedDrive] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [keyStatus, setKeyStatus] = useState(null);

    // Fetch available USB drives
    const fetchDrives = async () => {
        setScanning(true);
        setError(null);
        try {
            const res = await axios.get('http://localhost:5001/api/hardware-key/drives');
            setDrives(res.data.drives || []);
            if (res.data.drives?.length === 0) {
                setError('No USB drives detected. Please plug in your USB HDD.');
            }
        } catch (err) {
            setError('Failed to detect USB drives. Is the backend running?');
        } finally {
            setScanning(false);
        }
    };

    // Fetch current key status
    const fetchStatus = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/hardware-key/status');
            setKeyStatus(res.data);
        } catch (err) {
            console.error('Error fetching status:', err);
        }
    };

    useEffect(() => {
        fetchDrives();
        fetchStatus();
    }, []);

    // Generate key on selected drive
    const handleGenerateKey = async () => {
        if (!selectedDrive) {
            setError('Please select a USB drive');
            return;
        }
        if (selectedDrive.writable === false) {
            setError('Selected drive is read-only! Please use a different, writable USB drive.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setGenerating(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await axios.post('http://localhost:5001/api/hardware-key/generate', {
                mount_path: selectedDrive.mount_path,
                password: password
            });

            if (res.data.success) {
                setSuccess('Hardware security key generated successfully!');
                setStep(4);
                // Auto-verify
                setTimeout(() => handleVerify(), 1000);
            } else {
                setError(res.data.error || 'Failed to generate key');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate key');
        } finally {
            setGenerating(false);
        }
    };

    // Verify the key
    const handleVerify = async () => {
        setVerifying(true);
        setError(null);

        try {
            const res = await axios.post('http://localhost:5001/api/hardware-key/verify', {
                password: password
            });

            if (res.data.success) {
                setKeyStatus(res.data);
                setSuccess('Hardware key verified and monitoring started!');
            } else {
                setError(res.data.message || 'Verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

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

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
                <React.Fragment key={s}>
                    <div
                        className={`
                            w-10 h-10 rounded-full flex items-center justify-center font-bold
                            transition-all duration-300
                            ${step >= s
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-neon-purple'
                                : 'bg-gray-800 text-gray-500 border border-gray-700'}
                        `}
                    >
                        {step > s ? <CheckCircle size={20} /> : s}
                    </div>
                    {s < 4 && (
                        <div className={`w-12 h-1 rounded ${step > s ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-700'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <motion.div variants={itemVars} className="space-y-6">
            <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mb-4">
                    <Usb size={48} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Select USB Drive</h2>
                <p className="text-gray-400">Choose the USB HDD that will store your hardware security key</p>
            </div>

            <div className="flex justify-center mb-4">
                <button
                    onClick={fetchDrives}
                    disabled={scanning}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
                    {scanning ? 'Scanning...' : 'Refresh Drives'}
                </button>
            </div>

            {drives.length === 0 ? (
                <div className="text-center py-8 bg-gray-900/50 rounded-xl border border-gray-700">
                    <HardDrive size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No USB drives detected</p>
                    <p className="text-gray-500 text-sm mt-2">Please plug in your USB HDD and click refresh</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {drives.map((drive, idx) => (
                        <motion.div
                            key={drive.mount_path}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => drive.writable !== false && setSelectedDrive(drive)}
                            className={`
                                p-4 rounded-xl border-2 transition-all duration-300
                                ${drive.writable === false
                                    ? 'border-gray-700 bg-gray-900/30 cursor-not-allowed opacity-60'
                                    : selectedDrive?.mount_path === drive.mount_path
                                        ? 'border-purple-500 bg-purple-500/10 shadow-neon-purple cursor-pointer'
                                        : 'border-gray-700 bg-gray-900/50 hover:border-purple-500/50 cursor-pointer'}
                            `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${selectedDrive?.mount_path === drive.mount_path ? 'bg-purple-500/30' : 'bg-gray-800'}`}>
                                        <HardDrive size={24} className={selectedDrive?.mount_path === drive.mount_path ? 'text-purple-400' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{drive.name}</h3>
                                        <p className="text-sm text-gray-500">{drive.mount_path}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-400">{drive.size}</p>
                                    {drive.writable === false ? (
                                        <span className="text-xs text-red-400 flex items-center gap-1 justify-end">
                                            <XCircle size={12} /> Read-only
                                        </span>
                                    ) : drive.has_key ? (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1 justify-end">
                                            <Key size={12} /> Key exists
                                        </span>
                                    ) : (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1 justify-end">
                                            <CheckCircle size={12} /> Writable
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => {
                        if (selectedDrive?.writable === false) {
                            setError('Selected drive is read-only! Please plug in a writable USB drive.');
                            return;
                        }
                        setStep(2);
                    }}
                    disabled={!selectedDrive || selectedDrive?.writable === false}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white transition-all hover:shadow-neon-purple disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                    <ArrowRight size={18} />
                </button>
            </div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div variants={itemVars} className="space-y-6">
            <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mb-4">
                    <Lock size={48} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Set Encryption Password</h2>
                <p className="text-gray-400">This password will encrypt your hardware security key</p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password (min 8 characters)"
                        className="w-full px-4 py-3 pr-12 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                </div>

                {/* Password strength indicator */}
                <div className="space-y-2">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                            <div
                                key={level}
                                className={`h-1 flex-1 rounded ${password.length >= level * 3
                                    ? level <= 2 ? 'bg-amber-500' : 'bg-emerald-500'
                                    : 'bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-gray-500">
                        {password.length < 8 ? 'Password too short' :
                            password.length < 12 ? 'Moderate strength' : 'Strong password'}
                    </p>
                </div>

                {password !== confirmPassword && confirmPassword.length > 0 && (
                    <p className="text-red-400 text-sm flex items-center gap-2">
                        <XCircle size={16} />
                        Passwords do not match
                    </p>
                )}
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-800 border border-gray-700 rounded-xl font-bold text-gray-300 hover:bg-gray-700 transition-all"
                >
                    <ArrowLeft size={18} />
                    Back
                </button>
                <button
                    onClick={() => setStep(3)}
                    disabled={password.length < 8 || password !== confirmPassword}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white transition-all hover:shadow-neon-purple disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                    <ArrowRight size={18} />
                </button>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div variants={itemVars} className="space-y-6">
            <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mb-4">
                    <Key size={48} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Confirm & Generate</h2>
                <p className="text-gray-400">Review your settings and generate the hardware key</p>
            </div>

            {/* Summary Card */}
            <div className="max-w-md mx-auto bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-purple-500/10">
                    <h3 className="font-bold text-purple-300">Configuration Summary</h3>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Drive</span>
                        <span className="font-bold text-white">{selectedDrive?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Mount Path</span>
                        <span className="text-sm text-gray-300 font-mono">{selectedDrive?.mount_path}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Key File</span>
                        <span className="text-sm text-purple-400 font-mono">.sentinel_key</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Encryption</span>
                        <span className="text-emerald-400">Fernet (AES-128)</span>
                    </div>
                </div>
            </div>

            {/* Warning */}
            {selectedDrive?.has_key && (
                <div className="max-w-md mx-auto p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-bold text-amber-400">Existing Key Found</h4>
                            <p className="text-sm text-gray-400 mt-1">
                                A key already exists on this drive. Generating a new key will overwrite it.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between pt-4">
                <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-800 border border-gray-700 rounded-xl font-bold text-gray-300 hover:bg-gray-700 transition-all"
                >
                    <ArrowLeft size={18} />
                    Back
                </button>
                <button
                    onClick={handleGenerateKey}
                    disabled={generating}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white transition-all hover:shadow-neon-purple disabled:opacity-50"
                >
                    {generating ? (
                        <>
                            <Loader size={18} className="animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Key size={18} />
                            Generate Key
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div variants={itemVars} className="space-y-6">
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="inline-flex p-4 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl mb-4"
                >
                    <ShieldCheck size={48} className="text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Key Generated!</h2>
                <p className="text-gray-400">Your hardware security key is now active</p>
            </div>

            {/* Success Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-md mx-auto bg-gradient-to-br from-emerald-900/40 to-green-950/30 rounded-xl border-2 border-emerald-500/60 p-6"
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-500/30 rounded-xl">
                        <Shield size={32} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-emerald-400 text-xl">TRUSTED</h3>
                        <p className="text-gray-400 text-sm">System unlocked</p>
                    </div>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle size={16} />
                        <span>Key file created on {selectedDrive?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle size={16} />
                        <span>Encryption verified</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle size={16} />
                        <span>Background monitoring active</span>
                    </div>
                </div>
            </motion.div>

            {/* Info */}
            <div className="max-w-md mx-auto p-4 bg-purple-500/10 border border-purple-500/40 rounded-xl">
                <p className="text-sm text-gray-300">
                    <strong className="text-purple-400">Remember:</strong> Keep your USB drive plugged in while using admin functions.
                    The system will check every 5 seconds. If you unplug the drive, admin access will be revoked.
                </p>
            </div>

            <div className="flex justify-center pt-4">
                <a
                    href="/"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white transition-all hover:shadow-neon-purple"
                >
                    Go to Dashboard
                    <ArrowRight size={18} />
                </a>
            </div>
        </motion.div>
    );

    return (
        <motion.div
            className="p-6 pt-20 lg:pt-6 min-h-screen"
            variants={containerVars}
            initial="hidden"
            animate="show"
        >
            {/* Header */}
            <motion.div
                variants={itemVars}
                className="mb-8 glass-panel rounded-2xl p-6 border-2 border-purple-500/40 shadow-neon-purple relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 animate-gradient-flow" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500 rounded-full filter blur-[80px] opacity-20 animate-pulse" />

                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/20">
                        <Key className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gradient-animate">HARDWARE KEY SETUP</h1>
                        <p className="text-purple-300/70 text-sm mt-1">Configure USB HDD as your hardware security key</p>
                    </div>
                </div>
            </motion.div>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Error/Success Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex items-center gap-3"
                    >
                        <XCircle className="text-red-400 flex-shrink-0" />
                        <p className="text-red-300">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                            <XCircle size={18} />
                        </button>
                    </motion.div>
                )}
                {success && step < 4 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-2xl mx-auto mb-6 p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center gap-3"
                    >
                        <CheckCircle className="text-emerald-400 flex-shrink-0" />
                        <p className="text-emerald-300">{success}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Step Content */}
            <div className="max-w-2xl mx-auto glass-panel rounded-2xl p-8 border border-purple-500/20">
                <AnimatePresence mode="wait">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default HardwareKeySetupPage;
