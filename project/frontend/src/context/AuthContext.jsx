import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const POLL_INTERVAL = 3000; // Check USB status every 3 seconds
const GRACE_PERIOD = 5000; // 5 second grace period before logout

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [usbStatus, setUsbStatus] = useState(null);
    const [graceCountdown, setGraceCountdown] = useState(null);
    const [auditLog, setAuditLog] = useState([]);

    // Add audit log entry
    const addAuditEntry = useCallback((action, details = {}) => {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            ...details
        };
        setAuditLog(prev => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
        console.log(`[AUDIT] ${action}:`, details);
    }, []);

    // Check USB status from backend
    const checkUsbStatus = useCallback(async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/hardware-key/status');
            const status = res.data;
            setUsbStatus(status);
            return status;
        } catch (error) {
            console.error('Error checking USB status:', error);
            return null;
        }
    }, []);

    // Login function - called when USB is detected
    const login = useCallback(async () => {
        const status = await checkUsbStatus();

        if (status?.status === 'TRUSTED' || status?.status === 'DETECTED') {
            setIsAuthenticated(true);
            setGraceCountdown(null);
            localStorage.setItem('sentinelAuth', 'true');
            localStorage.setItem('sentinelAuthTime', new Date().toISOString());
            addAuditEntry('LOGIN_SUCCESS', {
                drive: status?.drive_info?.name || 'Unknown',
                method: 'USB_KEY'
            });
            return true;
        }

        addAuditEntry('LOGIN_FAILED', { reason: 'USB not detected or not trusted' });
        return false;
    }, [checkUsbStatus, addAuditEntry]);

    // Logout function
    const logout = useCallback((reason = 'manual') => {
        setIsAuthenticated(false);
        setGraceCountdown(null);
        localStorage.removeItem('sentinelAuth');
        localStorage.removeItem('sentinelAuthTime');
        addAuditEntry('LOGOUT', { reason });
    }, [addAuditEntry]);

    // Check if USB is still connected (continuous monitoring)
    useEffect(() => {
        let pollInterval;
        let graceTimeout;

        const monitor = async () => {
            if (!isAuthenticated) return;

            const status = await checkUsbStatus();

            // Check if USB is still trusted
            const isStillTrusted = status?.status === 'TRUSTED' || status?.status === 'DETECTED';

            if (!isStillTrusted && isAuthenticated) {
                // USB removed - start grace period
                if (graceCountdown === null) {
                    addAuditEntry('USB_REMOVED', { message: 'Starting grace period' });
                    setGraceCountdown(5);

                    // Start countdown
                    let countdown = 5;
                    const countdownInterval = setInterval(() => {
                        countdown -= 1;
                        setGraceCountdown(countdown);

                        if (countdown <= 0) {
                            clearInterval(countdownInterval);
                            logout('usb_removed');
                        }
                    }, 1000);

                    graceTimeout = setTimeout(() => {
                        clearInterval(countdownInterval);
                    }, GRACE_PERIOD + 1000);
                }
            } else if (isStillTrusted && graceCountdown !== null) {
                // USB reconnected during grace period
                setGraceCountdown(null);
                addAuditEntry('USB_RECONNECTED', { message: 'Grace period cancelled' });
            }
        };

        if (isAuthenticated) {
            pollInterval = setInterval(monitor, POLL_INTERVAL);
            monitor(); // Initial check
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
            if (graceTimeout) clearTimeout(graceTimeout);
        };
    }, [isAuthenticated, graceCountdown, checkUsbStatus, logout, addAuditEntry]);

    // Initial auth check on mount
    useEffect(() => {
        const initAuth = async () => {
            const savedAuth = localStorage.getItem('sentinelAuth');

            if (savedAuth === 'true') {
                // Verify USB is still connected
                const status = await checkUsbStatus();
                if (status?.status === 'TRUSTED' || status?.status === 'DETECTED') {
                    setIsAuthenticated(true);
                    addAuditEntry('SESSION_RESTORED', { message: 'Previous session restored' });
                } else {
                    localStorage.removeItem('sentinelAuth');
                    addAuditEntry('SESSION_INVALID', { reason: 'USB not present' });
                }
            }

            setIsLoading(false);
        };

        initAuth();
    }, [checkUsbStatus, addAuditEntry]);

    const value = {
        isAuthenticated,
        isLoading,
        usbStatus,
        graceCountdown,
        auditLog,
        login,
        logout,
        checkUsbStatus,
        addAuditEntry
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
