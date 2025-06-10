import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Info, Shield, Activity } from 'lucide-react';
import ScamLogCard from '../components/ScamLogCard';
import ScamLogModal from '../components/ScamLogModal';
import APIStatus from '../components/APIStatus';
import { ScamLog } from '../types';
import { apiUtils } from '../utils/api';

const ScamLogs: React.FC = () => {
  const [logs, setLogs] = useState<ScamLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ScamLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ScamLog['status']>('all');
  const [selectedLog, setSelectedLog] = useState<ScamLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScamLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, statusFilter]);

  const loadScamLogs = async () => {
    setLoading(true);
    const response = await apiUtils.getAllScamLogs();
    if (response.success && response.data) {
      setLogs(response.data);
    }
    setLoading(false);
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.scammerInfo.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.scammerInfo.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.scamDetails.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.scamDetails.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredLogs(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading scam logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg shadow-red-600/25">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Scam Logs
              </h1>
            </div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
              Reports are submitted by our Scam Investigation Team. To report a scam, open a SI ticket.
            </p>
            
            {/* Staff Only Notice */}
            <div className="inline-flex items-center space-x-2 bg-blue-900/30 border border-blue-500/50 rounded-lg px-4 py-2 text-sm text-blue-300">
              <Shield className="w-4 h-4" />
              <span>Reports can only be created by Scam Investigation Team</span>
            </div>
          </div>

          {/* Controls and API Status */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Main Controls */}
            <div className="lg:col-span-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="pl-10 pr-8 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Results Count */}
                <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg px-4 py-2 text-sm text-purple-300">
                  {filteredLogs.length} of {logs.length} logs
                </div>
              </div>
            </div>

            {/* API Status */}
            <div className="lg:col-span-1">
              <APIStatus />
            </div>
          </div>

          {/* Logs Grid */}
          {filteredLogs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredLogs.map((log) => (
                <ScamLogCard
                  key={log.id}
                  log={log}
                  onClick={() => setSelectedLog(log)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
                <Info className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No scam logs found</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No scam reports have been submitted yet. Reports are created by staff members through our Discord bot.'
                }
              </p>
              
              {/* Bot Commands Info */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 max-w-2xl mx-auto">
                <div className="flex items-center space-x-2 mb-4">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h4 className="text-lg font-semibold text-white">Discord Bot Commands</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">Staff Commands</h5>
                    <ul className="text-gray-400 space-y-1">
                      <li>• <code className="bg-gray-700 px-1 rounded text-xs">/scam-create</code> - Create report</li>
                      <li>• <code className="bg-gray-700 px-1 rounded text-xs">/scam-verify</code> - Verify report</li>
                      <li>• <code className="bg-gray-700 px-1 rounded text-xs">/scam-reject</code> - Reject report</li>
                      <li>• <code className="bg-gray-700 px-1 rounded text-xs">/bot-stats</code> - View statistics</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">Public Commands</h5>
                    <ul className="text-gray-400 space-y-1">
                      <li>• <code className="bg-gray-700 px-1 rounded text-xs">/scam-info</code> - View log details</li>
                      <li>• <code className="bg-gray-700 px-1 rounded text-xs">/scam-logs</code> - List verified logs</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-xs">
                    <strong>Note:</strong> Only staff members with "Manage Messages" permission can create and manage scam reports.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedLog && (
        <ScamLogModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onUpdate={loadScamLogs}
        />
      )}
    </div>
  );
};

export default ScamLogs;
