import { ScamLog, DiscordStats, ApiResponse } from '../types';
import { storageUtils } from './storage';

// Simulated API endpoints for bot integration
export const apiUtils = {
  // Discord Stats API
  async getDiscordStats(): Promise<ApiResponse<DiscordStats>> {
    try {
      const stats = storageUtils.getDiscordStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to fetch Discord stats' };
    }
  },

  async updateDiscordStats(stats: Partial<DiscordStats>): Promise<ApiResponse<DiscordStats>> {
    try {
      const currentStats = storageUtils.getDiscordStats();
      const updatedStats = { 
        ...currentStats, 
        ...stats, 
        lastUpdated: new Date().toISOString() 
      };
      storageUtils.saveDiscordStats(updatedStats);
      return { success: true, data: updatedStats };
    } catch (error) {
      return { success: false, error: 'Failed to update Discord stats' };
    }
  },

  // Scam Logs API
  async createScamLog(logData: Omit<ScamLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ScamLog>> {
    try {
      const newLog: ScamLog = {
        ...logData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      storageUtils.addScamLog(newLog);
      return { success: true, data: newLog };
    } catch (error) {
      return { success: false, error: 'Failed to create scam log' };
    }
  },

  async getScamLog(id: string): Promise<ApiResponse<ScamLog>> {
    try {
      const log = storageUtils.getScamLogById(id);
      if (log) {
        return { success: true, data: log };
      }
      return { success: false, error: 'Scam log not found' };
    } catch (error) {
      return { success: false, error: 'Failed to fetch scam log' };
    }
  },

  async getAllScamLogs(): Promise<ApiResponse<ScamLog[]>> {
    try {
      const logs = storageUtils.getScamLogs();
      return { success: true, data: logs };
    } catch (error) {
      return { success: false, error: 'Failed to fetch scam logs' };
    }
  },

  async updateScamLog(id: string, updates: Partial<ScamLog>): Promise<ApiResponse<ScamLog>> {
    try {
      const success = storageUtils.updateScamLog(id, updates);
      if (success) {
        const updatedLog = storageUtils.getScamLogById(id);
        return { success: true, data: updatedLog! };
      }
      return { success: false, error: 'Scam log not found' };
    } catch (error) {
      return { success: false, error: 'Failed to update scam log' };
    }
  }
};

// Auto-update Discord stats every hour
setInterval(async () => {
  try {
    // In a real application, this would fetch from Discord API
    const currentStats = storageUtils.getDiscordStats();
    const updatedStats = {
      ...currentStats,
      lastUpdated: new Date().toISOString()
    };
    storageUtils.saveDiscordStats(updatedStats);
  } catch (error) {
    console.error('Failed to auto-update Discord stats:', error);
  }
}, 60 * 60 * 1000); // 1 hour