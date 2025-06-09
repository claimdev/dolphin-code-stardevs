# Star Devs Website

A modern, responsive website for the Star Devs developer community with integrated Discord bot scam logging system.

## Features

### 🌟 Website Features
- **Modern Design**: Dark theme with gradient effects and smooth animations
- **Custom Logo**: Beautiful purple star logo integration
- **Responsive Layout**: Optimized for all devices (mobile, tablet, desktop)
- **Real-time Stats**: Discord member count updates every hour via bot
- **Two-page Navigation**: Home page with community info and Scamlogs page

### 🛡️ Scam Logging System (Staff-Only)
- **Staff-Only Creation**: Scam logs can ONLY be created by staff members through Discord bot commands
- **Public Viewing**: Anyone can view verified scam logs on the website
- **Permission-Based Access**: Staff can see all logs, users only see verified/rejected
- **Status Management**: Pending, Verified, and Rejected statuses
- **Search & Filter**: Advanced filtering by status and search functionality
- **Detailed View**: Complete scam log information with evidence links

### 🤖 Discord Bot Integration
- **REST API**: Full API endpoints for bot integration
- **Real-time Sync**: Automatic synchronization between website and bot
- **Member Count Updates**: Hourly member count synchronization
- **Permission Checks**: All scam-related commands require "Manage Messages" permission

## Bot API Endpoints

### Scam Logs (Staff Only)
- `POST /api/bot/scam-create` - Create new scam log (requires staff permissions)
- `GET /api/bot/scam-info/:id` - Get specific scam log
- `GET /api/bot/scam-logs` - List scam logs with filtering
- `POST /api/bot/update-status/:id` - Update scam log status (requires staff permissions)

### Discord Stats (Bot Only)
- `POST /api/bot/update-member-count` - Update Discord member count (bot only)
- `GET /api/bot/member-count` - Get current member count

## Discord Bot Commands

### Staff Commands (Requires "Manage Messages" Permission)
- `/scam-create <scammer_username> <scammer_id> <scam_type> <description> [date]`
  - Creates a new scam log entry
  - **STAFF ONLY** - Requires "Manage Messages" permission

- `/scam-verify <log_id>`
  - Verifies a pending scam report, making it public
  - **STAFF ONLY** - Requires "Manage Messages" permission

- `/scam-reject <log_id>`
  - Rejects a pending scam report
  - **STAFF ONLY** - Requires "Manage Messages" permission

### Public Commands
- `/scam-info <log_id>`
  - Shows detailed information about a specific scam log
  - Regular users can only see verified/rejected logs
  - Staff can see all logs including pending

- `/scam-logs [status] [limit]`
  - Lists recent scam logs
  - Regular users can only view verified logs
  - Staff can filter by any status (pending, verified, rejected, all)

## Permission System

### Staff Permissions
- **Discord Permission Required**: "Manage Messages"
- **Can Do**:
  - Create scam reports via `/scam-create`
  - View all scam logs (including pending)
  - Verify reports via `/scam-verify`
  - Reject reports via `/scam-reject`
  - Filter logs by any status

### Regular Users
- **Can Do**:
  - View verified and rejected scam logs only
  - Use `/scam-info` for verified/rejected logs
  - Use `/scam-logs` (limited to verified logs only)
- **Cannot Do**:
  - Create scam reports
  - View pending reports
  - Verify or reject reports

## Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Storage**: Local Storage (demo), easily replaceable with database
- **API**: RESTful endpoints for bot integration

## Bot Integration Setup

1. Install required Python packages:
   \`\`\`bash
   pip install discord.py aiohttp
   \`\`\`

2. Use the provided Python bot code in \`src/api/bot-api.ts\`
3. Replace \`YOUR_GUILD_ID\` with your Discord server ID
4. Replace \`YOUR_BOT_TOKEN\` with your bot token
5. Update \`API_BASE\` URL to point to your deployed website
6. Ensure your bot has the necessary permissions in your Discord server

## Development

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`bash
   npm run build
   \`\`\`

## Security Features

- **Staff-Only Creation**: Prevents spam and ensures proper moderation
- **Permission Checks**: All sensitive commands require Discord permissions
- **Input Validation**: Proper validation and sanitization
- **Status Management**: Proper workflow for scam log verification
- **Access Control**: Users can only see appropriate content based on permissions

## Auto-Update Features

- **Member Count**: Updates every hour via Discord bot
- **Real-time Sync**: Scam logs sync between bot and website
- **Status Updates**: Immediate reflection of status changes

## API Usage Examples

### Create Scam Log (Staff Only)
\`\`\`python
# Only works if user has "Manage Messages" permission
data = {
    "reportedBy": "Staff#1234 (STAFF)",
    "scammerUsername": "BadActor123",
    "scammerUserId": "123456789",
    "scamType": "Phishing",
    "scamDescription": "Attempted to steal Discord tokens",
    "dateOccurred": "2024-01-15T10:30:00Z"
}
response = await session.post(f"{API_BASE}/scam-create", json=data)
\`\`\`

### Update Member Count (Bot Only)
\`\`\`python
data = {"memberCount": 285}
response = await session.post(f"{API_BASE}/update-member-count", json=data)
\`\`\`

### Get Scam Logs (Filtered by Permission)
\`\`\`python
# Staff can see all, users only see verified
params = {"status": "verified", "limit": 10}
response = await session.get(f"{API_BASE}/scam-logs", params=params)
\`\`\`

## Deployment

The website is ready for deployment to any static hosting service:
- Netlify
- Vercel  
- GitHub Pages
- Firebase Hosting

For bot integration, ensure your API endpoints are properly configured and CORS is enabled.

## Credits

**Made by DOLPHIN_DEV** - Visible in the bottom-right overlay on all pages.

## Important Notes

- **Scam reports can ONLY be created by staff members** with "Manage Messages" permission
- Regular users cannot create, verify, or reject scam reports
- The website serves as a public viewing platform for verified scam logs
- All scam log management happens through Discord bot commands with proper permission checks"# y" 
"# star-devs-website-2.0" 
