import discord
from discord.ext import commands, tasks
import aiohttp
import asyncio
import logging
from datetime import datetime
from typing import Optional

from config import Config
from database import Database
from api_client import APIClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class StarDevsBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.members = True
        
        super().__init__(
            command_prefix='!',
            intents=intents,
            help_command=None
        )
        
        self.config = Config()
        self.db = Database(self.config.DATABASE_PATH)
        self.api_client = None
        
    async def setup_hook(self):
        """Called when the bot is starting up"""
        try:
            # Validate configuration
            self.config.validate()
            
            # Initialize database
            await self.db.init_db()
            logger.info("Database initialized successfully")
            
            # Initialize API client
            self.api_client = APIClient(self.config.API_BASE_URL)
            
            # Start background tasks
            self.update_member_count.start()
            self.sync_with_api.start()
            
            logger.info("Bot setup completed successfully")
        except Exception as e:
            logger.error(f"Failed to setup bot: {e}")
            raise
    
    async def on_ready(self):
        """Called when the bot is ready"""
        logger.info(f'{self.user} has connected to Discord!')
        logger.info(f'Bot is in {len(self.guilds)} guilds')
        
        # Sync slash commands
        try:
            synced = await self.tree.sync()
            logger.info(f'Synced {len(synced)} command(s)')
        except Exception as e:
            logger.error(f'Failed to sync commands: {e}')
    
    async def on_application_command_error(self, interaction: discord.Interaction, error: Exception):
        """Handle slash command errors"""
        if isinstance(error, commands.MissingPermissions):
            await interaction.response.send_message(
                "❌ You don't have permission to use this command. Only staff members with 'Manage Messages' permission can create scam reports.",
                ephemeral=True
            )
        else:
            logger.error(f"Command error: {error}")
            if not interaction.response.is_done():
                await interaction.response.send_message(
                    f"❌ An error occurred: {str(error)}",
                    ephemeral=True
                )
    
    @tasks.loop(hours=1)
    async def update_member_count(self):
        """Update Discord member count every hour"""
        try:
            guild = self.get_guild(self.config.GUILD_ID)
            if guild:
                member_count = guild.member_count
                
                # Update local database
                await self.db.update_discord_stats({'member_count': member_count})
                
                # Update via API if available
                if self.api_client:
                    async with self.api_client as client:
                        result = await client.update_member_count(member_count)
                        if result.get('success'):
                            logger.info(f"✅ Member count updated: {member_count}")
                        else:
                            logger.warning(f"❌ Failed to update member count via API: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"❌ Error updating member count: {e}")
    
    @tasks.loop(minutes=30)
    async def sync_with_api(self):
        """Sync data with the website API every 30 minutes"""
        try:
            if not self.api_client:
                return
            
            # Get recent logs from database
            recent_logs = await self.db.get_scam_logs(limit=10)
            
            # Sync each log with API
            async with self.api_client as client:
                for log in recent_logs:
                    # Convert database format to API format
                    api_data = {
                        'reportedBy': log['reported_by'],
                        'scammerUsername': log['scammer_username'],
                        'scammerUserId': log['scammer_user_id'],
                        'scammerAdditionalInfo': log.get('scammer_additional_info'),
                        'scamType': log['scam_type'],
                        'scamDescription': log['scam_description'],
                        'dateOccurred': log['date_occurred'],
                        'evidence': eval(log.get('evidence', '[]')) if log.get('evidence') else []
                    }
                    
                    # Check if log exists in API
                    api_result = await client.get_scam_log(log['id'])
                    if not api_result.get('success'):
                        # Create in API if it doesn't exist
                        create_result = await client.create_scam_log(api_data)
                        if create_result.get('success'):
                            logger.info(f"Synced log {log['id'][:8]} to API")
            
        except Exception as e:
            logger.error(f"Error syncing with API: {e}")
    
    @update_member_count.before_loop
    async def before_update_member_count(self):
        await self.wait_until_ready()
    
    @sync_with_api.before_loop
    async def before_sync_with_api(self):
        await self.wait_until_ready()

# Initialize bot instance
bot = StarDevsBot()

# Slash Commands
@bot.tree.command(name="scam-create", description="Report a scammer (STAFF ONLY - Requires Manage Messages Permission)")
@discord.app_commands.describe(
    scammer_username="The username of the scammer",
    scammer_id="The Discord ID of the scammer",
    scam_type="Type of scam (e.g., Phishing, Fake Nitro, etc.)",
    description="Detailed description of the scam",
    date_occurred="Date when the scam occurred (YYYY-MM-DD) - optional",
    additional_info="Additional information about the scammer - optional"
)
async def scam_create(
    interaction: discord.Interaction,
    scammer_username: str,
    scammer_id: str,
    scam_type: str,
    description: str,
    date_occurred: Optional[str] = None,
    additional_info: Optional[str] = None
):
    """Create a new scam log entry - STAFF ONLY"""
    # Check permissions
    if not interaction.user.guild_permissions.manage_messages:
        await interaction.response.send_message(
            "❌ You don't have permission to use this command. Only staff members with 'Manage Messages' permission can create scam reports.",
            ephemeral=True
        )
        return
    
    await interaction.response.defer()
    
    try:
        # Validate date format if provided
        if date_occurred:
            try:
                datetime.strptime(date_occurred, '%Y-%m-%d')
            except ValueError:
                await interaction.followup.send(
                    "❌ Invalid date format. Please use YYYY-MM-DD format.",
                    ephemeral=True
                )
                return
        else:
            date_occurred = datetime.now().strftime('%Y-%m-%d')
        
        # Prepare log data
        log_data = {
            'reported_by': f"{interaction.user.name}#{interaction.user.discriminator} (STAFF)",
            'scammer_username': scammer_username,
            'scammer_user_id': scammer_id,
            'scammer_additional_info': additional_info,
            'scam_type': scam_type,
            'scam_description': description,
            'date_occurred': date_occurred,
            'evidence': []
        }
        
        # Create in local database
        log_id = await bot.db.create_scam_log(log_data)
        
        # Log activity
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-create',
            f"scammer: {scammer_username}, type: {scam_type}",
            True
        )
        
        # Create success embed
        embed = discord.Embed(
            title="🛡️ Staff Scam Report Created",
            description=f"Report #{log_id[:8]} has been submitted for review",
            color=0x00ff00
        )
        embed.add_field(name="Scammer", value=scammer_username, inline=True)
        embed.add_field(name="Type", value=scam_type, inline=True)
        embed.add_field(name="Status", value="Pending Review", inline=True)
        embed.add_field(name="Report ID", value=f"`{log_id[:8]}`", inline=True)
        embed.add_field(name="Date Occurred", value=date_occurred, inline=True)
        embed.add_field(name="Reported By", value=interaction.user.mention, inline=True)
        embed.set_footer(text=f"Use /scam-verify {log_id[:8]} to verify this report")
        embed.timestamp = datetime.now()
        
        await interaction.followup.send(embed=embed)
        
        # Send to staff channel if configured
        if bot.config.STAFF_CHANNEL_ID:
            staff_channel = bot.get_channel(bot.config.STAFF_CHANNEL_ID)
            if staff_channel:
                staff_embed = embed.copy()
                staff_embed.title = "🚨 New Scam Report Submitted"
                staff_embed.description = f"A new scam report has been submitted by {interaction.user.mention}"
                await staff_channel.send(embed=staff_embed)
        
        # Sync with API
        if bot.api_client:
            async with bot.api_client as client:
                api_data = {
                    'reportedBy': log_data['reported_by'],
                    'scammerUsername': scammer_username,
                    'scammerUserId': scammer_id,
                    'scammerAdditionalInfo': additional_info,
                    'scamType': scam_type,
                    'scamDescription': description,
                    'dateOccurred': f"{date_occurred}T00:00:00Z",
                    'evidence': []
                }
                result = await client.create_scam_log(api_data)
                if result.get('success'):
                    logger.info(f"✅ Scam log synced to website API")
                else:
                    logger.warning(f"❌ Failed to sync to API: {result.get('error')}")
        
    except Exception as e:
        logger.error(f"Error creating scam report: {e}")
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-create',
            f"scammer: {scammer_username}, type: {scam_type}",
            False,
            str(e)
        )
        await interaction.followup.send(f"❌ Failed to create scam report: {str(e)}", ephemeral=True)

