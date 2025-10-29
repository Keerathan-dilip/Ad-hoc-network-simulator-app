import React, { forwardRef, useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    LineChart, Line
} from 'recharts';
import { Node, SimulationParameters, NetworkComponentType, SensorEventType } from '../types';
import IPConfigurationPanel from './IPConfigurationPanel';
import SensorDataTable from './SensorDataTable';
import LiveSensorControl from './LiveSensorControl';

interface ReportDashboardProps {
  simulationData: {
    'AI-Based': SimulationParameters;
    'Traditional': SimulationParameters;
  };
  nodes: Node[];
  weakNodes: Node[];
  onReconstruct: () => void;
  onUpdateNodeIp: (nodeId: string, ipAddress: string) => void;
  isUpdating: boolean;
  onSimulateSensorEvent: (eventType: SensorEventType) => void;
}

type ChartType = 'pie' | 'line' | 'stat' | 'progress' | 'bar' | 'stat_combined';

interface LiveDataPoint {
    time: string;
    aiPDR: number;
    tradPDR: number;
    aiThroughput: number;
    tradThroughput: number;
}

const PARAMETER_CONFIG: {
    key: keyof SimulationParameters | 'Network Longevity';
    higherIsBetter: boolean;
    unit: string;
    displayName?: string;
    chartType: ChartType;
}[] = [
  { key: 'Packet Delivery Ratio', higherIsBetter: true, unit: '%', chartType: 'pie' },
  { key: 'Throughput (Mbps)', higherIsBetter: true, unit: 'Mbps', chartType: 'bar' },
  { key: 'End-to-end Delay (ms)', higherIsBetter: false, displayName: 'Responsiveness', unit: '(Higher is better)', chartType: 'line' },
  { key: 'Energy Consumption (J)', higherIsBetter: false, displayName: 'Energy Conservation', unit: '(Higher is better)', chartType: 'line' },
  { key: 'Network Longevity', higherIsBetter: true, unit: 'hours (or sustained operation cycles)', displayName: 'Network Longevity', chartType: 'stat_combined' },
  { key: 'Scalability Index', higherIsBetter: true, unit: '', chartType: 'progress' },
  { key: 'Computational Efficiency (%)', higherIsBetter: true, unit: '%', chartType: 'bar' },
  { key: 'Energy Efficiency', higherIsBetter: true, unit: '%', chartType: 'pie' },
  { key: 'Robustness Index', higherIsBetter: true, unit: '', chartType: 'progress' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-gray-800 border border-cyan-500 rounded-md shadow-lg">
          {payload.map((pld: any, index: number) => {
            const color = pld.stroke || pld.fill;
            const name = pld.name || label;
            return (
             <div key={index} style={{ color }}>{`${name}: ${pld.value.toFixed(2)}`}</div>
            )
          })}
        </div>
      );
    }
    return null;
};

const COLORS_AI = ['#22d3ee', '#374151'];
const COLORS_TRADITIONAL = ['#f97316', '#374151'];

const PieChartComponent: React.FC<{ data: any }> = ({ data }) => {
    const aiValue = data['AI-Based'] * 100;
    const traditionalValue = data['Traditional'] * 100;

    const aiPieData = [ { name: 'Value', value: aiValue }, { name: 'Remainder', value: 100 - aiValue }];
    const traditionalPieData = [ { name: 'Value', value: traditionalValue }, { name: 'Remainder', value: 100 - traditionalValue }];

    return (
        <div className="flex justify-around items-center h-full">
            <div className="w-1/2 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Pie data={aiPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                            {aiPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_AI[index % COLORS_AI.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-sm font-semibold text-cyan-300">AI: {aiValue.toFixed(1)}%</p>
            </div>
            <div className="w-1/2 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Pie data={traditionalPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                            {traditionalPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_TRADITIONAL[index % COLORS_TRADITIONAL.length]} />)}
                        </Pie>
                         <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                 <p className="text-center text-sm font-semibold text-orange-400">Traditional: {traditionalValue.toFixed(1)}%</p>
            </div>
        </div>
    );
};

