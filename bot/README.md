# Star Devs Discord Bot

A comprehensive Discord bot for the Star Devs community with scam logging functionality and API integration.

## Features

### 🛡️ Scam Logging System
- **Staff-Only Creation**: Only users with "Manage Messages" permission can create scam reports
- **Status Management**: Pending, Verified, and Rejected statuses
- **Permission-Based Viewing**: Staff can see all logs, users only see verified/rejected
- **Database Storage**: SQLite database for reliable data persistence
- **API Synchronization**: Automatic sync with the Star Devs website

### 🤖 Discord Integration
- **Member Count Updates**: Automatic hourly member count synchronization
- **Slash Commands**: Modern Discord slash command interface
- **Error Handling**: Comprehensive error handling and logging
- **Activity Logging**: Track bot usage for analytics

### 📊 Statistics & Monitoring
- **Bot Statistics**: Detailed statistics for staff members
- **Activity Logs**: Track all bot interactions
- **API Health**: Monitor API connectivity and sync status

## Installation

### Prerequisites
- Python 3.8 or higher
- Discord Bot Token
- Discord Server (Guild) ID

### Setup Steps

1. **Clone or download the bot files**
   ```bash
   # Create bot directory
   mkdir star-devs-bot
   cd star-devs-bot
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Set up your .env file**
   ```env
   BOT_TOKEN=your_discord_bot_token_here
   GUILD_ID=your_discord_server_id_here
   API_BASE_URL=https://your-star-devs-website.com/api/bot
   STAFF_CHANNEL_ID=your_staff_channel_id_here
   DATABASE_PATH=./data/stardevs.db
   ```

5. **Run the bot**
   ```bash
   python run.py
   ```

## Discord Bot Setup

### Creating a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Copy the bot token for your `.env` file
6. Enable the following Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent

### Bot Permissions

The bot needs the following permissions in your Discord server:
- `Send Messages`
- `Use Slash Commands`
- `Read Message History`
- `Embed Links`
- `Manage Messages` (for staff command verification)

### Inviting the Bot

1. Go to the "OAuth2" > "URL Generator" section
2. Select "bot" and "applications.commands" scopes
3. Select the required permissions
4. Use the generated URL to invite the bot to your server

## Commands

### Staff Commands (Requires "Manage Messages" Permission)

#### `/scam-create`
Create a new scam report
- `scammer_username` - The username of the scammer
- `scammer_id` - The Discord ID of the scammer  
- `scam_type` - Type of scam (e.g., Phishing, Fake Nitro)
- `description` - Detailed description of the scam
- `date_occurred` - Date when the scam occurred (optional)
- `additional_info` - Additional information about the scammer (optional)

#### `/scam-verify <log_id>`
Verify a pending scam report, making it public

#### `/scam-reject <log_id>`
Reject a pending scam report

#### `/bot-stats`
Show comprehensive bot statistics

### Public Commands

#### `/scam-info <log_id>`
Show detailed information about a specific scam log
- Regular users can only see verified/rejected logs
- Staff can see all logs including pending

#### `/scam-logs [status] [limit]`
List recent scam logs
- `status` - Filter by status (verified, pending, rejected, all)
- `limit` - Number of logs to show (max 25)
- Regular users can only view verified logs
- Staff can filter by any status

## Database Schema

### Scam Logs Table
```sql
CREATE TABLE scam_logs (
    id TEXT PRIMARY KEY,
    reported_by TEXT NOT NULL,
    scammer_username TEXT NOT NULL,
    scammer_user_id TEXT NOT NULL,
    scammer_additional_info TEXT,
    scam_type TEXT NOT NULL,
    scam_description TEXT NOT NULL,
    evidence TEXT, -- JSON array
    date_occurred TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Discord Stats Table
```sql
CREATE TABLE discord_stats (
    id INTEGER PRIMARY KEY,
    member_count INTEGER NOT NULL DEFAULT 0,
    active_projects INTEGER NOT NULL DEFAULT 0,
    contributors INTEGER NOT NULL DEFAULT 0,
    code_commits TEXT NOT NULL DEFAULT '0',
    last_updated TEXT NOT NULL
);
```

### Bot Activity Logs
```sql
CREATE TABLE bot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    command TEXT NOT NULL,
    parameters TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    timestamp TEXT NOT NULL
);
```

## API Integration

The bot automatically syncs with the Star Devs website API:

### Endpoints Used
- `POST /api/bot/scam-create` - Create scam logs
- `GET /api/bot/scam-info/:id` - Get scam log details
- `GET /api/bot/scam-logs` - List scam logs
- `POST /api/bot/update-status/:id` - Update scam log status
- `POST /api/bot/update-member-count` - Update member count

### Sync Schedule
- **Member Count**: Every hour
- **Scam Logs**: Every 30 minutes
- **Real-time**: Immediate sync on status changes

## Configuration Options

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `BOT_TOKEN` | Yes | Discord bot token | - |
| `GUILD_ID` | Yes | Discord server ID | - |
| `API_BASE_URL` | No | Website API base URL | `http://localhost:5173/api/bot` |
| `STAFF_CHANNEL_ID` | No | Channel for staff notifications | - |
| `DATABASE_PATH` | No | SQLite database file path | `./data/stardevs.db` |

### Logging

Logs are written to:
- `logs/bot.log` - All bot activity
- Console output - Real-time monitoring

Log levels:
- `INFO` - General bot activity
- `WARNING` - Non-critical issues
- `ERROR` - Critical errors

## Security Features

### Permission Checks
- All sensitive commands require "Manage Messages" permission
- Users can only view appropriate content based on permissions
- Input validation and sanitization

### Data Protection
- SQLite database with proper schema
- Activity logging for audit trails
- Error handling to prevent data corruption

## Troubleshooting

### Common Issues

1. **Bot not responding to commands**
   - Check if bot has proper permissions
   - Verify slash commands are synced
   - Check bot logs for errors

2. **Database errors**
   - Ensure `data/` directory exists and is writable
   - Check database file permissions
   - Verify SQLite installation

3. **API sync failures**
   - Check API_BASE_URL configuration
   - Verify website is accessible
   - Check network connectivity

### Debug Mode

Enable debug logging by modifying `run.py`:
```python
logging.basicConfig(level=logging.DEBUG)
```

## Development

### Project Structure
```
bot/
├── bot.py              # Main bot code
├── config.py           # Configuration management
├── database.py         # Database operations
├── api_client.py       # API client for website integration
├── run.py              # Bot runner with error handling
├── requirements.txt    # Python dependencies
├── .env.example        # Environment configuration template
├── README.md           # This file
├── data/               # Database storage
└── logs/               # Log files
```

### Adding New Commands

1. Add the command function to `bot.py`
2. Use `@bot.tree.command()` decorator
3. Add proper permission checks
4. Include error handling and logging
5. Update this README

### Database Migrations

To modify the database schema:
1. Update the schema in `database.py`
2. Add migration logic to handle existing data
3. Test thoroughly before deployment

## Support

For support with the bot:
1. Check the logs for error messages
2. Verify configuration settings
3. Ensure all dependencies are installed
4. Contact the development team

## Credits

**Made by DOLPHIN_DEV** for the Star Devs community.

## License

This bot is created specifically for the Star Devs community. Please respect the community guidelines and use responsibly.