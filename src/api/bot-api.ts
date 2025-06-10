iimport { ScamLog, DiscordStats, ApiResponse } from '../types';
import { apiUtils } from '../utils/api';

// Bot-only API endpoints for Discord bot integration
export const botAPI = {
  // POST /api/bot/scam-create
  // Creates a new scam log (STAFF ONLY via bot)
  async createScamLog(data: {
    reportedBy: string;
    reporterUsername: string;
    victimUserId: string;
    victimAdditionalInfo?: string;
    scamType: string;
    scamDescription: string;
    dateOccurred: string;
    evidence: string[];
  }): Promise<ApiResponse<ScamLog>> {
    // Convert bot API format to internal format
    return await apiUtils.createScamLog({
      reportedBy: data.reportedBy,
      reporterUsername: data.reporterUsername,
      victimUserId: data.victimUserId,
      victimAdditionalInfo: data.victimAdditionalInfo,
      scamType: data.scamType,
      scamDescription: data.scamDescription,
      dateOccurred: data.dateOccurred,
      evidence: data.evidence
    });
  },

  // GET /api/bot/scam-info/:id
  // Gets specific scam log info
  async getScamLog(id: string): Promise<ApiResponse<ScamLog>> {
    return await apiUtils.getScamLog(id);
  },

  // GET /api/bot/scam-logs
  // Lists scam logs with filtering
  async getScamLogs(params?: {
    status?: 'all' | 'pending' | 'verified' | 'rejected';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ScamLog[]>> {
    try {
      let logs = (await apiUtils.getAllScamLogs()).data || [];
      
      // Filter by status
      if (params?.status && params.status !== 'all') {
        logs = logs.filter(log => log.status === params.status);
      }

      // Sort by creation date (newest first)
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      if (params?.offset) {
        logs = logs.slice(params.offset);
      }
      if (params?.limit) {
        logs = logs.slice(0, params.limit);
      }

      return { success: true, data: logs };
    } catch (error) {
      return { success: false, error: 'Failed to fetch scam logs' };
    }
  },

  // POST /api/bot/update-member-count
  // Updates Discord member count (bot only)
  async updateMemberCount(memberCount: number): Promise<ApiResponse<DiscordStats>> {
    return await apiUtils.updateDiscordStats({ memberCount });
  },

  // GET /api/bot/member-count
  // Gets current member count
  async getMemberCount(): Promise<ApiResponse<{ memberCount: number }>> {
    try {
      const stats = (await apiUtils.getDiscordStats()).data;
      if (stats) {
        return { success: true, data: { memberCount: stats.memberCount } };
      }
      return { success: false, error: 'Failed to get member count' };
    } catch (error) {
      return { success: false, error: 'Failed to get member count' };
    }
  },

  // POST /api/bot/update-status
  // Updates scam log status (STAFF ONLY via bot)
  async updateScamLogStatus(data: { logId: string; status: ScamLog['status'] }): Promise<ApiResponse<ScamLog>> {
    return await apiUtils.updateScamLog(data.logId, { status: data.status });
  },

  // DELETE /api/bot/scam-remove/:id
  // Removes scam log (STAFF ONLY via bot)
  async removeScamLog(logId: string): Promise<ApiResponse<boolean>> {
    return await apiUtils.removeScamLog(logId);
  }
};

// Mock API server for local development
export const createMockAPIServer = () => {
  // This would be replaced with actual Express.js server in production
  const handleRequest = async (method: string, endpoint: string, data?: any) => {
    try {
      switch (`${method} ${endpoint}`) {
        case 'POST /api/bot/scam-create':
          return await botAPI.createScamLog(data);
        
        case 'GET /api/bot/scam-logs':
          return await botAPI.getScamLogs(data);
        
        case 'POST /api/bot/update-status':
          return await botAPI.updateScamLogStatus(data);
        
        case 'POST /api/bot/update-member-count':
          return await botAPI.updateMemberCount(data.memberCount);
        
        case 'GET /api/bot/member-count':
          return await botAPI.getMemberCount();
        
        default:
          return { success: false, error: `Endpoint not found: ${method} ${endpoint}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Internal server error' };
    }
  };

  return { handleRequest };
};
