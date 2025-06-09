export interface ScamLog {
  id: string;
  reportedBy: string;
  scammerInfo: {
    username: string;
    userId: string;
    additionalInfo?: string;
  };
  scamDetails: {
    type: string;
    description: string;
    evidence?: string[];
    dateOccurred: string;
  };
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface DiscordStats {
  memberCount: number;
  activeProjects: number;
  contributors: number;
  codeCommits: string;
  lastUpdated: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}