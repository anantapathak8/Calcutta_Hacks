import { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from '../components/Modal';

const NATForwardingPage = () => {
    const [gatewayIP, setGatewayIP] = useState('');
    const [localIP, setLocalIP] = useState('');
    const [rules, setRules] = useState([]);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    // NLP Autofill state
    const [nlpInput, setNlpInput] = useState('');
    const [isAutofilling, setIsAutofilling] = useState(false);

    // Default rule template
    const defaultRule = {
        internal_ip: '',
        virtual_port: '',
        internal_port: '',
        proxy_name: '',
        protocol: 'TCP',
        service_description: ''
    };

    const [newRules, setNewRules] = useState([{ ...defaultRule, tempId: Date.now() }]);

    useEffect(() => {
        fetchNATInfo();
        fetchRules();
    }, []);

    const fetchNATInfo = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/nat/info');
            setGatewayIP(res.data.gateway_ip);
            setLocalIP(res.data.local_ip);

            // Auto-fill local IP for all new rules
            setNewRules(prev => prev.map(rule => ({
                ...rule,
                internal_ip: rule.internal_ip || res.data.local_ip
            })));
        } catch (error) {
            console.error('Error fetching NAT info:', error);
        }
    };

    const fetchRules = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/nat/rules');
            setRules(res.data.rules || []);
        } catch (error) {
            console.error('Error fetching rules:', error);
        }
    };

    const addRuleRow = () => {
        setNewRules([...newRules, { ...defaultRule, tempId: Date.now(), internal_ip: localIP }]);
    };

    const removeRuleRow = (tempId) => {
        setNewRules(newRules.filter(rule => rule.tempId !== tempId));
    };

    const updateRuleField = (tempId, field, value) => {
        setNewRules(newRules.map(rule =>
            rule.tempId === tempId ? { ...rule, [field]: value } : rule
        ));
    };

    const predictProtocol = async (tempId) => {
        const rule = newRules.find(r => r.tempId === tempId);
        if (!rule.service_description) {
            setModal({
                isOpen: true,
                title: 'No Description',
                message: 'Please enter a service description first',
                type: 'warning'
            });
            return;
        }

        try {
            const res = await axios.post('http://localhost:5001/api/nat/protocol/predict', {
                description: rule.service_description
            });

            const prediction = res.data;

            // Update protocol
            updateRuleField(tempId, 'protocol', prediction.protocol);

            // Show prediction info
            setModal({
                isOpen: true,
                title: `AI Prediction: ${prediction.protocol}`,
                message: `${prediction.suggestion}\n\nConfidence: ${(prediction.confidence * 100).toFixed(1)}%`,
                type: 'success'
            });
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Prediction Error',
                message: error.response?.data?.error || 'Failed to predict protocol',
                type: 'error'
            });
        }
    };

    const saveRule = async (tempId) => {
        const rule = newRules.find(r => r.tempId === tempId);

        // Validation
        if (!rule.internal_ip || !rule.internal_port || !rule.proxy_name) {
            setModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Internal IP, Internal Port and Proxy Name are required',
                type: 'warning'
            });
            return;
        }

        try {
            const res = await axios.post('http://localhost:5001/api/nat/rules', {
                internal_ip: rule.internal_ip,
                virtual_port: rule.virtual_port,
                internal_port: parseInt(rule.internal_port),
                proxy_name: rule.proxy_name,
                protocol: rule.protocol
            });

            setModal({
                isOpen: true,
                title: 'Rule Added',
                message: res.data.message,
                type: 'success'
            });

            // Remove from new rules and refresh
            removeRuleRow(tempId);
            fetchRules();
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.error || 'Failed to add rule',
                type: 'error'
            });
        }
    };

    const deleteRule = async (ruleId) => {
        try {
            const res = await axios.delete(`http://localhost:5001/api/nat/rules/${ruleId}`);

            setModal({
                isOpen: true,
                title: 'Rule Deleted',
                message: res.data.message,
                type: 'success'
            });

            fetchRules();
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.error || 'Failed to delete rule',
                type: 'error'
            });
        }
    };

    const clearAllRules = async () => {
        if (rules.length === 0) {
            setModal({
                isOpen: true,
                title: 'No Rules',
                message: 'There are no rules to clear',
                type: 'warning'
            });
            return;
        }

        // Confirmation
        const confirmed = window.confirm('Are you sure you want to clear all NAT forwarding rules?');
        if (!confirmed) return;

        try {
            const res = await axios.post('http://localhost:5001/api/nat/rules/clear');

            setModal({
                isOpen: true,
                title: 'All Rules Cleared',
                message: res.data.message,
                type: 'success'
            });

            fetchRules();
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.error || 'Failed to clear rules',
                type: 'error'
            });
        }
    };

    const autofillFromNLP = async () => {
        if (!nlpInput.trim()) {
            setModal({
                isOpen: true,
                title: 'Empty Input',
                message: 'Please enter a natural language description',
                type: 'warning'
            });
            return;
        }

        setIsAutofilling(true);

        try {
            const res = await axios.post('http://localhost:5001/api/parse', {
                input: nlpInput
            });

            if (!res.data.success) {
                setModal({
                    isOpen: true,
                    title: 'Parse Error',
                    message: res.data.error || 'Failed to parse input',
                    type: 'error'
                });
                return;
            }

            const config = res.data.config;

            // Low confidence warning
            if (config.confidence < 0.5) {
                setModal({
                    isOpen: true,
                    title: 'Low Confidence Detection',
                    message: `AI confidence is low (${(config.confidence * 100).toFixed(0)}%). Please verify the autofilled values.`,
                    type: 'warning'
                });
            }

            // Update the first rule in newRules with parsed data
            const updatedRule = {
                ...newRules[0],
                internal_ip: localIP, // Keep existing local IP
                virtual_port: config.virtualPort || '',
                internal_port: config.internalPort || '',
                proxy_name: config.proxyName || '',
                protocol: config.protocol || 'TCP',
                service_description: config.serviceDescription || ''
            };

            setNewRules([updatedRule, ...newRules.slice(1)]);

            // Clear NLP input
            setNlpInput('');

            // Show success message
            if (config.confidence >= 0.5) {
                setModal({
                    isOpen: true,
                    title: '✅ Form Autofilled',
                    message: `Successfully parsed "${res.data.input}"\n\nDetected: ${config.detectedService || 'network service'}\nConfidence: ${(config.confidence * 100).toFixed(0)}%`,
                    type: 'success'
                });
            }
        } catch (error) {
            console.error('Autofill error:', error);
            setModal({
                isOpen: true,
                title: 'Autofill Failed',
                message: error.response?.data?.error || 'Failed to parse natural language input. Please try again.',
                type: 'error'
            });
        } finally {
            setIsAutofilling(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />

            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                        NAT Port Forwarding & Reverse Proxy
                    </h1>
                    <p className="text-gray-400">
                        Configure nginx reverse proxy with AI-powered protocol prediction
                    </p>
                </div>

                {/* Gateway Info */}
                <div className="bg-gray-800 rounded-lg p-6 border border-cyan-500/50 mb-6">
                    <h2 className="text-xl font-bold mb-4 text-cyan-400">Gateway Information</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Gateway Address</label>
                            <input
                                type="text"
                                value={gatewayIP}
                                readOnly
                                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Local IP</label>
                            <input
                                type="text"
                                value={localIP}
                                readOnly
                                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* NLP Autofill Section */}
                <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-lg p-6 border border-purple-500/50 mb-6">
                    <h2 className="text-xl font-bold text-purple-300 mb-4">🤖 Quick Add with Natural Language</h2>
                    <p className="text-gray-300 text-sm mb-4">
                        Describe your service in plain English and let AI fill the form for you!
                    </p>

                    <div className="space-y-3">
                        <textarea
                            value={nlpInput}
                            onChange={(e) => setNlpInput(e.target.value)}
                            placeholder="Example: web server on 8080, api service 443 to 3000, mysql database on port 3306"
                            className="w-full px-4 py-3 bg-gray-800/60 rounded-lg border border-purple-400/50 focus:border-purple-400 focus:outline-none resize-none"
                            rows={3}
                            disabled={isAutofilling}
                        />

                        <button
                            onClick={autofillFromNLP}
                            disabled={isAutofilling || !nlpInput.trim()}
                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition font-semibold flex items-center justify-center gap-2"
                        >
                            {isAutofilling ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    <span>Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <span>🤖</span>
                                    <span>Autofill Form</span>
                                </>
                            )}
                        </button>

                        <div className="text-xs text-gray-400 space-y-1">
                            <div>💡 <strong>Examples:</strong></div>
                            <div className="pl-6 space-y-0.5">
                                <div>• "web server on port 8080"</div>
                                <div>• "api service from 443 to 3000"</div>
                                <div>• "video streaming on 1935"</div>
                                <div>• "mysql database port 3306"</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Rules */}
                {rules.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-6 border border-green-500/50 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-green-400">Active Rules</h2>
                            <button
                                onClick={clearAllRules}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
                            >
                                Clear All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {rules.map(rule => (
                                <div key={rule.id} className="bg-gray-700 rounded p-4 flex justify-between items-center">
                                    <div className="grid grid-cols-5 gap-4 flex-1">
                                        <div>
                                            <div className="text-xs text-gray-400">Proxy Name</div>
                                            <div className="font-mono">/{rule.proxy_name}/</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">Internal Port</div>
                                            <div className="font-mono">{rule.internal_port}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">Internal IP</div>
                                            <div className="font-mono text-xs">{rule.internal_ip}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">Protocol</div>
                                            <div className="font-semibold">{rule.protocol}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">Status</div>
                                            <div className="text-green-400">✓ Active</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteRule(rule.id)}
                                        className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add New Rules */}
                <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-blue-400">Add New Rules</h2>
                        <button
                            onClick={addRuleRow}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
                        >
                            + Add Row
                        </button>
                    </div>

                    <div className="space-y-4">
                        {newRules.map((rule) => (
                            <div key={rule.tempId} className="bg-gray-700 rounded p-4">
                                <div className="grid grid-cols-3 gap-4 mb-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Internal IP *
                                        </label>
                                        <input
                                            type="text"
                                            value={rule.internal_ip}
                                            onChange={(e) => updateRuleField(rule.tempId, 'internal_ip', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Virtual Port
                                        </label>
                                        <input
                                            type="number"
                                            value={rule.virtual_port}
                                            onChange={(e) => updateRuleField(rule.tempId, 'virtual_port', e.target.value)}
                                            placeholder="e.g., 8080"
                                            className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Internal Port *
                                        </label>
                                        <input
                                            type="number"
                                            value={rule.internal_port}
                                            onChange={(e) => updateRuleField(rule.tempId, 'internal_port', e.target.value)}
                                            placeholder="e.g., 9000"
                                            className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Reverse Proxy Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={rule.proxy_name}
                                            onChange={(e) => updateRuleField(rule.tempId, 'proxy_name', e.target.value)}
                                            placeholder="e.g., route0"
                                            className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Protocol
                                        </label>
                                        <select
                                            value={rule.protocol}
                                            onChange={(e) => updateRuleField(rule.tempId, 'protocol', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                        >
                                            <option value="TCP">TCP</option>
                                            <option value="UDP">UDP</option>
                                            <option value="BOTH">BOTH (TCP + UDP)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            &nbsp;
                                        </label>
                                        <button
                                            onClick={() => predictProtocol(rule.tempId)}
                                            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded transition"
                                        >
                                            🤖 AI Predict Protocol
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-2">
                                        Service Description (for AI prediction)
                                    </label>
                                    <input
                                        type="text"
                                        value={rule.service_description}
                                        onChange={(e) => updateRuleField(rule.tempId, 'service_description', e.target.value)}
                                        placeholder="e.g., video streaming, web server, file transfer, vpn server..."
                                        className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => saveRule(rule.tempId)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
                                    >
                                        💾 Save Rule
                                    </button>
                                    {newRules.length > 1 && (
                                        <button
                                            onClick={() => removeRuleRow(rule.tempId)}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
                                        >
                                            Remove Row
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
                    <div className="text-blue-400 font-semibold mb-2">ℹ️ How it works:</div>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Configure nginx reverse proxy to forward requests from your domain to local ports</li>
                        <li>• AI predicts optimal protocol (TCP/UDP/BOTH) based on service description</li>
                        <li>• Changes are applied immediately with automatic nginx reload</li>
                        <li>• Access via: http://calcutta-hacks-server.uemcseaiml.org/[proxy_name]/</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default NATForwardingPage;