const LineComparisonChart: React.FC<{ data: any }> = ({ data }) => {
    const chartData = [
        { name: 'Traditional', value: data['Traditional'] },
        { name: 'AI-Based', value: data['AI-Based'] }
    ];
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#37415180'}} />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} name="Performance Score" dot={{ r: 6, fill: '#facc15' }} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

const KeyStatDisplay: React.FC<{ data: any }> = ({ data }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="mb-4">
            <p className="text-4xl lg:text-5xl font-bold text-cyan-300">{data['AI-Based']}</p>
            <p className="text-sm font-medium text-cyan-500">AI-Based</p>
        </div>
        <div>
            <p className="text-2xl font-semibold text-orange-400">{data['Traditional']}</p>
            <p className="text-xs font-medium text-orange-600">Traditional</p>
        </div>
    </div>
);

const LongevityStatDisplay: React.FC<{ data: any }> = ({ data }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="mb-4">
            <p className="text-4xl lg:text-5xl font-bold text-cyan-300">{data['AI-Based'].lifetime}h</p>
            <p className="text-gray-300 text-sm">({data['AI-Based'].cycles} cycles)</p>
            <p className="text-sm font-medium text-cyan-500 mt-1">AI-Based</p>
        </div>
        <div>
            <p className="text-2xl font-semibold text-orange-400">{data['Traditional'].lifetime}h</p>
            <p className="text-gray-400 text-xs">({data['Traditional'].cycles} cycles)</p>
            <p className="text-xs font-medium text-orange-600 mt-1">Traditional</p>
        </div>
    </div>
);

const IndexProgress: React.FC<{ data: any }> = ({ data }) => {
    const aiValue = data['AI-Based'] * 100;
    const traditionalValue = data['Traditional'] * 100;
    return (
        <div className="flex flex-col justify-center h-full space-y-4 px-4">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-cyan-300">AI-Based</span>
                    <span className="text-xs font-semibold text-cyan-300">{aiValue.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${aiValue}%` }}></div>
                </div>
            </div>
            <div>
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-orange-400">Traditional</span>
                    <span className="text-xs font-semibold text-orange-400">{traditionalValue.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${traditionalValue}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const BarComparisonChart: React.FC<{ data: any }> = ({ data }) => (
     <ResponsiveContainer width="100%" height={250}>
        <BarChart data={[data]} layout="vertical" margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="name" type="category" tick={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} formatter={(value: number) => value.toPrecision(3)} />
            <Legend />
            <Bar dataKey="AI-Based" fill="#22d3ee" />
            <Bar dataKey="Traditional" fill="#f97316" />
        </BarChart>
    </ResponsiveContainer>
);


const UnifiedChart: React.FC<{ data: any; type: ChartType }> = ({ data, type }) => {
    switch (type) {
        case 'pie': return <PieChartComponent data={data} />;
        case 'line': return <LineComparisonChart data={data} />;
        case 'stat': return <KeyStatDisplay data={data} />;
        case 'stat_combined': return <LongevityStatDisplay data={data} />;
        case 'progress': return <IndexProgress data={data} />;
        case 'bar': return <BarComparisonChart data={data} />;
        default: return null;
    }
};

const LiveChart: React.FC<{ data: LiveDataPoint[]; title: string; unit: string; dataKeyAI: keyof LiveDataPoint; dataKeyTrad: keyof LiveDataPoint; domain: [number | string, number | string] }> =
    ({ data, title, unit, dataKeyAI, dataKeyTrad, domain }) => {
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg h-full flex flex-col min-h-[320px]">
            <h3 className="text-md font-semibold text-center text-cyan-200">{title}</h3>
            <p className="text-xs text-center text-gray-400 mb-2">{unit}</p>
            <div className="flex-grow">
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} domain={domain} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                        <Legend />
                        <Line type="monotone" name="AI-Based" dataKey={dataKeyAI} stroke="#22d3ee" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Traditional" dataKey={dataKeyTrad} stroke="#f97316" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ReportDashboard = forwardRef<HTMLDivElement, ReportDashboardProps>(({ simulationData, nodes, weakNodes, onReconstruct, onUpdateNodeIp, isUpdating, onSimulateSensorEvent }, ref) => {
  const [liveChartData, setLiveChartData] = useState<LiveDataPoint[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
        const baseAiPDR = simulationData['AI-Based']['Packet Delivery Ratio'];
        const baseTradPDR = simulationData['Traditional']['Packet Delivery Ratio'];
        const baseAiThroughput = simulationData['AI-Based']['Throughput (Mbps)'];
        const baseTradThroughput = simulationData['Traditional']['Throughput (Mbps)'];
        
        const newPoint: LiveDataPoint = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            aiPDR: baseAiPDR * (1 - (Math.random() - 0.5) * 0.02), // +/- 1% fluctuation
            tradPDR: baseTradPDR * (1 - (Math.random() - 0.5) * 0.04), // +/- 2% fluctuation
            aiThroughput: baseAiThroughput * (1 - (Math.random() - 0.5) * 0.05), // +/- 2.5% fluctuation
            tradThroughput: baseTradThroughput * (1 - (Math.random() - 0.5) * 0.08) // +/- 4% fluctuation
        };

        setLiveChartData(prev => [...prev.slice(-29), newPoint]); // Keep last 30 data points
    }, 1500);

    return () => clearInterval(interval);
  }, [simulationData]);


  const processedData = PARAMETER_CONFIG.map(config => {
    if (config.key === 'Network Longevity') {
        const aiLifetime = simulationData['AI-Based']['Network Lifetime (hours)'];
        const aiCycles = simulationData['AI-Based']['Sustained Operations (cycles)'];
        const tradLifetime = simulationData['Traditional']['Network Lifetime (hours)'];
        const tradCycles = simulationData['Traditional']['Sustained Operations (cycles)'];

        return {
            name: config.displayName || config.key,
            unit: config.unit,
            chartType: config.chartType,
            'AI-Based': { lifetime: aiLifetime, cycles: aiCycles },
            'Traditional': { lifetime: tradLifetime, cycles: tradCycles },
        };
    }
      
    const aiValue = simulationData['AI-Based'][config.key as keyof SimulationParameters];
    const traditionalValue = simulationData['Traditional'][config.key as keyof SimulationParameters];

    let displayAiValue, displayTraditionalValue;

    if (config.higherIsBetter) {
      displayAiValue = aiValue;
      displayTraditionalValue = traditionalValue;
    } else {
      // Create an inverted "score" where higher is better for intuitive visualization
      displayAiValue = aiValue !== 0 ? 100 / aiValue : Infinity;
      displayTraditionalValue = traditionalValue !== 0 ? 100 / traditionalValue : Infinity;
    }
    
    return {
      name: config.displayName || config.key,
      unit: config.unit,
      chartType: config.chartType,
      'AI-Based': displayAiValue,
      'Traditional': displayTraditionalValue,
    };
  });

  const baseAiPDR = simulationData['AI-Based']['Packet Delivery Ratio'];
  const pdrDomain: [number | string, number | string] = [Math.max(0, Math.min(0.95, baseAiPDR - 0.2)), 1.0];

  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-6 mt-4 animate-fadeIn relative">
      {isUpdating && (
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-cyan-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-cyan-200">Updating Report...</p>
            </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-cyan-300">Detailed Performance Report</h2>
          <p className="text-sm text-gray-400 mt-1">Live data reflecting your current design.</p>
        </div>
      </div>
      <div ref={ref}>
        <div className="p-4 bg-gray-900 rounded-lg">
            <div id="performance-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {processedData.map((paramData) => (
                    <div key={paramData.name} className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg h-full flex flex-col min-h-[320px]">
                        <h3 className="text-md font-semibold text-center text-cyan-200 mb-1">{paramData.name}</h3>
                        <p className="text-xs text-center text-gray-400 mb-3 h-4">{paramData.unit}</p>
                        <div className="flex-grow">
                            <UnifiedChart data={paramData} type={paramData.chartType as ChartType} />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {liveChartData.length > 0 && (
            <div className="mt-8">
                <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Live Performance Monitoring</h2>
                <div id="live-charts" className="p-4 bg-gray-900 rounded-lg grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <LiveChart
                        data={liveChartData}
                        title="Packet Delivery Ratio"
                        unit="%"
                        dataKeyAI="aiPDR"
                        dataKeyTrad="tradPDR"
                        domain={pdrDomain}
                    />
                    <LiveChart
                        data={liveChartData}
                        title="Throughput"
                        unit="Mbps"
                        dataKeyAI="aiThroughput"
                        dataKeyTrad="tradThroughput"
                        domain={['auto', 'auto']}
                    />
                </div>
            </div>
        )}

        <div className="mt-8">
            <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Node Health & Details</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg">
                    <h3 className="text-lg font-semibold text-cyan-200 mb-3">Node Energy Status</h3>
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-4 py-2">Node ID</th>
                                    <th scope="col" className="px-4 py-2">Type</th>
                                    <th scope="col" className="px-4 py-2">Efficiency (%)</th>
                                    <th scope="col" className="px-4 py-2">Spent (J)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nodes.map((node, index) => (
                                    <tr key={node.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                        <td className="px-4 py-2 font-medium">Node {index + 1}</td>
                                        <td className="px-4 py-2 capitalize">{node.type.replace('_', ' ').toLowerCase()}</td>
                                        <td className={`px-4 py-2 ${node.type === NetworkComponentType.NODE && node.energyEfficiency < 85 ? 'text-red-400 font-bold' : 'text-green-400'}`}>{node.energyEfficiency}</td>
                                        <td className="px-4 py-2">{node.energySpent}</td>
                                    </tr>
                                ))}
                                {nodes.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-gray-500">No nodes in the network.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg flex flex-col">
                    <h3 className="text-lg font-semibold text-cyan-200 mb-3">Network Self-Healing</h3>
                    {weakNodes.length > 0 ? (
                        <div className="flex-grow flex flex-col justify-between">
                            <div>
                                <p className="text-red-400 font-semibold mb-2">{weakNodes.length} weaker node(s) detected (efficiency &lt; 85%).</p>
                                <p className="text-sm text-gray-400 mb-4">Removing these nodes can improve overall network lifetime and performance. The network will attempt to reconstruct connections.</p>
                                <ul className="text-xs list-disc list-inside text-gray-400">
                                    {weakNodes.map((node) => <li key={node.id}>Node {nodes.findIndex(n => n.id === node.id) + 1} (End device)</li>)}
                                </ul>
                            </div>
                            <button
                                onClick={onReconstruct}
                                className="mt-4 w-full px-5 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-all duration-300 flex items-center justify-center space-x-2"
                            >
                                <span>Remove Weaker Nodes & Reconstruct</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-green-400 text-center">Network is healthy. No weak nodes detected.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        <div className="mt-8">
            <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Environmental Sensors</h2>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SensorDataTable nodes={nodes} />
                </div>
                <div>
                    <LiveSensorControl onSimulateEvent={onSimulateSensorEvent} disabled={nodes.length === 0} />
                </div>
            </div>
        </div>

        <div className="mt-8">
            <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Network Configuration</h2>
            <IPConfigurationPanel nodes={nodes} onUpdateNodeIp={onUpdateNodeIp} />
        </div>
      </div>
    </div>
  );
});

export default ReportDashboard;