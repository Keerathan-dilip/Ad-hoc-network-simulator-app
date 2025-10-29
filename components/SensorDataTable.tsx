import React from 'react';
import { Node } from '../types';

interface SensorDataTableProps {
  nodes: Node[];
}

const SensorDataTable: React.FC<SensorDataTableProps> = ({ nodes }) => {
  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg">
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50 sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-2">Node</th>
              <th scope="col" className="px-4 py-2 text-right">Temperature (°C)</th>
              <th scope="col" className="px-4 py-2 text-right">Humidity (%)</th>
              <th scope="col" className="px-4 py-2 text-right">Interference (dBm)</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node, index) => (
              <tr key={node.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                <td className="px-4 py-2 font-medium">Node {index + 1}</td>
                <td className="px-4 py-2 text-right font-mono">{node.sensorData?.temperature.toFixed(1) ?? 'N/A'}</td>
                <td className="px-4 py-2 text-right font-mono">{node.sensorData?.humidity.toFixed(1) ?? 'N/A'}</td>
                <td className="px-4 py-2 text-right font-mono">{node.sensorData?.signalInterference.toFixed(0) ?? 'N/A'}</td>
              </tr>
            ))}
            {nodes.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">No sensor data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SensorDataTable;