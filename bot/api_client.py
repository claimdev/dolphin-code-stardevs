import aiohttp
import json
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class APIClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def _request(self, method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make an HTTP request to the API"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            async with self.session.request(method, url, json=data, headers=headers) as response:
                if response.content_type == 'application/json':
                    result = await response.json()
                else:
                    # Handle non-JSON responses
                    text = await response.text()
                    result = {'success': False, 'error': f'Non-JSON response: {text}'}
                
                logger.info(f"API {method} {endpoint}: {response.status}")
                return result
        except aiohttp.ClientError as e:
            logger.error(f"API request failed: {e}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in API request: {e}")
            return {'success': False, 'error': str(e)}
    
    async def create_scam_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new scam log via API"""
        return await self._request('POST', '/scam-create', log_data)
    
    async def get_scam_log(self, log_id: str) -> Dict[str, Any]:
        """Get a specific scam log via API"""
        return await self._request('GET', f'/scam-info/{log_id}')
    
    async def get_scam_logs(self, status: str = 'all', limit: int = 10) -> Dict[str, Any]:
        """Get scam logs via API"""
        params = {'status': status, 'limit': limit}
        endpoint = f"/scam-logs?{'&'.join(f'{k}={v}' for k, v in params.items())}"
        return await self._request('GET', endpoint)
    
    async def update_scam_log_status(self, log_id: str, status: str) -> Dict[str, Any]:
        """Update scam log status via API"""
        return await self._request('POST', f'/update-status/{log_id}', {'status': status})
    
    async def update_member_count(self, member_count: int) -> Dict[str, Any]:
        """Update Discord member count via API"""
        return await self._request('POST', '/update-member-count', {'memberCount': member_count})
    
    async def get_member_count(self) -> Dict[str, Any]:
        """Get current member count via API"""
        return await self._request('GET', '/member-count')