@bot.tree.command(name="scam-info", description="Get detailed information about a scam log")
@discord.app_commands.describe(log_id="The ID of the scam log (first 8 characters)")
async def scam_info(interaction: discord.Interaction, log_id: str):
    """Get scam log details - Staff can see all, users only see verified/rejected"""
    await interaction.response.defer()
    
    try:
        # Find log by partial ID
        logs = await bot.db.get_scam_logs()
        matching_log = None
        for log in logs:
            if log['id'].startswith(log_id):
                matching_log = log
                break
        
        if not matching_log:
            await interaction.followup.send("❌ Scam log not found.", ephemeral=True)
            return
        
        # Check permissions for pending logs
        if matching_log['status'] == 'pending' and not interaction.user.guild_permissions.manage_messages:
            await interaction.followup.send(
                "❌ You don't have permission to view pending reports. Only staff can view pending reports.",
                ephemeral=True
            )
            return
        
        # Create info embed
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
            title=f"🚨 Scam Report #{matching_log['id'][:8]}",
            description=matching_log['scam_description'],
            color=status_colors.get(matching_log['status'], 0x808080)
        )
        
        embed.add_field(name="Scammer Username", value=matching_log['scammer_username'], inline=True)
        embed.add_field(name="Scammer ID", value=f"`{matching_log['scammer_user_id']}`", inline=True)
        embed.add_field(name="Scam Type", value=matching_log['scam_type'], inline=True)
        
        status_text = f"{status_emojis.get(matching_log['status'], '⚪')} {matching_log['status'].title()}"
        embed.add_field(name="Status", value=status_text, inline=True)
        embed.add_field(name="Reported By", value=matching_log['reported_by'], inline=True)
        embed.add_field(name="Date Occurred", value=matching_log['date_occurred'], inline=True)
        
        if matching_log.get('scammer_additional_info'):
            embed.add_field(name="Additional Info", value=matching_log['scammer_additional_info'], inline=False)
        
        # Add evidence if available
        evidence = eval(matching_log.get('evidence', '[]')) if matching_log.get('evidence') else []
        if evidence:
            evidence_text = "\n".join([f"• {url}" for url in evidence[:3]])
            if len(evidence) > 3:
                evidence_text += f"\n... and {len(evidence) - 3} more"
            embed.add_field(name="Evidence", value=evidence_text, inline=False)
        
        embed.set_footer(text=f"Created: {matching_log['created_at'][:10]} | Full ID: {matching_log['id']}")
        
        # Add staff actions if user is staff and log is pending
        if interaction.user.guild_permissions.manage_messages and matching_log['status'] == 'pending':
            embed.add_field(
                name="Staff Actions",
                value=f"Use `/scam-verify {log_id}` or `/scam-reject {log_id}` to update status",
                inline=False
            )
        
        await interaction.followup.send(embed=embed)
        
        # Log activity
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-info',
            f"log_id: {log_id}",
            True
        )
        
    except Exception as e:
        logger.error(f"Error fetching scam info: {e}")
        await interaction.followup.send(f"❌ Failed to fetch scam log: {str(e)}", ephemeral=True)

