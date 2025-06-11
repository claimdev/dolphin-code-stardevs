import React, { useState } from 'react';
import { X, User, Calendar, AlertTriangle, FileText, Image, CheckCircle, XCircle, Clock, Trash2, Shield } from 'lucide-react';
import { ScamLog } from '../types';
import { apiUtils } from '../utils/api';

interface ScamLogModalProps {
  log: ScamLog;
  onClose: () => void;
  onUpdate: () => void;
}

const ScamLogModal: React.FC<ScamLogModalProps> = ({ log, onClose, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusIcon = (status: ScamLog['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-400" />;
      default:
        return <Clock className="w-6 h-6 text-yellow-400" />;
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

  const handleStatusUpdate = async (newStatus: ScamLog['status']) => {
    setIsUpdating(true);
    const response = await apiUtils.updateScamLog(log.id, { status: newStatus });
    if (response.success) {
      onUpdate();
      onClose();
    }
    setIsUpdating(false);
  };

  const handleRemove = async () => {
    if (confirm(`Are you sure you want to permanently delete report #${log.id}? This action cannot be undone.`)) {
      setIsUpdating(true);
      const response = await apiUtils.removeScamLog(log.id);
      if (response.success) {
        onUpdate();
        onClose();
      }
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{log.scamDetails.type}</h2>
              <p className="text-gray-400">Report #{log.id}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Status and Actions */}
          <div className="flex items-center justify-between">
            <div className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center space-x-2 ${getStatusColor(log.status)}`}>
              {getStatusIcon(log.status)}
              <span className="capitalize">{log.status}</span>
            </div>

            <div className="flex items-center space-x-2">
              {log.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('verified')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Verify</span>
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </>
              )}
              <button
                onClick={handleRemove}
                disabled={isUpdating}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Victim Information */}
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Victim Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
                <p className="text-white bg-gray-800 px-3 py-2 rounded-lg font-mono text-sm">{log.victimInfo.userId}</p>
              </div>
              {log.victimInfo.additionalInfo && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Additional Information</label>
                  <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">{log.victimInfo.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scammer Information */}
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Scammer Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
                <p className="text-white bg-gray-800 px-3 py-2 rounded-lg font-mono text-sm">{log.scammerInfo.userId}</p>
              </div>
              {log.scammerInfo.additionalInfo && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Additional Information</label>
                  <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">{log.scammerInfo.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scam Details */}
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Scam Details</span>
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Date Occurred</label>
                  <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">
                    {new Date(log.scamDetails.dateOccurred).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Reported By</label>
                  <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">{log.reportedBy}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <div className="text-white bg-gray-800 px-4 py-3 rounded-lg whitespace-pre-wrap">
                  {log.scamDetails.description}
                </div>
              </div>
              {log.scamDetails.evidence && log.scamDetails.evidence.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center space-x-2">
                    <Image className="w-4 h-4" />
                    <span>Evidence ({log.scamDetails.evidence.length} items)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {log.scamDetails.evidence.map((evidence, index) => (
                      <div key={index} className="bg-gray-800 px-3 py-2 rounded-lg">
                        <p className="text-sm text-white break-all">{evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Timeline</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Report Date</label>
                <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">
                  {new Date(log.reportDate).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Created</label>
                <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Last Updated</label>
                <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">
                  {new Date(log.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScamLogModal;
