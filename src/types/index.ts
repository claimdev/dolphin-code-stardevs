export interface ScamLog {
  id: string; // Format: ABC001 (first 3 letters of username + incremental number)
  reportedBy: string;
  victimInfo: {
    userId: string; // Changed from scammerInfo.username to victimInfo.userId
    additionalInfo?: string;
  };
  scamDetails: {
    type: string;
    description: string;
    evidence: string[]; // Required, not optional
    dateOccurred: string;
  };
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
  reportDate: string; // New field for when the report was made
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