@bot.tree.command(name="scam-logs", description="List recent scam logs")
@discord.app_commands.describe(
    status="Filter by status (default: verified for non-staff, all for staff)",
    limit="Number of logs to show (max 25)"
)
async def scam_logs(
    interaction: discord.Interaction,
    status: Optional[str] = None,
    limit: int = 10
):
    """List scam logs with filtering - Non-staff can only see verified logs"""
    await interaction.response.defer()
    
    try:
        # Determine default status based on permissions
        if status is None:
            status = "all" if interaction.user.guild_permissions.manage_messages else "verified"
        
        # Non-staff can only see verified logs
        if not interaction.user.guild_permissions.manage_messages and status != "verified":
            await interaction.followup.send(
                "❌ You can only view verified scam logs. Staff members can view all statuses.",
                ephemeral=True
            )
            return
        
        # Limit the number of logs
        limit = min(limit, 25)
        
        # Get logs from database
        logs = await bot.db.get_scam_logs(status=status, limit=limit)
        
        if not logs:
            await interaction.followup.send(f"📋 No {status} scam logs found.")
            return
        
        # Create embed
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
            status_emoji = status_emojis.get(log['status'], "⚪")
            
            field_name = f"{status_emoji} {log['scam_type']}"
            field_value = (
                f"**ID:** `{log['id'][:8]}`\n"
                f"**Scammer:** {log['scammer_username']}\n"
                f"**Date:** {log['created_at'][:10]}"
            )
            
            embed.add_field(name=field_name, value=field_value, inline=True)
            
            # Add empty field for better formatting every 3 items
            if (i + 1) % 3 == 0:
                embed.add_field(name="\u200b", value="\u200b", inline=True)
        
        embed.set_footer(text="Use /scam-info <id> for detailed information")
        
        await interaction.followup.send(embed=embed)
        
        # Log activity
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-logs',
            f"status: {status}, limit: {limit}",
            True
        )
        
    except Exception as e:
        logger.error(f"Error fetching scam logs: {e}")
        await interaction.followup.send(f"❌ Failed to fetch scam logs: {str(e)}", ephemeral=True)

