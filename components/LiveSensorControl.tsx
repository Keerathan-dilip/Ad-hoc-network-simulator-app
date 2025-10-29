import React from 'react';
import { SensorEventType } from '../types';

interface LiveSensorControlProps {
  onSimulateEvent: (eventType: SensorEventType) => void;
  disabled: boolean;
}

const LiveSensorControl: React.FC<LiveSensorControlProps> = ({ onSimulateEvent, disabled }) => {
  const buttonStyle = "w-full px-4 py-2 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 disabled:bg-gray-600/50 disabled:cursor-not-allowed disabled:text-gray-400";

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg h-full">
      <h4 className="text-md font-semibold text-cyan-200 mb-3 text-center">Live Data Feed Simulator</h4>
      <p className="text-xs text-gray-400 mb-4 text-center">Simulate environmental changes from a third-party source affecting the network.</p>
      <div className="space-y-3">
        <button
          onClick={() => onSimulateEvent('heat')}
          disabled={disabled}
          className={`${buttonStyle} bg-red-500 hover:bg-red-600 text-white`}
        >
          <span>🔥 Heat Spike</span>
        </button>
        <button
          onClick={() => onSimulateEvent('humidity')}
          disabled={disabled}
          className={`${buttonStyle} bg-blue-500 hover:bg-blue-600 text-white`}
        >
          <span>💧 Humidity Increase</span>
        </button>
        <button
          onClick={() => onSimulateEvent('flood')}
          disabled={disabled}
          className={`${buttonStyle} bg-blue-700 hover:bg-blue-800 text-white`}
        >
          <span>🌊 Flooding Event</span>
        </button>
        <button
          onClick={() => onSimulateEvent('interference')}
          disabled={disabled}
          className={`${buttonStyle} bg-purple-500 hover:bg-purple-600 text-white`}
        >
          <span>📡 Signal Jamming</span>
        </button>
        <div className="pt-2 border-t border-cyan-500/20">
          <button
            onClick={() => onSimulateEvent('reset')}
            disabled={disabled}
            className={`${buttonStyle} bg-gray-600 hover:bg-gray-500 text-white`}
          >
            <span>✅ Return to Normal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveSensorControl;