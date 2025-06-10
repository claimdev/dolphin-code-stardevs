// Updated bot client for proper API communication
import { BotAPIRequest, BotAPIResponse, botAPIServer } from './server';

export class BotAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://your-star-devs-website.com') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<BotAPIResponse<T>> {
    const request: BotAPIRequest = {
      method,
      endpoint,
      data,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StarDevs-Discord-Bot/1.0'
      }
    };

    // In development, use mock server
    if (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) {
      return await botAPIServer.handleRequest(request);
    }

    // In production, make actual HTTP requests
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: request.headers,
        body: data ? JSON.stringify(data) : undefined
      });

      const result = await response.json();
      
      return {
        success: response.ok,
        data: result.data || result,
        error: result.error || (!response.ok ? `HTTP ${response.status}` : undefined),
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      };
    }
  }

  // Scam log endpoints
  async createScamLog(data: {
    reportedBy: string;
    scammerUsername: string;
    scammerUserId: string;
    scammerAdditionalInfo?: string;
    scamType: string;
    scamDescription: string;
    dateOccurred: string;
    evidence?: string[];
  }): Promise<BotAPIResponse> {
    return await this.makeRequest('POST', '/api/bot/scam-create', data);
  }

  async getScamLog(logId: string): Promise<BotAPIResponse> {
    return await this.makeRequest('GET', `/api/bot/scam-info/${logId}`);
  }

  async getScamLogs(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<BotAPIResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const endpoint = `/api/bot/scam-logs${queryParams.toString() ? `?${queryParams}` : ''}`;
    return await this.makeRequest('GET', endpoint);
  }

  async updateScamLogStatus(logId: string, status: string): Promise<BotAPIResponse> {
    return await this.makeRequest('POST', '/api/bot/update-status', { logId, status });
  }

  // Discord stats endpoints
  async updateMemberCount(memberCount: number): Promise<BotAPIResponse> {
    return await this.makeRequest('POST', '/api/bot/update-member-count', { memberCount });
  }

  async getMemberCount(): Promise<BotAPIResponse> {
    return await this.makeRequest('GET', '/api/bot/member-count');
  }
}

// Export a default instance
export const botClient = new BotAPIClient();
