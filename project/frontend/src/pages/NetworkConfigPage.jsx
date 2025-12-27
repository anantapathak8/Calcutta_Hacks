import { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, PromptModal } from '../components/Modal';

const NetworkConfigPage = () => {
    const [networks, setNetworks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingNetwork, setEditingNetwork] = useState(null);
    
    // Modal states
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    
    const [formData, setFormData] = useState({
        ssid: '',
        password: '',
        encryption: 'WPA2-PSK',
        band: '2.4GHz',
        channel: '6',
        mtu: '1500',
        mac_address: '',
        connected_devices: []
    });
    
    const [deviceForm, setDeviceForm] = useState({
        mac: '',
        ip: ''
    });

    useEffect(() => {
        fetchNetworks();
    }, []);

    const fetchNetworks = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/deauth/networks');
            setNetworks(res.data.networks || []);
        } catch (error) {
            console.error('Error fetching networks:', error);
        }
    };

    const generateRandomMAC = () => {
        return Array.from({length: 6}, () => 
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':');
    };

    const autoPopulateNetworks = async () => {
        setPromptModal({
            isOpen: true,
            title: 'Auto Populate Networks',
            message: 'How many networks to create? (1-10)',
            defaultValue: '3',
            onConfirm: async (count) => {
                if (!count) return;
                
                try {
                    const res = await axios.post('http://localhost:5001/api/deauth/networks/auto-populate', {
                        count: parseInt(count)
                    });
                    
                    setModal({
                        isOpen: true,
                        title: 'Success',
                        message: `Created ${res.data.count} networks successfully!`,
                        type: 'success'
                    });
                    fetchNetworks();
                } catch (error) {
                    setModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error creating networks: ' + error.message,
                        type: 'error'
                    });
                }
            }
        });
    };

    const addDevice = () => {
        if (deviceForm.mac && deviceForm.ip) {
            setFormData({
                ...formData,
                connected_devices: [...formData.connected_devices, {
                    mac: deviceForm.mac,
                    ip: deviceForm.ip,
                    connected: true,
                    last_seen: new Date().toISOString()
                }]
            });
            setDeviceForm({ mac: '', ip: '' });
        }
    };

    const removeDevice = (index) => {
        const devices = formData.connected_devices.filter((_, i) => i !== index);
        setFormData({ ...formData, connected_devices: devices });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const networkData = {
                ...formData,
                mac_address: formData.mac_address || generateRandomMAC(),
                channel: parseInt(formData.channel),
                mtu: parseInt(formData.mtu)
            };
            
            await axios.post('http://localhost:5001/api/deauth/networks', networkData);
            
            setModal({
                isOpen: true,
                title: 'Success',
                message: 'Network created successfully!',
                type: 'success'
            });
            setShowForm(false);
            resetForm();
            fetchNetworks();
        } catch (error) {
            setModal({
                isOpen: true,
                title: 'Error',
                message: 'Error creating network: ' + error.message,
                type: 'error'
            });
        }
    };

    const deleteNetwork = async (networkId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Network',
            message: 'Are you sure you want to delete this network?',
            onConfirm: async () => {
                try {
                    await axios.delete(`http://localhost:5001/api/deauth/networks/${networkId}`);
                    setModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Network deleted successfully',
                        type: 'success'
                    });
                    fetchNetworks();
                } catch (error) {
                    setModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error deleting network: ' + error.message,
                        type: 'error'
                    });
                }
            }
        });
    };

    const clearAllNetworks = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear All Networks',
            message: `Are you sure you want to delete all ${networks.length} network(s)? This cannot be undone.`,
            onConfirm: async () => {
                try {
                    // Delete all networks
                    await Promise.all(
                        networks.map(network => 
                            axios.delete(`http://localhost:5001/api/deauth/networks/${network.id}`)
                        )
                    );
                    setModal({
                        isOpen: true,
                        title: 'Success',
                        message: `All networks cleared successfully`,
                        type: 'success'
                    });
                    fetchNetworks();
                } catch (error) {
                    setModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error clearing networks: ' + error.message,
                        type: 'error'
                    });
                }
            }
        });
    };

    const resetForm = () => {
        setFormData({
            ssid: '',
            password: '',
            encryption: 'WPA2-PSK',
            band: '2.4GHz',
            channel: '6',
            mtu: '1500',
            mac_address: '',
            connected_devices: []
        });
        setEditingNetwork(null);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                            Virtual Network Configuration
                        </h1>
                        <p className="text-gray-400">
                            Configure virtual WiFi networks for deauth attack simulation
                        </p>
                    </div>
                    
                    <div className="flex gap-3">
                        {networks.length > 0 && (
                            <button
                                onClick={clearAllNetworks}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                            >
                                🗑️ Clear All
                            </button>
                        )}
                        <button
                            onClick={autoPopulateNetworks}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                        >
                            🎲 Auto Populate
                        </button>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition"
                        >
                            {showForm ? '❌ Cancel' : '➕ Add Network'}
                        </button>
                    </div>
                </div>

                {/* Network Form */}
                {showForm && (
                    <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-cyan-500">
                        <h2 className="text-xl font-bold mb-4">Create Virtual Network</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">SSID *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.ssid}
                                        onChange={(e) => setFormData({...formData, ssid: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                        placeholder="MyNetwork"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">Password *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                        placeholder="password123"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">Encryption</label>
                                    <select
                                        value={formData.encryption}
                                        onChange={(e) => setFormData({...formData, encryption: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                    >
                                        <option value="WPA2-PSK">WPA2-PSK</option>
                                        <option value="WPA3-SAE">WPA3-SAE</option>
                                        <option value="WPA2/WPA3-Mixed">WPA2/WPA3-Mixed</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">Band</label>
                                    <select
                                        value={formData.band}
                                        onChange={(e) => setFormData({...formData, band: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                    >
                                        <option value="2.4GHz">2.4GHz</option>
                                        <option value="5GHz">5GHz</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">Channel</label>
                                    <input
                                        type="number"
                                        value={formData.channel}
                                        onChange={(e) => setFormData({...formData, channel: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                        min="1"
                                        max="165"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">MTU</label>
                                    <input
                                        type="number"
                                        value={formData.mtu}
                                        onChange={(e) => setFormData({...formData, mtu: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-2">
                                        MAC Address (leave empty to auto-generate)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.mac_address}
                                        onChange={(e) => setFormData({...formData, mac_address: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                        placeholder="aa:bb:cc:dd:ee:ff"
                                    />
                                </div>
                            </div>
                            
                            {/* Connected Devices Section */}
                            <div className="border-t border-gray-700 pt-4 mt-4">
                                <h3 className="text-lg font-semibold mb-3">Connected Devices (Max 10)</h3>
                                
                                <div className="flex gap-3 mb-3">
                                    <input
                                        type="text"
                                        placeholder="MAC Address"
                                        value={deviceForm.mac}
                                        onChange={(e) => setDeviceForm({...deviceForm, mac: e.target.value})}
                                        className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="IP Address"
                                        value={deviceForm.ip}
                                        onChange={(e) => setDeviceForm({...deviceForm, ip: e.target.value})}
                                        className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={addDevice}
                                        disabled={formData.connected_devices.length >= 10}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:bg-gray-600"
                                    >
                                        Add Device
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    {formData.connected_devices.map((device, index) => (
                                        <div key={index} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
                                            <span className="font-mono text-sm">
                                                {device.mac} - {device.ip}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeDevice(index)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                ❌
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition"
                            >
                                Create Network
                            </button>
                        </form>
                    </div>
                )}

                {/* Networks List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {networks.map((network) => (
                        <div key={network.id} className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-cyan-500 transition">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-cyan-400">{network.ssid}</h3>
                                <button
                                    onClick={() => deleteNetwork(network.id)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    🗑️
                                </button>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Encryption:</span>
                                    <span className="font-mono">{network.encryption}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Band:</span>
                                    <span>{network.band}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Channel:</span>
                                    <span>{network.channel}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">MAC:</span>
                                    <span className="font-mono text-xs">{network.mac_address}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Clients:</span>
                                    <span className="text-green-400">{network.connected_devices?.length || 0}</span>
                                </div>
                            </div>
                            
                            {network.connected_devices && network.connected_devices.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <p className="text-xs text-gray-500 mb-2">Connected Devices:</p>
                                    <div className="space-y-1">
                                        {network.connected_devices.slice(0, 3).map((device, idx) => (
                                            <div key={idx} className="text-xs font-mono text-gray-400">
                                                {device.mac}
                                            </div>
                                        ))}
                                        {network.connected_devices.length > 3 && (
                                            <div className="text-xs text-gray-500">
                                                +{network.connected_devices.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {networks.length === 0 && !showForm && (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-lg mb-4">No networks configured yet</p>
                        <p className="text-sm">Click "Add Network" or "Auto Populate" to get started</p>
                    </div>
                )}
            </div>
            
            {/* Modals */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
            
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                title={confirmModal.title}
                message={confirmModal.message}
                type="confirm"
                onConfirm={confirmModal.onConfirm}
            />
            
            <PromptModal
                isOpen={promptModal.isOpen}
                onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
                title={promptModal.title}
                message={promptModal.message}
                defaultValue={promptModal.defaultValue}
                onConfirm={promptModal.onConfirm}
            />
        </div>
    );
};

export default NetworkConfigPage;
