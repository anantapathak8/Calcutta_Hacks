import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Play, X, CheckCircle, AlertTriangle, Terminal } from 'lucide-react';
import { io } from 'socket.io-client';
import '../styles/HotspotGeneratorPage.css';

const HotspotGeneratorPage = () => {
    const [command, setCommand] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [executionResult, setExecutionResult] = useState(null);
    const [capabilities, setCapabilities] = useState(null);
    const [showPasswordMask, setShowPasswordMask] = useState(true);
    const [executionStatus, setExecutionStatus] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    
    const socketRef = useRef(null);

    const exampleCommands = [
        "Create a WPA2 network mynet32 in 2.4 ghz and password will be 27273259",
        "Make a secure hotspot called GuestNet on 5GHz with password SecurePass123",
        "Setup an open WiFi network named PublicAccess on 2.4 GHz"
    ];

    useEffect(() => {
        // Initialize WebSocket connection
        socketRef.current = io('http://localhost:5001/hotspot', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        // Connection event handlers
        socketRef.current.on('connect', () => {
            console.log('WebSocket connected');
            setSocketConnected(true);
            setError(null);
        });

        socketRef.current.on('disconnect', () => {
            console.log('WebSocket disconnected');
            setSocketConnected(false);
        });

        socketRef.current.on('connected', (data) => {
            console.log('Server confirmed connection:', data);
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setSocketConnected(false);
            setError('Connection error. Make sure the backend is running.');
        });

        // Register event listeners for hotspot operations
        socketRef.current.on('parse_result', handleParseResult);
        socketRef.current.on('parse_status', handleParseStatus);
        socketRef.current.on('execution_result', handleExecutionResult);
        socketRef.current.on('execution_status', handleExecutionStatus);
        socketRef.current.on('stop_result', handleStopResult);
        socketRef.current.on('capabilities', handleCapabilitiesResult);
        socketRef.current.on('error', handleSocketError);

        // Load system capabilities on mount
        fetchCapabilities();

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const handleParseStatus = (data) => {
        console.log('Parse status:', data);
        setExecutionStatus(data.message);
    };

    const handleParseResult = (data) => {
        console.log('Parse result:', data);
        setParsedData(data);
        if (data.clarification) {
            setError(data.clarification);
        }
        setIsLoading(false);
        setExecutionStatus(null);
    };

    const handleExecutionStatus = (data) => {
        console.log('Execution status:', data);
        setExecutionStatus(data.message);
        
        if (data.requires_sudo) {
            setError('Elevated permissions required. You may be prompted for your password.');
        }
    };

    const handleExecutionResult = (data) => {
        console.log('Execution result:', data);
        setExecutionResult(data);
        if (data.status === 'error') {
            setError(data.message);
        }
        setIsLoading(false);
        setExecutionStatus(null);
    };

    const handleStopResult = (data) => {
        console.log('Stop result:', data);
        setExecutionResult(data);
        if (data.status === 'error') {
            setError(data.message);
        }
        setIsLoading(false);
        setExecutionStatus(null);
    };

    const handleCapabilitiesResult = (data) => {
        console.log('Capabilities:', data);
        setCapabilities(data);
    };

    const handleSocketError = (data) => {
        console.error('Socket error:', data);
        setError(data.error);
        setIsLoading(false);
        setExecutionStatus(null);
    };

    const fetchCapabilities = () => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('get_capabilities');
        }
    };

    const handleParseCommand = () => {
        if (!command.trim()) {
            setError('Please enter a command');
            return;
        }

        if (!socketRef.current || !socketRef.current.connected) {
            setError('Not connected to server. Please check your connection.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setParsedData(null);
        setExecutionStatus('Sending command to server...');

        socketRef.current.emit('parse_command', { command });
    };

    const handleExecute = (dryRun = false) => {
        if (!parsedData || !parsedData.validation.valid) {
            setError('Cannot execute: parameters are invalid');
            return;
        }

        if (!socketRef.current || !socketRef.current.connected) {
            setError('Not connected to server. Please check your connection.');
            return;
        }

        setIsLoading(true);
        setExecutionResult(null);
        setError(null);
        setExecutionStatus('Preparing to create hotspot...');

        const params = {
            ...parsedData.validation.sanitized_params,
            dry_run: dryRun
        };

        socketRef.current.emit('execute_hotspot', params);
    };

    const handleStopHotspot = () => {
        if (!socketRef.current || !socketRef.current.connected) {
            setError('Not connected to server. Please check your connection.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setExecutionStatus('Stopping hotspot...');

        socketRef.current.emit('stop_hotspot');
    };

    const handleClear = () => {
        setCommand('');
        setParsedData(null);
        setError(null);
        setExecutionResult(null);
        setExecutionStatus(null);
    };

    return (
        <div className="hotspot-generator-page">
            <div className="page-header">
                <div className="header-icon">
                    <Wifi className="w-10 h-10" />
                </div>
                <div>
                    <h1 className="page-title">NLP Hotspot Generator</h1>
                    <p className="page-subtitle">Create Wi-Fi hotspots using natural language commands</p>
                </div>
                <div className="connection-status">
                    <span className={`status-indicator ${socketConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        {socketConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Real-time Execution Status */}
            {executionStatus && (
                <div className="alert alert-info">
                    <Terminal className="w-5 h-5 animate-pulse" />
                    <span>{executionStatus}</span>
                </div>
            )}

            {/* System Capabilities Card */}
            {capabilities && (
                <div className={`capability-card ${capabilities.supports_ap ? 'capable' : 'not-capable'}`}>
                    <div className="capability-header">
                        <span className="capability-label">System Status</span>
                        {capabilities.supports_ap ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        )}
                    </div>
                    <div className="capability-details">
                        <div className="capability-item">
                            <span className="label">OS:</span>
                            <span className="value">{capabilities.os}</span>
                        </div>
                        <div className="capability-item">
                            <span className="label">Tool:</span>
                            <span className="value">{capabilities.command_tool || 'N/A'}</span>
                        </div>
                        <div className="capability-item">
                            <span className="label">Adapter:</span>
                            <span className="value">{capabilities.adapter || 'None detected'}</span>
                        </div>
                        <div className="capability-item">
                            <span className="label">Hotspot Support:</span>
                            <span className={`badge ${capabilities.supports_ap ? 'badge-success' : 'badge-error'}`}>
                                {capabilities.supports_ap ? 'YES' : 'NO'}
                            </span>
                        </div>
                    </div>
                    {capabilities.errors && capabilities.errors.length > 0 && (
                        <div className="capability-errors">
                            {capabilities.errors.map((err, idx) => (
                                <div key={idx} className="error-item">{err}</div>
                            ))}
                        </div>
                    )}
                    {capabilities.warnings && capabilities.warnings.length > 0 && (
                        <div className="capability-warnings">
                            {capabilities.warnings.map((warn, idx) => (
                                <div key={idx} className="warning-item">{warn}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Command Input Section */}
            <div className="input-section">
                <div className="section-header">
                    <Terminal className="w-6 h-6 text-cyan-400" />
                    <h2>Natural Language Command</h2>
                </div>

                <div className="input-wrapper">
                    <textarea
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="Describe the Wi-Fi hotspot you want to create..."
                        className="command-input"
                        rows="3"
                    />

                    <div className="example-chips">
                        <span className="chip-label">Examples:</span>
                        {exampleCommands.map((example, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCommand(example)}
                                className="example-chip"
                            >
                                {example.substring(0, 50)}...
                            </button>
                        ))}
                    </div>

                    <div className="input-actions">
                        <button
                            onClick={handleParseCommand}
                            disabled={isLoading || !command.trim()}
                            className="btn btn-primary"
                        >
                            {isLoading ? 'Parsing...' : 'Parse Command'}
                        </button>
                        <button
                            onClick={handleClear}
                            className="btn btn-secondary"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="alert alert-error">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Parsed Parameters Preview */}
            {parsedData && parsedData.validation.valid && (
                <div className="parameters-section">
                    <div className="section-header">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        <h2>Extracted Parameters</h2>
                        <span className="confidence-badge">
                            Confidence: {(parsedData.confidence * 100).toFixed(0)}%
                        </span>
                    </div>

                    <div className="params-grid">
                        <div className="param-card">
                            <label>Network Name (SSID)</label>
                            <div className="param-value ssid-value">
                                {parsedData.validation.sanitized_params.ssid}
                            </div>
                        </div>

                        <div className="param-card">
                            <label>Security Type</label>
                            <div className="param-value security-badge">
                                <span className={`badge security-${parsedData.validation.sanitized_params.security.toLowerCase()}`}>
                                    {parsedData.validation.sanitized_params.security}
                                </span>
                            </div>
                        </div>

                        <div className="param-card">
                            <label>Frequency Band</label>
                            <div className="param-value band-badge">
                                <span className="badge badge-band">
                                    {parsedData.validation.sanitized_params.band}
                                </span>
                            </div>
                        </div>

                        {parsedData.validation.sanitized_params.password && (
                            <div className="param-card">
                                <label>Password</label>
                                <div className="param-value password-value">
                                    <span>
                                        {showPasswordMask
                                            ? '••••••••••••'
                                            : parsedData.validation.sanitized_params.password}
                                    </span>
                                    <button
                                        onClick={() => setShowPasswordMask(!showPasswordMask)}
                                        className="toggle-password"
                                    >
                                        {showPasswordMask ? 'Show' : 'Hide'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {parsedData.validation.warnings && parsedData.validation.warnings.length > 0 && (
                        <div className="warnings-list">
                            {parsedData.validation.warnings.map((warn, idx) => (
                                <div key={idx} className="warning-item">⚠️ {warn}</div>
                            ))}
                        </div>
                    )}

                    {/* Execution Controls */}
                    <div className="execution-controls">
                        <button
                            onClick={() => handleExecute(false)}
                            disabled={isLoading}
                            className="btn btn-success btn-lg"
                        >
                            <Play className="w-5 h-5" />
                            Create Hotspot
                        </button>

                        <button
                            onClick={() => handleExecute(true)}
                            disabled={isLoading}
                            className="btn btn-info"
                        >
                            Dry Run (Preview Only)
                        </button>
                    </div>
                </div>
            )}

            {/* Execution Result */}
            {executionResult && (
                <div className={`result-section result-${executionResult.status}`}>
                    {executionResult.status === 'success' && executionResult.ssid && !executionResult.dry_run ? (
                        /* Success - Hotspot Active */
                        <div className="success-container">
                            <div className="success-icon-wrapper">
                                <CheckCircle className="w-16 h-16 text-green-400 animate-success" />
                            </div>

                            <h2 className="success-title">Hotspot Created Successfully! 🎉</h2>

                            <div className="hotspot-status-card">
                                <div className="status-header">
                                    <div className="hotspot-name-display">
                                        <Wifi className="w-8 h-8 text-cyan-400" />
                                        <div className="hotspot-details">
                                            <span className="hotspot-label">Hotspot Name</span>
                                            <span className="hotspot-name">{executionResult.ssid}</span>
                                        </div>
                                    </div>
                                    <div className="status-badge-wrapper">
                                        <span className="status-badge active">
                                            <span className="pulse-dot"></span>
                                            ACTIVE
                                        </span>
                                    </div>
                                </div>

                                <div className="connection-details">
                                    <h3 className="connection-title">
                                        <Terminal className="w-5 h-5" />
                                        Connection Information
                                    </h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Network Name (SSID):</span>
                                            <span className="info-value">{executionResult.ssid}</span>
                                        </div>
                                        {parsedData && parsedData.validation.sanitized_params.security && (
                                            <div className="info-item">
                                                <span className="info-label">Security:</span>
                                                <span className="info-value">{parsedData.validation.sanitized_params.security}</span>
                                            </div>
                                        )}
                                        {parsedData && parsedData.validation.sanitized_params.band && (
                                            <div className="info-item">
                                                <span className="info-label">Frequency:</span>
                                                <span className="info-value">{parsedData.validation.sanitized_params.band}</span>
                                            </div>
                                        )}
                                        {parsedData && parsedData.validation.sanitized_params.password && (
                                            <div className="info-item password-item">
                                                <span className="info-label">Password:</span>
                                                <span className="info-value password-display">
                                                    {showPasswordMask ? '••••••••••••' : parsedData.validation.sanitized_params.password}
                                                    <button
                                                        onClick={() => setShowPasswordMask(!showPasswordMask)}
                                                        className="toggle-password-inline"
                                                    >
                                                        {showPasswordMask ? 'Show' : 'Hide'}
                                                    </button>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="connection-instructions">
                                        <p>✨ Your hotspot is now broadcasting! Other devices can connect using the credentials above.</p>
                                    </div>
                                </div>

                                <div className="action-buttons">
                                    <button
                                        onClick={handleStopHotspot}
                                        className="btn btn-danger btn-lg"
                                    >
                                        <X className="w-5 h-5" />
                                        Stop Hotspot
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : executionResult.dry_run ? (
                        /* Dry Run Result */
                        <div>
                            <div className="result-header">
                                <CheckCircle className="w-6 h-6 text-blue-400" />
                                <h2>{executionResult.message}</h2>
                            </div>
                            <div className="dry-run-notice">
                                <strong>DRY RUN:</strong> No actual changes were made to your system
                            </div>
                            {executionResult.command && (
                                <div className="command-preview">
                                    <strong>Command that would be executed:</strong>
                                    <code>{executionResult.command}</code>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Error or Other Status */
                        <div className="result-header">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                            <h2>{executionResult.message}</h2>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HotspotGeneratorPage;
