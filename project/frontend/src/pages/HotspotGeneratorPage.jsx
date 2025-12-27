import React, { useState, useEffect } from 'react';
import { Wifi, Play, X, CheckCircle, AlertTriangle, Terminal } from 'lucide-react';
import '../styles/HotspotGeneratorPage.css';

const HotspotGeneratorPage = () => {
    const [command, setCommand] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [executionResult, setExecutionResult] = useState(null);
    const [capabilities, setCapabilities] = useState(null);
    const [showPasswordMask, setShowPasswordMask] = useState(true);

    const exampleCommands = [
        "Create a WPA2 network mynet32 in 2.4 ghz and password will be 27273259",
        "Make a secure hotspot called GuestNet on 5GHz with password SecurePass123",
        "Setup an open WiFi network named PublicAccess on 2.4 GHz"
    ];

    useEffect(() => {
        // Load system capabilities on mount
        fetchCapabilities();
    }, []);

    const fetchCapabilities = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/set7/capabilities');
            const data = await response.json();
            setCapabilities(data);
        } catch (err) {
            console.error('Error fetching capabilities:', err);
        }
    };

    const handleParseCommand = async () => {
        if (!command.trim()) {
            setError('Please enter a command');
            return;
        }

        setIsLoading(true);
        setError(null);
        setParsedData(null);

        try {
            const response = await fetch('http://localhost:5001/api/set7/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command }),
            });

            const data = await response.json();

            if (response.ok) {
                setParsedData(data);
                if (data.clarification) {
                    setError(data.clarification);
                }
            } else {
                setError(data.error || 'Failed to parse command');
            }
        } catch (err) {
            setError('Connection error. Make sure the backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecute = async (dryRun = false) => {
        if (!parsedData || !parsedData.validation.valid) {
            setError('Cannot execute: parameters are invalid');
            return;
        }

        setIsLoading(true);
        setExecutionResult(null);
        setError(null);

        try {
            const params = {
                ...parsedData.validation.sanitized_params,
                dry_run: dryRun
            };

            const response = await fetch('http://localhost:5001/api/set7/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const data = await response.json();

            if (response.ok || response.status === 403) {
                setExecutionResult(data);
                if (data.status === 'error') {
                    setError(data.message);
                }
            } else {
                setError(data.message || 'Execution failed');
            }
        } catch (err) {
            setError('Connection error. Make sure the backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopHotspot = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5001/api/set7/stop', {
                method: 'POST',
            });

            const data = await response.json();
            setExecutionResult(data);

            if (data.status === 'error') {
                setError(data.message);
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setCommand('');
        setParsedData(null);
        setError(null);
        setExecutionResult(null);
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
            </div>

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
