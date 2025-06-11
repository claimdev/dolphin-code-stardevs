import discord
from discord.ext import commands, tasks
import aiohttp
import asyncio
import logging
import re
from datetime import datetime
from typing import Optional

from config import Config
from database import Database
from api_client import APIClient

# Configure logging with UTF-8 encoding to handle emojis
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# SI Role IDs - UPDATED
SI_ROLE_ID = 1292151093417213982
TRIAL_SI_ROLE_ID = 1292151446661501020

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
            
            # Add all slash commands to the tree
            await self.add_commands_to_tree()
            
            # Start background tasks
            self.update_member_count.start()
            self.sync_with_api.start()
            
            logger.info("Bot setup completed successfully")
        except Exception as e:
            logger.error(f"Failed to setup bot: {e}")
            raise
    
    async def add_commands_to_tree(self):
        """Add all slash commands to the command tree"""
        try:
            # Clear existing commands for the specific guild
            guild_obj = discord.Object(id=self.config.GUILD_ID)
            self.tree.clear_commands(guild=guild_obj)
            
            # Add all commands
            self.tree.add_command(scam_create)
            self.tree.add_command(scam_info)
            self.tree.add_command(scam_logs)
            self.tree.add_command(scam_verify)
            self.tree.add_command(scam_reject)
            self.tree.add_command(scam_remove)
            self.tree.add_command(bot_stats)
            
            logger.info("All commands added to tree successfully")
        except Exception as e:
            logger.error(f"Failed to add commands to tree: {e}")
    
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
    
    def extract_username_for_id(self, user: discord.Member) -> str:
        """Extract username for ID generation (first 3 letters)"""
        clean_name = re.sub(r'[^a-zA-Z]', '', user.name)
        return clean_name[:3].upper() if clean_name else "USR"
    
    async def on_ready(self):
        """Called when the bot is ready"""
        logger.info(f'{self.user} has connected to Discord!')
        logger.info(f'Bot is in {len(self.guilds)} guilds')
        
        # Sync slash commands with better error handling
        try:
            # Check if bot has necessary permissions
            guild = self.get_guild(self.config.GUILD_ID)
            if guild:
                bot_member = guild.get_member(self.user.id)
                if bot_member and bot_member.guild_permissions.administrator:
                    # Sync to specific guild first (faster)
                    guild_obj = discord.Object(id=self.config.GUILD_ID)
                    synced = await self.tree.sync(guild=guild_obj)
                    logger.info(f'Synced {len(synced)} command(s) to guild {self.config.GUILD_ID}')
                    
                    # Also sync globally (takes up to 1 hour to propagate)
                    global_synced = await self.tree.sync()
                    logger.info(f'Synced {len(global_synced)} command(s) globally')
                else:
                    logger.warning("Bot lacks administrator permissions. Some features may not work properly.")
            else:
                logger.error(f"Could not find guild with ID {self.config.GUILD_ID}")
            
        except discord.Forbidden as e:
            logger.error(f'Missing permissions to sync commands: {e}')
            logger.error("Please ensure the bot has 'applications.commands' scope and proper permissions")
        except Exception as e:
            logger.error(f'Failed to sync commands: {e}')
    
    async def on_application_command_error(self, interaction: discord.Interaction, error: Exception):
        """Handle slash command errors"""
        if isinstance(error, commands.MissingPermissions):
            await interaction.response.send_message(
                "You don't have permission to use this command. Only SI team members can create scam reports.",
                ephemeral=True
            )
        else:
            logger.error(f"Command error: {error}")
            if not interaction.response.is_done():
                await interaction.response.send_message(
                    f"An error occurred: {str(error)}",
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
                            logger.info(f"Member count updated: {member_count}")
                        else:
                            logger.warning(f"Failed to update member count via API: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error updating member count: {e}")
    
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
                    try:
                        # Convert database format to API format (FIXED field mapping)
                        api_data = {
                            'reportedBy': log['reported_by'],
                            'reporterUsername': self.extract_username_for_id_from_string(log['reported_by']),
                            'victimUserId': log['victim_user_id'],  # FIXED: correct field name
                            'victimAdditionalInfo': log.get('victim_additional_info'),
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
                            else:
                                logger.warning(f"Failed to sync log {log['id'][:8]}: {create_result.get('error')}")
                    except Exception as sync_error:
                        logger.error(f"Error syncing individual log {log.get('id', 'unknown')}: {sync_error}")
            
        except Exception as e:
            logger.error(f"Error syncing with API: {e}")
    
    def extract_username_for_id_from_string(self, reported_by: str) -> str:
        """Extract username from reported_by string for ID generation"""
        # Extract username from "username#discriminator (role)" format
        username = reported_by.split('#')[0] if '#' in reported_by else reported_by.split(' ')[0]
        clean_name = re.sub(r'[^a-zA-Z]', '', username)
        return clean_name[:3].upper() if clean_name else "USR"
    
    @update_member_count.before_loop
    async def before_update_member_count(self):
        await self.wait_until_ready()
    
    @sync_with_api.before_loop
    async def before_sync_with_api(self):
        await self.wait_until_ready()

# Initialize bot instance
bot = StarDevsBot()

# Slash Commands - Define them as standalone functions for the tree

@discord.app_commands.command(name="scam-create", description="Report a scammer (SI TEAM ONLY - Requires SI or Trial SI role)")
@discord.app_commands.describe(
    victim_user_id="The Discord ID of the victim (REQUIRED)",
    scammer_user_id="The Discord ID of the scammer (REQUIRED)",
    scam_type="Type of scam (e.g., Phishing, Fake Nitro, etc.) (REQUIRED)",
    description="Detailed description of the scam (REQUIRED)",
    evidence1="Evidence URL/link (REQUIRED)",
    evidence2="Additional evidence URL/link (optional)",
    evidence3="Additional evidence URL/link (optional)",
    evidence4="Additional evidence URL/link (optional)",
    evidence5="Additional evidence URL/link (optional)",
    date_occurred="Date when the scam occurred (YYYY-MM-DD) - defaults to today if not specified",
    victim_additional_info="Additional information about the victim - optional",
    scammer_additional_info="Additional information about the scammer - optional"
)
async def scam_create(
    interaction: discord.Interaction,
    victim_user_id: str,
    scammer_user_id: str,
    scam_type: str,
    description: str,
    evidence1: str,
    evidence2: Optional[str] = None,
    evidence3: Optional[str] = None,
    evidence4: Optional[str] = None,
    evidence5: Optional[str] = None,
    date_occurred: Optional[str] = None,
    victim_additional_info: Optional[str] = None,
    scammer_additional_info: Optional[str] = None
):
    """Create a new scam log entry - SI TEAM ONLY"""
    # Check if user has SI role
    if not bot.has_si_role(interaction.user):
        await interaction.response.send_message(
            "You don't have permission to use this command. Only SI team members (SI or Trial SI) can create scam reports.",
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
                    "Invalid date format. Please use YYYY-MM-DD format.",
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
            await interaction.followup.send(
                "At least one piece of evidence is required for scam reports.",
                ephemeral=True
            )
            return
        
        # Get user's SI role
        si_role = bot.get_si_role_name(interaction.user)
        
        # Prepare log data with BOTH victim and scammer info
        log_data = {
            'reported_by': f"{interaction.user.name}#{interaction.user.discriminator} ({si_role})",
            'victim_user_id': victim_user_id,
            'victim_additional_info': victim_additional_info,
            'scammer_user_id': scammer_user_id,  # NEW: Scammer ID
            'scammer_additional_info': scammer_additional_info,  # NEW: Scammer additional info
            'scam_type': scam_type,
            'scam_description': description,
            'date_occurred': date_occurred,
            'evidence': evidence
        }
        
        # Create in local database
        log_id = await bot.db.create_scam_log(log_data)
        
        # Log activity
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-create',
            f"victim: {victim_user_id}, scammer: {scammer_user_id}, type: {scam_type}",
            True
        )
        
        # Create success embed with verification buttons
        embed = discord.Embed(
            title="SI Scam Report Created",
            description=f"Report #{log_id} has been submitted for review",
            color=0x00ff00
        )
        embed.add_field(name="Victim ID", value=victim_user_id, inline=True)
        embed.add_field(name="Scammer ID", value=scammer_user_id, inline=True)
        embed.add_field(name="Type", value=scam_type, inline=True)
        embed.add_field(name="Status", value="Pending Review", inline=True)
        embed.add_field(name="Report ID", value=f"`{log_id}`", inline=True)
        embed.add_field(name="Date Occurred", value=date_occurred, inline=True)
        embed.add_field(name="Evidence Count", value=f"{len(evidence)} items", inline=True)
        embed.add_field(name="Reported By", value=f"{interaction.user.mention} ({si_role})", inline=False)
        embed.set_footer(text=f"Use the buttons below to verify or reject this report")
        embed.timestamp = datetime.now()
        
        # Create verification buttons
        class VerificationView(discord.ui.View):
            def __init__(self):
                super().__init__(timeout=None)
            
            @discord.ui.button(label="Verify", style=discord.ButtonStyle.green, emoji="✅")
            async def verify_button(self, interaction: discord.Interaction, button: discord.ui.Button):
                if not bot.has_si_role(interaction.user):
                    await interaction.response.send_message("Only SI team members can verify reports.", ephemeral=True)
                    return
                
                success = await bot.db.update_scam_log_status(log_id, 'verified')
                if success:
                    embed.color = 0x00ff00
                    embed.set_field_at(3, name="Status", value="✅ Verified", inline=True)
                    embed.set_footer(text=f"Verified by {interaction.user.name}")
                    await interaction.response.edit_message(embed=embed, view=None)
                else:
                    await interaction.response.send_message("Failed to verify report.", ephemeral=True)
            
            @discord.ui.button(label="Reject", style=discord.ButtonStyle.red, emoji="❌")
            async def reject_button(self, interaction: discord.Interaction, button: discord.ui.Button):
                if not bot.has_si_role(interaction.user):
                    await interaction.response.send_message("Only SI team members can reject reports.", ephemeral=True)
                    return
                
                success = await bot.db.update_scam_log_status(log_id, 'rejected')
                if success:
                    embed.color = 0xff0000
                    embed.set_field_at(3, name="Status", value="❌ Rejected", inline=True)
                    embed.set_footer(text=f"Rejected by {interaction.user.name}")
                    await interaction.response.edit_message(embed=embed, view=None)
                else:
                    await interaction.response.send_message("Failed to reject report.", ephemeral=True)
        
        view = VerificationView()
        await interaction.followup.send(embed=embed, view=view)
        
        # Send to staff channel if configured
        if bot.config.STAFF_CHANNEL_ID:
            staff_channel = bot.get_channel(bot.config.STAFF_CHANNEL_ID)
            if staff_channel:
                staff_embed = embed.copy()
                staff_embed.title = "New SI Scam Report Submitted"
                staff_embed.description = f"A new scam report has been submitted by {interaction.user.mention} ({si_role})"
                await staff_channel.send(embed=staff_embed, view=VerificationView())
        
        # Sync with API
        if bot.api_client:
            try:
                async with bot.api_client as client:
                    api_data = {
                        'reportedBy': log_data['reported_by'],
                        'reporterUsername': bot.extract_username_for_id(interaction.user),
                        'victimUserId': victim_user_id,
                        'victimAdditionalInfo': victim_additional_info,
                        'scammerUserId': scammer_user_id,  # NEW: Include scammer ID
                        'scammerAdditionalInfo': scammer_additional_info,
                        'scamType': scam_type, 
                        'scamDescription': description,
                        'dateOccurred': f"{date_occurred}T00:00:00Z",
                        'evidence': evidence,
                        'logId': log_id  # Include the generated log ID for better syncing
                    }
                    result = await client.create_scam_log(api_data)
                    if result.get('success'):
                        logger.info(f"Scam log {log_id} synced to website API")
                    elif result.get('status') == 404:
                        logger.warning(f"API endpoint not available. Website sync skipped for log {log_id}")
                    else:
                        logger.warning(f"Failed to sync log {log_id} to API: {result.get('error')}")
            except Exception as e:
                logger.warning(f"Failed to sync log {log_id}: {str(e)}")
        
    except Exception as e:
        logger.error(f"Error creating scam report: {e}")
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-create',
            f"victim: {victim_user_id}, scammer: {scammer_user_id}, type: {scam_type}",
            False,
            str(e)
        )
        await interaction.followup.send(f"Failed to create scam report: {str(e)}", ephemeral=True)

@discord.app_commands.command(name="scam-info", description="Get detailed information about a scam log")
@discord.app_commands.describe(log_id="The ID of the scam log")
async def scam_info(interaction: discord.Interaction, log_id: str):
    """Get scam log details - SI team can see all, users only see verified/rejected"""
    await interaction.response.defer()
    
    try:
        # Find log by ID (exact match or partial match)
        logs = await bot.db.get_scam_logs()
        matching_log = None
        for log in logs:
            if log['id'] == log_id or log['id'].startswith(log_id):
                matching_log = log
                break
        
        if not matching_log:
            await interaction.followup.send("Scam log not found.", ephemeral=True)
            return
        
        # Check permissions for pending logs
        if matching_log['status'] == 'pending' and not bot.has_si_role(interaction.user):
            await interaction.followup.send(
                "You don't have permission to view pending reports. Only SI team members can view pending reports.",
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
            title=f"Scam Report #{matching_log['id']}",
            description=matching_log['scam_description'],
            color=status_colors.get(matching_log['status'], 0x808080)
        )
        
        embed.add_field(name="Victim User ID", value=f"`{matching_log['victim_user_id']}`", inline=True)
        embed.add_field(name="Scammer User ID", value=f"`{matching_log.get('scammer_user_id', 'N/A')}`", inline=True)
        embed.add_field(name="Scam Type", value=matching_log['scam_type'], inline=True)
        
        status_text = f"{status_emojis.get(matching_log['status'], '⚪')} {matching_log['status'].title()}"
        embed.add_field(name="Status", value=status_text, inline=True)
        
        embed.add_field(name="Reported By", value=matching_log['reported_by'], inline=True)
        embed.add_field(name="Date Occurred", value=matching_log['date_occurred'], inline=True)
        embed.add_field(name="Report Date", value=matching_log['created_at'][:10], inline=True)
        
        if matching_log.get('victim_additional_info'):
            embed.add_field(name="Victim Additional Info", value=matching_log['victim_additional_info'], inline=False)
        
        if matching_log.get('scammer_additional_info'):
            embed.add_field(name="Scammer Additional Info", value=matching_log['scammer_additional_info'], inline=False)
        
        # Add evidence if available
        evidence = eval(matching_log.get('evidence', '[]')) if matching_log.get('evidence') else []
        if evidence:
            evidence_text = "\n".join([f"• {url}" for url in evidence[:5]])
            if len(evidence) > 5:
                evidence_text += f"\n... and {len(evidence) - 5} more"
            embed.add_field(name=f"Evidence ({len(evidence)} items)", value=evidence_text, inline=False)
        
        embed.set_footer(text=f"Created: {matching_log['created_at'][:10]} | Full ID: {matching_log['id']}")
        
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
        await interaction.followup.send(f"Failed to fetch scam log: {str(e)}", ephemeral=True)

@discord.app_commands.command(name="scam-remove", description="Remove a scam report from the database and website (SI TEAM ONLY)")
@discord.app_commands.describe(
    log_id="The ID of the scam log to remove"
)
async def scam_remove(interaction: discord.Interaction, log_id: str):
    """Remove a scam report - SI TEAM ONLY"""
    # Check if user has SI role
    if not bot.has_si_role(interaction.user):
        await interaction.response.send_message(
            "You don't have permission to use this command. Only SI team members can remove scam reports.",
            ephemeral=True
        )
        return
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        # Remove from local database
        success = await bot.db.remove_scam_log(log_id)
        if not success:
            await interaction.followup.send(f"No scam log found with ID: {log_id}", ephemeral=True)
            return
        
        # Log activity
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-remove',
            f"log_id: {log_id}",
            True
        )
        
        # Also remove from the website via API
        if bot.api_client:
            try:
                async with bot.api_client as client:
                    result = await client.remove_scam_log(log_id)
                    if result.get('success'):
                        await interaction.followup.send(f"Scam log {log_id} has been successfully removed from both the bot database and website.", ephemeral=True)
                    else:
                        await interaction.followup.send(f"Scam log {log_id} removed from bot database, but failed to remove from website: {result.get('error')}", ephemeral=True)
            except Exception as e:
                await interaction.followup.send(f"Scam log {log_id} removed from bot database, but failed to remove from website: {str(e)}", ephemeral=True)
        else:
            await interaction.followup.send(f"Scam log {log_id} has been successfully removed from the bot database.", ephemeral=True)
    
    except Exception as e:
        await interaction.followup.send(f"Failed to remove scam log: {str(e)}", ephemeral=True)
        await bot.db.log_bot_activity(
            str(interaction.user.id),
            str(interaction.user),
            'scam-remove',
            f"log_id: {log_id}",
            False,
            str(e)
        )

# Run the bot
if __name__ == "__main__":
    try:
        bot.run(Config.BOT_TOKEN)
    except Exception as e:
        logger.error(f"Failed to start bot: {e}")
