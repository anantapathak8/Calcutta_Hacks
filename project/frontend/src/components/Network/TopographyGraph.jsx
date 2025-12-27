import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const NetworkMap = () => {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [selectedNode, setSelectedNode] = useState(null);
    const [blastRadius, setBlastRadius] = useState([]);
    const [loading, setLoading] = useState(true);
    const fgRef = useRef();

    const fetchGraph = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5001/api/network/graph');
            setGraphData(res.data);
        } catch (error) {
            console.error("Failed to fetch graph", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchGraph();
    }, []);

    const handleNodeClick = async (node) => {
        setSelectedNode(node);
        // Simulate Blast Radius calculation
        try {
            const res = await axios.post('http://localhost:5001/api/network/risk-simulation', { ip: node.ip });
            setBlastRadius(res.data.at_risk_nodes || []);
        } catch (error) {
            console.error("Simulation failed", error);
        }
    };

    // Color logic
    const getNodeColor = (node) => {
        if (selectedNode && node.ip === selectedNode.ip) return '#ff003c'; // Selected (Compromised source)
        if (blastRadius.find(n => n.ip === node.ip)) return '#ffd700'; // At risk
        if (node.type === 'router') return '#00f3ff';
        if (node.type === 'server') return '#bfdbfe';
        return '#4ade80'; // Normal
    };

    return (
        <div className="h-full flex flex-col relative bg-[#020202]">
            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-10 bg-black/80 p-4 border border-white/10 rounded backdrop-blur max-w-sm">
                <h2 className="text-[#00f3ff] font-bold text-lg mb-2 flex items-center gap-2">
                    <RefreshCw size={16} className="cursor-pointer hover:rotate-180 transition-all" onClick={fetchGraph} />
                    NETWORK TOPOLOGY
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                    Visualizing device hierarchy and lateral movement paths.
                    Click a node to simulate a compromise.
                </p>

                {selectedNode && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                        <h3 className="text-red-500 font-bold mb-1 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            SIMULATION: {selectedNode.ip} COMPROMISED
                        </h3>
                        <div className="bg-red-900/20 p-3 rounded border border-red-500/30 text-xs">
                            <p className="font-bold text-red-300 mb-2">BLAST RADIUS DETECTED:</p>
                            {blastRadius.length === 0 ? (
                                <p className="text-gray-500">No immediate lateral risks detected.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {blastRadius.map((risk, idx) => (
                                        <li key={idx} className="flex justify-between">
                                            <span className="text-gray-300">{risk.ip}</span>
                                            <span className="text-yellow-500 font-mono">Risk: {risk.risk_from_source}%</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                {!loading ? (
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        width={window.innerWidth - 300} // Rough adjustment for sidebar
                        height={window.innerHeight}
                        backgroundColor="#020202"
                        nodeLabel="ip"
                        nodeColor={getNodeColor}
                        nodeRelSize={6}
                        linkColor={() => "#333"}
                        onNodeClick={handleNodeClick}
                        cooldownTicks={100}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-[#00f3ff] animate-pulse">
                        SCANNING NETWORK TOPOLOGY...
                    </div>
                )}
            </div>
        </div>
    );
};

export default NetworkMap;
