import React from 'react';
import { Clock, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ScamLog } from '../types';

interface ScamLogCardProps {
  log: ScamLog;
  onClick?: () => void;
}

const ScamLogCard: React.FC<ScamLogCardProps> = ({ log, onClick }) => {
  const getStatusIcon = (status: ScamLog['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: ScamLog['status']) => {
    switch (status) {
      case 'verified':
        return 'bg-green-900/30 text-green-400 border-green-500/50';
      case 'rejected':
        return 'bg-red-900/30 text-red-400 border-red-500/50';
      default:
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50';
    }
  };

  return (
    <div 
      className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 hover:border-gray-600 transition-all duration-300 cursor-pointer backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-600/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{log.scamDetails.type}</h3>
            <p className="text-gray-400 text-sm">#{log.id.slice(0, 8)}</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center space-x-1 ${getStatusColor(log.status)}`}>
          {getStatusIcon(log.status)}
          <span className="capitalize">{log.status}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-300">
          <User className="w-4 h-4" />
          <span>Scammer: {log.scammerInfo.username}</span>
        </div>
        
        <p className="text-gray-400 text-sm line-clamp-2">
          {log.scamDetails.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">
            Reported by {log.reportedBy}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(log.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ScamLogCard;