@bot.tree.command(name="scam-verify", description="Verify a scam report (STAFF ONLY)")
@discord.app_commands.describe(log_id="The ID of the scam log to verify")
async def scam_verify(interaction: discord.Interaction, log_id: str):
    """Verify a scam report - STAFF ONLY"""
    # Check permissions
    if not interaction.user.guild_permissions.manage_messages:
        await interaction.response.send_message(
            "❌ You don't have permission to use this command. Only staff members can verify scam reports.",
            ephemeral=True
        )
        return
    
    await interaction.response.defer()
    
    try:
        # Find log by partial ID
        logs = await bot.db.get_scam_logs()
        matching_log = None
        for log in logs:
            if log['id'].startswith(log_id):
                matching_log = log
                break
        
        if not matching_log:
            await interaction.followup.send("❌ Scam log not found.", ephemeral=True)
            return
        
        if matching_log['status'] != 'pending':
            await interaction.followup.send(
                f"❌ This report is already {matching_log['status']}. Only pending reports can be verified.",
                ephemeral=True
            )
            return
        
        # Update status in database
        success = await bot.db.update_scam_log_status(matching_log['id'], 'verified')
        
        if success:
            # Create success embed
            embed = discord.Embed(
                title="✅ Scam Report Verified",
                description=f"Report #{log_id} has been verified and is now public",
                color=0x00ff00
            )
            embed.add_field(name="Scammer", value=matching_log['scammer_username'], inline=True)
            embed.add_field(name="Type", value=matching_log['scam_type'], inline=True)
            embed.add_field(name="Verified By", value=interaction.user.mention, inline=True)
            embed.set_footer(text=f"Report ID: {matching_log['id']}")
            embed.timestamp = datetime.now()
            
            await interaction.followup.send(embed=embed)
            
            # Sync with API
            if bot.api_client:
                async with bot.api_client as client:
                    result = await client.update_scam_log_status(matching_log['id'], 'verified')
                    if result.get('success'):
                        logger.info(f"✅ Status update synced to API")
                    else:
                        logger.warning(f"❌ Failed to sync status to API: {result.get('error')}")
            
            # Log activity
            await bot.db.log_bot_activity(
                str(interaction.user.id),
                str(interaction.user),
                'scam-verify',
                f"log_id: {log_id}",
                True
            )
        else:
            await interaction.followup.send("❌ Failed to verify report.", ephemeral=True)
        
    except Exception as e:
        logger.error(f"Error verifying scam report: {e}")
        await interaction.followup.send(f"❌ Failed to verify scam report: {str(e)}", ephemeral=True)

