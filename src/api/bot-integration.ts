import { ScamLog, DiscordStats, ApiResponse } from '../types';
import { apiUtils } from '../utils/api';

// Bot Integration API for Python Discord bot
export const botAPI = {
  // Endpoint: POST /api/bot/scam-create
  // Command: /scam-create
  async createScamLog(data: {
    reportedBy: string;
    scammerUsername: string;
    scammerUserId: string;
    scammerAdditionalInfo?: string;
    scamType: string;
    scamDescription: string;
    dateOccurred: string;
    evidence?: string[];
  }): Promise<ApiResponse<ScamLog>> {
    return await apiUtils.createScamLog({
      reportedBy: data.reportedBy,
      scammerInfo: {
        username: data.scammerUsername,
        userId: data.scammerUserId,
        additionalInfo: data.scammerAdditionalInfo
      },
      scamDetails: {
        type: data.scamType,
        description: data.scamDescription,
        evidence: data.evidence || [],
        dateOccurred: data.dateOccurred
      },
      status: 'pending'
    });
  },

  // Endpoint: GET /api/bot/scam-info/:id
  // Command: /scam-info <id>
  async getScamLog(id: string): Promise<ApiResponse<ScamLog>> {
    return await apiUtils.getScamLog(id);
  },

  // Endpoint: GET /api/bot/scam-logs
  // Command: /scam-logs
  async getAllScamLogs(params?: {
    status?: 'all' | 'pending' | 'verified' | 'rejected';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ScamLog[]>> {
    const response = await apiUtils.getAllScamLogs();
    if (!response.success || !response.data) {
      return response;
    }

    let logs = response.data;
    
    // Filter by status
    if (params?.status && params.status !== 'all') {
      logs = logs.filter(log => log.status === params.status);
    }

    // Apply pagination
    if (params?.offset) {
      logs = logs.slice(params.offset);
    }
    if (params?.limit) {
      logs = logs.slice(0, params.limit);
    }

    // Sort by creation date (newest first)
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, data: logs };
  },

  // Endpoint: POST /api/bot/discord-stats
  // Updates Discord member count and other stats
  async updateDiscordStats(stats: {
    memberCount?: number;
    activeProjects?: number;
    contributors?: number;
    codeCommits?: string;
  }): Promise<ApiResponse<DiscordStats>> {
    return await apiUtils.updateDiscordStats(stats);
  },

  // Endpoint: GET /api/bot/discord-stats
  // Get current Discord stats
  async getDiscordStats(): Promise<ApiResponse<DiscordStats>> {
    return await apiUtils.getDiscordStats();
  }
};

// Example Python bot integration code:
export const pythonBotExample = `
"""
Discord Bot Integration with Star Devs Website
Requirements: discord.py, aiohttp
"""

import discord
from discord.ext import commands
import aiohttp
import json
from datetime import datetime

# Website API base URL
API_BASE = "https://your-star-devs-website.com/api/bot"

class StarDevsBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        super().__init__(command_prefix='/', intents=intents)
        
    async def setup_hook(self):
        # Update member count every hour
        self.update_stats.start()
    
    @commands.slash_command(name="scam-create", description="Report a scammer")
    async def scam_create(
        self, 
        ctx, 
        scammer_username: str,
        scammer_id: str,
        scam_type: str,
        description: str,
        date_occurred: str = None
    ):
        if date_occurred is None:
            date_occurred = datetime.now().isoformat()
            
        data = {
            "reportedBy": str(ctx.author),
            "scammerUsername": scammer_username,
            "scammerUserId": scammer_id,
            "scamType": scam_type,
            "scamDescription": description,
            "dateOccurred": date_occurred
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{API_BASE}/scam-create", json=data) as resp:
                result = await resp.json()
                if result["success"]:
                    log = result["data"]
                    embed = discord.Embed(
                        title="Scam Report Created",
                        description=f"Report #{log['id'][:8]} has been submitted",
                        color=0xff6b6b
                    )
                    embed.add_field(name="Status", value="Pending Review", inline=True)
                    await ctx.respond(embed=embed)
                else:
                    await ctx.respond(f"Error: {result['error']}")
    
    @commands.slash_command(name="scam-info", description="Get scam log details")
    async def scam_info(self, ctx, log_id: str):
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE}/scam-info/{log_id}") as resp:
                result = await resp.json()
                if result["success"]:
                    log = result["data"]
                    embed = discord.Embed(
                        title=f"Scam Report #{log['id'][:8]}",
                        description=log["scamDetails"]["description"],
                        color=0xff6b6b
                    )
                    embed.add_field(name="Scammer", value=log["scammerInfo"]["username"], inline=True)
                    embed.add_field(name="Type", value=log["scamDetails"]["type"], inline=True)
                    embed.add_field(name="Status", value=log["status"].title(), inline=True)
                    embed.add_field(name="Reported By", value=log["reportedBy"], inline=True)
                    embed.add_field(name="Date", value=log["createdAt"][:10], inline=True)
                    await ctx.respond(embed=embed)
                else:
                    await ctx.respond(f"Error: {result['error']}")
    
    @commands.slash_command(name="scam-logs", description="List recent scam logs")
    async def scam_logs(self, ctx, status: str = "all", limit: int = 10):
        params = {"status": status, "limit": min(limit, 25)}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE}/scam-logs", params=params) as resp:
                result = await resp.json()
                if result["success"]:
                    logs = result["data"]
                    if not logs:
                        await ctx.respond("No scam logs found.")
                        return
                        
                    embed = discord.Embed(
                        title=f"Recent Scam Logs ({len(logs)})",
                        color=0xff6b6b
                    )
                    
                    for log in logs[:10]:  # Show max 10 in embed
                        status_emoji = {
                            "pending": "🟡",
                            "verified": "🟢", 
                            "rejected": "🔴"
                        }.get(log["status"], "⚪")
                        
                        embed.add_field(
                            name=f"{status_emoji} {log['scamDetails']['type']}",
                            value=f"ID: \`{log['id'][:8]}\`\\nScammer: {log['scammerInfo']['username']}\\nDate: {log['createdAt'][:10]}",
                            inline=True
                        )
                    
                    await ctx.respond(embed=embed)
                else:
                    await ctx.respond(f"Error: {result['error']}")
    
    @tasks.loop(hours=1)
    async def update_stats(self):
        # Update Discord member count
        guild = self.get_guild(YOUR_GUILD_ID)  # Replace with your guild ID
        if guild:
            member_count = guild.member_count
            
            data = {"memberCount": member_count}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{API_BASE}/discord-stats", json=data) as resp:
                    result = await resp.json()
                    print(f"Stats updated: {result}")

# Run the bot
bot = StarDevsBot()
bot.run('YOUR_BOT_TOKEN')
`;