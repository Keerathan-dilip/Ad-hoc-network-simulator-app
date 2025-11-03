import React from 'react';
import { Node, NetworkComponentType } from '../types';
import IPConfigurationPanel from './IPConfigurationPanel';

interface NetworkManagementPanelProps {
    nodes: Node[];
    onReconstruct: () => void;
    onUpdateNodeIp: (nodeId: string, ipAddress: string) => void;
}

const getNodeTypeLabel = (type: NetworkComponentType): string => {
    switch (type) {
        case NetworkComponentType.NODE: return 'End Node';
        case NetworkComponentType.ROUTER: return 'Infrastructure';
        case NetworkComponentType.SWITCH: return 'Infrastructure';
        case NetworkComponentType.BASE_STATION: return 'Infrastructure';
        default: {
            const exhaustiveCheck: never = type;
            return exhaustiveCheck;
        }
    }
};

const NetworkManagementPanel: React.FC<NetworkManagementPanelProps> = ({
    nodes,
    onReconstruct,
    onUpdateNodeIp,
}) => {
    const weakNodes = nodes.filter(n => n.energyEfficiency < 85);

    const getNodeStatus = (node: Node) => {
        if (node.isMalicious) return { text: 'Malicious', color: 'text-red-400 animate-pulse' };
        if (node.energyEfficiency < 85) return { text: 'Weaker', color: 'text-orange-400' };
        return { text: 'Healthy', color: 'text-green-400' };
    };

    return (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="lg:col-span-1 bg-gray-900/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-200 mb-3">Network Auto-Reconstruction</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center bg-gray-700/50 p-3 rounded-md">
                        <span className="font-medium text-gray-300">Weaker Nodes Identified:</span>
                        <span className="text-2xl font-bold text-orange-400">{weakNodes.length}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                        Weaker nodes (energy &lt; 85%) can be removed to improve stability. The AI will attempt to reconstruct optimal connections.
                    </p>
                    <button
                        onClick={onReconstruct}
                        disabled={weakNodes.length === 0}
                        className="w-full px-5 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-all duration-300 flex items-center justify-center space-x-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <span>Remove Weaker Nodes & Reconstruct</span>
                    </button>
                </div>
            </div>

            <div className="lg:col-span-1 bg-gray-900/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-200 mb-3">Node Health & Details</h3>
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-3 py-2">Node #</th>
                                <th scope="col" className="px-3 py-2">Type</th>
                                <th scope="col" className="px-3 py-2">Energy Status</th>
                                <th scope="col" className="px-3 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.map((node, index) => {
                                const status = getNodeStatus(node);
                                return (
                                    <tr key={node.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                        <td className="px-3 py-2 font-medium">Node {index + 1}</td>
                                        <td className="px-3 py-2">{getNodeTypeLabel(node.type)}</td>
                                        <td className="px-3 py-2">{node.energyEfficiency}%</td>
                                        <td className={`px-3 py-2 font-semibold ${status.color}`}>{status.text}</td>
                                    </tr>
                                );
                            })}
                            {nodes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-4 text-gray-500">No nodes in network.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="lg:col-span-1">
                <IPConfigurationPanel nodes={nodes} onUpdateNodeIp={onUpdateNodeIp} />
            </div>
        </div>
    );
};

export default NetworkManagementPanel;
