import React, { forwardRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend, RadialBarChart, RadialBar, PolarAngleAxis, CartesianGrid } from 'recharts';
import { SimulationParameters } from '../types';

interface ReportDashboardProps {
    simulationData: {
        'AI-Based': SimulationParameters;
        'Traditional': SimulationParameters;
    };
    isUpdating: boolean;
    onDownloadParameterGraph: (parameter: keyof SimulationParameters) => void;
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

const ReportDashboard = forwardRef<HTMLDivElement, ReportDashboardProps>(({
    simulationData,
    isUpdating,
    onDownloadParameterGraph
}, ref) => {
    
    const aiData = simulationData['AI-Based'];
    const tradData = simulationData['Traditional'];

    return (
        <div ref={ref} className={`bg-gray-800 rounded-lg rounded-tl-none shadow-2xl border border-cyan-500/20 p-6 transition-opacity duration-300 ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
            <h2 className="text-2xl font-bold text-cyan-300 mb-6">Detailed Performance Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <MetricCard title="Packet Delivery Ratio" onDownload={() => onDownloadParameterGraph('Packet Delivery Ratio')}>
                    <RadialGaugeChart aiValue={aiData['Packet Delivery Ratio'] * 100} tradValue={tradData['Packet Delivery Ratio'] * 100} />
                </MetricCard>

                <MetricCard title="Throughput (Mbps)" onDownload={() => onDownloadParameterGraph('Throughput (Mbps)')}>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={[{ name: 'Throughput', 'AI-Based': aiData['Throughput (Mbps)'], 'Traditional': tradData['Throughput (Mbps)'] }]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" tick={false} />
                            <YAxis stroke="#9ca3af" domain={[0, 'dataMax + 10']} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                            <Legend wrapperStyle={{ position: 'relative' }} />
                            <Bar dataKey="AI-Based" fill="#22d3ee" barSize={35} radius={[5, 5, 0, 0]} />
                            <Bar dataKey="Traditional" fill="#f97316" barSize={35} radius={[5, 5, 0, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="End-to-end Delay (ms)" onDownload={() => onDownloadParameterGraph('End-to-end Delay (ms)')}>
                     <ResponsiveContainer width="100%" height="80%">
                        <LineChart data={[{ name: 'Traditional', value: tradData['End-to-end Delay (ms)'] }, { name: 'AI-Based', value: aiData['End-to-end Delay (ms)'] }]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" domain={['dataMin - 10', 'auto']} reversed={true} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                            <Line type="monotone" dataKey="value" name="Delay (lower is better)" stroke="#ef4444" strokeWidth={3} dot={{ r: 6, fill: '#ef4444' }} activeDot={{r: 8}} />
                        </LineChart>
                    </ResponsiveContainer>
                </MetricCard>
                
                <MetricCard title="Energy Consumption (J/hr)" onDownload={() => onDownloadParameterGraph('Energy Consumption (J)')}>
                     <ResponsiveContainer width="100%" height="80%">
                        <LineChart data={[{ name: 'Traditional', value: tradData['Energy Consumption (J)'] }, { name: 'AI-Based', value: aiData['Energy Consumption (J)'] }]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" domain={['dataMin - 50', 'auto']} reversed={true} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                            <Line type="monotone" dataKey="value" name="Consumption (lower is better)" stroke="#82ca9d" strokeWidth={3} dot={{ r: 6, fill: '#82ca9d' }} activeDot={{r: 8}}/>
                        </LineChart>
                    </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Network Lifetime" onDownload={() => onDownloadParameterGraph('Network Lifetime (hours)')}>
                    <div className="flex justify-around items-center w-full text-center">
                        <div className="p-2">
                            <p className="text-5xl font-bold text-cyan-300">{Math.round(aiData['Network Lifetime (hours)'])}</p>
                            <p className="text-sm text-cyan-400">hours (AI)</p>
                             <p className="text-lg font-semibold text-cyan-200 mt-2">~{Math.round(aiData['Network Cycles'] ?? 0).toLocaleString()} cycles</p>
                        </div>
                        <div className="h-24 w-px bg-gray-600"></div>
                        <div className="p-2">
                            <p className="text-5xl font-bold text-orange-400">{Math.round(tradData['Network Lifetime (hours)'])}</p>
                            <p className="text-sm text-orange-500">hours (Trad.)</p>
                            <p className="text-lg font-semibold text-orange-300 mt-2">~{Math.round(tradData['Network Cycles'] ?? 0).toLocaleString()} cycles</p>
                        </div>
                    </div>
                </MetricCard>

                <MetricCard title="Robustness Index" onDownload={() => onDownloadParameterGraph('Robustness Index')}>
                     <RadialGaugeChart aiValue={aiData['Robustness Index'] * 100} tradValue={tradData['Robustness Index'] * 100} />
                </MetricCard>
                
            </div>
        </div>
    );
});

export default ReportDashboard;