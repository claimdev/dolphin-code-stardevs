import { ScamLog, DiscordStats, ApiResponse } from '../types';
import { storageUtils } from '../utils/storage';

// Bot-only API endpoints for Discord bot integration
export const botAPI = {
  // POST /api/bot/scam-create
  // Creates a new scam log (STAFF ONLY via bot)
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
    try {
      const newLog: ScamLog = {
        id: crypto.randomUUID(),
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
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      storageUtils.addScamLog(newLog);
      return { success: true, data: newLog };
    } catch (error) {
      return { success: false, error: 'Failed to create scam log' };
    }
  },

  // GET /api/bot/scam-info/:id
  // Gets specific scam log info
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

  // GET /api/bot/scam-logs
  // Lists scam logs with filtering
  async getScamLogs(params?: {
    status?: 'all' | 'pending' | 'verified' | 'rejected';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ScamLog[]>> {
    try {
      let logs = storageUtils.getScamLogs();
      
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
    try {
      const currentStats = storageUtils.getDiscordStats();
      const updatedStats = {
        ...currentStats,
        memberCount,
        lastUpdated: new Date().toISOString()
      };
      storageUtils.saveDiscordStats(updatedStats);
      return { success: true, data: updatedStats };
    } catch (error) {
      return { success: false, error: 'Failed to update member count' };
    }
  },

  // GET /api/bot/member-count
  // Gets current member count
  async getMemberCount(): Promise<ApiResponse<{ memberCount: number }>> {
    try {
      const stats = storageUtils.getDiscordStats();
      return { success: true, data: { memberCount: stats.memberCount } };
    } catch (error) {
      return { success: false, error: 'Failed to get member count' };
    }
  },

  // POST /api/bot/update-status/:id
  // Updates scam log status (STAFF ONLY via bot)
  async updateScamLogStatus(id: string, status: ScamLog['status']): Promise<ApiResponse<ScamLog>> {
    try {
      const success = storageUtils.updateScamLog(id, { status });
      if (success) {
        const updatedLog = storageUtils.getScamLogById(id);
        return { success: true, data: updatedLog! };
      }
      return { success: false, error: 'Scam log not found' };
    } catch (error) {
      return { success: false, error: 'Failed to update scam log status' };
    }
  }
};

// Python Discord Bot Example Code with STAFF-ONLY permissions
export const pythonBotCode = `
"""
Star Devs Discord Bot - Scam Logging System (STAFF ONLY)
Requirements: discord.py, aiohttp
"""

import discord
from discord.ext import commands, tasks
import aiohttp
import json
from datetime import datetime
import asyncio

# Your website API base URL
API_BASE = "https://your-star-devs-website.com/api/bot"

class StarDevsBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        super().__init__(command_prefix='!', intents=intents)
        
    async def setup_hook(self):
        # Update member count every hour
        self.update_member_count.start()
    
    @commands.slash_command(
        name="scam-create",
        description="Report a scammer (STAFF ONLY - Requires Manage Messages Permission)"
    )
    @commands.has_permissions(manage_messages=True)
    async def scam_create(
        self, 
        ctx, 
        scammer_username: str,
        scammer_id: str,
        scam_type: str,
        description: str,
        date_occurred: str = None
    ):
        """Create a new scam log entry - STAFF ONLY"""
        if date_occurred is None:
            date_occurred = datetime.now().isoformat()
            
        data = {
            "reportedBy": f"{ctx.author.name}#{ctx.author.discriminator} (STAFF)",
            "scammerUsername": scammer_username,
            "scammerUserId": scammer_id,
            "scamType": scam_type,
            "scamDescription": description,
            "dateOccurred": date_occurred
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(f"{API_BASE}/scam-create", json=data) as resp:
                    result = await resp.json()
                    if result["success"]:
                        log = result["data"]
                        embed = discord.Embed(
                            title="🛡️ Staff Scam Report Created",
                            description=f"Report #{log['id'][:8]} has been submitted for review",
                            color=0x00ff00
                        )
                        embed.add_field(name="Scammer", value=scammer_username, inline=True)
                        embed.add_field(name="Type", value=scam_type, inline=True)
                        embed.add_field(name="Status", value="Pending Review", inline=True)
                        embed.set_footer(text=f"Reported by {ctx.author.name} (Staff)")
                        await ctx.respond(embed=embed)
                        
                        # Log to staff channel if configured
                        # staff_channel = self.get_channel(STAFF_CHANNEL_ID)
                        # if staff_channel:
                        #     await staff_channel.send(embed=embed)
                            
                    else:
                        await ctx.respond(f"❌ Error: {result.get('error', 'Unknown error')}")
            except Exception as e:
                await ctx.respond(f"❌ Failed to create scam report: {str(e)}")
    
    @commands.slash_command(
        name="scam-info",
        description="Get detailed information about a scam log"
    )
    async def scam_info(self, ctx, log_id: str):
        """Get scam log details - Staff can see all, users only see verified/rejected"""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{API_BASE}/scam-info/{log_id}") as resp:
                    result = await resp.json()
                    if result["success"]:
                        log = result["data"]
                        
                        # Check if user has permission to view pending logs
                        if log["status"] == "pending" and not ctx.author.guild_permissions.manage_messages:
                            await ctx.respond("❌ You don't have permission to view pending reports. Only staff can view pending reports.", ephemeral=True)
                            return
                        
                        status_colors = {
                            "pending": 0xffff00,
                            "verified": 0x00ff00,
                            "rejected": 0xff0000
                        }
                        
                        embed = discord.Embed(
                            title=f"🚨 Scam Report #{log['id'][:8]}",
                            description=log["scamDetails"]["description"],
                            color=status_colors.get(log["status"], 0x808080)
                        )
                        embed.add_field(name="Scammer Username", value=log["scammerInfo"]["username"], inline=True)
                        embed.add_field(name="Scammer ID", value=log["scammerInfo"]["userId"], inline=True)
                        embed.add_field(name="Scam Type", value=log["scamDetails"]["type"], inline=True)
                        embed.add_field(name="Status", value=log["status"].title(), inline=True)
                        embed.add_field(name="Reported By", value=log["reportedBy"], inline=True)
                        embed.add_field(name="Date Occurred", value=log["scamDetails"]["dateOccurred"][:10], inline=True)
                        embed.set_footer(text=f"Created: {log['createdAt'][:10]}")
                        
                        if log["scamDetails"].get("evidence"):
                            evidence_text = "\\n".join([f"• {url}" for url in log["scamDetails"]["evidence"][:3]])
                            if len(log["scamDetails"]["evidence"]) > 3:
                                evidence_text += f"\\n... and {len(log['scamDetails']['evidence']) - 3} more"
                            embed.add_field(name="Evidence", value=evidence_text, inline=False)
                        
                        # Add staff-only actions if user is staff
                        if ctx.author.guild_permissions.manage_messages and log["status"] == "pending":
                            embed.add_field(
                                name="Staff Actions", 
                                value="Use \`/scam-verify <id>\` or \`/scam-reject <id>\` to update status", 
                                inline=False
                            )
                        
                        await ctx.respond(embed=embed)
                    else:
                        await ctx.respond(f"❌ Error: {result.get('error', 'Scam log not found')}")
            except Exception as e:
                await ctx.respond(f"❌ Failed to fetch scam log: {str(e)}")
    
    @commands.slash_command(
        name="scam-logs",
        description="List recent scam logs"
    )
    async def scam_logs(
        self, 
        ctx, 
        status: str = "verified", 
        limit: int = 10
    ):
        """List scam logs with filtering - Non-staff can only see verified logs"""
        # Non-staff can only see verified logs
        if not ctx.author.guild_permissions.manage_messages and status != "verified":
            await ctx.respond("❌ You can only view verified scam logs. Staff members can view all statuses.", ephemeral=True)
            return
            
        params = {
            "status": status,
            "limit": min(limit, 25)
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{API_BASE}/scam-logs", params=params) as resp:
                    result = await resp.json()
                    if result["success"]:
                        logs = result["data"]
                        if not logs:
                            await ctx.respond(f"📋 No {status} scam logs found.")
                            return
                        
                        status_colors = {
                            "pending": 0xffff00,
                            "verified": 0x00ff00,
                            "rejected": 0xff0000,
                            "all": 0x808080
                        }
                        
                        embed = discord.Embed(
                            title=f"📋 Recent Scam Logs ({status.title()})",
                            description=f"Showing {len(logs)} logs",
                            color=status_colors.get(status, 0x808080)
                        )
                        
                        for i, log in enumerate(logs[:10]):  # Show max 10 in embed
                            status_emoji = {
                                "pending": "🟡",
                                "verified": "🟢", 
                                "rejected": "🔴"
                            }.get(log["status"], "⚪")
                            
                            embed.add_field(
                                name=f"{status_emoji} {log['scamDetails']['type']}",
                                value=f"**ID:** \`{log['id'][:8]}\`\\n**Scammer:** {log['scammerInfo']['username']}\\n**Date:** {log['createdAt'][:10]}",
                                inline=True
                            )
                            
                            # Add empty field for better formatting every 3 items
                            if (i + 1) % 3 == 0:
                                embed.add_field(name="\\u200b", value="\\u200b", inline=True)
                        
                        embed.set_footer(text="Use /scam-info <id> for detailed information")
                        await ctx.respond(embed=embed)
                    else:
                        await ctx.respond(f"❌ Error: {result.get('error', 'Failed to fetch logs')}")
            except Exception as e:
                await ctx.respond(f"❌ Failed to fetch scam logs: {str(e)}")
    
    @commands.slash_command(
        name="scam-verify",
        description="Verify a scam report (STAFF ONLY)"
    )
    @commands.has_permissions(manage_messages=True)
    async def scam_verify(self, ctx, log_id: str):
        """Verify a scam report - STAFF ONLY"""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(f"{API_BASE}/update-status/{log_id}", json={"status": "verified"}) as resp:
                    result = await resp.json()
                    if result["success"]:
                        embed = discord.Embed(
                            title="✅ Scam Report Verified",
                            description=f"Report #{log_id[:8]} has been verified and is now public",
                            color=0x00ff00
                        )
                        embed.set_footer(text=f"Verified by {ctx.author.name}")
                        await ctx.respond(embed=embed)
                    else:
                        await ctx.respond(f"❌ Error: {result.get('error', 'Failed to verify report')}")
            except Exception as e:
                await ctx.respond(f"❌ Failed to verify scam report: {str(e)}")
    
    @commands.slash_command(
        name="scam-reject",
        description="Reject a scam report (STAFF ONLY)"
    )
    @commands.has_permissions(manage_messages=True)
    async def scam_reject(self, ctx, log_id: str):
        """Reject a scam report - STAFF ONLY"""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(f"{API_BASE}/update-status/{log_id}", json={"status": "rejected"}) as resp:
                    result = await resp.json()
                    if result["success"]:
                        embed = discord.Embed(
                            title="❌ Scam Report Rejected",
                            description=f"Report #{log_id[:8]} has been rejected",
                            color=0xff0000
                        )
                        embed.set_footer(text=f"Rejected by {ctx.author.name}")
                        await ctx.respond(embed=embed)
                    else:
                        await ctx.respond(f"❌ Error: {result.get('error', 'Failed to reject report')}")
            except Exception as e:
                await ctx.respond(f"❌ Failed to reject scam report: {str(e)}")
    
    @tasks.loop(hours=1)
    async def update_member_count(self):
        """Update Discord member count every hour"""
        try:
            guild = self.get_guild(YOUR_GUILD_ID)  # Replace with your guild ID
            if guild:
                member_count = guild.member_count
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{API_BASE}/update-member-count", 
                        json={"memberCount": member_count}
                    ) as resp:
                        result = await resp.json()
                        if result["success"]:
                            print(f"✅ Member count updated: {member_count}")
                        else:
                            print(f"❌ Failed to update member count: {result.get('error')}")
        except Exception as e:
            print(f"❌ Error updating member count: {str(e)}")
    
    @update_member_count.before_loop
    async def before_update_member_count(self):
        await self.wait_until_ready()

# Error handling for slash commands
@bot.event
async def on_application_command_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.respond("❌ You don't have permission to use this command. Only staff members can create scam reports.", ephemeral=True)
    else:
        await ctx.respond(f"❌ An error occurred: {str(error)}", ephemeral=True)

# Run the bot
bot = StarDevsBot()
bot.run('YOUR_BOT_TOKEN')
`;