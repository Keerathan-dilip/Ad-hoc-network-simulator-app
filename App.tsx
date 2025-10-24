
import React, { useState, useCallback } from 'react';
import { Workspace, Node, Connection } from './types';
import CodeEditorWorkspace from './components/CodeEditorWorkspace';
import VisualBuilderWorkspace from './components/VisualBuilderWorkspace';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import HistoryPanel from './components/HistoryPanel';

interface HistoryEntry {
    nodes: Node[];
    connections: Connection[];
    clusterHeadIds: string[];
    name: string;
    timestamp: number;
}

const App: React.FC = () => {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(Workspace.VISUAL);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [undoHistory, setUndoHistory] = useState<{ nodes: Node[]; connections: Connection[]; clusterHeadIds: string[] }[]>([]);
  const [clusterHeadIds, setClusterHeadIds] = useState<string[]>([]);
  
  const [networkHistory, setNetworkHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const MAX_HISTORY_SIZE = 20;

  const saveSnapshot = useCallback(() => {
    setUndoHistory(prev => {
        const snapshot = { nodes, connections, clusterHeadIds };
        const newHistory = [...prev, snapshot];
        if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }
        return newHistory;
    });
  }, [nodes, connections, clusterHeadIds]);

  const addToHistory = useCallback((name: string) => {
    setNetworkHistory(prev => {
        const snapshot = { nodes, connections, clusterHeadIds, name, timestamp: Date.now() };
        const newHistory = [snapshot, ...prev];
        if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(0, MAX_HISTORY_SIZE);
        }
        return newHistory;
    });
  }, [nodes, connections, clusterHeadIds]);

  const restoreFromHistory = useCallback((entry: HistoryEntry) => {
    saveSnapshot(); // Save current state to undo history before restoring
    setNodes(entry.nodes);
    setConnections(entry.connections);
    setClusterHeadIds(entry.clusterHeadIds);
    setIsHistoryPanelOpen(false);
  }, [saveSnapshot]);

  const deleteFromHistory = useCallback((timestamp: number) => {
    setNetworkHistory(prev => prev.filter(entry => entry.timestamp !== timestamp));
  }, []);


  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0) return;

    const lastState = undoHistory[undoHistory.length - 1];
    setNodes(lastState.nodes);
    setConnections(lastState.connections);
    setClusterHeadIds(lastState.clusterHeadIds);
    setUndoHistory(prev => prev.slice(0, -1));
  }, [undoHistory]);

  return (
    <>
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-cyan-500/20 p-4 shadow-lg flex justify-between items-center z-30">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.5 12h17"></path></svg>
          <h1 className="text-2xl font-bold text-cyan-300 tracking-wider">Ad Hoc Network Simulator</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleUndo}
            disabled={undoHistory.length === 0}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-700/50 disabled:text-gray-500 disabled:cursor-not-allowed"
            title="Undo last action"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V4.462A8.001 8.001 0 004.136 15.136a.75.75 0 11-1.215-.882A9.501 9.501 0 0110 2.5z" clipRule="evenodd" />
              <path d="M10 6a.75.75 0 01.75.75v3.19l2.73-1.638a.75.75 0 11.74 1.238l-3.5 2.1a.75.75 0 01-.74 0l-3.5-2.1a.75.75 0 11.74-1.238L9.25 9.94V6.75A.75.75 0 0110 6z" />
            </svg>
            <span>Undo</span>
          </button>
           <button
            onClick={() => setIsHistoryPanelOpen(prev => !prev)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-gray-700 text-gray-300 hover:bg-gray-600"
            title="View network history"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span>History</span>
          </button>
          <WorkspaceSwitcher activeWorkspace={activeWorkspace} setActiveWorkspace={setActiveWorkspace} />
        </div>
      </header>

      <main className="flex-grow p-4 lg:p-6">
        {activeWorkspace === Workspace.CODE && (
            <CodeEditorWorkspace 
                nodes={nodes} 
                connections={connections}
            />
        )}
        {activeWorkspace === Workspace.VISUAL && (
          <VisualBuilderWorkspace
            nodes={nodes}
            setNodes={setNodes}
            connections={connections}
            setConnections={setConnections}
            saveSnapshot={saveSnapshot}
            clusterHeadIds={clusterHeadIds}
            setClusterHeadIds={setClusterHeadIds}
            addToHistory={addToHistory}
          />
        )}
      </main>
    </div>
    {isHistoryPanelOpen && (
        <HistoryPanel 
            history={networkHistory}
            onRestore={restoreFromHistory}
            onDelete={deleteFromHistory}
            onClose={() => setIsHistoryPanelOpen(false)}
        />
    )}
    </>
  );
};

export default App;
