import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SimulationParameters } from '../types';

interface LiveMonitoringChartsProps {
  initialData: {
    'AI-Based': SimulationParameters;
    'Traditional': SimulationParameters;
  };
}

const MAX_DATA_POINTS = 30;

const LiveMonitoringCharts: React.FC<LiveMonitoringChartsProps> = ({ initialData }) => {
  const [liveData, setLiveData] = useState<any[]>([]);

  useEffect(() => {
    const generateInitialData = () => {
      const now = new Date();
      const initialPoints = Array.from({ length: 10 }, (_, i) => {
        const time = new Date(now.getTime() - (10 - i) * 2000);
        return {
          time: time.toLocaleTimeString(),
          throughputAi: initialData['AI-Based']['Throughput (Mbps)'] * (0.95 + Math.random() * 0.1),
          throughputTrad: initialData['Traditional']['Throughput (Mbps)'] * (0.95 + Math.random() * 0.1),
          delayAi: initialData['AI-Based']['End-to-end Delay (ms)'] * (0.95 + Math.random() * 0.1),
          delayTrad: initialData['Traditional']['End-to-end Delay (ms)'] * (0.95 + Math.random() * 0.1),
        };
      });
      setLiveData(initialPoints);
    };

    generateInitialData();

    const interval = setInterval(() => {
      setLiveData(prevData => {
        const lastPoint = prevData[prevData.length - 1];
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          throughputAi: Math.max(0, lastPoint.throughputAi + (Math.random() - 0.5) * 5),
          throughputTrad: Math.max(0, lastPoint.throughputTrad + (Math.random() - 0.5) * 5),
          delayAi: Math.max(0, lastPoint.delayAi + (Math.random() - 0.5) * 10),
          delayTrad: Math.max(0, lastPoint.delayTrad + (Math.random() - 0.5) * 10),
        };
        const updatedData = [...prevData, newPoint];
        return updatedData.length > MAX_DATA_POINTS ? updatedData.slice(1) : updatedData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [initialData]);

  return (
    <div className="mt-6 bg-gray-800 rounded-lg shadow-2xl border border-cyan-500/20 p-6 animate-fadeIn">
        <h2 className="text-2xl font-bold text-cyan-300 mb-6">Live Performance Monitoring</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/10 h-80">
                <h3 className="text-lg font-semibold text-cyan-200 mb-4">Throughput (Mbps)</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                        <Legend />
                        <Line type="monotone" dataKey="throughputAi" name="AI-Based" stroke="#22d3ee" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="throughputTrad" name="Traditional" stroke="#f97316" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/10 h-80">
                <h3 className="text-lg font-semibold text-cyan-200 mb-4">End-to-end Delay (ms)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} domain={['dataMin - 15', 'dataMax + 15']} reversed />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                        <Legend />
                        <Line type="monotone" dataKey="delayAi" name="AI-Based" stroke="#22d3ee" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="delayTrad" name="Traditional" stroke="#f97316" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

        </div>
    </div>
  );
};

export default LiveMonitoringCharts;
