import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, Clock } from 'lucide-react';

interface APIStatusProps {
  className?: string;
}

const APIStatus: React.FC<APIStatusProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    // Simulate API health checks
    const checkAPI = () => {
      // In a real app, this would ping your API
      const isHealthy = Math.random() > 0.1; // 90% uptime simulation
      setIsOnline(isHealthy);
      
      if (isHealthy) {
        setLastSync(new Date());
        setSyncCount(prev => prev + 1);
      }
    };

    // Check immediately
    checkAPI();

    // Check every 30 seconds
    const interval = setInterval(checkAPI, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center space-x-2">
          <Activity className="w-4 h-4" />
          <span>Bot API Status</span>
        </h3>
        
        <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
          isOnline 
            ? 'bg-green-900/30 text-green-400 border border-green-500/50' 
            : 'bg-red-900/30 text-red-400 border border-red-500/50'
        }`}>
          {isOnline ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>Last Sync:</span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{lastSync.toLocaleTimeString()}</span>
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Sync Count:</span>
          <span className="text-blue-400 font-medium">{syncCount}</span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            Bot Integration: {isOnline ? '✅' : '❌'} Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIStatus;
