import { useState, useEffect } from 'react';
import axios from 'axios';

const DeauthDetection = () => {
    const [detection, setDetection] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetection();
        
        // Poll every 2 seconds for real-time updates
        const interval = setInterval(fetchDetection, 2000);
        
        return () => clearInterval(interval);
    }, []);

    const fetchDetection = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/deauth/detect');
            setDetection(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching deauth detection:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-cyan-400">
                    🛡️ Deauth Attack Detection (AI)
                </h3>
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                </div>
            </div>
        );
    }

    if (!detection?.prediction) {
        return null;
    }

    const { prediction, monitoring_data } = detection;
    
    // Determine status color
    const getStatusColor = (status) => {
        switch(status) {
            case 'CRITICAL':
                return 'bg-red-600 border-red-500 text-red-100';
            case 'HIGH_RISK':
                return 'bg-orange-600 border-orange-500 text-orange-100';
            case 'WARNING':
                return 'bg-yellow-600 border-yellow-500 text-yellow-100';
            case 'MODERATE':
                return 'bg-blue-600 border-blue-500 text-blue-100';
            case 'SAFE':
                return 'bg-green-600 border-green-500 text-green-100';
            default:
                return 'bg-gray-600 border-gray-500 text-gray-100';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'CRITICAL':
                return '🚨';
            case 'HIGH_RISK':
                return '⚠️';
            case 'WARNING':
                return '⚡';
            case 'MODERATE':
                return '👁️';
            case 'SAFE':
                return '✅';
            default:
                return '🛡️';
        }
    };

    return (
        <div className={`rounded-lg p-6 border-2 ${getStatusColor(prediction.status)}`}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">
                    {getStatusIcon(prediction.status)} WiFi Deauth Detection (AI)
                </h3>
                <span className="text-sm opacity-75">
                    {prediction.method === 'heuristic' ? '🔍 Heuristic' : '🤖 AI Model'}
                </span>
            </div>

            <div className="space-y-4">
                {/* Status */}
                <div>
                    <div className="text-3xl font-bold mb-2">{prediction.status}</div>
                    <div className="text-sm opacity-90">{prediction.details}</div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 rounded p-3">
                        <div className="text-xs opacity-75 mb-1">Probability</div>
                        <div className="text-lg font-bold">{prediction.probability}</div>
                    </div>
                    
                    {prediction.anomaly_score !== undefined && (
                        <div className="bg-black/20 rounded p-3">
                            <div className="text-xs opacity-75 mb-1">Anomaly Score</div>
                            <div className="text-lg font-bold">{prediction.anomaly_score.toFixed(2)}</div>
                        </div>
                    )}
                </div>

                {/* Key Indicators */}
                {monitoring_data && (
                    <div className="bg-black/20 rounded p-3">
                        <div className="text-xs font-semibold mb-2 opacity-75">Key Indicators:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="opacity-75">Deauth Rate:</span>
                                <span className="ml-2 font-mono">{monitoring_data.deauth_frame_rate?.toFixed(1)}/s</span>
                            </div>
                            <div>
                                <span className="opacity-75">Reconnections:</span>
                                <span className="ml-2 font-mono">{monitoring_data.reconnection_frequency?.toFixed(1)}/min</span>
                            </div>
                            <div>
                                <span className="opacity-75">Packet Loss:</span>
                                <span className="ml-2 font-mono">{monitoring_data.packet_loss_rate?.toFixed(1)}%</span>
                            </div>
                            <div>
                                <span className="opacity-75">Mgmt Burst:</span>
                                <span className="ml-2 font-mono">{monitoring_data.mgmt_frame_burst_score?.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                {prediction.timestamp && (
                    <div className="text-xs opacity-75 text-right">
                        Last updated: {new Date(prediction.timestamp).toLocaleTimeString()}
                    </div>
                )}

                {/* Model Info */}
                {prediction.threshold && (
                    <div className="text-xs opacity-60 pt-2 border-t border-white/20">
                        Model threshold: {prediction.threshold.toFixed(4)} | 
                        Reconstruction error: {prediction.reconstruction_error?.toFixed(4)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeauthDetection;
