import { ScamLog, DiscordStats, ApiResponse } from '../types';
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
    return await apiUtils.createScamLog(data);
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

  // DELETE /api/bot/scam-remove
  // Removes scam log (STAFF ONLY via bot)
  async removeScamLog(logId: string): Promise<ApiResponse<boolean>> {
    return await apiUtils.removeScamLog(logId);
  }
};

// Enhanced Python Discord Bot Example Code with all new features
export const pythonBotCode = `
"""
Star Devs Discord Bot - Enhanced Scam Logging System (SI TEAM ONLY)
Requirements: discord.py, aiohttp, python-dotenv, aiosqlite
"""

import discord
from discord.ext import commands, tasks
import aiohttp
import json
from datetime import datetime
import asyncio
import re

# Your website API base URL
API_BASE = "https://your-star-devs-website.com/api/bot"

# SI Role IDs
SI_ROLE_ID = 1291141237868597338
TRIAL_SI_ROLE_ID = 1291141965596856370

class StarDevsBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.members = True
        super().__init__(command_prefix='!', intents=intents)
        
    async def setup_hook(self):
        # Update member count every hour
        self.update_member_count.start()
        # Sync with website every 30 minutes
        self.sync_with_api.start()
    
    def has_si_role(self, user: discord.Member) -> bool:
        """Check if user has SI or Trial SI role"""
        user_role_ids = [role.id for role in user.roles]
        return SI_ROLE_ID in user_role_ids or TRIAL_SI_ROLE_ID in user_role_ids
    
    def get_si_role_name(self, user: discord.Member) -> str:
        """Get the SI role name for the user"""
        user_role_ids = [role.id for role in user.roles]
        if SI_ROLE_ID in user_role_ids:
            return "SI"
        elif TRIAL_SI_ROLE_ID in user_role_ids:
            return "Trial SI"
        return "Unknown"
    
    def extract_username(self, user: discord.Member) -> str:
        """Extract username for ID generation"""
        return re.sub(r'[^a-zA-Z]', '', user.name)[:3].upper() or "USR"
    
    @commands.slash_command(
        name="scam-create",
        description="Report a scammer (SI TEAM ONLY - Requires SI or Trial SI role)"
    )
    async def scam_create(
        self, 
        ctx, 
        victim_user_id: str,
        scam_type: str,
        description: str,
        evidence1: str,
        evidence2: str = None,
        evidence3: str = None,
        evidence4: str = None,
        evidence5: str = None,
        date_occurred: str = None,
        additional_info: str = None
    ):
        """Create a new scam log entry - SI TEAM ONLY"""
        # Check if user has SI role
        if not self.has_si_role(ctx.author):
            await ctx.respond(
                "❌ You don't have permission to use this command. Only SI team members (SI or Trial SI) can create scam reports.",
                ephemeral=True
            )
            return
        
        await ctx.response.defer()
        
        try:
            # Validate date format if provided
            if date_occurred:
                try:
                    datetime.strptime(date_occurred, '%Y-%m-%d')
                except ValueError:
                    await ctx.followup.send(
                        "❌ Invalid date format. Please use YYYY-MM-DD format.",
                        ephemeral=True
                    )
                    return
            else:
                date_occurred = datetime.now().strftime('%Y-%m-%d')
            
            # Collect evidence (at least one required)
            evidence = [evidence1]
            for ev in [evidence2, evidence3, evidence4, evidence5]:
                if ev:
                    evidence.append(ev)
            
            if not evidence or not evidence[0]:
                await ctx.followup.send(
                    "❌ At least one piece of evidence is required for scam reports.",
                    ephemeral=True
                )
                return
            
            # Get user's SI role
            si_role = self.get_si_role_name(ctx.author)
            
            # Prepare log data
            data = {
                "reportedBy": f"{ctx.author.name}#{ctx.author.discriminator} ({si_role})",
                "reporterUsername": self.extract_username(ctx.author),
                "victimUserId": victim_user_id,
                "victimAdditionalInfo": additional_info,
                "scamType": scam_type,
                "scamDescription": description,
                "dateOccurred": f"{date_occurred}T00:00:00Z",
                "evidence": evidence
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{API_BASE}/scam-create", json=data) as resp:
                    result = await resp.json()
                    if result["success"]:
                        log = result["data"]
                        embed = discord.Embed(
                            title="🛡️ SI Scam Report Created",
                            description=f"Report #{log['id']} has been submitted for review",
                            color=0x00ff00
                        )
                        embed.add_field(name="Victim ID", value=victim_user_id, inline=True)
                        embed.add_field(name="Type", value=scam_type, inline=True)
                        embed.add_field(name="Status", value="Pending Review", inline=True)
                        embed.add_field(name="Report ID", value=f"\`{log['id']}\`", inline=True)
                        embed.add_field(name="Date Occurred", value=date_occurred, inline=True)
                        embed.add_field(name="Evidence Count", value=f"{len(evidence)} items", inline=True)
                        embed.add_field(name="Reported By", value=f"{ctx.author.mention} ({si_role})", inline=False)
                        embed.set_footer(text=f"Use /scam-verify {log['id']} to verify this report")
                        embed.timestamp = datetime.now()
                        
                        await ctx.followup.send(embed=embed)
                        
                        # Log to staff channel if configured
                        # staff_channel = self.get_channel(STAFF_CHANNEL_ID)
                        # if staff_channel:
                        #     await staff_channel.send(embed=embed)
                            
                    else:
                        await ctx.followup.send(f"❌ Error: {result.get('error', 'Unknown error')}")
        except Exception as e:
            await ctx.followup.send(f"❌ Failed to create scam report: {str(e)}")
    
    @commands.slash_command(
        name="scam-info",
        description="Get detailed information about a scam log"
    )
    async def scam_info(self, ctx, log_id: str):
        """Get scam log details - SI team can see all, users only see verified/rejected"""
        await ctx.response.defer()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{API_BASE}/scam-info/{log_id}") as resp:
                    result = await resp.json()
                    if result["success"]:
                        log = result["data"]
                        
                        # Check if user has permission to view pending logs
                        if log["status"] == "pending" and not self.has_si_role(ctx.author):
                            await ctx.followup.send(
                                "❌ You don't have permission to view pending reports. Only SI team members can view pending reports.",
                                ephemeral=True
                            )
                            return
                        
                        status_colors = {
                            "pending": 0xffff00,
                            "verified": 0x00ff00,
                            "rejected": 0xff0000
                        }
                        
                        status_emojis = {
                            "pending": "🟡",
                            "verified": "🟢",
                            "rejected": "🔴"
                        }
                        
                        embed = discord.Embed(
                            title=f"🚨 Scam Report #{log['id']}",
                            description=log["scamDetails"]["description"],
                            color=status_colors.get(log["status"], 0x808080)
                        )
                        
                        embed.add_field(name="Victim User ID", value=f"\`{log['victimInfo']['userId']}\`", inline=True)
                        embed.add_field(name="Scam Type", value=log["scamDetails"]["type"], inline=True)
                        
                        status_text = f"{status_emojis.get(log['status'], '⚪')} {log['status'].title()}"
                        embed.add_field(name="Status", value=status_text, inline=True)
                        
                        embed.add_field(name="Reported By", value=log["reportedBy"], inline=True)
                        embed.add_field(name="Date Occurred", value=log["scamDetails"]["dateOccurred"][:10], inline=True)
                        embed.add_field(name="Report Date", value=log["reportDate"][:10], inline=True)
                        
                        if log["victimInfo"].get("additionalInfo"):
                            embed.add_field(name="Additional Info", value=log["victimInfo"]["additionalInfo"], inline=False)
                        
                        # Add evidence
                        evidence = log["scamDetails"]["evidence"]
                        if evidence:
                            evidence_text = "\\n".join([f"• {url}" for url in evidence[:5]])
                            if len(evidence) > 5:
                                evidence_text += f"\\n... and {len(evidence) - 5} more"
                            embed.add_field(name=f"Evidence ({len(evidence)} items)", value=evidence_text, inline=False)
                        
                        embed.set_footer(text=f"Created: {log['createdAt'][:10]} | Full ID: {log['id']}")
                        
                        # Add SI team actions if user is SI team and log is pending
                        if self.has_si_role(ctx.author) and log["status"] == "pending":
                            embed.add_field(
                                name="SI Team Actions",
                                value=f"Use \`/scam-verify {log_id}\` or \`/scam-reject {log_id}\` to update status\\nUse \`/scam-remove {log_id}\` to delete this report",
                                inline=False
                            )
                        
                        await ctx.followup.send(embed=embed)
                    else:
                        await ctx.followup.send(f"❌ Error: {result.get('error', 'Scam log not found')}")
        except Exception as e:
            await ctx.followup.send(f"❌ Failed to fetch scam log: {str(e)}")
    
    @commands.slash_command(
        name="scam-logs",
        description="List recent scam logs"
    )
    async def scam_logs(
        self, 
        ctx, 
        status: str = None,
        limit: int = 10
    ):
        """List scam logs with filtering - Non-SI can only see verified logs"""
        await ctx.response.defer()
        
        try:
            # Determine default status based on SI role
            if status is None:
                status = "all" if self.has_si_role(ctx.author) else "verified"
            
            # Non-SI can only see verified logs
            if not self.has_si_role(ctx.author) and status != "verified":
                await ctx.followup.send(
                    "❌ You can only view verified scam logs. SI team members can view all statuses.",
                    ephemeral=True
                )
                return
            
            # Limit the number of logs
            limit = min(limit, 25)
            
            params = {
                "status": status,
                "limit": limit
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{API_BASE}/scam-logs", params=params) as resp:
                    result = await resp.json()
                    if result["success"]:
                        logs = result["data"]
                        if not logs:
                            await ctx.followup.send(f"📋 No {status} scam logs found.")
                            return
                        
                        status_colors = {
                            "pending": 0xffff00,
                            "verified": 0x00ff00,
                            "rejected": 0xff0000,
                            "all": 0x808080
                        }
                        
                        status_emojis = {
                            "pending": "🟡",
                            "verified": "🟢",
                            "rejected": "🔴"
                        }
                        
                        embed = discord.Embed(
                            title=f"📋 Recent Scam Logs ({status.title()})",
                            description=f"Showing {len(logs)} logs",
                            color=status_colors.get(status, 0x808080)
                        )
                        
                        # Add logs to embed (max 10 for readability)
                        for i, log in enumerate(logs[:10]):
                            status_emoji = status_emojis.get(log["status"], "⚪")
                            
                            field_name = f"{status_emoji} {log['scamDetails']['type']}"
                            field_value = (
                                f"**ID:** \`{log['id']}\`\\n"
                                f"**Victim:** {log['victimInfo']['userId']}\\n"
                                f"**Date:** {log['createdAt'][:10]}"
                            )
                            
                            embed.add_field(name=field_name, value=field_value, inline=True)
                            
                            # Add empty field for better formatting every 3 items
                            if (i + 1) % 3 == 0:
                                embed.add_field(name="\\u200b", value="\\u200b", inline=True)
                        
                        embed.set_footer(text="Use /scam-info <id> for detailed information")
                        
                        await ctx.followup.send(embed=embed)
                    else:
                        await ctx.followup.send(f"❌ Error: {result.get('error', 'Failed to fetch logs')}")
        except Exception as e:
            await ctx.followup.send(f"❌ Failed to fetch scam logs: {str(e)}")
    
    @commands.slash_command(
        name="scam-verify",
        description="Verify a scam report (SI TEAM ONLY)"
    )
    async def scam_verify(self, ctx, log_id: str):
        """Verify a scam report - SI TEAM ONLY"""
        # Check SI role
        if not self.has_si_role(ctx.author):
            await ctx.respond(
                "❌ You don't have permission to use this command. Only SI team members can verify scam reports.",
                ephemeral=True
            )
            return
        
        await ctx.response.defer()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{API_BASE}/update-status", 
                    json={"logId": log_id, "status": "verified"}
                ) as resp:
                    result = await resp.json()
                    if result["success"]:
                        log = result["data"]
                        si_role = self.get_si_role_name(ctx.author)
                        
                        embed = discord.Embed(
                            title="✅ Scam Report Verified",
                            description=f"Report #{log_id} has been verified and is now public",
                            color=0x00ff00
                        )
                        embed.add_field(name="Victim ID", value=log["victimInfo"]["userId"], inline=True)
                        embed.add_field(name="Type", value=log["scamDetails"]["type"], inline=True)
                        embed.add_field(name="Verified By", value=f"{ctx.author.mention} ({si_role})", inline=True)
                        embed.set_footer(text=f"Report ID: {log['id']}")
                        embed.timestamp = datetime.now()
                        
                        await ctx.followup.send(embed=embed)
                    else:
                        await ctx.followup.send(f"❌ Error: {result.get('error', 'Failed to verify report')}")
        except Exception as e:
            await ctx.followup.send(f"❌ Failed to verify scam report: {str(e)}")
    
    @commands.slash_command(
        name="scam-reject",
        description="Reject a scam report (SI TEAM ONLY)"
    )
    async def scam_reject(self, ctx, log_id: str):
        """Reject a scam report - SI TEAM ONLY"""
        # Check SI role
        if not self.has_si_role(ctx.author):
            await ctx.respond(
                "❌ You don't have permission to use this command. Only SI team members can reject scam reports.",
                ephemeral=True
            )
            return
        
        await ctx.response.defer()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{API_BASE}/update-status", 
                    json={"logId": log_id, "status": "rejected"}
                ) as resp:
                    result = await resp.json()
                    if result["success"]:
                        log = result["data"]
                        si_role = self.get_si_role_name(ctx.author)
                        
                        embed = discord.Embed(
                            title="❌ Scam Report Rejected",
                            description=f"Report #{log_id} has been rejected",
                            color=0xff0000
                        )
                        embed.add_field(name="Victim ID", value=log["victimInfo"]["userId"], inline=True)
                        embed.add_field(name="Type", value=log["scamDetails"]["type"], inline=True)
                        embed.add_field(name="Rejected By", value=f"{ctx.author.mention} ({si_role})", inline=True)
                        embed.set_footer(text=f"Report ID: {log['id']}")
                        embed.timestamp = datetime.now()
                        
                        await ctx.followup.send(embed=embed)
                    else:
                        await ctx.followup.send(f"❌ Error: {result.get('error', 'Failed to reject report')}")
        except Exception as e:
            await ctx.followup.send(f"❌ Failed to reject scam report: {str(e)}")
    
    @commands.slash_command(
        name="scam-remove",
        description="Remove a scam report from database and website (SI TEAM ONLY)"
    )
    async def scam_remove(self, ctx, log_id: str):
        """Remove a scam report - SI TEAM ONLY"""
        # Check SI role
        if not self.has_si_role(ctx.author):
            await ctx.respond(
                "❌ You don't have permission to use this command. Only SI team members can remove scam reports.",
                ephemeral=True
            )
            return
        
        await ctx.response.defer()
        
        try:
            # First get the log info for confirmation
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{API_BASE}/scam-info/{log_id}") as resp:
                    result = await resp.json()
                    if not result["success"]:
                        await ctx.followup.send(f"❌ Error: {result.get('error', 'Scam log not found')}")
                        return
                    
                    log = result["data"]
                    
                    # Remove the log
                    async with session.delete(f"{API_BASE}/scam-remove/{log_id}") as delete_resp:
                        delete_result = await delete_resp.json()
                        if delete_result["success"]:
                            si_role = self.get_si_role_name(ctx.author)
                            
                            embed = discord.Embed(
                                title="🗑️ Scam Report Removed",
                                description=f"Report #{log_id} has been permanently deleted",
                                color=0xff6600
                            )
                            embed.add_field(name="Victim ID", value=log["victimInfo"]["userId"], inline=True)
                            embed.add_field(name="Type", value=log["scamDetails"]["type"], inline=True)
                            embed.add_field(name="Removed By", value=f"{ctx.author.mention} ({si_role})", inline=True)
                            embed.set_footer(text=f"Original Report ID: {log['id']}")
                            embed.timestamp = datetime.now()
                            
                            await ctx.followup.send(embed=embed)
                        else:
                            await ctx.followup.send(f"❌ Error: {delete_result.get('error', 'Failed to remove report')}")
        except Exception as e:
            await ctx.followup.send(f"❌ Failed to remove scam report: {str(e)}")
    
    @commands.slash_command(
        name="bot-stats",
        description="Show bot statistics (SI TEAM ONLY)"
    )
    async def bot_stats(self, ctx):
        """Show bot statistics - SI TEAM ONLY"""
        if not self.has_si_role(ctx.author):
            await ctx.respond(
                "❌ You don't have permission to use this command. Only SI team members can view bot statistics.",
                ephemeral=True
            )
            return
        
        await ctx.response.defer()
        
        try:
            async with aiohttp.ClientSession() as session:
                # Get scam logs stats
                async with session.get(f"{API_BASE}/scam-logs", params={"status": "all", "limit": 1000}) as resp:
                    logs_result = await resp.json()
                    
                # Get member count
                async with session.get(f"{API_BASE}/member-count") as resp:
                    member_result = await resp.json()
                
                if logs_result["success"]:
                    logs = logs_result["data"]
                    pending_count = len([log for log in logs if log["status"] == "pending"])
                    verified_count = len([log for log in logs if log["status"] == "verified"])
                    rejected_count = len([log for log in logs if log["status"] == "rejected"])
                    
                    member_count = member_result.get("data", {}).get("memberCount", 0) if member_result.get("success") else 0
                    
                    si_role = self.get_si_role_name(ctx.author)
                    
                    embed = discord.Embed(
                        title="🤖 SI Bot Statistics",
                        color=0x5865f2
                    )
                    
                    embed.add_field(name="📊 Scam Reports", value=f"""
                    **Total:** {len(logs)}
                    **Pending:** {pending_count}
                    **Verified:** {verified_count}
                    **Rejected:** {rejected_count}
                    """, inline=True)
                    
                    embed.add_field(name="👥 Discord Stats", value=f"""
                    **Members:** {member_count}
                    **Last Updated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
                    """, inline=True)
                    
                    embed.add_field(name="🔧 Bot Info", value=f"""
                    **Guilds:** {len(self.guilds)}
                    **Latency:** {round(self.latency * 1000)}ms
                    **API Status:** ✅ Connected
                    """, inline=True)
                    
                    embed.set_footer(text=f"Requested by {ctx.author.name} ({si_role}) | Star Devs SI Bot")
                    embed.timestamp = datetime.now()
                    
                    await ctx.followup.send(embed=embed)
                else:
                    await ctx.followup.send("❌ Failed to fetch bot statistics")
        except Exception as e:
            await ctx.followup.send(f"❌ Failed to get bot statistics: {str(e)}")
    
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
    
    @tasks.loop(minutes=30)
    async def sync_with_api(self):
        """Sync data with the website API every 30 minutes"""
        try:
            # This would sync local database with website
            print("🔄 Syncing with website API...")
        except Exception as e:
            print(f"❌ Error syncing with API: {str(e)}")
    
    @update_member_count.before_loop
    async def before_update_member_count(self):
        await self.wait_until_ready()
    
    @sync_with_api.before_loop
    async def before_sync_with_api(self):
        await self.wait_until_ready()

# Error handling for slash commands
@bot.event
async def on_application_command_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.respond("❌ You don't have permission to use this command. Only SI team members can create scam reports.", ephemeral=True)
    else:
        await ctx.respond(f"❌ An error occurred: {str(error)}", ephemeral=True)

# Run the bot
bot = StarDevsBot()
bot.run('YOUR_BOT_TOKEN')
`;
