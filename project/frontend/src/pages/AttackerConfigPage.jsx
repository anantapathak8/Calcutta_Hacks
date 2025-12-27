import { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from '../components/Modal';

const AttackerConfigPage = () => {
    const [networks, setNetworks] = useState([]);
    const [attackState, setAttackState] = useState(null);
    const [handshakes, setHandshakes] = useState([]);
    const [normalParams, setNormalParams] = useState(null);
    const [activeTab, setActiveTab] = useState('attack'); // 'attack' or 'normal'
    
    // Modal state
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    
    const [attackConfig, setAttackConfig] = useState({
        target_network_id: '',
        intensity: 'medium',
        duration: 30,
        capture_handshake: true
    });
    
    const [normalDisconnectConfig, setNormalDisconnectConfig] = useState({
        target_network_id: '',
        disconnect_rate: 0.1,
        reconnect_time: 15.0,
        signal_variation: 5.0,
        duration: 30
    });

    useEffect(() => {
        fetchNetworks();
        fetchAttackState();
        fetchHandshakes();
        fetchNormalParams();
        
        // Poll attack state
        const interval = setInterval(() => {
            fetchAttackState();
            fetchHandshakes();
        }, 2000);
        
        return () => clearInterval(interval);
    }, []);

    const fetchNetworks = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/deauth/networks');
            setNetworks(res.data.networks || []);
        } catch (error) {
            console.error('Error fetching networks:', error);
        }
    };

    const fetchAttackState = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/deauth/attack/status');
            console.log('Attack State:', res.data);
            console.log('Active:', res.data.active, 'Type:', typeof res.data.active);
            console.log('Normal Disconnect:', res.data.normal_disconnect_active, 'Type:', typeof res.data.normal_disconnect_active);
            setAttackState(res.data);
        } catch (error) {
            console.error('Error fetching attack state:', error);
        }
    };

    const fetchHandshakes = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/deauth/handshakes');
            setHandshakes(res.data.handshakes || []);
        } catch (error) {
            console.error('Error fetching handshakes:', error);
        }
    };

    const fetchNormalParams = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/deauth/normal-disconnect/suggested-params');
            setNormalParams(res.data);
        } catch (error) {
            console.error('Error fetching normal params:', error);
        }
    };

    const startAttack = async () => {
        if (!attackConfig.target_network_id) {
            setModal({
                isOpen: true,
                title: 'Invalid Selection',
                message: 'Please select a target network',
                type: 'warning'
            });
            return;
        }
        
        try {
            const res = await axios.post('http://localhost:5001/api/deauth/attack/start', attackConfig);
            setModal({
                isOpen: true,
                title: 'Attack Started',
                message: res.data.message || 'Attack simulation started successfully!',
                type: 'success'
            });
            fetchAttackState();
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Error',
                message: 'Error starting attack: ' + error.message,
                type: 'error'
            });
        }
    };

    const stopAttack = async () => {
        // Don't proceed if nothing is active
        if (attackState?.active !== true && attackState?.normal_disconnect_active !== true) {
            return;
        }
        
        try {
            const res = await axios.post('http://localhost:5001/api/deauth/attack/stop');
            
            // Only show modal if there was actually something to stop
            if (res.data.status === 'stopped') {
                setModal({
                    isOpen: true,
                    title: 'Stopped Successfully',
                    message: res.data.message,
                    type: 'success'
                });
            }
            fetchAttackState();
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Error',
                message: 'Error stopping: ' + error.message,
                type: 'error'
            });
        }
    };

    const startNormalDisconnect = async () => {
        if (!normalDisconnectConfig.target_network_id) {
            setModal({
                isOpen: true,
                title: 'Invalid Selection',
                message: 'Please select a target network',
                type: 'warning'
            });
            return;
        }
        
        try {
            const res = await axios.post('http://localhost:5001/api/deauth/normal-disconnect/start', normalDisconnectConfig);
            setModal({
                isOpen: true,
                title: 'Simulation Started',
                message: res.data.message || 'Normal disconnect simulation started',
                type: 'success'
            });
            fetchAttackState();
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Error',
                message: 'Error starting normal disconnect: ' + error.message,
                type: 'error'
            });
        }
    };

    const useSuggestedParams = () => {
        if (normalParams) {
            setNormalDisconnectConfig({
                disconnect_rate: normalParams.disconnect_rate.value,
                reconnect_time: normalParams.reconnect_time.value,
                signal_variation: normalParams.signal_variation.value
            });
        }
    };

    const useUnsafeParams = () => {
        // Values that mimic attack patterns - for comparison
        setNormalDisconnectConfig({
            ...normalDisconnectConfig,
            disconnect_rate: 5.0,  // High frequency like attacks
            reconnect_time: 2.0,   // Very fast reconnection
            signal_variation: 15.0  // High signal instability
        });
    };

    const getSelectedNormalNetwork = () => {
        return networks.find(n => n.id === normalDisconnectConfig.target_network_id);
    };

    const getSelectedNetwork = () => {
        return networks.find(n => n.id === attackConfig.target_network_id);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-red-400 mb-2">
                        Attacker Configuration
                    </h1>
                    <p className="text-gray-400">
                        Simulate WiFi deauthentication attacks or normal disconnections
                    </p>
                </div>

                {/* Tab Selector */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('attack')}
                        className={`px-6 py-3 rounded-lg font-semibold transition ${
                            activeTab === 'attack' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        🎯 Attack Simulation
                    </button>
                    <button
                        onClick={() => setActiveTab('normal')}
                        className={`px-6 py-3 rounded-lg font-semibold transition ${
                            activeTab === 'normal' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        ✅ Normal Disconnect
                    </button>
                </div>

                {/* Attack Status Banner */}
                {attackState?.active === true && (
                    <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-red-300">
                                    ⚠️ Attack In Progress
                                </h3>
                                <p className="text-sm text-gray-300">
                                    Target: {networks.find(n => n.id === attackState.target_network)?.ssid || 'Unknown'}
                                </p>
                            </div>
                            <button
                                onClick={stopAttack}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                            >
                                🛑 Stop Attack
                            </button>
                        </div>
                    </div>
                )}

                {attackState?.normal_disconnect_active === true && (
                    <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-green-300">
                                    ✅ Normal Disconnect Simulation Active
                                </h3>
                                <p className="text-sm text-gray-300">
                                    Simulating normal client behavior patterns
                                </p>
                            </div>
                            <button
                                onClick={stopAttack}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                            >
                                Stop Simulation
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-2">
                        {activeTab === 'attack' ? (
                            // Attack Configuration
                            <div className="bg-gray-800 rounded-lg p-6 border border-red-500/50">
                                <h2 className="text-2xl font-bold mb-6 text-red-400">
                                    Deauthentication Attack Configuration
                                </h2>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Target Network *
                                        </label>
                                        <select
                                            value={attackConfig.target_network_id}
                                            onChange={(e) => setAttackConfig({...attackConfig, target_network_id: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                                        >
                                            <option value="">Select a network...</option>
                                            {networks.map(network => (
                                                <option key={network.id} value={network.id}>
                                                    {network.ssid} ({network.encryption}) - {network.connected_devices?.length || 0} clients
                                                </option>
                                            ))}
                                        </select>
                                        
                                        {getSelectedNetwork() && (
                                            <div className="mt-3 p-3 bg-gray-700 rounded text-sm">
                                                <div className="font-semibold mb-2">Target Details:</div>
                                                <div className="space-y-1 text-gray-300">
                                                    <div>SSID: {getSelectedNetwork().ssid}</div>
                                                    <div>MAC: {getSelectedNetwork().mac_address}</div>
                                                    <div>Channel: {getSelectedNetwork().channel}</div>
                                                    <div>Clients: {getSelectedNetwork().connected_devices?.length || 0}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Attack Intensity
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['low', 'medium', 'high'].map(level => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => setAttackConfig({...attackConfig, intensity: level})}
                                                    className={`px-4 py-2 rounded-lg transition ${
                                                        attackConfig.intensity === level
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            {attackConfig.intensity === 'low' && '2-3 deauth frames/sec, subtle'}
                                            {attackConfig.intensity === 'medium' && '8-10 deauth frames/sec, noticeable'}
                                            {attackConfig.intensity === 'high' && '20+ deauth frames/sec, aggressive'}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Duration (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="300"
                                            value={attackConfig.duration}
                                            onChange={(e) => setAttackConfig({...attackConfig, duration: parseInt(e.target.value)})}
                                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="capture-handshake"
                                            checked={attackConfig.capture_handshake}
                                            onChange={(e) => setAttackConfig({...attackConfig, capture_handshake: e.target.checked})}
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor="capture-handshake" className="text-sm">
                                            Capture WPA handshake during reconnection
                                        </label>
                                    </div>
                                    
                                    <button
                                        onClick={startAttack}
                                        disabled={attackState?.active || !attackConfig.target_network_id}
                                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
                                    >
                                        🚀 Launch Attack
                                    </button>
                                    
                                    <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                                        <div className="text-yellow-400 font-semibold mb-2">ℹ️ Attack Simulation Details:</div>
                                        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                                            <li>Sends spoofed deauth frames to disconnect clients</li>
                                            <li>Monitors for 4-way handshake during reconnection</li>
                                            <li>AI model will analyze patterns for anomaly detection</li>
                                            <li>Safe simulation - no actual network impact</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Normal Disconnect Configuration
                            <div className="bg-gray-800 rounded-lg p-6 border border-green-500/50">
                                <h2 className="text-2xl font-bold mb-6 text-green-400">
                                    Normal Disconnect Simulation
                                </h2>
                                
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-900/30 border border-blue-600 rounded-lg mb-4">
                                        <div className="text-blue-400 font-semibold mb-2">💡 Purpose:</div>
                                        <p className="text-sm text-gray-300">
                                            This simulates legitimate client disconnections (roaming, sleep mode, weak signal) 
                                            to demonstrate that the AI model can distinguish between attacks and normal behavior.
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Target Network *
                                        </label>
                                        <select
                                            value={normalDisconnectConfig.target_network_id}
                                            onChange={(e) => setNormalDisconnectConfig({...normalDisconnectConfig, target_network_id: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        >
                                            <option value="">Select a network...</option>
                                            {networks.map(network => (
                                                <option key={network.id} value={network.id}>
                                                    {network.ssid} ({network.encryption}) - {network.connected_devices?.length || 0} clients
                                                </option>
                                            ))}
                                        </select>
                                        
                                        {getSelectedNormalNetwork() && (
                                            <div className="mt-3 p-3 bg-gray-700 rounded text-sm">
                                                <div className="font-semibold mb-2">Target Details:</div>
                                                <div className="space-y-1 text-gray-300">
                                                    <div>SSID: {getSelectedNormalNetwork().ssid}</div>
                                                    <div>MAC: {getSelectedNormalNetwork().mac_address}</div>
                                                    <div>Channel: {getSelectedNormalNetwork().channel}</div>
                                                    <div>Clients: {getSelectedNormalNetwork().connected_devices?.length || 0}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Duration (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="300"
                                            value={normalDisconnectConfig.duration}
                                            onChange={(e) => setNormalDisconnectConfig({...normalDisconnectConfig, duration: parseInt(e.target.value)})}
                                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Disconnect Rate (disconnects/minute)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.0"
                                            max="5.0"
                                            value={normalDisconnectConfig.disconnect_rate}
                                            onChange={(e) => setNormalDisconnectConfig({...normalDisconnectConfig, disconnect_rate: parseFloat(e.target.value)})}
                                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        />
                                        <div className="text-xs text-gray-400 mt-1">
                                            Normal: 0.1 (1 disconnect per 10 minutes)
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Reconnect Time (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            min="5"
                                            max="60"
                                            value={normalDisconnectConfig.reconnect_time}
                                            onChange={(e) => setNormalDisconnectConfig({...normalDisconnectConfig, reconnect_time: parseFloat(e.target.value)})}
                                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        />
                                        <div className="text-xs text-gray-400 mt-1">
                                            Normal: 15 seconds for automatic reconnection
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Signal Strength Variation (dBm)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            max="20"
                                            value={normalDisconnectConfig.signal_variation}
                                            onChange={(e) => setNormalDisconnectConfig({...normalDisconnectConfig, signal_variation: parseFloat(e.target.value)})}
                                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                                        />
                                        <div className="text-xs text-gray-400 mt-1">
                                            Normal: 5 dBm (slight fluctuation)
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={useSuggestedParams}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                                        >
                                            ✅ Safe Values
                                        </button>
                                        <button
                                            onClick={useUnsafeParams}
                                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition"
                                        >
                                            ⚠️ Unsafe Values
                                        </button>
                                    </div>
                                    
                                    <div className="text-xs text-gray-400 bg-gray-700/50 p-3 rounded">
                                        <div className="font-semibold mb-2">Parameter Comparison:</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-green-400 font-semibold mb-1">Safe (Normal):</div>
                                                <div>• 0.1 disconnects/min</div>
                                                <div>• 15s reconnect time</div>
                                                <div>• 5 dBm variation</div>
                                            </div>
                                            <div>
                                                <div className="text-orange-400 font-semibold mb-1">Unsafe (Attack-like):</div>
                                                <div>• 5 disconnects/min</div>
                                                <div>• 2s reconnect time</div>
                                                <div>• 15 dBm variation</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={startNormalDisconnect}
                                        disabled={attackState?.normal_disconnect_active === true}
                                        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
                                    >
                                        ▶️ Start Normal Disconnect Simulation
                                    </button>
                                    
                                    {normalParams && (
                                        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                                            <div className="font-semibold mb-3">Suggested Parameters:</div>
                                            <div className="space-y-2 text-sm">
                                                {Object.entries(normalParams).map(([key, param]) => (
                                                    <div key={key} className="flex justify-between">
                                                        <span className="text-gray-400">{param.description}:</span>
                                                        <span className="font-mono text-green-400">
                                                            {param.value} {param.unit}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Handshakes & Results Panel */}
                    <div className="space-y-6">
                        {/* Captured Handshakes */}
                        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                            <h3 className="text-lg font-bold mb-4 text-cyan-400">
                                📡 Captured Handshakes
                            </h3>
                            
                            {handshakes.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No handshakes captured yet
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {handshakes.map((hs, idx) => (
                                        <div key={hs.id} className="bg-gray-700 rounded p-3 text-sm">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold text-cyan-300">#{idx + 1}</span>
                                                <span className={`px-2 py-1 rounded text-xs ${
                                                    hs.quality === 'good' ? 'bg-green-600' : 'bg-yellow-600'
                                                }`}>
                                                    {hs.quality}
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-gray-300">
                                                <div className="font-semibold">{hs.network_ssid}</div>
                                                <div className="font-mono text-xs">AP: {hs.ap_mac}</div>
                                                <div className="font-mono text-xs">Client: {hs.client_mac}</div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(hs.captured_at).toLocaleTimeString()}
                                                </div>
                                                <div className="text-xs">
                                                    EAPOL Frames: {hs.eapol_frames}/4
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Attack Metrics */}
                        {attackState?.attack_metrics && (
                            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                                <h3 className="text-lg font-bold mb-4 text-orange-400">
                                    📊 Attack Metrics
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Intensity:</span>
                                        <span className="font-semibold">{attackState.attack_metrics.intensity}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Duration:</span>
                                        <span>{attackState.attack_metrics.duration}s</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Deauth Packets:</span>
                                        <span>{attackState.attack_metrics.deauth_packets_sent}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Clients Affected:</span>
                                        <span>{attackState.attack_metrics.clients_affected}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Handshakes:</span>
                                        <span className="text-green-400">{attackState.attack_metrics.handshakes_captured}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </div>
    );
};

export default AttackerConfigPage;
