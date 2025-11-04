import React, { forwardRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend, RadialBarChart, RadialBar, PolarAngleAxis, CartesianGrid, LabelList } from 'recharts';
import { SimulationParameters, Node, NetworkComponentType } from '../types';
import IPConfigurationPanel from './IPConfigurationPanel';

interface ReportDashboardProps {
    simulationData: {
        'AI-Based': SimulationParameters;
        'Traditional': SimulationParameters;
    };
    isUpdating: boolean;
    onDownloadParameterGraph: (parameter: keyof SimulationParameters) => void;
    nodes: Node[];
    onReconstruct: () => void;
    onUpdateNodeIp: (nodeId: string, ipAddress: string) => void;
}

const MetricCard: React.FC<{title: string, onDownload: () => void, children: React.ReactNode}> = ({ title, onDownload, children }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg flex flex-col h-full min-h-[220px]">
        <div className="flex justify-between items-center mb-2">
             <h4 className="text-md font-semibold text-cyan-200 truncate" title={title}>{title}</h4>
             <button 
                onClick={onDownload} 
                title={`Download ${title} Report`}
                className="text-gray-400 hover:text-cyan-300 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
        <div className="flex-grow flex items-center justify-center">{children}</div>
    </div>
);

const RadialGaugeChart: React.FC<{ aiValue: number, tradValue: number }> = ({ aiValue, tradValue }) => {
    const data = [
        { name: 'AI-Based', value: aiValue, fill: '#22d3ee' },
        { name: 'Traditional', value: tradValue, fill: '#f97316' },
    ];
    return (
        <div className="w-full h-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                    innerRadius="40%" 
                    outerRadius="100%" 
                    data={data} 
                    startAngle={180} 
                    endAngle={-180}
                    barSize={15}
                >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#374151' }} dataKey="value" angleAxisId={0} cornerRadius={8} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', bottom: -5, position: 'relative' }} />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-4">
                <div className="text-center">
                    <span className="text-3xl font-bold text-cyan-200">
                        {aiValue.toFixed(1)}%
                    </span>
                    <span className="text-xs block text-cyan-400">AI-Based</span>
                </div>
            </div>
        </div>
    );
};

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

