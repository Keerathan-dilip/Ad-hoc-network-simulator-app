import React, { useState, useCallback } from 'react';
import { Node } from '../types';

interface IPConfigurationPanelProps {
  nodes: Node[];
  onUpdateNodeIp: (nodeId: string, ipAddress: string) => void;
}

const IPConfigurationPanel: React.FC<IPConfigurationPanelProps> = ({ nodes, onUpdateNodeIp }) => {
  const [subnet, setSubnet] = useState('192.168.1');

  const handleAutoAssign = useCallback(() => {
    nodes.forEach((node, index) => {
      const newIp = `${subnet}.${index + 1}`;
      onUpdateNodeIp(node.id, newIp);
    });
  }, [nodes, subnet, onUpdateNodeIp]);

  return (
    <div className="bg-gray-900/50 p-3 rounded-lg border border-cyan-500/10 shadow-lg h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
        <h3 className="text-sm font-semibold text-cyan-200 mb-2 sm:mb-0">IP Address Configuration</h3>
        <div className="flex items-center space-x-2">
            <label htmlFor="subnet-input" className="text-sm font-medium text-gray-300 shrink-0">Subnet:</label>
            <input
            id="subnet-input"
            type="text"
            value={subnet}
            onChange={(e) => setSubnet(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            placeholder="e.g., 192.168.1"
            />
            <button
            onClick={handleAutoAssign}
            title="Auto-assign IPs based on subnet"
            className="px-3 py-1 bg-indigo-500 text-white font-semibold text-sm rounded-lg hover:bg-indigo-600 transition-colors duration-300"
            >
            Auto-Assign
            </button>
        </div>
      </div>
      <div className="flex-grow max-h-48 overflow-y-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50 sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-2">NODE</th>
              <th scope="col" className="px-4 py-2">IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {nodes.slice(0, 8).map((node, index) => ( // Show first 8 nodes like in PDF
              <tr key={node.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                <td className="px-4 py-2 font-medium">Node {index + 1}</td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={node.ipAddress}
                    onChange={(e) => onUpdateNodeIp(node.id, e.target.value)}
                    className="w-full bg-transparent border-0 p-0 focus:ring-0 focus:outline-none hover:bg-gray-700/50 focus:bg-gray-700 rounded px-1 transition-colors"
                    aria-label={`IP address for Node ${index + 1}`}
                  />
                </td>
              </tr>
            ))}
             {nodes.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center py-4 text-gray-500">No nodes to configure.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IPConfigurationPanel;