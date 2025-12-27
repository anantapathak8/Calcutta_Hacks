import { useState } from 'react';
import '../styles/SubnetDesignerPage.css';

const SubnetDesignerPage = () => {
    const [inputMode, setInputMode] = useState('structured'); // 'structured' or 'natural'
    const [loading, setLoading] = useState(false);

    // Structured input state
    const [baseIp, setBaseIp] = useState('192.168.0.0');
    const [cidr, setCidr] = useState(16);
    const [growthBuffer, setGrowthBuffer] = useState(30);
    const [branches, setBranches] = useState([
        { name: 'Engineering', hosts_needed: 300, description: '', priority: 2 }
    ]);

    // Natural language input state
    const [nlInput, setNlInput] = useState('');

    // Results state
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const addBranch = () => {
        setBranches([
            ...branches,
            { name: '', hosts_needed: null, description: '', priority: 2 }
        ]);
    };

    const removeBranch = (index) => {
        setBranches(branches.filter((_, i) => i !== index));
    };

    const updateBranch = (index, field, value) => {
        const updated = [...branches];
        updated[index][field] = value;
        setBranches(updated);
    };

    const handleStructuredSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const requestBody = {
                base_ip: baseIp,
                cidr: parseInt(cidr),
                growth_buffer: parseFloat(growthBuffer) / 100,
                enable_vlan_suggestions: true,
                branches: branches.map(b => ({
                    name: b.name,
                    hosts_needed: b.hosts_needed ? parseInt(b.hosts_needed) : null,
                    description: b.description || null,
                    priority: parseInt(b.priority)
                }))
            };

            const response = await fetch('http://localhost:5001/api/subnet/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success) {
                setResults(data);
            } else {
                setError(data.error || 'Subnet design failed');
            }
        } catch (err) {
            setError(`Request failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNaturalLanguageSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch('http://localhost:5001/api/subnet/design-nl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ natural_language_input: nlInput })
            });

            const data = await response.json();

            if (data.success) {
                setResults(data);
            } else {
                setError(data.error || 'Natural language parsing failed');
            }
        } catch (err) {
            setError(`Request failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const exportToJSON = () => {
        if (!results) return;
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subnet-design.json';
        a.click();
    };

    return (
        <div className="subnet-designer-page">
            <div className="page-header">
                <h1>🌐 AI-Powered Subnet Designer</h1>
                <p className="subtitle">Intelligent VLSM allocation with Groq AI reasoning</p>
            </div>

            {/* Input Mode Toggle */}
            <div className="input-mode-toggle">
                <button
                    className={inputMode === 'structured' ? 'active' : ''}
                    onClick={() => setInputMode('structured')}
                >
                    📋 Structured Input
                </button>
                <button
                    className={inputMode === 'natural' ? 'active' : ''}
                    onClick={() => setInputMode('natural')}
                >
                    💬 Natural Language
                </button>
            </div>

            {/* Structured Input Form */}
            {inputMode === 'structured' && (
                <div className="input-section">
                    <form onSubmit={handleStructuredSubmit}>
                        <div className="network-config">
                            <h3>Base Network Configuration</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Base IP Address</label>
                                    <input
                                        type="text"
                                        value={baseIp}
                                        onChange={(e) => setBaseIp(e.target.value)}
                                        placeholder="192.168.0.0"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>CIDR Block</label>
                                    <input
                                        type="number"
                                        value={cidr}
                                        onChange={(e) => setCidr(e.target.value)}
                                        min="8"
                                        max="30"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Growth Buffer (%)</label>
                                    <input
                                        type="number"
                                        value={growthBuffer}
                                        onChange={(e) => setGrowthBuffer(e.target.value)}
                                        min="0"
                                        max="100"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="branches-section">
                            <div className="section-header">
                                <h3>Organizational Branches</h3>
                                <button type="button" onClick={addBranch} className="add-branch-btn">
                                    + Add Branch
                                </button>
                            </div>

                            {branches.map((branch, index) => (
                                <div key={index} className="branch-card">
                                    <div className="branch-header">
                                        <span className="branch-number">Branch {index + 1}</span>
                                        {branches.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeBranch(index)}
                                                className="remove-btn"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <div className="branch-fields">
                                        <div className="form-group">
                                            <label>Branch Name *</label>
                                            <input
                                                type="text"
                                                value={branch.name}
                                                onChange={(e) => updateBranch(index, 'name', e.target.value)}
                                                placeholder="e.g., Finance, Engineering"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Hosts Needed</label>
                                            <input
                                                type="number"
                                                value={branch.hosts_needed || ''}
                                                onChange={(e) => updateBranch(index, 'hosts_needed', e.target.value)}
                                                placeholder="Leave empty to use AI estimation"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Description (for AI)</label>
                                            <input
                                                type="text"
                                                value={branch.description}
                                                onChange={(e) => updateBranch(index, 'description', e.target.value)}
                                                placeholder="e.g., High security, IoT devices"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Priority</label>
                                            <select
                                                value={branch.priority}
                                                onChange={(e) => updateBranch(index, 'priority', e.target.value)}
                                            >
                                                <option value="1">High</option>
                                                <option value="2">Medium</option>
                                                <option value="3">Low</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? '🔄 Designing Subnets...' : '🚀 Design Subnets'}
                        </button>
                    </form>
                </div>
            )}

            {/* Natural Language Input Form */}
            {inputMode === 'natural' && (
                <div className="input-section">
                    <form onSubmit={handleNaturalLanguageSubmit}>
                        <div className="nl-input-section">
                            <h3>Describe Your Network Requirements</h3>
                            <p className="hint">
                                Example: "Design subnets for 10.0.0.0/16 with Finance (200 users, high security),
                                Engineering (500 devices), IoT sensors (1000 devices), and Guest WiFi"
                            </p>
                            <textarea
                                value={nlInput}
                                onChange={(e) => setNlInput(e.target.value)}
                                placeholder="Describe your subnet requirements in plain English..."
                                rows="8"
                                required
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? '🧠 AI Processing...' : '🚀 Design with AI'}
                        </button>
                    </form>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    <strong>❌ Error:</strong> {error}
                </div>
            )}

            {/* Results Display */}
            {results && results.success && (
                <div className="results-section">
                    <div className="results-header">
                        <h2>✅ Subnet Design Complete</h2>
                        <button onClick={exportToJSON} className="export-btn">
                            📥 Export JSON
                        </button>
                    </div>

                    <div className="summary-card">
                        <h3>Summary</h3>
                        <p>{results.summary}</p>
                    </div>

                    {results.warnings && results.warnings.length > 0 && (
                        <div className="warnings-card">
                            <h3>⚠️ Warnings</h3>
                            <ul>
                                {results.warnings.map((warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="subnets-grid">
                        {results.subnets.map((subnet, idx) => (
                            <div key={idx} className="subnet-card">
                                <div className="subnet-header">
                                    <h3>{subnet.branch_name}</h3>
                                    <div className="subnet-badges">
                                        <span className="badge badge-zone">{subnet.security_zone}</span>
                                        <span className="badge badge-vlan">VLAN {subnet.vlan_id}</span>
                                    </div>
                                </div>

                                <div className="subnet-details">
                                    <div className="detail-row">
                                        <span className="label">Network:</span>
                                        <span className="value">
                                            {subnet.network_address}/{subnet.cidr}
                                            <button
                                                onClick={() => copyToClipboard(`${subnet.network_address}/${subnet.cidr}`)}
                                                className="copy-btn"
                                                title="Copy"
                                            >
                                                📋
                                            </button>
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Subnet Mask:</span>
                                        <span className="value">{subnet.subnet_mask}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Usable Range:</span>
                                        <span className="value">{subnet.usable_ip_range}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Broadcast:</span>
                                        <span className="value">{subnet.broadcast_address}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Gateway:</span>
                                        <span className="value">{subnet.gateway_suggestion}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Usable Hosts:</span>
                                        <span className="value">{subnet.usable_hosts} / {subnet.total_hosts}</span>
                                    </div>
                                </div>

                                <div className="ai-reasoning">
                                    <h4>🤖 AI Reasoning</h4>
                                    <p>{subnet.ai_reasoning}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {results.recommendations && results.recommendations.length > 0 && (
                        <div className="recommendations-card">
                            <h3>💡 Recommendations</h3>
                            <ul>
                                {results.recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubnetDesignerPage;
