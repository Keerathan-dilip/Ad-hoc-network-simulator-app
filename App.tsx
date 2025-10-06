
import React, { useState, useCallback } from 'react';
import { Workspace, Node, Connection } from './types';
import CodeEditorWorkspace from './components/CodeEditorWorkspace';
import VisualBuilderWorkspace from './components/VisualBuilderWorkspace';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';

const App: React.FC = () => {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(Workspace.VISUAL);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [history, setHistory] = useState<{ nodes: Node[]; connections: Connection[] }[]>([]);
  const [clusterHeadIds, setClusterHeadIds] = useState<string[]>([]);
  const MAX_HISTORY_SIZE = 20;

  const saveSnapshot = useCallback(() => {
    setHistory(prev => {
        const snapshot = { nodes, connections };
        const newHistory = [...prev, snapshot];
        if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }
        return newHistory;
    });
  }, [nodes, connections]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    setNodes(lastState.nodes);
    setConnections(lastState.connections);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  return (
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
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-cyan-500/20 p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.5 12h17"></path></svg>
          <h1 className="text-2xl font-bold text-cyan-300 tracking-wider">Ad Hoc Network Simulator</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-700/50 disabled:text-gray-500 disabled:cursor-not-allowed"
            title="Undo last action"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V4.462A8.001 8.001 0 004.136 15.136a.75.75 0 11-1.215-.882A9.501 9.501 0 0110 2.5z" clipRule="evenodd" />
              <path d="M10 6a.75.75 0 01.75.75v3.19l2.73-1.638a.75.75 0 11.74 1.238l-3.5 2.1a.75.75 0 01-.74 0l-3.5-2.1a.75.75 0 11.74-1.238L9.25 9.94V6.75A.75.75 0 0110 6z" />
            </svg>
            <span>Undo</span>
          </button>
          <WorkspaceSwitcher activeWorkspace={activeWorkspace} setActiveWorkspace={setActiveWorkspace} />
        </div>
      </header>

      <main className="flex-grow p-4 lg:p-6">
        {activeWorkspace === Workspace.CODE && (
            <CodeEditorWorkspace 
                nodes={nodes} 
                connections={connections}
                setNodes={setNodes}
                setConnections={setConnections}
                setClusterHeadIds={setClusterHeadIds}
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
          />
        )}
      </main>
    </div>
  );
};

export default App;
