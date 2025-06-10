import aiosqlite
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
import os
import re

class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        # Ensure directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    async def init_db(self):
        """Initialize the database with required tables"""
        async with aiosqlite.connect(self.db_path) as db:
            # Scam logs table - updated schema
            await db.execute('''
                CREATE TABLE IF NOT EXISTS scam_logs (
                    id TEXT PRIMARY KEY,
                    reported_by TEXT NOT NULL,
                    victim_user_id TEXT NOT NULL,
                    victim_additional_info TEXT,
                    scam_type TEXT NOT NULL,
                    scam_description TEXT NOT NULL,
                    evidence TEXT NOT NULL, -- JSON array of evidence URLs (required)
                    date_occurred TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Discord stats table
            await db.execute('''
                CREATE TABLE IF NOT EXISTS discord_stats (
                    id INTEGER PRIMARY KEY,
                    member_count INTEGER NOT NULL DEFAULT 0,
                    active_projects INTEGER NOT NULL DEFAULT 0,
                    contributors INTEGER NOT NULL DEFAULT 0,
                    code_commits TEXT NOT NULL DEFAULT '0',
                    last_updated TEXT NOT NULL
                )
            ''')
            
            # Bot activity logs
            await db.execute('''
                CREATE TABLE IF NOT EXISTS bot_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    command TEXT NOT NULL,
                    parameters TEXT,
                    success BOOLEAN NOT NULL,
                    error_message TEXT,
                    timestamp TEXT NOT NULL
                )
            ''')
            
            # Scam log counter for ID generation
            await db.execute('''
                CREATE TABLE IF NOT EXISTS scam_counter (
                    id INTEGER PRIMARY KEY,
                    counter INTEGER NOT NULL DEFAULT 0
                )
            ''')
            
            # Initialize counter if it doesn't exist
            await db.execute('''
                INSERT OR IGNORE INTO scam_counter (id, counter) VALUES (1, 0)
            ''')
            
            await db.commit()
    
    def generate_scam_log_id(self, reporter_username: str) -> str:
        """Generate better ID format: ABC001 (first 3 letters of username + incremental number)"""
        # Extract first 3 letters of username (uppercase)
        clean_name = re.sub(r'[^a-zA-Z]', '', reporter_username)
        prefix = clean_name[:3].upper() if clean_name else "USR"
        prefix = prefix.ljust(3, 'X')  # Pad with X if less than 3 letters
        
        # This will be called within a database transaction to get the next counter
        return prefix
    
    async def create_scam_log(self, log_data: Dict[str, Any]) -> str:
        """Create a new scam log entry with better ID generation"""
        now = datetime.now().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Get and increment counter
            async with db.execute('SELECT counter FROM scam_counter WHERE id = 1') as cursor:
                row = await cursor.fetchone()
                current_counter = row[0] if row else 0
            
            next_counter = current_counter + 1
            await db.execute('UPDATE scam_counter SET counter = ? WHERE id = 1', (next_counter,))
            
            # Generate ID
            reporter_name = log_data['reported_by'].split('#')[0] if '#' in log_data['reported_by'] else log_data['reported_by'].split(' ')[0]
            prefix = self.generate_scam_log_id(reporter_name)
            log_id = f"{prefix}{next_counter:03d}"
            
            await db.execute('''
                INSERT INTO scam_logs (
                    id, reported_by, victim_user_id, victim_additional_info,
                    scam_type, scam_description, evidence, date_occurred,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                log_id,
                log_data['reported_by'],
                log_data['victim_user_id'],
                log_data.get('victim_additional_info'),
                log_data['scam_type'],
                log_data['scam_description'],
                json.dumps(log_data.get('evidence', [])),
                log_data['date_occurred'],
                'pending',
                now,
                now
            ))
            await db.commit()
        
        return log_id
    
    async def get_scam_log(self, log_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific scam log by ID"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute('SELECT * FROM scam_logs WHERE id = ? OR id LIKE ?', (log_id, f'{log_id}%')) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
        return None
    
    async def get_scam_logs(self, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get scam logs with optional filtering"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            if status and status != 'all':
                query = 'SELECT * FROM scam_logs WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
                params = (status, limit, offset)
            else:
                query = 'SELECT * FROM scam_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
                params = (limit, offset)
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
    
    async def update_scam_log_status(self, log_id: str, status: str) -> bool:
        """Update the status of a scam log"""
        now = datetime.now().isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'UPDATE scam_logs SET status = ?, updated_at = ? WHERE id = ? OR id LIKE ?',
                (status, now, log_id, f'{log_id}%')
            )
            await db.commit()
            return cursor.rowcount > 0
    
    async def remove_scam_log(self, log_id: str) -> bool:
        """Remove a scam log from the database"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'DELETE FROM scam_logs WHERE id = ? OR id LIKE ?',
                (log_id, f'{log_id}%')
            )
            await db.commit()
            return cursor.rowcount > 0
    
    async def update_discord_stats(self, stats: Dict[str, Any]) -> bool:
        """Update Discord server statistics"""
        now = datetime.now().isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            # Check if stats exist
            async with db.execute('SELECT id FROM discord_stats LIMIT 1') as cursor:
                exists = await cursor.fetchone()
            
            if exists:
                await db.execute('''
                    UPDATE discord_stats SET 
                    member_count = ?, active_projects = ?, contributors = ?,
                    code_commits = ?, last_updated = ?
                    WHERE id = 1
                ''', (
                    stats.get('member_count', 0),
                    stats.get('active_projects', 0),
                    stats.get('contributors', 0),
                    stats.get('code_commits', '0'),
                    now
                ))
            else:
                await db.execute('''
                    INSERT INTO discord_stats (
                        id, member_count, active_projects, contributors,
                        code_commits, last_updated
                    ) VALUES (1, ?, ?, ?, ?, ?)
                ''', (
                    stats.get('member_count', 0),
                    stats.get('active_projects', 0),
                    stats.get('contributors', 0),
                    stats.get('code_commits', '0'),
                    now
                ))
            
            await db.commit()
            return True
    
    async def get_discord_stats(self) -> Dict[str, Any]:
        """Get current Discord statistics"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute('SELECT * FROM discord_stats WHERE id = 1') as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
        
        # Return default stats if none exist
        return {
            'member_count': 0,
            'active_projects': 0,
            'contributors': 0,
            'code_commits': '0',
            'last_updated': datetime.now().isoformat()
        }
    
    async def log_bot_activity(self, user_id: str, username: str, command: str, 
                              parameters: str = None, success: bool = True, 
                              error_message: str = None):
        """Log bot command usage for analytics"""
        now = datetime.now().isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                INSERT INTO bot_logs (
                    user_id, username, command, parameters, success, error_message, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, username, command, parameters, success, error_message, now))
            await db.commit()
