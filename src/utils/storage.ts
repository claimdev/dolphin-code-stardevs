import { ScamLog, DiscordStats } from '../types';

const SCAM_LOGS_KEY = 'star_devs_scam_logs';
const DISCORD_STATS_KEY = 'star_devs_discord_stats';
const SCAM_COUNTER_KEY = 'star_devs_scam_counter';

export const storageUtils = {
  // Generate better ID format: ABC001 (first 3 letters of username + incremental number)
  generateScamLogId: (reporterUsername: string): string => {
    // Extract first 3 letters of username (uppercase)
    const prefix = reporterUsername.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
    
    // Get current counter
    const counter = storageUtils.getScamCounter();
    const nextId = counter + 1;
    
    // Save updated counter
    storageUtils.saveScamCounter(nextId);
    
    // Format: ABC001
    return `${prefix}${nextId.toString().padStart(3, '0')}`;
  },

  getScamCounter: (): number => {
    try {
      const counter = localStorage.getItem(SCAM_COUNTER_KEY);
      return counter ? parseInt(counter, 10) : 0;
    } catch {
      return 0;
    }
  },

  saveScamCounter: (counter: number): void => {
    localStorage.setItem(SCAM_COUNTER_KEY, counter.toString());
  },

  // Scam Logs
  getScamLogs: (): ScamLog[] => {
    try {
      const logs = localStorage.getItem(SCAM_LOGS_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  },

  saveScamLogs: (logs: ScamLog[]): void => {
    localStorage.setItem(SCAM_LOGS_KEY, JSON.stringify(logs));
  },

  addScamLog: (log: ScamLog): void => {
    const logs = storageUtils.getScamLogs();
    logs.push(log);
    storageUtils.saveScamLogs(logs);
  },

  getScamLogById: (id: string): ScamLog | null => {
    const logs = storageUtils.getScamLogs();
    return logs.find(log => log.id === id || log.id.startsWith(id)) || null;
  },

  removeScamLog: (id: string): boolean => {
    const logs = storageUtils.getScamLogs();
    const index = logs.findIndex(log => log.id === id || log.id.startsWith(id));
    if (index !== -1) {
      logs.splice(index, 1);
      storageUtils.saveScamLogs(logs);
      return true;
    }
    return false;
  },

  updateScamLog: (id: string, updates: Partial<ScamLog>): boolean => {
    const logs = storageUtils.getScamLogs();
    const index = logs.findIndex(log => log.id === id || log.id.startsWith(id));
    if (index !== -1) {
      logs[index] = { ...logs[index], ...updates, updatedAt: new Date().toISOString() };
      storageUtils.saveScamLogs(logs);
      return true;
    }
    return false;
  },

  // Discord Stats
  getDiscordStats: (): DiscordStats => {
    try {
      const stats = localStorage.getItem(DISCORD_STATS_KEY);
      return stats ? JSON.parse(stats) : {
        memberCount: 284,
        activeProjects: 23,
        contributors: 127,
        codeCommits: '1.2k',
        lastUpdated: new Date().toISOString()
      };
    } catch {
      return {
        memberCount: 284,
        activeProjects: 23,
        contributors: 127,
        codeCommits: '1.2k',
        lastUpdated: new Date().toISOString()
      };
    }
  },

  saveDiscordStats: (stats: DiscordStats): void => {
    localStorage.setItem(DISCORD_STATS_KEY, JSON.stringify(stats));
  }
};
