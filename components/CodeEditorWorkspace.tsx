
import React, { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MOCK_CODE_AWK } from '../constants';
import { SimulationParameters, Node, Connection } from '../types';
import CodeDisplay from './CodeDisplay';
import { networkAnalysisService } from '../services/networkAnalysisService';
import { codeGenerationService } from '../services/codeGenerationService';
import Chatbot from './Chatbot';

interface CodeEditorWorkspaceProps {
  nodes: Node[];
  connections: Connection[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setClusterHeadIds: React.Dispatch<React.SetStateAction<string[]>>;
}

type ResultsTab = 'charts' | 'awk';

const ANIMATION_SEQUENCES = {
    cpp: [14, 18, 22, 29, 33, 37, 43, 45, 46, 48],
    tcl: [5, 8, 11, 14, 15, 18, 22, 26, 30, 33],
    awk: [6, 14, 24, 25, 14, 24, 25, 14, 30, 31, 32],
};
const ANIMATION_INTERVAL = 150;

const MetricChart: React.FC<{ data: any }> = ({ data }) => {
    const chartData = [
      { name: 'Comparison', 'AI-Based': data['AI-Based'], 'Traditional': data['Traditional'] }
    ];
    return (
      <div className="mb-4 p-3 rounded-lg bg-gray-900/50 border border-cyan-500/10">
        <h4 className="text-md font-semibold text-cyan-200 mb-2 text-center">{data.name}</h4>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={false} />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
            <Legend />
            <Bar dataKey="AI-Based" fill="#22d3ee" />
            <Bar dataKey="Traditional" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
};

const CodeEditorWorkspace: React.FC<CodeEditorWorkspaceProps> = ({ nodes, connections, setNodes, setConnections, setClusterHeadIds }) => {
  const [simulationData, setSimulationData] = useState<any[] | null>(null);
  const [awkOutput, setAwkOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('charts');
  
  const [cppCode, setCppCode] = useState('');
  const [tclCode, setTclCode] = useState('');
  const [awkCode, setAwkCode] = useState(MOCK_CODE_AWK);

  const [highlightedCppLine, setHighlightedCppLine] = useState<number | null>(null);
  const [highlightedTclLine, setHighlightedTclLine] = useState<number | null>(null);
  const [highlightedAwkLine, setHighlightedAwkLine] = useState<number | null>(null);
  const animationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const newCppCode = codeGenerationService.generateCppCode(nodes, connections);
    const newTclCode = codeGenerationService.generateTclCode(nodes, connections);
    setCppCode(newCppCode);
    setTclCode(newTclCode);
  }, [nodes, connections]);

  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

  const runSimulation = () => {
    if (nodes.length < 2) {
      alert("Please configure a network with at least 2 nodes in the Visual Builder before running a simulation.");
      return;
    }

    setIsRunning(true);
    setSimulationData(null);
    setAwkOutput(null);
    setHighlightedCppLine(null);
    setHighlightedTclLine(null);
    setHighlightedAwkLine(null);
    
    const animate = (
        sequence: number[],
        lineSetter: React.Dispatch<React.SetStateAction<number | null>>,
        onComplete: () => void
    ) => {
        let step = 0;
        animationIntervalRef.current = window.setInterval(() => {
            if (step < sequence.length) {
                lineSetter(sequence[step]);
                step++;
            } else {
                if(animationIntervalRef.current) clearInterval(animationIntervalRef.current);
                lineSetter(null);
                onComplete();
            }
        }, ANIMATION_INTERVAL);
    };

    // Start animation chain
    animate(ANIMATION_SEQUENCES.cpp, setHighlightedCppLine, () => {
      animate(ANIMATION_SEQUENCES.tcl, setHighlightedTclLine, () => {
        animate(ANIMATION_SEQUENCES.awk, setHighlightedAwkLine, () => {
          // All animations finished, now show results based on visual builder network
          const topology = networkAnalysisService.identifyTopology(nodes, connections);
          const results = networkAnalysisService.simulatePerformance(topology, nodes, connections);
          
          const formattedData = Object.keys(results['AI-Based']).map(key => ({
            name: key,
            'AI-Based': results['AI-Based'][key as keyof SimulationParameters],
            'Traditional': results['Traditional'][key as keyof SimulationParameters],
          }));
          setSimulationData(formattedData);

          const pdr = results['AI-Based']['Packet Delivery Ratio'];
          const sent = 1000 + Math.floor(Math.random() * 200);
          const received = Math.round(sent * pdr);
          const time = 140.0 + Math.random() * 20;
          const mockAwk = `Total Packets Sent: ${sent}\nTotal Packets Received: ${received}\nPacket Delivery Ratio (PDR): ${(pdr * 100).toFixed(2)} %\nSimulation Time: ${time.toFixed(2)} s`;
          setAwkOutput(mockAwk);

          setIsRunning(false);
        });
      });
    });
  };

  const ResultsTabButton: React.FC<{ tabType: ResultsTab; label: string }> = ({ tabType, label }) => {
    const isActive = activeResultsTab === tabType;
    return (
      <button
        onClick={() => setActiveResultsTab(tabType)}
        className={`px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none ${
          isActive
            ? 'border-b-2 border-orange-400 text-orange-300'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={isActive}
      >
        {label}
      </button>
    );
  };
  
  const Editor: React.FC<{title: string, code: string, setCode: (c: string) => void, highlightedLine: number | null}> = ({title, code, setCode, highlightedLine}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy text.');
        });
    };
      
    return (
        <div className="relative flex flex-col bg-gray-900 rounded-md overflow-hidden border border-cyan-500/10 h-96">
            <div className="flex justify-between items-center p-2 border-b border-cyan-500/20 bg-gray-900/50">
              <h3 className="font-semibold text-cyan-400 ">{title}</h3>
              <button
                onClick={handleCopy}
                title="Copy code"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 ${
                  copied ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                aria-label={`Copy ${title} code`}
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="flex-grow font-mono text-sm min-h-0">
                 {isRunning ? (
                    <CodeDisplay code={code} highlightedLine={highlightedLine} />
                 ) : (
                    <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-full bg-transparent text-white resize-none focus:outline-none p-4" aria-label={`${title} Code Editor`} />
                 )}
            </div>
        </div>
    );
  }


  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-fadeIn">
      <div className="lg:w-2/3 flex flex-col bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-cyan-300">Simulator Suite</h2>
            <button
            onClick={runSimulation}
            disabled={isRunning}
            className="px-5 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center space-x-2"
            >
            {isRunning ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            )}
            <span>{isRunning ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
        </div>
        
        <div className="flex-grow flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
            <Editor title="NS-3 C++" code={cppCode} setCode={setCppCode} highlightedLine={highlightedCppLine} />
            <Editor title="TCL Script" code={tclCode} setCode={setTclCode} highlightedLine={highlightedTclLine} />
            <Editor title="AWK Script" code={awkCode} setCode={setAwkCode} highlightedLine={highlightedAwkLine} />
        </div>
      </div>
      <div className="lg:w-1/3 flex flex-col bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4">
        <h2 className="text-xl font-semibold text-cyan-300 mb-4">Simulation Analysis</h2>
        <div className="flex-grow flex flex-col">
          {isRunning && !simulationData && <div className="text-lg flex-grow flex items-center justify-center">Running simulation, please wait...</div>}
          {!isRunning && !simulationData && <div className="text-lg text-gray-400 flex-grow flex items-center justify-center">Configure a network in the Visual Builder and click 'Run Simulation'.</div>}
          {simulationData && (
             <div className="flex-grow flex flex-col min-h-0">
                 <div className="border-b border-orange-500/20 flex space-x-2 mb-4" role="tablist" aria-label="Results View">
                    <ResultsTabButton tabType="charts" label="Performance Charts" />
                    {awkOutput && <ResultsTabButton tabType="awk" label="Final Simulation Results" />}
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {activeResultsTab === 'charts' && (
                        <div>
                            {simulationData.map(d => <MetricChart key={d.name} data={d} />)}
                        </div>
                    )}
                    {activeResultsTab === 'awk' && awkOutput && (
                        <div className="bg-gray-900 rounded-md p-4 font-mono text-sm text-green-300 whitespace-pre-wrap">
                            {awkOutput}
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
      <Chatbot 
        setNodes={setNodes}
        setConnections={setConnections}
        setClusterHeadIds={setClusterHeadIds}
      />
    </div>
  );
};

export default CodeEditorWorkspace;
