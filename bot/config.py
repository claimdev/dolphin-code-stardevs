import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    BOT_TOKEN = os.getenv('BOT_TOKEN')
    GUILD_ID = int(os.getenv('GUILD_ID', 0))
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:5173/api/bot')
    STAFF_CHANNEL_ID = int(os.getenv('STAFF_CHANNEL_ID', 0)) if os.getenv('STAFF_CHANNEL_ID') else None
    DATABASE_PATH = os.getenv('DATABASE_PATH', './data/stardevs.db')
    
    # Validate required config
    @classmethod
    def validate(cls):
        if not cls.BOT_TOKEN:
            raise ValueError("BOT_TOKEN is required")
        if not cls.GUILD_ID:
            raise ValueError("GUILD_ID is required")
        return True