const ReportDashboard = forwardRef<HTMLDivElement, ReportDashboardProps>(({
    simulationData,
    isUpdating,
    onDownloadParameterGraph,
    nodes,
    onReconstruct,
    onUpdateNodeIp,
}, ref) => {
    
    const aiData = simulationData['AI-Based'];
    const tradData = simulationData['Traditional'];

    const weakNodes = nodes.filter(n => n.energyEfficiency < 85);

    const getNodeStatus = (node: Node) => {
        if (node.isMalicious) return { text: 'Malicious', color: 'text-red-400 animate-pulse' };
        if (node.energyEfficiency < 85) return { text: 'Weaker', color: 'text-orange-400' };
        return { text: 'Healthy', color: 'text-green-400' };
    };

    return (
        <div ref={ref} className={`bg-gray-800 rounded-lg rounded-tl-none shadow-2xl border border-cyan-500/20 p-6 transition-opacity duration-300 ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
            <h2 className="text-2xl font-bold text-cyan-300 mb-6">Detailed Performance Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <MetricCard title="Packet Delivery Ratio" onDownload={() => onDownloadParameterGraph('Packet Delivery Ratio')}>
                    <RadialGaugeChart aiValue={aiData['Packet Delivery Ratio'] * 100} tradValue={tradData['Packet Delivery Ratio'] * 100} />
                </MetricCard>

                <MetricCard title="Responsiveness" onDownload={() => onDownloadParameterGraph('Responsiveness')}>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={[{ name: 'Responsiveness', 'AI-Based': aiData['Responsiveness'], 'Traditional': tradData['Responsiveness'] }]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" tick={false} />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                            <Legend wrapperStyle={{ position: 'relative' }} />
                            <Bar dataKey="AI-Based" fill="#22d3ee" barSize={35} radius={[5, 5, 0, 0]} />
                            <Bar dataKey="Traditional" fill="#f97316" barSize={35} radius={[5, 5, 0, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Energy Consumption (J)" onDownload={() => onDownloadParameterGraph('Energy Consumption (J)')}>
                     <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={[{ name: 'Consumption', 'AI-Based': aiData['Energy Consumption (J)'], 'Traditional': tradData['Energy Consumption (J)'] }]} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" tick={false} />
                            <YAxis stroke="#9ca3af" domain={[0, 'dataMax + 100']} label={{ value: 'Joules (lower is better)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12, offset: -10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                            <Legend wrapperStyle={{ position: 'relative' }} />
                            <Bar dataKey="AI-Based" fill="#22d3ee" barSize={35} radius={[5, 5, 0, 0]}>
                                <LabelList dataKey="AI-Based" position="top" style={{ fill: '#e5e7eb', fontSize: 12 }} formatter={(value: number) => value.toFixed(1)} />
                            </Bar>
                            <Bar dataKey="Traditional" fill="#f97316" barSize={35} radius={[5, 5, 0, 0]}>
                                <LabelList dataKey="Traditional" position="top" style={{ fill: '#e5e7eb', fontSize: 12 }} formatter={(value: number) => value.toFixed(1)} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Network Lifetime (hours)" onDownload={() => onDownloadParameterGraph('Network Lifetime (hours)')}>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart 
                            layout="vertical" 
                            data={[
                                { name: 'AI-Based', Lifetime: Math.round(aiData['Network Lifetime (hours)']), fill: '#22d3ee' },
                                { name: 'Traditional', Lifetime: Math.round(tradData['Network Lifetime (hours)']), fill: '#f97316' },
                            ]}
                            margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" stroke="#9ca3af" domain={[0, 'dataMax + 200']} />
                            <YAxis type="category" dataKey="name" stroke="#9ca3af" width={70} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} />
                            <Bar dataKey="Lifetime" barSize={25} radius={[0, 5, 5, 0]}>
                                 <LabelList dataKey="Lifetime" position="right" style={{ fill: '#e5e7eb', fontSize: 14, fontWeight: 'bold' }} formatter={(value: number) => `${value} hrs`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </MetricCard>
                
                <MetricCard title="Scalability Index" onDownload={() => onDownloadParameterGraph('Scalability Index')}>
                     <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={[{ name: 'Scalability', 'AI-Based': aiData['Scalability Index'], 'Traditional': tradData['Scalability Index'] }]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" tick={false} />
                            <YAxis stroke="#9ca3af" domain={[0, 1]}/>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} formatter={(value: number) => value.toFixed(2)} />
                            <Legend wrapperStyle={{ position: 'relative' }} />
                            <Bar dataKey="AI-Based" fill="#22d3ee" barSize={35} radius={[5, 5, 0, 0]} />
                            <Bar dataKey="Traditional" fill="#f97316" barSize={35} radius={[5, 5, 0, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Energy Efficiency" onDownload={() => onDownloadParameterGraph('Energy Efficiency')}>
                     <RadialGaugeChart aiValue={aiData['Energy Efficiency'] * 100} tradValue={tradData['Energy Efficiency'] * 100} />
                </MetricCard>

                <MetricCard title="Robustness Index" onDownload={() => onDownloadParameterGraph('Robustness Index')}>
                     <RadialGaugeChart aiValue={aiData['Robustness Index'] * 100} tradValue={tradData['Robustness Index'] * 100} />
                </MetricCard>
                
                <MetricCard title="Adaptability Rate" onDownload={() => onDownloadParameterGraph('Adaptability Rate')}>
                     <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={[{ name: 'Adaptability', 'AI-Based': aiData['Adaptability Rate'], 'Traditional': tradData['Adaptability Rate'] }]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" tick={false} />
                            <YAxis stroke="#9ca3af" domain={[0, 1]}/>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} formatter={(value: number) => value.toFixed(2)} />
                            <Legend wrapperStyle={{ position: 'relative' }} />
                            <Bar dataKey="AI-Based" fill="#22d3ee" barSize={35} radius={[5, 5, 0, 0]} />
                            <Bar dataKey="Traditional" fill="#f97316" barSize={35} radius={[5, 5, 0, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                </MetricCard>

            </div>

            <div className="mt-8 pt-6 border-t border-cyan-500/20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg">
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

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg">
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
                </div>
                 <div className="mt-6">
                    <IPConfigurationPanel nodes={nodes} onUpdateNodeIp={onUpdateNodeIp} />
                </div>
            </div>
        </div>
    );
});

export default ReportDashboard;