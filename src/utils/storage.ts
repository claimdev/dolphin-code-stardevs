import { ScamLog, DiscordStats } from '../types';

const SCAM_LOGS_KEY = 'star_devs_scam_logs';
const DISCORD_STATS_KEY = 'star_devs_discord_stats';

export const storageUtils = {
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
    return logs.find(log => log.id === id) || null;
  },

  updateScamLog: (id: string, updates: Partial<ScamLog>): boolean => {
    const logs = storageUtils.getScamLogs();
    const index = logs.findIndex(log => log.id === id);
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