@bot.tree.command(name="scam-reject", description="Reject a scam report (STAFF ONLY)")
@discord.app_commands.describe(log_id="The ID of the scam log to reject")
async def scam_reject(interaction: discord.Interaction, log_id: str):
    """Reject a scam report - STAFF ONLY"""
    # Check permissions
    if not interaction.user.guild_permissions.manage_messages:
        await interaction.response.send_message(
            "❌ You don't have permission to use this command. Only staff members can reject scam reports.",
            ephemeral=True
        )
        return
    
    await interaction.response.defer()
    
    try:
        # Find log by partial ID
        logs = await bot.db.get_scam_logs()
        matching_log = None
        for log in logs:
            if log['id'].startswith(log_id):
                matching_log = log
                break
        
        if not matching_log:
            await interaction.followup.send("❌ Scam log not found.", ephemeral=True)
            return
        
        if matching_log['status'] != 'pending':
            await interaction.followup.send(
                f"❌ This report is already {matching_log['status']}. Only pending reports can be rejected.",
                ephemeral=True
            )
            return
        
        # Update status in database
        success = await bot.db.update_scam_log_status(matching_log['id'], 'rejected')
        
        if success:
            # Create success embed
            embed = discord.Embed(
                title="❌ Scam Report Rejected",
                description=f"Report #{log_id} has been rejected",
                color=0xff0000
            )
            embed.add_field(name="Scammer", value=matching_log['scammer_username'], inline=True)
            embed.add_field(name="Type", value=matching_log['scam_type'], inline=True)
            embed.add_field(name="Rejected By", value=interaction.user.mention, inline=True)
            embed.set_footer(text=f"Report ID: {matching_log['id']}")
            embed.timestamp = datetime.now()
            
            await interaction.followup.send(embed=embed)
            
            # Sync with API
            if bot.api_client:
                async with bot.api_client as client:
                    result = await client.update_scam_log_status(matching_log['id'], 'rejected')
                    if result.get('success'):
                        logger.info(f"✅ Status update synced to API")
                    else:
                        logger.warning(f"❌ Failed to sync status to API: {result.get('error')}")
            
            # Log activity
            await bot.db.log_bot_activity(
                str(interaction.user.id),
                str(interaction.user),
                'scam-reject',
                f"log_id: {log_id}",
                True
            )
        else:
            await interaction.followup.send("❌ Failed to reject report.", ephemeral=True)
        
    except Exception as e:
        logger.error(f"Error rejecting scam report: {e}")
        await interaction.followup.send(f"❌ Failed to reject scam report: {str(e)}", ephemeral=True)

# Admin commands for bot management
@bot.tree.command(name="bot-stats", description="Show bot statistics (STAFF ONLY)")
async def bot_stats(interaction: discord.Interaction):
    """Show bot statistics - STAFF ONLY"""
    if not interaction.user.guild_permissions.manage_messages:
        await interaction.response.send_message(
            "❌ You don't have permission to use this command.",
            ephemeral=True
        )
        return
    
    await interaction.response.defer()
    
    try:
        # Get statistics from database
        all_logs = await bot.db.get_scam_logs(limit=1000)
        pending_count = len([log for log in all_logs if log['status'] == 'pending'])
        verified_count = len([log for log in all_logs if log['status'] == 'verified'])
        rejected_count = len([log for log in all_logs if log['status'] == 'rejected'])
        
        discord_stats = await bot.db.get_discord_stats()
        
        embed = discord.Embed(
            title="🤖 Bot Statistics",
            color=0x5865f2
        )
        
        embed.add_field(name="📊 Scam Reports", value=f"""
        **Total:** {len(all_logs)}
        **Pending:** {pending_count}
        **Verified:** {verified_count}
        **Rejected:** {rejected_count}
        """, inline=True)
        
        embed.add_field(name="👥 Discord Stats", value=f"""
        **Members:** {discord_stats.get('member_count', 0)}
        **Last Updated:** {discord_stats.get('last_updated', 'Never')[:10]}
        """, inline=True)
        
        embed.add_field(name="🔧 Bot Info", value=f"""
        **Guilds:** {len(bot.guilds)}
        **Latency:** {round(bot.latency * 1000)}ms
        **API Status:** {'✅ Connected' if bot.api_client else '❌ Disconnected'}
        """, inline=True)
        
        embed.set_footer(text="Star Devs Bot | Made by DOLPHIN_DEV")
        embed.timestamp = datetime.now()
        
        await interaction.followup.send(embed=embed)
        
    except Exception as e:
        logger.error(f"Error getting bot stats: {e}")
        await interaction.followup.send(f"❌ Failed to get bot statistics: {str(e)}", ephemeral=True)

# Run the bot
if __name__ == "__main__":
    try:
        bot.run(Config.BOT_TOKEN)
    except Exception as e:
        logger.error(f"Failed to start bot: {e}")
