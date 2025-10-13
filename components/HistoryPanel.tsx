
import React from 'react';
import { Node, Connection } from '../types';

interface HistoryEntry {
    nodes: Node[];
    connections: Connection[];
    clusterHeadIds: string[];
    name: string;
    timestamp: number;
}

interface HistoryPanelProps {
    history: HistoryEntry[];
    onRestore: (entry: HistoryEntry) => void;
    onDelete: (timestamp: number) => void;
    onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore, onClose, onDelete }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex justify-end" onClick={onClose}>
            <div className="w-full max-w-md h-full bg-gray-800 shadow-2xl border-l border-cyan-500/20 flex flex-col animate-fadeIn" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-cyan-500/20 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-300">Network History</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {history.length === 0 ? (
                        <p className="p-4 text-gray-400">No history saved yet. Generate or save a network to create a history entry.</p>
                    ) : (
                        <ul className="divide-y divide-gray-700">
                            {history.map((entry) => (
                                <li key={entry.timestamp} className="p-4 hover:bg-gray-700/50 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white">{entry.name}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(entry.timestamp).toLocaleString()} | {entry.nodes.length} nodes, {entry.connections.length} connections
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => onRestore(entry)}
                                                className="px-3 py-1 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                                                aria-label={`Restore network state from ${new Date(entry.timestamp).toLocaleString()}`}
                                            >
                                                Restore
                                            </button>
                                            <button
                                                onClick={() => onDelete(entry.timestamp)}
                                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                                                aria-label={`Delete history entry from ${new Date(entry.timestamp).toLocaleString()}`}
                                                title="Delete this entry"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryPanel;
