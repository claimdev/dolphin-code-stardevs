#!/usr/bin/env python3
"""
Star Devs Discord Bot Runner
This script handles bot startup with proper error handling and logging.
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# Add the bot directory to the Python path
bot_dir = Path(__file__).parent
sys.path.insert(0, str(bot_dir))

from bot import bot
from config import Config

def setup_logging():
    """Setup logging configuration with UTF-8 encoding"""
    # Create logs directory if it doesn't exist
    logs_dir = bot_dir / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    # Configure logging with UTF-8 encoding to handle emojis
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(logs_dir / 'bot.log', encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set discord.py logging level
    logging.getLogger('discord').setLevel(logging.WARNING)
    logging.getLogger('discord.http').setLevel(logging.WARNING)

def check_environment():
    """Check if all required environment variables are set"""
    required_vars = ['BOT_TOKEN', 'GUILD_ID']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"Missing required environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file or environment configuration.")
        return False
    
    return True

async def main():
    """Main function to run the bot"""
    logger = logging.getLogger(__name__)
    
    try:
        # Check environment
        if not check_environment():
            sys.exit(1)
        
        # Validate configuration
        Config.validate()
        
        logger.info("Starting Star Devs Discord Bot...")
        logger.info(f"Working directory: {bot_dir}")
        logger.info(f"API Base URL: {Config.API_BASE_URL}")
        logger.info(f"Guild ID: {Config.GUILD_ID}")
        
        # Start the bot
        await bot.start(Config.BOT_TOKEN)
        
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
    finally:
        if not bot.is_closed():
            await bot.close()

if __name__ == "__main__":
    # Setup logging
    setup_logging()
    
    # Create data directory
    data_dir = bot_dir / 'data'
    data_dir.mkdir(exist_ok=True)
    
    # Run the bot
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBot stopped by user")
    except Exception as e:
        print(f"Failed to start bot: {e}")
        sys.exit(1)
